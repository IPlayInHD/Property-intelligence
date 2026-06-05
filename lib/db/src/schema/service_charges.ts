import { pgTable, serial, varchar, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serviceChargesTable = pgTable("service_charges", {
  id: serial("id").primaryKey(),
  buildingName: varchar("building_name", { length: 255 }),
  community: varchar("community", { length: 255 }),
  emirate: varchar("emirate", { length: 50 }),
  chargePerSqft: numeric("charge_per_sqft", { precision: 8, scale: 2 }),
  totalAnnualCharge: numeric("total_annual_charge", { precision: 12, scale: 2 }),
  reraApprovalDate: date("rera_approval_date"),
  source: varchar("source", { length: 100 }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceChargeSchema = createInsertSchema(serviceChargesTable).omit({ id: true, updatedAt: true });
export type InsertServiceCharge = z.infer<typeof insertServiceChargeSchema>;
export type ServiceCharge = typeof serviceChargesTable.$inferSelect;
