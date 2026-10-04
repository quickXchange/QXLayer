import { Fragment, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Moon, Sun, RefreshCw, ArrowUpRight } from 'lucide-react';
import { useGetPublicProductCatalog, type LandingProduct } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Logo } from '@/components/app/shell';
import { ProductIcon } from './icons';
import { ArchitectureArt } from './architecture-art';
import { glowMove, priceText, readinessNote, setupText, statusLabel, useLandingTheme, useReveal, billingLabel } from '@/lib/landing';
import '@/styles/landing.css';

const NODES = Array.from({ length: 26 }, (_, i) => ({ x: ((i * 37 + 11) % 97) + 1, y: ((i * 53 + 7) % 93) + 2 }));
const EDGES = NODES.flatMap((a, i) => NODES.slice(i + 1).map((b) => ({ a, b, d: Math.hypot(a.x - b.x, a.y - b.y) }))).filter((e) => e.d < 24);

function NetworkBg() {
  return (
    <div className="lp-bg" aria-hidden="true">
      <div className="lp-blob a" /><div className="lp-blob b" />
      <svg className="lp-net absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {EDGES.map((e, i) => <line key={i} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} vectorEffect="non-scaling-stroke" />)}
        {NODES.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r=".28" style={{ animationDelay: `${(i % 9) * 0.6}s` }} />)}
      </svg>
    </div>
  );
}

const ECO = [
  ['exchange', 'Exchange', 'Markets and order books'],
  ['payments', 'Payments', 'Checkout and settlement flows'],
  ['telegram', 'Bots', 'Messaging-channel interfaces'],
  ['ios', 'Mobile Apps', 'Branded iOS and Android clients'],
  ['nodes', 'APIs', 'Programmatic access layer'],
  ['engine', 'Infrastructure', 'Engines and node operations'],
] as const;

