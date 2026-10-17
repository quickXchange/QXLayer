import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowDownUp, Check, Clock, Globe, ImagePlus, Palette, ShieldAlert, Star } from 'lucide-react';
import { VxTabs, tabPanelProps, VxCard } from './vx-ui';

const SANDBOX = 'Illustrative sandbox. Sample figures only; not quotes, not transactions.';
const ACTIONS = [{ key: 'swap', label: 'Swap' }, { key: 'convert', label: 'Convert' }, { key: 'buy', label: 'Buy' }, { key: 'sell', label: 'Sell' }];
const CRYPTO: Record<string, number> = { BTC: 60000, ETH: 3000, USDT: 1, SOL: 150 };
const FIAT = ['EUR', 'USD', 'GBP'];
const COPY: Record<string, string> = {
  swap: 'Crypto to crypto in one step, with the destination address collected up front.',
  convert: 'A guided conversion between assets or networks with a clear amount and receive estimate.',
  buy: 'Customers pay with a fiat method and receive crypto at their wallet address.',
  sell: 'Customers send crypto and receive a fiat payout to their chosen method.',
};

function Panel({ action }: { action: string }) {
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState(action === 'buy' ? 'EUR' : action === 'sell' ? 'ETH' : 'BTC');
  const [to, setTo] = useState(action === 'buy' ? 'BTC' : action === 'sell' ? 'EUR' : 'ETH');
  const [done, setDone] = useState(false);
  const opts = action === 'buy' ? { f: FIAT, t: Object.keys(CRYPTO) } : action === 'sell' ? { f: Object.keys(CRYPTO), t: FIAT } : { f: Object.keys(CRYPTO), t: Object.keys(CRYPTO) };
  const usd = (c: string) => (CRYPTO[c] ?? 1);
  const out = useMemo(() => { const n = Number(amount); if (!Number.isFinite(n) || n <= 0) return null; return (n * usd(from)) / usd(to); }, [amount, from, to]);
  const same = from === to;
  const reset = () => setDone(false);
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end" data-testid={`demo-panel-${action}`}>
      <label className="block text-sm"><span className="s-muted">You {action === 'buy' ? 'pay' : 'send'}</span>
        <div className="mt-1 flex gap-2"><input className="vx-field" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); reset(); }} aria-label="Amount" data-testid={`input-demo-amount-${action}`} />
          <select className="vx-field !w-28" value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} aria-label="From asset">{opts.f.map((c) => <option key={c}>{c}</option>)}</select></div></label>
      <button type="button" className="s-iconbtn mx-auto" aria-label="Reverse direction" onClick={() => { if (action === 'swap' || action === 'convert') { setFrom(to); setTo(from); reset(); } }} disabled={action === 'buy' || action === 'sell'}><ArrowDownUp size={16} /></button>
      <div className="block text-sm"><span className="s-muted">You receive (sample estimate)</span>
        <div className="mt-1 flex gap-2"><output className="vx-field flex items-center" data-testid={`text-demo-receive-${action}`}>{same ? 'Choose different assets' : out === null ? 'Enter an amount' : out.toLocaleString(undefined, { maximumFractionDigits: 6 })}</output>
          <select className="vx-field !w-28" value={to} onChange={(e) => { setTo(e.target.value); reset(); }} aria-label="To asset">{opts.t.map((c) => <option key={c}>{c}</option>)}</select></div></div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-3">
        <button type="button" className="s-btn s-btn-primary" disabled={same || out === null} onClick={() => setDone(true)} data-testid={`button-demo-create-${action}`}>Create sample order</button>
        <p className="s-muted text-xs" role="status">{done ? 'Sample order created locally. Nothing was sent and no funds move.' : SANDBOX}</p>
      </div>
    </div>
  );
}

