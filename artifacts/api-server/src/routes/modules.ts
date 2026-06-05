import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireModule } from "../middleware/tierAccess";
import { calculatePriceFairness } from "../services/priceFairness";
import { calculateQolScore } from "../services/qolScore";
import { calculateForecast } from "../services/forecast";
import { calculateLiquidity } from "../services/liquidity";
import { calculateRentalYield } from "../services/rentalYield";
import { calculateTrends } from "../services/trends";
import type { PropertyInput } from "../services/analysisEngine";

const router = Router();

router.post("/modules/price-fairness", requireAuth, requireModule("price_fairness"), async (req: AuthRequest, res) => {
  try {
    const p = req.body as PropertyInput;
    const result = await calculatePriceFairness({
      community: p.community, emirate: p.emirate, propertyType: p.propertyType,
      bedrooms: p.bedrooms, sizeSqft: p.sizeSqft, listedPrice: p.listedPrice,
      floorNumber: p.floorNumber, viewType: p.viewType, furnished: p.furnished, yearBuilt: p.yearBuilt,
    });
    res.json(result);
  } catch (err) {
    console.error("price-fairness error:", err);
    res.status(500).json({ error: "Module failed" });
  }
});

router.post("/modules/qol-score", requireAuth, requireModule("qol_score"), async (req: AuthRequest, res) => {
  try {
    const { community, emirate } = req.body as PropertyInput;
    const result = await calculateQolScore(community, emirate);
    res.json(result);
  } catch (err) {
    console.error("qol-score error:", err);
    res.status(500).json({ error: "Module failed" });
  }
});

router.post("/modules/forecast", requireAuth, requireModule("forecast"), async (req: AuthRequest, res) => {
  try {
    const p = req.body as PropertyInput;
    const result = await calculateForecast({
      community: p.community, emirate: p.emirate, listedPrice: p.listedPrice,
      bedrooms: p.bedrooms, propertyType: p.propertyType,
    });
    res.json(result);
  } catch (err) {
    console.error("forecast error:", err);
    res.status(500).json({ error: "Module failed" });
  }
});

router.post("/modules/liquidity", requireAuth, requireModule("liquidity"), async (req: AuthRequest, res) => {
  try {
    const p = req.body as PropertyInput;
    const result = await calculateLiquidity({
      community: p.community, emirate: p.emirate, propertyType: p.propertyType,
      bedrooms: p.bedrooms, listedPrice: p.listedPrice,
    });
    res.json(result);
  } catch (err) {
    console.error("liquidity error:", err);
    res.status(500).json({ error: "Module failed" });
  }
});

router.post("/modules/rental-yield", requireAuth, requireModule("rental_yield"), async (req: AuthRequest, res) => {
  try {
    const p = req.body as PropertyInput & { agencyManaged?: boolean };
    const result = await calculateRentalYield({
      community: p.community, emirate: p.emirate, buildingName: p.buildingName,
      sizeSqft: p.sizeSqft, bedrooms: p.bedrooms, listedPrice: p.listedPrice,
      agencyManaged: p.agencyManaged,
    });
    res.json(result);
  } catch (err) {
    console.error("rental-yield error:", err);
    res.status(500).json({ error: "Module failed" });
  }
});

router.post("/modules/trends", requireAuth, requireModule("trends"), async (req: AuthRequest, res) => {
  try {
    const { community, emirate } = req.body as PropertyInput;
    const result = await calculateTrends({ community, emirate });
    res.json(result);
  } catch (err) {
    console.error("trends error:", err);
    res.status(500).json({ error: "Module failed" });
  }
});

export default router;
