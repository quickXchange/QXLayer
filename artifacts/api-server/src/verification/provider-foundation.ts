import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "@workspace/db";
import { clerkClient } from "@clerk/express";
import { resolvePrincipal } from "../modules/authentication/service";
import { prepareCustomerFixtures, cleanCustomerFixtures } from "./customer-fixtures";
import { saveProviderDefinition } from "../modules/providers/catalog";
import { createProviderAssignment, updateProviderAssignment, removeProviderAssignment } from "../modules/providers/assignments";
import { providerFoundation } from "../modules/providers/read";
import { saveProviderPolicy, removeProviderPolicy, resolveFutureProviderSelection } from "../modules/providers/routing";
import { exchangeConfiguration, sandboxQuote } from "../products/exchange/service";
import type { ProviderDefinitionInput } from "@workspace/api-zod";

assert.equal(process.env.NODE_ENV, "development", "Development only.");
const path = resolve(process.cwd(), "../../.local/qa/provider-foundation.json");
const denied = (work: () => Promise<unknown>, status: number) => assert.rejects(async () => work(), (e: any) => e.status === status);
const definition: ProviderDefinitionInput = {
  name: "Disposable Architecture QA", logoUrl: null, description: "Temporary test metadata; no real provider.",
  categories: ["Exchange / Convert", "Rates / Market Data"], services: ["Exchange"], capabilities: ["quotes", "rates"],
  status: "configuration_only", environments: ["sandbox", "test"], access: "assigned", entitlementKey: null, tenantConfigurable: true,
  configurationSchema: [{ key: "region", label: "Region", type: "text", required: true }, { key: "enabled", label: "Configured preference", type: "boolean", required: true }],
  credentialSchema: [{ key: "apiKey", label: "API key schema only", type: "secret", required: true }],
};
async function cleanup(m: any) {
  // Explicit QA identifiers only; do not delete existing provider/customer records.
  for (const id of m.providerIds ?? []) {
    const outside = await pool.query("SELECT id FROM provider_assignments WHERE provider_id=$1 AND NOT(tenant_id=ANY($2::uuid[]))", [id, m.tenants.map((t: any) => t.id)]);
    assert.equal(outside.rowCount, 0, "QA provider acquired an unexpected non-QA assignment; cleanup refused.");
  }
  await pool.query("DELETE FROM provider_policies WHERE tenant_id=ANY($1::uuid[])", [m.tenants.map((t: any) => t.id)]);
  await pool.query("DELETE FROM provider_assignments WHERE tenant_id=ANY($1::uuid[])", [m.tenants.map((t: any) => t.id)]);
  const ids = m.providerIds ?? [];
  await pool.query("DELETE FROM audit_events WHERE metadata->>'providerId'=ANY($1::text[])", [ids]);
  await pool.query("DELETE FROM provider_catalog WHERE id=ANY($1::uuid[])", [ids]);
  const realQaUsers: string[] = m.qaUserIds ?? [];
  if (m.qaOwnerId) assert.ok(realQaUsers.includes(m.qaOwnerId), "QA owner must be an explicitly recorded generated test identity.");
  assert.ok(!realQaUsers.includes("user_3KF0i38mD09exoEm6cdBCLFQQRL"), "Permanent owner is never a QA identity.");
  await cleanCustomerFixtures(m.tenants.map((t: any) => t.id), m.planId, [...m.actors, ...realQaUsers]);
  for (const id of realQaUsers) {
    try { await clerkClient.users.deleteUser(id); }
    catch (error: any) { if (error.status !== 404) throw error; }
  }
}
let manifest: any;
try {
  if (process.argv.includes("--cleanup")) {
    manifest = JSON.parse(await readFile(path, "utf8"));
    await cleanup(manifest);
    await unlink(path);
    console.log("Provider QA fixtures removed.");
  } else {
    const suffix = randomUUID().slice(0, 8);
    const actors = [`user_ProviderOperator${suffix}`, `user_ProviderA${suffix}`, `user_ProviderB${suffix}`];
    await pool.query("INSERT INTO platform_admins(clerk_user_id) VALUES($1)", [actors[0]]);
    const owner = await resolvePrincipal(actors[0]);
    const fixture = await prepareCustomerFixtures(owner, `provider-${suffix}`);
    manifest = { ...fixture, actors, providerIds: [] };
    const [a, b] = fixture.tenants;
    for (const [i, tenant] of fixture.tenants.entries()) {
      await pool.query("INSERT INTO tenant_memberships(tenant_id,clerk_user_id,role) VALUES($1,$2,'client_admin')", [tenant.id, actors[i + 1]]);
    }
    const customerA = await resolvePrincipal(actors[1]), customerB = await resolvePrincipal(actors[2]);
    const original = (await exchangeConfiguration(owner, a.id)).configuration;
    const route = original.routes.find(r => r.action === "swap")!;
    const quoteInput = { action: "swap" as const, source: route.source, destination: route.destination, amount: "0.5" };
    const quoteBefore = await sandboxQuote(a.slug, quoteInput);
    const provider = await saveProviderDefinition(owner, definition);
    manifest.providerIds.push(provider.id);
    assert.equal(provider.connectionStatus, "not_configured");
    await denied(() => saveProviderDefinition(customerA, definition), 403);
    await denied(() => providerFoundation(customerA), 403);
    await denied(() => createProviderAssignment(customerA, a.id, { providerId: provider.id, capability: "quotes", environment: "sandbox" }), 403);
    const assignment = await createProviderAssignment(owner, a.id, { providerId: provider.id, capability: "quotes", environment: "sandbox" });
    await denied(() => createProviderAssignment(owner, a.id, { providerId: provider.id, capability: "payments", environment: "sandbox" }), 403);
    await denied(() => createProviderAssignment(owner, a.id, { providerId: provider.id, capability: "quotes", environment: "live" }), 403);
    assert.equal((await providerFoundation(customerA, a.id)).assignments.length, 1);
    assert.equal((await providerFoundation(customerB, b.id)).providers.length, 0);
    await denied(() => providerFoundation(customerB, a.id), 403);
    await denied(() => updateProviderAssignment(customerB, b.id, assignment.id, { configuration: {} }), 404);
    await denied(() => updateProviderAssignment(customerA, a.id, assignment.id, { configuration: { apiKey: "unit-fixture-do-not-persist" } }), 400);
    const configured = await updateProviderAssignment(customerA, a.id, assignment.id, { configuration: { region: "QA", enabled: false } });
    assert.equal(configured.connectionStatus, "configured");
    assert.equal(configured.credentialState, "not_configured");
    const tenantView = await providerFoundation(customerA, a.id);
    assert.equal(tenantView.providers[0].credentialSchema.length, 0);
    assert.equal(tenantView.providers[0].assignedTenants, 1);
    const policy = await saveProviderPolicy(customerA, a.id, {
      scope: "route", resourceId: route.id, capability: "quotes", environment: "sandbox",
      executionMode: "provider", providerId: provider.id, fallback: "manual", secondaryProviderId: null,
    });
    assert.equal(policy.executionEnabled, false);
    await denied(() => saveProviderPolicy(customerB, b.id, { ...policy, tenantId: b.id, resourceId: original.routes[0].id }), 404);
    const selection = await resolveFutureProviderSelection(customerA, a.id, "swap", route.id, "quotes");
    assert.equal(selection.executionEnabled, false);
    assert.equal(selection.providers[0].providerId, provider.id);
    await denied(() => removeProviderAssignment(owner, a.id, assignment.id), 409);
    const quoteAfter = await sandboxQuote(a.slug, quoteInput);
    for (const key of ["rate", "fee", "outputAmount", "destinationFee"] as const) assert.equal(quoteAfter[key], quoteBefore[key]);
    assert.deepEqual((await exchangeConfiguration(owner, a.id)).configuration, original);
    await saveProviderDefinition(owner, { ...definition, tenantConfigurable: false }, provider.id);
    await denied(() => updateProviderAssignment(customerA, a.id, assignment.id, { configuration: { region: "QA", enabled: false } }), 403);
    const hidden = await providerFoundation(customerA, a.id);
    assert.deepEqual(hidden.assignments[0].configuration, {});
    assert.equal(hidden.providers[0].configurationSchema.length, 0);
    await saveProviderDefinition(owner, { ...definition, access: "entitlement", entitlementKey: "crypto_payments" }, provider.id);
    await denied(() => updateProviderAssignment(customerA, a.id, assignment.id, { configuration: { region: "QA", enabled: false } }), 403);
    await denied(() => resolveFutureProviderSelection(customerA, a.id, "swap", route.id, "quotes"), 403);
    await saveProviderDefinition(owner, definition, provider.id);
    await removeProviderPolicy(customerA, a.id, policy.id);
    assert.equal((await resolveFutureProviderSelection(customerA, a.id, "swap", route.id, "quotes")).mode, "sandbox_manual");
    await removeProviderAssignment(owner, a.id, assignment.id);
    const audit = await pool.query("SELECT metadata FROM audit_events WHERE event_type LIKE 'provider.%' AND (tenant_id=ANY($1::uuid[]) OR metadata->>'providerId'=$2)", [[a.id, b.id], provider.id]);
    assert.ok(audit.rowCount! > 5);
    assert.ok(!JSON.stringify(audit.rows).includes("unit-fixture-do-not-persist"));
    console.log("PASS: catalog/assignment permissions, A/B isolation, configuration schema, tenant redaction, entitlement revocation, route selection, removal guards, audit secrecy, unchanged sandbox configuration/quote.");
    // Leave an empty catalog for the UI tester's actual Create-provider action.
    await pool.query("DELETE FROM audit_events WHERE metadata->>'providerId'=$1", [provider.id]);
    await pool.query("DELETE FROM provider_catalog WHERE id=$1", [provider.id]);
    manifest.providerIds = [];
    if (process.argv.includes("--keep-for-ui")) {
      await mkdir(resolve(path, ".."), { recursive: true });
      await writeFile(path, JSON.stringify({ tenants: fixture.tenants, planId: fixture.planId, actors, providerIds: [] }, null, 2));
      console.log(JSON.stringify({ tenants: fixture.tenants.map(t => ({ id: t.id, slug: t.slug })), manifestPath: ".local/qa/provider-foundation.json" }));
    } else { await cleanup(manifest); manifest = undefined; }
  }
} catch (error) {
  if (manifest) await cleanup(manifest);
  throw error;
} finally { await pool.end(); }
