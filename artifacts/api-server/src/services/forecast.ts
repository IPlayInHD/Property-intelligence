import { db } from "@workspace/db";
import { dldTransactionsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { getLatestMacroData, getWorldBankGdpGrowth } from "./cbuae";

export interface ForecastScenario {
  annualRate: number;
  year1Value: number;
  year3Value: number;
  year5Value: number;
  year3Change: number;
  year5Change: number;
  keyAssumption: string;
}

export interface ForecastResult {
  bear: ForecastScenario;
  base: ForecastScenario;
  bull: ForecastScenario;
  chartData: Array<{ year: string; bear: number; base: number; bull: number }>;
  warning: string | null;
}

const HIGH_DEMAND_COMMUNITIES = [
  "Dubai Marina", "Downtown Dubai", "Palm Jumeirah", "Business Bay",
  "JBR", "DIFC", "City Walk", "Bluewaters Island",
];

async function getCommunityGrowthRate(community: string, emirate: string): Promise<number | null> {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const dateStr = fiveYearsAgo.toISOString().split("T")[0];

  const rows = await db
    .select({
      year: sql<string>`EXTRACT(YEAR FROM ${dldTransactionsTable.transactionDate})::text`,
      avgPsf: sql<number>`AVG(${dldTransactionsTable.pricePerSqft})`,
    })
    .from(dldTransactionsTable)
    .where(
      and(
        eq(dldTransactionsTable.community, community),
        eq(dldTransactionsTable.emirate, emirate),
        gte(dldTransactionsTable.transactionDate, dateStr),
        sql`${dldTransactionsTable.pricePerSqft} IS NOT NULL`
      )
    )
    .groupBy(sql`EXTRACT(YEAR FROM ${dldTransactionsTable.transactionDate})`);

  if (rows.length < 2) return null;

  const sorted = [...rows].sort((a, b) => parseInt(a.year) - parseInt(b.year));
  const first = parseFloat(String(sorted[0].avgPsf));
  const last = parseFloat(String(sorted[sorted.length - 1].avgPsf));
  const years = parseInt(sorted[sorted.length - 1].year) - parseInt(sorted[0].year);

  if (years === 0 || first <= 0) return null;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
}

export async function calculateForecast(params: {
  community: string;
  emirate: string;
  listedPrice: number;
  bedrooms: number;
  propertyType: string;
}): Promise<ForecastResult> {
  let warning: string | null = null;

  const [communityGrowth, macro, gdpGrowth] = await Promise.all([
    getCommunityGrowthRate(params.community, params.emirate),
    getLatestMacroData(),
    getWorldBankGdpGrowth(),
  ]);

  if (communityGrowth === null) {
    warning = "Insufficient historical transaction data — using UAE market average growth rate";
  }

  const baseGrowth = communityGrowth ?? 5.0;

  // GDP correlation
  const gdpCorrelation = (gdpGrowth - 3.0) * 0.3;

  // High demand premium
  const isHighDemand = HIGH_DEMAND_COMMUNITIES.some(
    (c) => params.community.toLowerCase().includes(c.toLowerCase())
  );
  const demandPremium = isHighDemand ? 0.5 : 0;

  // BASE CASE
  const baseRate = (baseGrowth + gdpCorrelation + demandPremium) / 100;

  // BEAR CASE
  let bearModifier = -0.035;
  if (macro.policyRate > 5.5) bearModifier -= 0.02;
  const bearRate = Math.max(Math.min(baseRate + bearModifier, 0), -0.08);

  // BULL CASE
  const bullBonus = 0.04 + demandPremium * 2 / 100;
  const bullRate = Math.min(baseRate + bullBonus, 0.15);

  function project(rate: number, years: number): number {
    return Math.round(params.listedPrice * Math.pow(1 + rate, years));
  }

  const bear: ForecastScenario = {
    annualRate: Math.round(bearRate * 1000) / 10,
    year1Value: project(bearRate, 1),
    year3Value: project(bearRate, 3),
    year5Value: project(bearRate, 5),
    year3Change: Math.round((Math.pow(1 + bearRate, 3) - 1) * 1000) / 10,
    year5Change: Math.round((Math.pow(1 + bearRate, 5) - 1) * 1000) / 10,
    keyAssumption: `Rising interest rates (${macro.policyRate.toFixed(1)}%) + supply pressure`,
  };

  const base: ForecastScenario = {
    annualRate: Math.round(baseRate * 1000) / 10,
    year1Value: project(baseRate, 1),
    year3Value: project(baseRate, 3),
    year5Value: project(baseRate, 5),
    year3Change: Math.round((Math.pow(1 + baseRate, 3) - 1) * 1000) / 10,
    year5Change: Math.round((Math.pow(1 + baseRate, 5) - 1) * 1000) / 10,
    keyAssumption: `${gdpGrowth.toFixed(1)}% UAE GDP growth + community trend ${baseGrowth.toFixed(1)}%/yr`,
  };

  const bull: ForecastScenario = {
    annualRate: Math.round(bullRate * 1000) / 10,
    year1Value: project(bullRate, 1),
    year3Value: project(bullRate, 3),
    year5Value: project(bullRate, 5),
    year3Change: Math.round((Math.pow(1 + bullRate, 3) - 1) * 1000) / 10,
    year5Change: Math.round((Math.pow(1 + bullRate, 5) - 1) * 1000) / 10,
    keyAssumption: `${isHighDemand ? "High demand zone + " : ""}infrastructure growth + sustained inflows`,
  };

  const chartData = [0, 1, 2, 3, 4, 5].map((yr) => ({
    year: yr === 0 ? "Now" : `Year ${yr}`,
    bear: yr === 0 ? params.listedPrice : project(bearRate, yr),
    base: yr === 0 ? params.listedPrice : project(baseRate, yr),
    bull: yr === 0 ? params.listedPrice : project(bullRate, yr),
  }));

  return { bear, base, bull, chartData, warning };
}
