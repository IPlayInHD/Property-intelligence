/**
 * DLD Residential Sale Price Index importer → `macro_data` table (long format).
 *
 * The source is a wide monthly time series with index + average-price columns
 * for all/flat/villa at monthly/quarterly/yearly cadence:
 *   all_monthly_index, all_monthly_price_index, all_quarterly_index, ...
 *   villa_yearly_price_index, first_date_of_month, load_timestamp
 *
 * Each non-empty metric cell is melted into one macro_data row:
 *   metric_name = the column header  ·  period = YYYY-MM (first_date_of_month)
 *   metric_value = the cell  ·  source = dld_residential_sale_index
 * Re-runnable: ON CONFLICT (metric_name, period, source) DO UPDATE.
 *   (⚠️ push the schema first:  cd lib/db && npx drizzle-kit push)
 *
 * Usage:
 *   pnpm --filter @workspace/scripts exec tsx src/import-price-index.ts <file.csv> [--dry-run --source=... --batch=1000 --limit=0]
 */
import { streamCsvRecords } from "./csv-stream.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const opt = (n: string, d: string) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split("=")[1] : d; };
if (!file) { console.error("Provide a CSV path."); process.exit(1); }
const dryRun = args.includes("--dry-run");
const source = opt("source", "dld_residential_sale_index");
const batchSize = parseInt(opt("batch", "1000"), 10);
const limit = parseInt(opt("limit", "0"), 10);

// non-metric columns to skip when melting
const SKIP = new Set(["first_date_of_month", "load_timestamp"]);
const num = (v: string) => { const n = parseFloat((v || "").replace(/[^0-9.\-]/g, "")); return isNaN(n) ? null : n; };
const period = (v: string) => { const m = (v || "").match(/^(\d{4})-(\d{2})/); return m ? `${m[1]}-${m[2]}` : null; };

async function main() {
  const pool = dryRun ? null : (await import("@workspace/db")).pool;
  let idx: Record<string, number> | null = null;
  let headers: string[] = [];
  let metricCols: string[] = [];
  let batch: unknown[][] = [];
  const preview: unknown[] = [];
  let months = 0, cells = 0, empty = 0;

  async function flush() {
    if (!batch.length || !pool) { batch = []; return; }
    const cols = 4;
    const values: unknown[] = [];
    const tuples = batch.map((r, i) => { values.push(...r); const b = i * cols; return `(${Array.from({ length: cols }, (_, k) => `$${b + k + 1}`).join(",")})`; });
    await pool.query(
      `INSERT INTO macro_data (metric_name, metric_value, period, source)
       VALUES ${tuples.join(",")}
       ON CONFLICT (metric_name, period, source) DO UPDATE SET metric_value = EXCLUDED.metric_value`,
      values,
    );
    batch = [];
  }

  for await (const rec of streamCsvRecords(file!)) {
    if (!idx) {
      headers = rec.map((h) => h.replace(/^﻿/, "").trim());
      idx = {}; headers.forEach((h, i) => (idx![h] = i));
      metricCols = headers.filter((h) => h && !SKIP.has(h));
      continue;
    }
    const g = (n: string) => (idx![n] != null ? rec[idx![n]] ?? "" : "");
    const p = period(g("first_date_of_month"));
    if (!p) { continue; }
    months++;

    for (const col of metricCols) {
      const val = num(g(col));
      if (val == null) { empty++; continue; }
      cells++;
      if (dryRun) { if (preview.length < 8) preview.push({ metric: col, period: p, value: val }); }
      else { batch.push([col, val, p, source]); if (batch.length >= batchSize) await flush(); }
    }
    if (limit && months >= limit) break;
  }
  await flush();
  if (pool) await pool.end();

  if (dryRun) {
    console.log("Metric columns melted:", metricCols.length, metricCols);
    console.log("\nSample of melted rows (first 8):");
    for (const p of preview) console.log("  ", JSON.stringify(p));
    console.log(`\nDRY RUN — nothing written. ${months} months → ${cells.toLocaleString()} metric rows would load (${empty.toLocaleString()} empty cells skipped).`);
  } else {
    console.log(`\nDone. ${months} months → upserted ${cells.toLocaleString()} metric rows (${empty.toLocaleString()} empty cells skipped).`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
