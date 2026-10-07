import type { ProviderDefinitionInput, ProviderPolicyInput, ProviderAssignment, ProviderDefinition } from "@workspace/api-zod";
import { HttpError } from "../../lib/errors";
import { NETWORK_CAPABILITIES, ROUTE_CAPABILITIES } from "./contracts";
import { validateFields, safeUrl } from "./security";

export function validateDefinition(input: ProviderDefinitionInput, entitlementKeys: string[]) {
  if (!input.name.trim() || input.categories.some(c => !c.trim())) throw new HttpError(400, "Provider name and categories cannot be blank.");
  if (input.logoUrl) safeUrl(input.logoUrl);
  validateFields(input.credentialSchema, true);
  validateFields(input.configurationSchema, false);
  if (input.configurationSchema.some(field => input.credentialSchema.some(secret => secret.key === field.key))) {
    throw new HttpError(400, "A credential field cannot also be a non-secret configuration field.");
  }
  if (input.access === "entitlement" && (!input.entitlementKey || !entitlementKeys.includes(input.entitlementKey))) {
    throw new HttpError(400, "Select an existing feature entitlement; plans and add-ons use the existing resolver.");
  }
  if (input.access !== "entitlement" && input.entitlementKey !== null) throw new HttpError(400, "An entitlement key applies only to entitlement access.");
}
export function capabilityAllowed(provider: Pick<ProviderDefinitionInput, "capabilities" | "environments" | "status" | "access" | "entitlementKey">, capability: string, environment: string, features: Record<string, boolean>) {
  return provider.status !== "disabled" && provider.capabilities.includes(capability) && provider.environments.includes(environment as any) &&
    (provider.access !== "entitlement" || (!!provider.entitlementKey && features[provider.entitlementKey] === true));
}
export function validateFallback(policy: ProviderPolicyInput) {
  if (policy.executionMode === "sandbox_manual" && (policy.providerId || policy.secondaryProviderId || policy.fallback !== "none")) throw new HttpError(400, "Sandbox/manual policies cannot select providers or fallback.");
  if (policy.executionMode === "provider" && !policy.providerId) throw new HttpError(400, "Select a primary provider for a future provider policy.");
  if (policy.fallback === "secondary_provider" && (!policy.secondaryProviderId || policy.secondaryProviderId === policy.providerId)) throw new HttpError(400, "Select a distinct secondary provider.");
  if (policy.fallback !== "secondary_provider" && policy.secondaryProviderId) throw new HttpError(400, "Secondary provider requires the secondary-provider fallback policy.");
}
export function validatePolicyCompatibility(policy: ProviderPolicyInput, action?: string) {
  const allowed = policy.scope === "network" ? NETWORK_CAPABILITIES : ROUTE_CAPABILITIES[action ?? ""] ?? [];
  if (!allowed.includes(policy.capability)) throw new HttpError(400, "Capability is not compatible with the route action or network infrastructure.");
}
export function selectPolicyProviders(policy: ProviderPolicyInput, tenantId: string, providers: ProviderDefinition[], assignments: ProviderAssignment[], features: Record<string, boolean>) {
  validateFallback(policy);
  if (policy.executionMode === "sandbox_manual") return [];
  return [policy.providerId, policy.secondaryProviderId].filter((id): id is string => !!id).map(id => {
    const provider = providers.find(p => p.id === id);
    const assignment = assignments.find(a => a.tenantId === tenantId && a.providerId === id && a.capability === policy.capability && a.environment === policy.environment);
    if (!provider || !assignment || !capabilityAllowed(provider, policy.capability, policy.environment, features)) throw new HttpError(403, "No allowed, compatible tenant provider assignment for this policy.");
    return { providerId: id, assignmentId: assignment.id, capability: policy.capability, environment: policy.environment };
  });
}
