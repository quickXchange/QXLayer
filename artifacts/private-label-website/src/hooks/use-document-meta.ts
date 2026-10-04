import { useEffect } from 'react';
import type { PublicSite } from '@workspace/api-client-react';
import { fontLink } from '../lib/theme';

/** Applies tenant document metadata and restores everything on unmount. */
export function useDocumentMeta(site: PublicSite, themeColor: string) {
  const ws = site.websiteSettings;
  useEffect(() => {
    const added: HTMLElement[] = [];
    const restore: (() => void)[] = [];
    const prevTitle = document.title;
    document.title = site.brandName;
    const add = (tag: 'link' | 'meta', attrs: Record<string, string>) => { const el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); el.setAttribute('data-tenant-meta', '1'); document.head.appendChild(el); added.push(el); };
    const f = fontLink(ws.fontKey);
    if (f) add('link', { rel: 'stylesheet', href: f });
    if (ws.faviconUrl) {
      document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']").forEach((l) => { if (l.dataset.tenantMeta) return; const h = l.getAttribute('href'); l.setAttribute('href', 'data:,'); restore.push(() => { if (h !== null) l.setAttribute('href', h); }); });
      add('link', { rel: 'icon', href: ws.faviconUrl });
    }
    const desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = desc?.content;
    const text = ws.heroSubtitle || `${site.brandName} customer website`;
    if (desc) { desc.content = text; restore.push(() => { if (prevDesc !== undefined) desc.content = prevDesc; }); } else add('meta', { name: 'description', content: text });
    return () => { document.title = prevTitle; added.forEach((e) => e.remove()); restore.forEach((r) => r()); };
  }, [site.brandName, ws.fontKey, ws.faviconUrl, ws.heroSubtitle]);
  useEffect(() => {
    let m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !m;
    const prev = m?.content;
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.content = themeColor;
    const el = m;
    const prevBody = document.body.style.background;
    document.body.style.background = themeColor;
    document.documentElement.classList.add('s-smooth');
    return () => { document.body.style.background = prevBody; document.documentElement.classList.remove('s-smooth'); if (created) el.remove(); else if (prev !== undefined) el.content = prev; };
  }, [themeColor]);
}
