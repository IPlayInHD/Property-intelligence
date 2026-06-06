import { Router } from "express";
import { db } from "@workspace/db";
import { dldTransactionsTable } from "@workspace/db";
import { sql, and, gte } from "drizzle-orm";

const router = Router();

// GET /market/overview
// Returns all communities ranked by quarter-over-quarter PSF momentum
router.get("/market/overview", async (_req, res) => {
  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const dateStr = twoYearsAgo.toISOString().split("T")[0];

    // Aggregate quarterly PSF per community for the last 2 years
    const quarterlyRows = await db
      .select({
        community: dldTransactionsTable.community,
        emirate: dldTransactionsTable.emirate,
        quarter: sql<string>`TO_CHAR(DATE_TRUNC('quarter', ${dldTransactionsTable.transactionDate}), 'YYYY-"Q"Q')`,
        quarterStart: sql<string>`DATE_TRUNC('quarter', ${dldTransactionsTable.transactionDate})::text`,
        avgPsf: sql<number>`ROUND(AVG(${dldTransactionsTable.pricePerSqft}), 0)`,
        txCount: sql<number>`COUNT(*)`,
      })
      .from(dldTransactionsTable)
      .where(
        and(
          gte(dldTransactionsTable.transactionDate, dateStr),
          sql`${dldTransactionsTable.pricePerSqft} IS NOT NULL`
        )
      )
      .groupBy(
        dldTransactionsTable.community,
        dldTransactionsTable.emirate,
        sql`DATE_TRUNC('quarter', ${dldTransactionsTable.transactionDate})`
      )
      .orderBy(
        dldTransactionsTable.community,
        sql`DATE_TRUNC('quarter', ${dldTransactionsTable.transactionDate})`
      );

    // Group by community
    const communityMap = new Map<
      string,
      {
        community: string;
        emirate: string;
        quarters: { period: string; avgPsf: number; txCount: number }[];
      }
    >();

    for (const row of quarterlyRows) {
      const key = `${row.community}||${row.emirate}`;
      if (!communityMap.has(key)) {
        communityMap.set(key, {
          community: row.community,
          emirate: row.emirate,
          quarters: [],
        });
      }
      const entry = communityMap.get(key)!;
      entry.quarters.push({
        period: row.quarter,
        avgPsf: row.avgPsf ? parseFloat(String(row.avgPsf)) : 0,
        txCount: row.txCount ? parseInt(String(row.txCount)) : 0,
      });
    }

    // Build ranked list
    const communities: {
      community: string;
      emirate: string;
      currentPsf: number;
      prevPsf: number | null;
      qoqChange: number | null;
      sparkline: { period: string; avgPsf: number }[];
      transactionCount: number;
    }[] = [];

    for (const entry of communityMap.values()) {
      const qs = entry.quarters;
      if (qs.length < 1) continue;

      const lastFive = qs.slice(-5);
      const current = lastFive[lastFive.length - 1];
      const prev = lastFive.length >= 2 ? lastFive[lastFive.length - 2] : null;

      const currentPsf = current.avgPsf;
      const prevPsf = prev ? prev.avgPsf : null;
      const qoqChange =
        prevPsf && prevPsf > 0
          ? Math.round(((currentPsf - prevPsf) / prevPsf) * 1000) / 10
          : null;

      const totalTx = qs.reduce((sum, q) => sum + q.txCount, 0);

      communities.push({
        community: entry.community,
        emirate: entry.emirate,
        currentPsf,
        prevPsf,
        qoqChange,
        sparkline: lastFive.map((q) => ({ period: q.period, avgPsf: q.avgPsf })),
        transactionCount: totalTx,
      });
    }

    // Sort by absolute QoQ change (trending communities first), then by volume
    communities.sort((a, b) => {
      if (a.qoqChange !== null && b.qoqChange !== null) {
        return Math.abs(b.qoqChange) - Math.abs(a.qoqChange);
      }
      if (a.qoqChange !== null) return -1;
      if (b.qoqChange !== null) return 1;
      return b.transactionCount - a.transactionCount;
    });

    res.json({
      communities,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("market/overview error:", err);
    res.status(500).json({ error: "Failed to fetch market overview" });
  }
});

export default router;
