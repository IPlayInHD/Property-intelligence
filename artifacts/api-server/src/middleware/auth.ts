import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.");
  process.exit(1);
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    plan: string;
    role: string | null | undefined;
    fullName: string | null | undefined;
    analysesUsedThisMonth: number;
  };
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET!, { expiresIn: "7d" });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET!) as { userId: string };
    const users = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId)).limit(1);

    if (!users.length) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const user = users[0];
    req.user = {
      id: user.id,
      email: user.email,
      plan: user.plan,
      role: user.role,
      fullName: user.fullName,
      analysesUsedThisMonth: user.analysesUsedThisMonth,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
