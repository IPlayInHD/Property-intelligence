# Onyx Atlas — Data & API Integration

How the 14 UAE real-estate data sources connect to the backend. **All secrets
live in environment variables — never in code or shared documents.** Set them in
your host's Environment Variables panel (see `artifacts/api-server/.env.example`).

## Status legend
- ✅ **Wired & key-ready** — code exists, add the env var and it works.
- 🧩 **Scaffolded** — code exists but you don't have credentials yet.
- 📄 **Open data** — no key; load the files with the importer.
- 💰 **Deferred** — paid/partner/license; documented, not built.

| # | Provider | Status | Env var(s) | Service / how |
|---|----------|--------|-----------|---------------|
| 1 | UAE Real Estate API (RapidAPI) | ✅ | `RAPIDAPI_KEY` | `services/uaeRealEstate.ts` |
| 2 | Google Geocoding / Places | ✅ | `GOOGLE_PLACES_API_KEY` | `services/googlePlaces.ts` (QoL) |
| 3 | Dubai API Gallery — DLD Developer Details | 🧩 (have creds) | `DUBAI_DLD_CLIENT_ID/SECRET/DDA_KEY` | `services/dldDeveloperDetails.ts` |
| 4 | Zyla UAE Real Estate Data | 🧩 | `ZYLA_API_KEY` | `services/zyla.ts` |
| 5 | DLD Open Data / Data.Dubai | 📄 | — | `scripts/src/import-dld.ts` |
| 6 | DLD API Gateway (Ejari, Mollak…) | 💰 | — | deferred (AED 30k/yr + trade licence) |
| 7 | Bayut API (RapidAPI) | ✅ | `RAPIDAPI_KEY` | `services/bayutApi.ts` |
| 8 | Property Finder Enterprise | 💰 | — | deferred (partner agreement) |
| 9 | Reelly (off-plan) | 🧩 | `REELLY_API_KEY` | `services/reelly.ts` |
| 10 | Madhmoun — ADREC MLS | 💰 | — | deferred (ADREC licence) |
| 11 | Abu Dhabi Open Data | 📄 | — | importer (map columns) |
| 12 | Bayanat (federal) | 📄 | — | importer / macro data |
| 13 | Makani (Dubai Municipality) | 🧩 | `MAKANI_CLIENT_ID/SECRET` | `services/makani.ts` |
| 14 | REIDIN | 💰 | — | deferred (enterprise contract) |

`services/config.ts` centralises every key; `apiStatus()` reports which are live.

## Loading your DLD transaction data (the big win)

The open-data CSVs (#5, and the same pattern for #11/#12) go straight into the
`dld_transactions` table the engine already queries:

```bash
# where the CSV file and DATABASE_URL both live:
pnpm --filter @workspace/scripts exec tsx src/import-dld.ts /path/transactions.csv
# options: --area-unit=sqm|sqft (default sqm)  --group=Sales  --emirate=Dubai  --batch=1000  --limit=0
```

The importer streams the file (safe for 560 MB+), keeps **Sales only**, converts
DLD **square-metres → square-feet**, parses `ROOMS_EN`, maps `AREA_EN`→community
and `PROJECT_EN`→building, computes price/sqft, and dedupes. Once loaded,
`priceFairness`, `forecast`, `liquidity` and `trends` compute from **your real
transactions** automatically — no engine change needed.

> ⚠️ gov.ae open-data portals are geo-restricted — download the CSVs from a UAE
> connection, then run the importer anywhere your database is reachable.

## Security (important)
- **Rotate any key that has ever been in a document or screenshot**, including the
  RapidAPI key and the Dubai DLD OAuth `client_id`/`client_secret`/`x-DDA` key.
- Keys go **only** in environment variables.
- **Google Places**: their terms forbid long-term storage of results — use it for
  live lookups/display, not for building a stored dataset. For anything cached,
  prefer the OpenStreetMap/Overpass service (`services/overpass.ts`).

## Verifying the live APIs
These clients are written to documented shapes but **not yet tested against the
live endpoints** (they need your keys and, for gov APIs, a UAE connection). After
setting a key, make one call and check the console: each service logs and returns
`null`/`[]` on failure rather than crashing, so nothing breaks while you confirm
the exact response fields and adjust the `map*` helpers if needed.
