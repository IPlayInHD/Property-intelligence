import { pgTable, serial, varchar, integer, numeric, date, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dldTransactionsTable = pgTable("dld_transactions", {
  id: serial("id").primaryKey(),
  transactionId: varchar("transaction_id", { length: 100 }).unique(),
  community: varchar("community", { length: 255 }),
  buildingName: varchar("building_name", { length: 255 }),
  propertyType: varchar("property_type", { length: 50 }),
  bedrooms: integer("bedrooms"),
  sizeSqft: numeric("size_sqft", { precision: 10, scale: 2 }),
  salePrice: numeric("sale_price", { precision: 15, scale: 2 }),
  pricePerSqft: numeric("price_per_sqft", { precision: 10, scale: 2 }),
  transactionDate: date("transaction_date"),
  emirate: varchar("emirate", { length: 50 }).default("Dubai"),
  floorNumber: integer("floor_number"),
  ingestedAt: timestamp("ingested_at").defaultNow(),
}, (table) => [
  index("idx_dld_community").on(table.community, table.propertyType, table.bedrooms),
  index("idx_dld_date").on(table.transactionDate),
]);

export const insertDldTransactionSchema = createInsertSchema(dldTransactionsTable).omit({ id: true, ingestedAt: true });
export type InsertDldTransaction = z.infer<typeof insertDldTransactionSchema>;
export type DldTransaction = typeof dldTransactionsTable.$inferSelect;
