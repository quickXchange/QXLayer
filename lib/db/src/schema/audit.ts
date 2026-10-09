import { jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "../row-security";
import { createInsertSchema } from "drizzle-zod";
import { tenantsTable } from "./tenants";

export const auditEventsTable = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenantsTable.id),
  actorId: text("actor_id").notNull(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditEventSchema = createInsertSchema(auditEventsTable);