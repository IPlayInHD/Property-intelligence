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
];

const MACRO_DATA = [
  { metricName: "policy_rate", metricValue: "5.4", period: "2025-Q1", source: "CBUAE" },
  { metricName: "inflation_rate", metricValue: "2.1", period: "2025-Q1", source: "CBUAE" },
  { metricName: "money_supply_growth", metricValue: "3.8", period: "2025-Q1", source: "CBUAE" },
  { metricName: "gdp_growth", metricValue: "3.9", period: "2024", source: "World Bank" },
  { metricName: "mortgage_rate_avg", metricValue: "4.49", period: "2025-Q1", source: "CBUAE" },
];

const SERVICE_CHARGES = [
  { buildingName: "Marina Gate", community: "Dubai Marina", emirate: "Dubai", chargePerSqft: "18.5", source: "RERA" },
  { buildingName: "The Address Downtown", community: "Downtown Dubai", emirate: "Dubai", chargePerSqft: "35.0", source: "RERA" },
  { buildingName: "Jumeirah Bay X1", community: "JBR", emirate: "Dubai", chargePerSqft: "22.0", source: "RERA" },
  { buildingName: "Damac Maison", community: "Business Bay", emirate: "Dubai", chargePerSqft: "20.0", source: "RERA" },
  { buildingName: "Maple", community: "Arabian Ranches", emirate: "Dubai", chargePerSqft: "5.0", source: "RERA" },
];

// Sample DLD transactions for demo purposes
function generateDldTransactions() {
  const communities = [
    { community: "Dubai Marina", avgPsf: 1850, minBed: 0, maxBed: 4 },
    { community: "Downtown Dubai", avgPsf: 2200, minBed: 0, maxBed: 4 },
    { community: "Business Bay", avgPsf: 1600, minBed: 0, maxBed: 4 },
    { community: "JBR", avgPsf: 1700, minBed: 0, maxBed: 4 },
    { community: "Palm Jumeirah", avgPsf: 3200, minBed: 1, maxBed: 5 },
    { community: "JVC", avgPsf: 980, minBed: 0, maxBed: 3 },
    { community: "Jumeirah", avgPsf: 2100, minBed: 2, maxBed: 6 },
    { community: "Al Reem Island", avgPsf: 1200, minBed: 0, maxBed: 4 },
  ];

  const transactions = [];
  const now = new Date();

  for (const comm of communities) {
    for (let i = 0; i < 25; i++) {
      const beds = Math.floor(Math.random() * (comm.maxBed - comm.minBed + 1)) + comm.minBed;
      const sizeSqft = beds === 0 ? 450 + Math.random() * 150 : 700 + beds * 350 + Math.random() * 200;
      const psfVariance = 0.85 + Math.random() * 0.3; // +/- 15%
      const psf = Math.round(comm.avgPsf * psfVariance);
      const price = Math.round(sizeSqft * psf);
      const daysAgo = Math.floor(Math.random() * 365);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);

      transactions.push({
        transactionId: `DLD-SEED-${comm.community.replace(/\s+/g, "")}-${i}-${Date.now()}`,
        community: comm.community,
        propertyType: beds === 0 ? "studio" : beds >= 4 && comm.community === "Jumeirah" ? "villa" : "apartment",
        bedrooms: beds,
        sizeSqft: Math.round(sizeSqft).toString(),
        salePrice: price.toString(),
        pricePerSqft: psf.toString(),
        transactionDate: date.toISOString().split("T")[0],
        emirate: comm.community === "Al Reem Island" ? "Abu Dhabi" : "Dubai",
        floorNumber: beds <= 3 ? Math.floor(Math.random() * 30) + 1 : null,
      });
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

  // DLD transactions
  const transactions = generateDldTransactions();
  for (const tx of transactions) {
    await db.insert(dldTransactionsTable).values(tx).onConflictDoNothing();
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
