/**
 * DLD Open-Data transaction importer  (#5 Data.Dubai / dubailand.gov.ae open data)
 *
 * Streams a large DLD "Transactions" CSV (hundreds of MB / millions of rows) and
 * loads it into the `dld_transactions` table the analysis engine queries.
 * Parsing/mapping logic lives in ./dld-parse.ts (unit-tested by test-apis.ts).
 *
 * Usage (run where the CSV + DATABASE_URL live):
 *   pnpm --filter @workspace/scripts exec tsx src/import-dld.ts <file.csv> [options]
 * Options:
 *   --area-unit=sqm|sqft   (default sqm — DLD reports sqm)
 *   --group=Sales          (transaction group to keep; default "Sales")
 *   --emirate=Dubai        (default Dubai)
 *   --batch=1000           (rows per insert)
 *   --limit=0              (stop after N scanned rows; 0 = all)
 */
import fs from "node:fs";
import readline from "node:readline";
import { parseCsvLine, detectColumns, mapRow, type ColMap } from "./dld-parse.js";

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
const dryRun = args.includes("--dry-run"); // read + map + preview, write nothing (no DB needed)

async function main() {
  // Only connect to the database for a real load — a dry run needs no DATABASE_URL.
  const pool = dryRun ? null : (await import("@workspace/db")).pool;
  const rl = readline.createInterface({ input: fs.createReadStream(file!, "utf8"), crlfDelay: Infinity });
  let col: ColMap | null = null;
  let headers: string[] | null = null;
  let batch: unknown[][] = [];
  const preview: unknown[] = [];
  let total = 0, kept = 0, skipped = 0;

  async function flush() {
    if (!batch.length || !pool) { batch = []; return; }
    const cols = 11;
    const values: unknown[] = [];
    const tuples = batch.map((row, i) => {
      values.push(...row);
      const b = i * cols;
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11})`;
    });
    await pool.query(
      `INSERT INTO dld_transactions
       (transaction_id, community, building_name, property_type, bedrooms, size_sqft, sale_price, price_per_sqft, transaction_date, emirate, floor_number)
       VALUES ${tuples.join(",")} ON CONFLICT (transaction_id) DO NOTHING`,
      values,
    );
    batch = [];
  }

  for await (const line of rl) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    if (!col) {
      headers = fields;
      col = detectColumns(headers);
      if (col.date < 0 || col.area < 0 || col.value < 0) {
        console.error("Could not find required columns (date/area/value). Headers were:\n" + headers.join(" | "));
        process.exit(1);
      }
      console.log("Detected columns:", Object.fromEntries(Object.entries(col).map(([k, v]) => [k, v >= 0 ? headers![v] : "—"])));
      continue;
    }

    total++;
    const m = mapRow(fields, col, { areaUnit, groupFilter, emirate });
    if (!m) { skipped++; }
    else {
      kept++;
      if (dryRun) { if (preview.length < 5) preview.push({ community: m.community, type: m.propertyType, beds: m.bedrooms, sqft: m.sizeSqft, price: m.salePrice, psf: m.pricePerSqft, date: m.transactionDate, building: m.buildingName }); }
      else {
        batch.push([m.transactionId, m.community, m.buildingName, m.propertyType, m.bedrooms, m.sizeSqft, m.salePrice, m.pricePerSqft, m.transactionDate, m.emirate, m.floorNumber]);
        if (batch.length >= batchSize) await flush();
        if (kept % 50000 === 0) console.log(`  …${kept.toLocaleString()} sales loaded (${total.toLocaleString()} rows scanned)`);
      }
    }
    if (limit && total >= limit) break;
  }
  await flush();
  if (pool) await pool.end();

  if (dryRun) {
    console.log("\nSample of mapped rows (first 5 kept):");
    for (const p of preview) console.log("  ", JSON.stringify(p));
    console.log(`\nDRY RUN — nothing written. Scanned ${total.toLocaleString()} rows → ${kept.toLocaleString()} ${groupFilter} would load, ${skipped.toLocaleString()} skipped.`);
    console.log("If the columns and sample values look right, re-run WITHOUT --dry-run to load.");
  } else {
    console.log(`\nDone. Scanned ${total.toLocaleString()} rows → loaded ${kept.toLocaleString()} ${groupFilter} transactions, skipped ${skipped.toLocaleString()}.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
