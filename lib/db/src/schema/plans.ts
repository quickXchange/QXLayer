import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

// A new feature/limit is a catalog row, not a column or a tier in application code.
export const entitlementDefinitionsTable = pgTable("entitlement_definitions", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  kind: text("kind").notNull(),
  valueType: text("value_type").notNull(),
}, () => [
  check("entitlement_definition_kind_type", sql`(kind = 'feature' AND value_type = 'boolean') OR (kind = 'limit' AND value_type IN ('integer','decimal'))`),
]);

export const plansTable = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  monthlyPrice: numeric("monthly_price", { precision: 22, scale: 2 }).notNull().default("0"),
  yearlyPrice: numeric("yearly_price", { precision: 22, scale: 2 }).notNull().default("0"),
  setupFee: numeric("setup_fee", { precision: 22, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  billingLabel: text("billing_label").notNull().default(""),
  displayOrder: integer("display_order").notNull().default(0),
  status: text("status").notNull().default("disabled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  check("plans_status", sql`status IN ('enabled','disabled','archived')`),
  check("plans_nonnegative_metadata", sql`monthly_price >= 0 AND yearly_price >= 0 AND setup_fee >= 0 AND display_order >= 0`),
  check("plans_currency", sql`currency ~ '^[A-Z]{3}$'`),
]);

export const planEntitlementsTable = pgTable("plan_entitlements", {
  planId: uuid("plan_id").notNull().references(() => plansTable.id),
  key: text("key").notNull().references(() => entitlementDefinitionsTable.key),
  value: jsonb("value").$type<boolean | string>().notNull(),
}, (t) => [
  primaryKey({ columns: [t.planId, t.key] }),
]);

export const addonsTable = pgTable("addons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  monthlyPrice: numeric("monthly_price", { precision: 22, scale: 2 }).notNull().default("0"),
  yearlyPrice: numeric("yearly_price", { precision: 22, scale: 2 }).notNull().default("0"),
  setupFee: numeric("setup_fee", { precision: 22, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  pricingConfigured: boolean("pricing_configured").notNull().default(false),
});

export const addonEntitlementsTable = pgTable("addon_entitlements", {
  addonId: uuid("addon_id").notNull().references(() => addonsTable.id),
  key: text("key").notNull().references(() => entitlementDefinitionsTable.key),
  value: jsonb("value").$type<boolean | string>().notNull(),
}, (t) => [
  primaryKey({ columns: [t.addonId, t.key] }),
]);

export const tenantSubscriptionsTable = pgTable("tenant_subscriptions", {
  tenantId: uuid("tenant_id").primaryKey().references(() => tenantsTable.id),
  planId: uuid("plan_id").notNull().references(() => plansTable.id),
  status: text("status").notNull().default("active"),
  resumeStatus: text("resume_status").notNull().default("draft"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  check("subscription_status", sql`status IN ('active','suspended')`),
  check("subscription_resume_status", sql`resume_status IN ('draft','active')`),
]);

export const tenantAddonsTable = pgTable("tenant_addons", {
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  addonId: uuid("addon_id").notNull().references(() => addonsTable.id),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.addonId] }),
]);

export const tenantEntitlementOverridesTable = pgTable("tenant_entitlement_overrides", {
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  key: text("key").notNull().references(() => entitlementDefinitionsTable.key),
  value: jsonb("value").$type<boolean | string>().notNull(),
  reason: text("reason").notNull(),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.key] }),
]);

// UTC monthly counters. Resource counts are read from their actual tenant tables.
export const tenantUsageCountersTable = pgTable("tenant_usage_counters", {
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  key: text("key").notNull().references(() => entitlementDefinitionsTable.key),
  period: text("period").notNull(),
  used: numeric("used", { precision: 36, scale: 18 }).notNull().default("0"),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.key, t.period] }),
  check("usage_nonnegative", sql`used >= 0`),
  check("usage_month_format", sql`period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
]);

export const tenantPaymentMethodsTable = pgTable("tenant_payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  label: text("label").notNull(),
  environment: text("environment").notNull().default("sandbox"),
}, () => [
  check("payment_methods_sandbox", sql`environment = 'sandbox'`),
]);