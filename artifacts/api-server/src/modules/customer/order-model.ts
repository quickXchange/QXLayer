import type { DatabaseClient } from "@workspace/db";
import type { WhiteLabelStatus } from "@workspace/api-zod";
import type { Principal } from "../authentication/service";
import { HttpError } from "../../lib/errors";

export const requestColumns = `id,order_number AS "orderNumber",customer_user_id AS "customerUserId",configuration,status,
monthly_price AS "monthlyPrice",setup_price AS "setupPrice",currency,operator_note AS "operatorNote",
customization_price AS "customizationPrice",custom_design_decision AS "customDesignDecision",approved_configuration AS "approvedConfiguration",
tenant_id AS "tenantId",created_at AS "createdAt",updated_at AS "updatedAt"`;
export const attachmentColumns = `id,file_name AS "fileName",content_type AS "contentType",size,category,created_at AS "createdAt"`;
export const eventColumns = `id,kind,author_user_id AS author,visibility,message,status,created_at AS "createdAt"`;
export const requestContext = (p: Principal, write = false) => ({ actorId: p.userId, isSuperAdmin: p.role === "super_admin", canWrite: write });
const terminal = ["delivered", "rejected", "cancelled"];
const transitions: Record<string, string[]> = {
  new: ["reviewing", "waiting_for_client", "quote_ready", "approved", "rejected", "cancelled"],
  reviewing: ["waiting_for_client", "quote_ready", "approved", "rejected", "cancelled"],
  waiting_for_client: ["reviewing", "quote_ready", "approved", "in_setup", "customization", "ready", "rejected", "cancelled"],
  quote_ready: ["reviewing", "waiting_for_client", "approved", "rejected", "cancelled"],
  approved: ["reviewing", "waiting_for_client", "quote_ready", "in_setup", "customization", "ready", "rejected", "cancelled"],
  in_setup: ["waiting_for_client", "customization", "ready", "rejected", "cancelled"],
  customization: ["waiting_for_client", "in_setup", "ready", "rejected", "cancelled"],
  ready: ["in_setup", "customization", "waiting_for_client", "rejected", "cancelled"],
};
export function assertTransition(current: string, next: WhiteLabelStatus) {
  if (terminal.includes(current)) throw new HttpError(409, "Delivered, rejected and cancelled orders are read-only. Notes may still be appended.");
  if (next === "delivered") throw new HttpError(409, "Use Provision and Deliver after preparing an authorized Exchange.");
  if (next !== current && !transitions[current]?.includes(next)) throw new HttpError(409, `Cannot change ${current} to ${next}.`);
}
export function assertFinalPricing(row: Record<string, any>) {
  if (row.monthlyPrice == null || row.setupPrice == null || !row.currency) throw new HttpError(409, "Set final recurring and setup pricing before approval or delivery.");
  if (row.configuration?.design?.type === "custom" && (row.customDesignDecision !== "approved" || row.customizationPrice == null)) {
    throw new HttpError(409, "Approve the custom design request and set its customization price first.");
  }
}
export async function orderView(c: DatabaseClient, row: Record<string, any>) {
  const cfg = row.configuration;
  const files = await c.query(`SELECT ${attachmentColumns} FROM white_label_attachments WHERE request_id=$1 ORDER BY created_at,id`, [row.id]);
  return {
    id: row.id, orderReference: `WL-${String(row.orderNumber).padStart(6, "0")}`, customerUserId: row.customerUserId,
    projectName: cfg.projectName, brandName: cfg.brandName, preferredDomain: cfg.preferredDomain ?? null, actions: cfg.actions, details: cfg.details,
    companyName: cfg.companyName ?? null, design: cfg.design ?? null, billingPeriod: cfg.billingPeriod ?? "monthly",
    requestedPlan: cfg.catalogSnapshot?.plan ?? null, requestedAddons: cfg.catalogSnapshot?.addons ?? [],
    approvedPlan: row.approvedConfiguration?.plan ?? null, approvedAddons: row.approvedConfiguration?.addons ?? [],
    attachments: files.rows, status: row.status, monthlyPrice: row.monthlyPrice, setupPrice: row.setupPrice, currency: row.currency,
    customizationPrice: row.customizationPrice, customDesignDecision: row.customDesignDecision,
    operatorNote: row.operatorNote, tenantId: row.tenantId, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}
export async function event(c: DatabaseClient, p: Principal, id: string, kind: "note" | "status", message: string, visibility: "customer" | "internal" = "customer", status: string | null = null) {
  const r = await c.query(`INSERT INTO white_label_events (request_id,kind,author_user_id,visibility,message,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${eventColumns}`, [id, kind, p.userId, visibility, message, status]);
  return r.rows[0];
}