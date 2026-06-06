import { db } from "@workspace/db";
import { communitiesTable, macroDataTable, serviceChargesTable, usersTable, dldTransactionsTable } from "@workspace/db";
import bcrypt from "bcryptjs";

const COMMUNITIES = [
  { name: "Dubai Marina", emirate: "Dubai", latitude: "25.0819", longitude: "55.1367", zone: "Dubai Marina" },
  { name: "Downtown Dubai", emirate: "Dubai", latitude: "25.1972", longitude: "55.2744", zone: "Bur Dubai" },
  { name: "Palm Jumeirah", emirate: "Dubai", latitude: "25.1121", longitude: "55.1387", zone: "Palm Jumeirah" },
  { name: "Business Bay", emirate: "Dubai", latitude: "25.1865", longitude: "55.2652", zone: "Business Bay" },
  { name: "JBR", emirate: "Dubai", latitude: "25.0777", longitude: "55.1338", zone: "Dubai Marina" },
  { name: "JVC", emirate: "Dubai", latitude: "25.0521", longitude: "55.2073", zone: "Jumeirah Village" },
  { name: "Jumeirah", emirate: "Dubai", latitude: "25.2176", longitude: "55.2424", zone: "Jumeirah" },
  { name: "Arabian Ranches", emirate: "Dubai", latitude: "25.0431", longitude: "55.2708", zone: "Arabian Ranches" },
  { name: "DIFC", emirate: "Dubai", latitude: "25.2122", longitude: "55.2806", zone: "DIFC" },
  { name: "Mirdif", emirate: "Dubai", latitude: "25.2303", longitude: "55.4268", zone: "Mirdif" },
  { name: "Al Reem Island", emirate: "Abu Dhabi", latitude: "24.4999", longitude: "54.4031", zone: "Al Reem Island" },
  { name: "Yas Island", emirate: "Abu Dhabi", latitude: "24.4895", longitude: "54.6083", zone: "Yas Island" },
  { name: "Al Raha Beach", emirate: "Abu Dhabi", latitude: "24.4415", longitude: "54.5810", zone: "Al Raha" },
  { name: "Saadiyat Island", emirate: "Abu Dhabi", latitude: "24.5310", longitude: "54.4325", zone: "Saadiyat" },
  { name: "City Walk", emirate: "Dubai", latitude: "25.1952", longitude: "55.2420", zone: "Jumeirah" },
  { name: "The Springs", emirate: "Dubai", latitude: "25.0606", longitude: "55.1787", zone: "The Springs" },
  { name: "Meydan", emirate: "Dubai", latitude: "25.1566", longitude: "55.3065", zone: "Meydan" },
  { name: "Motor City", emirate: "Dubai", latitude: "25.0412", longitude: "55.2219", zone: "Motor City" },
  { name: "Silicon Oasis", emirate: "Dubai", latitude: "25.1295", longitude: "55.3782", zone: "Silicon Oasis" },
  { name: "Al Furjan", emirate: "Dubai", latitude: "25.0292", longitude: "55.1619", zone: "Al Furjan" },
  { name: "Sports City", emirate: "Dubai", latitude: "25.0370", longitude: "55.2238", zone: "Sports City" },
  { name: "The Greens", emirate: "Dubai", latitude: "25.0949", longitude: "55.1691", zone: "The Greens" },
  { name: "Jumeirah Golf Estates", emirate: "Dubai", latitude: "25.0190", longitude: "55.1522", zone: "Jumeirah Golf Estates" },
  { name: "Bluewaters Island", emirate: "Dubai", latitude: "25.0832", longitude: "55.1193", zone: "Bluewaters" },
  { name: "Creek Harbour", emirate: "Dubai", latitude: "25.2084", longitude: "55.3395", zone: "Creek Harbour" },
  { name: "Dubai Hills", emirate: "Dubai", latitude: "25.1138", longitude: "55.2427", zone: "Dubai Hills" },
];

const MACRO_DATA = [
  { metricName: "policy_rate", metricValue: "5.4", period: "2024-Q4", source: "CBUAE" },
  { metricName: "inflation_rate", metricValue: "2.1", period: "2024-Q4", source: "CBUAE" },
  { metricName: "money_supply_growth", metricValue: "3.8", period: "2024-Q4", source: "CBUAE" },
  { metricName: "gdp_growth", metricValue: "3.9", period: "2024", source: "World Bank" },
  { metricName: "mortgage_rate_avg", metricValue: "4.49", period: "2024-Q4", source: "CBUAE" },
  { metricName: "policy_rate", metricValue: "5.4", period: "2024-Q3", source: "CBUAE" },
  { metricName: "inflation_rate", metricValue: "2.3", period: "2024-Q3", source: "CBUAE" },
  { metricName: "money_supply_growth", metricValue: "4.1", period: "2024-Q3", source: "CBUAE" },
  { metricName: "mortgage_rate_avg", metricValue: "4.75", period: "2024-Q3", source: "CBUAE" },
  { metricName: "gdp_growth", metricValue: "3.4", period: "2023", source: "World Bank" },
];

