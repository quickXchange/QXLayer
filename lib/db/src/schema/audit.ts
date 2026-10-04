import { sql } from "drizzle-orm";
import { jsonb, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { tenantsTable } from "./tenants";
import { adminContext, runtimeRole, tenantAccess } from "./rls";

export const auditEventsTable = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenantsTable.id),
  actorId: text("actor_id").notNull(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  pgPolicy("audit_read", { for: "select", to: runtimeRole, using: tenantAccess }),
  pgPolicy("audit_append", {
    for: "insert", to: runtimeRole,
    withCheck: sql`((${adminContext} OR ${tenantAccess}) AND actor_id = current_setting('app.actor_id', true))`,
  }),
]).enableRLS();

export const insertAuditEventSchema = createInsertSchema(auditEventsTable);