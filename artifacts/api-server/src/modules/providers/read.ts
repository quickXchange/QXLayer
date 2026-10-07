import type { DatabaseClient } from "@workspace/db";
import { withDatabase } from "@workspace/db";
import { GetProviderFoundationResponse, type ProviderDefinition, type ProviderAssignment } from "@workspace/api-zod";
import { contextFor, requireSuperAdmin, type Principal } from "../authentication/service";
import { resolveEntitlements } from "../entitlements/resolver";
import { INITIAL_CATEGORIES, INITIAL_CAPABILITIES } from "./contracts";
import { HttpError } from "../../lib/errors";

export async function readCatalog(client: DatabaseClient): Promise<ProviderDefinition[]> {
  const result = await client.query(`SELECT p.*, (SELECT count(DISTINCT a.tenant_id)::int FROM provider_assignments a WHERE a.provider_id=p.id) AS assigned_tenants
    FROM provider_catalog p ORDER BY p.definition->>'name',p.id`);
  return result.rows.map(r => ({
    ...r.definition, id: r.id, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(),
    implementationStatus: "not_implemented", connectionStatus: "not_configured",
    assignedTenants: r.assigned_tenants, credentialStorageAvailable: false,
  }));
}
export function assignmentView(r: any): ProviderAssignment {
  return {
    id: r.id, tenantId: r.tenant_id, providerId: r.provider_id, capability: r.capability,
    environment: r.environment, configuration: r.configuration,
    connectionStatus: Object.keys(r.configuration).length ? "configured" : "not_configured",
    credentialState: "not_configured", createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(),
  };
}
export async function readAssignments(client: DatabaseClient, tenantId?: string) {
  const rows = await client.query(`SELECT * FROM provider_assignments ${tenantId ? "WHERE tenant_id=$1" : ""} ORDER BY created_at,id`, tenantId ? [tenantId] : []);
  return rows.rows.map(assignmentView);
}
export function policyView(r: any) {
  return { ...r.definition, id: r.id, tenantId: r.tenant_id, scope: r.scope, resourceId: r.resource_id, capability: r.capability, executionEnabled: false, updatedAt: r.updated_at.toISOString() };
}
export async function readFoundation(client: DatabaseClient, tenantId?: string) {
  let providers = await readCatalog(client);
  let assignments = await readAssignments(client, tenantId);
  if (tenantId) {
    const effective = await resolveEntitlements(client, tenantId);
    const assigned = new Set(assignments.map(a => a.providerId));
    providers = providers.filter(p => assigned.has(p.id) || (effective.features.crypto_exchange &&
      p.status !== "disabled" && (p.access === "platform_wide" || (p.access === "entitlement" && !!p.entitlementKey && effective.features[p.entitlementKey]))));
    // Tenant projections deliberately omit global credential schema/settings,
    // other tenants' counts and non-tenant-configurable stored configuration.
    const configAllowed = new Set(providers.filter(p => p.tenantConfigurable).map(p => p.id));
    providers = providers.map(p => ({ ...p, assignedTenants: assigned.has(p.id) ? 1 : 0, credentialSchema: [],
      configurationSchema: configAllowed.has(p.id) ? p.configurationSchema : [],
      access: "assigned", entitlementKey: null }));
    assignments = assignments.map(a => ({ ...a, configuration: configAllowed.has(a.providerId) ? a.configuration : {} }));
  }
  const policies = await client.query(`SELECT * FROM provider_policies ${tenantId ? "WHERE tenant_id=$1" : ""} ORDER BY updated_at DESC`, tenantId ? [tenantId] : []);
  const activity = await client.query(`SELECT id,tenant_id,event_type,description,created_at FROM audit_events
    WHERE event_type LIKE 'provider.%' ${tenantId ? "AND tenant_id=$1" : ""} ORDER BY created_at DESC,id DESC LIMIT 100`, tenantId ? [tenantId] : []);
  return GetProviderFoundationResponse.parse({
    providers, assignments, policies: policies.rows.map(policyView),
    activity: activity.rows.map(a => ({ id: a.id, tenantId: a.tenant_id, action: a.event_type, summary: a.description, createdAt: a.created_at.toISOString() })),
    categories: [...new Set([...INITIAL_CATEGORIES, ...providers.flatMap(p => p.categories)])],
    capabilities: [...new Set([...INITIAL_CAPABILITIES, ...providers.flatMap(p => p.capabilities)])],
    credentialStorageAvailable: false, executionEnabled: false,
  });
}
export function providerFoundation(principal: Principal, tenantId?: string) {
  if (!tenantId) requireSuperAdmin(principal);
  return withDatabase(contextFor(principal, tenantId), client => readFoundation(client, tenantId));
}
export async function readProvider(client: DatabaseClient, id: string) {
  const provider = (await readCatalog(client)).find(p => p.id === id);
  if (!provider) throw new HttpError(404, "Provider not found.");
  return provider;
}
