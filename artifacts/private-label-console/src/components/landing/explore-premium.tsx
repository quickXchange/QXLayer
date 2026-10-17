import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, CircleDot, Plug } from 'lucide-react';
import type { LandingProduct } from '@workspace/api-client-react';
import { ShowcaseScene } from './showcase-scenes';
import { ProductScene } from './product-scenes';
import { CaptureViewer, type ViewerItem } from './capture-viewer';
import { FALLBACK, MOCKS, type Mock } from './explore-data';
import { cardPresentation } from './explore-visual-model';
import '@/styles/explore-premium.css';

type G = { title?: string; caption?: string; imageUrl?: string; mediaKind?: string; device?: string; sourceLabel?: string };

export function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
  return <div className="xp-browser"><div className="xp-bar"><i /><i /><i /><span className="xp-url">{url}</span></div>{children}</div>;
}

function Img({ src, alt }: { src: string; alt: string }) {
  const [bad, setBad] = useState(false);
  if (bad) return <div className="xp-img grid min-h-[12rem] place-items-center p-6 text-center text-xs" style={{ color: 'var(--xp-mut)' }}>Image unavailable</div>;
  return <img className="xp-img" src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}

export const concept = (p: LandingProduct): Mock => ((p.explore as unknown as { conceptVisual?: Mock } | undefined)?.conceptVisual) ?? MOCKS[p.key] ?? FALLBACK;
const PHONE_FIRST = ['ios_app', 'android_app', 'telegram_bot', 'telegram_mini_app', 'whatsapp_bot'];
const CHAT = ['telegram_bot', 'whatsapp_bot', 'telegram_mini_app'];
const Concept = () => <span className="xp-cbadge">Concept</span>;
const WARN = /Pending|Await|Wait|Draft|Review|Sync|Start|Degr|Concept|Queue|Sched|Frozen/i;

export const visibleGallery = (g: G[] & { visible?: boolean }[]) => (g as (G & { visible?: boolean })[]).filter((x) => x.visible !== false);
export const captureOf = (g: G[]) => g.find((x) => x.mediaKind === 'application_capture' && x.imageUrl);

function Table({ m }: { m: Mock }) {
  return <div className="xp-tbl">
    <div className="xp-tr h">{m.cols.map((c) => <span key={c}>{c}</span>)}</div>
    {m.rows.map((r) => <div key={r[0]} className="xp-tr">{r.map((c, i) => <span key={i}>{i === 3 ? <em className={`xp-st ${WARN.test(c) ? 'w' : ''}`}>{c}</em> : c}</span>)}</div>)}
  </div>;
}

function CardArt({ m }: { m: Mock }) {
  const card = cardPresentation(m.rows);
  return (
    <div className="xp-cardart">
      <div className="xp-card"><b>Orvex</b><i className="xp-chip" /><span className="xp-pan">•••• •••• •••• {card.lastFour}</span><span className="xp-cn"><small>Cardholder</small>{card.primaryHolder}</span></div>
      <div className="xp-card v2"><b>Virtual</b><span className="xp-pan">•••• •••• •••• 1190</span><span className="xp-cn"><small>Cardholder</small>{card.secondaryHolder}</span></div>
      <div className="xp-ctl"><h4>{m.title} <Concept /></h4>{m.phone.items.map(([a, b]) => <div key={a} className="xp-ph-row"><span>{a}</span><span>{b}</span></div>)}<Table m={m} /></div>
    </div>
  );
}

export function MockDash({ m, tone = 0 }: { m: Mock; tone?: number }) {
  const bars = tone ? [...m.bars].reverse() : m.bars;
  return (
    <div className="xp-dash">
      <div className="xp-side"><b>Orvex</b>{m.nav.map((n, i) => <span key={n} className={i === tone % m.nav.length ? 'on' : ''}>{n}</span>)}</div>
      <div className="xp-main">
        <h4>{m.title} <Concept /></h4>
        <div className="xp-kpis">{m.kpis.map(([l, v, d]) => <div key={l} className="xp-kpi"><small>{l} (sample)</small><strong>{v}</strong>{d && <em>{d}</em>}</div>)}</div>
        <div className="xp-chart" aria-hidden="true">{bars.map((b, i) => <i key={i} style={{ height: `${b}%` }} />)}</div>
        <Table m={m} />
      </div>
    </div>
  );
}

