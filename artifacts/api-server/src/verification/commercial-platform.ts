import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { pool } from "@workspace/db";
import type { Principal } from "../modules/authentication/service";
import { savePlan, saveAddon, deleteCatalogRecord, getPlan } from "../modules/entitlements/catalog";
import { changeTenantPlan, setTenantAddons, setTenantSuspension, updateSubscriptionCommercial } from "../modules/entitlements/subscriptions";
import { getSubscription } from "../modules/entitlements/resolver";
import { customerNotifications, markNotificationsRead } from "../modules/customer/notifications";

if (process.env.NODE_ENV === "production") throw new Error("Development verification only.");
const suffix = randomUUID().slice(0, 8);
const actor = `qa-commercial-${suffix}`;
const op: Principal = { userId: actor, role: "super_admin", memberships: [] };
const tenantId = randomUUID();
const customer: Principal = { userId: `${actor}-customer`, role: "client_admin", memberships: [{ tenantId, role: "client_admin" }] };
const other: Principal = { userId: `${actor}-other`, role: "unassigned", memberships: [] };
const orderIds = [randomUUID(), randomUUID()];
const eventIds = [randomUUID(), randomUUID(), randomUUID()];
const scope = { actor, tenantId, orderIds, eventIds, planIds: [] as string[], addonIds: [] as string[], cleanupStatus: "pending" };
mkdirSync("../../.local", { recursive: true });
mkdirSync("../../reports/commercial-white-label-release", { recursive: true });
const persist = () => writeFileSync("../../.local/commercial-white-label-service-qa.json", JSON.stringify(scope, null, 2));
persist(); // Unique names/actor, fixed tenant/order/event ids before writes; generated catalog ids immediately on return.
const results: string[] = [];
const denied = (f: () => unknown, status: number) => assert.rejects(async () => f(), (e: any) => e.status === status);
const input = { name: `QA commercial ${suffix}`, description: "Disposable verification only", monthlyPrice: null, yearlyPrice: null, setupFee: null,
  currency: "USD", billingLabel: "QA only; no charge", displayOrder: 0, status: "enabled" as const, discountPercent: "10", entitlements: [] };
