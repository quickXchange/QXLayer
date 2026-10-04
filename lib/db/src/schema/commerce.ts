import { sql } from "drizzle-orm";
import { check, foreignKey, jsonb, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { tenantsTable } from "./tenants";
import { tenantPolicies } from "./rls";

// Storage contracts only. No financial execution endpoints exist in this foundation.
export const pricingRulesTable = pgTable("pricing_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  name: text("name").notNull(),
  feeBps: numeric("fee_bps", { precision: 10, scale: 2 }).notNull().default("0"),
  environment: text("environment").notNull().default("sandbox"),
}, (t) => [
  unique("pricing_id_tenant_unique").on(t.id, t.tenantId),
  check("pricing_sandbox_only", sql`environment = 'sandbox'`),
  check("pricing_nonnegative_fee", sql`fee_bps >= 0`),
  ...tenantPolicies("pricing_rules"),
]).enableRLS();

export const ordersTable = pgTable("exchange_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  pricingRuleId: uuid("pricing_rule_id"),
  status: text("status").notNull().default("draft"),
  environment: text("environment").notNull().default("sandbox"),
  request: jsonb("request").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("orders_id_tenant_unique").on(t.id, t.tenantId),
  foreignKey({ columns: [t.pricingRuleId, t.tenantId], foreignColumns: [pricingRulesTable.id, pricingRulesTable.tenantId] }),
  check("orders_sandbox_only", sql`environment = 'sandbox'`),
  ...tenantPolicies("exchange_orders"),
]).enableRLS();

export const paymentsTable = pgTable("payment_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("pending"),
  environment: text("environment").notNull().default("sandbox"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("payments_id_tenant_unique").on(t.id, t.tenantId),
  check("payments_sandbox_only", sql`environment = 'sandbox'`),
  check("payments_positive_amount", sql`amount > 0`),
  check("payments_valid_status", sql`status IN ('pending','waiting_for_payment','payment_detected','confirming','paid','expired','underpaid','overpaid','failed','refunded')`),
  ...tenantPolicies("payment_invoices"),
]).enableRLS();

export const insertPricingRuleSchema = createInsertSchema(pricingRulesTable);
export const insertOrderSchema = createInsertSchema(ordersTable);
export const insertPaymentSchema = createInsertSchema(paymentsTable);