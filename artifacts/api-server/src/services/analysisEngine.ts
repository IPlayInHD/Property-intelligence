import { db } from "@workspace/db";
import { analysesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { calculatePriceFairness } from "./priceFairness";
import { calculateQolScore } from "./qolScore";
import { calculateForecast } from "./forecast";
import { calculateLiquidity } from "./liquidity";
import { calculateRentalYield } from "./rentalYield";
import { calculateTrends } from "./trends";
import { canonicalCommunity } from "./communityMap";
import { getTierLimits } from "../middleware/tierAccess";
import type { PriceFairnessResult } from "./priceFairness";

export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Derives a confidence level for the PropIQ Score from the effective weights
 * that were (or would be) applied when computing the score.
 *
 * - high   : all three scoring modules present and price-fairness data is fresh
 * - medium : one module missing OR price-fairness weight reduced due to stale data
 * - low    : two or more scoring modules absent / errored
 *
 * This is intentionally a pure function of `results` so it can be called both
 * inside `runAnalysis` and on-the-fly in the API route without a schema change.
 */
export function computeConfidence(results: Record<string, unknown>): ConfidenceLevel {
  let effectiveWeight = 0;

  if (results.priceFairness) {
    const pf = results.priceFairness as { fairnessScore?: number; dataFreshnessDate?: string | null };
    if (typeof pf.fairnessScore === "number") {
      let pfWeight = 1;
      if (pf.dataFreshnessDate) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (new Date(pf.dataFreshnessDate) < sixMonthsAgo) {
          pfWeight = 0.5;
        }
      }
      effectiveWeight += pfWeight;
    }
  }

  if (results.qolScore) {
    const qol = results.qolScore as { totalScore?: number };
    if (typeof qol.totalScore === "number") effectiveWeight += 1;
  }

  if (results.rentalYield) {
    const ry = results.rentalYield as { netYield?: number };
    if (typeof ry.netYield === "number") effectiveWeight += 1;
  }

  // Max possible weight is 3 (priceFairness=1, qolScore=1, rentalYield=1).
  // Stale price-fairness drops it to 2.5.
  if (effectiveWeight >= 3) return "high";
  if (effectiveWeight >= 1.5) return "medium";
  return "low";
}

export interface PropertyInput {
  propertyType: string;
  emirate: string;
  community: string;
  buildingName?: string;
  floorNumber?: number;
  sizeSqft: number;
  bedrooms: number;
  bathrooms?: number;
  listedPrice: number;
  listingType: string;
  viewType?: string;
  parkingIncluded?: boolean;
  furnished?: string;
  yearBuilt?: number;
}

function computeOverallScore(results: Record<string, unknown>): number {
  let total = 0;
  let totalWeight = 0;

  if (results.priceFairness) {
    const pf = results.priceFairness as { fairnessScore: number; dataFreshnessDate?: string | null };
    const pfScore = Math.max(0, Math.min(100, 50 + (-pf.fairnessScore) * 2));

    // When the most recent comparable transaction is older than 6 months the
    // price-fairness signal is unreliable.  Reduce its contribution to the
    // overall PropIQ Score to 50 % of its normal weight so that a stale
    // "Fairly Priced" verdict cannot artificially inflate the final score.
    let pfWeight = 1;
    if (pf.dataFreshnessDate) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      if (new Date(pf.dataFreshnessDate) < sixMonthsAgo) {
        pfWeight = 0.5;
      }
    }

    total += pfScore * pfWeight;
    totalWeight += pfWeight;
  }

  if (results.qolScore) {
    const qol = results.qolScore as { totalScore: number };
    total += qol.totalScore;
    totalWeight += 1;
  }

  if (results.rentalYield) {
    const ry = results.rentalYield as { netYield: number };
    const ryScore = Math.min(100, ry.netYield * 10);
    total += ryScore;
    totalWeight += 1;
  }

  return totalWeight > 0 ? Math.round(total / totalWeight) : 50;
}

