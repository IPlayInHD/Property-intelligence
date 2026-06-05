import { pgTable, serial, varchar, numeric, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const communitiesTable = pgTable("communities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  emirate: varchar("emirate", { length: 50 }).notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 6 }).notNull(),
  zone: varchar("zone", { length: 100 }),
}, (table) => [
  unique("uq_community_emirate").on(table.name, table.emirate),
]);

export const insertCommunitySchema = createInsertSchema(communitiesTable).omit({ id: true });
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communitiesTable.$inferSelect;
