import { db } from "@workspace/db";
import { dldTransactionsTable } from "@workspace/db";
import { eq, and, gte, sql, between } from "drizzle-orm";
import { fetchDldTransactions } from "./dubaiPulse";

export interface PropertyParams {
  community: string;
  emirate: string;
  propertyType: string;
  bedrooms: number;
  sizeSqft: number;
  listedPrice: number;
  floorNumber?: number;
  viewType?: string;
  furnished?: string;
  yearBuilt?: number;
}

export interface PriceFairnessResult {
  fairnessScore: number;
  verdict: string;
  listedPsf: number;
  benchmarkPsf: number;
  adjustedBenchmarkPsf: number;
  comparables: ComparableTransaction[];
  dataQuality: string;
  warning: string | null;
  dataFreshnessDate: string | null;
}

export interface ComparableTransaction {
  id: number;
  community: string;
  buildingName: string | null;
  propertyType: string;
  bedrooms: number | null;
  sizeSqft: number | null;
  salePrice: number;
  pricePerSqft: number | null;
  transactionDate: string;
  emirate: string;
  floorNumber: number | null;
}

function getVerdict(score: number): string {
  if (score > 10) return "Significantly Overpriced";
  if (score > 5) return "Slightly Overpriced";
  if (score >= -5) return "Fairly Priced";
  if (score >= -10) return "Good Value";
  return "Significant Opportunity";
}

function applyAdjustments(params: PropertyParams): number {
  let adjustment = 0;

  // Floor premium: +0.5% per floor above ground, cap 15%
  if (params.floorNumber && params.floorNumber > 0) {
    adjustment += Math.min(params.floorNumber * 0.005, 0.15);
  }

  // View premium
  const viewPremiums: Record<string, number> = {
    Sea: 0.08, Marina: 0.08, City: 0.04, Community: 0.02, Garden: 0.02, None: 0,
  };
  adjustment += viewPremiums[params.viewType ?? "None"] ?? 0;

  // Furnished premium
  if (params.furnished === "Yes") adjustment += 0.05;

  // Building age discount
  if (params.yearBuilt) {
    const age = new Date().getFullYear() - params.yearBuilt;
    if (age > 10) {
      adjustment -= Math.min((age - 10) * 0.01, 0.15);
    }
  }

  return adjustment;
}

