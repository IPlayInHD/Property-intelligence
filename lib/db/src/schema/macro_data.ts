import { pgTable, serial, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const macroDataTable = pgTable("macro_data", {
  id: serial("id").primaryKey(),
  metricName: varchar("metric_name", { length: 100 }).notNull(),
  metricValue: numeric("metric_value", { precision: 15, scale: 4 }).notNull(),
  period: varchar("period", { length: 20 }),
  source: varchar("source", { length: 100 }),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const insertMacroDataSchema = createInsertSchema(macroDataTable).omit({ id: true, recordedAt: true });
export type InsertMacroData = z.infer<typeof insertMacroDataSchema>;
export type MacroData = typeof macroDataTable.$inferSelect;
