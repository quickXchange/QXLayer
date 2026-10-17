import { useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { RefreshCw } from 'lucide-react';
import { useGetPublicProductCatalog } from '@workspace/api-client-react';
import { SiteShell } from '@site/components/site-shell';
import { BrandLogo } from '@/components/brand-logo';
import { useConsoleTheme } from '@/lib/console-theme';
import { PLATFORM_SITE } from '@/lib/platform-site';
import { QXLAYER_LIGHT_LOGO_URL, QXLAYER_LIGHT_ICON_URL } from '@/lib/brand';
import { ProductExploreTemplate } from '@/components/landing/explore-template';
import '@/styles/vynox-marketing.css';

const NAV = [{ id: 'exchange', label: 'Exchange' }, { id: 'featured', label: 'Core products' }, { id: 'ecosystem', label: 'Ecosystem' }, { id: 'products', label: 'Catalog' }];

function setMeta(sel: string, make: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(sel);
  if (!el) { el = make(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}

export default function ProductExplorePage() {
  useConsoleTheme();
  const { productKey = '' } = useParams<{ productKey: string }>();
  const q = useGetPublicProductCatalog({ query: { refetchInterval: 8000, refetchOnWindowFocus: true, staleTime: 0 } as never });
  const p = q.data?.find((x) => x.key === productKey) ?? null;
  const title = p ? `${p.name} | VYNOX LAYER` : 'Product | VYNOX LAYER';
  const desc = p ? (p.explore?.summary || p.description).slice(0, 300) : 'VYNOX LAYER crypto infrastructure marketplace.';
  const name = p?.name; const key = p?.key;
  useEffect(() => {
    if (q.isLoading) return;
    // SiteShell applies its own document meta in a parent effect; apply ours after it.
    const t = window.setTimeout(() => {
      document.title = q.isError ? 'Product | VYNOX LAYER' : (name ? title : 'Product not found | VYNOX LAYER');
      const d = name ? desc : 'This product is not available.';
      setMeta('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }), 'content', d);
      const og = (k: string, v: string) => setMeta(`meta[property="${k}"]`, () => { const m = document.createElement('meta'); m.setAttribute('property', k); return m; }, 'content', v);
      og('og:title', document.title); og('og:description', d); og('og:type', 'website');
      setMeta('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', `${import.meta.env.BASE_URL.replace(/\/$/, '')}/products/${encodeURIComponent(productKey)}`);
    }, 60);
    return () => window.clearTimeout(t);
  }, [q.isLoading, q.isError, name, key, title, desc, productKey]);
  useEffect(() => {
    if (!p || !window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 120);
    return () => window.clearTimeout(t);
  }, [p?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const actions = <><Link href="/sign-in" className="s-btn s-btn-ghost" data-testid="link-sign-in">Sign in</Link><Link href="/sign-up" className="s-btn s-btn-ghost" data-testid="link-sign-up">Get Started</Link></>;
  const footer = <footer className="s-footer relative z-[2] mt-10 border-t" style={{ borderColor: 'var(--s-line)', background: 'var(--s-bg2)' }}><div className="s-wrap flex flex-col gap-1 py-6 text-xs s-muted sm:flex-row sm:justify-between"><span className="flex items-center gap-2"><BrandLogo size={24} />VYNOX LAYER</span><span className="s-mono uppercase tracking-widest">Illustrative previews · Sandbox</span></div></footer>;
  return (
    <SiteShell site={PLATFORM_SITE} ambient platform={{ root: '/', nav: NAV, actions, footer, lightLogoUrl: QXLAYER_LIGHT_LOGO_URL, lightFaviconUrl: QXLAYER_LIGHT_ICON_URL,
      headerBrand: <BrandLogo size={60} className="w-[150px] min-[360px]:w-[168px] sm:w-[192px] lg:w-[204px]" style={{ width: undefined, height: 'auto' }} /> }}>
      {q.isLoading ? <div className="s-wrap space-y-4 py-20" aria-busy="true"><div className="s-skel h-10 w-2/3" /><div className="s-skel h-64" /></div>
        : q.isError ? <div className="s-wrap py-24"><div className="s-card p-8" role="alert" data-testid="error-product"><p className="text-xl font-semibold">The product could not be loaded</p><button type="button" className="s-btn s-btn-primary mt-5" onClick={() => void q.refetch()} data-testid="button-retry-product"><RefreshCw size={16} />Retry</button></div></div>
        : !p ? <div className="s-wrap py-24 text-center" data-testid="notfound-product"><p className="s-eyebrow">404</p><h1 className="vx-h1 mt-3" style={{ fontSize: 'clamp(2rem,5vw,3.4rem)' }}>Product not found</h1><p className="s-muted mx-auto mt-3 max-w-md text-sm">No published product matches this address. It may be hidden or may not exist.</p><Link href="/" className="s-btn s-btn-primary mt-6" data-testid="link-notfound-home">Browse products</Link></div>
        : <ProductExploreTemplate p={p} />}
    </SiteShell>
  );
}
