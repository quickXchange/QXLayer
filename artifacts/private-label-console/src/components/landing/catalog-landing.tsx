import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useGetPublicProductCatalog, type LandingProduct } from '@workspace/api-client-react';
import { SiteShell } from '@site/components/site-shell';
import { Hero } from '@site/components/hero';
import { resolveCaps } from '@site/lib/capabilities';
import { PLATFORM_SITE } from '@/lib/platform-site';
const PlatformCatalog = lazy(() => import('./platform-catalog').then(m => ({ default: m.PlatformCatalog })));
import { LiveDemo } from './live-demo';
import { BrandLogo } from '@/components/brand-logo';
import { QXLAYER_LIGHT_LOGO_URL, QXLAYER_LIGHT_ICON_URL } from '@/lib/brand';
import { useConsoleTheme } from '@/lib/console-theme';

const NAV = [
  { id: 'exchange', label: 'Exchange' },
  { id: 'featured', label: 'Core products' },
  { id: 'ecosystem', label: 'Ecosystem' },
  { id: 'products', label: 'Catalog' },
];

export function CatalogLanding({ preview }: { preview?: boolean }) {
  // Shared document tokens also theme catalog dialogs, toast portals and scrollbars.
  useConsoleTheme();
  const q = useGetPublicProductCatalog({ query: { refetchInterval: 5000, refetchOnWindowFocus: true, staleTime: 0 } as never });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const items = useMemo(() => [...(q.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder), [q.data]);
  const open = items.find((p) => p.key === openKey) ?? null;
  const caps = useMemo(() => resolveCaps(PLATFORM_SITE), []);
  const root = preview ? '/catalog-preview' : '/';
  const actions = preview
    ? <Link href="/admin" className="s-btn s-btn-ghost" data-testid="link-back-console">Back to console</Link>
    : <><Link href="/sign-in" className="s-btn s-btn-ghost" data-testid="link-sign-in">Sign in</Link><Link href="/sign-up" className="s-btn s-btn-ghost" data-testid="link-sign-up">Get Started</Link></>;
  const footer = (
    <footer className="s-footer relative z-[2] mt-10 border-t" style={{ borderColor: 'var(--s-line)', background: 'var(--s-bg2)' }}>
      <div className="s-wrap flex flex-col gap-1 py-6 text-xs s-muted sm:flex-row sm:justify-between">
        <span className="flex items-center gap-2"><BrandLogo size={24} />VYNOX LAYER · <a href="/private-label-website/novax-live-demo" data-testid="link-live-demo" className="underline">Live Demo (sandbox)</a></span>
        <span className="s-mono uppercase tracking-widest">Exchange Sandbox · White Label purchases require approved prices and verified payment</span>
      </div>
    </footer>
  );
  return (
    <div data-testid="page-landing">
      <SiteShell site={PLATFORM_SITE} ambient platform={{ root, nav: NAV, actions, footer, lightLogoUrl: QXLAYER_LIGHT_LOGO_URL, lightFaviconUrl: QXLAYER_LIGHT_ICON_URL,
        headerBrand: <BrandLogo size={60} className="w-[150px] min-[360px]:w-[168px] sm:w-[192px] lg:w-[204px]" style={{ width: undefined, height: 'auto' }} /> }}>
        <Hero site={PLATFORM_SITE} caps={caps} root={root} secondary={{ id: 'products', label: 'Browse products' }} />
        <Suspense fallback={<div className="s-wrap py-20" aria-busy="true"><div className="s-skel h-8 w-64" /></div>}>
          <PlatformCatalog items={items} loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} open={open} setOpen={(p: LandingProduct | null) => setOpenKey(p ? p.key : null)} />
        </Suspense>
        <LiveDemo />
      </SiteShell>
    </div>
  );
}
