import { pgTable, serial, varchar, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Long-format macro / time-series metric store. One row per
 * (metric_name, period, source) — e.g. the DLD Residential Sale Price Index
 * melted into rows like ("flat_monthly_price_index", "2022-01", 1049652).
 * Feeds the Trend Analytics and Forecast modules.
 */
export const macroDataTable = pgTable("macro_data", {
  id: serial("id").primaryKey(),
  metricName: varchar("metric_name", { length: 100 }).notNull(),
  metricValue: numeric("metric_value", { precision: 18, scale: 4 }).notNull(),
  period: varchar("period", { length: 20 }),
  source: varchar("source", { length: 100 }),
  recordedAt: timestamp("recorded_at").defaultNow(),
}, (table) => [
  uniqueIndex("uq_macro_metric_period_source").on(table.metricName, table.period, table.source),
]);

export const insertMacroDataSchema = createInsertSchema(macroDataTable).omit({ id: true, recordedAt: true });
export type InsertMacroData = z.infer<typeof insertMacroDataSchema>;
export type MacroData = typeof macroDataTable.$inferSelect;
