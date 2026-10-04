import { Fragment, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ArrowUpRight, RefreshCw, X } from 'lucide-react';
import type { LandingProduct } from '@workspace/api-client-react';
import { Section, SectionHead } from '@site/components/sections/common';
import { Reveal } from '@site/components/reveal';
import { ProductIcon } from './icons';
import { ArchitectureArt } from './architecture-art';
import { billingLabel, priceText, readinessNote, setupText, statusLabel } from '@/lib/landing';

const ECO = [
  ['exchange', 'Exchange', 'Markets and order books'],
  ['payments', 'Payments', 'Checkout and settlement flows'],
  ['telegram', 'Bots', 'Messaging-channel interfaces'],
  ['ios', 'Mobile Apps', 'Branded iOS and Android clients'],
  ['nodes', 'APIs', 'Programmatic access layer'],
  ['engine', 'Infrastructure', 'Engines and node operations'],
] as const;

function Price({ p, big }: { p: LandingProduct; big?: boolean }) {
  const { main, sub } = priceText(p);
  const fee = setupText(p);
  return (
    <div data-testid={`text-price-${p.key}`}>
      <p className={`${big ? 'text-2xl' : 'text-lg'} font-semibold tracking-tight`}>{p.startingPrice !== null && <span className="s-mono s-muted mr-1.5 text-[10px] font-normal uppercase tracking-wider">from</span>}{main}{sub && <span className="s-muted ml-1.5 text-xs font-normal">{sub}</span>}</p>
      {fee && <p className="s-muted text-xs">Setup fee {fee}</p>}
    </div>
  );
}

function Status({ p }: { p: LandingProduct }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="s-badge" data-testid={`status-product-${p.key}`}>{statusLabel(p.status)}</span>
      <span className="s-badge s-muted">{p.readiness === 'sandbox_only' ? 'Sandbox only' : 'Planned'}</span>
    </div>
  );
}

function Featured({ p, onOpen, className = '', big }: { p: LandingProduct; onOpen: (p: LandingProduct) => void; className?: string; big?: boolean }) {
  return (
    <Reveal className={className}>
      <article className="s-card flex h-full flex-col justify-between gap-6 p-6 md:p-8" data-testid={`card-featured-${p.key}`}>
        <div className="flex items-start justify-between gap-4"><ProductIcon icon={p.icon} className={big ? 'h-20 w-20' : 'h-14 w-14'} /><Status p={p} /></div>
        {big && <ArchitectureArt />}
        <div>
          <h3 className={`${big ? 'text-4xl md:text-5xl' : 'text-2xl'} font-semibold leading-none tracking-tight`}>{p.name}</h3>
          <p className="s-muted mt-3 max-w-md text-sm leading-relaxed">{p.description}</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Price p={p} big={big} />
          <button type="button" className="s-btn s-btn-primary" onClick={() => onOpen(p)} data-testid={`button-cta-featured-${p.key}`}>{p.ctaLabel}<ArrowUpRight size={16} /></button>
        </div>
      </article>
    </Reveal>
  );
}

function ProductModal({ p, onClose }: { p: LandingProduct; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); }
      if (e.key !== 'Tab') return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', k);
    btn.current?.focus();
    return () => {
      document.removeEventListener('keydown', k);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div className="pc-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="pc-title" aria-describedby="pc-description" className="s-card w-full max-w-lg space-y-4 p-6" style={{ background: 'var(--s-bg2)' }} data-testid="dialog-product">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4"><ProductIcon icon={p.icon} className="h-14 w-14" /><div><h3 id="pc-title" className="text-2xl font-semibold">{p.name}</h3><div className="mt-2"><Status p={p} /></div></div></div>
          <button ref={btn} type="button" className="s-iconbtn" onClick={onClose} aria-label="Close" data-testid="button-close-dialog"><X size={18} /></button>
        </div>
        <p id="pc-description" className="s-muted text-sm leading-relaxed" data-testid="text-dialog-description">{p.description}</p>
        <div className="s-card p-4"><Price p={p} big /><p className="s-muted mt-1 text-xs">Currency {p.currency} - Billing {billingLabel[p.billingPeriod]}</p></div>
        <p className="s-card p-4 text-sm leading-relaxed" data-testid="text-readiness-disclaimer">{readinessNote(p.readiness)}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="s-muted max-w-[16rem] text-xs">Continuing opens an account request. It is not a purchase of this service.</p>
          <Link href="/sign-up" className="s-btn s-btn-primary" data-testid="link-dialog-account-request">Request an account<ArrowRight size={16} /></Link>
        </div>
      </div>
    </div>
  );
}

