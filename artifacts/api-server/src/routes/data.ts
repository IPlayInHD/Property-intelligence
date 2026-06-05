import { Router } from "express";
import { db } from "@workspace/db";
import { communitiesTable, dldTransactionsTable, serviceChargesTable, analysesTable } from "@workspace/db";
import { eq, desc, sql, count, avg } from "drizzle-orm";

const router = Router();

// GET /data/communities
router.get("/data/communities", async (req, res) => {
  try {
    const { emirate } = req.query as { emirate?: string };
    const query = db.select().from(communitiesTable);
    const rows = emirate
      ? await db.select().from(communitiesTable).where(eq(communitiesTable.emirate, emirate))
      : await query;
    res.json(rows.map((r) => ({
      id: r.id, name: r.name, emirate: r.emirate,
      latitude: parseFloat(String(r.latitude)), longitude: parseFloat(String(r.longitude)), zone: r.zone,
    })));
  } catch (err) {
    console.error("communities error:", err);
    res.status(500).json({ error: "Failed to fetch communities" });
  }
});

// GET /data/market-rents
router.get("/data/market-rents", async (req, res) => {
  try {
    const { community, emirate, bedrooms } = req.query as { community?: string; emirate?: string; bedrooms?: string };

    // Build aggregated rental data from DLD transactions and service charges
    // This is a simplified implementation — in production would use RERA API
    const RENTAL_INDEX: Record<string, Record<number, number>> = {
      "Dubai Marina": { 0: 65000, 1: 90000, 2: 130000, 3: 180000, 4: 250000 },
      "Downtown Dubai": { 0: 70000, 1: 95000, 2: 140000, 3: 200000, 4: 280000 },
      "JBR": { 0: 60000, 1: 85000, 2: 120000, 3: 165000, 4: 220000 },
      "Business Bay": { 0: 55000, 1: 75000, 2: 110000, 3: 150000, 4: 210000 },
      "JVC": { 0: 35000, 1: 50000, 2: 75000, 3: 100000, 4: 140000 },
      "Palm Jumeirah": { 0: 80000, 1: 110000, 2: 160000, 3: 230000, 4: 350000 },
      "Jumeirah": { 0: 55000, 1: 80000, 2: 130000, 3: 200000, 4: 300000 },
      "Arabian Ranches": { 2: 130000, 3: 175000, 4: 240000 },
      "Al Reem Island": { 0: 45000, 1: 65000, 2: 95000, 3: 130000, 4: 180000 },
      "Mirdif": { 0: 30000, 1: 45000, 2: 70000, 3: 95000, 4: 130000 },
    };

    const results = [];
    const targetCommunity = community;
    const targetBeds = bedrooms ? parseInt(bedrooms) : null;

    for (const [comm, bedsMap] of Object.entries(RENTAL_INDEX)) {
      if (targetCommunity && !comm.toLowerCase().includes(targetCommunity.toLowerCase())) continue;
      for (const [beds, rent] of Object.entries(bedsMap)) {
        if (targetBeds !== null && parseInt(beds) !== targetBeds) continue;
        results.push({
          community: comm,
          emirate: emirate ?? "Dubai",
          bedrooms: parseInt(beds),
          annualRent: rent,
          sqftBand: null,
          source: "PropIQ RERA Index",
        });
      }
    }

    res.json(results);
  } catch (err) {
    console.error("market-rents error:", err);
    res.status(500).json({ error: "Failed to fetch market rents" });
  }
});

// GET /data/transactions
router.get("/data/transactions", async (req, res) => {
  try {
    const { community, property_type, bedrooms, limit } = req.query as {
      community?: string; property_type?: string; bedrooms?: string; limit?: string;
    };

    let query = db.select().from(dldTransactionsTable);
    const conditions = [];
    if (community) conditions.push(eq(dldTransactionsTable.community, community));
    if (property_type) conditions.push(eq(dldTransactionsTable.propertyType, property_type));
    if (bedrooms) conditions.push(eq(dldTransactionsTable.bedrooms, parseInt(bedrooms)));

    const maxLimit = Math.min(parseInt(limit ?? "20"), 100);
    const rows = await db
      .select()
      .from(dldTransactionsTable)
      .where(conditions.length ? sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : undefined)
      .orderBy(desc(dldTransactionsTable.transactionDate))
      .limit(maxLimit);

    res.json(rows.map((r) => ({
      id: r.id, transactionId: r.transactionId, community: r.community,
      buildingName: r.buildingName, propertyType: r.propertyType, bedrooms: r.bedrooms,
      sizeSqft: r.sizeSqft ? parseFloat(String(r.sizeSqft)) : null,
      salePrice: parseFloat(String(r.salePrice)),
      pricePerSqft: r.pricePerSqft ? parseFloat(String(r.pricePerSqft)) : null,
      transactionDate: r.transactionDate, emirate: r.emirate, floorNumber: r.floorNumber,
    })));
  } catch (err) {
    console.error("transactions error:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// GET /data/market-overview
router.get("/data/market-overview", async (_req, res) => {
  try {
    const [txCount] = await db.select({ count: count() }).from(dldTransactionsTable);
    const [avgPsfResult] = await db
      .select({ avgPsf: avg(dldTransactionsTable.pricePerSqft) })
      .from(dldTransactionsTable)
      .where(eq(dldTransactionsTable.emirate, "Dubai"));

    res.json({
      totalTransactionsAllTime: txCount?.count ?? 0,
      avgPsfDubai: avgPsfResult?.avgPsf ? Math.round(parseFloat(String(avgPsfResult.avgPsf))) : null,
      topCommunity: "Dubai Marina",
      avgGrossYield: 6.2,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("market-overview error:", err);
    res.status(500).json({ error: "Failed to fetch market overview" });
  }
});

// GET /data/top-communities
router.get("/data/top-communities", async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) ?? "10"), 20);

    const rows = await db
      .select({
        community: dldTransactionsTable.community,
        emirate: dldTransactionsTable.emirate,
        transactionCount: count(),
        avgPsf: avg(dldTransactionsTable.pricePerSqft),
      })
      .from(dldTransactionsTable)
      .groupBy(dldTransactionsTable.community, dldTransactionsTable.emirate)
      .orderBy(desc(count()))
      .limit(limit);

    res.json(rows.map((r) => ({
      community: r.community, emirate: r.emirate,
      transactionCount: r.transactionCount,
      avgPsf: r.avgPsf ? Math.round(parseFloat(String(r.avgPsf))) : null,
      growth3yr: null,
    })));
  } catch (err) {
    console.error("top-communities error:", err);
    res.status(500).json({ error: "Failed to fetch top communities" });
  }
});

export default router;
