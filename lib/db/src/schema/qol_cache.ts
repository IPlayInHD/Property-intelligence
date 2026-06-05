import { pgTable, serial, varchar, numeric, jsonb, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qolCacheTable = pgTable("qol_cache", {
  id: serial("id").primaryKey(),
  community: varchar("community", { length: 255 }).notNull(),
  emirate: varchar("emirate", { length: 50 }).notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }),
  longitude: numeric("longitude", { precision: 10, scale: 6 }),
  transportScore: numeric("transport_score", { precision: 5, scale: 2 }),
  educationScore: numeric("education_score", { precision: 5, scale: 2 }),
  healthcareScore: numeric("healthcare_score", { precision: 5, scale: 2 }),
  retailScore: numeric("retail_score", { precision: 5, scale: 2 }),
  recreationScore: numeric("recreation_score", { precision: 5, scale: 2 }),
  noiseScore: numeric("noise_score", { precision: 5, scale: 2 }),
  totalScore: numeric("total_score", { precision: 5, scale: 2 }),
  amenitiesData: jsonb("amenities_data"),
  cachedAt: timestamp("cached_at").defaultNow(),
}, (table) => [
  unique("uq_qol_community_emirate").on(table.community, table.emirate),
]);

export const insertQolCacheSchema = createInsertSchema(qolCacheTable).omit({ id: true, cachedAt: true });
export type InsertQolCache = z.infer<typeof insertQolCacheSchema>;
export type QolCache = typeof qolCacheTable.$inferSelect;
