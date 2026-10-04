import type { ReactElement } from 'react';
import type { LandingProduct } from '@workspace/api-client-react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { Reveal } from '@site/components/reveal';
import { ProductIcon } from './icons';
import { ProductArt } from './product-art';
import { ShowcaseScene } from './showcase-scenes';
import { billingLabel, priceText, readinessNote, setupText, statusLabel } from '@/lib/landing';

const MAJOR = new Set(['crypto_exchange', 'crypto_payments', 'crypto_card', 'ios_app', 'android_app', 'telegram_bot', 'whatsapp_bot', 'crypto_engine', 'rpc_nodes', 'staking', 'earn', 'dex', 'cloud_mining']);

function Price({ p, big }: { p: LandingProduct; big?: boolean }) {
  const { main, sub } = priceText(p);
  const fee = setupText(p);
  return (
    <div data-testid={`text-price-${p.key}`}>
      <p className={`${big ? 'text-3xl' : 'text-lg'} font-semibold tracking-tight`}>{p.startingPrice !== null && <span className="s-mono s-muted mr-1.5 text-[10px] font-normal uppercase tracking-wider">from</span>}{main}{sub && <span className="s-muted ml-1.5 text-xs font-normal">{sub}</span>}</p>
      {fee && <p className="s-muted text-xs">Setup fee {fee}</p>}
      {big && <p className="s-muted mt-1 text-xs">Currency {p.currency} - Billing {billingLabel[p.billingPeriod]}</p>}
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
const sceneLabel = (p: LandingProduct) => p.readiness === 'sandbox_only' ? 'Illustrative product preview - Sandbox not live' : 'Illustrative product preview - Planned, not implemented';

function Showcase({ p, flip, onOpen }: { p: LandingProduct; flip: boolean; onOpen: (p: LandingProduct) => void }) {
  return (
    <section id={`product-${p.key}`} className={`sc-row ${flip ? 'sc-flip' : ''}`} data-testid={`card-product-${p.key}`} aria-labelledby={`h-${p.key}`}>
      <div className="sc-text space-y-6">
        <div className="flex items-center gap-4"><ProductIcon icon={p.icon} className="h-14 w-14" /><Status p={p} /></div>
        <h3 id={`h-${p.key}`} data-testid={`text-name-${p.key}`}>{p.name}</h3>
        <p className="s-muted max-w-lg leading-relaxed">{p.description}</p>
        <div className="sc-price space-y-3"><Price p={p} big /><p className="s-muted text-xs leading-relaxed">{readinessNote(p.readiness)}</p></div>
        <button type="button" className="s-btn s-btn-primary" onClick={() => onOpen(p)} data-testid={`button-cta-${p.key}`}>{p.ctaLabel}<ArrowUpRight size={16} /></button>
      </div>
      <div className="sc-visual"><Reveal><ShowcaseScene productKey={p.key} label={sceneLabel(p)} /></Reveal></div>
    </section>
  );
}

function Secondary({ p, onOpen }: { p: LandingProduct; onOpen: (p: LandingProduct) => void }) {
  return (
    <article id={`product-${p.key}`} className="s-card flex flex-col gap-4 p-5 scroll-mt-24" data-testid={`card-product-${p.key}`}>
      <ProductArt productKey={p.key} className="pa-banner" />
      <Status p={p} />
      <h3 className="text-xl font-semibold leading-tight" data-testid={`text-name-${p.key}`}>{p.name}</h3>
      <p className="s-muted flex-1 text-sm leading-relaxed">{p.description}</p>
      <Price p={p} />
      <button type="button" className="s-btn s-btn-ghost justify-between" onClick={() => onOpen(p)} data-testid={`button-cta-${p.key}`}>{p.ctaLabel}<ArrowRight size={16} /></button>
    </article>
  );
}

export function ProductShowcaseList({ items, onOpen }: { items: LandingProduct[]; onOpen: (p: LandingProduct) => void }) {
  const out: ReactElement[] = [];
  let group: LandingProduct[] = [];
  let n = 0;
  const flush = () => {
    if (group.length) out.push(<div key={`g-${group[0].key}`} className="sc-secondary" data-testid="grid-catalog-secondary">{group.map((p) => <Reveal key={p.key}><Secondary p={p} onOpen={onOpen} /></Reveal>)}</div>);
    group = [];
  };
  for (const p of items) {
    if (MAJOR.has(p.key)) { flush(); out.push(<Showcase key={p.key} p={p} flip={n++ % 2 === 1} onOpen={onOpen} />); }
    else group.push(p);
  }
  flush();
  return <div className="sc-list" data-testid="grid-catalog">{out}</div>;
}
