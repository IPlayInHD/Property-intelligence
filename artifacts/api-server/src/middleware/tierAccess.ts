import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";

const tierLimits: Record<string, { analysesPerMonth: number; modules: string[] }> = {
  starter: {
    analysesPerMonth: 5,
    modules: ["price_fairness", "qol_score", "trends"],
  },
  analyst: {
    analysesPerMonth: 100,
    modules: ["price_fairness", "qol_score", "trends", "forecast", "rental_yield"],
  },
  pro: {
    analysesPerMonth: Infinity,
    modules: ["price_fairness", "qol_score", "trends", "forecast", "rental_yield", "liquidity"],
  },
};

export function checkAnalysisLimit(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const limits = tierLimits[user.plan] ?? tierLimits.starter;

  if (limits.analysesPerMonth !== Infinity && user.analysesUsedThisMonth >= limits.analysesPerMonth) {
    res.status(403).json({
      error: "Monthly analysis limit reached",
      message: `Your ${user.plan} plan allows ${limits.analysesPerMonth} analyses per month. Upgrade to run more.`,
      upgradeRequired: true,
    });
    return;
  }

  next();
}

export function requireModule(moduleName: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const limits = tierLimits[user.plan] ?? tierLimits.starter;

    if (!limits.modules.includes(moduleName)) {
      res.status(403).json({
        error: "Module not available on your plan",
        message: `The ${moduleName.replace("_", " ")} module requires a higher tier. Please upgrade.`,
        upgradeRequired: true,
        requiredPlan: moduleName === "liquidity" ? "pro" : "analyst",
      });
      return;
    }

    next();
  };
}

export function getTierLimits(plan: string) {
  return tierLimits[plan] ?? tierLimits.starter;
}
