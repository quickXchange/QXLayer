import { withDatabase } from "@workspace/db";
import { SetTenantOverridesBody } from "@workspace/api-zod";
import type { z } from "zod";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { contextFor, requireSuperAdmin, type Principal } from "../authentication/service";
import { readAddon, readPlan, validateEntries } from "./catalog";
import { lockTenant, resolveEntitlements } from "./resolver";

export function changeTenantPlan(principal: Principal, tenantId: string, planId: string) {
  requireSuperAdmin(principal);
  return withDatabase(contextFor(principal, tenantId, true), async (client) => {
    await lockTenant(client, tenantId);
    const before = await resolveEntitlements(client, tenantId);
    const plan = await readPlan(client, planId);
    if (plan.status !== "enabled" && before.plan?.id !== planId) throw new HttpError(400, "Only enabled plans can receive new assignments.");
    await client.query(
      "INSERT INTO tenant_subscriptions (tenant_id,plan_id,status) VALUES ($1,$2,$3) ON CONFLICT (tenant_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,updated_at=now()",
      [tenantId, planId, before.tenantStatus === "suspended" ? "suspended" : "active"],
    );
    await client.query("UPDATE tenants SET completed_steps=ARRAY(SELECT DISTINCT unnest(completed_steps || ARRAY['modules']::text[])),updated_at=now() WHERE id=$1", [tenantId]);
    const after = await resolveEntitlements(client, tenantId);
    await audit(client, principal, tenantId, "subscription.plan_changed", `Assigned plan ${plan.name}; no billing performed`, { before: before.plan?.id ?? null, after: planId, overridesRetained: true, overLimit: after.overLimit });
    return after;
  });
}
export function setTenantAddons(principal: Principal, tenantId: string, ids: string[]) {
  requireSuperAdmin(principal);
  return withDatabase(contextFor(principal, tenantId, true), async (client) => {
    await lockTenant(client, tenantId);
    const before = await resolveEntitlements(client, tenantId);
    if (!before.plan) throw new HttpError(400, "Assign a plan before adding add-ons.");
    const unique = [...new Set(ids)];
    for (const id of unique) {
      const addon = await readAddon(client, id);
      if (!addon.enabled && !before.addons.some((a) => a.id === id)) throw new HttpError(400, "A disabled add-on cannot receive new assignments.");
    }
    await client.query("DELETE FROM tenant_addons WHERE tenant_id=$1", [tenantId]);
    for (const id of unique) await client.query("INSERT INTO tenant_addons (tenant_id,addon_id) VALUES ($1,$2)", [tenantId, id]);
    const after = await resolveEntitlements(client, tenantId);
    await audit(client, principal, tenantId, "subscription.addons_changed", "Updated tenant add-on assignments", { before: before.addons.map((a) => a.id), after: unique, overLimit: after.overLimit });
    return after;
  });
}
export function setTenantOverrides(principal: Principal, tenantId: string, overrides: z.infer<typeof SetTenantOverridesBody>["overrides"]) {
  requireSuperAdmin(principal);
  if (overrides.some((o) => o.reason.trim().length < 2)) throw new HttpError(400, "Every override needs a non-empty reason.");
  return withDatabase(contextFor(principal, tenantId, true), async (client) => {
    await lockTenant(client, tenantId);
    const before = await resolveEntitlements(client, tenantId);
    if (!before.plan) throw new HttpError(400, "Assign a plan before applying overrides.");
    const entries = await validateEntries(client, overrides);
    await client.query("DELETE FROM tenant_entitlement_overrides WHERE tenant_id=$1", [tenantId]);
    for (let i = 0; i < entries.length; i++) await client.query(
      "INSERT INTO tenant_entitlement_overrides (tenant_id,key,value,reason) VALUES ($1,$2,$3::jsonb,$4)",
      [tenantId, entries[i].key, JSON.stringify(entries[i].value), overrides[i].reason.trim()],
    );
    const after = await resolveEntitlements(client, tenantId);
    await audit(client, principal, tenantId, "subscription.overrides_changed", "Replaced tenant-only feature/limit overrides", { before: before.overrides, after: after.overrides, overLimit: after.overLimit });
    return after;
  });
}
export function setTenantSuspension(principal: Principal, tenantId: string, suspended: boolean, reason: string) {
  requireSuperAdmin(principal);
  if (reason.trim().length < 2) throw new HttpError(400, "Suspension changes need a non-empty reason.");
  return withDatabase(contextFor(principal, tenantId, true), async (client) => {
    await lockTenant(client, tenantId);
    const before = await resolveEntitlements(client, tenantId);
    if (suspended && before.tenantStatus !== "suspended") {
      await client.query("UPDATE tenant_subscriptions SET resume_status=$2,status='suspended',updated_at=now() WHERE tenant_id=$1", [tenantId, before.tenantStatus]);
      await client.query("UPDATE tenants SET status='suspended',updated_at=now() WHERE id=$1", [tenantId]);
    } else if (!suspended && before.tenantStatus === "suspended") {
      const previous = await client.query("SELECT resume_status FROM tenant_subscriptions WHERE tenant_id=$1", [tenantId]);
      await client.query("UPDATE tenants SET status=$2,updated_at=now() WHERE id=$1", [tenantId, previous.rows[0]?.resume_status ?? "draft"]);
      await client.query("UPDATE tenant_subscriptions SET status='active',updated_at=now() WHERE tenant_id=$1", [tenantId]);
    }
    const after = await resolveEntitlements(client, tenantId);
    await audit(client, principal, tenantId, suspended ? "tenant.suspended" : "tenant.unsuspended", reason.trim(), { before: before.tenantStatus, after: after.tenantStatus });
    return after;
  });
}