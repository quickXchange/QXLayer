import { sql } from "drizzle-orm";
import { check, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { adminContext, runtimeRole } from "./rls";

const visible = sql`(${adminContext} OR id::text = nullif(current_setting('app.tenant_id', true), ''))`;
const writable = sql`(${visible} AND current_setting('app.can_write', true) = 'true')`;

export const tenantsTable = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("draft"),
  environment: text("environment").notNull().default("sandbox"),
  completedSteps: text("completed_steps").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  check("tenants_sandbox_only", sql`environment = 'sandbox'`),
  check("tenants_valid_status", sql`status IN ('draft', 'active', 'suspended')`),
  pgPolicy("tenants_read", { for: "select", to: runtimeRole, using: visible }),
  pgPolicy("tenants_create", { for: "insert", to: runtimeRole, withCheck: adminContext }),
  pgPolicy("tenants_update", { for: "update", to: runtimeRole, using: writable, withCheck: writable }),
]).enableRLS();

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type TenantRow = typeof tenantsTable.$inferSelect;
export type InsertTenant = typeof tenantsTable.$inferInsert;