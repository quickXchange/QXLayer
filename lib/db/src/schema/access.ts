import { sql } from "drizzle-orm";
import { boolean, check, pgPolicy, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { tenantsTable } from "./tenants";
import { adminContext, runtimeRole, tenantAccess, tenantContext } from "./rls";

export const platformAdminsTable = pgTable("platform_admins", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  pgPolicy("platform_admins_self_read", {
    for: "select", to: runtimeRole,
    using: sql`clerk_user_id = current_setting('app.actor_id', true)`,
  }),
]).enableRLS();

export const tenantMembershipsTable = pgTable("tenant_memberships", {
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  clerkUserId: text("clerk_user_id").notNull(),
  role: text("role").notNull().default("client_admin"),
  permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
  label: text("label").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.clerkUserId] }),
  check("memberships_valid_role", sql`role IN ('client_admin', 'staff')`),
  pgPolicy("memberships_read", {
    for: "select", to: runtimeRole,
    using: sql`(${tenantAccess} OR clerk_user_id = current_setting('app.actor_id', true))`,
  }),
  pgPolicy("memberships_operator_write", {
    for: "all", to: runtimeRole,
    using: sql`(${adminContext} OR (${tenantContext} AND role = 'staff' AND current_setting('app.can_write', true) = 'true' AND current_setting('app.can_manage_staff', true) = 'true'))`,
    withCheck: sql`(${adminContext} OR (${tenantContext} AND role = 'staff' AND current_setting('app.can_write', true) = 'true' AND current_setting('app.can_manage_staff', true) = 'true'))`,
  }),
]).enableRLS();

export const insertPlatformAdminSchema = createInsertSchema(platformAdminsTable);
export const insertTenantMembershipSchema = createInsertSchema(tenantMembershipsTable);
export type PlatformAdmin = typeof platformAdminsTable.$inferSelect;
export type TenantMembership = typeof tenantMembershipsTable.$inferSelect;