import { sql } from "drizzle-orm";
import { check, jsonb, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "../row-security";
import { createInsertSchema } from "drizzle-zod";
import { tenantsTable } from "./tenants";

export const providerCatalogTable = pgTable("provider_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  definition: jsonb("definition").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const providerAssignmentsTable = pgTable("provider_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  providerId: uuid("provider_id").notNull().references(() => providerCatalogTable.id),
  capability: text("capability").notNull(),
  environment: text("environment").notNull(),
  configuration: jsonb("configuration").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("provider_assignment_scope").on(t.tenantId, t.providerId, t.capability, t.environment),
  check("provider_assignment_environment", sql`environment IN ('sandbox','test','live')`),
]);
export const providerPoliciesTable = pgTable("provider_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  scope: text("scope").notNull(),
  resourceId: text("resource_id").notNull(),
  capability: text("capability").notNull(),
  definition: jsonb("definition").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("provider_policy_scope").on(t.tenantId, t.scope, t.resourceId, t.capability),
  check("provider_policy_resource", sql`scope IN ('route','network')`),
]);
// No plaintext or encrypted credential values are persisted in this phase.
export const insertProviderCatalogSchema = createInsertSchema(providerCatalogTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderAssignmentSchema = createInsertSchema(providerAssignmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderPolicySchema = createInsertSchema(providerPoliciesTable).omit({ id: true, updatedAt: true });
export type ProviderCatalogRow = typeof providerCatalogTable.$inferSelect;
export type ProviderAssignmentRow = typeof providerAssignmentsTable.$inferSelect;
export type ProviderPolicyRow = typeof providerPoliciesTable.$inferSelect;