export async function calculatePriceFairness(params: PropertyParams): Promise<PriceFairnessResult> {
  const listedPsf = params.listedPrice / params.sizeSqft;
  let warning: string | null = null;

  // Try DB first (cached DLD data)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateStr = oneYearAgo.toISOString().split("T")[0];

  const minSize = params.sizeSqft * 0.8;
  const maxSize = params.sizeSqft * 1.2;

  let dbRows = await db
    .select()
    .from(dldTransactionsTable)
    .where(
      and(
        eq(dldTransactionsTable.community, params.community),
        eq(dldTransactionsTable.propertyType, params.propertyType),
        eq(dldTransactionsTable.bedrooms, params.bedrooms),
        gte(dldTransactionsTable.transactionDate, dateStr),
        sql`${dldTransactionsTable.sizeSqft} BETWEEN ${minSize} AND ${maxSize}`
      )
    )
    .limit(20);

  // If insufficient, try fetching from Dubai Pulse API
  if (dbRows.length < 3) {
    const apiRows = await fetchDldTransactions({
      community: params.community,
      property_type: params.propertyType,
      bedrooms: params.bedrooms,
      emirate: params.emirate,
      from_date: dateStr,
      limit: 20,
    });

    // Store fetched data in DB for caching
    for (const row of apiRows) {
      try {
        await db.insert(dldTransactionsTable).values({
          transactionId: row.transaction_id,
          community: row.community,
          buildingName: row.building_name,
          propertyType: row.property_type,
          bedrooms: row.bedrooms,
          sizeSqft: row.size_sqft?.toString(),
          salePrice: row.sale_price.toString(),
          pricePerSqft: row.price_per_sqft?.toString(),
          transactionDate: row.transaction_date,
          emirate: row.emirate ?? "Dubai",
          floorNumber: row.floor_number,
        }).onConflictDoNothing();
      } catch {
        // ignore dupe
      }
    }

    // Re-query DB
    dbRows = await db
      .select()
      .from(dldTransactionsTable)
      .where(
        and(
          eq(dldTransactionsTable.community, params.community),
          eq(dldTransactionsTable.propertyType, params.propertyType),
          eq(dldTransactionsTable.bedrooms, params.bedrooms),
          gte(dldTransactionsTable.transactionDate, dateStr),
          sql`${dldTransactionsTable.sizeSqft} BETWEEN ${minSize} AND ${maxSize}`
        )
      )
      .limit(20);
  }

  // If still insufficient, widen to emirate level
  if (dbRows.length < 3) {
    warning = "Limited data: fewer than 3 comparables found in community, widened to emirate level — estimate may be less precise";
    dbRows = await db
      .select()
      .from(dldTransactionsTable)
      .where(
        and(
          eq(dldTransactionsTable.emirate, params.emirate),
          eq(dldTransactionsTable.propertyType, params.propertyType),
          eq(dldTransactionsTable.bedrooms, params.bedrooms),
          gte(dldTransactionsTable.transactionDate, dateStr)
        )
      )
      .limit(20);
  }

  const comparables: ComparableTransaction[] = dbRows.map((r) => ({
    id: r.id,
    community: r.community ?? params.community,
    buildingName: r.buildingName,
    propertyType: r.propertyType ?? params.propertyType,
    bedrooms: r.bedrooms,
    sizeSqft: r.sizeSqft ? parseFloat(String(r.sizeSqft)) : null,
    salePrice: parseFloat(String(r.salePrice)),
    pricePerSqft: r.pricePerSqft ? parseFloat(String(r.pricePerSqft)) : null,
    transactionDate: String(r.transactionDate),
    emirate: r.emirate ?? params.emirate,
    floorNumber: r.floorNumber,
  }));

  // Calculate median PSF
  const psfs = comparables
    .filter((c) => c.pricePerSqft !== null && c.pricePerSqft > 0)
    .map((c) => c.pricePerSqft as number)
    .sort((a, b) => a - b);

  let benchmarkPsf: number;
  if (psfs.length === 0) {
    // Fallback: use listed PSF as benchmark with no data warning
    benchmarkPsf = listedPsf;
    warning = "Insufficient transaction data — price analysis is estimated";
  } else {
    const mid = Math.floor(psfs.length / 2);
    benchmarkPsf = psfs.length % 2 === 0 ? (psfs[mid - 1] + psfs[mid]) / 2 : psfs[mid];
  }

  const adjustment = applyAdjustments(params);
  const adjustedBenchmarkPsf = benchmarkPsf * (1 + adjustment);
  const fairnessScore = ((listedPsf - adjustedBenchmarkPsf) / adjustedBenchmarkPsf) * 100;

  // Determine the most recent comparable date
  const sortedDates = comparables
    .map((c) => c.transactionDate)
    .filter(Boolean)
    .sort()
    .reverse();
  const dataFreshnessDate = sortedDates.length > 0 ? sortedDates[0] : null;

  // Cap dataQuality at "medium" and set staleness warning if most recent comparable is > 6 months old
  let dataQuality = psfs.length >= 8 ? "high" : psfs.length >= 3 ? "medium" : "low";
  if (dataFreshnessDate) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const freshnessDate = new Date(dataFreshnessDate);
    if (freshnessDate < sixMonthsAgo) {
      if (dataQuality === "high") dataQuality = "medium";
      warning = `Data may be stale — most recent comparable is from ${dataFreshnessDate}. Price estimate could be less accurate.`;
    }
  }

  return {
    fairnessScore: Math.round(fairnessScore * 10) / 10,
    verdict: getVerdict(fairnessScore),
    listedPsf: Math.round(listedPsf),
    benchmarkPsf: Math.round(benchmarkPsf),
    adjustedBenchmarkPsf: Math.round(adjustedBenchmarkPsf),
    comparables: comparables.slice(0, 8),
    dataQuality,
    warning,
    dataFreshnessDate,
  };
}
