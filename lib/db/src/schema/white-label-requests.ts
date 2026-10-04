import { sql } from "drizzle-orm";
import { check, jsonb, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { createInsertSchema } from "drizzle-zod";
import { adminContext, runtimeRole } from "./rls";

const self = sql`customer_user_id = current_setting('app.actor_id',true)`;
export const whiteLabelRequestsTable = pgTable("white_label_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerUserId: text("customer_user_id").notNull(),
  idempotencyKey: uuid("idempotency_key").notNull(),
  configuration: jsonb("configuration").notNull(),
  status: text("status").notNull().default("submitted"),
  monthlyPrice: text("monthly_price"),
  setupPrice: text("setup_price"),
  currency: text("currency"),
  operatorNote: text("operator_note").notNull().default(""),
  tenantId: uuid("tenant_id").references(() => tenantsTable.id).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("white_label_request_idempotency").on(t.customerUserId, t.idempotencyKey),
  check("white_label_request_status", sql`status IN ('submitted','approved','rejected','provisioned')`),
  check("white_label_request_delivery", sql`(status = 'provisioned') = (tenant_id IS NOT NULL)`),
  pgPolicy("white_label_request_read", { for: "select", to: runtimeRole, using: sql`${adminContext} OR ${self}` }),
  pgPolicy("white_label_request_submit", { for: "insert", to: runtimeRole, withCheck: sql`${self} AND current_setting('app.can_write',true)='true' AND status='submitted' AND tenant_id IS NULL AND monthly_price IS NULL AND setup_price IS NULL AND currency IS NULL AND operator_note=''` }),
  pgPolicy("white_label_request_operator", { for: "update", to: runtimeRole, using: sql`${adminContext} AND current_setting('app.can_write',true)='true'`, withCheck: sql`${adminContext} AND current_setting('app.can_write',true)='true'` }),
]).enableRLS();
export const insertWhiteLabelRequestSchema = createInsertSchema(whiteLabelRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type WhiteLabelRequestRow = typeof whiteLabelRequestsTable.$inferSelect;