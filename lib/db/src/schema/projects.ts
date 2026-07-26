import { pgTable, serial, varchar, integer, numeric, date, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * DLD off-plan development projects (Data.Dubai projects open dataset).
 * The forward supply pipeline: what is being built, by whom, where, how far
 * along, and how many units land when. Feeds the Liquidity module (upcoming
 * supply pressure per community) and the Forecast module (handover waves).
 */
export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectNumber: varchar("project_number", { length: 50 }).unique(),
  projectName: varchar("project_name", { length: 255 }),
  developerName: varchar("developer_name", { length: 255 }),
  projectType: varchar("project_type", { length: 50 }),
  status: varchar("status", { length: 50 }),
  percentCompleted: numeric("percent_completed", { precision: 6, scale: 2 }),
  projectValue: numeric("project_value", { precision: 18, scale: 2 }),
  community: varchar("community", { length: 255 }),
  zone: varchar("zone", { length: 255 }),
  masterProject: varchar("master_project", { length: 255 }),
  unitCount: integer("unit_count"),
  villaCount: integer("villa_count"),
  buildingCount: integer("building_count"),
  landCount: integer("land_count"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  completionDate: date("completion_date"),
  emirate: varchar("emirate", { length: 50 }).default("Dubai"),
  ingestedAt: timestamp("ingested_at").defaultNow(),
}, (table) => [
  index("idx_projects_community").on(table.community, table.status),
  index("idx_projects_completion").on(table.completionDate),
]);

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, ingestedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
