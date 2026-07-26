/**
 * DLD off-plan projects importer → `projects` table (forward supply pipeline).
 * Columns: PROJECT_NUMBER, PROJECT_EN, DEVELOPER_EN, START_DATE, END_DATE,
 *   PRJ_TYPE_EN, PROJECT_VALUE, PROJECT_STATUS, PERCENT_COMPLETED,
 *   COMPLETION_DATE, AREA_EN, ZONE_EN, CNT_LAND/BUILDING/VILLA/UNIT,
 *   MASTER_PROJECT_EN, DESCRIPTION_EN (dropped — long free text with newlines)
 *
 * - AREA_EN → canonical community · dedupe on PROJECT_NUMBER
 *   (⚠️ create the table first:  cd lib/db && npx drizzle-kit push)
 *
 * Usage:
 *   pnpm --filter @workspace/scripts exec tsx src/import-projects.ts <file.csv> [--dry-run --batch=500 --limit=0]
 */
import { streamCsvRecords } from "./csv-stream.js";
import { canonicalCommunity } from "./community-map.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const opt = (n: string, d: string) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split("=")[1] : d; };
if (!file) { console.error("Provide a CSV path."); process.exit(1); }
const dryRun = args.includes("--dry-run");
const batchSize = parseInt(opt("batch", "500"), 10);
const limit = parseInt(opt("limit", "0"), 10);

const num = (v: string) => { const n = parseFloat((v || "").replace(/[^0-9.]/g, "")); return isNaN(n) ? null : n; };
const intOrNull = (v: string) => { const n = num(v); return n == null ? null : Math.round(n); };
const isoDate = (v: string) => { const m = (v || "").match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; };

async function main() {
  const pool = dryRun ? null : (await import("@workspace/db")).pool;
  let idx: Record<string, number> | null = null;
  let headers: string[] = [];
  let batch: unknown[][] = [];
  const preview: unknown[] = [];
  let total = 0, kept = 0, skipped = 0;

  async function flush() {
    if (!batch.length || !pool) { batch = []; return; }
    const cols = 18;
    const values: unknown[] = [];
    const tuples = batch.map((r, i) => { values.push(...r); const b = i * cols; return `(${Array.from({ length: cols }, (_, k) => `$${b + k + 1}`).join(",")})`; });
    await pool.query(
      `INSERT INTO projects
       (project_number, project_name, developer_name, project_type, status, percent_completed, project_value, community, zone, master_project, unit_count, villa_count, building_count, land_count, start_date, end_date, completion_date, emirate)
       VALUES ${tuples.join(",")} ON CONFLICT (project_number) DO NOTHING`,
      values,
    );
    batch = [];
  }

  for await (const rec of streamCsvRecords(file!)) {
    if (!idx) { headers = rec.map((h) => h.replace(/^﻿/, "").trim()); idx = {}; headers.forEach((h, i) => (idx![h] = i)); continue; }
    total++;
    const g = (n: string) => (idx![n] != null ? rec[idx![n]] ?? "" : "");

    const projectNumber = (g("PROJECT_NUMBER") || "").trim();
    const community = canonicalCommunity(g("AREA_EN"));
    if (!projectNumber || !community) { skipped++; if (limit && total >= limit) break; continue; }

    const row = [
      projectNumber,
      (g("PROJECT_EN") || "").slice(0, 255) || null,
      (g("DEVELOPER_EN") || "").slice(0, 255) || null,
      g("PRJ_TYPE_EN") || null,
      g("PROJECT_STATUS") || null,
      num(g("PERCENT_COMPLETED")),
      num(g("PROJECT_VALUE")),
      community,
      (g("ZONE_EN") || "").slice(0, 255) || null,
      (g("MASTER_PROJECT_EN") || "").slice(0, 255) || null,
      intOrNull(g("CNT_UNIT")),
      intOrNull(g("CNT_VILLA")),
      intOrNull(g("CNT_BUILDING")),
      intOrNull(g("CNT_LAND")),
      isoDate(g("START_DATE")),
      isoDate(g("END_DATE")),
      isoDate(g("COMPLETION_DATE")),
      "Dubai",
    ];

    kept++;
    if (dryRun) { if (preview.length < 6) preview.push({ no: projectNumber, name: row[1], dev: row[2], status: row[4], pct: row[5], value: row[6], community, units: row[10], villas: row[11], end: row[15] }); }
    else { batch.push(row); if (batch.length >= batchSize) await flush(); }
    if (limit && total >= limit) break;
  }
  await flush();
  if (pool) await pool.end();

  if (dryRun) {
    console.log("Detected columns:", headers);
    console.log("\nSample of mapped projects (first 6 kept):");
    for (const p of preview) console.log("  ", JSON.stringify(p));
    console.log(`\nDRY RUN — nothing written. ${total.toLocaleString()} scanned → ${kept.toLocaleString()} would load, ${skipped.toLocaleString()} skipped.`);
  } else {
    console.log(`\nDone. ${total.toLocaleString()} scanned → loaded ${kept.toLocaleString()} projects, skipped ${skipped.toLocaleString()}.`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
