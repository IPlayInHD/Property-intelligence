import { Router } from "express";
import { db, waitlistTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// POST /api/waitlist
router.post("/waitlist", async (req, res) => {
  try {
    const { name, email, role, painPoints, pricingTier } = req.body as {
      name: string; email: string; role?: string; painPoints?: string; pricingTier?: string;
    };

    if (!email || !name) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }

    const existing = await db.select().from(waitlistTable).where(eq(waitlistTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "You're already on the waitlist!" });
      return;
    }

    await db.insert(waitlistTable).values({
      name,
      email: email.toLowerCase(),
      role: role || null,
      painPoints: painPoints || null,
      pricingTier: pricingTier || null,
    });

    const [{ value: total }] = await db.select({ value: count() }).from(waitlistTable);
    const display = Math.max(47, Math.floor(Number(total) / 10) * 10);

    logger.info(`Waitlist signup: ${email} (${role})`);

    res.status(201).json({
      success: true,
      message: "You're on the list! We'll be in touch soon.",
      waitlistCount: display,
    });
  } catch (err) {
    logger.error(err, "Waitlist signup error");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET /api/waitlist/count
router.get("/waitlist/count", async (_req, res) => {
  try {
    const [{ value: total }] = await db.select({ value: count() }).from(waitlistTable);
    const display = Math.max(47, Math.floor(Number(total) / 10) * 10);
    res.json({ count: display });
  } catch {
    res.json({ count: 47 });
  }
});

export default router;
