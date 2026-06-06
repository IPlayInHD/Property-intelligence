import cron from "node-cron";
import { db } from "@workspace/db";
import { dldTransactionsTable, listingsTable, macroDataTable } from "@workspace/db";
import { eq, sql, and, lt, max } from "drizzle-orm";
import { fetchDldTransactions, getAccessToken } from "../services/dubaiPulse";
import { getWorldBankGdpGrowth } from "../services/cbuae";

const ALL_COMMUNITIES: { community: string; emirate: string }[] = [
  { community: "Downtown Dubai", emirate: "Dubai" },
  { community: "Dubai Marina", emirate: "Dubai" },
  { community: "JBR", emirate: "Dubai" },
  { community: "Business Bay", emirate: "Dubai" },
  { community: "JVC", emirate: "Dubai" },
  { community: "Palm Jumeirah", emirate: "Dubai" },
  { community: "Dubai Hills", emirate: "Dubai" },
  { community: "Arabian Ranches", emirate: "Dubai" },
  { community: "DIFC", emirate: "Dubai" },
  { community: "Jumeirah", emirate: "Dubai" },
  { community: "Mirdif", emirate: "Dubai" },
  { community: "City Walk", emirate: "Dubai" },
  { community: "The Springs", emirate: "Dubai" },
  { community: "Meydan", emirate: "Dubai" },
  { community: "Motor City", emirate: "Dubai" },
  { community: "Silicon Oasis", emirate: "Dubai" },
  { community: "Al Furjan", emirate: "Dubai" },
  { community: "Sports City", emirate: "Dubai" },
  { community: "The Greens", emirate: "Dubai" },
  { community: "Jumeirah Golf Estates", emirate: "Dubai" },
  { community: "Bluewaters Island", emirate: "Dubai" },
  { community: "Creek Harbour", emirate: "Dubai" },
  { community: "Al Reem Island", emirate: "Abu Dhabi" },
  { community: "Yas Island", emirate: "Abu Dhabi" },
  { community: "Al Raha Beach", emirate: "Abu Dhabi" },
  { community: "Saadiyat Island", emirate: "Abu Dhabi" },
];

export interface IngestionStatus {
  lastRunAt: string | null;
  lastRunResult: "success" | "partial" | "failed" | null;
  lastRunInserted: number;
  lastRunErrors: number;
  isRunning: boolean;
}

const status: IngestionStatus = {
  lastRunAt: null,
  lastRunResult: null,
  lastRunInserted: 0,
  lastRunErrors: 0,
  isRunning: false,
};

export function getIngestionStatus(): Readonly<IngestionStatus> {
  return { ...status };
}

async function getMostRecentTransactionDate(community: string): Promise<string> {
  try {
    const [row] = await db
      .select({ latest: max(dldTransactionsTable.transactionDate) })
      .from(dldTransactionsTable)
      .where(eq(dldTransactionsTable.community, community));

    if (row?.latest) {
      return row.latest;
    }
  } catch {
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() - 30);
  return fallback.toISOString().split("T")[0];
}

export async function runDldIngestion(): Promise<{ inserted: number; errors: number }> {
  if (status.isRunning) {
    console.log("DLD ingestion already in progress — skipping");
    return { inserted: 0, errors: 0 };
  }

  status.isRunning = true;
  let totalInserted = 0;
  let totalErrors = 0;

  try {
    for (const { community, emirate } of ALL_COMMUNITIES) {
      let communityInserted = 0;

      try {
        const fromDate = await getMostRecentTransactionDate(community);

        const rows = await fetchDldTransactions({
          community,
          emirate,
          from_date: fromDate,
          limit: 200,
        });

        for (const row of rows) {
          try {
            const result = await db
              .insert(dldTransactionsTable)
              .values({
                transactionId: row.transaction_id,
                community: row.community,
                buildingName: row.building_name,
                propertyType: row.property_type,
                bedrooms: row.bedrooms,
                sizeSqft: row.size_sqft?.toString(),
                salePrice: row.sale_price.toString(),
                pricePerSqft: row.price_per_sqft?.toString(),
                transactionDate: row.transaction_date,
                emirate: row.emirate ?? emirate,
                floorNumber: row.floor_number,
              })
              .onConflictDoNothing()
              .returning({ id: dldTransactionsTable.id });

            if (result.length > 0) {
              communityInserted++;
              totalInserted++;
            }
          } catch (rowErr) {
            console.warn(`DLD ingestion: failed to insert row for ${community}:`, rowErr instanceof Error ? rowErr.message : rowErr);
            totalErrors++;
          }
        }

        if (rows.length > 0 || communityInserted > 0) {
          console.log(`DLD ingestion [${community}]: fetched ${rows.length}, inserted ${communityInserted} new`);
        }
      } catch (communityErr) {
        console.error(`DLD ingestion: failed for community "${community}":`, communityErr instanceof Error ? communityErr.message : communityErr);
        totalErrors++;
      }
    }

    console.log(`DLD ingestion complete — inserted ${totalInserted} new transactions, ${totalErrors} errors`);

    status.lastRunAt = new Date().toISOString();
    status.lastRunInserted = totalInserted;
    status.lastRunErrors = totalErrors;
    status.lastRunResult = totalErrors === 0 ? "success" : totalInserted > 0 ? "partial" : "failed";
  } finally {
    status.isRunning = false;
  }

  return { inserted: totalInserted, errors: totalErrors };
}

async function updateListingDurations(): Promise<void> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await db
      .update(listingsTable)
      .set({
        isActive: false,
        daysListed: sql`CURRENT_DATE - ${listingsTable.firstSeen}`,
      })
      .where(
        and(
          eq(listingsTable.isActive, true),
          lt(listingsTable.lastSeen, sevenDaysAgo.toISOString().split("T")[0])
        )
      );

    console.log("Listing durations updated");
  } catch (err) {
    console.error("Listing duration update failed:", err);
  }
}

async function refreshMacroData(): Promise<void> {
  try {
    const gdpGrowth = await getWorldBankGdpGrowth();
    const period = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

    await db.insert(macroDataTable).values({
      metricName: "gdp_growth",
      metricValue: gdpGrowth.toString(),
      period,
      source: "World Bank API",
    }).onConflictDoNothing();

    console.log("Macro data refreshed");
  } catch (err) {
    console.error("Macro data refresh failed:", err);
  }
}

export function startScheduler(): void {
  // Every night at 10pm UTC (2am UAE time, GMT+4)
  cron.schedule("0 22 * * *", async () => {
    console.log("Running nightly DLD ingestion...");
    await runDldIngestion();
    await updateListingDurations();
  });

  // Every Monday at 2am UTC (6am UAE time)
  cron.schedule("0 2 * * 1", async () => {
    console.log("Running weekly macro refresh...");
    await refreshMacroData();
  });

  // Every 30 minutes — refresh Dubai Pulse OAuth token proactively
  cron.schedule("*/30 * * * *", async () => {
    await getAccessToken();
  });

  console.log("Scheduler started — DLD ingestion nightly at 22:00 UTC, macro refresh Mondays at 02:00 UTC");
}
