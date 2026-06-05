import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getTierLimits } from "../middleware/tierAccess";

const router = Router();

const PLAN_LIMITS: Record<string, number | null> = {
  starter: 5,
  analyst: 100,
  pro: null,
};

// GET /user/profile
router.get("/user/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!users.length) { res.status(404).json({ error: "User not found" }); return; }
    const u = users[0];
    res.json({
      id: u.id, email: u.email, fullName: u.fullName, role: u.role,
      plan: u.plan, analysesUsedThisMonth: u.analysesUsedThisMonth,
      planResetDate: u.planResetDate, createdAt: u.createdAt,
    });
  } catch (err) {
    console.error("get profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /user/profile
router.put("/user/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { fullName, role } = req.body as { fullName?: string; role?: string };
    const updates: Record<string, string> = {};
    if (fullName) updates.fullName = fullName;
    if (role && ["investor", "agent", "buyer", "general"].includes(role)) updates.role = role;

    await db.update(usersTable).set(updates).where(eq(usersTable.id, req.user!.id));
    const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);

    res.json({
      id: updated.id, email: updated.email, fullName: updated.fullName, role: updated.role,
      plan: updated.plan, analysesUsedThisMonth: updated.analysesUsedThisMonth,
      planResetDate: updated.planResetDate, createdAt: updated.createdAt,
    });
  } catch (err) {
    console.error("update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// GET /user/subscription
router.get("/user/subscription", requireAuth, async (req: AuthRequest, res) => {
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!users.length) { res.status(404).json({ error: "User not found" }); return; }
    const u = users[0];
    const limits = getTierLimits(u.plan);

    res.json({
      plan: u.plan,
      analysesUsedThisMonth: u.analysesUsedThisMonth,
      analysesLimit: PLAN_LIMITS[u.plan] ?? null,
      planResetDate: u.planResetDate,
      modules: limits.modules,
    });
  } catch (err) {
    console.error("get subscription error:", err);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

// POST /user/upgrade
router.post("/user/upgrade", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { plan } = req.body as { plan: string; paymentMethodId?: string };
    if (!["starter", "analyst", "pro"].includes(plan)) {
      res.status(400).json({ error: "Invalid plan" });
      return;
    }

    // TODO: Connect Stripe here — process payment before upgrading
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const paymentIntent = await stripe.paymentIntents.create({ ... });
    console.warn("STRIPE_NOT_CONNECTED: Payment processing is stubbed — upgrade goes through without charge");

    await db.update(usersTable).set({ plan }).where(eq(usersTable.id, req.user!.id));

    const limits = getTierLimits(plan);
    res.json({
      plan,
      analysesUsedThisMonth: req.user!.analysesUsedThisMonth,
      analysesLimit: PLAN_LIMITS[plan] ?? null,
      planResetDate: null,
      modules: limits.modules,
    });
  } catch (err) {
    console.error("upgrade error:", err);
    res.status(500).json({ error: "Failed to upgrade plan" });
  }
});

export default router;
