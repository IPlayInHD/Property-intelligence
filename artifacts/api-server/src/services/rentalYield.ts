import { db } from "@workspace/db";
import { serviceChargesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface RentalYieldResult {
  grossYield: number;
  netYield: number;
  marketRentAnnual: number;
  serviceChargeAnnual: number;
  vacancyDeduction: number;
  managementFee: number;
  maintenanceReserve: number;
  netIncome: number;
  agencyManaged: boolean;
  warning: string | null;
}

// RERA rental index fallback table (AED/year approximate for Dubai communities)
const RERA_FALLBACK: Record<string, Record<number, number>> = {
  "Dubai Marina": { 0: 65000, 1: 90000, 2: 130000, 3: 180000, 4: 250000 },
  "Downtown Dubai": { 0: 70000, 1: 95000, 2: 140000, 3: 200000, 4: 280000 },
  "JBR": { 0: 60000, 1: 85000, 2: 120000, 3: 165000, 4: 220000 },
  "Business Bay": { 0: 55000, 1: 75000, 2: 110000, 3: 150000, 4: 210000 },
  "JVC": { 0: 35000, 1: 50000, 2: 75000, 3: 100000, 4: 140000 },
  "Palm Jumeirah": { 0: 80000, 1: 110000, 2: 160000, 3: 230000, 4: 350000 },
  "Jumeirah": { 0: 55000, 1: 80000, 2: 130000, 3: 200000, 4: 300000 },
  "Arabian Ranches": { 0: 0, 1: 0, 2: 130000, 3: 175000, 4: 240000 },
  "Al Reem Island": { 0: 45000, 1: 65000, 2: 95000, 3: 130000, 4: 180000 },
  "Mirdif": { 0: 30000, 1: 45000, 2: 70000, 3: 95000, 4: 130000 },
};

const COMMUNITY_VACANCY_RATES: Record<string, number> = {
  "Dubai Marina": 0.06,
  "Downtown Dubai": 0.07,
  "Palm Jumeirah": 0.05,
  "Business Bay": 0.09,
  "JVC": 0.10,
  "default": 0.08,
};

function getMarketRent(community: string, bedrooms: number): { rent: number; warning: string | null } {
  // Try exact match
  if (RERA_FALLBACK[community]) {
    const bedroomKey = Math.min(bedrooms, 4);
    const rent = RERA_FALLBACK[community][bedroomKey];
    if (rent) return { rent, warning: null };
  }

  // Try partial match
  for (const [key, data] of Object.entries(RERA_FALLBACK)) {
    if (community.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(community.toLowerCase())) {
      const bedroomKey = Math.min(bedrooms, 4);
      const rent = data[bedroomKey];
      if (rent) {
        return {
          rent,
          warning: `Using comparable community ${key} rental data — RERA index match not available for ${community}`,
        };
      }
    }
  }

  // Fallback: estimate based on bedrooms
  const bedroomEstimates: Record<number, number> = {
    0: 40000, 1: 60000, 2: 90000, 3: 130000, 4: 180000,
  };
  return {
    rent: bedroomEstimates[Math.min(bedrooms, 4)] ?? 90000,
    warning: `RERA rental data not available for ${community} — using UAE market estimate`,
  };
}

export async function calculateRentalYield(params: {
  community: string;
  emirate: string;
  buildingName?: string;
  sizeSqft: number;
  bedrooms: number;
  listedPrice: number;
  agencyManaged?: boolean;
}): Promise<RentalYieldResult> {
  const agencyManaged = params.agencyManaged ?? false;
  let warning: string | null = null;

  // Get market rent
  const { rent: marketRentAnnual, warning: rentWarning } = getMarketRent(params.community, params.bedrooms);
  if (rentWarning) warning = rentWarning;

  // Get service charge
  let serviceChargePerSqft = 15; // default AED/sqft/year
  if (params.buildingName) {
    const scRows = await db
      .select()
      .from(serviceChargesTable)
      .where(and(eq(serviceChargesTable.buildingName, params.buildingName)))
      .limit(1);

    if (scRows.length && scRows[0].chargePerSqft) {
      serviceChargePerSqft = parseFloat(String(scRows[0].chargePerSqft));
    } else {
      // Try community average
      const communityRows = await db
        .select()
        .from(serviceChargesTable)
        .where(eq(serviceChargesTable.community, params.community))
        .limit(5);

      if (communityRows.length) {
        const avg = communityRows.reduce((s, r) => s + parseFloat(String(r.chargePerSqft ?? 15)), 0) / communityRows.length;
        serviceChargePerSqft = avg;
      }
    }
  }

  const serviceChargeAnnual = Math.round(serviceChargePerSqft * params.sizeSqft);
  const vacancyRate = COMMUNITY_VACANCY_RATES[params.community] ?? COMMUNITY_VACANCY_RATES.default;
  const vacancyDeduction = Math.round(marketRentAnnual * vacancyRate);
  const managementFee = agencyManaged ? Math.round(marketRentAnnual * 0.08) : 0;
  const maintenanceReserve = Math.round(params.sizeSqft * 15);

  const netIncome = marketRentAnnual - serviceChargeAnnual - vacancyDeduction - managementFee - maintenanceReserve;

  const grossYield = Math.round((marketRentAnnual / params.listedPrice) * 1000) / 10;
  const netYield = Math.round((netIncome / params.listedPrice) * 1000) / 10;

  return {
    grossYield, netYield, marketRentAnnual, serviceChargeAnnual,
    vacancyDeduction, managementFee, maintenanceReserve, netIncome,
    agencyManaged, warning,
  };
}
