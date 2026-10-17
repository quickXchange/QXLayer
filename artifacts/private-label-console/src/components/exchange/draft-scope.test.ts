import assert from 'node:assert/strict';
import { routeEndpointsCompatible } from './route-endpoint-validation';
import { test } from 'node:test';
import type { ExchangeSettings, ExchangeCatalogAsset } from '@workspace/api-client-react';
import { reconcileExchangeScope } from './draft-scope';

const catalog = [{ assetId: 'asset-kept', assetNetworkId: 'network-kept', symbol: 'QA' }] as ExchangeCatalogAsset[];
const saved = {
  enabled: false,
  actions: { swap: false, convert: false, buy: false, sell: false },
  defaultAction: 'swap', fiatCurrency: 'USD', publicNote: '',
  assets: [{ assetId: 'asset-kept', enabled: false, displayOrder: 0, symbol: 'QA', decimals: 8, logoUrl: null, sandboxPlanRate: '17.000001' }, { assetId: 'asset-removed', enabled: false, displayOrder: 1, symbol: 'OLD', decimals: 8, logoUrl: null, sandboxPlanRate: '0' }],
  networks: [{ assetNetworkId: 'network-kept', enabled: false, available: false, minimum: '1', maximum: '10', fee: '0.01', information: '' }, { assetNetworkId: 'network-removed', enabled: false, available: false, minimum: '0', maximum: '0', fee: '0', information: '' }],
  routes: [{ id: 'retained', source: 'fiat:USD', destination: 'network-kept' }, { id: 'removed', source: 'network-kept', destination: 'network-removed' }],
  paymentMethods: [], providers: [],
} as ExchangeSettings;

test('unrelated settings saves retain all typed group pricing rules and their activation', () => {
  const pricingRules = [
    { id: 'crypto-fiat', action: 'swap', source: 'crypto:*', destination: 'fiat:*', enabled: true, priority: 10, feeBps: 25, fixedFee: '0', spreadBps: 10 },
    { id: 'fiat-crypto', action: 'swap', source: 'fiat:*', destination: 'crypto:*', enabled: true, priority: 10, feeBps: 25, fixedFee: '0', spreadBps: 10 },
    { id: 'crypto-crypto', action: 'convert', source: 'crypto:*', destination: 'crypto:*', enabled: true, priority: 10, feeBps: 25, fixedFee: '0', spreadBps: 10 },
  ] as NonNullable<ExchangeSettings['pricingRules']>;
  const reconciled = reconcileExchangeScope({ ...saved, pricingRules }, catalog);
  assert.deepEqual(reconciled.pricingRules, pricingRules);
  assert.equal(reconcileExchangeScope(reconciled, catalog), reconciled);
});

test('disabled historical routes cannot block unrelated settings saves or be reenabled with invalid endpoints', () => {
  const networks = new Set(['btc:bitcoin-testnet', 'eth:ethereum-sepolia']);
  const route = { enabled: true, action: 'swap', source: 'btc:bitcoin-testnet', destination: 'eth:ethereum-sepolia' };
  assert.equal(routeEndpointsCompatible({ ...route, enabled: false }, ['USD'], networks), true);
  assert.equal(routeEndpointsCompatible(route, ['USD'], networks), false);
  assert.equal(routeEndpointsCompatible({ ...route, source: 'fiat:USD' }, ['USD'], networks), true);
  assert.equal(routeEndpointsCompatible({ ...route, destination: 'fiat:USD' }, ['USD'], networks), true);
  assert.equal(routeEndpointsCompatible({ ...route, source: 'fiat:EUR' }, ['USD'], networks), false);
  assert.equal(routeEndpointsCompatible({ ...route, action: 'convert' }, ['USD'], networks), true);
  assert.equal(routeEndpointsCompatible({ ...route, action: 'convert', destination: route.source }, ['USD'], networks), false);
  assert.equal(routeEndpointsCompatible({ ...route, action: 'buy', source: 'fiat:USD' }, ['USD'], networks), false);
  assert.equal(routeEndpointsCompatible({ ...route, action: 'buy', enabled: false }, ['USD'], networks), true);
});

test('discarding after saved scope removal cannot restore unassigned draft rows', () => {
  const result = reconcileExchangeScope(saved, catalog);
  assert.deepEqual(result.assets.map(a => a.assetId), ['asset-kept']);
  assert.deepEqual(result.networks.map(n => n.assetNetworkId), ['network-kept']);
  assert.deepEqual(result.routes.map(r => r.id), ['retained']);
  assert.equal(result.assets[0], saved.assets[0]);
  assert.equal(result.networks[0], saved.networks[0]);
  assert.equal(result.assets[0].sandboxPlanRate, '17.000001');
  assert.equal(saved.assets.length, 2);
  assert.equal(saved.routes.length, 2);
});

test('reconciliation remains stable and adds only disabled existing defaults', () => {
  const clean = reconcileExchangeScope(saved, catalog);
  assert.equal(reconcileExchangeScope(clean, catalog), clean);
  const expanded = reconcileExchangeScope(clean, [...catalog, { assetId: 'asset-new', assetNetworkId: 'network-new', symbol: 'NEW' } as ExchangeCatalogAsset]);
  assert.equal(expanded.assets.find(a => a.assetId === 'asset-new')?.enabled, false);
  assert.equal(expanded.networks.find(n => n.assetNetworkId === 'network-new')?.available, false);
  assert.equal(expanded.networks.find(n => n.assetNetworkId === 'network-new')?.enabled, false);
});
