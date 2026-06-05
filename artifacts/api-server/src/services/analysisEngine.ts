import { db } from "@workspace/db";
import { analysesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { calculatePriceFairness } from "./priceFairness";
import { calculateQolScore } from "./qolScore";
import { calculateForecast } from "./forecast";
import { calculateLiquidity } from "./liquidity";
import { calculateRentalYield } from "./rentalYield";
import { calculateTrends } from "./trends";
import { getTierLimits } from "../middleware/tierAccess";

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
  let count = 0;

  if (results.priceFairness) {
    const pf = results.priceFairness as { fairnessScore: number };
    const pfScore = Math.max(0, Math.min(100, 50 + (-pf.fairnessScore) * 2));
    total += pfScore;
    count++;
  }

  if (results.qolScore) {
    const qol = results.qolScore as { totalScore: number };
    total += qol.totalScore;
    count++;
  }

  if (results.rentalYield) {
    const ry = results.rentalYield as { netYield: number };
    const ryScore = Math.min(100, ry.netYield * 10);
    total += ryScore;
    count++;
  }

  return count > 0 ? Math.round(total / count) : 50;
}

export async function runAnalysis(analysisId: string, property: PropertyInput, userPlan: string): Promise<void> {
  const tierModules = getTierLimits(userPlan).modules;
  const results: Record<string, unknown> = {};

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