export function ExchangeActions() {
  const [a, setA] = useState('swap');
  return (
    <section id="demo" className="vx-sec" aria-labelledby="vx-act-h" data-testid="section-exchange-actions"><div className="s-wrap">
      <p className="s-eyebrow">Four customer actions</p>
      <h2 id="vx-act-h" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Swap, Convert, Buy and Sell</h2>
      <div className="mt-6"><VxTabs id="actions" label="Customer actions" tabs={ACTIONS} value={a} onChange={setA} /></div>
      <VxCard className="mt-5"><div key={a} className="vx-panel" {...tabPanelProps('actions', a)}>
        <p className="s-muted mb-5 max-w-2xl text-sm">{COPY[a]}</p><Panel key={a} action={a} />
      </div></VxCard>
    </div></section>
  );
}

export function ExchangeWidget() {
  const [mode, setMode] = useState('compact');
  return (
    <section id="widget" className="vx-sec" aria-labelledby="vx-wid-h" data-testid="section-exchange-widget"><div className="s-wrap vx-split">
      <div><p className="s-eyebrow">Widget</p>
        <h2 id="vx-wid-h" className="mt-2 text-3xl font-semibold tracking-tight">Place the exchange inside any page</h2>
        <p className="s-muted mt-3 text-sm leading-relaxed">A compact exchange form that sits within an existing website. This preview is a static illustration; no embed code or script is issued from this page.</p>
        <div className="mt-5"><VxTabs id="widget" label="Widget layout" tabs={[{ key: 'compact', label: 'Compact' }, { key: 'wide', label: 'Wide' }]} value={mode} onChange={setMode} /></div></div>
      <div className="s-card p-4" {...tabPanelProps('widget', mode)}>
        <div className="mb-3 flex gap-1.5" aria-hidden="true"><i className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--s-line)' }} /><i className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--s-line)' }} /><i className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--s-line)' }} /></div>
        <div className="s-muted mb-3 space-y-2" aria-hidden="true"><div className="s-skel h-4 w-2/3" /><div className="s-skel h-4 w-1/2" /></div>
        <div className={`vx-panel grid gap-3 rounded-2xl border p-4 ${mode === 'wide' ? 'sm:grid-cols-3' : ''}`} style={{ borderColor: 'var(--s-accent)', background: 'var(--s-bg2)' }} key={mode}>
          <div className="vx-field">100 EUR</div><div className="vx-field">Sample BTC estimate</div><div className="s-btn s-btn-primary justify-center" aria-hidden="true">Exchange</div>
        </div>
        <p className="s-muted mt-3 text-xs">{SANDBOX}</p>
      </div>
    </div></section>
  );
}

type Brand = { name: string; color: string; domain: string; dark: boolean; logo: string | null };
let brand: Brand = { name: 'Orvex', color: '#0f8b8d', domain: 'swap.orvex.example', dark: false, logo: null };
const subs = new Set<() => void>();
const DEFAULT_BRAND: Brand = { name: 'Orvex', color: '#0f8b8d', domain: 'swap.orvex.example', dark: false, logo: null };
const PRESETS = [['Teal', '#0f8b8d'], ['Ember', '#d9532b'], ['Indigo', '#4a46d8'], ['Moss', '#4d7c3a'], ['Plum', '#a23b78']];
const resetBrand = () => { if (brand.logo) URL.revokeObjectURL(brand.logo); brand = { ...DEFAULT_BRAND }; subs.forEach((f) => f()); };
const setBrand = (p: Partial<Brand>) => {
  if (p.logo !== undefined && brand.logo && brand.logo !== p.logo) URL.revokeObjectURL(brand.logo);
  brand = { ...brand, ...p }; subs.forEach((f) => f());
};
const useBrand = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => brand, () => brand);
const HEX = /^#[0-9a-fA-F]{6}$/;
const SAMPLE_ADDR = 'SAMPLE-ADDRESS-NOT-A-REAL-WALLET';

function Mark({ b, size = 28 }: { b: Brand; size?: number }) {
  const c = HEX.test(b.color) ? b.color : '#7c5cff';
  return b.logo
    ? <img src={b.logo} alt="" className="shrink-0 rounded-lg object-contain" style={{ width: size, height: size, background: '#fff' }} />
    : <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-lg font-bold text-white" style={{ width: size, height: size, background: c, fontSize: size * 0.45 }}>{(b.name.trim()[0] ?? 'B').toUpperCase()}</span>;
}