const SERVICE_CHARGES = [
  { buildingName: "Marina Gate 1", community: "Dubai Marina", emirate: "Dubai", chargePerSqft: "18.5", source: "RERA" },
  { buildingName: "Marina Gate 2", community: "Dubai Marina", emirate: "Dubai", chargePerSqft: "19.0", source: "RERA" },
  { buildingName: "Cayan Tower", community: "Dubai Marina", emirate: "Dubai", chargePerSqft: "21.5", source: "RERA" },
  { buildingName: "The Address Downtown", community: "Downtown Dubai", emirate: "Dubai", chargePerSqft: "35.0", source: "RERA" },
  { buildingName: "Burj Vista", community: "Downtown Dubai", emirate: "Dubai", chargePerSqft: "28.0", source: "RERA" },
  { buildingName: "The Residences", community: "Downtown Dubai", emirate: "Dubai", chargePerSqft: "26.5", source: "RERA" },
  { buildingName: "Jumeirah Bay X1", community: "JBR", emirate: "Dubai", chargePerSqft: "22.0", source: "RERA" },
  { buildingName: "Bahar 3", community: "JBR", emirate: "Dubai", chargePerSqft: "20.5", source: "RERA" },
  { buildingName: "Sadaf 5", community: "JBR", emirate: "Dubai", chargePerSqft: "19.5", source: "RERA" },
  { buildingName: "Damac Maison Canal Views", community: "Business Bay", emirate: "Dubai", chargePerSqft: "20.0", source: "RERA" },
  { buildingName: "Executive Bay A", community: "Business Bay", emirate: "Dubai", chargePerSqft: "17.0", source: "RERA" },
  { buildingName: "Maple 1", community: "Arabian Ranches", emirate: "Dubai", chargePerSqft: "5.0", source: "RERA" },
  { buildingName: "Maple 2", community: "Arabian Ranches", emirate: "Dubai", chargePerSqft: "5.2", source: "RERA" },
  { buildingName: "Park Lane", community: "JVC", emirate: "Dubai", chargePerSqft: "12.0", source: "RERA" },
  { buildingName: "Belgravia 2", community: "JVC", emirate: "Dubai", chargePerSqft: "11.5", source: "RERA" },
  { buildingName: "Gate Tower 1", community: "Al Reem Island", emirate: "Abu Dhabi", chargePerSqft: "16.0", source: "RERA" },
  { buildingName: "Sun Tower", community: "Al Reem Island", emirate: "Abu Dhabi", chargePerSqft: "15.5", source: "RERA" },
  { buildingName: "Khalidiyah Palace", community: "Saadiyat Island", emirate: "Abu Dhabi", chargePerSqft: "24.0", source: "RERA" },
  { buildingName: "Frond N Villa", community: "Palm Jumeirah", emirate: "Dubai", chargePerSqft: "7.5", source: "RERA" },
  { buildingName: "Shoreline Apt Block 4", community: "Palm Jumeirah", emirate: "Dubai", chargePerSqft: "16.0", source: "RERA" },
  { buildingName: "Golf Place 1", community: "Dubai Hills", emirate: "Dubai", chargePerSqft: "6.8", source: "RERA" },
  { buildingName: "Park Heights 1", community: "Dubai Hills", emirate: "Dubai", chargePerSqft: "14.5", source: "RERA" },
];

// ─── Realistic market data per community ────────────────────────────────────
// PSF values represent realistic Dubai 2021–2026 market history
// Growth model: strong 2021-2023 boom, moderating 2024-2026
interface CommunitySpec {
  community: string;
  emirate: string;
  basePsf2021: number;      // Q1 2021 baseline PSF
  quarterlyGrowthRates: number[]; // growth rate per quarter (20 quarters = 5 years)
  propertyMix: PropertySpec[];
}

interface PropertySpec {
  type: string;
  bedroomOptions: number[];
  sizeSqftBase: number;
  sizeSqftPerBed: number;
  buildings: string[];
}

