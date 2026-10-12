import { useCallback, useEffect, useState } from 'react';
import type { PublicSite } from '@workspace/api-client-react';

type Pref = 'light' | 'dark';
const keyOf = (slug: string) => `plw:theme:${slug}`;
function read(slug: string): Pref | null {
  try { const v = window.localStorage.getItem(keyOf(slug)); return v === 'light' || v === 'dark' ? v : null; } catch { return null; }
}
export function useSiteTheme(site: PublicSite) {
  const slug = site.tenantSlug;
  const [pref, setPref] = useState<Pref | null>(() => read(slug));
  const [sys, setSys] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => { setPref(read(slug)); }, [slug]);
  // Keep nested/platform consumers and body-portaled UI on the same preference.
  // The tenant slug scopes the event; one customer's theme never changes another.
  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ slug: string; pref: Pref }>).detail;
      if (detail?.slug === slug) setPref(detail.pref);
    };
    const storage = (event: StorageEvent) => {
      if (event.key === keyOf(slug) || event.key === null) setPref(read(slug));
    };
    window.addEventListener('plw:theme-change', sync);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener('plw:theme-change', sync);
      window.removeEventListener('storage', storage);
    };
  }, [slug]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = (e: MediaQueryListEvent) => setSys(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  const dark = pref ? pref === 'dark' : site.themeMode === 'dark' || (site.themeMode === 'system' && sys);
  const toggle = useCallback(() => {
    const next: Pref = dark ? 'light' : 'dark';
    setPref(next);
    try { window.localStorage.setItem(keyOf(slug), next); } catch { /* storage unavailable */ }
    window.dispatchEvent(new CustomEvent('plw:theme-change', { detail: { slug, pref: next } }));
  }, [dark, slug]);
  return { dark, toggle };
}