try {
  const plan = await savePlan(op, input); scope.planIds.push(plan.id); persist();
  assert.equal(plan.pricingConfigured, false); assert.equal(plan.monthlyPrice, null);
  await denied(() => savePlan(op, { ...input, monthlyPrice: "100" }), 400);
  await denied(() => savePlan(customer, input), 403);
  const priced = await savePlan(op, { ...input, monthlyPrice: "100", yearlyPrice: "1000", setupFee: "50" }, plan.id);
  assert.equal(priced.monthlyPrice, "100.00");
  results.push("Plan create/edit supports unconfigured/explicit pricing; mixed pricing and customer writes denied");
  const addon = await saveAddon(op, { name: `QA addon ${suffix}`, description: "", enabled: true, entitlements: [], monthlyPrice: null, yearlyPrice: null, setupFee: null, currency: "USD" });
  scope.addonIds.push(addon.id); persist();
  assert.equal(addon.monthlyPrice, null);
  await saveAddon(op, { ...addon, monthlyPrice: "20", yearlyPrice: "200", setupFee: "10" }, addon.id);
  await pool.query("INSERT INTO tenants(id,name,slug) VALUES($1,$2,$3)", [tenantId, input.name, `qa-commercial-${suffix}`]);
  await changeTenantPlan(op, tenantId, plan.id);
  await setTenantAddons(op, tenantId, [addon.id]);
  const base = await getSubscription(op, tenantId);
  assert.equal(base.recurringEstimate, "110.00");
  const commercial = { billingPeriod: "yearly" as const, discountPercent: "10", operatorNote: "Private operator-only QA note", action: "save" as const, reason: "QA commercial test" };
  assert.equal((await updateSubscriptionCommercial(op, tenantId, commercial)).recurringEstimate, "990.00");
  assert.equal((await getSubscription(customer, tenantId)).operatorNote, "");
  await denied(() => updateSubscriptionCommercial(customer, tenantId, commercial), 403);
  results.push("Plan/add-on assignment and exact recurring estimates; yearly billing, discount and private notes persist");
  await denied(() => deleteCatalogRecord(op, plan.id, "plan"), 409);
  await denied(() => deleteCatalogRecord(op, addon.id, "addon"), 409);
  const cancelled = await updateSubscriptionCommercial(op, tenantId, { ...commercial, action: "cancel" });
  assert.equal(cancelled.status, "cancelled"); assert.equal(cancelled.tenantStatus, "suspended");
  await denied(() => setTenantSuspension(op, tenantId, false, "QA bypass test"), 409);
  const restored = await updateSubscriptionCommercial(op, tenantId, { ...commercial, action: "restore" });
  assert.equal(restored.status, "active"); assert.equal(restored.tenantStatus, "draft");
  assert.equal(restored.discountPercent, "10.00");
  assert.equal(restored.addons[0].id, addon.id);
  results.push("Cancellation suspends access, blocks unsuspend bypass, and explicit restore retains all settings/assignments");
  await pool.query(`INSERT INTO white_label_requests(id,customer_user_id,idempotency_key,configuration)
    VALUES($1,$2,$3,$4::jsonb),($5,$6,$7,$4::jsonb)`, [orderIds[0], customer.userId, randomUUID(), JSON.stringify({ requestedPlanId: plan.id, requestedAddonIds: [addon.id] }), orderIds[1], other.userId, randomUUID()]);
  await pool.query(`INSERT INTO white_label_events(id,request_id,kind,author_user_id,visibility,message,status)
    VALUES($1,$4,'status',$6,'customer','Delivered QA notice','delivered'),
    ($2,$4,'note',$6,'internal','Private QA internal note',NULL),
    ($3,$5,'status',$6,'customer','Other customer notice','reviewing')`, [...eventIds, ...orderIds, actor]);
  const notifications = await customerNotifications(customer);
  assert.equal(notifications.unreadCount, 1); assert.equal(notifications.items.length, 1);
  assert.equal(notifications.outboundConnected, false);
  await markNotificationsRead(customer, [eventIds[1], eventIds[2]]);
  assert.equal((await customerNotifications(customer)).unreadCount, 1);
  await markNotificationsRead(customer, [eventIds[0]]);
  await markNotificationsRead(customer, [eventIds[0]]);
  assert.equal((await customerNotifications(customer)).unreadCount, 0);
  assert.equal((await customerNotifications(other)).unreadCount, 1);
  results.push("Real customer event notifications isolate owners/internal notes; read receipts persist and remain idempotent");
  await setTenantAddons(op, tenantId, []);
  await pool.query("DELETE FROM tenant_subscriptions WHERE tenant_id=$1", [tenantId]);
  await denied(() => deleteCatalogRecord(op, plan.id, "plan"), 409);
  await denied(() => deleteCatalogRecord(op, addon.id, "addon"), 409);
  results.push("Historical order references protect plans and add-ons even without a current subscription");
  await pool.query("DELETE FROM customer_notification_reads WHERE event_id=ANY($1::uuid[])", [eventIds]);
  await pool.query("DELETE FROM white_label_requests WHERE id=ANY($1::uuid[])", [orderIds]);
  await deleteCatalogRecord(op, addon.id, "addon");
  await deleteCatalogRecord(op, plan.id, "plan");
  await denied(() => getPlan(op, plan.id), 404);
  results.push("Unreferenced catalog deletion succeeds, while preserving customers and unrelated configuration");
  const unpriced = await savePlan(op, { ...input, name: `QA unset ${suffix}` });
  scope.planIds.push(unpriced.id); persist();
  const unsetAddon = await saveAddon(op, { ...addon, name: `QA unset addon ${suffix}`, monthlyPrice: "20", yearlyPrice: "200", setupFee: "10" });
  scope.addonIds.push(unsetAddon.id); persist();
  await saveAddon(op, { ...unsetAddon, monthlyPrice: null, yearlyPrice: null, setupFee: null }, unsetAddon.id);
  await changeTenantPlan(op, tenantId, unpriced.id);
  await setTenantAddons(op, tenantId, [unsetAddon.id]);
  assert.equal((await getSubscription(op, tenantId)).recurringEstimate, null);
  results.push("Clearing configured add-on pricing persists nulls; unknown subscription totals never become free");
  writeFileSync("../../reports/commercial-white-label-release/service-verification.json", JSON.stringify(results.map(test => ({ test, result: "PASS" })), null, 2));
  console.info(results.join("\n"));
} finally {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("DELETE FROM customer_notification_reads WHERE event_id=ANY($1::uuid[])", [eventIds]);
    await c.query("DELETE FROM white_label_requests WHERE id=ANY($1::uuid[])", [orderIds]);
    await c.query("DELETE FROM tenant_addons WHERE tenant_id=$1", [tenantId]);
    await c.query("DELETE FROM tenant_subscriptions WHERE tenant_id=$1", [tenantId]);
    await c.query("DELETE FROM audit_events WHERE actor_id=$1 OR tenant_id=$2", [actor, tenantId]);
    await c.query("DELETE FROM tenants WHERE id=$1", [tenantId]);
    await c.query("DELETE FROM addon_entitlements WHERE addon_id=ANY($1::uuid[])", [scope.addonIds]);
    await c.query("DELETE FROM addons WHERE id=ANY($1::uuid[])", [scope.addonIds]);
    await c.query("DELETE FROM plan_entitlements WHERE plan_id=ANY($1::uuid[])", [scope.planIds]);
    await c.query("DELETE FROM plans WHERE id=ANY($1::uuid[])", [scope.planIds]);
    await c.query("COMMIT"); scope.cleanupStatus = "cleaned"; persist();
  } catch (e) { await c.query("ROLLBACK"); throw e; }
  finally { c.release(); await pool.end(); }
}
