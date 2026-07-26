/**
 * Portal listings importer → `listings` table (feeds the Liquidity module:
 * active-listing counts and supply ratios per community).
 *
 * Handles the portal-export shape:
 *   title, displayAddress, bathrooms, bedrooms, addedOn, type, price,
 *   verified, priceDuration, sizeMin, furnishing, description
 *
 * - parses community + building out of displayAddress ("Bldg, Community, Dubai")
 * - normalizes community names (canonicalCommunity) to match DLD data
 * - sizeMin is already in sqft (no sqm conversion)
 * - keeps SALE listings (priceDuration = "sell"); rentals handled separately
 * - drops the description entirely (contains agent PII — not needed)
 * - generates a synthetic unique key for dedupe (no listing URL in the export)
 *
 * Usage:
 *   pnpm --filter @workspace/scripts exec tsx src/import-listings.ts <file.csv> [options]
 *   --dry-run           preview mapping, write nothing (no DB needed)
 *   --source=uae_re_2024  label stored in listings.source
 *   --duration=sell     which priceDuration to keep (default sell)
 *   --batch=1000  --limit=0
 */
import crypto from "node:crypto";
import { streamCsvRecords } from "./csv-stream.js";
import { canonicalCommunity } from "./community-map.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const opt = (n: string, d: string) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split("=")[1] : d; };
if (!file) { console.error("Provide a CSV path."); process.exit(1); }
const dryRun = args.includes("--dry-run");
const source = opt("source", "uae_re_2024");
const durationKeep = opt("duration", "sell").toLowerCase();
const batchSize = parseInt(opt("batch", "1000"), 10);
const limit = parseInt(opt("limit", "0"), 10);

const DROP_TRAILING = /^(dubai|u\.?a\.?e\.?|united arab emirates|abu dhabi|sharjah|dubai\s?land|dubailand)$/i;

function parseAddress(addr: string): { building: string | null; community: string } {
  const parts = (addr || "").split(",").map((s) => s.trim()).filter(Boolean);
  while (parts.length && DROP_TRAILING.test(parts[parts.length - 1])) parts.pop();
  const building = parts[0] || null;
  const community = parts.length ? canonicalCommunity(parts[parts.length - 1]) : "";
  return { building, community };
}
function inferType(title: string, address: string): string {
  // best-effort: no explicit type column in this export. Scan the title + the
  // building/address (e.g. "Noor Townhouses"). Imperfect — a villa community
  // like "The Springs" without a keyword still defaults to Apartment.
  const s = ((title || "") + " " + (address || "")).toLowerCase();
  if (/\bpenthouse\b/.test(s)) return "Penthouse";
  if (/\btown\s?house/.test(s)) return "Townhouse";
  if (/\bvilla/.test(s)) return "Villa";
  if (/\bplot\b/.test(s)) return "Plot";
  return "Apartment";
}
function parseBeds(v: string): number | null { if (!v) return null; if (/studio/i.test(v)) return 0; const m = v.match(/(\d+)/); return m ? parseInt(m[1], 10) : null; }
function intOrNull(v: string): number | null { const m = (v || "").match(/(\d+)/); return m ? parseInt(m[1], 10) : null; }
function numOrNull(v: string): number | null { const n = parseFloat((v || "").replace(/[^0-9.]/g, "")); return isNaN(n) ? null : n; }
function isoDate(v: string): string | null { const m = (v || "").match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; }

async function main() {
  const pool = dryRun ? null : (await import("@workspace/db")).pool;
  let headers: string[] | null = null;
  let idx: Record<string, number> = {};
  let batch: unknown[][] = [];
  const preview: unknown[] = [];
  let total = 0, kept = 0, skipped = 0;

  async function flush() {
    if (!batch.length || !pool) { batch = []; return; }
    const cols = 13;
    const values: unknown[] = [];
    const tuples = batch.map((r, i) => { values.push(...r); const b = i * cols; return `(${Array.from({ length: cols }, (_, k) => `$${b + k + 1}`).join(",")})`; });
    await pool.query(
      `INSERT INTO listings
       (source, listing_url, community, building_name, property_type, bedrooms, size_sqft, listed_price, price_per_sqft, furnished, emirate, first_seen, is_active)
       VALUES ${tuples.join(",")} ON CONFLICT (listing_url) DO NOTHING`,
      values,
    );
    batch = [];
  }

  for await (const rec of streamCsvRecords(file!)) {
    if (!headers) { headers = rec.map((h) => h.replace(/^﻿/, "").trim()); headers.forEach((h, i) => (idx[h] = i)); continue; }
    total++;
    const g = (name: string) => (idx[name] != null ? rec[idx[name]] ?? "" : "");
    if (durationKeep && (g("priceDuration") || "").toLowerCase() !== durationKeep) { skipped++; if (limit && total >= limit) break; continue; }

    const price = numOrNull(g("price"));
    const { building, community } = parseAddress(g("displayAddress"));
    if (!price || !community) { skipped++; if (limit && total >= limit) break; continue; }
    const sizeSqft = numOrNull(g("sizeMin"));
    const psf = sizeSqft && sizeSqft > 0 ? +(price / sizeSqft).toFixed(2) : null;
    const bedrooms = parseBeds(g("bedrooms"));
    const propertyType = inferType(g("title"), g("displayAddress"));
    const furnished = /^y/i.test(g("furnishing"));
    const firstSeen = isoDate(g("addedOn"));
    const listingUrl = `snapshot:${source}:${crypto.createHash("sha1").update(`${g("displayAddress")}|${bedrooms}|${sizeSqft}|${price}|${g("addedOn")}`).digest("hex").slice(0, 24)}`;

    kept++;
    if (dryRun) { if (preview.length < 6) preview.push({ community, building, type: propertyType, beds: bedrooms, sqft: sizeSqft, price, psf, furnished, firstSeen }); }
    else {
      batch.push([source, listingUrl, community, building, propertyType, bedrooms, sizeSqft, price, psf, furnished, "Dubai", firstSeen, true]);
      if (batch.length >= batchSize) await flush();
    }
    if (limit && total >= limit) break;
  }
  await flush();
  if (pool) await pool.end();

  if (dryRun) {
    console.log("Detected columns:", headers);
    console.log("\nSample of mapped listings (first 6 kept):");
    for (const p of preview) console.log("  ", JSON.stringify(p));
    console.log(`\nDRY RUN — nothing written. ${total.toLocaleString()} scanned → ${kept.toLocaleString()} ${durationKeep} listings would load, ${skipped.toLocaleString()} skipped.`);
  } else {
    console.log(`\nDone. ${total.toLocaleString()} scanned → loaded ${kept.toLocaleString()} listings, skipped ${skipped.toLocaleString()}.`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
