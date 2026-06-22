import { pgTable, uuid, varchar, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const demoFeedbackTable = pgTable("demo_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyViewed: varchar("property_viewed", { length: 255 }),
  starRating: integer("star_rating"),
  mostValuableFeature: varchar("most_valuable_feature", { length: 100 }),
  biggestChallenge: text("biggest_challenge"),
  wouldPay: varchar("would_pay", { length: 100 }),
  role: varchar("role", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDemoFeedbackSchema = createInsertSchema(demoFeedbackTable).omit({ id: true, createdAt: true });
export type InsertDemoFeedback = z.infer<typeof insertDemoFeedbackSchema>;
export type DemoFeedback = typeof demoFeedbackTable.$inferSelect;
