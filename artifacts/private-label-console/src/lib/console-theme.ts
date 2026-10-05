import { useEffect, useLayoutEffect, useMemo } from 'react';
import { PLATFORM_SITE } from './platform-site';
import { tokens, mix, readable, ensure, fontLink } from '@site/lib/theme';
import { useSiteTheme } from '@site/hooks/use-site-theme';

function hsl(h: string): string {
  const n = parseInt(h.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let hh = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh = (hh * 60 + 360) % 360;
  }
  return `${hh.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

/** Console variables derived from the real QXLayer theme generator. */
export function consoleVars(dark: boolean): Record<string, string> {
  const t = tokens(PLATFORM_SITE, dark);
  const bg = t['--s-bg'], fg = t['--s-fg'], bg2 = t['--s-bg2'];
  const accent = t['--s-accent'], ink = t['--s-accent-ink'];
  const card = dark ? mix(bg, '#ffffff', 0.05) : mix(bg, '#ffffff', 0.7);
  const pop = dark ? mix(bg2, '#ffffff', 0.04) : '#ffffff';
  const muted = mix(bg, fg, 0.07);
  const destructive = dark ? '#f0766a' : '#b3261e';
  const line = mix(bg, fg, dark ? 0.16 : 0.15);
  const side = dark ? mix(bg, '#000000', 0.25) : mix(bg, '#ffffff', 0.5);
  const out: Record<string, string> = {
    ...t,
    '--background': hsl(bg), '--foreground': hsl(fg),
    '--card': hsl(card), '--card-foreground': hsl(fg), '--card-border': hsl(line),
    '--popover': hsl(pop), '--popover-foreground': hsl(fg), '--popover-border': hsl(line),
    '--primary': hsl(t['--s-primary']), '--primary-foreground': hsl(t['--s-primary-fg']),
    '--secondary': hsl(muted), '--secondary-foreground': hsl(fg),
    '--muted': hsl(muted), '--muted-foreground': hsl(t['--s-muted']),
    '--accent': hsl(mix(bg, accent, dark ? 0.2 : 0.16)), '--accent-foreground': hsl(fg),
    '--destructive': hsl(destructive), '--destructive-foreground': hsl(readable(destructive)),
    '--border': hsl(line), '--input': hsl(mix(bg, fg, dark ? 0.3 : 0.32)), '--ring': hsl(ink),
    '--sidebar': hsl(side), '--sidebar-foreground': hsl(fg), '--sidebar-border': hsl(line),
    '--sidebar-primary': hsl(ensure(t['--s-primary'], side, 3)), '--sidebar-primary-foreground': hsl(t['--s-primary-fg']),
    '--sidebar-accent': hsl(mix(side, accent, 0.16)), '--sidebar-accent-foreground': hsl(fg), '--sidebar-ring': hsl(ink),
    '--chart-1': hsl(t['--s-primary']), '--chart-2': hsl(accent), '--chart-3': hsl(t['--s-glow']), '--chart-4': hsl(t['--s-secondary']), '--chart-5': hsl(destructive),
    '--radius': t['--s-r1'],
    '--app-font-sans': t['--s-font'], '--app-font-serif': t['--s-font'],
    '--elevate-1': dark ? 'rgba(255,255,255,.05)' : 'rgba(16,20,27,.04)',
    '--elevate-2': dark ? 'rgba(255,255,255,.1)' : 'rgba(16,20,27,.09)',
    '--button-outline': 'var(--s-line)',
  };
  return out;
}

/** Applies the shared theme to the document so body-portaled UI inherits it. */
export function useConsoleTheme() {
  const { dark, toggle } = useSiteTheme(PLATFORM_SITE);
  const vars = useMemo(() => consoleVars(dark), [dark]);
  useEffect(() => {
    const href = fontLink('space-grotesk');
    let link: HTMLLinkElement | null = null;
    if (href && !document.querySelector(`link[href="${href}"]`)) {
      link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; document.head.appendChild(link);
    }
    return () => { link?.remove(); };
  }, []);
  useLayoutEffect(() => {
    const el = document.documentElement;
    const had = el.classList.contains('dark');
    const hadScope = el.classList.contains('qx-console');
    const previousTheme = el.dataset.qxTheme;
    const previous = new Map(Object.keys(vars).map((k) => {
      const key = k === 'colorScheme' ? 'color-scheme' : k;
      return [key, { value: el.style.getPropertyValue(key), priority: el.style.getPropertyPriority(key) }] as const;
    }));
    Object.entries(vars).forEach(([k, v]) => (k === 'colorScheme' ? (el.style.colorScheme = v) : el.style.setProperty(k, v)));
    el.classList.add('qx-console'); el.classList.toggle('dark', dark); el.dataset.qxTheme = dark ? 'dark' : 'light';
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prev = meta?.content;
    if (meta) meta.content = vars['--s-bg'];
    return () => {
      previous.forEach(({ value, priority }, key) => {
        if (value) el.style.setProperty(key, value, priority);
        else el.style.removeProperty(key);
      });
      el.classList.toggle('qx-console', hadScope); el.classList.toggle('dark', had);
      if (previousTheme !== undefined) el.dataset.qxTheme = previousTheme;
      else delete el.dataset.qxTheme;
      if (meta && prev !== undefined) meta.content = prev;
    };
  }, [vars, dark]);
  return { dark, toggle, vars };
}
