import { Link } from 'wouter';
import { ArrowRight, Check } from 'lucide-react';
import type { LandingProduct } from '@workspace/api-client-react';
import { ProductIcon } from './icons';
import { VxFaq } from './vx-ui';
import { captureOf, visibleGallery, ExploreFeatures, ExploreGetStarted, ExploreHeroVisual, ExploreHow, ExploreIntegrations, ExploreShowcase } from './explore-premium';
import { ExchangeActions, ExchangeBranding, ExchangeJourney, ExchangeWidget } from './exchange-demo';
import { ExchangePricing } from './exchange-pricing';
import { priceText, readinessNote, setupText, statusLabel } from '@/lib/landing';
import '@/styles/vynox-marketing.css';

export function ProductExploreTemplate({ p }: { p: LandingProduct }) {
  const e = p.explore;
  const { main, sub } = priceText(p);
  const fee = setupText(p);
  const isExchange = p.key === 'crypto_exchange';
  const gallery = visibleGallery((e?.gallery ?? []) as never) as never as { imageUrl?: string; mediaKind?: string; device?: string; sourceLabel?: string }[];
  const vis = ((e as unknown as { sectionVisibility?: Record<string, boolean> } | undefined)?.sectionVisibility ?? {}) as Record<string, boolean | undefined>;
  const on = (k: string) => vis[k] !== false;
  const cap = captureOf(gallery as never);
  const heroUrl = e?.heroImageUrl || undefined;
  const capturesShown = (on('showcase') && gallery.some((g) => g.mediaKind === 'application_capture' && g.imageUrl)) || (on('heroVisual') && !heroUrl && !!cap);
  const steps = e?.steps ?? [];
  return (
    <div data-testid={`page-product-${p.key}`} className="vx-wrap">
      <section className="vx-hero" aria-labelledby="vx-prod-h"><div className="s-wrap vx-hero-grid" style={{ maxWidth: "80rem" }}>
        <div>
          <nav aria-label="Breadcrumb" className="s-muted vx-in mb-4 text-xs"><Link href="/" data-testid="link-breadcrumb-home" className="underline">Products</Link> / {p.name}</nav>
          <div className="vx-in flex flex-wrap items-center gap-2" style={{ '--i': 1 } as never}><ProductIcon icon={p.icon} className="h-9 w-9" /><span className="s-badge" data-testid="status-product">{statusLabel(p.status)}</span><span className="s-badge s-muted">{p.readiness === 'sandbox_only' ? 'Preview - sandbox only' : 'Planned'}</span></div>
          {e?.eyebrow && <p className="s-eyebrow vx-in mt-5" style={{ '--i': 2 } as never}>{e.eyebrow}</p>}
          <h1 id="vx-prod-h" className="vx-h1 vx-in mt-3" style={{ '--i': 2, fontSize: 'clamp(2rem,5vw,3.8rem)' } as never}>{e?.headline || p.name}</h1>
          <p className="s-muted vx-in mt-5 max-w-xl leading-relaxed" style={{ '--i': 3 } as never}>{e?.summary || p.description}</p>
          <div className="vx-in mt-6 flex flex-wrap items-end gap-x-6 gap-y-4" style={{ '--i': 4 } as never}>
            <div data-testid="text-product-price"><p className="text-2xl font-semibold tracking-tight">{p.startingPrice !== null && <span className="s-mono s-muted mr-1.5 text-[10px] font-normal uppercase">from</span>}{main}{sub && <span className="s-muted ml-1.5 text-xs font-normal">{sub}</span>}</p>{fee && <p className="s-muted text-xs">Setup fee {fee}</p>}</div>
            {isExchange
              ? <Link href="/account/configure" className="s-btn s-btn-primary" data-testid="link-product-get-started">Get Started<ArrowRight size={16} /></Link>
              : <Link href="/sign-up" className="s-btn s-btn-primary" data-testid="link-product-account-request">Request an account<ArrowRight size={16} /></Link>}
            <Link href="/" className="s-btn s-btn-ghost" data-testid="link-product-all">All products</Link>
          </div>
          <p className="s-muted mt-4 max-w-md text-xs" data-testid="text-readiness-disclaimer">{readinessNote(p.readiness)} {isExchange ? 'Ordering follows the published plans below.' : 'Continuing opens an account request, not a purchase of this service.'}</p>
        </div>
        {on('heroVisual') && <div className="vx-in" style={{ '--i': 3 } as never}><ExploreHeroVisual p={p} url={heroUrl} capture={cap as never} gallery={gallery as never} /></div>}
      </div></section>

      {on('showcase') && (!(e?.gallery?.length) || gallery.length > 0) && <ExploreShowcase p={p} gallery={gallery as never} />}
      {on('features') && <ExploreFeatures p={p} items={e?.features ?? []} benefits={e?.benefits ?? []} />}
      {isExchange && <><ExchangeActions /><ExchangeWidget /><ExchangeBranding /></>}
      {on('howItWorks') && <ExploreHow steps={steps} />}
      {on('experience') && e?.customerExperience && (
        <section id="experience" className="xp-sec" aria-labelledby="exp-h"><div className="xp-wrap">
          <p className="xp-eye">Customer experience</p><h2 id="exp-h" className="xp-h2">What your customers see</h2><p className="s-muted xp-lead text-sm" data-testid="text-customer-experience">{e.customerExperience}</p>
        </div></section>
      )}
      {isExchange && <ExchangeJourney />}
      {on('integrations') && <ExploreIntegrations p={p} items={e?.integrations ?? []} useCases={e?.useCases ?? []} />}
      {on('faq') && (e?.faqs?.length ?? 0) > 0 && (
        <section id="faq" className="xp-sec" aria-labelledby="faq-h"><div className="xp-wrap max-w-3xl">
          <p className="xp-eye">FAQ</p><h2 id="faq-h" className="xp-h2 mb-6">Questions</h2>
          <VxFaq items={e!.faqs} id={p.key} />
        </div></section>
      )}
      {isExchange && on('pricing') && <ExchangePricing tiers={e?.pricingTiers} />}
      {on('getStarted') && <ExploreGetStarted p={p} exchange={isExchange} />}
      <div className="s-wrap pb-8"><p className="s-muted flex items-start gap-2 text-xs"><Check size={14} className="mt-0.5 shrink-0" />{capturesShown ? 'Application captures show the shared Exchange sandbox with fictitious records and no live funds. Concept visuals, where shown, are planned and illustrative, not operating products. Nothing here is a customer result or financial offer.' : 'All visuals are illustrative concepts. Nothing here is a live service, customer result or financial offer.'}</p></div>
    </div>
  );
}
