import assert from 'node:assert/strict';
import type { PublicSite } from '@workspace/api-client-react';
import { contrast, tokens } from '../src/lib/theme';
import { resolveCaps } from '../src/lib/capabilities';

// Pure design-token/entitlement fixtures; no server, tenant writes or execution.
const site = {
  primaryColor: '#146E68', accentColor: '#9A6630', features: {},
  assets: [{ assetId: 'eth', networkId: 'sepolia' }, { assetId: 'eth', networkId: 'other' }],
  websiteSettings: { secondaryColor: '#113831', fontKey: 'manrope', borderRadius: 'sharp', faq: [] },
} as unknown as PublicSite;
let palettes = 0;
for (let i = 0; i < 1024; i++) {
  const color = '#' + ((i * 104729) % 0x1000000).toString(16).padStart(6, '0');
  for (const dark of [false, true]) {
    const t = tokens({ ...site, primaryColor: color, accentColor: color }, dark);
    for (const bg of ['--s-bg', '--s-bg2', '--s-panel', '--s-card']) {
      for (const text of ['--s-fg', '--s-muted', '--s-primary-ink', '--s-accent-ink']) {
        assert.ok(contrast(t[text], t[bg]) >= 4.5, `${color}/${dark}: ${text} against ${bg}`);
      }
    }
    assert.ok(contrast(t['--s-primary-fg'], t['--s-primary']) >= 4.5);
    assert.ok(contrast(t['--s-accent-fg'], t['--s-accent']) >= 4.5);
    palettes++;
  }
}
// Mid-grey must use pure black, not near-black, to reach 4.5:1.
const grey = tokens({ ...site, primaryColor: '#777777' }, false);
assert.ok(contrast(grey['--s-primary-fg'], grey['--s-primary']) >= 4.5);
const caps = (features: PublicSite['features']) => resolveCaps({ ...site, features });
assert.deepEqual(caps({ crypto_exchange: true, swap: true }).tabs, ['swap']);
assert.deepEqual(caps({ crypto_exchange: false, swap: true, convert: true }).tabs, []);
assert.equal(caps({ crypto_exchange: true }).exchange, 'empty');
assert.equal(caps({ crypto_exchange: false }).exchange, 'off');
assert.deepEqual(caps({ exchange: true, fake_swap: true }).tabs, []);
assert.deepEqual(caps({ crypto_exchange: true, fake_swap: true, exchange_buy: true }).tabs, []);
assert.equal(caps({ api: true, fake_telegram_bot: true, payments: true }).api, false);
const enabled = caps({ crypto_payments: true, merchant_api: true, api_keys: true, webhooks: true, telegram_bot: true, telegram_mini_app: true });
assert.ok(enabled.payments && enabled.api && enabled.keys && enabled.webhooks && enabled.bot && enabled.mini);
assert.equal(enabled.assets, 1);
assert.equal(enabled.networks, 2);
console.log(`PASS: ${palettes} light/dark palettes at >=4.5:1; exact capability keys, parent gating, aliases denied, real distinct asset/network counts.`);