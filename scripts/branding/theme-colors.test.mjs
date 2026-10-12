import test from 'node:test';
import assert from 'node:assert/strict';
import { tokens, contrast, VYNOX } from '../../artifacts/private-label-website/src/lib/theme.ts';

const platform = {
  tenantSlug: '', primaryColor: VYNOX.royal, accentColor: VYNOX.electric,
  websiteSettings: { secondaryColor: VYNOX.deepBlue, glowColor: VYNOX.glow },
};
for (const dark of [false, true]) {
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
