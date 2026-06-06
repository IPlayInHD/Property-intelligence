# PropIQ

UAE property intelligence platform — institutional-grade analysis for serious investors. Runs 6 modules (Price Fairness, QoL Score, Forecast, Liquidity, Rental Yield, Neighbourhood Trends) against DLD transaction data and public APIs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server on port 8080
- `pnpm --filter @workspace/propiq run dev` — Frontend on port 25221
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — seed communities, macro data, service charges, DLD transactions, and demo user

## Required Secrets

These must be set in Replit Secrets (never in source files):

| Secret | Required | Purpose |
|---|---|---|
| `JWT_SECRET` | **Yes** | Signs auth tokens — server won't start without it |
| `DATABASE_URL` | Auto-managed | Postgres connection (set by Replit DB) |

## Optional API Keys (graceful fallback if absent)

| Variable | Purpose | Fallback |
|---|---|---|
| `DUBAI_PULSE_API_KEY` | Dubai Pulse DLD live feed | Uses seeded historical data |
| `DUBAI_PULSE_API_SECRET` | Dubai Pulse DLD live feed | Uses seeded historical data |
| `GOOGLE_PLACES_API_KEY` | QoL score amenity lookup | OpenStreetMap Overpass fallback |
| `VITE_MAPBOX_TOKEN` | Interactive map on analysis page | OpenStreetMap link widget |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, pino logging, cookie-parser, drizzle-orm
- DB: PostgreSQL + Drizzle ORM (8 tables)
- Auth: httpOnly cookie JWT — no tokens in localStorage
- Frontend: React + Vite, wouter routing, shadcn/ui, recharts, react-map-gl
- API codegen: Orval (from OpenAPI spec in `artifacts/api-spec/`)
- Build: esbuild (ESM bundle), pdfkit externalized

## Where things live

- `lib/db/src/schema/index.ts` — all 8 DB table definitions (source of truth)
- `artifacts/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `artifacts/api-server/src/services/` — analysis modules (priceFairness, qolScore, forecast, liquidity, rentalYield, trends, cbuae, worldBank)
- `artifacts/api-server/src/routes/` — Express routes
- `artifacts/propiq/src/pages/` — frontend pages (landing, login, signup, dashboard, analysis-new, analysis-details, account)
- `artifacts/propiq/src/components/ui/CommunityMap.tsx` — Mapbox/OSM map component

## Architecture decisions

- Cookie-only auth: JWT stored in httpOnly cookie, never in localStorage. `/auth/me` is the session source of truth.
- JWT_SECRET is mandatory at startup — `process.exit(1)` if missing, no fallback secret.
- SSRF protection on `/api/scrape/listing-url`: strict `new URL()` parse + exact hostname allowlist + private range blocking.
- pdfkit/fontkit externalized in `build.mjs` to prevent @swc/helpers CJS crash at runtime.
- `lib/db` is a project-reference package — compile with `cd lib/db && npx tsc --build tsconfig.json` if schema changes are made.
- Liquidity module is Pro-tier only; Forecast and Rental Yield require Analyst tier.

## Demo user

- Email: `demo@propiq.ae`  
- Password: `PropIQ2025!`  
- Plan: Pro (all 6 modules)

## User preferences

_Populate as you build._

## Gotchas

- After schema changes, compile `lib/db` before restarting the API server.
- The Vite HMR warning "useAuth export incompatible" for auth.tsx is non-blocking — it triggers a full reload, not an error.
- DLD transactions table uses seeded synthetic data; real data requires Dubai Pulse API keys.