function SiteFrame({ b, children, label }: { b: Brand; children: ReactNode; label: string }) {
  const bg = b.dark ? '#0d0f1f' : '#f7f6ff'; const fg = b.dark ? '#eceaff' : '#1b1740';
  return (
    <div className="overflow-hidden rounded-2xl border" style={{ background: bg, color: fg, borderColor: 'var(--s-line)' }} role="group" aria-label={label}>
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4" style={{ borderColor: 'color-mix(in srgb,currentColor 14%,transparent)' }}>
        <span className="flex min-w-0 items-center gap-2 font-semibold"><Mark b={b} /><span className="truncate">{b.name || 'Your Brand'}</span></span>
        <span className="flex min-w-0 items-center gap-1 truncate text-[11px] opacity-70"><Globe size={12} className="shrink-0" /><span className="truncate">{b.domain}</span></span>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
const line = { borderColor: 'color-mix(in srgb,currentColor 14%,transparent)' };
const Row = ({ k, v }: { k: string; v: ReactNode }) => <div className="flex justify-between gap-3 border-b py-2 text-sm" style={line}><span className="opacity-65">{k}</span><span className="min-w-0 break-words text-right font-medium">{v}</span></div>;
const Btn = ({ b, children, onClick }: { b: Brand; children: ReactNode; onClick?: () => void }) => <button type="button" onClick={onClick} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5" style={{ background: HEX.test(b.color) ? b.color : '#7c5cff' }}>{children}</button>;
const Pill = ({ children, tone }: { children: ReactNode; tone: string }) => <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: `color-mix(in srgb,${tone} 18%,transparent)`, color: tone }}>{children}</span>;
const AMBER = '#b7791f', GREEN = '#1f9d63', BLUE = '#3b6fd4';
const SAMPLE = 'Sample data. Not a real order, wallet or charge.';

function Qr() {
  const cells = useMemo(() => Array.from({ length: 169 }, (_, i) => ((i * 7 + (i >> 3) * 5 + (i % 13) * 3) % 5) < 2), []);
  return <div aria-hidden="true" className="grid shrink-0 gap-px rounded-lg bg-white p-2" style={{ gridTemplateColumns: 'repeat(13,1fr)', width: 104, height: 104 }}>{cells.map((on, i) => <i key={i} style={{ background: on ? '#1b1740' : '#fff' }} />)}</div>;
}

