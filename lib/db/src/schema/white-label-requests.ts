import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgPolicy, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { createInsertSchema } from "drizzle-zod";
import { adminContext, runtimeRole } from "./rls";

const self = sql`customer_user_id = current_setting('app.actor_id',true)`;
export const whiteLabelRequestsTable = pgTable("white_label_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: serial("order_number").notNull().unique(),
  customerUserId: text("customer_user_id").notNull(),
  idempotencyKey: uuid("idempotency_key").notNull(),
  configuration: jsonb("configuration").notNull(),
  status: text("status").notNull().default("new"),
  monthlyPrice: text("monthly_price"),
  setupPrice: text("setup_price"),
  currency: text("currency"),
  operatorNote: text("operator_note").notNull().default(""),
  customizationPrice: text("customization_price"),
  customDesignDecision: text("custom_design_decision").notNull().default("pending"),
  approvedConfiguration: jsonb("approved_configuration"),
  tenantId: uuid("tenant_id").references(() => tenantsTable.id).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("white_label_request_idempotency").on(t.customerUserId, t.idempotencyKey),
  check("white_label_request_status", sql`status IN ('new','reviewing','waiting_for_client','quote_ready','approved','in_setup','customization','ready','delivered','rejected','cancelled')`),
  check("white_label_request_delivery", sql`(status = 'delivered') = (tenant_id IS NOT NULL)`),
  pgPolicy("white_label_request_read", { for: "select", to: runtimeRole, using: sql`${adminContext} OR ${self}` }),
  pgPolicy("white_label_request_submit", { for: "insert", to: runtimeRole, withCheck: sql`${self} AND current_setting('app.can_write',true)='true' AND status='new' AND tenant_id IS NULL AND monthly_price IS NULL AND setup_price IS NULL AND currency IS NULL AND operator_note='' AND customization_price IS NULL AND approved_configuration IS NULL AND custom_design_decision='pending'` }),
  pgPolicy("white_label_request_operator", { for: "update", to: runtimeRole, using: sql`${adminContext} AND current_setting('app.can_write',true)='true'`, withCheck: sql`${adminContext} AND current_setting('app.can_write',true)='true'` }),
]).enableRLS();
export const insertWhiteLabelRequestSchema = createInsertSchema(whiteLabelRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type WhiteLabelRequestRow = typeof whiteLabelRequestsTable.$inferSelect;

const visibleOrder = sql`EXISTS (SELECT 1 FROM white_label_requests r WHERE r.id=request_id AND r.customer_user_id=current_setting('app.actor_id',true))`;
export const whiteLabelEventsTable = pgTable("white_label_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").notNull().references(() => whiteLabelRequestsTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  authorUserId: text("author_user_id").notNull(),
  visibility: text("visibility").notNull().default("customer"),
  message: text("message").notNull(),
  status: text("status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  check("white_label_event_kind", sql`kind IN ('status','note')`),
  check("white_label_event_visibility", sql`visibility IN ('customer','internal')`),
  pgPolicy("white_label_events_read", { for: "select", to: runtimeRole, using: sql`${adminContext} OR (visibility='customer' AND ${visibleOrder})` }),
  pgPolicy("white_label_events_insert", { for: "insert", to: runtimeRole, withCheck: sql`current_setting('app.can_write',true)='true' AND (${adminContext} OR (${visibleOrder} AND visibility='customer' AND kind='status' AND status='new' AND author_user_id=current_setting('app.actor_id',true)))` }),
]).enableRLS();

export const whiteLabelAttachmentsTable = pgTable("white_label_attachments", {
  id: uuid("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  requestId: uuid("request_id").references(() => whiteLabelRequestsTable.id, { onDelete: "cascade" }),
  objectKey: text("object_key").notNull().unique(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  check("white_label_attachment_size", sql`size > 0 AND size <= 8388608`),
  pgPolicy("white_label_attachments_read", { for: "select", to: runtimeRole, using: sql`owner_user_id=current_setting('app.actor_id',true) OR (${adminContext} AND request_id IS NOT NULL)` }),
  pgPolicy("white_label_attachments_create", { for: "insert", to: runtimeRole, withCheck: sql`owner_user_id=current_setting('app.actor_id',true) AND request_id IS NULL AND current_setting('app.can_write',true)='true'` }),
  pgPolicy("white_label_attachments_bind", { for: "update", to: runtimeRole, using: sql`owner_user_id=current_setting('app.actor_id',true) AND request_id IS NULL AND current_setting('app.can_write',true)='true'`, withCheck: sql`owner_user_id=current_setting('app.actor_id',true) AND ${visibleOrder}` }),
]).enableRLS();