export function PlatformCatalog({ items, loading, error, onRetry, open, setOpen }: {
  items: LandingProduct[]; loading: boolean; error: boolean; onRetry: () => void; open: LandingProduct | null; setOpen: (p: LandingProduct | null) => void;
}) {
  const by = (key: string) => items.find((p) => p.key === key);
  const mobile = items.filter((p) => p.key === 'ios_app' || p.key === 'android_app');
  const [ex, pay, eng] = ['crypto_exchange', 'crypto_payments', 'crypto_engine'].map(by);
  const skel = (n: number, h: string) => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: n }, (_, i) => <div key={i} className={`s-skel ${h}`} />)}</div>;
  return (
    <>
      <Section id="featured">
        <SectionHead eyebrow="Core products" title="The foundations, stated plainly" body="Status, price and readiness are shown exactly as published by the platform team." />
        <div className="mt-10">
          {loading ? skel(4, 'h-64') : error ? (
            <div className="s-card p-8" role="alert" data-testid="error-catalog"><p className="text-xl font-semibold">The product catalog could not be loaded</p><p className="s-muted mt-1 text-sm">No product information is shown until it can be read from the platform.</p><button type="button" className="s-btn s-btn-primary mt-5" onClick={onRetry} data-testid="button-retry-catalog"><RefreshCw size={16} />Retry</button></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              {ex && <Featured p={ex} onOpen={setOpen} big className="md:col-span-2 lg:col-span-4 lg:row-span-2" />}
              {pay && <Featured p={pay} onOpen={setOpen} className="lg:col-span-2" />}
              {eng && <Featured p={eng} onOpen={setOpen} className="lg:col-span-2" />}
              {mobile.length > 0 && (
                <Reveal className="md:col-span-2 lg:col-span-6">
                  <div className="s-card p-6 md:p-8" data-testid="card-featured-mobile">
                    <h3 className="text-2xl font-semibold tracking-tight">Mobile Apps</h3>
                    <div className="mt-5 grid gap-6 md:grid-cols-2">
                      {mobile.map((p) => (
                        <div key={p.key} className="flex flex-col gap-4 border-t pt-5" style={{ borderColor: 'var(--s-line)' }}>
                          <div className="flex items-center gap-4"><ProductIcon icon={p.icon} className="h-14 w-14" /><div><p className="text-lg font-semibold">{p.name}</p><Status p={p} /></div></div>
                          <p className="s-muted text-sm">{p.description}</p>
                          <div className="flex flex-wrap items-end justify-between gap-3"><Price p={p} /><button type="button" className="s-btn s-btn-primary" onClick={() => setOpen(p)} data-testid={`button-cta-featured-${p.key}`}>{p.ctaLabel}<ArrowUpRight size={16} /></button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section id="ecosystem" tint>
        <SectionHead eyebrow="One platform" title="Build your crypto ecosystem" body="A conceptual map of the product areas under a single platform. Availability and readiness of each product is stated in the catalog." />
        <div className="relative mt-12">
          <svg className="absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {[16.6, 50, 83.3].map((x) => <line key={x} className="pc-flow" x1={x} y1="25" x2="50" y2="50" stroke="var(--s-accent)" strokeOpacity=".4" vectorEffect="non-scaling-stroke" />)}
            {[16.6, 50, 83.3].map((x) => <line key={x + 'b'} className="pc-flow" x1={x} y1="75" x2="50" y2="50" stroke="var(--s-primary)" strokeOpacity=".5" vectorEffect="non-scaling-stroke" />)}
          </svg>
          <div className="relative grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {ECO.map(([ic, t, d], i) => (
              <Fragment key={t}>
                {i === 3 && <div className="col-span-full flex justify-center py-6"><div className="s-card pc-hub px-8 py-5 text-center"><p className="s-eyebrow">Your brand - Shared foundation</p><p className="mt-2 text-2xl font-semibold tracking-tight">White Label Core</p><p className="s-muted mt-1 text-xs">One identity. Modular products.</p></div></div>}
                <Reveal delay={i * 70}><div className="s-card flex items-center gap-4 p-5"><ProductIcon icon={ic} className="h-12 w-12 shrink-0" /><div><p className="font-semibold">{t}</p><p className="s-muted text-sm">{d}</p></div></div></Reveal>
              </Fragment>
            ))}
          </div>
        </div>
      </Section>

      <Section id="products">
        <SectionHead eyebrow="Full catalog" title="Every product, stated plainly" body="Pricing is a starting point and is shown as published. Where no price is published, pricing is on request." />
        <div className="mt-10">
          {loading ? skel(8, 'h-60') : error ? null : items.length === 0 ? (
            <div className="s-card p-10 text-center" data-testid="empty-catalog"><p className="text-xl font-semibold">No products are published right now</p><p className="s-muted mt-1 text-sm">Check back soon.</p></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="grid-catalog">
              {items.map((p, i) => (
                <Reveal key={p.key} delay={(i % 4) * 60}>
                  <article className="s-card flex h-full flex-col gap-4 p-5" data-testid={`card-product-${p.key}`}>
                    <ProductIcon icon={p.icon} className="h-11 w-11" />
                    <Status p={p} />
                    <h3 className="text-lg font-semibold leading-tight" data-testid={`text-name-${p.key}`}>{p.name}</h3>
                    <p className="s-muted line-clamp-4 flex-1 text-sm leading-relaxed">{p.description}</p>
                    <Price p={p} />
                    <button type="button" className="s-btn s-btn-ghost justify-between" onClick={() => setOpen(p)} data-testid={`button-cta-${p.key}`}>{p.ctaLabel}<ArrowRight size={16} /></button>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </Section>
      {open && <ProductModal p={open} onClose={() => setOpen(null)} />}
    </>
  );
}
