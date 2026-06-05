import cron from "node-cron";
import { db } from "@workspace/db";
import { dldTransactionsTable, listingsTable, macroDataTable } from "@workspace/db";
import { eq, sql, and, lt } from "drizzle-orm";
import { fetchDldTransactions, getAccessToken } from "../services/dubaiPulse";
import { getWorldBankGdpGrowth } from "../services/cbuae";

async function refreshDLDTransactions(): Promise<void> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split("T")[0];

    const communities = ["Dubai Marina", "Downtown Dubai", "JBR", "Business Bay", "JVC", "Palm Jumeirah"];

    for (const community of communities) {
      const rows = await fetchDldTransactions({
        community, emirate: "Dubai", from_date: dateStr, limit: 50,
      });

      for (const row of rows) {
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
        } catch { /* ignore dupes */ }
      }
    }
    console.log("DLD transaction refresh complete");
  } catch (err) {
    console.error("DLD refresh failed:", err);
  }
}

async function updateListingDurations(): Promise<void> {
  try {
    // Mark listings not seen recently as inactive
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
  // Every night at 10pm UTC (2am UAE time GMT+4)
  cron.schedule("0 22 * * *", async () => {
    console.log("Running nightly refresh...");
    await refreshDLDTransactions();
    await updateListingDurations();
  });

  // Every Monday at 2am UTC (6am UAE time)
  cron.schedule("0 2 * * 1", async () => {
    console.log("Running weekly macro refresh...");
    await refreshMacroData();
  });

  // Every 30 minutes — refresh Dubai Pulse OAuth token
  cron.schedule("*/30 * * * *", async () => {
    await getAccessToken();
  });

  console.log("Scheduler started");
}
