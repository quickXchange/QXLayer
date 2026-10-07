import assert from "node:assert/strict";
import { test } from "node:test";
import { ProviderRegistry, providerRegistry } from "./registry";
import { capabilityAllowed, validateDefinition, validateFallback, validatePolicyCompatibility, selectPolicyProviders } from "./validation";
import { rejectSecrets, validateConfiguration, unavailableCredentialVault } from "./security";
import { receiveProviderWebhook } from "./webhooks";
import { executeProviderOperation } from "./routing";
import { contextFor, requireSuperAdmin } from "../authentication/service";
import type { ProviderAdapter } from "./contracts";
import type { ProviderDefinition, ProviderPolicyInput, ProviderAssignment } from "@workspace/api-zod";

const provider = {
  id: "10000000-0000-4000-8000-000000000001", name: "Unit fixture", logoUrl: null, description: "",
  categories: ["Rates / Market Data", "Exchange / Convert"], services: ["Exchange"], capabilities: ["quotes", "rates"],
  status: "configuration_only", environments: ["sandbox"], credentialSchema: [{ key: "apiKey", label: "API Key", type: "secret", required: true }],
  configurationSchema: [{ key: "region", label: "Region", type: "text", required: true }],
  access: "assigned", entitlementKey: null, tenantConfigurable: true,
  createdAt: "", updatedAt: "", implementationStatus: "not_implemented", connectionStatus: "not_configured",
  assignedTenants: 0, credentialStorageAvailable: false,
} as ProviderDefinition;
const tenantId = "20000000-0000-4000-8000-000000000001";
const policy: ProviderPolicyInput = { scope: "route", resourceId: "route-a", capability: "quotes", environment: "sandbox", executionMode: "provider", providerId: provider.id, fallback: "manual", secondaryProviderId: null };
const assignment = { id: "assignment-a", providerId: provider.id, tenantId, capability: "quotes", environment: "sandbox", configuration: {}, credentialState: "not_configured", connectionStatus: "not_configured" } as ProviderAssignment;
const client = { userId: "customer", role: "client_admin" as const, memberships: [{ tenantId, role: "client_admin" as const }] };
test("registry is empty: metadata cannot activate a connection", () => {
  assert.deepEqual(providerRegistry.resolve(provider.id, "quotes", "sandbox"), { ok: false, code: "not_implemented", message: "No implemented adapter is registered." });
});
test("server registry matches capabilities and environments, not provider names", () => {
  const registry = new ProviderRegistry();
  const adapter: ProviderAdapter = { providerId: provider.id, capabilities: new Set(["rates"]), environments: new Set(["sandbox"]),
    async verifyConnection() { return { ok: false, code: "not_implemented", message: "Unit stub has no connection." }; } };
  registry.register(adapter);
  assert.equal(registry.resolve(provider.id, "rates", "sandbox").ok, true);
  assert.equal(registry.resolve(provider.id, "quotes", "sandbox").ok, false);
  assert.equal(registry.resolve(provider.id, "rates", "live").ok, false);
  assert.throws(() => registry.register(adapter), /already/);
});
test("extensible multiple categories/capabilities and valid schemas accepted", () => validateDefinition(provider, ["crypto_exchange"]));
test("catalog entitlement must be an existing feature", () => {
  assert.throws(() => validateDefinition({ ...provider, access: "entitlement", entitlementKey: "invented" }, ["crypto_exchange"]), /existing feature/);
});
test("plan/add-on effective features enforce provider access", () => {
  const paid = { ...provider, access: "entitlement" as const, entitlementKey: "crypto_exchange" };
  assert.equal(capabilityAllowed(paid, "quotes", "sandbox", {}), false);
  assert.equal(capabilityAllowed(paid, "quotes", "sandbox", { crypto_exchange: true }), true);
  assert.equal(capabilityAllowed({ ...paid, status: "disabled" }, "quotes", "sandbox", { crypto_exchange: true }), false);
});
test("global management is Super Admin only; foreign tenant access denied", () => {
  assert.throws(() => requireSuperAdmin(client), /Super administrator/);
  assert.throws(() => contextFor(client, "tenant-b", true), /Tenant access/);
  assert.equal(contextFor(client, tenantId, true).canWrite, true);
});
test("read-only staff cannot manage assignments/configuration", () => {
  assert.throws(() => contextFor({ ...client, role: "staff", memberships: [{ tenantId, role: "staff", permissions: [] }] }, tenantId, true), /required permission/);
});
test("selection requires exact tenant/provider/capability/environment", () => {
  assert.equal(selectPolicyProviders(policy, tenantId, [provider], [assignment], {}).length, 1);
  for (const changed of [{ tenantId: "tenant-b" }, { environment: "live" }, { capability: "rates" }]) {
    assert.throws(() => selectPolicyProviders(policy, tenantId, [provider], [{ ...assignment, ...changed } as ProviderAssignment], {}), /tenant provider assignment/);
  }
});
test("route and network capability compatibility", () => {
  validatePolicyCompatibility(policy, "swap");
  validatePolicyCompatibility({ ...policy, scope: "network", capability: "rpc" });
  assert.throws(() => validatePolicyCompatibility({ ...policy, capability: "deposit_addresses" }, "swap"), /not compatible/);
  assert.throws(() => validatePolicyCompatibility({ ...policy, scope: "network" }), /not compatible/);
});
test("fallback requires distinct assigned secondary and manual mode has none", () => {
  validateFallback(policy);
  assert.throws(() => validateFallback({ ...policy, fallback: "secondary_provider" }), /distinct secondary/);
  assert.throws(() => validateFallback({ ...policy, fallback: "secondary_provider", secondaryProviderId: provider.id }), /distinct secondary/);
  assert.throws(() => validateFallback({ ...policy, executionMode: "sandbox_manual" }), /Sandbox\/manual/);
  assert.throws(() => validateFallback({ ...policy, secondaryProviderId: "another" }), /requires/);
});
test("credentials rejected recursively without echoing secret values", () => {
  for (const key of ["apiKey", "api_secret", "password", "webhookSecret", "privateKey", "rpcUrl", "accountId"]) {
    assert.throws(() => rejectSecrets({ configuration: { [key]: "never-return-this" } }), e => !String(e).includes("never-return-this"));
  }
  assert.throws(() => validateConfiguration(provider.configurationSchema, { region: "ok", token: "do-not-expose" }), /not accepted/);
});
test("non-secret config is schema-validated; URL credentials/query prohibited", () => {
  validateConfiguration(provider.configurationSchema, { region: "EU" });
  assert.throws(() => validateConfiguration(provider.configurationSchema, {}), /required/);
  assert.throws(() => validateConfiguration(provider.configurationSchema, { unknown: 1 }), /not defined/);
  assert.throws(() => validateConfiguration([{ key: "endpoint", type: "url", label: "Endpoint", required: true }], { endpoint: "https://host.example/?token=hidden" }), /public HTTPS/);
  assert.throws(() => validateDefinition({ ...provider, configurationSchema: provider.credentialSchema }, []), /credentials schema/);
  assert.throws(() => validateDefinition({ ...provider, credentialSchema: [{ key: "region", label: "Private account region", type: "text", required: true }] }, []), /cannot also/);
});
test("unprovisioned vault exposes only missing/masked state, refuses writes", async () => {
  const scope = { tenantId, providerId: provider.id, environment: "sandbox" as const };
  assert.deepEqual(await unavailableCredentialVault.state(scope), { configured: false, masked: "Not configured", keyVersion: null });
  await assert.rejects(unavailableCredentialVault.put(scope, { apiKey: "unit-only" }), /not provisioned/);
});
test("unsupported execution/failover fails explicitly, never fakes success", async () => {
  await assert.rejects(executeProviderOperation(), /not implemented/);
});
test("no webhook adapter means no signature/event processing", async () => {
  let called = false;
  await assert.rejects(receiveProviderWebhook({ providerId: provider.id, environment: "sandbox", rawBody: new Uint8Array(), headers: {}, credentialReference: "" },
    { async resolveVerifiedBinding() { called = true; return null; } },
    { async processOnce() { called = true; return "processed"; } }), /not implemented/);
  assert.equal(called, false);
});
