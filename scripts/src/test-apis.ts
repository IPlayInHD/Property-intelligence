/**
 * Self-test / health check for all external data providers + the DLD importer.
 *
 * Run it where your API keys (env vars) live — and, for the geo-restricted
 * government APIs, from a UAE connection:
 *   pnpm --filter @workspace/scripts exec tsx src/test-apis.ts
 *
 * For each provider it prints:  ✅ pass · ⏭️  skip (no key) · ❌ fail (+reason)
 * No secrets are printed. Uses native fetch (Node 18+).
 */
import { detectColumns, mapRow, parseCsvLine } from "./dld-parse.js";
import { canonicalCommunity } from "./community-map.js";

type Status = "pass" | "fail" | "skip";
interface Result { name: string; status: Status; detail: string; }
const results: Result[] = [];
const add = (name: string, status: Status, detail = "") => results.push({ name, status, detail });

async function getJson(url: string, headers: Record<string, string> = {}, ms = 12000): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(ms) });
  let body: any = null;
  try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
  return { ok: res.ok, status: res.status, body };
}

// ── 0. DLD importer parse self-test (no network) ──────────────────────────
function testDldParser() {
  const csv = [
    "TRANSACTION_NUMBER,INSTANCE_DATE,GROUP_EN,PROP_SB_TYPE_EN,AREA_EN,ROOMS_EN,ACTUAL_AREA,TRANS_VALUE,PROJECT_EN",
    "101-1-2026,2026-07-01,Sales,Flat,Dubai Marina,2 B/R,110,2750000,Marina Gate",   // 110 sqm → ~1184 sqft
    "101-2-2026,2026-07-01,Mortgage,Flat,Business Bay,1 B/R,80,1500000,West Bay",     // skipped (not Sales)
    "101-3-2026,2026-07-02,Sales,Flat,JVC,Studio,40,540000,Belgravia",                // studio → 0 beds
  ];
  const headers = parseCsvLine(csv[0]);
  const col = detectColumns(headers);
  const opts = { areaUnit: "sqm", groupFilter: "sales", emirate: "Dubai" };
  const rows = csv.slice(1).map((l) => mapRow(parseCsvLine(l), col, opts));

  const kept = rows.filter(Boolean);
  const marina = rows[0]!;
  const jvc = rows[2]!;
  const okCount = kept.length === 2;                                   // mortgage skipped
  const okSqft = marina && Math.abs(marina.sizeSqft! - 110 * 10.7639) < 1; // sqm→sqft
  const okPsf = marina && Math.abs(marina.pricePerSqft! - 2750000 / (110 * 10.7639)) < 1;
  const okStudio = jvc && jvc.bedrooms === 0;
  const okBeds = marina && marina.bedrooms === 2;
  const okType = marina && marina.propertyType === "Apartment";
  if (okCount && okSqft && okPsf && okStudio && okBeds && okType)
    add("DLD importer (parse logic)", "pass", `Marina 2BR: ${marina.sizeSqft} sqft, AED ${marina.pricePerSqft}/sqft; mortgage row skipped; studio=0`);
  else
    add("DLD importer (parse logic)", "fail", `count=${okCount} sqft=${okSqft} psf=${okPsf} studio=${okStudio} beds=${okBeds} type=${okType}`);
}

// ── 1 & 7. RapidAPI (UAE Real Estate + Bayut) ─────────────────────────────
async function testRapid() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) { add("#1 UAE Real Estate (RapidAPI)", "skip", "RAPIDAPI_KEY not set"); add("#7 Bayut (RapidAPI)", "skip", "RAPIDAPI_KEY not set"); return; }
  const ueHost = process.env.UAE_RE_RAPIDAPI_HOST || "uae-real-estate-api.p.rapidapi.com";
  const byHost = process.env.BAYUT_RAPIDAPI_HOST || "bayut.p.rapidapi.com";
  try {
    const r = await getJson(`https://${ueHost}/search-agencies?query=Dubai`, { "X-RapidAPI-Key": key, "X-RapidAPI-Host": ueHost });
    add("#1 UAE Real Estate (RapidAPI)", r.ok ? "pass" : "fail", r.ok ? `HTTP ${r.status}, keys: ${Object.keys(r.body || {}).slice(0, 5).join(",")}` : `HTTP ${r.status} — check endpoint path/subscription`);
  } catch (e) { add("#1 UAE Real Estate (RapidAPI)", "fail", String((e as Error).message)); }
  try {
    const r = await getJson(`https://${byHost}/auto-complete?query=${encodeURIComponent("Dubai Marina")}&hitsPerPage=5`, { "X-RapidAPI-Key": key, "X-RapidAPI-Host": byHost });
    const hits = r.body?.hits?.length ?? 0;
    add("#7 Bayut (RapidAPI)", r.ok && hits > 0 ? "pass" : "fail", r.ok ? `HTTP ${r.status}, ${hits} locations` : `HTTP ${r.status}`);
  } catch (e) { add("#7 Bayut (RapidAPI)", "fail", String((e as Error).message)); }
}

