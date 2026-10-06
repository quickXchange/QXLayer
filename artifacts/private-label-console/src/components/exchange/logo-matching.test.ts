import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { ExchangeVisualAsset } from '@workspace/api-client-react';
import { findVisual } from './logo-matching';
const assets: ExchangeVisualAsset[] = JSON.parse(readFileSync('../api-server/src/products/exchange/visual-catalog.json', 'utf8')).assets;
test('every imported payment identity resolves by code and normalized name', () => {
  for (const a of assets.filter(a => a.kind === 'payment-method')) {
    assert.equal(findVisual(assets, 'payment-method', a.code)?.logoUrl, a.logoUrl, a.code);
    assert.equal(findVisual(assets, 'payment-method', a.name.toLowerCase())?.logoUrl, a.logoUrl, a.name);
  }
});
test('SEPA and SWIFT shorthand use declared transfer schemes, not an instant variant', () => {
  assert.equal(findVisual(assets, 'payment-method', 'SEPA')?.code, 'SEPA-TRANSFER');
  assert.equal(findVisual(assets, 'payment-method', 'SEPA Instant')?.code, 'SEPA-INSTANT');
  assert.equal(findVisual(assets, 'payment-method', 'SWIFT')?.code, 'SWIFT-BANK-TRANSFER');
});
test('generic simulations and currency do not falsely acquire bank/card branding', () => {
  for (const label of ['Sandbox bank transfer', 'Simulated bank transfer', 'Sandbox card simulation', 'Bank transfer', 'EUR']) {
    assert.equal(findVisual(assets, 'payment-method', label), undefined);
  }
});
test('asset and network matching is category-specific and shared aliases remain one identity', () => {
  assert.equal(findVisual(assets, 'crypto', 'btc')?.kind, 'crypto');
  assert.equal(findVisual(assets, 'network', 'bitcoin-testnet')?.kind, 'network');
  assert.equal(findVisual(assets, 'network', 'imported-polygon')?.recordId, 'imported-polygon');
  assert.equal(findVisual(assets, 'network', 'solana-devnet')?.recordId, 'solana-devnet');
});
