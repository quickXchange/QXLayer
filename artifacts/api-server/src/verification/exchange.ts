import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, withDatabase } from "@workspace/db";
import { SaveExchangeConfigurationBody, type ExchangeSettings } from "@workspace/api-zod";
import { resolvePrincipal, contextFor } from "../modules/authentication/service";
import { createTenant, saveAssets } from "../modules/tenants/service";
import { savePlan } from "../modules/entitlements/catalog";
import { planFixture } from "./plans";
import { exchangeAudit, exchangeConfiguration, exchangeCustomers, sandboxQuote, sandboxOrder, trackOrder, tenantOrder, tenantOrders, exchangeDashboard, publicExchange } from "../products/exchange/service";
import { calculateQuote } from "../products/exchange/calculation";
import { getSubscription } from "../modules/entitlements/resolver";
import { setTenantOverrides } from "../modules/entitlements/subscriptions";
import { listResources, setStaffPermissions } from "../modules/entitlements/resources";

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
  const reserved = structuredClone(configuration);
  reserved.paymentMethods[0].reserve = "1234.500000000000000001";
  const savedReserve = await exchangeConfiguration(client, a.id, reserved);
  assert.equal(savedReserve.configuration.paymentMethods[0].reserve, "1234.500000000000000001");
  assert.equal((await exchangeConfiguration(client, a.id)).configuration.paymentMethods[0].reserve, "1234.500000000000000001");
  assert.equal("reserve" in (await publicExchange(a.slug)).paymentMethods[0], false);
  for (const reserve of ["-1", "", "1e3", "0.1234567890123456789", "1234567890123456789", "NaN"]) {
    assert.equal(SaveExchangeConfigurationBody.safeParse({ ...configuration, paymentMethods: [{ ...configuration.paymentMethods[0], reserve }] }).success, false);
  }
  assert.equal(SaveExchangeConfigurationBody.safeParse({ ...configuration, paymentMethods: [{ ...configuration.paymentMethods[0], reserve: "0" }] }).success, true);
  for (const action of ["buy", "sell"] as const) {
    const input = { action, source: action === "buy" ? "fiat:USD" : src, destination: action === "sell" ? "fiat:USD" : dest, amount: "1", paymentMethodId: methodId };
    assert.deepEqual(calculateQuote(reserved, catalog, input), calculateQuote(configuration, catalog, input));
  }
  await exchangeConfiguration(client, a.id, configuration);
  const staffBefore = await listResources(client, a.id, "staff");
  assert.ok(staffBefore.some((s) => s.id === staffId));
  assert.ok(staffBefore.every((s) => s.id !== clientId && s.id !== adminId));
  await setStaffPermissions(client, a.id, staffId, ["configuration.manage"]);
  assert.deepEqual((await listResources(client, a.id, "staff")).find((s) => s.id === staffId)?.permissions, ["configuration.manage"]);
  await denied(() => setStaffPermissions(client, a.id, clientId, []), 404);
  await denied(() => setStaffPermissions(client, a.id, adminId, []), 404);
  await denied(() => setStaffPermissions(client, b.id, staffId, []), 403);
  await denied(() => setStaffPermissions(staff, a.id, staffId, ["configuration.manage"]), 403);
  await denied(() => setStaffPermissions(client, a.id, staffId, ["super_admin"]), 400);
  await setStaffPermissions(client, a.id, staffId, []);
  assert.equal((await resolvePrincipal(adminId)).role, "super_admin");
  assert.equal((await publicExchange(a.slug)).actions.length, 4);
  const input = { action: "swap" as const, source: src, destination: dest, amount: "1" };
  const calculated = calculateQuote({ ...configuration, routes: configuration.routes.map(r => ({ ...r, feeBps: 100, spreadBps: 100 })) }, catalog, input);
  assert.equal(calculated.quote.fee, "0.01"); assert.equal(calculated.quote.outputAmount, "1.9602");
  const paymentPricing = { ...configuration, paymentMethods: configuration.paymentMethods.map(m => ({ ...m, minimum: "0.5", maximum: "10", feeBps: 100, fixedFee: "0.1" })) };
  const buyPrice = calculateQuote(paymentPricing, catalog, { action: "buy", source: "fiat:USD", destination: dest, amount: "1", paymentMethodId: methodId });
  assert.equal(buyPrice.quote.fee, "0.11"); assert.equal(buyPrice.quote.outputAmount, "1.78");
  const sellPrice = calculateQuote(paymentPricing, catalog, { action: "sell", source: src, destination: "fiat:USD", amount: "1", paymentMethodId: methodId });
  assert.equal(sellPrice.quote.destinationFee, "0.12"); assert.equal(sellPrice.quote.outputAmount, "1.88");
  assert.throws(() => calculateQuote(paymentPricing, catalog, { action: "buy", source: "fiat:USD", destination: dest, amount: "0.1", paymentMethodId: methodId }));
  const narrowMethods = { ...paymentPricing, paymentMethods: paymentPricing.paymentMethods.map(m => ({ ...m, maximum: "1.5" })) };
  assert.throws(() => calculateQuote(narrowMethods, catalog, { action: "sell", source: src, destination: "fiat:USD", amount: "1", paymentMethodId: methodId }));
  const providerConfig: ExchangeSettings = { ...configuration,
    providers: [{ providerId: "changenow", enabled: true, label: "Future adapter", endpoint: "https://example.com/api" }],
    routes: configuration.routes.map(r => ({ ...r, providerId: r.action === "convert" ? "changenow" : "manual" })),
    networks: configuration.networks.map(n => ({ ...n, providerId: "node-rpc" })) };
  const providerSaved = await exchangeConfiguration(client, a.id, providerConfig);
  assert.equal(providerSaved.configuration.providers?.[0].providerId, "changenow");
  assert.equal(providerSaved.providerCatalog.filter(p => p.functional).length, 1);
  assert.ok(providerSaved.providerCatalog.every(p => !p.credentialSupport));
  assert.equal((await sandboxQuote(a.slug, input)).sandboxOnly, true);
  await denied(() => exchangeConfiguration(client, a.id, { ...providerConfig, providers: [{ providerId: "unknown", enabled: true }] }), 400);
  await denied(() => exchangeConfiguration(client, a.id, { ...providerConfig, providers: [{ providerId: "quickx", enabled: true, endpoint: "https://example.com?token=dummy" }] }), 400);
  await denied(() => exchangeConfiguration(client, a.id, { ...providerConfig, providers: [{ providerId: "quickx", enabled: true, endpoint: "https://demo:dummy@example.com" }] }), 400);
  await denied(() => exchangeConfiguration(client, a.id, { ...providerConfig, providers: [{ providerId: "quickx", enabled: true, apiKey: "dummy-not-a-credential" }] } as unknown as ExchangeSettings), 400);
  await denied(() => exchangeConfiguration(client, a.id, { ...providerConfig, routes: providerConfig.routes.map(r => ({ ...r, providerId: "node-rpc" })) }), 400);
  await exchangeConfiguration(client, a.id, configuration);
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
  await denied(() => tenantOrder(client, a.id, created.order.id, { status: "cancelled", expectedStatus: "pending", note: "Stale review must not apply" }), 409);
  assert.equal((await tenantOrder(client, a.id, created.order.id)).status, "processing");
  assert.equal((await tenantOrder(client, a.id, created.order.id)).history.length, 2);
  await tenantOrder(client, a.id, created.order.id, { status: "completed", expectedStatus: "processing", note: "Simulated completion" });
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
  assert.equal((await exchangeDashboard(client, a.id)).customers, 0);
  assert.equal((await exchangeDashboard(client, a.id)).paymentMethods, 1);
  const today = new Date().toISOString().slice(0, 10);
  assert.equal((await tenantOrders(client, a.id, { from: today, to: today, customer: "anonymous" })).total, 4);
  assert.equal((await tenantOrders(client, a.id, { to: "2000-01-01" })).total, 0);
  await denied(() => tenantOrders(client, a.id, { from: "2026-02-30" }), 400);
  await denied(() => tenantOrders(client, a.id, { from: "2026-12-01", to: "2026-01-01" }), 400);
  await denied(() => tenantOrders(client, a.id, { customer: "another-tenant-customer" }), 400);
  const customers = await exchangeCustomers(client, a.id);
  assert.equal(customers.length, 1); assert.equal(customers[0].orders, 4); assert.equal(customers[0].email, null);
  await denied(() => exchangeCustomers(client, b.id), 403);
  const orderDetails = await tenantOrder(client, a.id, created.order.id);
  assert.equal(orderDetails.customerName, null); assert.equal(orderDetails.customerEmail, null);
  assert.ok(new Date(orderDetails.updatedAt!).getTime() >= new Date(orderDetails.createdAt).getTime());
  assert.ok((await exchangeAudit(client, a.id)).events.every(event => event.tenantId === a.id));
  await denied(() => exchangeAudit(client, b.id), 403);
  await denied(() => tenantOrders(client, b.id, {}), 403);
  await setTenantOverrides(admin, a.id, [{ key: "max_monthly_transactions", value: "5", reason: "Verification concurrency ceiling" }]);
  const quotaQuote = await sandboxQuote(a.slug, input);
  const admissions = await Promise.allSettled(Array.from({ length: 3 }, () => sandboxOrder(a.slug, { quoteToken: quotaQuote.token, idempotencyKey: randomUUID() })));
  assert.equal(admissions.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(Number((await getSubscription(client, a.id)).usage.find(u => u.key === "max_monthly_transactions")?.used), 5);
  await denied(() => sandboxQuote(a.slug, input), 409);
  await setTenantOverrides(admin, a.id, [{ key: "swap", value: false, reason: "Verification entitlement denial" }]);
  await denied(() => sandboxQuote(a.slug, input), 403);
  console.log("PASS: four actions, integer pricing/rounding, fiat payment fees/limits, reserve persistence/validation/privacy and quote invariance, protected Owner/Admin and tenant-scoped staff grants, configuration-only provider catalog/assignments, credential rejection, customer privacy/date filters, route/payment validation, signed/expired/config-changed quotes, tenant isolation, read-only staff, reviewed-status conflicts and terminal guards, audited bulk configuration, dashboard, idempotency and concurrent monthly-quota admission.");
} finally {
  for (const table of ["exchange_orders", "pricing_rules", "audit_events", "tenant_usage_counters", "tenant_payment_methods", "tenant_product_configuration", "tenant_entitlement_overrides", "tenant_subscriptions", "tenant_memberships", "tenant_asset_networks", "tenant_configuration", "tenant_branding", "tenant_domains"]) {
    await pool.query(`DELETE FROM ${table} WHERE tenant_id=ANY($1::uuid[])`, [tenants]);
  }
  await pool.query("DELETE FROM tenants WHERE id=ANY($1::uuid[])", [tenants]);
  if (planId) { await pool.query("DELETE FROM plan_entitlements WHERE plan_id=$1", [planId]); await pool.query("DELETE FROM plans WHERE id=$1", [planId]); }
  await pool.query("DELETE FROM platform_admins WHERE clerk_user_id=$1", [adminId]);
  await pool.end();
}