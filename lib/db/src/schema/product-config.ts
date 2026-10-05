import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { modulesTable } from "./catalog";

export const tenantProductConfigurationTable = pgTable("tenant_product_configuration", {
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  moduleKey: text("module_key").notNull().references(() => modulesTable.key),
  configuration: jsonb("configuration").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.moduleKey] }),
  check("product_configuration_object", sql`jsonb_typeof(configuration) = 'object'`),
]);