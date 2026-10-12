import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAccessPage } from '../../lib/production-access-gate/page.mjs';
import { readFileSync } from 'node:fs';
import { tokens, contrast, VYNOX, mix, platformChartColors } from '../../artifacts/private-label-website/src/lib/theme.ts';

const platform = {
  tenantSlug: '', primaryColor: VYNOX.royal, accentColor: VYNOX.electric,
  websiteSettings: { secondaryColor: VYNOX.deepBlue, glowColor: VYNOX.glow },
};
for (const dark of [false, true]) {
  test(`${dark ? 'dark' : 'light'}: chart series are unique and contrast with cards`, () => {
    const t = tokens(platform, dark);
    const card = mix(t['--s-bg'], '#ffffff', dark ? 0.05 : 0.7);
    const colors = platformChartColors(dark, card);
    assert.equal(new Set(colors).size, 5);
    for (const color of colors) assert.ok(contrast(color, card) >= 3);
  });
  test(`${dark ? 'dark' : 'light'}: brand text and controls meet AA contrast`, () => {
    const t = tokens(platform, dark);
    for (const bg of ['--s-bg', '--s-bg2', '--s-panel', '--s-card']) {
      for (const fg of ['--s-fg', '--s-muted', '--s-primary-ink', '--s-accent-ink']) {
        assert.ok(contrast(t[fg], t[bg]) >= 4.5, `${fg} on ${bg}`);
      }
    }
    assert.ok(contrast(t['--s-primary-fg'], t['--s-primary']) >= 4.5);
    assert.equal(t.colorScheme, dark ? 'dark' : 'light');
    assert.equal(t['--s-primary'], dark ? VYNOX.electric : VYNOX.royal);
  });
}
test('platform branding does not overwrite customer website configuration', () => {
  const tenant = { ...platform, tenantSlug: 'customer-brand', primaryColor: '#b64020', accentColor: '#008844' };
  for (const dark of [false, true]) {
    const t = tokens(tenant, dark);
    assert.equal(t['--s-primary'], tenant.primaryColor);
    assert.equal(t['--s-accent'], tenant.accentColor);
  }
});
test('Staging gate button uses AA brand gradient without changing Production styling', () => {
  const staging = renderAccessPage({ staging: true });
  const production = renderAccessPage({ staging: false });
  const gradient = `button.go{background:linear-gradient(135deg,${VYNOX.royal},${VYNOX.deepBlue})}`;
  assert.ok(staging.includes(gradient));
  assert.ok(!production.includes(gradient));
  for (const color of [VYNOX.royal, VYNOX.deepBlue]) {
    assert.ok(contrast('#ffffff', color) >= 4.5);
    assert.ok(contrast('#ffffff', mix(color, '#ffffff', 0.07)) >= 4.5);
  }
});
test('console placeholders and light semantic status text retain AA contrast', () => {
  const css = readFileSync(new URL('../../artifacts/private-label-console/src/styles/console.css', import.meta.url), 'utf8');
  assert.ok(css.includes('::placeholder{color:var(--s-muted);opacity:1}'));
  for (const [fg, backgrounds] of [['#047857', ['#FFFFFF', '#D1FAE5']], ['#B3261E', ['#FFFFFF', '#FEE2E2']]]) {
    assert.ok(css.toLowerCase().includes(fg.toLowerCase()));
    for (const bg of backgrounds) assert.ok(contrast(fg, bg) >= 4.5);
  }
});
