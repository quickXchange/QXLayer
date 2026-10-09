import { sql } from "drizzle-orm";
import { boolean, check, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "../row-security";
import { createInsertSchema } from "drizzle-zod";
import { tenantsTable } from "./tenants";

export const platformAdminsTable = pgTable("platform_admins", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
]);

export const insertPlatformAdminSchema = createInsertSchema(platformAdminsTable);
export const insertTenantMembershipSchema = createInsertSchema(tenantMembershipsTable);
export type PlatformAdmin = typeof platformAdminsTable.$inferSelect;
export type TenantMembership = typeof tenantMembershipsTable.$inferSelect;