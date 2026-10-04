import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, withDatabase } from "@workspace/db";
import { GetTenantResponse } from "@workspace/api-zod";
import { resolvePrincipal, contextFor } from "../modules/authentication/service";
import { createTenant, getTenant, listTenants, saveAssets, saveBrand, saveConfiguration, saveDomain, saveModules, activateTenant } from "../modules/tenants/service";
import { requireEntitlement } from "../modules/entitlements/service";
import { getBlockchainProvider } from "../modules/blockchain";
import { savePlan } from "../modules/entitlements/catalog";
import { planFixture, verifyPlans } from "./plans";
import { verifyCore } from "./core";

if (process.env.NODE_ENV === "production") throw new Error("Development verification refused in production.");
const suffix = randomUUID().replaceAll("-", "");
const adminId = `user_verifyAdmin${suffix}`;
const clientId = `user_verifyClient${suffix}`;
const staffId = `user_verifyStaff${suffix}`;
const tenantIds: string[] = [];
const planIds: string[] = [];
const addonIds: string[] = [];

async function expectDenied(work: () => Promise<unknown>, code?: string | number) {
  await assert.rejects(async () => work(), (e: unknown) => {
    const error = e as { code?: string; status?: number };
    return code === undefined || error.code === code || error.status === code;
  });
}

