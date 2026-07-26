/**
 * DLD Open-Data transaction importer  (#5 Data.Dubai / dubailand.gov.ae open data)
 *
 * Streams a large DLD "Transactions" CSV (hundreds of MB / millions of rows) and
 * loads it into the `dld_transactions` table that the analysis engine queries.
 *
 * Handles the real DLD export shape:
 *   - filters to SALES only (skips Mortgages / Gifts) so valuations aren't skewed
 *   - converts area from square metres → square feet (DLD reports sqm)
 *   - parses ROOMS_EN ("Studio" → 0, "1 B/R" → 1)
 *   - maps AREA_EN → community, PROJECT_EN → building, PROP_SB_TYPE_EN → type
 *   - computes price-per-sqft, generates a stable id, dedupes with ON CONFLICT
 *
 * Usage (run where the CSV + DATABASE_URL live):
 *   pnpm --filter @workspace/scripts exec tsx src/import-dld.ts <file.csv> [options]
 * Options:
 *   --area-unit=sqm|sqft   (default sqm — DLD is sqm)
 *   --group=Sales          (transaction group to keep; default "Sales")
 *   --emirate=Dubai        (default Dubai)
 *   --batch=1000           (rows per insert)
 *   --limit=0              (stop after N data rows; 0 = all)
 */
import fs from "node:fs";
import readline from "node:readline";
import crypto from "node:crypto";
import { pool } from "@workspace/db";

const SQM_TO_SQFT = 10.7639;

// ---- args ----
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const opt = (name: string, def: string) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : def;
};
if (!file) { console.error("Provide a CSV path. See header of this file for usage."); process.exit(1); }
const areaUnit = opt("area-unit", "sqm");
const groupFilter = opt("group", "Sales").toLowerCase();
const emirate = opt("emirate", "Dubai");
const batchSize = parseInt(opt("batch", "1000"), 10);
const limit = parseInt(opt("limit", "0"), 10);

// ---- CSV line parser (handles quoted fields with commas) ----
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const norm = (s: string) => s.replace(/^﻿/, "").trim().toUpperCase().replace(/[\s_]+/g, "");
function findCol(headers: string[], candidates: string[]): number {
  const H = headers.map(norm);
  for (const c of candidates) { const i = H.indexOf(norm(c)); if (i >= 0) return i; }
  return -1;
}

function parseRooms(v: string): number | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  if (s.includes("studio")) return 0;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}
function parseDate(v: string): string | null {
  if (!v) return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);            // YYYY-MM-DD...
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);                // DD-MM-YYYY
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function mapType(v: string): string {
  const s = (v || "").trim().toLowerCase();
  if (s.includes("flat")) return "Apartment";
  if (s.includes("villa")) return "Villa";
  if (s.includes("town")) return "Townhouse";
  if (s.includes("shop")) return "Shop";
  if (s.includes("office")) return "Office";
  if (s.includes("penthouse")) return "Penthouse";
  return v ? v.trim() : "Unknown";
}
const num = (v: string) => { const n = parseFloat((v || "").replace(/[^0-9.]/g, "")); return isNaN(n) ? null : n; };

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(file!, "utf8"), crlfDelay: Infinity });
  let headers: string[] | null = null;
  const col: Record<string, number> = {};
  let batch: any[][] = [];
  let total = 0, kept = 0, skipped = 0;

  async function flush() {
    if (!batch.length) return;
    const cols = 11;
    const values: unknown[] = [];
    const tuples = batch.map((row, i) => {
      values.push(...row);
      const b = i * cols;
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11})`;
    });
    const sql =
      `INSERT INTO dld_transactions
       (transaction_id, community, building_name, property_type, bedrooms, size_sqft, sale_price, price_per_sqft, transaction_date, emirate, floor_number)
       VALUES ${tuples.join(",")} ON CONFLICT (transaction_id) DO NOTHING`;
    await pool.query(sql, values);
    batch = [];
  }

  for await (const line of rl) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    if (!headers) {
      headers = fields;
      col.group = findCol(headers, ["GROUP_EN", "GROUP"]);
      col.date = findCol(headers, ["INSTANCE_DATE", "TRANSACTION_DATE", "DATE"]);
      col.area = findCol(headers, ["AREA_EN", "AREA", "COMMUNITY"]);
      col.project = findCol(headers, ["PROJECT_EN", "MASTER_PROJECT_EN", "BUILDING_NAME_EN", "BUILDING"]);
      col.type = findCol(headers, ["PROP_SB_TYPE_EN", "PROP_TYPE_EN", "PROPERTY_TYPE"]);
      col.rooms = findCol(headers, ["ROOMS_EN", "ROOMS"]);
      col.size = findCol(headers, ["ACTUAL_AREA", "PROCEDURE_AREA", "AREA_SIZE", "SIZE"]);
      col.value = findCol(headers, ["TRANS_VALUE", "ACTUAL_WORTH", "AMOUNT", "PRICE"]);
      col.txno = findCol(headers, ["TRANSACTION_NUMBER", "TRANSACTION_ID"]);
      if (col.date < 0 || col.area < 0 || col.value < 0) {
        console.error("Could not find required columns (date/area/value). Headers were:\n" + headers.join(" | "));
        process.exit(1);
      }
      console.log("Detected columns:", Object.fromEntries(Object.entries(col).map(([k, v]) => [k, v >= 0 ? headers![v] : "—"])));
      continue;
    }

    total++;
    // filter to sales
    if (col.group >= 0 && groupFilter && !(fields[col.group] || "").toLowerCase().includes(groupFilter)) { skipped++; continue; }

    const price = num(fields[col.value]);
    const rawSize = col.size >= 0 ? num(fields[col.size]) : null;
    const sizeSqft = rawSize != null ? +(areaUnit === "sqm" ? rawSize * SQM_TO_SQFT : rawSize).toFixed(2) : null;
    const date = parseDate(fields[col.date]);
    const community = (fields[col.area] || "").trim() || null;
    if (!price || !date || !community) { skipped++; continue; }

    const psf = sizeSqft && sizeSqft > 0 ? +(price / sizeSqft).toFixed(2) : null;
    const bedrooms = col.rooms >= 0 ? parseRooms(fields[col.rooms]) : null;
    const building = col.project >= 0 ? (fields[col.project] || "").trim() || null : null;
    const type = col.type >= 0 ? mapType(fields[col.type]) : null;
    // stable id (DLD transaction numbers repeat across units) → hash the row's identity
    const idBasis = `${col.txno >= 0 ? fields[col.txno] : ""}|${date}|${community}|${building}|${type}|${sizeSqft}|${price}`;
    const transactionId = crypto.createHash("sha1").update(idBasis).digest("hex").slice(0, 40);

    batch.push([transactionId, community, building, type, bedrooms, sizeSqft, price, psf, date, emirate, null]);
    kept++;
    if (batch.length >= batchSize) await flush();
    if (kept % 50000 === 0) console.log(`  …${kept.toLocaleString()} sales loaded (${total.toLocaleString()} rows scanned)`);
    if (limit && total >= limit) break;
  }
  await flush();
  await pool.end();
  console.log(`\nDone. Scanned ${total.toLocaleString()} rows → loaded ${kept.toLocaleString()} ${groupFilter} transactions, skipped ${skipped.toLocaleString()}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
