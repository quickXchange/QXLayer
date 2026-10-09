import { sql } from "drizzle-orm";
import { check, pgTable, uuid, text, boolean, jsonb, timestamp, uniqueIndex, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { tenantsTable } from "./tenants";

/** Independent scopes: never import QuickXchange credential/configuration rows. */
export const tenantIntegrationsTable = pgTable("tenant_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  providerKey: text("provider_key").notNull(),
  environment: text("environment").notNull().default("sandbox"),
  credentialManagement: text("credential_management").notNull().default("super_admin"),
  enabled: boolean("enabled").notNull().default(false),
  settings: jsonb("settings").notNull().default({}),
  encryptedCredentials: jsonb("encrypted_credentials"),
  credentialIdentity: text("credential_identity"),
  revision: bigint("revision", { mode: "number" }).notNull().default(0),
  lastNonce: bigint("last_nonce", { mode: "number" }).notNull().default(0),
  health: jsonb("health").notNull().default({ state: "not_configured" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("tenant_integration_scope").on(t.tenantId, t.providerKey, t.environment),
  uniqueIndex("tenant_integration_independent_credentials").on(t.providerKey, t.credentialIdentity),
  check("tenant_integration_sandbox", sql`environment='sandbox'`),
  check("tenant_integration_management", sql`credential_management IN ('super_admin','customer','both')`),
]);
export const insertTenantIntegrationSchema = createInsertSchema(tenantIntegrationsTable).omit({ id: true, revision: true, lastNonce: true, updatedAt: true });
export type TenantIntegration = typeof tenantIntegrationsTable.$inferSelect;