const COMMUNITY_SPECS: CommunitySpec[] = [
  {
    community: "Downtown Dubai",
    emirate: "Dubai",
    basePsf2021: 1480,
    quarterlyGrowthRates: [
      0.02, 0.03, 0.04, 0.05,   // 2021: +14% total (recovering post-COVID)
      0.05, 0.06, 0.06, 0.07,   // 2022: +24% total (boom)
      0.04, 0.05, 0.04, 0.04,   // 2023: +17% total (sustained)
      0.03, 0.03, 0.02, 0.02,   // 2024: +10% total (moderating)
      0.02, 0.01, 0.01, 0.01,   // 2025-2026: +5% (stable)
    ],
    propertyMix: [
      {
        type: "apartment",
        bedroomOptions: [0, 1, 2, 3],
        sizeSqftBase: 500,
        sizeSqftPerBed: 380,
        buildings: ["Burj Vista 1", "Burj Vista 2", "The Address Downtown", "Act One", "Forte 1", "Boulevard Point", "Downtown Views 2"],
      },
      {
        type: "penthouse",
        bedroomOptions: [3, 4],
        sizeSqftBase: 2800,
        sizeSqftPerBed: 400,
        buildings: ["Burj Khalifa Residences", "The Address Sky View", "IL Primo"],
      },
    ],
  },
  {
    community: "Dubai Marina",
    emirate: "Dubai",
    basePsf2021: 1250,
    quarterlyGrowthRates: [
      0.02, 0.03, 0.03, 0.04,
      0.05, 0.06, 0.05, 0.06,
      0.04, 0.04, 0.04, 0.03,
      0.03, 0.02, 0.02, 0.02,
      0.01, 0.01, 0.01, 0.01,
    ],
    propertyMix: [
      {
        type: "apartment",
        bedroomOptions: [0, 1, 2, 3],
        sizeSqftBase: 450,
        sizeSqftPerBed: 360,
        buildings: ["Marina Gate 1", "Marina Gate 2", "Cayan Tower", "23 Marina", "Marina Promenade", "Jumeirah Living Marina Gate", "The Walk JBR"],
      },
      {
        type: "penthouse",
        bedroomOptions: [3, 4],
        sizeSqftBase: 2500,
        sizeSqftPerBed: 350,
        buildings: ["Princess Tower", "Elite Residence", "23 Marina"],
      },
    ],
  },
  {
    community: "JBR",
    emirate: "Dubai",
    basePsf2021: 1150,
    quarterlyGrowthRates: [
      0.02, 0.03, 0.03, 0.04,
      0.05, 0.05, 0.05, 0.05,
      0.04, 0.04, 0.03, 0.03,
      0.02, 0.02, 0.02, 0.02,
      0.01, 0.01, 0.01, 0.01,
    ],
    propertyMix: [
      {
        type: "apartment",
        bedroomOptions: [1, 2, 3],
        sizeSqftBase: 700,
        sizeSqftPerBed: 350,
        buildings: ["Bahar 1", "Bahar 3", "Bahar 6", "Sadaf 5", "Rimal 4", "Murjan 3", "Jumeirah Bay X1"],
      },
    ],
  },
  {
    community: "Business Bay",
    emirate: "Dubai",
    basePsf2021: 1100,
    quarterlyGrowthRates: [
      0.02, 0.03, 0.03, 0.04,
      0.05, 0.05, 0.05, 0.06,
      0.04, 0.03, 0.03, 0.03,
      0.02, 0.02, 0.02, 0.02,
      0.01, 0.01, 0.01, 0.01,
    ],
    propertyMix: [
      {
        type: "apartment",
        bedroomOptions: [0, 1, 2, 3],
        sizeSqftBase: 450,
        sizeSqftPerBed: 340,
        buildings: ["Executive Bay A", "Executive Bay B", "Damac Maison Majestine", "Aykon City Tower C", "Millennium Binghatti", "The Opus", "Vera Residences"],
      },
    ],
  },
  {
    community: "JVC",
    emirate: "Dubai",
    basePsf2021: 680,
    quarterlyGrowthRates: [
      0.02, 0.03, 0.03, 0.03,
      0.04, 0.05, 0.05, 0.05,
      0.04, 0.04, 0.03, 0.03,
      0.02, 0.02, 0.02, 0.02,
      0.01, 0.01, 0.01, 0.01,
    ],
    propertyMix: [
      {
        type: "apartment",
        bedroomOptions: [0, 1, 2],
        sizeSqftBase: 420,
        sizeSqftPerBed: 300,
        buildings: ["Park Lane", "Belgravia 1", "Belgravia 2", "Bloom Heights", "Binghatti Stars", "Concept 7 Residences", "Catch Residences"],
      },
      {
        type: "townhouse",
        bedroomOptions: [2, 3],
        sizeSqftBase: 1200,
        sizeSqftPerBed: 200,
        buildings: ["District 10 Townhouses", "District 12 Townhouses"],
      },
    ],
  },
  {
    community: "Palm Jumeirah",
    emirate: "Dubai",
    basePsf2021: 2100,
    quarterlyGrowthRates: [
      0.03, 0.04, 0.05, 0.06,
      0.07, 0.08, 0.07, 0.08,
      0.05, 0.05, 0.04, 0.04,
      0.03, 0.03, 0.02, 0.02,
      0.02, 0.01, 0.01, 0.01,
    ],
    propertyMix: [
      {
        type: "apartment",
        bedroomOptions: [1, 2, 3],
        sizeSqftBase: 900,
        sizeSqftPerBed: 400,
        buildings: ["Shoreline Apartments Block 1", "Shoreline Apartments Block 4", "Al Hamri", "The 8", "Fairmont Residences"],
      },
      {
        type: "villa",
        bedroomOptions: [3, 4, 5],
        sizeSqftBase: 3000,
        sizeSqftPerBed: 500,
        buildings: ["Frond A", "Frond D", "Frond K", "Frond N", "Garden Homes"],
      },
    ],
  },
  {
    community: "Dubai Hills",
    emirate: "Dubai",
    basePsf2021: 1100,
    quarterlyGrowthRates: [
      0.03, 0.04, 0.04, 0.05,
      0.06, 0.07, 0.06, 0.07,
      0.05, 0.05, 0.04, 0.04,
      0.03, 0.03, 0.02, 0.02,
      0.02, 0.01, 0.01, 0.01,
    ],
    propertyMix: [
      {
        type: "apartment",
        bedroomOptions: [1, 2, 3],
        sizeSqftBase: 700,
        sizeSqftPerBed: 350,
        buildings: ["Park Heights 1", "Park Heights 2", "Acacia", "Mulberry 1", "Socio", "Collective 2.0"],
      },
      {
        type: "villa",
        bedroomOptions: [3, 4, 5],
        sizeSqftBase: 2800,
        sizeSqftPerBed: 450,
        buildings: ["Golf Place 1", "Golf Place 2", "Maple 3", "Sidra 1", "Sidra 3", "Elan"],
      },
      {
        type: "townhouse",
        bedroomOptions: [3, 4],
        sizeSqftBase: 1800,
        sizeSqftPerBed: 250,
        buildings: ["Maple 1", "Maple 2", "Parkway Vistas"],
      },
    ],
  },
];

