import { uuid, bigint, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { pgTable } from "../row-security";
import { tenantsTable } from "./tenants";
import { tenantIntegrationsTable } from "./tenant-integrations";
export const tenantTelegramReceiptsTable = pgTable("tenant_telegram_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  integrationId: uuid("integration_id").notNull().references(() => tenantIntegrationsTable.id),
  updateId: bigint("update_id", { mode: "number" }).notNull(),
  payloadHash: text("payload_hash").notNull(),
  state: text("state").notNull().default("claimed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, t => [uniqueIndex("tenant_telegram_update_identity").on(t.integrationId, t.updateId)]);