export function ConceptArt({ p, m, tone = 0 }: { p: LandingProduct; m: Mock; tone?: number }) {
  if (p.key === 'crypto_card') return <CardArt m={m} />;
  return <ProductScene k={p.key} m={m} fallback={<MockDash m={m} tone={tone} />} />;
}

export function MockPhone({ m, k = '', className = '' }: { m: Mock; k?: string; className?: string }) {
  const p = m.phone;
  const chat = CHAT.includes(k);
  return (
    <div className={`xp-phone ${chat ? 'chat' : ''} ${className}`} aria-hidden="true">
      <h5>{p.title} <Concept /></h5>
      {chat ? <>
        <div className="xp-bub in">{p.hero[0]}: {p.hero[1]}<small>{p.sub}</small></div>
        <div className="xp-kb">{p.items.map(([a]) => <span key={a}>{a}</span>)}</div>
        <div className="xp-bub out">{p.items[0][0]}</div>
        <div className="xp-bub in">{p.items[0][1]}</div>
      </> : <>
        <div className="xp-ph-hero"><small>{p.hero[0]}</small><strong>{p.hero[1]}</strong><small>{p.sub}</small></div>
        {p.items.map(([a, b]) => <div key={a} className="xp-ph-row"><span>{a}</span><span>{b}</span></div>)}
      </>}
      <div className="xp-ph-cta">{p.cta}</div>
    </div>
  );
}

const conceptNote = (p: LandingProduct) => (p.readiness === 'sandbox_only' ? 'Sandbox preview. No funds move.' : 'Coming Soon concept. Not an operating product.');
const CAP_NOTE = 'Actual shared Exchange sandbox capture. Fictitious records, no live funds.';

