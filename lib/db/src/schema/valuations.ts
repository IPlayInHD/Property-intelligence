import { pgTable, serial, varchar, integer, numeric, date, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * DLD official property valuations (Data.Dubai valuations open dataset).
 * Independent assessed values — used as a cross-check against asking prices in
 * the Price Fairness module, especially where sale comparables are thin.
 * Note: the dataset mixes units, buildings and land parcels and has outliers;
 * consume it with median/robust stats per community + property type.
 */
export const valuationsTable = pgTable("valuations", {
  id: serial("id").primaryKey(),
  valuationRef: varchar("valuation_ref", { length: 100 }).unique(), // year-procedureNumber
  community: varchar("community", { length: 255 }),
  propertyType: varchar("property_type", { length: 50 }),
  propertySubType: varchar("property_sub_type", { length: 50 }),
  sizeSqft: numeric("size_sqft", { precision: 14, scale: 2 }),
  totalValue: numeric("total_value", { precision: 18, scale: 2 }),
  actualWorth: numeric("actual_worth", { precision: 18, scale: 2 }),
  valuePerSqft: numeric("value_per_sqft", { precision: 12, scale: 2 }),
  procedureYear: integer("procedure_year"),
  valuationDate: date("valuation_date"),
  emirate: varchar("emirate", { length: 50 }).default("Dubai"),
  ingestedAt: timestamp("ingested_at").defaultNow(),
}, (table) => [
  index("idx_valuations_community").on(table.community, table.propertyType),
  index("idx_valuations_date").on(table.valuationDate),
]);

export const insertValuationSchema = createInsertSchema(valuationsTable).omit({ id: true, ingestedAt: true });
export type InsertValuation = z.infer<typeof insertValuationSchema>;
export type Valuation = typeof valuationsTable.$inferSelect;