function Scene({ k, b }: { k: string; b: Brand }) {
  const [rating, setRating] = useState(4);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const c = HEX.test(b.color) ? b.color : '#7c5cff';
  if (k === 'create') return (
    <SiteFrame b={b} label="Sample create order page">
      <h4 className="text-lg font-semibold">New exchange order</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-3" style={line}><p className="text-[11px] opacity-65">You send</p><p className="text-lg font-semibold">100.00 EUR</p></div>
        <div className="rounded-xl border p-3" style={line}><p className="text-[11px] opacity-65">You receive (sample estimate)</p><p className="text-lg font-semibold">0.001612 BTC</p></div>
      </div>
      <div className="mt-3 rounded-xl border p-3 text-sm" style={line}><p className="text-[11px] opacity-65">Receiving address</p><p className="break-all font-mono text-xs">{SAMPLE_ADDR}</p></div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><Btn b={b}>Create order</Btn><span className="text-[11px] opacity-65">{SAMPLE}</span></div>
    </SiteFrame>);
  if (k === 'view') return (
    <SiteFrame b={b} label="Sample view order page">
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-lg font-semibold">Order SAMPLE-0001</h4><Pill tone={AMBER}>Awaiting payment</Pill></div>
      <div className="mt-3"><Row k="Type" v="Buy" /><Row k="You pay" v="100.00 EUR" /><Row k="You receive" v="0.001612 BTC (sample)" /><Row k="Method" v="Sample bank transfer" /><Row k="Created" v="Sample date" /></div>
      <div className="mt-4"><Btn b={b}>Continue to payment</Btn></div>
    </SiteFrame>);
  if (k === 'pay') return (
    <SiteFrame b={b} label="Sample payment instructions">
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-lg font-semibold">Payment instructions</h4><span className="flex items-center gap-1 text-xs opacity-75"><Clock size={13} />Sample window 30:00</span></div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <Qr />
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          <p className="opacity-65 text-[11px]">Send exactly</p><p className="text-xl font-semibold">0.001612 BTC <span className="text-xs opacity-65">sample</span></p>
          <p className="opacity-65 text-[11px]">To address (placeholder)</p>
          <div className="flex items-center gap-2"><p className="min-w-0 flex-1 break-all rounded-lg border px-2.5 py-2 font-mono text-xs" style={line}>{SAMPLE_ADDR}</p>
            <button type="button" className="shrink-0 rounded-lg border px-2.5 py-2 text-xs" style={line} onClick={async () => { try { await navigator.clipboard.writeText(SAMPLE_ADDR); setCopied('copied'); } catch { setCopied('failed'); } window.setTimeout(() => setCopied('idle'), 1800); }}>{copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Clipboard unavailable' : 'Copy'}</button></div>
          <p className="text-[11px] opacity-65">Network: sample network. Do not send funds: this is an illustration.</p>
        </div>
      </div>
    </SiteFrame>);
  if (k === 'track') {
    const st: [string, string, boolean][] = [['Order created', 'Sample 10:00', true], ['Payment detected', 'Sample 10:06', true], ['Confirmations 2 of 3', 'Sample 10:11', true], ['Operator review', 'In progress', false], ['Payout', 'Pending', false]];
    return (
      <SiteFrame b={b} label="Sample order tracking">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-lg font-semibold">Order SAMPLE-0001</h4><Pill tone={BLUE}>Processing</Pill></div>
        <ol className="mt-4 space-y-0">{st.map(([t, w, d], i) => (
          <li key={t} className="relative flex gap-3 pb-4 last:pb-0">
            {i < st.length - 1 && <span aria-hidden="true" className="absolute left-[9px] top-5 h-full w-0.5" style={{ background: d ? c : 'color-mix(in srgb,currentColor 18%,transparent)' }} />}
            <span aria-hidden="true" className="relative mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-white" style={{ background: d ? c : 'transparent', border: d ? 0 : `2px solid ${c}` }}>{d && <Check size={12} />}</span>
            <div className="min-w-0"><p className="text-sm font-medium">{t}</p><p className="text-[11px] opacity-65">{w}</p></div>
          </li>))}</ol>
      </SiteFrame>);
  }
  if (k === 'done') return (
    <SiteFrame b={b} label="Sample completed order">
      <div className="py-2 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white" style={{ background: GREEN }}><Check size={28} /></span>
        <h4 className="mt-3 text-xl font-semibold">Order completed</h4><p className="mt-1 text-sm opacity-70">SAMPLE-0001 finished in this illustration.</p></div>
      <div className="mt-3"><Row k="Paid" v="100.00 EUR" /><Row k="Received" v="0.001612 BTC (sample)" /><Row k="Status" v={<Pill tone={GREEN}>Completed</Pill>} /></div>
      <p className="mt-3 text-[11px] opacity-65">{SAMPLE}</p>
    </SiteFrame>);
  if (k === 'invoice') return (
    <SiteFrame b={b} label="Sample invoice">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h4 className="text-lg font-semibold tracking-wide">INVOICE</h4><p className="font-mono text-xs opacity-70">SAMPLE-INV-0001</p></div>
        <div className="text-right text-xs opacity-75"><p>Issued: sample date</p><p>Billed to: Sample Customer</p></div>
      </div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[300px] text-sm">
        <thead><tr className="border-b text-left text-[11px] uppercase opacity-65" style={line}><th className="py-2 font-medium">Description</th><th className="text-right font-medium">Qty</th><th className="text-right font-medium">Amount</th></tr></thead>
        <tbody>{[['Buy 0.001612 BTC (sample)', '1', '100.00'], ['Service fee (sample)', '1', '1.50'], ['Network fee (sample)', '1', '0.75']].map((r) => <tr key={r[0]} className="border-b" style={line}><td className="py-2">{r[0]}</td><td className="text-right">{r[1]}</td><td className="text-right">{r[2]}</td></tr>)}</tbody>
        <tfoot><tr><td colSpan={2} className="pt-3 text-right opacity-70">Subtotal</td><td className="pt-3 text-right">102.25</td></tr><tr><td colSpan={2} className="text-right opacity-70">Tax (sample 0%)</td><td className="text-right">0.00</td></tr><tr><td colSpan={2} className="pt-1 text-right font-semibold">Total EUR</td><td className="pt-1 text-right text-base font-semibold" style={{ color: c }}>102.25</td></tr></tfoot>
      </table></div>
      <p className="mt-3 text-[11px] opacity-65">Sample invoice. Not a real charge or tax document.</p>
    </SiteFrame>);
  return (
    <SiteFrame b={b} label="Sample review panel">
      <h4 className="text-lg font-semibold">How was your exchange?</h4>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => { setRating(n); setSent(false); }} className="p-0.5"><Star size={24} fill={n <= rating ? c : 'none'} color={c} /></button>)}</div>
      <div className="mt-3 rounded-xl border p-3 text-sm opacity-80" style={line}>Placeholder comment text for illustration.</div>
      <div className="mt-3 flex flex-wrap items-center gap-3"><Btn b={b} onClick={() => setSent(true)}>Submit sample review</Btn><span role="status" className="text-[11px] opacity-70">{sent ? 'Nothing was sent. Local illustration only.' : 'Sample panel. Not a real testimonial.'}</span></div>
    </SiteFrame>);
}