function useNarrow() {
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => { const q = window.matchMedia('(max-width: 700px)'); const f = () => setN(q.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, []);
  return n;
}
export const NOVAX_HOST = 'novax.example';
export const novaxLabel = (l: string) => `NovaX Exchange, fictional demo (not a real client). ${l}`;

export function ExploreHeroVisual({ p, url, capture, gallery }: { p: LandingProduct; url?: string; capture?: G; gallery?: G[] }) {
  const m = concept(p);
  const narrow = useNarrow();
  const src = url || capture?.imageUrl;
  const phoneFirst = PHONE_FIRST.includes(p.key);
  const ex = p.key === 'crypto_exchange';
  if (src) {
    if (url) return <div className="xp-stage" data-testid="visual-product-hero"><BrowserFrame url={m.host}><Img src={src} alt={`${p.name} hero`} /></BrowserFrame></div>;
    const caps = (gallery ?? []).filter((x) => x.mediaKind === 'application_capture' && x.imageUrl);
    const phoneCap = caps.find((x) => x.device === 'phone');
    const deskCap = caps.find((x) => x.device !== 'phone');
    const host = ex ? NOVAX_HOST : m.host;
    const raw = (c?: G) => c?.sourceLabel || CAP_NOTE;
    const lab = (c?: G) => (ex ? novaxLabel(raw(c)) : raw(c));
    const usePhone = (narrow && phoneCap) || (!deskCap && (phoneCap || capture?.device === 'phone'));
    if (usePhone) {
      const pc = phoneCap ?? capture;
      return <div className="xp-stage" data-testid="visual-product-hero"><div className="xpv-stage"><div className="xpv-phone big"><Img src={pc!.imageUrl!} alt={`${p.name} capture`} /></div></div><p className="xp-label s-muted">{lab(pc)}</p></div>;
    }
    const dc = deskCap ?? capture;
    return (
      <div className="xp-stage xp-herocap" data-testid="visual-product-hero">
        <BrowserFrame url={host}><Img src={dc!.imageUrl!} alt={`${p.name} capture`} /></BrowserFrame>
        {phoneCap && !narrow && <div className="xpv-phone xp-herophone"><Img src={phoneCap.imageUrl!} alt={`${p.name} phone capture`} /></div>}
        <p className="xp-label s-muted">{lab(dc)}</p>
      </div>
    );
  }
  return (
    <div className="xp-stage" data-testid="visual-product-hero">
      {phoneFirst
        ? <ConceptArt p={p} m={m} />
        : <><BrowserFrame url={m.host}><ConceptArt p={p} m={m} /></BrowserFrame><MockPhone m={m} k={p.key} className="side xp-float" /></>}
      <p className="xp-label s-muted">{conceptNote(p)}</p>
    </div>
  );
}

export function ExploreShowcase({ p, gallery }: { p: LandingProduct; gallery: G[] }) {
  const m = concept(p);
  const real = gallery.filter((g) => g.imageUrl);
  const rows: ReactNode[] = real.map((g, i) => {
    const captured = g.mediaKind === 'application_capture';
    const label = captured ? (g.sourceLabel || CAP_NOTE) : (g.sourceLabel || conceptNote(p));
    const phone = g.device === 'phone';
    const vis = phone
      ? <div className="xp-duo"><div className="xp-phone" style={{ padding: 0, aspectRatio: 'auto', maxWidth: '16rem' }}><Img src={g.imageUrl!} alt={g.title || p.name} /></div></div>
      : <BrowserFrame url={m.host}><Img src={g.imageUrl!} alt={g.title || p.name} /></BrowserFrame>;
    return <Row key={`g${i}`} i={i} title={g.title || p.name} body={g.caption || m.story} label={label} id={i}>{vis}</Row>;
  });
  if (real.length === 0) {
    const pf = PHONE_FIRST.includes(p.key);
    const dash = <Row key="d1" i={0} id={0} title={m.title} body={m.story} label={conceptNote(p)}><BrowserFrame url={m.host}><ConceptArt p={p} m={m} /></BrowserFrame></Row>;
    const ph = <Row key="d2" i={1} id={1} title={`${p.name} on a phone`} body={`${m.phone.title}: ${m.phone.sub}.`} label={conceptNote(p)}><div className="xp-duo"><MockPhone m={m} k={p.key} /><MockPhone k={p.key} m={{ ...m, phone: { ...m.phone, title: m.nav[1] ?? m.phone.title, hero: [m.kpis[1]?.[0] ?? 'Total', m.kpis[1]?.[1] ?? '-'] } }} /></div></Row>;
    rows.push(...(pf ? [ph, dash] : [dash, ph]));
    rows.push(<Row key="d3" i={2} id={2} title="Composed product scene" body="The surfaces a customer and an operator would each see, arranged together." label={conceptNote(p)}><ShowcaseScene productKey={p.key} label={conceptNote(p)} /></Row>);
  }
  return (
    <section id="showcase" className="xp-sec" aria-labelledby="xp-sc-h" data-testid="section-showcase"><div className="xp-wrap">
      <p className="xp-eye">Product showcase</p><h2 id="xp-sc-h" className="xp-h2">See {p.name} the way your customers and operators will</h2>
      {real.length > 0 ? <CaptureViewer name={p.name} host={p.key === 'crypto_exchange' ? NOVAX_HOST : m.host} items={real.map((g): ViewerItem => ({ title: g.title || p.name, caption: g.caption, imageUrl: g.imageUrl!, device: g.device, captured: g.mediaKind === 'application_capture', label: g.mediaKind === 'application_capture' ? (p.key === 'crypto_exchange' ? novaxLabel(g.sourceLabel || CAP_NOTE) : (g.sourceLabel || CAP_NOTE)) : (g.sourceLabel || conceptNote(p)) }))} /> : rows}
    </div></section>
  );
}

function Row({ i, title, body, label, children, id }: { i: number; title: string; body: string; label: string; children: ReactNode; id: number }) {
  return (
    <figure className={`xp-row ${i % 2 ? 'rev' : ''}`} data-testid={`figure-gallery-${id}`}>
      <figcaption><span className="xp-tag"><CircleDot size={12} />{label}</span><h3 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h3><p className="s-muted mt-3 max-w-md text-sm leading-relaxed">{body}</p></figcaption>
      <div>{children}</div>
    </figure>
  );
}

type Pt = { title: string; body: string };
export function ExploreFeatures({ p, items, benefits }: { p: LandingProduct; items: Pt[]; benefits: Pt[] }) {
  if (!items.length) return null;
  return (
    <section id="features" className="xp-sec" aria-labelledby="xp-f-h"><div className="xp-wrap xp-feat">
      <div><p className="xp-eye">Features</p><h2 id="xp-f-h" className="xp-h2">What {p.name} includes</h2>
        {benefits.length > 0 && <ul className="s-muted mt-6 space-y-3 text-sm leading-relaxed" id="benefits">{benefits.map((b) => <li key={b.title}><b style={{ color: 'inherit' }}>{b.title}.</b> {b.body}</li>)}</ul>}</div>
      <div className="xp-fl">{items.map((x) => (
        <div className="xp-fi" key={x.title} data-testid={`card-features-${x.title}`}><Plug size={18} /><div><h3>{x.title}</h3><p className="s-muted">{x.body}</p></div></div>))}</div>
    </div></section>
  );
}

export function ExploreHow({ steps }: { steps: Pt[] }) {
  const [i, setI] = useState(0);
  if (!steps.length) return null;
  const m = steps[Math.min(i, steps.length - 1)];
  return (
    <section id="how" className="xp-sec" aria-labelledby="xp-h-h"><div className="xp-wrap">
      <p className="xp-eye">How it works</p><h2 id="xp-h-h" className="xp-h2">From first look to delivery</h2>
      <div className="xp-flow mt-8">
        <div role="tablist" aria-label="Steps" className="space-y-2.5">{steps.map((s, n) => (
          <button key={s.title} type="button" role="tab" aria-selected={n === i} className="xp-stp" onClick={() => setI(n)}><span className="s-mono s-muted text-[11px]">STEP {n + 1}</span><b>{s.title}</b>{n === i && <p className="s-muted">{s.body}</p>}</button>))}</div>
        <div className="xp-browser" role="tabpanel"><div className="xp-bar"><i /><i /><i /><span className="xp-url">step {i + 1} of {steps.length}</span></div>
          <div className="p-6 sm:p-8" style={{ minHeight: '15rem' }}><p className="s-mono text-xs" style={{ color: 'var(--xp-v2)' }}>0{i + 1}</p><h3 className="mt-3 text-2xl font-semibold" style={{ color: 'var(--xp-txt)' }}>{m.title}</h3><p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: 'var(--xp-mut)' }}>{m.body}</p>
            <div className="mt-8 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgb(255 255 255/.1)' }}><i className="block h-full rounded-full" style={{ width: `${((i + 1) / steps.length) * 100}%`, background: 'var(--xp-v)', transition: 'width .4s' }} /></div></div></div>
      </div>
    </div></section>
  );
}