// Simple seeded random to get consistent results
let rngState = 42;
function seededRandom(): number {
  rngState = (rngState * 1664525 + 1013904223) & 0xffffffff;
  return (rngState >>> 0) / 0xffffffff;
}

function randVariance(value: number, pct: number): number {
  return value * (1 - pct + seededRandom() * pct * 2);
}

function randInt(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)];
}

// Compute cumulative PSF for a given quarter index (0 = Q1 2021)
function psfAtQuarter(basePsf: number, rates: number[], quarterIndex: number): number {
  let psf = basePsf;
  for (let i = 0; i < quarterIndex && i < rates.length; i++) {
    psf *= 1 + rates[i];
  }
  return psf;
}

// Returns a date within the given quarter (quarterIndex 0 = Q1 2021)
function dateInQuarter(quarterIndex: number): Date {
  const startYear = 2021;
  const year = startYear + Math.floor(quarterIndex / 4);
  const quarter = quarterIndex % 4;
  const monthStart = quarter * 3;
  const day = randInt(1, 28);
  return new Date(year, monthStart + Math.floor(seededRandom() * 3), day);
}

// Returns a date within the last N days from today (June 6, 2026)
function recentDate(maxDaysAgo: number): Date {
  const now = new Date("2026-06-06");
  const daysAgo = randInt(0, maxDaysAgo);
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

let txCounter = 0;

function makeTx(
  community: string,
  emirate: string,
  propertyType: string,
  bedrooms: number,
  sizeSqft: number,
  pricePerSqft: number,
  date: Date,
  buildingName: string,
  floorNumber: number | null,
) {
  txCounter++;
  const salePrice = Math.round(sizeSqft * pricePerSqft);
  return {
    transactionId: `DLD-${community.replace(/\s+/g, "").toUpperCase().slice(0, 4)}-${String(txCounter).padStart(6, "0")}`,
    community,
    buildingName,
    propertyType,
    bedrooms,
    sizeSqft: Math.round(sizeSqft).toString(),
    salePrice: salePrice.toString(),
    pricePerSqft: Math.round(pricePerSqft).toString(),
    transactionDate: formatDate(date),
    emirate,
    floorNumber,
  };
}

function generateBulkDldTransactions() {
  const transactions: ReturnType<typeof makeTx>[] = [];

  // Total 20 quarters (Q1 2021 → Q4 2025) = indices 0–19
  // Current quarter (Q2 2026) is index 20 — use recentDate() for last 90 days boost
  const TOTAL_QUARTERS = 20;

  for (const spec of COMMUNITY_SPECS) {
    const { community, emirate, basePsf2021, quarterlyGrowthRates, propertyMix } = spec;

    for (const prop of propertyMix) {
      for (const beds of prop.bedroomOptions) {
        // Generate transactions across all 20 historical quarters
        for (let qi = 0; qi < TOTAL_QUARTERS; qi++) {
          const basePsf = psfAtQuarter(basePsf2021, quarterlyGrowthRates, qi);

          // More recent quarters get more transactions (market grew)
          // qi 0-7: 4 tx/quarter, qi 8-15: 6 tx/quarter, qi 16-19: 8 tx/quarter
          const txPerQuarter = qi < 8 ? 4 : qi < 16 ? 6 : 8;

          for (let t = 0; t < txPerQuarter; t++) {
            const sizeBase = prop.sizeSqftBase + beds * prop.sizeSqftPerBed;
            const sizeSqft = randVariance(sizeBase, 0.15);
            const psf = randVariance(basePsf, 0.12);
            const date = dateInQuarter(qi);
            const building = randItem(prop.buildings);
            const floor = prop.type === "villa" || prop.type === "townhouse"
              ? null
              : randInt(1, 35);

            transactions.push(makeTx(
              community, emirate, prop.type, beds,
              sizeSqft, psf, date, building, floor,
            ));
          }
        }

        // Extra boost: 30 transactions in last 90 days (for high liquidity velocity)
        const latestBasePsf = psfAtQuarter(basePsf2021, quarterlyGrowthRates, TOTAL_QUARTERS);
        for (let t = 0; t < 30; t++) {
          const sizeBase = prop.sizeSqftBase + beds * prop.sizeSqftPerBed;
          const sizeSqft = randVariance(sizeBase, 0.15);
          const psf = randVariance(latestBasePsf, 0.10);
          const date = recentDate(89);
          const building = randItem(prop.buildings);
          const floor = prop.type === "villa" || prop.type === "townhouse"
            ? null
            : randInt(1, 35);

          transactions.push(makeTx(
            community, emirate, prop.type, beds,
            sizeSqft, psf, date, building, floor,
          ));
        }
      }
    }
  }

  return transactions;
}

async function seed() {
  console.log("Starting seed...");

  // Communities
  for (const c of COMMUNITIES) {
    await db.insert(communitiesTable).values(c).onConflictDoNothing();
  }
  console.log(`Seeded ${COMMUNITIES.length} communities`);

  // Macro data
  for (const m of MACRO_DATA) {
    await db.insert(macroDataTable).values(m).onConflictDoNothing();
  }
  console.log(`Seeded ${MACRO_DATA.length} macro data records`);

  // Service charges
  for (const s of SERVICE_CHARGES) {
    await db.insert(serviceChargesTable).values(s).onConflictDoNothing();
  }
  console.log(`Seeded ${SERVICE_CHARGES.length} service charges`);

  // DLD transactions — bulk realistic historical data
  console.log("Generating DLD transactions...");
  const transactions = generateBulkDldTransactions();
  console.log(`Generated ${transactions.length} DLD transactions — inserting...`);

  // Insert in batches of 100 for efficiency
  const BATCH = 100;
  for (let i = 0; i < transactions.length; i += BATCH) {
    const batch = transactions.slice(i, i + BATCH);
    await db.insert(dldTransactionsTable).values(batch).onConflictDoNothing();
    if ((i / BATCH) % 10 === 0) {
      console.log(`  Inserted ${Math.min(i + BATCH, transactions.length)} / ${transactions.length}`);
    }
  }
  console.log(`Seeded ${transactions.length} DLD transactions`);

  // Demo user
  const passwordHash = await bcrypt.hash("PropIQ2025!", 12);
  const resetDate = new Date();
  resetDate.setMonth(resetDate.getMonth() + 1);

  await db.insert(usersTable).values({
    email: "demo@propiq.ae",
    passwordHash,
    fullName: "PropIQ Demo",
    role: "investor",
    plan: "pro",
    analysesUsedThisMonth: 0,
    planResetDate: resetDate.toISOString().split("T")[0],
  }).onConflictDoNothing();

  console.log("Demo user: demo@propiq.ae / PropIQ2025! (Pro plan)");
  console.log("Seed complete!");
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
