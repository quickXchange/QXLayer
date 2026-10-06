import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { createInsertSchema } from "drizzle-zod";
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
  check("white_label_request_delivery", sql`status <> 'delivered' OR tenant_id IS NOT NULL`),
]);
export const insertWhiteLabelRequestSchema = createInsertSchema(whiteLabelRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type WhiteLabelRequestRow = typeof whiteLabelRequestsTable.$inferSelect;

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
]);

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
]);