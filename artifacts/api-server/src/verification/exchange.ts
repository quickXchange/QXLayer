import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, withDatabase } from "@workspace/db";
import type { ExchangeSettings } from "@workspace/api-zod";
import { resolvePrincipal, contextFor } from "../modules/authentication/service";
import { createTenant, saveAssets } from "../modules/tenants/service";
import { savePlan } from "../modules/entitlements/catalog";
import { planFixture } from "./plans";
import { exchangeAudit, exchangeConfiguration, sandboxQuote, sandboxOrder, trackOrder, tenantOrder, tenantOrders, exchangeDashboard, publicExchange } from "../products/exchange/service";
import { calculateQuote } from "../products/exchange/calculation";
import { getSubscription } from "../modules/entitlements/resolver";
import { setTenantOverrides } from "../modules/entitlements/subscriptions";

if (process.env.NODE_ENV === "production") throw new Error("Development-only verification refused in production.");
const suffix = randomUUID().replaceAll("-", "");
const adminId = `user_exchangeVerify${suffix}`, clientId = `user_exchangeClient${suffix}`, staffId = `user_exchangeStaff${suffix}`;
const tenants: string[] = [];
let planId: string | undefined;
const denied = (work: () => Promise<unknown>, status: number | string) => assert.rejects(async () => work(), (e: unknown) => (e as { status?: number; code?: string }).status === status || (e as { code?: string }).code === status);
try {
  await pool.query("INSERT INTO platform_admins (clerk_user_id) VALUES ($1)", [adminId]);
  const admin = await resolvePrincipal(adminId);
  const pf = planFixture("Temporary exchange verification", { website: true, crypto_exchange: true, swap: true, convert: true, buy: true, sell: true });
  pf.entitlements = pf.entitlements.map(e => typeof e.value === "boolean" ? e : { ...e, value: "100" });
  const plan = await savePlan(admin, pf); planId = plan.id;
  const a = await createTenant(admin, { name: "Exchange verification A", slug: `ex-a-${suffix}`, planId });
  const b = await createTenant(admin, { name: "Exchange verification B", slug: `ex-b-${suffix}`, planId });
  tenants.push(a.id, b.id);
  await pool.query("INSERT INTO tenant_memberships (tenant_id,clerk_user_id,role) VALUES ($1,$2,'client_admin'),($1,$3,'staff')", [a.id, clientId, staffId]);
  const client = await resolvePrincipal(clientId), staff = await resolvePrincipal(staffId);
  const pairs = (await pool.query("SELECT DISTINCT ON (asset_id) id,asset_id FROM asset_network_catalog ORDER BY asset_id,id LIMIT 2")).rows;
  assert.equal(pairs.length, 2);
  await saveAssets(client, a.id, pairs.map(p => p.id));
  await saveAssets(admin, b.id, pairs.map(p => p.id));
  const catalog = (await exchangeConfiguration(client, a.id)).catalog;
  const [src, dest] = pairs.map(p => p.id as string), methodId = randomUUID();
  const configuration: ExchangeSettings = {
    enabled: true, defaultAction: "swap", publicNote: "Verification only", fiatCurrency: "USD", fiatPlanRate: "1",
    actions: { swap: true, convert: true, buy: true, sell: true },
    assets: pairs.map((p, i) => ({ assetId: p.asset_id, enabled: true, displayOrder: i, symbol: catalog.find(c => c.assetId === p.asset_id)!.symbol, decimals: 8, logoUrl: null, sandboxPlanRate: "1" })),
    networks: pairs.map(p => ({ assetNetworkId: p.id, enabled: true, available: true, minimum: "0", maximum: "100", fee: "0", information: "Sandbox only" })),
    paymentMethods: [{ id: methodId, label: "Simulated bank transfer", enabled: true, currency: "USD", buy: true, sell: true }],
    routes: (["swap", "convert", "buy", "sell"] as const).map(action => ({ id: randomUUID(), source: action === "buy" ? "fiat:USD" : src, destination: action === "sell" ? "fiat:USD" : dest, action, enabled: true, rate: "2", minimum: "0.01", maximum: "10", feeBps: 0, fixedFee: "0", spreadBps: 0, paymentMethodIds: ["buy", "sell"].includes(action) ? [methodId] : [] })),
  };
  await exchangeConfiguration(client, a.id, configuration);
  const configB = structuredClone(configuration); configB.paymentMethods[0].id = randomUUID();
  for (const r of configB.routes) r.paymentMethodIds = r.paymentMethodIds.length ? [configB.paymentMethods[0].id] : [];
  await denied(() => exchangeConfiguration(admin, b.id, configB), 400);
  for (const r of configB.routes) r.id = randomUUID();
  await exchangeConfiguration(admin, b.id, configB);
  assert.equal((await exchangeConfiguration(client, a.id)).effectiveEnabled, false);
  // Activation is fixture setup, not an alternative production activation API.
  await pool.query("UPDATE tenants SET status='active' WHERE id=ANY($1::uuid[])", [tenants]);
  assert.equal((await publicExchange(a.slug)).actions.length, 4);
  const input = { action: "swap" as const, source: src, destination: dest, amount: "1" };
  const calculated = calculateQuote({ ...configuration, routes: configuration.routes.map(r => ({ ...r, feeBps: 100, spreadBps: 100 })) }, catalog, input);
  assert.equal(calculated.quote.fee, "0.01"); assert.equal(calculated.quote.outputAmount, "1.9602");
  assert.throws(() => calculateQuote(configuration, catalog, { ...input, amount: "0.000000001" }));
  assert.throws(() => calculateQuote({ ...configuration, networks: configuration.networks.map(n => ({ ...n, available: false })) }, catalog, input));
  await denied(() => sandboxQuote(a.slug, { ...input, amount: "0" }), 400);
  await denied(() => sandboxQuote(a.slug, { ...input, amount: "11" }), 400);
  await denied(() => sandboxQuote(a.slug, { ...input, destination: src }), 400);
  await denied(() => sandboxQuote(a.slug, { ...input, action: "buy", source: "fiat:USD" }), 400);
  await denied(() => exchangeConfiguration(staff, a.id, configuration), 403);
  await denied(() => exchangeConfiguration(client, b.id), 403);
  const q = await sandboxQuote(a.slug, input);
  await denied(() => sandboxOrder(b.slug, { quoteToken: q.token, idempotencyKey: randomUUID() }), 404);
  await denied(() => sandboxOrder(a.slug, { quoteToken: `x${q.token.slice(1)}`, idempotencyKey: randomUUID() }), 400);
  const realNow = Date.now;
  try { Date.now = () => realNow() + 91000; await denied(() => sandboxOrder(a.slug, { quoteToken: q.token, idempotencyKey: randomUUID() }), 409); } finally { Date.now = realNow; }
  await exchangeConfiguration(client, a.id, { ...configuration, publicNote: "Updated" });
  await denied(() => sandboxOrder(a.slug, { quoteToken: q.token, idempotencyKey: randomUUID() }), 409);
  await exchangeConfiguration(client, a.id, configuration);
  const fresh = await sandboxQuote(a.slug, input), key = randomUUID();
  const repeated = await Promise.all(Array.from({ length: 5 }, () => sandboxOrder(a.slug, { quoteToken: fresh.token, idempotencyKey: key })));
  assert.equal(new Set(repeated.map(r => r.order.id)).size, 1);
  assert.equal(Number((await getSubscription(client, a.id)).usage.find(u => u.key === "max_monthly_transactions")?.used), 1);
  const created = repeated[0];
  assert.equal((await trackOrder(a.slug, created.order.id, created.trackingToken)).status, "pending");
  await denied(() => trackOrder(b.slug, created.order.id, created.trackingToken), 404);
  await denied(() => trackOrder(a.slug, created.order.id, "invalid"), 404);
  await denied(() => tenantOrder(staff, a.id, created.order.id, { status: "processing", note: "" }), 403);
  await denied(() => tenantOrder(client, a.id, created.order.id, { status: "completed", note: "" }), 409);
  await tenantOrder(client, a.id, created.order.id, { status: "processing", note: "Simulated processing" });
  await tenantOrder(client, a.id, created.order.id, { status: "completed", note: "Simulated completion" });
  await denied(() => tenantOrder(client, a.id, created.order.id, { status: "processing", note: "" }), 409);
  assert.equal((await trackOrder(a.slug, created.order.id, created.trackingToken)).history.length, 3);
  for (const action of ["convert", "buy", "sell"] as const) {
    const quote = await sandboxQuote(a.slug, { action, source: action === "buy" ? "fiat:USD" : src, destination: action === "sell" ? "fiat:USD" : dest, amount: "1", ...(["buy", "sell"].includes(action) ? { paymentMethodId: methodId } : {}) });
    const order = await sandboxOrder(a.slug, { quoteToken: quote.token, idempotencyKey: randomUUID() });
    assert.equal(order.order.outputAmount, "2");
    assert.equal(order.order.action, action);
    if (action !== "convert") await tenantOrder(client, a.id, order.order.id, { status: action === "buy" ? "cancelled" : "failed", note: "Sandbox terminal test" });
  }
  assert.equal((await tenantOrders(client, a.id, { action: "buy" })).total, 1);
  assert.equal((await tenantOrders(client, a.id, { search: created.order.id })).total, 1);
  assert.equal((await exchangeDashboard(client, a.id)).total, 4);
  assert.ok((await exchangeAudit(client, a.id)).events.every(event => event.tenantId === a.id));
  await denied(() => exchangeAudit(client, b.id), 403);
  await denied(() => withDatabase(contextFor(client, a.id, true), c => c.query("INSERT INTO exchange_orders (tenant_id,status) VALUES ($1,'pending')", [b.id])), "42501");
  await withDatabase(contextFor(client, a.id), async c => assert.equal((await c.query("SELECT * FROM exchange_orders WHERE tenant_id=$1", [b.id])).rowCount, 0));
  await setTenantOverrides(admin, a.id, [{ key: "max_monthly_transactions", value: "5", reason: "Verification concurrency ceiling" }]);
  const quotaQuote = await sandboxQuote(a.slug, input);
  const admissions = await Promise.allSettled(Array.from({ length: 3 }, () => sandboxOrder(a.slug, { quoteToken: quotaQuote.token, idempotencyKey: randomUUID() })));
  assert.equal(admissions.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(Number((await getSubscription(client, a.id)).usage.find(u => u.key === "max_monthly_transactions")?.used), 5);
  await denied(() => sandboxQuote(a.slug, input), 409);
  await setTenantOverrides(admin, a.id, [{ key: "swap", value: false, reason: "Verification entitlement denial" }]);
  await denied(() => sandboxQuote(a.slug, input), 403);
  const policies = await pool.query("SELECT count(*)::int AS n FROM pg_policies WHERE tablename='exchange_orders' AND (qual IS NOT NULL OR with_check IS NOT NULL)");
  assert.ok(policies.rows[0].n > 0);
  console.log("PASS: four actions, integer pricing/rounding, route and payment validation, signed/expired/config-changed quotes, tenant RLS/capability isolation, read-only staff, status history and terminal guards, search/dashboard, idempotency and concurrent monthly-quota admission.");
} finally {
  for (const table of ["exchange_orders", "pricing_rules", "audit_events", "tenant_usage_counters", "tenant_payment_methods", "tenant_product_configuration", "tenant_entitlement_overrides", "tenant_subscriptions", "tenant_memberships", "tenant_asset_networks", "tenant_configuration", "tenant_branding", "tenant_domains"]) {
    await pool.query(`DELETE FROM ${table} WHERE tenant_id=ANY($1::uuid[])`, [tenants]);
  }
  await pool.query("DELETE FROM tenants WHERE id=ANY($1::uuid[])", [tenants]);
  if (planId) { await pool.query("DELETE FROM plan_entitlements WHERE plan_id=$1", [planId]); await pool.query("DELETE FROM plans WHERE id=$1", [planId]); }
  await pool.query("DELETE FROM platform_admins WHERE clerk_user_id=$1", [adminId]);
  await pool.end();
}