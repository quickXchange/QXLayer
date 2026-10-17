import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Check, Layers, Plug } from 'lucide-react';
import type { LandingProduct } from '@workspace/api-client-react';
import { ProductIcon } from './icons';
import { ProductArt } from './product-art';
import { ShowcaseScene } from './showcase-scenes';
import { VxCard, VxFaq, VxTabs, tabPanelProps } from './vx-ui';
import { ExchangeActions, ExchangeBranding, ExchangeJourney, ExchangeWidget } from './exchange-demo';
import { ExchangePricing } from './exchange-pricing';
import { priceText, readinessNote, setupText, statusLabel } from '@/lib/landing';
import '@/styles/vynox-marketing.css';

const note = (p: LandingProduct) => (p.readiness === 'sandbox_only' ? 'Illustrative product preview - sandbox, not live' : 'Illustrative product preview - planned, not implemented');

function Visual({ p, url, alt, idx }: { p: LandingProduct; url?: string; alt: string; idx: number }) {
  const [broken, setBroken] = useState<string | null>(null);
  if (url && broken !== url) return <img src={url} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(url)} className="aspect-[6/5] w-full rounded-[1.5rem] border object-cover" style={{ borderColor: 'var(--s-line)' }} />;
  return idx % 2 === 0 ? <ShowcaseScene productKey={p.key} label={note(p)} /> : <ProductArt productKey={p.key} className="pa-banner" />;
}

function Points({ id, eyebrow, title, items, icon }: { id: string; eyebrow: string; title: string; items: { title: string; body: string }[]; icon?: boolean }) {
  if (!items.length) return null;
  return (
    <section id={id} className="vx-sec" aria-labelledby={`${id}-h`}><div className="s-wrap">
      <p className="s-eyebrow">{eyebrow}</p><h2 id={`${id}-h`} className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
      <div className="vx-grid mt-7">{items.map((x, i) => (
        <VxCard key={i} testid={`card-${id}-${i}`}>
          {icon ? <Plug size={18} style={{ color: 'var(--s-accent-ink,var(--s-accent))' }} /> : <span className="vx-num">{String(i + 1).padStart(2, '0')}</span>}
          <h3 className="mt-3 font-semibold">{x.title}</h3><p className="s-muted mt-1.5 text-sm leading-relaxed">{x.body}</p>
        </VxCard>))}</div>
    </div></section>
  );
}

export function ProductExploreTemplate({ p }: { p: LandingProduct }) {
  const e = p.explore;
  const { main, sub } = priceText(p);
  const fee = setupText(p);
  const isExchange = p.key === 'crypto_exchange';
  const gallery = e?.gallery ?? [];
  const [step, setStep] = useState('0');
  const steps = e?.steps ?? [];
  const si = Math.min(Number(step), Math.max(steps.length - 1, 0));
  return (
    <div data-testid={`page-product-${p.key}`} className="vx-wrap">
      <section className="vx-hero" aria-labelledby="vx-prod-h"><div className="s-wrap vx-hero-grid">
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
        <div className="vx-in" style={{ '--i': 3 } as never} data-testid="visual-product-hero"><Visual p={p} url={e?.heroImageUrl} alt={`${p.name} illustration`} idx={0} /></div>
      </div></section>

      <Points id="features" eyebrow="Features" title={`What ${p.name} includes`} items={e?.features ?? []} />
      <Points id="benefits" eyebrow="Benefits" title="Why teams choose it" items={e?.benefits ?? []} />

      {isExchange && <><ExchangeActions /><ExchangeWidget /><ExchangeBranding /></>}

      {steps.length > 0 && (
        <section id="how" className="vx-sec" aria-labelledby="how-h"><div className="s-wrap">
          <p className="s-eyebrow">How it works</p><h2 id="how-h" className="mt-2 text-3xl font-semibold tracking-tight">Step by step</h2>
          <div className="mt-6 overflow-x-auto pb-1"><VxTabs id="how" label="Steps" tabs={steps.map((s, i) => ({ key: String(i), label: `${i + 1}. ${s.title}` }))} value={String(si)} onChange={setStep} /></div>
          <VxCard className="mt-4"><div key={si} className="vx-panel" {...tabPanelProps('how', String(si))}><h3 className="flex items-center gap-2 text-xl font-semibold"><Layers size={18} />{steps[si].title}</h3><p className="s-muted mt-2 max-w-2xl text-sm leading-relaxed">{steps[si].body}</p></div></VxCard>
        </div></section>
      )}

      {e?.customerExperience && (
        <section id="experience" className="vx-sec" aria-labelledby="exp-h"><div className="s-wrap vx-split">
          <div><p className="s-eyebrow">Customer experience</p><h2 id="exp-h" className="mt-2 text-3xl font-semibold tracking-tight">What your customers see</h2><p className="s-muted mt-3 text-sm leading-relaxed" data-testid="text-customer-experience">{e.customerExperience}</p></div>
          <Visual p={p} url={gallery[0]?.imageUrl} alt={gallery[0]?.title || p.name} idx={1} />
        </div></section>
      )}

      {isExchange && <ExchangeJourney />}
      <Points id="integrations" eyebrow="Integrations" title="Integration concepts" items={e?.integrations ?? []} icon />
      {(e?.integrations?.length ?? 0) > 0 && <p className="s-wrap s-muted -mt-8 text-xs">Conceptual areas only. Listing here does not mean a live connection exists.</p>}
      <Points id="use-cases" eyebrow="Use cases" title="Where it fits" items={e?.useCases ?? []} />

      {gallery.length > 0 && (
        <section id="gallery" className="vx-sec" aria-labelledby="gal-h"><div className="s-wrap">
          <p className="s-eyebrow">Gallery</p><h2 id="gal-h" className="mt-2 text-3xl font-semibold tracking-tight">Previews</h2>
          <div className="vx-grid mt-7" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,20rem),1fr))' }}>{gallery.map((g, i) => (
            <figure key={i} data-testid={`figure-gallery-${i}`}><Visual p={p} url={g.imageUrl} alt={g.title} idx={i + 1} /><figcaption className="mt-3"><p className="font-semibold">{g.title}</p><p className="s-muted text-sm">{g.caption}</p></figcaption></figure>))}</div>
        </div></section>
      )}

      {(e?.faqs?.length ?? 0) > 0 && (
        <section id="faq" className="vx-sec" aria-labelledby="faq-h"><div className="s-wrap max-w-3xl">
          <p className="s-eyebrow">FAQ</p><h2 id="faq-h" className="mb-4 mt-2 text-3xl font-semibold tracking-tight">Questions</h2>
          <VxFaq items={e!.faqs} id={p.key} />
        </div></section>
      )}

      {isExchange && <ExchangePricing tiers={e?.pricingTiers} />}
      <div className="s-wrap pb-8"><p className="s-muted flex items-start gap-2 text-xs"><Check size={14} className="mt-0.5 shrink-0" />All visuals are illustrative. Nothing here is a live service, customer result or financial offer.</p></div>
    </div>
  );
}
