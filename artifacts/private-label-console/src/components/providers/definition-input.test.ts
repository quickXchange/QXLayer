import assert from 'node:assert/strict';
import { test } from 'node:test';
import { definitionInput } from './definition-input';
import type { ProviderDefinition } from '@workspace/api-client-react';

test('provider edits serialize write fields, not response credential/connection metadata', () => {
  const response = {
    name: 'Fixture', logoUrl: null, description: '', categories: ['Payment'], services: [], capabilities: ['payments'],
    status: 'configuration_only', environments: ['sandbox'], credentialSchema: [{ key: 'apiKey', label: 'API Key', type: 'secret', required: true }],
    configurationSchema: [], access: 'assigned', entitlementKey: null, tenantConfigurable: true,
    id: '10000000-0000-4000-8000-000000000001', credentialStorageAvailable: false,
    connectionStatus: 'not_configured', implementationStatus: 'not_implemented', assignedTenants: 0, createdAt: '', updatedAt: '',
  } as ProviderDefinition;
  const body = definitionInput(response);
  assert.equal(Object.keys(body).length, 13);
  assert.equal('credentialStorageAvailable' in body, false);
  assert.equal('connectionStatus' in body, false);
  assert.equal('id' in body, false);
  assert.equal(body.credentialSchema[0].key, 'apiKey');
});
