import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useGetPublicProductCatalog, type LandingProduct } from '@workspace/api-client-react';
import { SiteShell } from '@site/components/site-shell';
import { Hero } from '@site/components/hero';
import { resolveCaps } from '@site/lib/capabilities';
import { PLATFORM_SITE } from '@/lib/platform-site';
import { PlatformCatalog } from './platform-catalog';

const NAV = [
  { id: 'exchange', label: 'Exchange' },
  { id: 'featured', label: 'Core products' },
  { id: 'ecosystem', label: 'Ecosystem' },
  { id: 'products', label: 'Catalog' },
];

export function CatalogLanding({ preview }: { preview?: boolean }) {
  const q = useGetPublicProductCatalog({ query: { refetchInterval: 30000, refetchOnWindowFocus: true, staleTime: 0 } as never });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const items = useMemo(() => [...(q.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder), [q.data]);
  const open = items.find((p) => p.key === openKey) ?? null;
  const caps = useMemo(() => resolveCaps(PLATFORM_SITE), []);
  const root = preview ? '/catalog-preview' : '/';
  const actions = preview
    ? <Link href="/admin" className="s-btn s-btn-ghost" data-testid="link-back-console">Back to console</Link>
    : <><Link href="/sign-in" className="s-btn s-btn-ghost" data-testid="link-sign-in">Sign in</Link><Link href="/sign-up" className="s-btn s-btn-ghost" data-testid="link-sign-up">Request access</Link></>;
  const footer = (
    <footer className="s-footer relative z-[2] mt-10 border-t" style={{ borderColor: 'var(--s-line)', background: 'var(--s-bg2)' }}>
      <div className="s-wrap flex flex-col gap-1 py-6 text-xs s-muted sm:flex-row sm:justify-between">
        <span>Private Label</span>
        <span className="s-mono uppercase tracking-widest">Sandbox environment - account requests are not purchases - no live finance</span>
      </div>
    </footer>
  );
  return (
    <div data-testid="page-landing">
      <SiteShell site={PLATFORM_SITE} ambient platform={{ root, nav: NAV, actions, footer }}>
        <Hero site={PLATFORM_SITE} caps={caps} root={root} secondary={{ id: 'products', label: 'Browse products' }} />
        <PlatformCatalog items={items} loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} open={open} setOpen={(p: LandingProduct | null) => setOpenKey(p ? p.key : null)} />
      </SiteShell>
    </div>
  );
}
