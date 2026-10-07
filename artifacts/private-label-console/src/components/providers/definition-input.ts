import type { ProviderDefinitionInput } from '@workspace/api-client-react';

/** A response is structurally assignable to the input type, but JSON serialization
 * retains its extra server-owned fields. Whitelist the actual write contract.
 */
export function definitionInput(p: ProviderDefinitionInput): ProviderDefinitionInput {
  const { name, logoUrl, description, categories, services, capabilities, status,
    environments, credentialSchema, configurationSchema, access, entitlementKey, tenantConfigurable } = p;
  return { name, logoUrl, description, categories, services, capabilities, status,
    environments, credentialSchema, configurationSchema, access, entitlementKey, tenantConfigurable };
}
