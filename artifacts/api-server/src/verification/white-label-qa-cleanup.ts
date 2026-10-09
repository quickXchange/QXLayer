import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { pool } from "@workspace/db";

export interface QaScope { actors: string[]; orderIds: string[]; planId?: string; developmentOnly?: boolean; cleaned?: boolean }
export async function cleanupServiceQa(scope: QaScope) {
  assert.equal(process.env.NODE_ENV, "test", "Disposable Development cleanup only.");
  assert(scope.actors.length === 3 && scope.actors.every(a => /^qa_wl_(?:owner|customer|other)_[a-f0-9]{12}$/.test(a)));
  assert(scope.orderIds.every(id => /^[a-f0-9-]{36}$/.test(id)));
  assert(!scope.planId || /^[a-f0-9-]{36}$/.test(scope.planId));
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const orders = await c.query("SELECT id,customer_user_id FROM white_label_requests WHERE id=ANY($1::uuid[]) FOR UPDATE", [scope.orderIds]);
    assert(orders.rows.every(r => scope.actors.includes(r.customer_user_id)), "Order identity differs from disposable scope.");
    const t = await c.query("SELECT id FROM tenants WHERE slug=ANY($1::text[])", [scope.orderIds.map(id => `wl-${id}`)]);
    const tenantIds = t.rows.map(r => r.id);
    await c.query("DELETE FROM white_label_events WHERE request_id=ANY($1::uuid[])", [scope.orderIds]);
    await c.query("DELETE FROM white_label_requests WHERE id=ANY($1::uuid[]) AND customer_user_id=ANY($2::text[])", [scope.orderIds, scope.actors]);
    for (const table of ["exchange_orders", "pricing_rules", "audit_events", "tenant_usage_counters",
      "tenant_payment_methods", "tenant_product_configuration", "tenant_entitlement_overrides",
      "tenant_addons", "tenant_subscriptions", "tenant_memberships", "tenant_asset_networks",
      "tenant_configuration", "tenant_branding", "tenant_domains"]) {
      await c.query(`DELETE FROM ${table} WHERE tenant_id=ANY($1::uuid[])`, [tenantIds]);
    }
    await c.query("DELETE FROM tenants WHERE id=ANY($1::uuid[])", [tenantIds]);
    if (scope.planId) {
      await c.query("DELETE FROM plan_entitlements WHERE plan_id=$1", [scope.planId]);
      await c.query("DELETE FROM plans WHERE id=$1", [scope.planId]);
    }
    await c.query("DELETE FROM audit_events WHERE actor_id=ANY($1::text[])", [scope.actors]);
    await c.query("DELETE FROM platform_admins WHERE clerk_user_id=$1", [scope.actors[0]]);
    await c.query("COMMIT");
    writeFileSync(".local/white-label-platform-service-qa.json", JSON.stringify({ ...scope, cleaned: true }, null, 2));
  } catch (error) { await c.query("ROLLBACK"); throw error; }
  finally { c.release(); }
}
if (process.argv.includes("--execute-disposable-cleanup")) {
  try {
    const scope = JSON.parse(readFileSync(".local/white-label-platform-service-qa.json", "utf8")) as QaScope;
    assert(scope.developmentOnly === true);
    await cleanupServiceQa(scope);
    console.log("Disposable Development service fixtures removed atomically; existing fixtures untouched.");
  } finally { await pool.end(); }
}
