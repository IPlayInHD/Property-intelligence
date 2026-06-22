import { Router } from "express";
import { db, demoFeedbackTable } from "@workspace/db";
import { count, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// POST /api/demo-feedback
router.post("/demo-feedback", async (req, res) => {
  try {
    const { propertyViewed, starRating, mostValuableFeature, biggestChallenge, wouldPay, role } = req.body as {
      propertyViewed?: string;
      starRating?: number;
      mostValuableFeature?: string;
      biggestChallenge?: string;
      wouldPay?: string;
      role?: string;
    };

    await db.insert(demoFeedbackTable).values({
      propertyViewed: propertyViewed || null,
      starRating: starRating ?? null,
      mostValuableFeature: mostValuableFeature || null,
      biggestChallenge: biggestChallenge || null,
      wouldPay: wouldPay || null,
      role: role || null,
    });

    logger.info(`Demo feedback submitted: property=${propertyViewed}, rating=${starRating}, role=${role}`);

    res.status(201).json({ success: true, message: "Thank you for your feedback!" });
  } catch (err) {
    logger.error(err, "Demo feedback error");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET /api/demo-feedback/summary
router.get("/demo-feedback/summary", async (_req, res) => {
  try {
    const [{ total }] = await db.select({ total: count() }).from(demoFeedbackTable);

    const byProperty = await db
      .select({ property: demoFeedbackTable.propertyViewed, cnt: count() })
      .from(demoFeedbackTable)
      .groupBy(demoFeedbackTable.propertyViewed);

    const byFeature = await db
      .select({ feature: demoFeedbackTable.mostValuableFeature, cnt: count() })
      .from(demoFeedbackTable)
      .groupBy(demoFeedbackTable.mostValuableFeature);

    const byWouldPay = await db
      .select({ wouldPay: demoFeedbackTable.wouldPay, cnt: count() })
      .from(demoFeedbackTable)
      .groupBy(demoFeedbackTable.wouldPay);

    const byRole = await db
      .select({ role: demoFeedbackTable.role, cnt: count() })
      .from(demoFeedbackTable)
      .groupBy(demoFeedbackTable.role);

    const avgRating = await db
      .select({ avg: sql<number>`avg(${demoFeedbackTable.starRating})` })
      .from(demoFeedbackTable);

    res.json({
      total,
      avgStarRating: avgRating[0]?.avg ?? null,
      byProperty,
      byFeature,
      byWouldPay,
      byRole,
    });
  } catch (err) {
    logger.error(err, "Demo feedback summary error");
    res.status(500).json({ error: "Something went wrong." });
  }
});

export default router;