// ── 2. Google Geocoding / Places ──────────────────────────────────────────
async function testGoogle() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) { add("#2 Google Geocoding/Places", "skip", "GOOGLE_PLACES_API_KEY not set"); return; }
  try {
    const r = await getJson(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent("Dubai Marina")}&key=${key}`);
    const st = r.body?.status;
    add("#2 Google Geocoding/Places", st === "OK" ? "pass" : "fail", `status=${st}${r.body?.error_message ? " — " + r.body.error_message : ""}`);
  } catch (e) { add("#2 Google Geocoding/Places", "fail", String((e as Error).message)); }
}

// ── 3. Dubai gov DLD Developer Details (OAuth, geo-restricted) ─────────────
async function testDldGov() {
  const id = process.env.DUBAI_DLD_CLIENT_ID, secret = process.env.DUBAI_DLD_CLIENT_SECRET;
  if (!id || !secret) { add("#3 DLD Developer Details (gov)", "skip", "DUBAI_DLD_CLIENT_ID/SECRET not set"); return; }
  const tokenUrl = process.env.DUBAI_DLD_TOKEN_URL || "https://apis.dubai.gov.ae/oauth2/token";
  try {
    const res = await fetch(`${tokenUrl}?grant_type=client_credentials&client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}`, { method: "POST", signal: AbortSignal.timeout(12000) });
    add("#3 DLD Developer Details (gov)", res.ok ? "pass" : "fail", res.ok ? "OAuth token issued" : `HTTP ${res.status} — likely geo-restricted (needs UAE IP) or token URL differs`);
  } catch (e) { add("#3 DLD Developer Details (gov)", "fail", `${(e as Error).message} — gov APIs need a UAE connection`); }
}

// ── Keyed scaffolds (only if configured) ──────────────────────────────────
function testScaffold(name: string, env: string) {
  if (process.env[env]) add(name, "fail", `${env} set but endpoint not verified — confirm in provider docs`);
  else add(name, "skip", `${env} not set`);
}

async function main() {
  console.log("\nOnyx Atlas — provider self-test\n" + "─".repeat(52));
  testDldParser();
  // community normalization: DLD name ↔ portal name must meet
  const c1 = canonicalCommunity("Marsa Dubai"), c2 = canonicalCommunity("Dubai Marina");
  const c3 = canonicalCommunity("BUSINESS BAY"), c4 = canonicalCommunity("Business Bay");
  add("Community normalization", c1 === c2 && c1 === "Dubai Marina" && c3 === c4 ? "pass" : "fail",
    `Marsa Dubai→"${c1}" == Dubai Marina→"${c2}"; BUSINESS BAY→"${c3}"`);
  await testRapid();
  await testGoogle();
  await testDldGov();
  testScaffold("#4 Zyla", "ZYLA_API_KEY");
  testScaffold("#9 Reelly", "REELLY_API_KEY");
  testScaffold("#13 Makani", "MAKANI_CLIENT_ID");
  add("#5/#11/#12 Open data", "skip", "no API key — load CSVs with import-dld.ts");

  const icon = { pass: "✅", fail: "❌", skip: "⏭️ " } as const;
  for (const r of results) console.log(`${icon[r.status]} ${r.name.padEnd(34)} ${r.detail}`);
  const pass = results.filter((r) => r.status === "pass").length;
  const fail = results.filter((r) => r.status === "fail").length;
  const skip = results.filter((r) => r.status === "skip").length;
  console.log("─".repeat(52));
  console.log(`${pass} passed · ${fail} failed · ${skip} skipped (not configured)\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