export function ExploreIntegrations({ p, items, useCases }: { p: LandingProduct; items: Pt[]; useCases: Pt[] }) {
  if (!items.length && !useCases.length) return null;
  const sandbox = p.readiness === 'sandbox_only';
  return (
    <section id="integrations" className="xp-sec" aria-labelledby="xp-i-h"><div className="xp-wrap xp-int">
      <div><p className="xp-eye">Integrations</p><h2 id="xp-i-h" className="xp-h2">Where it connects</h2>
        <p className="s-muted xp-lead text-sm">Conceptual areas only. Listing here does not mean a live connection exists.</p>
        {useCases.length > 0 && <div className="xp-use" id="use-cases">{useCases.map((u) => <span key={u.title} title={u.body}>{u.title}</span>)}</div>}</div>
      <div>{items.map((x) => (
        <div className="xp-ir" key={x.title} data-testid={`card-integrations-${x.title}`}><b>{x.title}</b><span className="xp-tag">{sandbox ? 'Configuration' : 'Concept'}</span><p className="s-muted">{x.body}</p></div>))}</div>
    </div></section>
  );
}

export function ExploreGetStarted({ p, exchange }: { p: LandingProduct; exchange: boolean }) {
  return (
    <section id="get-started" className="xp-sec" aria-labelledby="xp-g-h"><div className="xp-wrap"><div className="xp-cta">
      <div><p className="xp-eye">Get started</p><h2 id="xp-g-h" className="mt-3">{exchange ? 'Configure your exchange and send the request.' : `Register interest in ${p.name}.`}</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: 'var(--xp-mut)' }}>{exchange ? 'Ordering follows the published plans. Pricing, payment verification and delivery stay operator-controlled.' : 'This is a Coming Soon concept. Continuing opens an account request, not a purchase.'}</p></div>
      <div className="flex flex-wrap gap-3">
        <Link href={exchange ? '/account/configure' : '/sign-up'} className="s-btn s-btn-primary" data-testid="link-product-cta">{exchange ? 'Get Started' : 'Request an account'}<ArrowRight size={16} /></Link>
        <Link href="/" className="s-btn s-btn-ghost">All products</Link></div>
    </div></div></section>
  );
}
