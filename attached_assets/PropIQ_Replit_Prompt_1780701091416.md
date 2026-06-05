# PropIQ — Replit Agent Master Build Prompt

---

## OVERVIEW & MISSION

Build **PropIQ** — a full-stack UAE property intelligence web application. PropIQ is NOT a listings platform. It is an analytics and intelligence layer that sits on top of the UAE real estate market, taking any property a user inputs and generating a comprehensive, data-driven financial analysis report. Think of it as the difference between a real estate portal and a Bloomberg terminal for UAE property.

The platform must be fully functional, data-connected, and production-ready with real API integrations (not mock data). Every analytical output must be computed from live or recently cached real-world data.

---

## TECH STACK

**Frontend:**
- React 18 with Vite
- TailwindCSS for utility styling
- Recharts for data visualisations (charts, trend lines, scenario graphs)
- Mapbox GL JS for interactive maps (use free public token for development)
- Framer Motion for animations and transitions
- React Router v6 for navigation

**Backend:**
- Node.js with Express.js
- PostgreSQL database (use Replit's built-in PostgreSQL)
- Redis for caching API responses (use Replit's built-in Redis or an in-memory cache fallback)
- Axios for all HTTP requests to external APIs
- node-cron for scheduled data refresh jobs
- dotenv for environment variable management

**Architecture:**
- Monorepo: `/client` (React frontend) and `/server` (Express backend)
- RESTful API between frontend and backend
- All external API keys stored as Replit Secrets (environment variables) — never hardcoded
- Modular backend: separate route files and service files for each analytical module

---

## DESIGN & UI DIRECTION

The visual identity is **"institutional intelligence meets Gulf luxury"** — dark navy backgrounds, clean data visualisations, gold accent lines, and a feeling of gravitas. Like a private wealth management dashboard built specifically for the UAE market.

**Colour palette (use as CSS variables):**
```
--navy-deep:    #0A1628
--navy-mid:     #0D2B4E
--navy-card:    #112240
--teal-accent:  #0A8A8A
--teal-light:   #14B8B8
--gold-accent:  #C8960C
--gold-light:   #F0B429
--text-primary: #E8F0FB
--text-muted:   #7A94B4
--success:      #22C55E
--warning:      #F59E0B
--danger:       #EF4444
--card-border:  rgba(255,255,255,0.08)
```

**Typography:**
- Display headings: `DM Serif Display` (import from Google Fonts)
- Body and UI text: `DM Sans` (import from Google Fonts)
- Data/numbers: `JetBrains Mono` for metric values

**Key UI principles:**
- Dark theme throughout — no light mode
- Cards with subtle glass morphism effect: `background: rgba(17,34,64,0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08);`
- Smooth page transitions with Framer Motion fade+slide
- Skeleton loading states for all data-fetching components
- Tooltips on every metric explaining what it means and how it was calculated
- Mobile responsive — must work well on iPhone and Android

---

## APPLICATION STRUCTURE & PAGES

### 1. Landing Page (`/`)

**Hero section:**
- Full-screen dark background with a subtle animated grid/mesh pattern
- Headline: "Know What a Property Is Really Worth"
- Sub-headline: "The UAE's first property intelligence platform. Beyond listings — real financial clarity."
- CTA buttons: "Analyse a Property" (primary) and "See How It Works" (secondary)
- Animated counter strip: "180,000+ UAE transactions analysed • 6 intelligence modules • Real DLD data"

**Features section:**
- Six feature cards with icons, each corresponding to one of the 6 analytical modules
- Brief one-line description of what each module does

**Comparison section:**
- A clean comparison table: PropIQ vs Bayut vs Propertyfinder vs Dubizzle
- Show which features only PropIQ has

**Pricing section:**
- Three pricing cards: Starter (Free), Analyst (AED 30/mo), Pro (AED 150/mo)
- Feature list per tier with checkmarks
- "Get Started" CTA on each card

**Footer:**
- PropIQ logo, navigation links, disclaimer: "PropIQ analysis is for informational purposes only and does not constitute financial advice."

---

### 2. Authentication Pages (`/signup`, `/login`)

- Clean, minimal auth forms on a dark background
- Email + password signup
- On signup: ask user to select their role (Investor / Real Estate Agent / First-time Buyer / General)
- Store role in user profile — used to personalise dashboard language
- JWT-based authentication stored in httpOnly cookies
- On login: redirect to dashboard

---

### 3. Dashboard (`/dashboard`)

**Left sidebar navigation:**
- PropIQ logo at top
- Nav items: Dashboard, New Analysis, My Analyses, Account, Upgrade
- Current plan badge (Starter / Analyst / Pro)
- Usage counter: "3 of 5 analyses used this month" with progress bar

**Main content area:**
Welcome card showing user's first name, current plan, and usage
Recent analyses list (cards showing property address, analysis date, overall score)
Quick-start search bar to begin a new analysis immediately

---

### 4. New Analysis Page (`/analysis/new`)

**Step 1 — Property Input**
A prominent search interface with two input methods:

**Method A — Search by listing URL:**
- Paste a Bayut, Propertyfinder, or Dubizzle listing URL
- Backend scrapes the listing and auto-populates the property details form

**Method B — Manual entry form with these fields:**
- Property type: Apartment / Villa / Townhouse / Penthouse / Studio
- Emirate: Dubai / Abu Dhabi / Sharjah / RAK / Ajman
- Community/Area (dropdown populated from database of UAE communities)
- Building name (free text)
- Floor number
- Unit size in sqft (number input)
- Number of bedrooms (0 = Studio, 1, 2, 3, 4, 4+)
- Number of bathrooms
- Listed price in AED (number input)
- Is it listed for sale or rent? (toggle)
- View type: Sea / Marina / Community / Garden / City / None
- Parking included? (yes/no)
- Furnished? (Yes / No / Partial)
- Year built / handover year (approximate)

**Step 2 — Confirm & Analyse**
- Show a summary card of the entered property details
- "Run PropIQ Analysis" button
- Show estimated time: "Analysis takes 15–30 seconds"
- Trigger analysis API call with loading animation while processing

---

### 5. Analysis Results Page (`/analysis/:id`)

This is the core product. Display results in clearly labelled sections, one per analytical module. Each section has a header, the score/output, a plain-English explanation, and a data sources footnote.

**TOP OF PAGE — Property Summary Card**
- Property address/description
- Listed price in AED (formatted: AED 1,250,000)
- Key specs: beds / baths / sqft / price-per-sqft
- Overall PropIQ Intelligence Score (0–100, large circular gauge)
- Share button / Download PDF report button

---

#### MODULE 1 — Price Fairness Index

**Display:**
- A horizontal gauge from -30% to +30%, with a needle pointing to the result
- Colour coded: red (overpriced >10%), amber (slightly over 5–10%), green (fair or undervalued)
- The percentage figure displayed large: e.g. "-8.3% — Undervalued"
- Verdict label: "Significantly Overpriced" / "Slightly Overpriced" / "Fairly Priced" / "Good Value" / "Significant Opportunity"

**Below the gauge:**
- Table of comparable transactions: show 5–8 recent DLD transactions for similar properties in the same community, with sale price, size, price/sqft, and date
- "This property is listed at AED [X]/sqft. Recent comparable sales in [community] averaged AED [Y]/sqft."

**Data source:** Dubai Land Department transaction data via Dubai Pulse API

**Calculation logic (backend):**
```
1. Query DLD transactions for same: emirate + community + property_type + bedroom_count
   within the last 12 months
2. Filter to units within 20% of the subject property's sqft
3. Calculate median price_per_sqft from qualifying transactions (minimum 3 required)
4. Apply adjustments:
   - Floor premium: +0.5% per floor above ground (cap at 15%)
   - View premium: Sea/Marina +8%, City +4%, Community/Garden +2%, None 0%
   - Furnished premium: +5% if furnished
   - Building age discount: -1% per year for buildings >10 years old (cap at -15%)
5. Adjusted_benchmark_psf = median_psf * (1 + adjustment_factors)
6. Fairness_score = ((listed_psf - adjusted_benchmark_psf) / adjusted_benchmark_psf) * 100
7. Negative = undervalued, Positive = overpriced
```

---

#### MODULE 2 — Quality of Life Score

**Display:**
- Overall QoL score: large number out of 100 with a circular progress ring
- Six sub-scores displayed as horizontal bars (each out of 20 points):
  1. Transport Access (Metro, bus proximity)
  2. Education (schools within 2km)
  3. Healthcare (hospitals, clinics)
  4. Retail & Dining (supermarkets, restaurants)
  5. Recreation (parks, gyms, beaches)
  6. Noise & Environment (distance from highways, airports)
- Small interactive map showing the property pin and nearby amenities (coloured dots by category)

**Data sources:**
- Google Places API (Nearby Search) for amenity counts and ratings
- OpenStreetMap / Overpass API for Metro stations, bus stops, parks, road proximity
- Dubai RTA open data for official Metro and tram stations

**Calculation logic (backend):**
```
For each sub-category, query within radius and score:

Transport (20 pts):
  - Metro station <500m: 20pts | <1km: 15pts | <2km: 10pts | >2km: 5pts
  - Bus stop <200m: +3 bonus (cap at 20)

Education (20 pts):
  - Count schools within 2km from Google Places
  - Score = min(count * 4, 20) + bonus for rated 4.0+ schools

Healthcare (20 pts):
  - Hospitals within 3km: 10pts each (cap at 20)
  - Clinics within 1km: 3pts each (cap at 10 bonus)

Retail & Dining (20 pts):
  - Supermarket within 500m: 10pts
  - Restaurants >10 within 1km: 5pts
  - Mall within 3km: 5pts

Recreation (20 pts):
  - Park/beach within 1km: 8pts
  - Gym within 500m: 6pts
  - Additional recreational facilities: up to 6pts

Noise & Environment (20 pts):
  - Distance from Sheikh Zayed Road / E11 major highways: scale 0–10
  - Distance from DXB airport flight path: scale 0–10

Total QoL = sum of all six sub-scores
```
Cache QoL results per community for 30 days (not per property — community-level is sufficient).

---

#### MODULE 3 — Future Valuation (Three-Scenario Forecast)

**Display:**
- A Recharts area chart showing three lines over 5 years:
  - Bear Case (red/dashed)
  - Base Case (teal/solid)
  - Bull Case (gold/dashed)
- X-axis: Year 1, Year 2, Year 3, Year 4, Year 5
- Y-axis: Property value in AED
- Toggle buttons to switch between 1-year, 3-year, 5-year view
- Below chart: a 3-column summary card (Bear / Base / Bull) showing:
  - Projected value at Year 3 and Year 5
  - % change from current price
  - Key assumption driving that scenario

**Data sources:**
- UAE Central Bank open data (interest rates, inflation)
- IMF Data API (GDP growth forecasts)
- World Bank API (population projections)
- DLD historical transaction data (community price trend, last 5 years)
- CBUAE quarterly economic bulletins (parsed from public PDF/data portal)

**Calculation logic (backend):**
```
Base annual growth rate = community_5yr_cagr (from DLD historical data)

Scenario multipliers (applied to base rate):

BEAR CASE:
  - Interest rate adjustment: if CBUAE rate >5.5% → growth_rate * 0.4
  - Supply pressure: if new_units_pipeline > 2000 in community → growth_rate * 0.6
  - Base bear modifier: -3.5% annual adjustment
  - Floor: max(-8%, bear_adjusted_rate) — never model more than -8%/yr

BASE CASE:
  - Use community_5yr_cagr directly
  - Apply IMF UAE GDP forecast as a 0.3x correlated multiplier
  - Moderate population growth premium: +0.5% if area in high-demand zone

BULL CASE:
  - Base modifier: +4% annual bonus
  - Infrastructure premium: +2% if community within 2km of announced major project
  - Demand multiplier: if community in top-20 transaction volume → *1.15
  - Cap: max(15%, bull_adjusted_rate) — never model more than 15%/yr

Year_N_value = current_price * (1 + scenario_rate)^N
```

Display confidence intervals as a shaded band around each line.

---

#### MODULE 4 — Liquidity Score (Pro tier only)

**Display:**
- Score from 1.0 to 10.0 displayed as a large gauge
- Label: "1–3: Difficult to exit | 4–6: Moderate | 7–10: Highly Liquid"
- Supporting stats below:
  - Average days-on-market for this property type in this community
  - Transaction velocity: "X properties sold in this community in the last 90 days"
  - Investor vs end-user buyer ratio: "68% investor-owned community"
  - Comparable active listings count: "42 similar units currently listed"

**Data sources:**
- DLD transaction data (transaction frequency and velocity by community)
- Bayut/Propertyfinder/Dubizzle scraped listing data (active listing count, listing age tracking)

**Calculation logic (backend):**
```
Liquidity_score components (each out of 2 points, total out of 10):

1. Transaction velocity: transactions_last_90_days in community
   >30 → 2.0 | 15–30 → 1.5 | 5–15 → 1.0 | <5 → 0.5

2. Days on market (from listing tracking): avg_days_listed
   <30 days → 2.0 | 30–60 → 1.5 | 60–90 → 1.0 | >90 → 0.5

3. Active supply ratio: active_listings / monthly_avg_transactions
   <1.5 → 2.0 | 1.5–3 → 1.5 | 3–5 → 1.0 | >5 → 0.5

4. Property type liquidity modifier:
   Studio → +0.5 | 1BR → +0.3 | 2BR → 0 | 3BR → -0.2 | Villa → -0.4

5. Price bracket modifier:
   <1M AED → +0.5 | 1M–3M → 0 | 3M–7M → -0.3 | >7M → -0.6

Final = sum of components + modifiers (capped 1.0–10.0)
```

---

#### MODULE 5 — True Rental Yield

**Display:**
- Two large numbers side by side:
  - Gross Yield: e.g. "7.2%" (with label "What platforms quote")
  - True Net Yield: e.g. "4.8%" (with label "What you actually earn")
- Below: a waterfall-style breakdown bar showing deductions:
  - Gross rental income
  - Minus: Service charges (AED amount/year)
  - Minus: Estimated vacancy (X% = AED amount)
  - Minus: Management fees (if applicable)
  - Minus: Maintenance reserve
  - = Net annual income (AED)
  - = True yield %
- Toggle: "Self-managed" vs "Agency-managed" (adds 8% management fee)
- Annual cash flow summary: "At AED [purchase_price], expect AED [net_annual] net income per year"

**Data sources:**
- RERA Rental Index (from DLD API or RERA published data) — market rent for area/size/beds
- RERA Service Charge Register (from Dubai REST API or scraped from RERA public database)
- DLD Ejari rental transaction data for actual registered market rents

**Calculation logic (backend):**
```
1. market_rent_annual = RERA_rental_index[emirate][community][bedrooms][sqft_band]
   (If not available, estimate from: median of Bayut/PF scraped rental listings for same params)

2. service_charge_annual = RERA_service_charge_psf[building] * property_sqft
   (If building not in RERA register, use community average psf rate)

3. vacancy_deduction = market_rent_annual * community_vacancy_rate
   (community_vacancy_rate from DLD: (listed_units / total_units) estimate, default 8% if unavailable)

4. management_fee = if agency_managed: market_rent_annual * 0.08 else 0

5. maintenance_reserve = property_sqft * 15  (AED 15/sqft/year standard estimate)

6. net_income = market_rent_annual - service_charge_annual - vacancy_deduction
                - management_fee - maintenance_reserve

7. gross_yield = (market_rent_annual / listed_price) * 100
8. net_yield   = (net_income / listed_price) * 100
```

---

#### MODULE 6 — Neighbourhood Trend Analytics

**Display:**
- A Recharts line chart showing price-per-sqft trend for the community, quarterly over 5 years
- A second chart showing transaction volume (number of deals) per quarter
- A "Supply Pipeline" indicator: "X,XXX new units completing in this community in the next 24 months" (from developer announcements)
- Community profile snapshot:
  - Most common property type
  - Dominant buyer nationality (if available from DLD)
  - Avg holding period before resale
  - Price growth rank: "This community ranks #X out of Y tracked communities for 3-year price growth"

**Data sources:**
- DLD historical transaction data (5-year quarterly aggregates by community)
- Dubai Statistics Centre open data
- Developer pipeline: scraped from official developer websites and government project announcements

---

### 6. Account & Subscription Page (`/account`)

- Current plan display with usage stats
- Upgrade/downgrade plan options with Stripe-style payment UI (build the UI, use placeholder payment integration — note in code where Stripe should be connected)
- Profile settings: name, email, role, notification preferences
- Analysis history with ability to re-view or delete past analyses
- Option to download any past analysis as a PDF report

---

## BACKEND API ROUTES

Structure the Express backend with these route groups:

```
/api/auth
  POST /register
  POST /login
  POST /logout
  GET  /me

/api/analysis
  POST /new              — create new analysis, trigger all modules
  GET  /:id              — retrieve completed analysis
  GET  /history          — user's analysis history
  DELETE /:id            — delete an analysis

/api/modules
  POST /price-fairness   — run price fairness calculation
  POST /qol-score        — run quality of life score
  POST /forecast         — run scenario forecast
  POST /liquidity        — run liquidity score (Pro only)
  POST /rental-yield     — run rental yield calculation
  POST /trends           — fetch neighbourhood trends

/api/data
  GET /communities       — list of all UAE communities (for dropdown)
  GET /market-rents      — RERA rental index data
  GET /transactions      — DLD transaction data (filtered)

/api/scrape
  POST /listing-url      — scrape a Bayut/PF/Dubizzle URL and return property details

/api/user
  GET  /profile
  PUT  /profile
  GET  /subscription
  POST /upgrade
```

---

## EXTERNAL API INTEGRATIONS

Set all API keys as Replit Secrets. Build a `/server/services/` directory with one file per integration.

### `dubaiPulse.js` — Dubai Land Department Data
```javascript
// Base URL: https://api.dubaipulse.gov.ae
// Authentication: OAuth2 client credentials
// Required secrets: DUBAI_PULSE_API_KEY, DUBAI_PULSE_API_SECRET

// On startup: POST to /oauth/client_credential/accesstoken
// Store token in memory, refresh every 25 minutes (tokens expire at 30 min)

// Key endpoints to use:
// GET /dataset/DLD_TRANSACTIONS — sale transaction records
// GET /dataset/DLD_LAND_REGISTRY — title deed data
// Filter params: community, property_type, transaction_date, beds

// Build a caching layer: store community-level transaction aggregates
// in PostgreSQL, refresh nightly via cron job
// This reduces live API calls and stays within rate limits
```

### `googlePlaces.js` — Quality of Life Data
```javascript
// Base URL: https://maps.googleapis.com/maps/api
// Required secret: GOOGLE_PLACES_API_KEY

// Endpoints:
// /place/nearbysearch/json — find amenities near coordinates
//   params: location (lat,lng), radius (metres), type (school|hospital|gym|etc)
// /distancematrix/json — calculate walking/driving distance to Metro stations

// Cache all QoL results at the community level in PostgreSQL
// TTL: 30 days (amenities don't change frequently)
// Store as: qol_cache table (community, emirate, scores JSON, cached_at)
```

### `overpass.js` — OpenStreetMap Free Data
```javascript
// Base URL: https://overpass-api.de/api/interpreter
// No API key required

// Use for: Metro stations, bus stops, parks, major roads
// Build Overpass QL queries for UAE-specific data:
// [out:json]; node["railway"="station"](around:2000, lat, lon); out;

// Pre-compute and cache all OSM data for major UAE communities
// Store in qol_cache table alongside Google Places data
```

### `cbuae.js` — UAE Central Bank Economic Data
```javascript
// Base URL: https://www.centralbank.ae/en/open-data
// No API key required — open data

// Download: interest rate data, inflation figures, monetary statistics
// Schedule: monthly cron job to download and store in macro_data table
// Parse CSV/JSON files and store key metrics:
//   - policy_rate (current interest rate)
//   - inflation_rate
//   - money_supply_growth
// Use these as inputs to the Bear/Base/Bull scenario engine
```

### `worldBank.js` — GDP and Population Forecasts
```javascript
// Base URL: https://api.worldbank.org/v2
// No API key required

// Endpoints:
// /country/AE/indicator/NY.GDP.MKTP.KD.ZG — UAE GDP growth
// /country/AE/indicator/SP.POP.TOTL — UAE population
// ?format=json&per_page=10&mrv=5 — last 5 years

// Schedule: quarterly refresh cron job
// Store in macro_data table
```

### `scraper.js` — Listing Platform Data
```javascript
// Use: axios + cheerio for initial attempt
// Fallback: puppeteer (install as dependency)
// Required secret: PROXY_URL (if using Bright Data or Oxylabs proxy)

// Scrape from:
// Bayut: bayut.com/for-sale/properties-in-dubai/
// Propertyfinder: propertyfinder.ae/en/search
// Dubizzle: dubizzle.com/for-sale/

// What to extract per listing:
// { price, size_sqft, bedrooms, bathrooms, community, building,
//   floor, view_type, listing_date, agent_name, listing_url }

// Store in: listings table with scraped_at timestamp
// Run daily cron job to refresh listings
// Track listing age: if a listing disappears, record days_listed (for liquidity score)

// IMPORTANT: scrape respectfully — add 2-3 second delays between requests
// Rotate user-agent strings
// Handle 403/429 errors gracefully with exponential backoff
```

---

## DATABASE SCHEMA

```sql
-- Users and authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50), -- investor, agent, buyer, general
  plan VARCHAR(20) DEFAULT 'starter', -- starter, analyst, pro
  analyses_used_this_month INTEGER DEFAULT 0,
  plan_reset_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Completed property analyses
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  property_data JSONB NOT NULL, -- all input fields
  results JSONB, -- all module outputs stored as JSON
  status VARCHAR(20) DEFAULT 'pending', -- pending, complete, failed
  created_at TIMESTAMP DEFAULT NOW()
);

-- DLD transaction data cache
CREATE TABLE dld_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(100) UNIQUE,
  community VARCHAR(255),
  building_name VARCHAR(255),
  property_type VARCHAR(50),
  bedrooms INTEGER,
  size_sqft DECIMAL,
  sale_price DECIMAL,
  price_per_sqft DECIMAL,
  transaction_date DATE,
  emirate VARCHAR(50) DEFAULT 'Dubai',
  floor_number INTEGER,
  ingested_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_dld_community ON dld_transactions(community, property_type, bedrooms);
CREATE INDEX idx_dld_date ON dld_transactions(transaction_date);

-- Quality of life cache (community level)
CREATE TABLE qol_cache (
  id SERIAL PRIMARY KEY,
  community VARCHAR(255) NOT NULL,
  emirate VARCHAR(50) NOT NULL,
  latitude DECIMAL,
  longitude DECIMAL,
  transport_score DECIMAL,
  education_score DECIMAL,
  healthcare_score DECIMAL,
  retail_score DECIMAL,
  recreation_score DECIMAL,
  noise_score DECIMAL,
  total_score DECIMAL,
  amenities_data JSONB, -- raw nearby places data
  cached_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(community, emirate)
);

-- Scraped listings from Bayut/PF/Dubizzle
CREATE TABLE listings (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50), -- bayut, propertyfinder, dubizzle
  listing_url VARCHAR(500) UNIQUE,
  community VARCHAR(255),
  building_name VARCHAR(255),
  property_type VARCHAR(50),
  bedrooms INTEGER,
  size_sqft DECIMAL,
  listed_price DECIMAL,
  price_per_sqft DECIMAL,
  view_type VARCHAR(50),
  furnished BOOLEAN,
  emirate VARCHAR(50),
  first_seen DATE,
  last_seen DATE,
  days_listed INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  scraped_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_listings_community ON listings(community, property_type, bedrooms);

-- Macro economic data
CREATE TABLE macro_data (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL, -- policy_rate, inflation, gdp_growth, population
  metric_value DECIMAL NOT NULL,
  period VARCHAR(20), -- e.g. '2025-Q1', '2025-03'
  source VARCHAR(100),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- RERA service charges by building
CREATE TABLE service_charges (
  id SERIAL PRIMARY KEY,
  building_name VARCHAR(255),
  community VARCHAR(255),
  emirate VARCHAR(50),
  charge_per_sqft DECIMAL, -- AED per sqft per year
  total_annual_charge DECIMAL,
  rera_approval_date DATE,
  source VARCHAR(100),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Community coordinates (for map and API lookups)
CREATE TABLE communities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  emirate VARCHAR(50) NOT NULL,
  latitude DECIMAL NOT NULL,
  longitude DECIMAL NOT NULL,
  zone VARCHAR(100),
  UNIQUE(name, emirate)
);
```

---

## TIER ACCESS CONTROL MIDDLEWARE

```javascript
// /server/middleware/tierAccess.js
// Apply to routes that are gated by subscription tier

const tierLimits = {
  starter: {
    analyses_per_month: 5,
    modules: ['price_fairness', 'qol_score', 'trends'] // basic modules only
  },
  analyst: {
    analyses_per_month: 100,
    modules: ['price_fairness', 'qol_score', 'trends', 'forecast', 'rental_yield']
  },
  pro: {
    analyses_per_month: Infinity,
    modules: ['price_fairness', 'qol_score', 'trends', 'forecast', 'rental_yield', 'liquidity']
  }
};

// Check on every analysis request:
// 1. Is user authenticated?
// 2. Have they exceeded their monthly analysis limit?
// 3. Are they requesting a module their tier allows?
// If any fail: return 403 with upgrade prompt message
```

---

## CRON JOBS (Scheduled Data Refresh)

```javascript
// /server/jobs/scheduler.js
// Use node-cron

// Every night at 2am UAE time (GMT+4):
cron.schedule('0 22 * * *', async () => {
  await refreshDLDTransactions();  // Pull last 7 days of DLD data
  await refreshListings();          // Re-run Bayut/PF/Dubizzle scrapers
  await updateListingDurations();   // Mark disappeared listings, calc days_listed
});

// Every Monday at 6am:
cron.schedule('0 2 * * 1', async () => {
  await refreshMacroData();         // CBUAE + World Bank data
});

// Every 30 minutes:
cron.schedule('*/30 * * * *', async () => {
  await refreshDubaiPulseToken();   // Renew OAuth token before expiry
});
```

---

## ERROR HANDLING & FALLBACKS

Every analytical module must have a graceful fallback when a data source is unavailable:

- **Price Fairness:** If DLD has fewer than 3 comparable transactions → widen search radius to emirate level → show "Limited data: fewer than 3 comparables found, estimate may be less precise"
- **QoL Score:** If Google Places API fails → fall back to OpenStreetMap Overpass data only → show partial score with note
- **Forecast:** If macro data is stale (>90 days) → use last known values with a "Macro data last updated X days ago" warning
- **Liquidity:** If insufficient DLD transaction history for community → show "Insufficient transaction history — liquidity estimate unavailable for this community"
- **Rental Yield:** If RERA rental index doesn't have exact match → use nearest comparable bedroom count / sqft band with a note
- **Trends:** If fewer than 8 quarters of data available → show available data only with an explanation

All error states should display clean UI feedback — never show raw error messages or blank sections.

---

## PDF REPORT GENERATION

Implement a "Download Report" button on every completed analysis. When clicked:
- Generate a PDF version of the full analysis using `pdfkit` or `puppeteer` (screenshot the analysis page)
- Include: PropIQ logo, property summary, all 6 module results, data sources footnote, disclaimer, generated date
- Pro tier: PDF includes PropIQ watermark only (clean report)
- Starter/Analyst tier: PDF includes "Generated by PropIQ — propiq.ae" watermark on each page

---

## ENVIRONMENT VARIABLES (Replit Secrets)

Create these secrets in Replit before running:
```
DUBAI_PULSE_API_KEY=
DUBAI_PULSE_API_SECRET=
GOOGLE_PLACES_API_KEY=
MAPBOX_ACCESS_TOKEN=
DATABASE_URL=          (auto-set by Replit PostgreSQL)
JWT_SECRET=            (generate a strong random string)
PROXY_URL=             (optional: Bright Data/Oxylabs proxy URL for scraping)
NODE_ENV=development
PORT=3001
```

---

## SEED DATA

On first run, seed the database with:
1. All major UAE communities with coordinates (at minimum: Dubai Marina, Downtown Dubai, JBR, Business Bay, JVC, Jumeirah, Arabian Ranches, Palm Jumeirah, Mirdif, Al Reem Island Abu Dhabi, Saadiyat Island, Yas Island, Al Majaz Sharjah, Al Mamzar)
2. Sample RERA service charge data for 20 major buildings
3. Placeholder macro data from CBUAE 2024 figures (so the app works before the first cron job runs)
4. A test user account: email `demo@propiq.ae` / password `PropIQ2025!` with Pro tier access

---

## QUALITY & PERFORMANCE REQUIREMENTS

- All API responses must be returned within 500ms (use caching aggressively)
- A full property analysis (all 6 modules) must complete within 30 seconds on first run
- Subsequent analyses for the same community must complete in under 5 seconds (cached QoL, trends)
- All user data must be validated server-side before database insertion
- All monetary values must be formatted consistently: AED X,XXX,XXX (comma separators, no decimal for whole numbers)
- Charts must be responsive and render correctly on mobile screens
- The app must not crash if any single external API is down — graceful degradation always

---

## FINAL INSTRUCTION

Build this as a complete, working application. Write real code for every component, route, and service described above. Do not leave placeholder comments saying "add logic here" — implement the actual logic. Where an external API key is genuinely needed and not available yet, build the integration correctly but log a clear `console.warn('MISSING: DUBAI_PULSE_API_KEY not set — using cached data only')` so the developer knows exactly what to configure. The application should be runnable immediately on Replit with `npm run dev` from the root, starting both the React frontend (port 5173) and the Express backend (port 3001) concurrently.
