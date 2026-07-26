/**
 * DLD Valuations importer → `valuations` table.
 * Columns: PROPERTY_TOTAL_VALUE, AREA_EN, ACTUAL_AREA, PROCEDURE_YEAR,
 *   PROCEDURE_NUMBER, INSTANCE_DATE, ACTUAL_WORTH, PROCEDURE_AREA,
 *   PROPERTY_TYPE_EN, PROP_SUB_TYPE_EN
 *
 * - AREA_EN → canonical community · ACTUAL_AREA sqm → sqft · value in AED
 * - dedupe key: PROCEDURE_YEAR-PROCEDURE_NUMBER
 *   (⚠️ create the table first:  cd lib/db && npx drizzle-kit push)
 *
 * Usage:
 *   pnpm --filter @workspace/scripts exec tsx src/import-valuations.ts <file.csv> [--dry-run --area-unit=sqm --batch=1000 --limit=0]
 */
import { streamCsvRecords } from "./csv-stream.js";
import { canonicalCommunity } from "./community-map.js";
import { isKnownCommunity } from "./dld-reference.js";

const SQM_TO_SQFT = 10.7639;
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const opt = (n: string, d: string) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split("=")[1] : d; };
if (!file) { console.error("Provide a CSV path."); process.exit(1); }
const dryRun = args.includes("--dry-run");
const areaUnit = opt("area-unit", "sqm");
const batchSize = parseInt(opt("batch", "1000"), 10);
const limit = parseInt(opt("limit", "0"), 10);

const num = (v: string) => { const n = parseFloat((v || "").replace(/[^0-9.]/g, "")); return isNaN(n) ? null : n; };
const isoDate = (v: string) => { const m = (v || "").match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; };

async function main() {
  const pool = dryRun ? null : (await import("@workspace/db")).pool;
  let idx: Record<string, number> | null = null;
  let headers: string[] = [];
  let batch: unknown[][] = [];
  const preview: unknown[] = [];
  const unknownAreas = new Map<string, number>();
  let total = 0, kept = 0, skipped = 0;

  async function flush() {
    if (!batch.length || !pool) { batch = []; return; }
    const cols = 11;
    const values: unknown[] = [];
    const tuples = batch.map((r, i) => { values.push(...r); const b = i * cols; return `(${Array.from({ length: cols }, (_, k) => `$${b + k + 1}`).join(",")})`; });
    await pool.query(
      `INSERT INTO valuations
       (valuation_ref, community, property_type, property_sub_type, size_sqft, total_value, actual_worth, value_per_sqft, procedure_year, valuation_date, emirate)
       VALUES ${tuples.join(",")} ON CONFLICT (valuation_ref) DO NOTHING`,
      values,
    );
    batch = [];
  }

  for await (const rec of streamCsvRecords(file!)) {
    if (!idx) { headers = rec.map((h) => h.replace(/^﻿/, "").trim()); idx = {}; headers.forEach((h, i) => (idx![h] = i)); continue; }
    total++;
    const g = (n: string) => (idx![n] != null ? rec[idx![n]] ?? "" : "");

    const totalValue = num(g("PROPERTY_TOTAL_VALUE"));
    const rawArea = num(g("ACTUAL_AREA"));
    const rawAreaName = g("AREA_EN");
    const community = canonicalCommunity(rawAreaName);
    // floor of 10k AED drops the handful of obvious junk rows (e.g. value "402")
    if (!totalValue || totalValue < 10000 || !community) { skipped++; if (limit && total >= limit) break; continue; }
    if (rawAreaName && !isKnownCommunity(rawAreaName)) unknownAreas.set(rawAreaName, (unknownAreas.get(rawAreaName) || 0) + 1);

    const sizeSqft = rawArea != null && rawArea > 0 ? +(areaUnit === "sqm" ? rawArea * SQM_TO_SQFT : rawArea).toFixed(2) : null;
    // a handful of rows have the AREA (in sqft) mistakenly copied into the value
    // column — value ≈ sizeSqft (vpsf ≈ 1). Drop them so they don't skew stats.
    if (sizeSqft && totalValue / sizeSqft < 5) { skipped++; if (limit && total >= limit) break; continue; }
    const worth = num(g("ACTUAL_WORTH"));
    const vpsf = sizeSqft && sizeSqft > 0 ? +(totalValue / sizeSqft).toFixed(2) : null;
    const year = num(g("PROCEDURE_YEAR"));
    const ref = `${g("PROCEDURE_YEAR")}-${g("PROCEDURE_NUMBER")}`;
    const date = isoDate(g("INSTANCE_DATE"));
    const type = g("PROPERTY_TYPE_EN") || null;
    const sub = g("PROP_SUB_TYPE_EN") || null;

    kept++;
    if (dryRun) { if (preview.length < 6) preview.push({ ref, community, type, sub, sqft: sizeSqft, value: totalValue, vpsf, year, date }); }
    else {
      batch.push([ref, community, type, sub, sizeSqft, totalValue, worth, vpsf, year ? Math.round(year) : null, date, "Dubai"]);
      if (batch.length >= batchSize) await flush();
    }
    if (limit && total >= limit) break;
  }
  await flush();
  if (pool) await pool.end();

  if (dryRun) {
    console.log("Detected columns:", headers);
    console.log("\nSample of mapped valuations (first 6 kept):");
    for (const p of preview) console.log("  ", JSON.stringify(p));
    if (unknownAreas.size) {
      console.log(`\n⚠️  ${unknownAreas.size} AREA_EN value(s) not in the official DLD community registry:`);
      for (const [name, n] of [...unknownAreas].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`   ${n}×  ${name}`);
    }
    console.log(`\nDRY RUN — nothing written. ${total.toLocaleString()} scanned → ${kept.toLocaleString()} would load, ${skipped.toLocaleString()} skipped.`);
  } else {
    console.log(`\nDone. ${total.toLocaleString()} scanned → loaded ${kept.toLocaleString()} valuations, skipped ${skipped.toLocaleString()}.`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
