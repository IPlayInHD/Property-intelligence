import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { generateToken, requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

// POST /auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body as {
      email: string; password: string; fullName: string; role: string;
    };

    if (!email || !password || !fullName || !role) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      role,
      plan: "starter",
      analysesUsedThisMonth: 0,
      planResetDate: resetDate.toISOString().split("T")[0],
    }).returning();

    const token = generateToken(user.id);
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(201).json({
      token,
      user: {
        id: user.id, email: user.email, fullName: user.fullName, role: user.role,
        plan: user.plan, analysesUsedThisMonth: user.analysesUsedThisMonth,
        planResetDate: user.planResetDate, createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!users.length) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Reset monthly counter if needed
    const today = new Date();
    if (user.planResetDate && new Date(user.planResetDate) < today) {
      await db.update(usersTable).set({
        analysesUsedThisMonth: 0,
        planResetDate: new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()).toISOString().split("T")[0],
      }).where(eq(usersTable.id, user.id));
      user.analysesUsedThisMonth = 0;
    }

    const token = generateToken(user.id);
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({
      token,
      user: {
        id: user.id, email: user.email, fullName: user.fullName, role: user.role,
        plan: user.plan, analysesUsedThisMonth: user.analysesUsedThisMonth,
        planResetDate: user.planResetDate, createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /auth/logout
router.post("/auth/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out" });
});

// GET /auth/me
router.get("/auth/me", requireAuth, (req: AuthRequest, res) => {
  res.json(req.user);
});

export default router;
