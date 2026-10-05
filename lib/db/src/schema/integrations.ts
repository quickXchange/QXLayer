import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { tenantsTable } from "./tenants";
import { tenantAssetsNetworksTable } from "./branding";

export const walletConfigurationsTable = pgTable("wallet_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  assetNetworkId: text("asset_network_id").notNull(),
  strategy: text("strategy").notNull().default("sandbox"),
  environment: text("environment").notNull().default("sandbox"),
}, (t) => [
  foreignKey({ columns: [t.tenantId, t.assetNetworkId], foreignColumns: [tenantAssetsNetworksTable.tenantId, tenantAssetsNetworksTable.assetNetworkId] }),
  check("wallets_sandbox_only", sql`environment = 'sandbox' AND strategy = 'sandbox'`),
]);

export const blockchainProvidersTable = pgTable("blockchain_provider_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  networkId: text("network_id").notNull(),
  adapter: text("adapter").notNull().default("sandbox"),
  priority: text("priority").notNull().default("primary"),
  environment: text("environment").notNull().default("sandbox"),
}, () => [
  check("providers_sandbox_only", sql`environment = 'sandbox' AND adapter = 'sandbox'`),
  check("providers_valid_priority", sql`priority IN ('primary', 'secondary', 'manual')`),
]);

export const apiKeysTable = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  label: text("label").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  scopes: text("scopes").array().notNull().default(sql`'{}'::text[]`),
  environment: text("environment").notNull().default("sandbox"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, () => [
  check("api_keys_sandbox_only", sql`environment = 'sandbox'`),
]);

export const webhookEndpointsTable = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  url: text("url").notNull(),
  label: text("label").notNull().default("Webhook"),
  enabled: boolean("enabled").notNull().default(false),
  environment: text("environment").notNull().default("sandbox"),
}, () => [
  check("webhooks_sandbox_only", sql`environment = 'sandbox'`),
]);

export const notificationsTable = pgTable("notification_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  channel: text("channel").notNull(),
  payload: jsonb("payload").notNull().default({}),
  status: text("status").notNull().default("sandbox_queued"),
  environment: text("environment").notNull().default("sandbox"),
}, () => [
  check("notifications_sandbox_only", sql`environment = 'sandbox'`),
]);

export const insertWalletConfigurationSchema = createInsertSchema(walletConfigurationsTable);
export const insertBlockchainProviderSchema = createInsertSchema(blockchainProvidersTable);
export const insertApiKeySchema = createInsertSchema(apiKeysTable);
export const insertWebhookEndpointSchema = createInsertSchema(webhookEndpointsTable);
export const insertNotificationSchema = createInsertSchema(notificationsTable);