try {
  await pool.query("INSERT INTO platform_admins (clerk_user_id) VALUES ($1)", [adminId]);
  const admin = await resolvePrincipal(adminId);
  assert.equal(admin.role, "super_admin");
  const pa = await savePlan(admin, planFixture("Verification Plan A", { website: true, crypto_payments: true }));
  planIds.push(pa.id);
  const pb = await savePlan(admin, planFixture("Verification Plan B", { website: true, crypto_exchange: true, crypto_payments: true, merchant_api: true, api_keys: true, webhooks: true, convert: true }));
  planIds.push(pb.id);
  const a = GetTenantResponse.parse(await createTenant(admin, { name: "Verification A", slug: `verify-a-${suffix}`, planId: pa.id }));
  tenantIds.push(a.id);
  const b = GetTenantResponse.parse(await createTenant(admin, { name: "Verification B", slug: `verify-b-${suffix}`, planId: pb.id }));
  tenantIds.push(b.id);
  await pool.query("INSERT INTO tenant_memberships (tenant_id,clerk_user_id,role) VALUES ($1,$2,'client_admin'),($1,$3,'staff')", [a.id, clientId, staffId]);
  const clientAdmin = await resolvePrincipal(clientId);
  const staff = await resolvePrincipal(staffId);
  const unknown = await resolvePrincipal(`user_unassigned${suffix}`);
  assert.equal(unknown.role, "unassigned");
  await expectDenied(() => listTenants(unknown), 403);
  await expectDenied(() => createTenant(clientAdmin, { name: "Denied", slug: "denied", planId: pa.id }), 403);
  await expectDenied(() => getTenant(clientAdmin, b.id), 403);
  assert.deepEqual((await listTenants(clientAdmin)).map((t) => t.id), [a.id]);
  await expectDenied(() => saveDomain(staff, a.id, null), 403);
  await expectDenied(() => saveModules(clientAdmin, a.id, ["website"]), 403);
  await expectDenied(() => activateTenant(admin, a.id), 400);

  await saveBrand(clientAdmin, a.id, {
    brandName: "Verification Brand", logoUrl: null, primaryColor: "#0F766E", accentColor: "#14B8A6",
    themeMode: "dark", defaultLanguage: "en", supportedLanguages: ["en", "fr"],
  });
  await saveDomain(clientAdmin, a.id, `verify-${suffix}.example`);
  await expectDenied(() => saveModules(admin, a.id, ["crypto_payments", "website"]), 409);
  await saveAssets(clientAdmin, a.id, ["eth:ethereum-sepolia"]);
  await expectDenied(() => saveAssets(clientAdmin, a.id, ["eth:mainnet"]), 400);
  await expectDenied(() => saveConfiguration(clientAdmin, a.id, { environment: "sandbox", exchangeEnabled: true, paymentsEnabled: true, allowGuestCheckout: true }), 403);
  await saveConfiguration(clientAdmin, a.id, { environment: "sandbox", exchangeEnabled: false, paymentsEnabled: true, allowGuestCheckout: true });
  const active = GetTenantResponse.parse(await activateTenant(clientAdmin, a.id));
  assert.equal(active.status, "active");
  assert.equal(active.environment, "sandbox");
  assert.equal(active.configurationComplete, true);
  assert.equal((await getTenant(admin, b.id)).enabledModules.includes("merchant_api"), true);
  await requireEntitlement(clientAdmin, a.id, "crypto_payments");
  await expectDenied(() => requireEntitlement(clientAdmin, a.id, "merchant_api"), 403);

  await withDatabase(contextFor(clientAdmin, a.id, true), async (db) => {
    const role = await db.query("SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user");
    assert.equal(role.rows[0].current_user, "private_label_runtime");
    assert.equal(role.rows[0].rolsuper, false);
    assert.equal(role.rows[0].rolbypassrls, false);
    assert.equal((await db.query("SELECT tenant_id FROM tenant_branding WHERE tenant_id=$1", [b.id])).rowCount, 0);
    assert.equal((await db.query("UPDATE tenant_branding SET brand_name='not allowed' WHERE tenant_id=$1", [b.id])).rowCount, 0);
    assert.equal((await db.query("DELETE FROM tenant_modules WHERE tenant_id=$1", [a.id])).rowCount, 0);
  });
  await expectDenied(() => withDatabase(contextFor(clientAdmin, a.id, true), (db) => db.query("INSERT INTO tenant_domains (tenant_id,domain) VALUES ($1,$2)", [b.id, `denied-${suffix}.example`])), "42501");
  await expectDenied(() => withDatabase(contextFor(clientAdmin, a.id, true), (db) => db.query("INSERT INTO platform_admins (clerk_user_id) VALUES ($1)", [clientId])), "42501");
  await withDatabase({ actorId: clientId }, async (db) => {
    assert.equal((await db.query("SELECT id FROM tenants")).rowCount, 0);
    assert.equal((await db.query("SELECT tenant_id FROM tenant_branding")).rowCount, 0);
  });
  const pricing = await pool.query("INSERT INTO pricing_rules (tenant_id,name) VALUES ($1,'Verification') RETURNING id", [b.id]);
  await expectDenied(() => withDatabase(contextFor(clientAdmin, a.id, true), (db) => db.query(
    "INSERT INTO exchange_orders (tenant_id,pricing_rule_id) VALUES ($1,$2)", [a.id, pricing.rows[0].id],
  )), "23503");
  await expectDenied(() => withDatabase(contextFor(clientAdmin, a.id, true), (db) => db.query("INSERT INTO payment_invoices (tenant_id,amount,currency,environment) VALUES ($1,1,'ETH','live')", [a.id])), "23514");
  await expectDenied(() => withDatabase(contextFor(clientAdmin, a.id, true), (db) => db.query("INSERT INTO wallet_configurations (tenant_id,asset_network_id,strategy) VALUES ($1,$2,'hot_wallet')", [a.id, "eth:ethereum-sepolia"])), "23514");
  await expectDenied(async () => getBlockchainProvider("live"), 501);
  assert.deepEqual(await getBlockchainProvider("sandbox").health(), { status: "not_connected", sandbox: true });
  const policies = await pool.query("SELECT count(*)::int AS total FROM pg_class WHERE relname = ANY($1::text[]) AND relrowsecurity AND relforcerowsecurity", [[
    "tenants", "platform_admins", "tenant_memberships", "tenant_branding", "tenant_domains", "tenant_modules",
    "tenant_asset_networks", "tenant_configuration", "pricing_rules", "exchange_orders", "payment_invoices",
    "wallet_configurations", "blockchain_provider_configs", "api_keys", "webhook_endpoints", "notification_events", "audit_events",
  ]]);
  assert.equal(policies.rows[0].total, 17);
  await verifyPlans({ admin, clientAdmin, a, b, pa, pb, suffix, planIds, addonIds });
  await verifyCore({ admin, clientAdmin, staffId, aId: a.id, bId: b.id, suffix });
  process.stdout.write("PASS: foundation provisioning, role permissions, effective entitlements, RLS cross-tenant reads/writes, no-context isolation, non-bypass runtime role, composite foreign keys, sandbox constraints.\n");
} finally {
  // Only this run's fixtures are removed, never user-created client records.
  for (const table of ["tenant_product_configuration", "audit_events", "tenant_usage_counters", "tenant_entitlement_overrides", "tenant_addons", "tenant_subscriptions", "tenant_payment_methods", "api_keys", "webhook_endpoints", "exchange_orders", "payment_invoices", "wallet_configurations", "pricing_rules", "tenant_asset_networks", "tenant_modules", "tenant_domains", "tenant_configuration", "tenant_branding", "tenant_memberships"]) {
    await pool.query(`DELETE FROM ${table} WHERE tenant_id = ANY($1::uuid[])`, [tenantIds]);
  }
  await pool.query("DELETE FROM tenants WHERE id = ANY($1::uuid[])", [tenantIds]);
  await pool.query("DELETE FROM platform_admins WHERE clerk_user_id=$1", [adminId]);
  await pool.query("DELETE FROM audit_events WHERE actor_id=$1", [adminId]);
  await pool.query("DELETE FROM plan_entitlements WHERE plan_id=ANY($1::uuid[])", [planIds]);
  await pool.query("DELETE FROM plans WHERE id=ANY($1::uuid[])", [planIds]);
  await pool.query("DELETE FROM addon_entitlements WHERE addon_id=ANY($1::uuid[])", [addonIds]);
  await pool.query("DELETE FROM addons WHERE id=ANY($1::uuid[])", [addonIds]);
  await pool.query("DELETE FROM entitlement_definitions WHERE key=$1", [`future_feature_${suffix}`]);
  await pool.end();
}