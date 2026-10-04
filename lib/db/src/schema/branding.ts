import { sql } from "drizzle-orm";
import { boolean, check, jsonb, pgPolicy, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { tenantsTable } from "./tenants";
import { assetNetworksTable, modulesTable } from "./catalog";
import { adminContext, runtimeRole, tenantAccess, tenantPolicies } from "./rls";

export const tenantBrandingTable = pgTable("tenant_branding", {
  tenantId: uuid("tenant_id").primaryKey().references(() => tenantsTable.id),
  brandName: text("brand_name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#0F766E"),
  accentColor: text("accent_color").notNull().default("#14B8A6"),
  themeMode: text("theme_mode").notNull().default("system"),
  defaultLanguage: text("default_language").notNull().default("en"),
  supportedLanguages: text("supported_languages").array().notNull().default(sql`ARRAY['en']::text[]`),
  websiteSettings: jsonb("website_settings").notNull().default({}),
}, () => [
  check("branding_valid_mode", sql`theme_mode IN ('light', 'dark', 'system')`),
  ...tenantPolicies("tenant_branding"),
]).enableRLS();

export const tenantDomainsTable = pgTable("tenant_domains", {
  tenantId: uuid("tenant_id").primaryKey().references(() => tenantsTable.id),
  domain: text("domain").notNull().unique(),
  status: text("status").notNull().default("unverified"),
  verificationToken: text("verification_token"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
}, () => [
  check("domains_valid_status", sql`status IN ('unverified', 'verified')`),
  ...tenantPolicies("tenant_domains"),
  pgPolicy("tenant_domains_public_domain", { for: "select", to: runtimeRole, using: sql`status='verified' AND domain=nullif(current_setting('app.public_domain',true),'')` }),
]).enableRLS();

export const tenantModulesTable = pgTable("tenant_modules", {
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  moduleKey: text("module_key").notNull().references(() => modulesTable.key),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.moduleKey] }),
  pgPolicy("tenant_modules_read", { for: "select", to: runtimeRole, using: tenantAccess }),
  pgPolicy("tenant_modules_operator_write", { for: "all", to: runtimeRole, using: adminContext, withCheck: adminContext }),
]).enableRLS();

export const tenantAssetsNetworksTable = pgTable("tenant_asset_networks", {
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  assetNetworkId: text("asset_network_id").notNull().references(() => assetNetworksTable.id),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.assetNetworkId] }),
  ...tenantPolicies("tenant_asset_networks"),
]).enableRLS();

export const tenantConfigurationTable = pgTable("tenant_configuration", {
  tenantId: uuid("tenant_id").primaryKey().references(() => tenantsTable.id),
  environment: text("environment").notNull().default("sandbox"),
  exchangeEnabled: boolean("exchange_enabled").notNull().default(false),
  paymentsEnabled: boolean("payments_enabled").notNull().default(false),
  allowGuestCheckout: boolean("allow_guest_checkout").notNull().default(false),
}, () => [
  check("configuration_sandbox_only", sql`environment = 'sandbox'`),
  ...tenantPolicies("tenant_configuration"),
]).enableRLS();

export const insertTenantBrandingSchema = createInsertSchema(tenantBrandingTable);
export const insertTenantDomainSchema = createInsertSchema(tenantDomainsTable);
export const insertTenantModuleSchema = createInsertSchema(tenantModulesTable);
export const insertTenantAssetNetworkSchema = createInsertSchema(tenantAssetsNetworksTable);
export const insertTenantConfigurationSchema = createInsertSchema(tenantConfigurationTable);