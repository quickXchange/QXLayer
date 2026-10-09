import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, ChevronDown, Info, ShieldCheck } from 'lucide-react';
import type { AssetNetwork, PublicSite } from '@workspace/api-client-react';
import { useGetPublicExchange, getGetPublicExchangeQueryKey, createSandboxQuote, createSandboxOrder, trackSandboxOrder, type ExchangeQuote, type ExchangeOrderCreated } from '@workspace/api-client-react';
import { websitePreviewRequest } from '../lib/development-preview';
import type { Caps, ExchangeTab } from '../lib/capabilities';
import { AssetPicker, Coin, NetBadge, assetKey } from './asset-picker';

const LABEL: Record<ExchangeTab, string> = { swap: 'Swap', convert: 'Convert', buy: 'Buy', sell: 'Sell' };
const AMOUNT = /^\d{0,12}(\.\d{0,18})?$/;
const NOQ = 'No pricing source is connected in this sandbox.';

function Side({ label, asset, onPick, value, onValue, readOnly, fiat, fiatCurrency = 'Fiat', error, id, assetsAvailable }: { label: string; asset: AssetNetwork | null; onPick?: () => void; value: string; onValue?: (v: string) => void; readOnly?: boolean; fiat?: boolean; fiatCurrency?: string; error?: string | null; id: string; assetsAvailable: boolean }) {
  return (
    <div>
      <div className={`s-side${id === 'bottom' ? ' s-side-out' : ''}`} style={error ? { borderColor: '#d9485f' } : undefined}>
        <div className="flex items-center justify-between"><label htmlFor={`amt-${id}`} className="s-lab">{label}</label></div>
        <div className="mt-1.5 flex items-center gap-3">
          <input id={`amt-${id}`} className="s-amount" inputMode="decimal" autoComplete="off" placeholder="0.00" value={value} readOnly={readOnly} aria-invalid={!!error} aria-describedby={error ? `err-${id}` : undefined} onChange={(e) => { const v = e.target.value.replace(',', '.'); if (AMOUNT.test(v)) onValue?.(v); }} data-testid={`input-amount-${id}`} />
          {fiat ? (
            <span className="s-pick" style={{ cursor: 'default' }} data-testid={`pill-fiat-${id}`}><span className="s-coin" style={{ width: 52, height: 52, background: 'var(--s-secondary)', color: 'var(--s-bg)' }}>Fi</span>{fiatCurrency}</span>
          ) : (
            <button type="button" className="s-pick" onClick={onPick} disabled={!assetsAvailable} aria-haspopup="dialog" aria-label={`${label}: choose asset${asset ? `, ${asset.symbol} on ${asset.networkName}` : ''}`} data-testid={`button-asset-${id}`}>
              {asset ? <Coin asset={asset} size={52} /> : <span className="s-coin" style={{ width: 52, height: 52, background: 'var(--s-secondary)' }}>?</span>}
              <span className="truncate">{asset ? asset.symbol : 'Select'}</span><ChevronDown size={15} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mt-2 flex min-h-[22px] items-center gap-2 text-xs">
          {fiat ? <span className="s-muted">Sandbox fiat · no real payment</span> : asset ? <><NetBadge a={asset} /><span className="s-muted truncate">{asset.name}</span></> : <span className="s-muted">No asset selected</span>}
        </div>
      </div>
      {error && <p id={`err-${id}`} role="alert" className="mt-1.5 text-xs font-medium" style={{ color: '#e5556b' }}>{error}</p>}
    </div>
  );
}

export interface RateInfo { mode: 'swap' | 'convert' | null; sourceAsset: string | null; targetAsset: string | null; rate: string | null; loading: boolean; error: boolean }

/** The optional props are used only by the Telegram Mini App; master defaults are unchanged. */
export function ExchangeWidget({ site, caps, presentation = false, allowedActions, initialAction, onRateInfo }: { site: PublicSite; caps: Caps; presentation?: boolean; allowedActions?: ExchangeTab[]; initialAction?: ExchangeTab; onRateInfo?: (info: RateInfo) => void }) {
  const exchangeQ = useGetPublicExchange(site.tenantSlug, { request: websitePreviewRequest(site.tenantSlug), query: { queryKey: getGetPublicExchangeQueryKey(site.tenantSlug), enabled: !presentation, refetchInterval: 15000 } });
  const config = exchangeQ.data;
  const assets = presentation ? site.assets : config?.assets ?? [];
  const allTabs = presentation || !config ? caps.tabs : config.actions;
  const tabs = allowedActions ? allTabs.filter((t) => allowedActions.includes(t)) : allTabs;
  const previewProof = useMemo(() => !presentation && !!websitePreviewRequest(site.tenantSlug).headers, [presentation, site.tenantSlug]);
  const loadingCfg = !presentation && exchangeQ.isLoading;
  const errorCfg = !presentation && !loadingCfg && exchangeQ.isError;
  const inactive = !presentation && (loadingCfg || errorCfg || !config?.enabled || !config.actions.length || previewProof);
  const [tab, setTab] = useState<ExchangeTab>(caps.tabs[0] ?? 'swap');
  const [fromKey, setFromKey] = useState<string | null>(assets[0] ? assetKey(assets[0]) : null);
  const [toKey, setToKey] = useState<string | null>(() => { const f = assets[0]; const o = assets.find((a) => !f || a.assetId !== f.assetId); return o ? assetKey(o) : null; });
  const [amount, setAmount] = useState('');
  const [picker, setPicker] = useState<null | 'from' | 'to'>(null);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [quote, setQuote] = useState<ExchangeQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [created, setCreated] = useState<ExchangeOrderCreated | null>(null);
  const [refreshQuote, setRefreshQuote] = useState(0);
  const idempotency = useRef(crypto.randomUUID());
  const revision = useRef(0);
  const initialized = useRef(false);
  const attemptedOrder = useRef<{ quoteToken: string; idempotencyKey: string } | null>(null);
  const byKey = useMemo(() => new Map(assets.map((a) => [assetKey(a), a])), [assets]);
  const from = fromKey ? byKey.get(fromKey) ?? null : null;
  const to = toKey ? byKey.get(toKey) ?? null : null;
  const distinct = new Set(assets.map((a) => presentation ? a.assetId : assetKey(a))).size;
  const twoSided = tab === 'swap' || tab === 'convert';
  const insufficient = twoSided && distinct < 2;
  const noAssets = assets.length === 0;
  const amountError = touched ? (amount === '' || Number(amount) <= 0 ? 'Enter an amount greater than zero.' : null) : null;
  const reset = () => { revision.current++; setQuote(null); setStatus(null); attemptedOrder.current = null; idempotency.current = crypto.randomUUID(); };
  const source = tab === 'buy' ? `fiat:${config?.fiatCurrency}` : from?.assetNetworkId;
  const destination = tab === 'sell' ? `fiat:${config?.fiatCurrency}` : to?.assetNetworkId;
  const route = config?.routes.find(r => r.action === tab && r.source === source && r.destination === destination);
  const methods = config?.paymentMethods.filter(m => route?.paymentMethodIds.includes(m.id) && ((tab === 'buy' && m.buy) || (tab === 'sell' && m.sell))) ?? [];
  useEffect(() => {
    if (presentation) return;
    if (!initialized.current && config) {
      initialized.current = true;
      setTab(initialAction && tabs.includes(initialAction) ? initialAction : config.defaultAction && tabs.includes(config.defaultAction) ? config.defaultAction : tabs[0] ?? 'swap');
      if (assets[0]) setFromKey(assetKey(assets[0]));
      const other = assets.find(a => assetKey(a) !== assetKey(assets[0]));
      if (other) setToKey(assetKey(other));
    }
    if (tabs.length && !tabs.includes(tab)) { setTab(tabs[0]); reset(); }
    if (fromKey && !assets.some(a => assetKey(a) === fromKey)) setFromKey(null);
    if (toKey && !assets.some(a => assetKey(a) === toKey)) setToKey(null);
  }, [config, presentation, tab, fromKey, toKey]);
  useEffect(() => {
    if (presentation || !initialAction || !tabs.includes(initialAction)) return;
    setTab((cur) => { if (cur === initialAction) return cur; setTouched(false); setPaymentMethodId(''); reset(); return initialAction; });
  }, [initialAction]);
  const rateCb = useRef(onRateInfo);
  rateCb.current = onRateInfo;
  useEffect(() => {
    rateCb.current?.({
      mode: tab === 'swap' || tab === 'convert' ? tab : null,
      sourceAsset: from?.symbol ?? null, targetAsset: to?.symbol ?? null,
      rate: quote?.rate ?? null, loading: quoting, error: !!status && !quote && !quoting,
    });
  }, [quote, quoting, status, tab, from, to]);
  useEffect(() => {
    if (presentation) return;
    setQuote(null); setStatus(null); setQuoting(false);
    if (inactive || !source || !destination || !amount || Number(amount) <= 0 || !tabs.includes(tab) || (!twoSided && !paymentMethodId)) return;
    const controller = new AbortController();
    const current = ++revision.current;
    const timer = setTimeout(() => {
      setQuoting(true);
      createSandboxQuote(site.tenantSlug, { action: tab, source, destination, amount, ...(paymentMethodId && !twoSided ? { paymentMethodId } : {}) }, { signal: controller.signal })
        .then(q => { if (!controller.signal.aborted && current === revision.current) { setQuote(q); idempotency.current = crypto.randomUUID(); } })
        .catch(e => { if (!controller.signal.aborted && current === revision.current) setStatus((e as Error).message); })
        .finally(() => { if (!controller.signal.aborted && current === revision.current) setQuoting(false); });
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [source, destination, tab, amount, paymentMethodId, config, presentation, inactive, site.tenantSlug, refreshQuote]);
  useEffect(() => {
    if (presentation) return;
    try {
      const saved = sessionStorage.getItem(`exchange-order:${site.tenantSlug}`);
      if (saved) setCreated(JSON.parse(saved));
    } catch { /* A blocked or cleared browser session must not block trading. */ }
  }, [site.tenantSlug, presentation]);
  useEffect(() => {
    if (!quote) return;
    const delay = Math.max(0, new Date(quote.expiresAt).getTime() - Date.now());
    const timer = setTimeout(() => { setQuote(null); setStatus('Quote expired. Change the amount to request a fresh sandbox quote.'); }, delay);
    return () => clearTimeout(timer);
  }, [quote]);
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = frame.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!el || motion.matches || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0, px = 0, py = 0;
    const move = (e: PointerEvent) => {
      if (window.innerWidth < 1024 || motion.matches) return;
      const r = el.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; el.style.setProperty('--sx', `${px}px`); el.style.setProperty('--sy', `${py}px`); el.style.setProperty('--so', '1'); });
    };
    const leave = () => el.style.setProperty('--so', '0');
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const shell = (inner: React.ReactNode) => (
    <div ref={frame} className="s-glowframe" data-testid="widget-exchange"><div className="s-glowinner p-3.5 sm:p-7"><div className="s-clip" aria-hidden="true"><span className="s-spec" /><span className="s-sheen" /></div>{inner}</div></div>
  );
  if (presentation && caps.exchange === 'empty') return shell(
    <div className="py-6 text-center" data-testid="state-exchange-empty">
      <span className="s-badge">Exchange enabled</span>
      <h3 className="mt-4 text-xl font-semibold">No exchange actions are enabled yet</h3>
      <p className="s-muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">{site.brandName} has the exchange service turned on, but none of Swap, Convert, Buy or Sell have been enabled. They will appear here once configured.</p>
    </div>);

  const cryptoSide = tab === 'sell' ? 'from' : 'to';
  const onSelect = (a: AssetNetwork) => {
    const k = assetKey(a);
    if (picker === 'from') { setFromKey(k); if (twoSided && to && (presentation ? to.assetId === a.assetId : assetKey(to) === k)) setToKey(null); }
    else { setToKey(k); if (twoSided && from && (presentation ? from.assetId === a.assetId : assetKey(from) === k)) setFromKey(null); }
    reset(); setPicker(null);
  };
  const flip = () => { const f = fromKey; setFromKey(toKey); setToKey(f); reset(); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setTouched(true);
    const a = twoSided ? from && to : tab === 'buy' ? to : from;
    if (inactive) return;
    if (!a) { setStatus('Choose an asset first.'); return; }
    if (amount === '' || Number(amount) <= 0) { setStatus(null); return; }
    if (presentation) { setStatus('Sandbox preview only. No order was created and nothing was sent.'); return; }
    if (!quote || new Date(quote.expiresAt).getTime() <= Date.now()) { setStatus('Request a valid sandbox quote before creating an order.'); return; }
    setSubmitting(true);
    try {
      // Preserve an attempted request across uncertain network responses. A retry
      // must not create another order merely because an automatic quote refreshed.
      attemptedOrder.current ??= { quoteToken: quote.token, idempotencyKey: idempotency.current };
      const result = await createSandboxOrder(site.tenantSlug, attemptedOrder.current);
      attemptedOrder.current = null;
      setCreated(result); setQuote(null);
      try { sessionStorage.setItem(`exchange-order:${site.tenantSlug}`, JSON.stringify(result)); } catch { /* The tracking link still works without browser storage. */ }
      setStatus('Sandbox order created. No funds moved, no payment was requested and no deposit address exists.');
    } catch (error) { setStatus((error as Error).message); }
    finally { setSubmitting(false); }
  };
  const pickerAsset = picker === 'from' ? from : to;
  const blocked = presentation && twoSided ? (picker === 'from' ? to?.assetId : from?.assetId) : null;
  const blockedKey = !presentation && twoSided ? (picker === 'from' ? toKey : fromKey) : null;
  const values: Record<string, string | undefined> = { rate: quote ? `1 ${quote.sourceSymbol} = ${quote.rate} ${quote.destinationSymbol}` : undefined, min: quote?.minimum ?? route?.minimum, max: quote?.maximum ?? route?.maximum, fee: quote ? `${quote.fee} ${quote.sourceSymbol}` : undefined };
  const rate = (k: string, label: string) => <div className="flex items-center justify-between gap-3 py-1.5" key={k}><dt>{label}</dt><dd className="s-muted" title={presentation ? NOQ : 'Configured sandbox pricing only'} data-testid={`text-${k}`}>{values[k] ?? 'Unavailable'}</dd></div>;

  const notice = presentation ? null
    : loadingCfg ? 'Loading exchange configuration…'
    : errorCfg ? 'Exchange configuration could not be loaded.'
    : !config?.enabled ? 'Exchange is paused. This client has not enabled sandbox trading yet.'
    : !tabs.length ? 'No exchange actions are enabled yet.'
    : previewProof ? 'Read-only preview. Quotes and orders are disabled.'
    : noAssets ? 'No assets configured yet, so there is nothing to exchange.'
    : insufficient ? `A ${LABEL[tab].toLowerCase()} needs two different asset/network selections.`
    : null;

  return shell(
    <form onSubmit={submit} noValidate aria-label="Exchange (sandbox)" className={presentation ? undefined : 's-exchange-functional'}>
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Exchange action" className="s-tabs overflow-x-auto">
          {!presentation && !tabs.length && <span className="s-tab" aria-disabled="true" data-testid="state-actions-unconfigured">Actions not configured</span>}
          {tabs.map((t) => <button key={t} type="button" role="tab" id={`tab-${t}`} aria-selected={tab === t} className="s-tab" onClick={() => { setTab(t); setTouched(false); setPaymentMethodId(''); reset(); }} data-testid={`tab-${t}`}>{LABEL[t]}</button>)}
        </div>
        <span className="s-badge shrink-0" data-testid="badge-sandbox">{site.websiteSettings.sandboxLabel ?? 'Sandbox'}</span>
      </div>
      {(
        <div className="mt-4 sm:mt-5">
          <Side id="top" label={tab === 'buy' ? 'You pay' : tab === 'convert' ? 'You convert' : 'You send'} asset={tab === 'buy' ? null : from} fiat={tab === 'buy'} fiatCurrency={config?.fiatCurrency} onPick={() => setPicker('from')} value={amount} onValue={(v) => { setAmount(v); reset(); }} error={amountError} assetsAvailable={assets.length > 0} />
          {twoSided ? <button type="button" className="s-swapbtn" onClick={flip} aria-label="Switch direction" disabled={!from || !to} data-testid="button-switch-direction"><ArrowDownUp size={17} /></button> : <div className="h-3" />}
          <Side id="bottom" label="You receive" asset={tab === 'sell' ? null : to} fiat={tab === 'sell'} fiatCurrency={config?.fiatCurrency} onPick={() => setPicker(cryptoSide === 'to' ? 'to' : 'from')} value={quote?.outputAmount ?? ''} readOnly assetsAvailable={assets.length > 0} />
          {!presentation && !twoSided && <label className="s-muted mt-3 block text-xs">Sandbox payment method<select className="s-field mt-1 w-full rounded-lg border bg-transparent p-2" value={paymentMethodId} onChange={e => { setPaymentMethodId(e.target.value); reset(); }} data-testid="select-exchange-payment-method"><option value="">Select a method</option>{methods.map(m => <option key={m.id} value={m.id}>{m.label} ({m.currency})</option>)}</select></label>}
          <p className="s-muted mt-2 text-xs" aria-live="polite" data-testid="text-receive-note">{quoting ? 'Calculating sandbox quote…' : quote ? `Receive ${quote.outputAmount} ${quote.destinationSymbol} · sandbox estimate · markup ${quote.spreadBps / 100}% · valid until ${new Date(quote.expiresAt).toLocaleTimeString()}` : 'Receive amount appears once a quote is available.'}</p>
        </div>
      )}
      {(
        <dl className="s-ratebox mt-4 divide-y rounded-[var(--s-r2)] border px-4 py-2.5" style={{ borderColor: 'var(--s-line)' }} data-testid="panel-rate">
          {rate('rate', 'Rate')}{rate('min', 'Minimum')}{rate('max', 'Maximum')}{rate('fee', 'Source fees')}
          {!presentation && quote?.destinationFee && <div className="flex justify-between gap-3 py-1.5 text-xs"><dt>Destination fees</dt><dd className="s-muted">{quote.destinationFee} {quote.destinationSymbol}</dd></div>}
          <p className="s-muted pt-2 text-xs">{presentation ? `${NOQ} Nothing here is an estimate.` : 'Sandbox rates only. Fees include applicable service, network and payment-method charges. Destination fees are included in the output. No real funds or execution.'}</p>
          {!presentation && !inactive && amount && !quote && !quoting && <button type="button" className="s-link mt-2 text-xs" onClick={() => setRefreshQuote(n => n + 1)} data-testid="button-refresh-quote">Request fresh sandbox quote</button>}
        </dl>
      )}
      <button type="submit" className="s-btn s-btn-primary s-cta-xl mt-5 w-full" disabled={inactive || noAssets || insufficient || submitting || (!presentation && (!quote || quoting))} data-testid="button-exchange-cta">{submitting ? 'Creating sandbox order…' : presentation ? 'Preview order (sandbox)' : 'Create order (sandbox)'}</button>
      {!presentation && config?.publicNote && <p className="s-muted mt-3 text-xs">{config.publicNote}</p>}
      <div role="status" aria-live="polite" className="mt-3 min-h-[1.25rem]">
        {!status && notice && <p className="s-muted flex items-start gap-2 text-xs leading-relaxed" data-testid="status-exchange-inline"><Info size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--s-accent-ink)' }} aria-hidden="true" />{notice}{errorCfg && <button type="button" className="s-link ml-2" onClick={() => exchangeQ.refetch()}>Try again</button>}</p>}
        {status && <p className="flex items-start gap-2 text-xs leading-relaxed" data-testid="status-sandbox"><ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--s-accent-ink)' }} aria-hidden="true" />{status}</p>}
      </div>
      {created && <div className="s-ratebox mt-4 rounded-[var(--s-r2)] border p-4 text-xs" style={{ borderColor: 'var(--s-line)' }} data-testid="panel-sandbox-order">
        <p className="font-semibold">Sandbox order · {created.order.action}</p><p className="s-muted mt-1 break-all">{created.order.id}</p>
        <p className="mt-2">{created.order.inputAmount} {created.order.sourceSymbol} → {created.order.outputAmount} {created.order.destinationSymbol}</p><p className="mt-2 capitalize" data-testid="text-order-status">Status: {created.order.status}</p>
        <button type="button" className="s-btn mt-3" data-testid="button-refresh-order" onClick={async () => { try { const order = await trackSandboxOrder(site.tenantSlug, created.order.id, { headers: { trackingToken: created.trackingToken } }); setCreated({ ...created, order }); } catch (e) { setStatus((e as Error).message); } }}>Refresh tracking</button>
        <a className="s-link ml-3" href={`${import.meta.env.BASE_URL}${site.tenantSlug}/orders/${created.order.id}#${created.trackingToken}`} data-testid="link-track-order">Track order</a>
        <p className="s-muted mt-2">Keep your tracking link private. All statuses are simulations.</p>
      </div>}
      {picker && <AssetPicker assets={assets} selected={pickerAsset ? assetKey(pickerAsset) : null} blockedAssetId={blocked} blockedKey={blockedKey} title={picker === 'from' ? 'Select asset to send' : 'Select asset to receive'} onSelect={onSelect} onClose={() => setPicker(null)} />}
    </form>
  );
}