function Ecosystem() {
  return (
    <section className="lp-wrap py-20 md:py-28" id="ecosystem">
      <div className="lp-rv max-w-2xl">
        <p className="lp-mono lp-acc text-xs uppercase tracking-[0.2em]">One platform</p>
        <h2 className="lp-h2 mt-3">Build your crypto ecosystem</h2>
        <p className="lp-mut mt-4">A conceptual map of the product areas that sit under a single platform. Availability and readiness of each individual product is stated in the catalog below.</p>
      </div>
      <div className="relative mt-12">
        <svg className="absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[16.6, 50, 83.3].map((x) => <line key={x} className="lp-flow" x1={x} y1="25" x2="50" y2="50" stroke="hsl(var(--lp-a))" strokeOpacity=".35" vectorEffect="non-scaling-stroke" />)}
          {[16.6, 50, 83.3].map((x) => <line key={x + 'b'} className="lp-flow" x1={x} y1="75" x2="50" y2="50" stroke="hsl(var(--lp-b))" strokeOpacity=".35" vectorEffect="non-scaling-stroke" />)}
        </svg>
        <div className="relative grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {ECO.map(([ic, t, d], i) => (
            <Fragment key={t}>
            {i === 3 && <div className="lp-rv col-span-full flex justify-center py-6">
              <div className="lp-ecosystem-hub lp-glass px-8 py-5 text-center">
                <p className="lp-mono lp-acc text-[10px] uppercase tracking-[.2em]">Your brand · Shared foundation</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">White Label Core</p>
                <p className="lp-mut mt-1 text-xs">One identity. Modular products.</p>
              </div>
            </div>}
            <div className="lp-card lp-glass lp-rv flex items-center gap-4 p-5" style={{ ['--d' as string]: `${i * 70}ms` }} onPointerMove={glowMove}>
              <ProductIcon icon={ic} className="h-12 w-12 shrink-0" />
              <div><p className="font-semibold">{t}</p><p className="lp-mut text-sm">{d}</p></div>
            </div>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function Price({ p, big }: { p: LandingProduct; big?: boolean }) {
  const { main, sub } = priceText(p);
  const fee = setupText(p);
  return (
    <div data-testid={`text-price-${p.key}`}>
      <p className={`${big ? 'text-2xl' : 'text-lg'} font-semibold tracking-tight`}>{p.startingPrice !== null && <span className="lp-mono lp-mut mr-1.5 text-[10px] font-normal uppercase tracking-wider">from</span>}{main}{sub && <span className="lp-mut ml-1.5 text-xs font-normal">{sub}</span>}</p>
      {fee && <p className="lp-mut text-xs">Setup fee {fee}</p>}
    </div>
  );
}

function Status({ p }: { p: LandingProduct }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="lp-chip" style={{ color: p.status === 'available' ? 'hsl(var(--lp-a))' : 'hsl(var(--lp-b))' }} data-testid={`status-product-${p.key}`}>{statusLabel(p.status)}</span>
      <span className="lp-chip lp-mut">{p.readiness === 'sandbox_only' ? 'Sandbox only' : 'Planned'}</span>
    </div>
  );
}

function Featured({ p, onOpen, className = '', big }: { p: LandingProduct; onOpen: (p: LandingProduct) => void; className?: string; big?: boolean }) {
  return (
    <article className={`lp-card lp-glass lp-rv flex flex-col justify-between gap-6 p-6 md:p-8 ${className}`} onPointerMove={glowMove} data-testid={`card-featured-${p.key}`}>
      <div className="flex items-start justify-between gap-4">
        <ProductIcon icon={p.icon} className={big ? 'h-20 w-20' : 'h-14 w-14'} />
        <Status p={p} />
      </div>
      {big && <ArchitectureArt />}
      <div>
        <h3 className={`${big ? 'text-4xl md:text-5xl' : 'text-2xl'} font-semibold leading-none tracking-tight`}>{p.name}</h3>
        <p className="lp-mut mt-3 max-w-md text-sm leading-relaxed">{p.description}</p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Price p={p} big={big} />
        <button className="lp-btn pri" onClick={() => onOpen(p)} data-testid={`button-cta-featured-${p.key}`}>{p.ctaLabel}<ArrowUpRight className="h-4 w-4" /></button>
      </div>
    </article>
  );
}

function ProductDialog({ p, onClose }: { p: LandingProduct | null; onClose: () => void }) {
  return (
    <Dialog open={!!p} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lp-dlg max-w-lg" data-testid="dialog-product">
        {p && (<>
          <DialogHeader>
            <div className="flex items-center gap-4"><ProductIcon icon={p.icon} className="h-14 w-14" /><div><DialogTitle className="text-2xl font-semibold">{p.name}</DialogTitle><div className="mt-2"><Status p={p} /></div></div></div>
            <DialogDescription className="lp-mut pt-3 text-left text-sm leading-relaxed" data-testid="text-dialog-description">{p.description}</DialogDescription>
          </DialogHeader>
          <div className="lp-glass rounded-xl p-4">
            <Price p={p} big />
            <p className="lp-mut mt-1 text-xs">Currency {p.currency} · Billing {billingLabel[p.billingPeriod]}</p>
          </div>
          <p className="rounded-xl border p-4 text-sm leading-relaxed" style={{ borderColor: 'hsl(var(--lp-b)/.6)', background: 'hsl(var(--lp-b)/.08)' }} data-testid="text-readiness-disclaimer">{readinessNote(p.readiness)}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="lp-mut max-w-[16rem] text-xs">Continuing opens an account request. It is not a purchase of this service.</p>
            <Link href="/sign-up" className="lp-btn pri" data-testid="link-dialog-account-request">Request an account<ArrowRight className="h-4 w-4" /></Link>
          </div>
        </>)}
      </DialogContent>
    </Dialog>
  );
}

export function CatalogLanding({ preview }: { preview?: boolean }) {
  const { theme, toggle } = useLandingTheme();
  const q = useGetPublicProductCatalog({ query: { refetchInterval: 30000, refetchOnWindowFocus: true, staleTime: 0 } as never });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const items = useMemo(() => [...(q.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder), [q.data]);
  const open = items.find((p) => p.key === openKey) ?? null;
  const setOpen = (p: LandingProduct) => setOpenKey(p.key);
  const by = (key: string) => items.find((p) => p.key === key);
  const featuredKeys = ['crypto_exchange', 'crypto_payments', 'crypto_engine'];
  const mobile = items.filter((p) => p.key === 'ios_app' || p.key === 'android_app');
  const ref = useReveal<HTMLDivElement>([items.length, q.isLoading]);
  const [ex, pay, eng] = featuredKeys.map(by);

  return (
    <div className="lp" ref={ref} data-testid="page-landing">
      <NetworkBg />
      <header className="lp-wrap lp-header flex items-center justify-between gap-2 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <button className="lp-btn ghost !p-2.5" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-pressed={theme === 'dark'} data-testid="button-theme-toggle">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          {preview ? <Link href="/admin" className="lp-btn ghost" data-testid="link-back-console">Back to console</Link> : <>
            <Link href="/sign-in" className="lp-btn ghost lp-sign-in" data-testid="link-sign-in">Sign in</Link>
            <Link href="/sign-up" className="lp-btn pri" data-testid="link-sign-up">Request access</Link></>}
        </div>
      </header>

      <section className="lp-wrap pb-20 pt-14 md:pb-28 md:pt-24">
        <p className="lp-mono lp-acc lp-rv in text-xs uppercase tracking-[0.2em]">Crypto infrastructure platform</p>
        <h1 className="lp-h1 lp-rv in mt-5 max-w-5xl">Exchange, payments, engines and apps. <span className="lp-grad lp-serif font-normal italic">One platform.</span></h1>
        <p className="lp-mut lp-rv in mt-7 max-w-xl text-lg" style={{ ['--d' as string]: '120ms' }}>A catalog of white-label building blocks for crypto businesses. Each product below shows its true status, pricing and readiness as published by the platform team.</p>
        <div className="lp-rv in mt-9 flex flex-wrap gap-3" style={{ ['--d' as string]: '220ms' }}>
          <a href="#products" className="lp-btn pri" data-testid="link-explore-products">Explore the catalog<ArrowRight className="h-4 w-4" /></a>
          <a href="#ecosystem" className="lp-btn ghost" data-testid="link-view-ecosystem">View the ecosystem</a>
        </div>
        <p className="lp-mono lp-mut mt-10 max-w-lg text-[11px] uppercase tracking-wider">Sandbox environment. Nothing here executes live trading, payments or custody.</p>
      </section>

      <section className="lp-wrap pb-20 md:pb-28" id="featured">
        <div className="lp-rv mb-8 flex items-end justify-between gap-4"><h2 className="lp-h2">Core products</h2></div>
        {q.isLoading ? (
          <div className="grid gap-4 md:grid-cols-6">{[0, 1, 2, 3].map((i) => <div key={i} className="lp-glass h-64 animate-pulse rounded-2xl md:col-span-3" />)}</div>
        ) : q.isError ? (
          <div className="lp-glass rounded-2xl p-8" role="alert" data-testid="error-catalog"><p className="text-xl font-semibold">The product catalog could not be loaded</p><p className="lp-mut mt-1 text-sm">No product information is shown until it can be read from the platform.</p><button className="lp-btn pri mt-5" onClick={() => q.refetch()} data-testid="button-retry-catalog"><RefreshCw className="h-4 w-4" />Retry</button></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            {ex && <Featured p={ex} onOpen={setOpen} big className="md:col-span-2 lg:col-span-4 lg:row-span-2" />}
            {pay && <Featured p={pay} onOpen={setOpen} className="lg:col-span-2" />}
            {eng && <Featured p={eng} onOpen={setOpen} className="lg:col-span-2" />}
            {mobile.length > 0 && (
              <div className="lp-card lp-glass lp-rv p-6 md:col-span-2 lg:col-span-6 md:p-8" onPointerMove={glowMove} data-testid="card-featured-mobile">
                <h3 className="text-2xl font-semibold tracking-tight">Mobile Apps</h3>
                <div className="mt-5 grid gap-6 md:grid-cols-2">
                  {mobile.map((p) => (
                    <div key={p.key} className="flex flex-col gap-4 border-t pt-5" style={{ borderColor: 'hsl(var(--lp-line)/.6)' }}>
                      <div className="flex items-center gap-4"><ProductIcon icon={p.icon} className="h-14 w-14" /><div><p className="text-lg font-semibold">{p.name}</p><Status p={p} /></div></div>
                      <p className="lp-mut text-sm">{p.description}</p>
                      <div className="flex flex-wrap items-end justify-between gap-3"><Price p={p} /><button className="lp-btn pri" onClick={() => setOpen(p)} data-testid={`button-cta-featured-${p.key}`}>{p.ctaLabel}<ArrowUpRight className="h-4 w-4" /></button></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Ecosystem />

      <section className="lp-wrap pb-24 md:pb-32" id="products">
        <div className="lp-rv mb-10 max-w-2xl">
          <p className="lp-mono lp-acc text-xs uppercase tracking-[0.2em]">Full catalog</p>
          <h2 className="lp-h2 mt-3">Every product, stated plainly</h2>
          <p className="lp-mut mt-4">Pricing is a starting point and is shown as published. Where no price is published, pricing is on request.</p>
        </div>
        {q.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="lp-glass h-60 animate-pulse rounded-2xl" />)}</div>
        ) : q.isError ? null : items.length === 0 ? (
          <div className="lp-glass rounded-2xl p-10 text-center" data-testid="empty-catalog"><p className="text-xl font-semibold">No products are published right now</p><p className="lp-mut mt-1 text-sm">Check back soon.</p></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="grid-catalog">
            {items.map((p, i) => (
              <article key={p.key} className="lp-card lp-glass lp-rv flex flex-col gap-4 p-5" style={{ ['--d' as string]: `${(i % 4) * 60}ms` }} onPointerMove={glowMove} data-testid={`card-product-${p.key}`}>
                <div className="flex items-start justify-between"><ProductIcon icon={p.icon} className="h-11 w-11" /></div>
                <Status p={p} />
                <h3 className="text-lg font-semibold leading-tight" data-testid={`text-name-${p.key}`}>{p.name}</h3>
                <p className="lp-mut line-clamp-4 flex-1 text-sm leading-relaxed">{p.description}</p>
                <Price p={p} />
                <button className="lp-btn ghost justify-between" onClick={() => setOpen(p)} data-testid={`button-cta-${p.key}`}>{p.ctaLabel}<ArrowRight className="h-4 w-4" /></button>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="lp-wrap pb-10">
        <div className="lp-mono lp-mut border-t pt-6 text-[11px] uppercase tracking-wider" style={{ borderColor: 'hsl(var(--lp-line)/.6)' }}>Independent sandbox · account requests are not purchases · no live finance</div>
      </footer>
      <ProductDialog p={open} onClose={() => setOpenKey(null)} />
    </div>
  );
}
