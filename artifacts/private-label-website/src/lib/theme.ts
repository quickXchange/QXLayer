import type { PublicSite } from '@workspace/api-client-react';

const FONTS: Record<string, { stack: string; google?: string }> = {
  system: { stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  inter: { stack: "'Inter', system-ui, sans-serif", google: 'Inter:wght@400;500;600;700' },
  manrope: { stack: "'Manrope', system-ui, sans-serif", google: 'Manrope:wght@400;500;600;700' },
  'dm-sans': { stack: "'DM Sans', system-ui, sans-serif", google: 'DM+Sans:wght@400;500;600;700' },
  'space-grotesk': { stack: "'Space Grotesk', system-ui, sans-serif", google: 'Space+Grotesk:wght@400;500;600;700' },
};
const HEX = /^#[0-9A-Fa-f]{6}$/;
const safe = (c: string, d: string) => (HEX.test(c) ? c : d);
export function readable(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#14171c' : '#fbfaf7';
}
export function fontLink(key: string): string | null {
  const g = FONTS[key]?.google;
  return g ? `https://fonts.googleapis.com/css2?family=${g}&display=swap` : null;
}
export function tokens(site: PublicSite, dark: boolean): Record<string, string> {
  const p = safe(site.primaryColor, '#2b3a55');
  const a = safe(site.accentColor, '#b4551f');
  const s = safe(site.websiteSettings.secondaryColor, '#8a7f6c');
  return {
    '--site-primary': p, '--site-primary-fg': readable(p), '--site-accent': a, '--site-accent-fg': readable(a),
    '--site-secondary': s, '--site-secondary-fg': readable(s),
    '--site-bg': dark ? '#12151b' : '#faf8f3', '--site-fg': dark ? '#efece4' : '#16191f',
    '--site-card': dark ? '#1a1e26' : '#ffffff', '--site-muted': dark ? '#9aa0ab' : '#5d6470', '--site-line': dark ? '#2b313c' : '#e3ddd0',
    '--site-font': (FONTS[site.websiteSettings.fontKey] ?? FONTS.system).stack,
  };
}
export const humanize = (k: string) => k.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
