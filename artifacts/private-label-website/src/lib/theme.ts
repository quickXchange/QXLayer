import type { PublicSite } from '@workspace/api-client-react';

const FONTS: Record<string, { stack: string; google?: string; display?: string }> = {
  system: { stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  inter: { stack: "'Inter', system-ui, sans-serif", google: 'Inter:wght@400;500;600;700' },
  manrope: { stack: "'Manrope', system-ui, sans-serif", google: 'Manrope:wght@400;500;600;700;800' },
  'dm-sans': { stack: "'DM Sans', system-ui, sans-serif", google: 'DM+Sans:wght@400;500;600;700' },
  'space-grotesk': { stack: "'Space Grotesk', system-ui, sans-serif", google: 'Space+Grotesk:wght@400;500;600;700' },
};
const HEX = /^#[0-9A-Fa-f]{6}$/;
const safe = (c: string | undefined, d: string) => (c && HEX.test(c) ? c : d);

type RGB = [number, number, number];
const rgb = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hex = (c: RGB) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
export const luminance = (h: string) => { const [r, g, b] = rgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
export const contrast = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); };
/** Text colour with best contrast on the given background. */
export const readable = (bg: string) => (contrast(bg, '#000000') >= contrast(bg, '#ffffff') ? '#000000' : '#ffffff');
/** Nudge a colour until it reaches the contrast ratio against bg. */
export function ensure(fg: string, bg: string, min = 4.5): string {
  if (contrast(fg, bg) >= min) return fg;
  const target = contrast('#ffffff', bg) >= contrast('#000000', bg) ? '#ffffff' : '#000000';
  for (let t = 0.06; t <= 1.001; t += 0.06) { const c = mix(fg, target, t); if (contrast(c, bg) >= min) return c; }
  return target;
}
export function fontLink(key: string): string | null {
  const g = FONTS[key]?.google;
  return g ? `https://fonts.googleapis.com/css2?family=${g}&display=swap` : null;
}
const RADII = { sharp: ['3px', '4px', '6px'], soft: ['8px', '12px', '18px'], rounded: ['12px', '20px', '30px'] } as const;

export function tokens(site: PublicSite, dark: boolean): Record<string, string> {
  const ws = site.websiteSettings;
  const p = safe(site.primaryColor, '#2b5fd9');
  const a = safe(site.accentColor, '#16a394');
  const s = safe(ws.secondaryColor, '#6b7a99');
  const g = safe(ws.glowColor, a);
  const base = dark ? '#06080c' : '#ffffff';
  const bg = mix(base, p, dark ? 0.1 : 0.045);
  const bg2 = mix(base, p, dark ? 0.17 : 0.09);
  const fg = dark ? '#eef1f6' : '#10141b';
  const panel = dark ? mix(bg, '#ffffff', 0.05) : mix(bg, '#ffffff', 0.75);
  const card = dark ? mix(bg, '#ffffff', 0.04) : mix(bg, '#ffffff', 0.6);
  const backgrounds = [bg, bg2, panel, card].sort((x, y) => luminance(x) - luminance(y));
  const worstBackground = dark ? backgrounds[backgrounds.length - 1] : backgrounds[0];
  const muted = ensure(mix(fg, bg, dark ? 0.34 : 0.3), worstBackground, 4.6);
  const radius = RADII[ws.borderRadius ?? 'soft'] ?? RADII.soft;
  const primaryBtn = p;
  return {
    '--s-bg': bg, '--s-bg2': bg2, '--s-fg': fg, '--s-muted': muted, '--s-panel': panel,
    '--s-card': card,
    '--s-line': `color-mix(in srgb, ${fg} ${dark ? 13 : 14}%, transparent)`,
    '--s-primary': primaryBtn, '--s-primary-fg': readable(primaryBtn), '--s-primary-ink': ensure(p, worstBackground, 4.5),
    '--s-accent': a, '--s-accent-fg': readable(a), '--s-accent-ink': ensure(a, worstBackground, 4.5),
    '--s-secondary': s, '--s-glow': g,
    '--s-font': (FONTS[ws.fontKey] ?? FONTS.system).stack,
    '--s-r1': radius[0], '--s-r2': radius[1], '--s-r3': radius[2],
    colorScheme: dark ? 'dark' : 'light',
  };
}
export const humanize = (k: string) => k.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
export const themeColorMeta = (site: PublicSite, dark: boolean) => tokens(site, dark)['--s-bg'];
