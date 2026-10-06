import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import type { Principal } from "../modules/authentication/service";
import { createTenant, saveAssets, saveBrand, saveDomain, saveWebsiteSettings, activateTenant } from "../modules/tenants/service";
import { exchangeConfiguration } from "../products/exchange/service";
import { savePlan } from "../modules/entitlements/catalog";
import { planFixture } from "./plans";
import { websiteSettings } from "../modules/website/settings";

export async function finishCustomerTenant(admin: Principal, t: { id: string; name: string }, base: Awaited<ReturnType<typeof exchangeConfiguration>>["configuration"]) {
  await saveBrand(admin, t.id, { brandName: t.name, logoUrl: null, primaryColor: "#102C36", accentColor: "#44D7C4", themeMode: "system", defaultLanguage: "en", supportedLanguages: ["en"] });
  await saveDomain(admin, t.id, null);
  await saveAssets(admin, t.id, base.networks.map(n => n.assetNetworkId));
  const config = structuredClone(base);
  const map = new Map(config.paymentMethods.map(m => [m.id, randomUUID()]));
  config.paymentMethods.forEach(m => { m.id = map.get(m.id)!; });
  config.routes.forEach(r => { r.id = randomUUID(); r.paymentMethodIds = r.paymentMethodIds.map(id => map.get(id)!); });
  await exchangeConfiguration(admin, t.id, config);
  await saveWebsiteSettings(admin, t.id, websiteSettings(t.name, {}));
}

export async function prepareCustomerFixtures(admin: Principal, suffix = randomUUID().slice(0, 8)) {
  if (process.env.NODE_ENV === "production") throw new Error("Development-only fixtures refused in production.");
  const source = (await pool.query("SELECT id FROM tenants WHERE slug='exchange-sandbox'")).rows[0];
  if (!source) throw new Error("The existing Exchange sandbox demonstration is required for these isolated development fixtures.");
  const base = (await exchangeConfiguration(admin, source.id)).configuration;
  const pf = planFixture(`Customer workflow verification ${suffix}`, { website: true, crypto_exchange: true, swap: true, convert: true, buy: true, sell: true, merchant_api: true, api_keys: true });
  pf.entitlements = pf.entitlements.map(e => typeof e.value === "boolean" ? e : { ...e, value: "1000000" });
  const plan = await savePlan(admin, pf);
  const tenants = [];
  for (const label of ["A", "B"]) {
    const t = await createTenant(admin, { name: `Workflow verification ${label} ${suffix}`, slug: `workflow-${label.toLowerCase()}-${suffix}`, planId: plan.id });
    tenants.push(t);
    await finishCustomerTenant(admin, t, base);
    await activateTenant(admin, t.id);
  }
  return { tenants, planId: plan.id, base };
}
export async function cleanCustomerFixtures(tenantIds: string[], planId: string, actors: string[]) {
  await pool.query("DELETE FROM white_label_requests WHERE customer_user_id=ANY($1::text[]) OR tenant_id=ANY($2::uuid[])", [actors, tenantIds]);
  for (const table of ["exchange_orders", "pricing_rules", "audit_events", "tenant_usage_counters", "tenant_payment_methods", "tenant_product_configuration", "tenant_entitlement_overrides", "tenant_subscriptions", "tenant_memberships", "tenant_asset_networks", "tenant_configuration", "tenant_branding", "tenant_domains"]) await pool.query(`DELETE FROM ${table} WHERE tenant_id=ANY($1::uuid[])`, [tenantIds]);
  await pool.query("DELETE FROM tenants WHERE id=ANY($1::uuid[])", [tenantIds]);
  await pool.query("DELETE FROM plan_entitlements WHERE plan_id=$1", [planId]);
  await pool.query("DELETE FROM plans WHERE id=$1", [planId]);
  await pool.query("DELETE FROM audit_events WHERE actor_id=ANY($1::text[])", [actors]);
  await pool.query("DELETE FROM platform_admins WHERE clerk_user_id=ANY($1::text[])", [actors]);
}