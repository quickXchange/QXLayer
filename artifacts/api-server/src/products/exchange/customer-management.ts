import { createHash } from "node:crypto";
import { withDatabase, type DatabaseClient } from "@workspace/db";
import { UpdateExchangeCustomerBody, SaveExchangeNotificationPreferencesBody } from "@workspace/api-zod";
import { contextFor, type Principal } from "../../modules/authentication/service";
import { lockTenant, requireFeature, resolveEntitlements } from "../../modules/entitlements/resolver";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";

export const customerIdForEmail = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
export function orderContact(input: { customerName?: string; customerEmail?: string; contactConsent?: boolean }) {
  if (!input.customerName && !input.customerEmail) return {};
  if (input.contactConsent !== true || !input.customerEmail?.trim() || !input.customerName?.trim())
    throw new HttpError(400, "Optional contact details require a name, valid email and explicit consent.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customerEmail.trim()) || input.customerEmail.trim().length > 254 || input.customerName.trim().length > 120)
    throw new HttpError(400, "Provide a valid contact name and email.");
  return { customerName: input.customerName.trim(), customerEmail: input.customerEmail.trim().toLowerCase(),
    customerId: customerIdForEmail(input.customerEmail) };
}
type CustomerMetadata = Record<string, { name: string; notes: string; archived: boolean }>;
export async function customerList(c: DatabaseClient, tenantId: string) {
  const groups = await c.query(`SELECT request->>'customerId' AS id,
    (array_agg(request->>'customerName' ORDER BY created_at DESC))[1] AS name,
    (array_agg(request->>'customerEmail' ORDER BY created_at DESC))[1] AS email,
    count(*)::int AS orders,max(COALESCE((request->'history'->-1->>'at')::timestamptz,created_at)) AS last
    FROM exchange_orders WHERE tenant_id=$1 AND request->>'product'='crypto_exchange'
    GROUP BY request->>'customerId'`, [tenantId]);
  const config = await c.query("SELECT configuration->'_customerDirectory' AS directory FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId]);
  const metadata = (config.rows[0]?.directory ?? {}) as CustomerMetadata;
  return groups.rows.map(row => {
    const saved = row.id ? metadata[row.id] : undefined;
    return { id: row.id ?? "anonymous", name: saved?.name ?? row.name ?? "Anonymous sandbox visitors",
      email: row.email ?? null, orders: row.orders as number, lastActivity: row.last as Date,
      status: !row.id ? "unidentified" as const : saved?.archived ? "archived" as const : "contact" as const,
      notes: saved?.notes ?? "" };
  });
}
export function updateCustomer(p: Principal, tenantId: string, customerId: string, raw: unknown) {
  const input = UpdateExchangeCustomerBody.parse(raw);
  if (!input.name.trim()) throw new HttpError(400, "Customer name must contain text.");
  return withDatabase(contextFor(p, tenantId, true, "configuration.manage"), async c => {
    await lockTenant(c, tenantId);
    requireFeature(await resolveEntitlements(c, tenantId), "crypto_exchange");
    const exists = await c.query("SELECT 1 FROM exchange_orders WHERE tenant_id=$1 AND request->>'product'='crypto_exchange' AND request->>'customerId'=$2 LIMIT 1", [tenantId, customerId]);
    if (!exists.rowCount) throw new HttpError(404, "Customer not found in this Exchange.");
    await c.query(`UPDATE tenant_product_configuration SET configuration=jsonb_set(configuration,'{_customerDirectory}',
      COALESCE(configuration->'_customerDirectory','{}'::jsonb) || jsonb_build_object($2::text,$3::jsonb)),updated_at=now()
      WHERE tenant_id=$1 AND module_key='crypto_exchange'`, [tenantId, customerId, JSON.stringify({ ...input, name: input.name.trim() })]);
    // Do not put names, notes, email addresses or contact hashes in audit logs.
    await audit(c, p, tenantId, "exchange.customer.updated", "Updated tenant-local customer notes or archive state");
    return { ok: true };
  });
}
async function inbox(c: DatabaseClient, tenantId: string) {
  const result = await c.query("SELECT configuration->'_notificationInbox' AS inbox FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId]);
  const state = result.rows[0]?.inbox ?? {};
  const preferences = { orderCreated: state.orderCreated !== false, orderStatusChanged: state.orderStatusChanged !== false };
  const types = [preferences.orderCreated ? "exchange.order.created" : "", preferences.orderStatusChanged ? "exchange.order.status_changed" : ""].filter(Boolean);
  const events = await c.query(`SELECT id,tenant_id AS "tenantId",event_type AS "eventType",description,actor_id AS "actorId",created_at AS "createdAt"
    FROM audit_events WHERE tenant_id=$1 AND event_type=ANY($2::text[]) ORDER BY created_at DESC,id DESC LIMIT 100`, [tenantId, types]);
  return { preferences, readThrough: state.readThrough ?? null, events: events.rows };
}
export function notifications(p: Principal, tenantId: string, raw?: unknown) {
  const input = raw === undefined ? undefined : SaveExchangeNotificationPreferencesBody.parse(raw);
  return withDatabase(contextFor(p, tenantId, !!input, input ? "configuration.manage" : undefined), async c => {
    requireFeature(await resolveEntitlements(c, tenantId), "crypto_exchange");
    if (input) {
      await lockTenant(c, tenantId);
      const { markAllRead, ...preferences } = input;
      await c.query(`UPDATE tenant_product_configuration SET configuration=jsonb_set(configuration,'{_notificationInbox}',
        COALESCE(configuration->'_notificationInbox','{}'::jsonb) || $2::jsonb),updated_at=now()
        WHERE tenant_id=$1 AND module_key='crypto_exchange'`, [tenantId, JSON.stringify({ ...preferences, ...(markAllRead ? { readThrough: new Date().toISOString() } : {}) })]);
    }
    return inbox(c, tenantId);
  });
}