function BrandSite({ b }: { b: Brand }) {
  const c = HEX.test(b.color) ? b.color : '#0f8b8d';
  const bg = b.dark ? '#0c1014' : '#fbfaf7', fg = b.dark ? '#eef2f3' : '#14201f', card = b.dark ? '#151b20' : '#ffffff';
  const [amt, setAmt] = useState('250'); const [from, setFrom] = useState('EUR'); const [to, setTo] = useState('BTC'); const [placed, setPlaced] = useState(false);
  const usd = (x: string) => CRYPTO[x] ?? ({ EUR: 1.08, USD: 1, GBP: 1.27 } as Record<string, number>)[x] ?? 1;
  const n = Number(amt); const out = Number.isFinite(n) && n > 0 && from !== to ? (n * usd(from)) / usd(to) : null;
  const assets = ['EUR', 'USD', 'GBP', ...Object.keys(CRYPTO)];
  const bd = { borderColor: `color-mix(in srgb,${fg} 14%,transparent)` };
  const name = b.name || 'Your brand';
  return (
    <div className="overflow-hidden rounded-2xl border shadow-2xl" style={{ background: bg, color: fg, borderColor: 'var(--s-line)' }} role="group" aria-label="Local customer website preview">
      <div className="flex items-center gap-2 border-b px-4 py-2.5" style={bd}><span className="flex gap-1.5" aria-hidden="true"><i className="h-2.5 w-2.5 rounded-full" style={{ background: bd.borderColor }} /><i className="h-2.5 w-2.5 rounded-full" style={{ background: bd.borderColor }} /><i className="h-2.5 w-2.5 rounded-full" style={{ background: bd.borderColor }} /></span><span className="ml-2 flex min-w-0 flex-1 items-center gap-1 truncate rounded-md px-2 py-1 font-mono text-[11px]" style={{ background: `color-mix(in srgb,${fg} 8%,transparent)` }}><Globe size={12} className="shrink-0" /><span className="truncate">https://{b.domain}</span></span></div>
      <nav className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8"><span className="flex min-w-0 items-center gap-2.5 text-lg font-bold"><Mark b={b} size={36} /><span className="truncate">{name}</span></span>
        <span className="hidden gap-6 text-sm opacity-75 sm:flex"><span>Markets</span><span>Orders</span><span>Support</span></span>
        <span className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: c }}>Sign in</span></nav>
      <div className="grid gap-8 px-4 py-8 sm:px-8 sm:py-12 lg:grid-cols-[1.05fr_1fr] lg:items-center" style={{ background: `linear-gradient(135deg,color-mix(in srgb,${c} 24%,${bg}),${bg} 70%)` }}>
        <div><p className="text-xs font-semibold uppercase tracking-[.18em]" style={{ color: c }}>{b.domain}</p>
          <h3 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Exchange crypto with <span style={{ color: c }}>{name}</span></h3>
          <p className="mt-4 max-w-md opacity-75">Swap, convert, buy and sell in a few steps. Sample figures only.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">{['Swap', 'Convert', 'Buy', 'Sell'].map((x, i) => <span key={x} className="rounded-full border px-3 py-1.5 font-semibold" style={i === 0 ? { background: c, color: '#fff', borderColor: c } : bd}>{x}</span>)}</div></div>
        <div className="rounded-2xl border p-4 shadow-xl sm:p-5" style={{ background: card, ...bd }}>
          <label className="block text-xs opacity-70">You send<span className="mt-1 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-3 text-lg font-semibold" style={bd} inputMode="decimal" value={amt} onChange={(e) => { setAmt(e.target.value); setPlaced(false); }} aria-label="Preview amount" /><select className="rounded-xl border bg-transparent px-2 font-semibold" style={bd} value={from} onChange={(e) => { setFrom(e.target.value); setPlaced(false); }} aria-label="Preview from asset">{assets.map((x) => <option key={x} style={{ color: '#14201f' }}>{x}</option>)}</select></span></label>
          <div className="my-2 text-center" style={{ color: c }}><ArrowDownUp size={18} className="mx-auto" /></div>
          <label className="block text-xs opacity-70">You receive (sample estimate)<span className="mt-1 flex gap-2"><output className="flex min-w-0 flex-1 items-center rounded-xl border px-3 py-3 text-lg font-semibold" style={bd}>{out === null ? 'Choose different assets' : out.toLocaleString(undefined, { maximumFractionDigits: 6 })}</output><select className="rounded-xl border bg-transparent px-2 font-semibold" style={bd} value={to} onChange={(e) => { setTo(e.target.value); setPlaced(false); }} aria-label="Preview to asset">{assets.map((x) => <option key={x} style={{ color: '#14201f' }}>{x}</option>)}</select></span></label>
          <button type="button" disabled={out === null} onClick={() => setPlaced(true)} className="mt-4 w-full rounded-xl px-4 py-3.5 font-semibold text-white disabled:opacity-50" style={{ background: c }}>Start exchange</button>
          <p role="status" className="mt-2 text-[11px] opacity-70">{placed ? `Sample order for ${name} created locally. Nothing was sent.` : 'Local illustration. No funds move.'}</p></div>
      </div>
      <div className="grid gap-3 px-4 py-6 sm:grid-cols-3 sm:px-8">{[['Order created', 'Awaiting payment', AMBER], ['Payment detected', 'Processing', BLUE], ['Order completed', 'Completed', GREEN]].map(([t, s2, tone]) => <div key={t} className="rounded-xl border p-4" style={{ background: card, borderLeftColor: bd.borderColor, borderRightColor: bd.borderColor, borderBottomColor: bd.borderColor, borderTopColor: c, borderTopWidth: 3 }}><p className="font-semibold">{t}</p><p className="mt-1 text-xs opacity-65">{name} / sample order</p><div className="mt-3"><Pill tone={tone}>{s2}</Pill></div></div>)}</div>
      <p className="border-t px-4 py-3 text-[11px] opacity-65 sm:px-8" style={bd}>{name} is a fictional customer brand. Illustrative browser-only preview; nothing is uploaded, saved or published. NovaX sandbox captures elsewhere are a separate fictional demo and are not rebranded here.</p>
    </div>
  );
}

