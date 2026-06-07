import { Router } from "express";
import { db } from "@workspace/db";
import { listingsTable, analysesTable } from "@workspace/db";
import { eq, and, or, ilike, gte, lte, sql, desc, asc, ne } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

function parseListing(r: typeof listingsTable.$inferSelect & { existingAnalysisId?: string | null; existingScore?: number | null }) {
  return {
    ...r,
    sizeSqft: r.sizeSqft ? parseFloat(String(r.sizeSqft)) : null,
    listedPrice: r.listedPrice ? parseFloat(String(r.listedPrice)) : null,
    pricePerSqft: r.pricePerSqft ? parseFloat(String(r.pricePerSqft)) : null,
    existingAnalysisId: r.existingAnalysisId ?? null,
    existingScore: r.existingScore ?? null,
  };
}

// GET /listings
router.get("/listings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      q, emirate, propertyType, bedrooms,
      priceMin, priceMax, sizeMin, sizeMax,
      viewType, furnished, sort,
      page = "1", limit = "24",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit) || 24));
    const offset = (pageNum - 1) * limitNum;

    const conditions: ReturnType<typeof eq>[] = [eq(listingsTable.isActive, true) as any];

    if (q) {
      conditions.push(or(
        ilike(listingsTable.community, `%${q}%`),
        ilike(listingsTable.buildingName, `%${q}%`),
        ilike(listingsTable.emirate, `%${q}%`),
      ) as any);
    }
    if (emirate) conditions.push(eq(listingsTable.emirate, emirate) as any);
    if (propertyType) conditions.push(eq(listingsTable.propertyType, propertyType) as any);
    if (bedrooms) conditions.push(eq(listingsTable.bedrooms, parseInt(bedrooms)) as any);
    if (priceMin) conditions.push(gte(listingsTable.listedPrice, priceMin) as any);
    if (priceMax) conditions.push(lte(listingsTable.listedPrice, priceMax) as any);
    if (sizeMin) conditions.push(gte(listingsTable.sizeSqft, sizeMin) as any);
    if (sizeMax) conditions.push(lte(listingsTable.sizeSqft, sizeMax) as any);
    if (viewType) conditions.push(eq(listingsTable.viewType, viewType) as any);
    if (furnished === "true") conditions.push(eq(listingsTable.furnished, true) as any);
    if (furnished === "false") conditions.push(eq(listingsTable.furnished, false) as any);

    const whereClause = and(...conditions);

    let orderCol;
    switch (sort) {
      case "price-asc": orderCol = asc(listingsTable.listedPrice); break;
      case "price-desc": orderCol = desc(listingsTable.listedPrice); break;
      case "size": orderCol = desc(listingsTable.sizeSqft); break;
      case "newest":
      default: orderCol = desc(listingsTable.firstSeen); break;
    }

    const [rows, totalResult] = await Promise.all([
      db.select().from(listingsTable).where(whereClause).orderBy(orderCol).limit(limitNum).offset(offset),
      db.select({ count: sql<string>`count(*)` }).from(listingsTable).where(whereClause),
    ]);

    const userId = req.user!.id;
    const listingIds = rows.map((r) => r.id);

    let analysisMap = new Map<number, { id: string; score: number | null }>();
    if (listingIds.length > 0) {
      const existing = await db
        .select({
          analysisId: analysesTable.id,
          listingId: sql<string>`(${analysesTable.propertyData}->>'listingId')`,
          score: analysesTable.overallScore,
        })
        .from(analysesTable)
        .where(and(
          eq(analysesTable.userId, userId),
          eq(analysesTable.status, "complete"),
          sql`(${analysesTable.propertyData}->>'listingId') IS NOT NULL`,
        ));

      for (const a of existing) {
        const lid = parseInt(a.listingId);
        if (!isNaN(lid) && listingIds.includes(lid)) {
          analysisMap.set(lid, {
            id: a.analysisId,
            score: a.score ? parseFloat(String(a.score)) : null,
          });
        }
      }
    }

    // For score sort, re-sort rows in JS
    let sortedRows = rows;
    if (sort === "score") {
      sortedRows = [...rows].sort((a, b) => {
        const sa = analysisMap.get(a.id)?.score ?? -1;
        const sb = analysisMap.get(b.id)?.score ?? -1;
        return sb - sa;
      });
    }

    const listings = sortedRows.map((r) => parseListing({
      ...r,
      existingAnalysisId: analysisMap.get(r.id)?.id ?? null,
      existingScore: analysisMap.get(r.id)?.score ?? null,
    }));

    res.json({
      listings,
      total: parseInt(totalResult[0].count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error("Get listings error:", err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// GET /listings/:id
router.get("/listings/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid listing ID" });
      return;
    }

    const rows = await db.select().from(listingsTable).where(eq(listingsTable.id, id)).limit(1);
    if (!rows.length) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const listing = rows[0];
    const userId = req.user!.id;

    // Check for existing analysis
    const existingAnalysis = await db
      .select({ id: analysesTable.id, score: analysesTable.overallScore })
      .from(analysesTable)
      .where(and(
        eq(analysesTable.userId, userId),
        eq(analysesTable.status, "complete"),
        sql`(${analysesTable.propertyData}->>'listingId')::integer = ${id}`,
      ))
      .limit(1);

    // Similar listings in same community
    const similar = await db
      .select()
      .from(listingsTable)
      .where(and(
        eq(listingsTable.community, listing.community ?? ""),
        eq(listingsTable.isActive, true),
        ne(listingsTable.id, id),
      ))
      .orderBy(desc(listingsTable.firstSeen))
      .limit(4);

    res.json({
      ...parseListing({
        ...listing,
        existingAnalysisId: existingAnalysis[0]?.id ?? null,
        existingScore: existingAnalysis[0]?.score ? parseFloat(String(existingAnalysis[0].score)) : null,
      }),
      similar: similar.map((s) => parseListing(s)),
    });
  } catch (err) {
    console.error("Get listing error:", err);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

export default router;
