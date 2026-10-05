import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { resolvePrincipal } from "../modules/authentication/service";
import { createTenant, saveAssets } from "../modules/tenants/service";
import { savePlan } from "../modules/entitlements/catalog";
import { planFixture } from "./plans";
import { demoIdentity } from "../modules/demo/session";
import { exchangeConfiguration, sandboxQuote, sandboxOrder } from "../products/exchange/service";

// Disposable UI verification only; never alter a delivered tenant or real user's grants.
if (process.env.NODE_ENV !== "development") throw new Error("Development-only UI fixture.");
const mode = process.argv[2];
try {
  if (mode === "create") {
    const actor = `user_exchangeUi_${randomUUID().replaceAll("-", "")}`;
    await pool.query("INSERT INTO platform_admins (clerk_user_id) VALUES ($1)", [actor]);
    const admin = await resolvePrincipal(actor);
    const demo = await demoIdentity();
    const source = await exchangeConfiguration(demo, demo.memberships[0].tenantId);
    const pf = planFixture(`Exchange UI verification ${randomUUID().slice(0, 8)}`, { website: true, crypto_exchange: true, swap: true, convert: true, buy: true, sell: true });
    pf.entitlements = pf.entitlements.map(e => typeof e.value === "boolean" ? e : { ...e, value: e.key === "max_monthly_volume" ? "1000000" : "1000" });
    const plan = await savePlan(admin, pf);
    const tenant = await createTenant(admin, { name: "Temporary Exchange UI verification", slug: `exchange-ui-${randomUUID().slice(0, 8)}`, planId: plan.id });
    await saveAssets(admin, tenant.id, source.catalog.map(c => c.assetNetworkId));
    const settings = structuredClone(source.configuration);
    const methodIds = new Map(settings.paymentMethods.map(p => [p.id, randomUUID()]));
    settings.paymentMethods = settings.paymentMethods.map(p => ({ ...p, id: methodIds.get(p.id)! }));
    settings.routes = settings.routes.map(r => ({ ...r, id: randomUUID(), paymentMethodIds: r.paymentMethodIds.map(id => methodIds.get(id)!) }));
    await exchangeConfiguration(admin, tenant.id, settings);
    await pool.query("UPDATE tenants SET status='active',completed_steps=array_append(completed_steps,'exchange_provisioned') WHERE id=$1", [tenant.id]);
    for (const action of ["swap", "convert", "buy", "sell"] as const) {
      const route = settings.routes.find(r => r.action === action && r.enabled)!;
      const quote = await sandboxQuote(tenant.slug, { action, source: route.source, destination: route.destination,
        amount: action === "buy" ? "250" : action === "convert" ? "300" : "0.025",
        ...(route.paymentMethodIds.length ? { paymentMethodId: route.paymentMethodIds[0] } : {}) });
      await sandboxOrder(tenant.slug, { quoteToken: quote.token, idempotencyKey: randomUUID() });
    }
    console.log(JSON.stringify({ tenantId: tenant.id, planId: plan.id, actor, slug: tenant.slug }));
  } else if (mode === "grant") {
    const [tenantId, userId] = process.argv.slice(3);
    const found = await pool.query("SELECT id FROM tenants WHERE id=$1 AND slug LIKE 'exchange-ui-%' AND name='Temporary Exchange UI verification'", [tenantId]);
    if (found.rowCount !== 1 || !userId?.startsWith("user_")) throw new Error("Refused non-fixture grant.");
    await pool.query("UPDATE tenants SET completed_steps=array_append(completed_steps,'exchange_provisioned') WHERE id=$1 AND NOT ('exchange_provisioned'=ANY(completed_steps))", [tenantId]);
    await pool.query("INSERT INTO tenant_memberships (tenant_id,clerk_user_id,role) VALUES ($1,$2,'client_admin') ON CONFLICT (tenant_id,clerk_user_id) DO UPDATE SET role='client_admin',active=true", [tenantId, userId]);
    console.log("Temporary tenant access granted.");
  } else if (mode === "cleanup") {
    const [tenantId, planId, actor] = process.argv.slice(3);
    const found = await pool.query("SELECT t.id FROM tenants t JOIN plans p ON p.id=$2 WHERE t.id=$1 AND t.slug LIKE 'exchange-ui-%' AND t.name='Temporary Exchange UI verification' AND p.name LIKE 'Exchange UI verification %'", [tenantId, planId]);
    if (found.rowCount !== 1 || !actor?.startsWith("user_exchangeUi_")) throw new Error("Refused non-fixture cleanup.");
    for (const table of ["exchange_orders", "pricing_rules", "audit_events", "tenant_usage_counters", "tenant_payment_methods", "tenant_product_configuration", "tenant_entitlement_overrides", "tenant_subscriptions", "tenant_memberships", "tenant_asset_networks", "tenant_configuration", "tenant_branding", "tenant_domains"]) {
      await pool.query(`DELETE FROM ${table} WHERE tenant_id=$1`, [tenantId]);
    }
    await pool.query("DELETE FROM tenants WHERE id=$1", [tenantId]);
    await pool.query("DELETE FROM plan_entitlements WHERE plan_id=$1", [planId]);
    await pool.query("DELETE FROM plans WHERE id=$1", [planId]);
    await pool.query("DELETE FROM platform_admins WHERE clerk_user_id=$1", [actor]);
    console.log("Temporary UI fixture removed.");
  } else throw new Error("Use create, grant or cleanup.");
} finally {
  await pool.end();
}
