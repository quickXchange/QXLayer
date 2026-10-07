import { withDatabase } from "@workspace/db";
import { SaveProviderPolicyBody, type ProviderPolicyInput } from "@workspace/api-zod";
import { contextFor, type Principal } from "../authentication/service";
import { lockTenant, requireFeature, resolveEntitlements } from "../entitlements/resolver";
import { audit } from "../../lib/audit";
import { HttpError } from "../../lib/errors";
import { rejectSecrets } from "./security";
import { readAssignments, readCatalog, policyView } from "./read";
import { selectPolicyProviders, validatePolicyCompatibility } from "./validation";

export function saveProviderPolicy(principal: Principal, tenantId: string, input: unknown) {
  rejectSecrets(input);
  const body = SaveProviderPolicyBody.parse(input);
  return withDatabase(contextFor(principal, tenantId, true), async client => {
    await lockTenant(client, tenantId);
    await client.query("SELECT pg_advisory_xact_lock_shared(hashtextextended('provider-catalog',0))");
    const effective = await resolveEntitlements(client, tenantId);
    requireFeature(effective, "crypto_exchange");
    const result = await client.query("SELECT configuration FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId]);
    const config = result.rows[0]?.configuration;
    const resource = body.scope === "route"
      ? config?.routes?.find((r: any) => r.id === body.resourceId)
      : config?.networks?.find((r: any) => r.assetNetworkId === body.resourceId);
    if (!resource) throw new HttpError(404, "Policy route/network does not belong to this tenant.");
    if (body.scope === "route") requireFeature(effective, resource.action);
    validatePolicyCompatibility(body, resource.action);
    selectPolicyProviders(body, tenantId, await readCatalog(client), await readAssignments(client, tenantId), effective.features);
    const saved = await client.query(`INSERT INTO provider_policies(tenant_id,scope,resource_id,capability,definition)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant_id,scope,resource_id,capability)
      DO UPDATE SET definition=EXCLUDED.definition,updated_at=now() RETURNING *`,
    [tenantId, body.scope, body.resourceId, body.capability, JSON.stringify(body)]);
    await audit(client, principal, tenantId, "provider.policy.saved", "Future provider policy saved; sandbox execution unchanged", {
      scope: body.scope, resourceId: body.resourceId, capability: body.capability, executionEnabled: false,
    });
    return policyView(saved.rows[0]);
  });
}
export function removeProviderPolicy(principal: Principal, tenantId: string, policyId: string) {
  return withDatabase(contextFor(principal, tenantId, true), async client => {
    await lockTenant(client, tenantId);
    requireFeature(await resolveEntitlements(client, tenantId), "crypto_exchange");
    const result = await client.query("DELETE FROM provider_policies WHERE id=$1 AND tenant_id=$2 RETURNING id", [policyId, tenantId]);
    if (!result.rowCount) throw new HttpError(404, "Tenant provider policy not found.");
    await audit(client, principal, tenantId, "provider.policy.removed", "Future provider policy removed", { policyId });
  });
}
/** Selection resolves metadata only. Exchange arithmetic/order paths do not call it.
 * Re-checks current tenant membership, action, route, entitlements and assignment.
 */
export function resolveFutureProviderSelection(principal: Principal, tenantId: string, action: string, routeId: string, capability: string) {
  return withDatabase(contextFor(principal, tenantId), async client => {
    const effective = await resolveEntitlements(client, tenantId);
    requireFeature(effective, "crypto_exchange");
    requireFeature(effective, action);
    const cfg = await client.query("SELECT configuration FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId]);
    const route = cfg.rows[0]?.configuration?.routes?.find((r: any) => r.id === routeId && r.action === action && r.enabled);
    if (!route) throw new HttpError(404, "No enabled tenant route for that action.");
    const row = await client.query("SELECT * FROM provider_policies WHERE tenant_id=$1 AND scope='route' AND resource_id=$2 AND capability=$3", [tenantId, routeId, capability]);
    if (!row.rowCount) return { mode: "sandbox_manual" as const, executionEnabled: false, providers: [] };
    const policy = row.rows[0].definition as ProviderPolicyInput;
    validatePolicyCompatibility(policy, action);
    const providers = selectPolicyProviders(policy, tenantId, await readCatalog(client), await readAssignments(client, tenantId), effective.features);
    return { mode: policy.executionMode, environment: policy.environment, fallback: policy.fallback, executionEnabled: false, providers };
  });
}
/** No automatic fallback or direct external operation can be enabled in this phase. */
export async function executeProviderOperation(): Promise<never> {
  throw new HttpError(501, "Provider execution/failover is not implemented. Use the existing sandbox/manual flow.");
}
