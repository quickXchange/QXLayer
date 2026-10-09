import type { DatabaseClient } from "@workspace/db";
import { requireSuperAdmin, type Principal } from "../authentication/service";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { requireFeature, resolveEntitlements } from "../entitlements/resolver";
import { prepareTenant } from "../tenants/service";
import { applyOrderBranding } from "./order-branding";
import { assertFinalPricing, requestColumns, orderView, event } from "./order-model";
import type { catalogSelection } from "./order-catalog";

/** Caller holds the request row lock. Tenant + master + linkage commit together. */
export async function prepareReviewedWebsite(c: DatabaseClient, p: Principal, row: Record<string, any>,
  selection: Awaited<ReturnType<typeof catalogSelection>>) {
  requireSuperAdmin(p);
  assertFinalPricing(row);
  if (!selection.plan) throw new HttpError(409, "Select a White Label Exchange plan before preparing this order.");
  if (row.tenantId) return orderView(c, row); // Never replace an existing customer's settings.
  const tenant = await prepareTenant(c, p, {
    name: row.configuration.brandName, slug: `wl-${row.id}`, planId: selection.plan.id,
  }, selection.addons.map(a => a.id));
  const effective = await resolveEntitlements(c, tenant.id);
  requireFeature(effective, "website"); requireFeature(effective, "crypto_exchange");
  for (const action of row.configuration.actions as string[]) requireFeature(effective, action);
  const status = row.configuration.design?.type === "custom" ? "customization" : "in_setup";
  await applyOrderBranding(c, tenant.id, tenant.slug, row as { id: string; configuration: Record<string, any> });
  const prepared = await c.query(`UPDATE white_label_requests SET tenant_id=$2,status=$3,updated_at=now()
    WHERE id=$1 RETURNING ${requestColumns}`, [row.id, tenant.id, status]);
  await event(c, p, row.id, "status", "Admin approved your request and prepared your separate NovaX-master sandbox website. Setup is in progress; website and Admin Panel remain private until delivery.", "customer", status);
  await audit(c, p, tenant.id, "white_label.request.prepared", "Prepared isolated NovaX-master Exchange; access not granted", { requestId: row.id });
  return orderView(c, prepared.rows[0]);
}