export function ExchangeBranding() {
  const b = useBrand();
  const [err, setErr] = useState('');
  useEffect(() => () => { if (brand.logo) URL.revokeObjectURL(brand.logo); brand = { ...brand, logo: null }; }, []);
  const onFile = (f?: File) => {
    if (!f) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) { setErr('Use a PNG, JPG or WebP image.'); return; }
    if (f.size > 2 * 1024 * 1024) { setErr('Logo must be 2 MB or smaller.'); return; }
    setErr(''); setBrand({ logo: URL.createObjectURL(f) });
  };
  const safe = HEX.test(b.color) ? b.color : '#7c5cff';
  return (
    <section id="branding" className="vx-sec" aria-labelledby="vx-brand-h" data-testid="section-exchange-branding"><div className="s-wrap">
      <div className="max-w-4xl"><p className="s-eyebrow">Your brand, your domain</p>
        <h2 id="vx-brand-h" className="mt-2 text-3xl font-semibold tracking-tight">A personalized customer website</h2>
        <p className="s-muted mt-3 text-sm">Try the controls; the order screens below follow them. Orvex is a fictional customer brand, not a real client. Changes stay in this browser tab. Nothing is uploaded, saved, registered or published.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Brand name<input className="vx-field mt-1" value={b.name} maxLength={28} onChange={(e) => setBrand({ name: e.target.value })} data-testid="input-brand-name" /></label>
          <label className="text-sm">Domain (illustration)<input className="vx-field mt-1" value={b.domain} maxLength={60} onChange={(e) => setBrand({ domain: e.target.value })} data-testid="input-brand-domain" /></label>
          <label className="text-sm">Primary colour<span className="mt-1 flex gap-2"><input type="color" aria-label="Pick colour" value={safe} onChange={(e) => setBrand({ color: e.target.value })} className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0" /><input className="vx-field" value={b.color} onChange={(e) => setBrand({ color: e.target.value })} aria-label="Hex colour" /></span></label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={b.dark} onChange={(e) => setBrand({ dark: e.target.checked })} />Dark theme preview</label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Colour presets">{PRESETS.map(([n, c]) => <button key={n} type="button" onClick={() => setBrand({ color: c })} aria-label={`${n} colour`} aria-pressed={b.color === c} data-testid={`button-brand-preset-${n.toLowerCase()}`} className="h-9 w-9 rounded-full border-2" style={{ background: c, borderColor: b.color === c ? 'currentColor' : 'transparent' }} />)}</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="s-btn s-btn-ghost cursor-pointer focus-within:outline focus-within:outline-2"><ImagePlus size={16} />{b.logo ? 'Replace logo' : 'Choose logo'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" data-testid="input-brand-logo" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} /></label>
          {b.logo && <button type="button" className="s-btn s-btn-ghost" onClick={() => setBrand({ logo: null })} data-testid="button-brand-logo-remove">Remove</button>}
          <button type="button" className="s-btn s-btn-ghost" onClick={() => { resetBrand(); setErr(''); }} data-testid="button-brand-reset">Reset to Orvex</button>
          <span className="s-muted text-xs">PNG, JPG or WebP, up to 2 MB. Preview only.</span>
        </div>
        {err && <p role="alert" className="mt-2 text-sm" style={{ color: '#e5484d' }} data-testid="text-logo-error">{err}</p>}
      </div>
      <div className="mt-8" data-testid="preview-branded-site"><BrandSite b={b} /></div>
    </div></section>
  );
}

