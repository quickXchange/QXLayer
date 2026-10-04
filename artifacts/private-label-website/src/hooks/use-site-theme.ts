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
  }, [dark, slug]);
  return { dark, toggle };
}
