import { useParams, Link } from 'wouter';
import { useGetPublicSite, getGetPublicSiteQueryKey, useGetPublicCapability, getGetPublicCapabilityQueryKey, type PublicSite } from '@workspace/api-client-react';
import { SiteShell, Unavailable, SiteSkeleton } from '@/components/site-shell';
import { humanize } from '@/lib/theme';

function useSite(slug: string) {
  return useGetPublicSite(slug, { query: { enabled: !!slug, queryKey: getGetPublicSiteQueryKey(slug), retry: false } });
}

function Gate({ slug, children }: { slug: string; children: (s: PublicSite) => React.ReactNode }) {
  const q = useSite(slug);
  if (q.isLoading) return <SiteSkeleton />;
  if (q.isError || !q.data) return <Unavailable />;
  return <SiteShell site={q.data}>{children(q.data)}</SiteShell>;
}

export function SiteHome() {
  const { slug = '' } = useParams<{ slug: string }>();
  return <Gate slug={slug}>{(site) => {
    const ws = site.websiteSettings;
    const feats = Object.entries(site.features).filter(([, v]) => v).map(([k]) => k);
    return (
      <>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-20 md:pt-28">
          <div className="rise max-w-3xl">
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--site-accent)' }}>{site.brandName}</p>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl" data-testid="text-hero-title">{ws.heroTitle}</h1>
            {ws.heroSubtitle && <p className="mt-6 max-w-2xl text-lg" style={{ color: 'var(--site-muted)' }} data-testid="text-hero-subtitle">{ws.heroSubtitle}</p>}
            {feats[0] && <Link href={`/${site.tenantSlug}/${feats[0]}`} className="mt-8 inline-block rounded-md px-5 py-3 text-sm font-medium" style={{ background: 'var(--site-primary)', color: 'var(--site-primary-fg)' }} data-testid="link-hero-cta">Explore {humanize(feats[0]).toLowerCase()}</Link>}
          </div>
          <div className="mt-14 h-1.5 w-full rounded-full" style={{ background: 'linear-gradient(90deg, var(--site-primary), var(--site-accent), var(--site-secondary))' }} />
        </section>
        {feats.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-10">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">Available here</h2>
            <div className="grid gap-px overflow-hidden rounded-lg border md:grid-cols-2" style={{ background: 'var(--site-line)', borderColor: 'var(--site-line)' }}>
              {feats.map((k, i) => (
                <Link key={k} href={`/${site.tenantSlug}/${k}`} className="block p-6 transition-opacity hover:opacity-80" style={{ background: 'var(--site-card)' }} data-testid={`card-feature-${k}`}>
                  <span className="font-mono text-xs" style={{ color: 'var(--site-accent)' }}>0{i + 1}</span>
                  <p className="mt-2 text-lg font-medium">{humanize(k)}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--site-muted)' }}>Foundation only. No transactions are available.</p>
                </Link>))}
            </div>
          </section>)}
        {site.assets.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-10">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">Supported assets and networks</h2>
            <div className="flex flex-wrap gap-2">
              {site.assets.map((a) => <span key={`${a.assetId}:${a.networkId}`} className="rounded-full border px-3 py-1.5 text-sm" style={{ borderColor: 'var(--site-line)', background: 'var(--site-card)' }} data-testid={`chip-asset-${a.assetId}-${a.networkId}`}>{a.symbol} on {a.networkName}{a.testnet ? ' (testnet)' : ''}</span>)}
            </div>
          </section>)}
      </>
    );
  }}</Gate>;
}

export function FeaturePage() {
  const { slug = '', feature = '' } = useParams<{ slug: string; feature: string }>();
  const cap = useGetPublicCapability(slug, feature, { query: { enabled: !!slug && !!feature, queryKey: getGetPublicCapabilityQueryKey(slug, feature), retry: false } });
  return <Gate slug={slug}>{(site) => {
    if (cap.isLoading) return <div className="mx-auto max-w-3xl px-5 py-24"><div className="h-40 animate-pulse rounded" style={{ background: 'var(--site-card)' }} /></div>;
    if (cap.isError || !cap.data || !site.features[feature]) return <div className="mx-auto max-w-3xl px-5 py-24" data-testid="state-feature-unavailable"><h1 className="text-3xl font-semibold tracking-tight">Not available</h1><p className="mt-3" style={{ color: 'var(--site-muted)' }}>This capability is not enabled for {site.brandName}.</p><Link href={`/${site.tenantSlug}`} className="mt-6 inline-block underline">Back to home</Link></div>;
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 rise">
        <p className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--site-accent)' }} data-testid="text-capability-status">{cap.data.status}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight" data-testid="text-capability-title">{humanize(cap.data.feature)}</h1>
        <p className="mt-5 text-lg" style={{ color: 'var(--site-muted)' }} data-testid="text-capability-message">{cap.data.message}</p>
        <p className="mt-8 rounded-md border p-4 text-sm" style={{ borderColor: 'var(--site-line)', background: 'var(--site-card)' }}>This is a foundation page. No orders, payments or transfers can be made here.</p>
      </div>
    );
  }}</Gate>;
}

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { slug = '' } = useParams<{ slug: string }>();
  return <Gate slug={slug}>{(site) => {
    const text = kind === 'privacy' ? site.websiteSettings.privacyContent : site.websiteSettings.termsContent;
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 rise">
        <h1 className="text-4xl font-semibold tracking-tight">{kind === 'privacy' ? 'Privacy policy' : 'Terms of service'}</h1>
        {text.trim() ? <div className="mt-8 whitespace-pre-wrap leading-relaxed" data-testid={`text-${kind}`}>{text}</div> : <p className="mt-8" style={{ color: 'var(--site-muted)' }} data-testid={`text-${kind}-empty`}>{site.brandName} has not published this document yet.</p>}
      </div>
    );
  }}</Gate>;
}