const FLOW = [
  { key: 'create', label: 'Create order', t: 'Customer creates an order' },
  { key: 'view', label: 'View order', t: 'Order page with a reference' },
  { key: 'pay', label: 'Payment instructions', t: 'Clear payment instructions' },
  { key: 'track', label: 'Tracking', t: 'Progress the customer can follow' },
  { key: 'done', label: 'Completed', t: 'Completed order state' },
  { key: 'invoice', label: 'Invoice', t: 'Branded sample invoice' },
  { key: 'review', label: 'Review', t: 'Sample review panel' },
];
const ADMIN: [string, string, string, string, string, string][] = [
  ['SAMPLE-0001', 'Buy', 'Sample Customer A', '100.00 EUR', 'Awaiting payment', AMBER],
  ['SAMPLE-0002', 'Swap', 'Sample Customer B', '0.50 ETH', 'Processing', BLUE],
  ['SAMPLE-0003', 'Sell', 'Sample Customer C', '250.00 USDT', 'Completed', GREEN],
  ['SAMPLE-0004', 'Convert', 'Sample Customer D', '1.20 SOL', 'Completed', GREEN],
  ['SAMPLE-0005', 'Buy', 'Sample Customer E', '40.00 EUR', 'Awaiting payment', AMBER],
];
const SEL: Record<string, number> = { create: 0, view: 0, pay: 0, track: 1, done: 2, invoice: 2, review: 2 };
export function ExchangeJourney() {
  const [k, setK] = useState('create');
  const [phone, setPhone] = useState(false);
  const b = useBrand();
  const i = FLOW.findIndex((f) => f.key === k);
  const f = FLOW[i];
  const sel = SEL[k];
  return (
    <section id="journey" className="vx-sec" aria-labelledby="vx-jr-h" data-testid="section-exchange-journey"><div className="s-wrap">
      <p className="s-eyebrow">Customer journey and admin</p>
      <h2 id="vx-jr-h" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">From order creation to the invoice</h2>
      <div className="mt-6 overflow-x-auto pb-1"><VxTabs id="journey" label="Order journey" tabs={FLOW.map((x) => ({ key: x.key, label: x.label }))} value={k} onChange={setK} /></div>
      <div className="vx-bar mt-4" aria-hidden="true"><i style={{ width: `${((i + 1) / FLOW.length) * 100}%` }} /></div>
      <div className="mt-5 grid gap-5">
        <div key={k} className="vx-panel xj" {...tabPanelProps('journey', k)}>
          <div className="xj-top"><p className="vx-num">STEP {i + 1} / {FLOW.length} - {f.t}</p>
            <div className="xj-dev" role="group" aria-label="Preview device"><button type="button" aria-pressed={!phone} onClick={() => setPhone(false)} data-testid="button-journey-desktop">Desktop</button><button type="button" aria-pressed={phone} onClick={() => setPhone(true)} data-testid="button-journey-phone">Phone</button></div></div>
          <div className={`xj-stage ${phone ? 'phone' : ''}`} data-testid="stage-journey"><div className="xj-chrome" aria-hidden="true"><i /><i /><i /><span>https://{b.domain}/{k}</span></div><div className="xj-body"><Scene k={k} b={b} /></div></div>
          <p className="xj-note">Illustrative local example for {b.name || 'the customer'}, a fictional customer brand. Not a capture and not a live order.</p>
        </div>
        <VxCard><p className="s-eyebrow">Admin panel (illustration)</p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs" aria-hidden="true">{['All', 'Awaiting payment', 'Processing', 'Completed'].map((c, n) => <span key={c} className="s-badge" style={n === 0 ? { borderColor: 'var(--s-accent)' } : undefined}>{c}</span>)}</div>
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-xs" aria-label="Sample admin orders">
            <thead className="s-muted"><tr className="border-b" style={{ borderColor: 'var(--s-line)' }}><th className="py-2 font-medium">Order</th><th className="font-medium">Type</th><th className="font-medium">Customer</th><th className="font-medium">Amount</th><th className="font-medium">Status</th></tr></thead>
            <tbody>{ADMIN.map((r, n) => (
              <tr key={r[0]} className="border-b transition-colors" style={{ borderColor: 'var(--s-line)', background: n === sel ? 'color-mix(in srgb,var(--s-primary) 16%,transparent)' : undefined }} aria-current={n === sel ? 'true' : undefined}>
                <td className="s-mono py-2.5">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td><span className="inline-block rounded-full px-2 py-0.5 font-semibold" style={{ background: `color-mix(in srgb,${r[5]} 20%,transparent)`, color: r[5] }}>{n === sel && k === 'track' ? 'Processing' : r[4]}</span></td>
              </tr>))}</tbody></table></div>
          <div className="mt-3 flex flex-wrap gap-2" aria-hidden="true"><span className="s-btn s-btn-ghost !px-3 !py-1.5 text-xs">View order</span><span className="s-btn s-btn-ghost !px-3 !py-1.5 text-xs">Mark payment received</span><span className="s-btn s-btn-ghost !px-3 !py-1.5 text-xs">Issue invoice</span></div>
          <p className="s-muted mt-4 flex items-start gap-2 text-xs"><ShieldAlert size={14} className="mt-0.5 shrink-0" />{SANDBOX} Customers, orders, invoices and reviews are samples, not real records or testimonials.</p>
        </VxCard>
      </div>
    </div></section>
  );
}