export async function runAnalysis(analysisId: string, property: PropertyInput, userPlan: string): Promise<void> {
  const tierModules = getTierLimits(userPlan).modules;
  const results: Record<string, unknown> = {};

  // Normalize the community so listing/portal names match how DLD data is stored
  // (e.g. "Dubai Marina" ↔ DLD "Marsa Dubai"). Both sides use canonicalCommunity().
  property = { ...property, community: canonicalCommunity(property.community) };

  try {
    // Run available modules based on tier
    const modulePromises: Promise<void>[] = [];

    if (tierModules.includes("price_fairness")) {
      modulePromises.push(
        calculatePriceFairness({
          community: property.community,
          emirate: property.emirate,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          sizeSqft: property.sizeSqft,
          listedPrice: property.listedPrice,
          floorNumber: property.floorNumber,
          viewType: property.viewType,
          furnished: property.furnished,
          yearBuilt: property.yearBuilt,
        }).then((r) => { results.priceFairness = r; }).catch((e) => {
          console.warn("priceFairness module failed:", e.message);
          results.priceFairness = { error: "Module temporarily unavailable" };
        })
      );
    }

    if (tierModules.includes("qol_score")) {
      modulePromises.push(
        calculateQolScore(property.community, property.emirate)
          .then((r) => { results.qolScore = r; }).catch((e) => {
            console.warn("qolScore module failed:", e.message);
            results.qolScore = { error: "Module temporarily unavailable" };
          })
      );
    }

    if (tierModules.includes("forecast")) {
      modulePromises.push(
        calculateForecast({
          community: property.community,
          emirate: property.emirate,
          listedPrice: property.listedPrice,
          bedrooms: property.bedrooms,
          propertyType: property.propertyType,
        }).then((r) => { results.forecast = r; }).catch((e) => {
          console.warn("forecast module failed:", e.message);
          results.forecast = { error: "Module temporarily unavailable" };
        })
      );
    }

    if (tierModules.includes("liquidity")) {
      modulePromises.push(
        calculateLiquidity({
          community: property.community,
          emirate: property.emirate,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          listedPrice: property.listedPrice,
        }).then((r) => { results.liquidity = r; }).catch((e) => {
          console.warn("liquidity module failed:", e.message);
          results.liquidity = { error: "Module temporarily unavailable" };
        })
      );
    }

    if (tierModules.includes("rental_yield")) {
      modulePromises.push(
        calculateRentalYield({
          community: property.community,
          emirate: property.emirate,
          buildingName: property.buildingName,
          sizeSqft: property.sizeSqft,
          bedrooms: property.bedrooms,
          listedPrice: property.listedPrice,
        }).then((r) => { results.rentalYield = r; }).catch((e) => {
          console.warn("rentalYield module failed:", e.message);
          results.rentalYield = { error: "Module temporarily unavailable" };
        })
      );
    }

    if (tierModules.includes("trends")) {
      modulePromises.push(
        calculateTrends({
          community: property.community,
          emirate: property.emirate,
        }).then((r) => { results.trends = r; }).catch((e) => {
          console.warn("trends module failed:", e.message);
          results.trends = { error: "Module temporarily unavailable" };
        })
      );
    }

    await Promise.all(modulePromises);

    const overallScore = computeOverallScore(results);

    await db
      .update(analysesTable)
      .set({
        results,
        status: "complete",
        overallScore: overallScore.toString(),
      })
      .where(eq(analysesTable.id, analysisId));
  } catch (err) {
    console.error("Analysis engine error:", err);
    await db
      .update(analysesTable)
      .set({ status: "failed" })
      .where(eq(analysesTable.id, analysisId));
  }
}

/**
 * Re-runs only the priceFairness module for a single analysis and persists the
 * updated priceFairness result and recalculated overallScore.  Called by the
 * scheduler after a successful DLD ingestion to refresh analyses that were
 * previously flagged as stale.
 */
export async function refreshStalePriceFairness(analysisId: string): Promise<void> {
  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, analysisId));

  if (!analysis) {
    console.warn(`refreshStalePriceFairness: analysis ${analysisId} not found`);
    return;
  }

  const property = analysis.propertyData as PropertyInput;
  const currentResults = (analysis.results as Record<string, unknown>) ?? {};

  try {
    const newPriceFairness: PriceFairnessResult = await calculatePriceFairness({
      community: property.community,
      emirate: property.emirate,
      propertyType: property.propertyType,
      bedrooms: property.bedrooms,
      sizeSqft: property.sizeSqft,
      listedPrice: property.listedPrice,
      floorNumber: property.floorNumber,
      viewType: property.viewType,
      furnished: property.furnished,
      yearBuilt: property.yearBuilt,
    });

    const updatedResults = { ...currentResults, priceFairness: newPriceFairness };
    const newOverallScore = computeOverallScore(updatedResults);

    await db
      .update(analysesTable)
      .set({
        results: updatedResults,
        overallScore: newOverallScore.toString(),
      })
      .where(eq(analysesTable.id, analysisId));

    console.log(
      `Refreshed stale price fairness for analysis ${analysisId} ` +
      `(new score: ${newOverallScore}, freshness: ${newPriceFairness.dataFreshnessDate})`
    );
  } catch (err) {
    console.warn(
      `refreshStalePriceFairness: failed for analysis ${analysisId}:`,
      err instanceof Error ? err.message : err
    );
  }
}
