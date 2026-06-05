import { pgTable, serial, varchar, numeric, boolean, integer, date, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 50 }),
  listingUrl: varchar("listing_url", { length: 500 }).unique(),
  community: varchar("community", { length: 255 }),
  buildingName: varchar("building_name", { length: 255 }),
  propertyType: varchar("property_type", { length: 50 }),
  bedrooms: integer("bedrooms"),
  sizeSqft: numeric("size_sqft", { precision: 10, scale: 2 }),
  listedPrice: numeric("listed_price", { precision: 15, scale: 2 }),
  pricePerSqft: numeric("price_per_sqft", { precision: 10, scale: 2 }),
  viewType: varchar("view_type", { length: 50 }),
  furnished: boolean("furnished"),
  emirate: varchar("emirate", { length: 50 }),
  firstSeen: date("first_seen"),
  lastSeen: date("last_seen"),
  daysListed: integer("days_listed"),
  isActive: boolean("is_active").default(true),
  scrapedAt: timestamp("scraped_at").defaultNow(),
}, (table) => [
  index("idx_listings_community").on(table.community, table.propertyType, table.bedrooms),
]);

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, scrapedAt: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;
