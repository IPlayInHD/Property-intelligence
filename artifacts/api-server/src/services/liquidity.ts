import { db } from "@workspace/db";
import { dldTransactionsTable, listingsTable } from "@workspace/db";
import { eq, and, gte, count, sql } from "drizzle-orm";

export interface LiquidityResult {
  score: number;
  label: string;
  avgDaysOnMarket: number | null;
  transactionsLast90Days: number;
  activeListingsCount: number | null;
  investorRatio: number | null;
  warning: string | null;
}

function getLiquidityLabel(score: number): string {
  if (score <= 3) return "Difficult to exit";
  if (score <= 6) return "Moderate liquidity";
  return "Highly liquid";
}

export async function calculateLiquidity(params: {
  community: string;
  emirate: string;
  propertyType: string;
  bedrooms: number;
  listedPrice: number;
}): Promise<LiquidityResult> {
  let warning: string | null = null;

  // Transaction velocity in last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const dateStr = ninetyDaysAgo.toISOString().split("T")[0];

  const transactionCountResult = await db
    .select({ count: count() })
    .from(dldTransactionsTable)
    .where(
      and(
        eq(dldTransactionsTable.community, params.community),
        gte(dldTransactionsTable.transactionDate, dateStr)
      )
    );

  const transactionsLast90Days = transactionCountResult[0]?.count ?? 0;

  // Active listings from scraped data
  const activeListingsResult = await db
    .select({ count: count() })
    .from(listingsTable)
    .where(
      and(
        eq(listingsTable.community, params.community),
        eq(listingsTable.isActive, true),
        eq(listingsTable.propertyType, params.propertyType)
      )
    );

  const activeListingsCount = activeListingsResult[0]?.count ?? 0;

  // Average days on market from listings
  const avgDomResult = await db
    .select({ avgDom: sql<number>`AVG(${listingsTable.daysListed})` })
    .from(listingsTable)
    .where(
      and(
        eq(listingsTable.community, params.community),
        eq(listingsTable.propertyType, params.propertyType)
      )
    );

  const avgDaysOnMarket = avgDomResult[0]?.avgDom
    ? Math.round(parseFloat(String(avgDomResult[0].avgDom)))
    : null;

  if (transactionsLast90Days < 3) {
    warning = "Insufficient transaction history — liquidity estimate has low confidence for this community";
  }

  // Score components (each out of 2)
  let velocityScore: number;
  if (transactionsLast90Days > 30) velocityScore = 2.0;
  else if (transactionsLast90Days >= 15) velocityScore = 1.5;
  else if (transactionsLast90Days >= 5) velocityScore = 1.0;
  else velocityScore = 0.5;

  let domScore: number;
  if (avgDaysOnMarket === null) domScore = 1.0;
  else if (avgDaysOnMarket < 30) domScore = 2.0;
  else if (avgDaysOnMarket < 60) domScore = 1.5;
  else if (avgDaysOnMarket < 90) domScore = 1.0;
  else domScore = 0.5;

  // Supply ratio: active listings / monthly avg transactions
  const monthlyAvgTransactions = transactionsLast90Days / 3;
  const supplyRatio = monthlyAvgTransactions > 0 ? activeListingsCount / monthlyAvgTransactions : 5;
  let supplyScore: number;
  if (supplyRatio < 1.5) supplyScore = 2.0;
  else if (supplyRatio < 3) supplyScore = 1.5;
  else if (supplyRatio < 5) supplyScore = 1.0;
  else supplyScore = 0.5;

  // Property type modifier
  const typeModifiers: Record<string, number> = {
    studio: 0.5, apartment: 0.3, townhouse: 0, villa: -0.4, penthouse: -0.2,
  };
  const typeModifier = typeModifiers[params.propertyType.toLowerCase()] ?? 0;

  // Price bracket modifier
  let priceModifier = 0;
  if (params.listedPrice < 1_000_000) priceModifier = 0.5;
  else if (params.listedPrice < 3_000_000) priceModifier = 0;
  else if (params.listedPrice < 7_000_000) priceModifier = -0.3;
  else priceModifier = -0.6;

  // Base score from 3 components (max 6) + modifiers
  const baseScore = velocityScore + domScore + supplyScore;
  const finalScore = Math.min(10, Math.max(1, baseScore + typeModifier + priceModifier + 4));

  return {
    score: Math.round(finalScore * 10) / 10,
    label: getLiquidityLabel(finalScore),
    avgDaysOnMarket,
    transactionsLast90Days,
    activeListingsCount: activeListingsCount > 0 ? activeListingsCount : null,
    investorRatio: null, // Would need DLD ownership data
    warning,
  };
}
