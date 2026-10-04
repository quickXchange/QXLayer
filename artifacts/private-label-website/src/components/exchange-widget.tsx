import { useMemo, useState } from 'react';
import { ArrowDownUp, ChevronDown, Info, ShieldCheck } from 'lucide-react';
import type { AssetNetwork, PublicSite } from '@workspace/api-client-react';
import type { Caps, ExchangeTab } from '@/lib/capabilities';
import { AssetPicker, Coin, NetBadge, assetKey } from '@/components/asset-picker';

const LABEL: Record<ExchangeTab, string> = { swap: 'Swap', convert: 'Convert', buy: 'Buy', sell: 'Sell' };
const AMOUNT = /^\d{0,12}(\.\d{0,18})?$/;
const NOQ = 'No pricing source is connected in this sandbox.';

function Side({ label, asset, onPick, value, onValue, readOnly, fiat, error, id, assetsAvailable }: { label: string; asset: AssetNetwork | null; onPick?: () => void; value: string; onValue?: (v: string) => void; readOnly?: boolean; fiat?: boolean; error?: string | null; id: string; assetsAvailable: boolean }) {
  return (
    <div>
      <div className="s-side" style={error ? { borderColor: '#d9485f' } : undefined}>
        <div className="flex items-center justify-between"><label htmlFor={`amt-${id}`} className="s-muted text-xs font-medium">{label}</label></div>
        <div className="mt-1.5 flex items-center gap-3">
          <input id={`amt-${id}`} className="s-amount" inputMode="decimal" autoComplete="off" placeholder="0.00" value={value} readOnly={readOnly} aria-invalid={!!error} aria-describedby={error ? `err-${id}` : undefined} onChange={(e) => { const v = e.target.value.replace(',', '.'); if (AMOUNT.test(v)) onValue?.(v); }} data-testid={`input-amount-${id}`} />
          {fiat ? (
            <span className="s-pick" style={{ cursor: 'default' }} data-testid={`pill-fiat-${id}`}><span className="s-coin" style={{ width: 32, height: 32, background: 'var(--s-secondary)', color: 'var(--s-bg)' }}>Fi</span>Fiat</span>
          ) : (
            <button type="button" className="s-pick" onClick={onPick} disabled={!assetsAvailable} aria-haspopup="dialog" aria-label={`${label}: choose asset${asset ? `, ${asset.symbol} on ${asset.networkName}` : ''}`} data-testid={`button-asset-${id}`}>
              {asset ? <Coin asset={asset} size={32} /> : <span className="s-coin" style={{ width: 32, height: 32, background: 'var(--s-secondary)' }}>?</span>}
              <span className="truncate">{asset ? asset.symbol : 'Select'}</span><ChevronDown size={15} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mt-2 flex min-h-[22px] items-center gap-2 text-xs">
          {fiat ? <span className="s-muted">Payment method not configured</span> : asset ? <><NetBadge a={asset} /><span className="s-muted truncate">{asset.name}</span></> : <span className="s-muted">No asset selected</span>}
        </div>
      </div>
      {error && <p id={`err-${id}`} role="alert" className="mt-1.5 text-xs font-medium" style={{ color: '#e5556b' }}>{error}</p>}
    </div>
  );
}

export function ExchangeWidget({ site, caps }: { site: PublicSite; caps: Caps }) {
  const assets = site.assets;
  const [tab, setTab] = useState<ExchangeTab>(caps.tabs[0] ?? 'swap');
  const [fromKey, setFromKey] = useState<string | null>(assets[0] ? assetKey(assets[0]) : null);
  const [toKey, setToKey] = useState<string | null>(() => { const f = assets[0]; const o = assets.find((a) => !f || a.assetId !== f.assetId); return o ? assetKey(o) : null; });
  const [amount, setAmount] = useState('');
  const [picker, setPicker] = useState<null | 'from' | 'to'>(null);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const byKey = useMemo(() => new Map(assets.map((a) => [assetKey(a), a])), [assets]);
  const from = fromKey ? byKey.get(fromKey) ?? null : null;
  const to = toKey ? byKey.get(toKey) ?? null : null;
  const distinct = new Set(assets.map((a) => a.assetId)).size;
  const twoSided = tab === 'swap' || tab === 'convert';
  const insufficient = twoSided && distinct < 2;
  const noAssets = assets.length === 0;
  const amountError = touched ? (amount === '' || Number(amount) <= 0 ? 'Enter an amount greater than zero.' : null) : null;
  const reset = () => { setStatus(null); };

  const shell = (inner: React.ReactNode) => (
    <div className="s-glowframe" data-testid="widget-exchange"><div className="s-glowinner p-4 sm:p-6">{inner}</div></div>
  );
  if (caps.exchange === 'empty') return shell(
    <div className="py-6 text-center" data-testid="state-exchange-empty">
      <span className="s-badge">Exchange enabled</span>
      <h3 className="mt-4 text-xl font-semibold">No exchange actions are enabled yet</h3>
      <p className="s-muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">{site.brandName} has the exchange service turned on, but none of Swap, Convert, Buy or Sell have been enabled. They will appear here once configured.</p>
    </div>);

  const cryptoSide = tab === 'sell' ? 'from' : 'to';
  const onSelect = (a: AssetNetwork) => {
    const k = assetKey(a);
    if (picker === 'from') { setFromKey(k); if (twoSided && to && to.assetId === a.assetId) setToKey(null); }
    else { setToKey(k); if (twoSided && from && from.assetId === a.assetId) setFromKey(null); }
    reset(); setPicker(null);
  };
  const flip = () => { const f = fromKey; setFromKey(toKey); setToKey(f); reset(); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setTouched(true);
    const a = twoSided ? from && to : tab === 'buy' ? to : from;
    if (!a) { setStatus('Choose an asset first.'); return; }
    if (amount === '' || Number(amount) <= 0) { setStatus(null); return; }
    setStatus('Sandbox only. No quote was requested, no order was created and nothing was sent. Execution is not enabled in this environment.');
  };
  const pickerAsset = picker === 'from' ? from : to;
  const blocked = twoSided ? (picker === 'from' ? to?.assetId : from?.assetId) : null;
  const rate = (k: string, label: string) => <div className="flex items-center justify-between gap-3 py-1.5" key={k}><dt>{label}</dt><dd className="s-muted" title={NOQ} data-testid={`text-${k}`}>Unavailable</dd></div>;

  return shell(
    <form onSubmit={submit} noValidate aria-label="Exchange (sandbox)">
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Exchange action" className="flex gap-1 overflow-x-auto">
          {caps.tabs.map((t) => <button key={t} type="button" role="tab" id={`tab-${t}`} aria-selected={tab === t} className="s-tab" onClick={() => { setTab(t); setTouched(false); reset(); }} data-testid={`tab-${t}`}>{LABEL[t]}</button>)}
        </div>
        <span className="s-badge shrink-0" data-testid="badge-sandbox">Sandbox</span>
      </div>
      {noAssets ? (
        <div className="py-10 text-center" data-testid="state-widget-no-assets"><h3 className="text-lg font-semibold">No assets configured</h3><p className="s-muted mx-auto mt-2 max-w-xs text-sm">This tenant has not enabled any assets or networks yet, so there is nothing to exchange.</p></div>
      ) : insufficient ? (
        <div className="mt-5 rounded-[var(--s-r2)] border p-5" style={{ borderColor: 'var(--s-line)' }} data-testid="state-widget-insufficient">
          <div className="flex items-start gap-3"><Info size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--s-accent-ink)' }} aria-hidden="true" />
            <div><h3 className="font-semibold">A {LABEL[tab].toLowerCase()} needs two different assets</h3>
              <p className="s-muted mt-1.5 text-sm leading-relaxed">{site.brandName} currently has one configured asset, so no valid pair exists. A pair is not simulated with a duplicate. Currently configured:</p>
              <ul className="mt-3 space-y-2">{assets.map((a) => <li key={assetKey(a)} className="flex items-center gap-2.5 text-sm"><Coin asset={a} size={26} /><span className="font-semibold">{a.symbol}</span><NetBadge a={a} /></li>)}</ul>
            </div></div>
        </div>
      ) : (
        <div className="mt-5">
          <Side id="top" label={tab === 'buy' ? 'You pay' : tab === 'convert' ? 'You convert' : 'You send'} asset={tab === 'buy' ? null : from} fiat={tab === 'buy'} onPick={() => setPicker('from')} value={amount} onValue={(v) => { setAmount(v); reset(); }} error={amountError} assetsAvailable={assets.length > 0} />
          {twoSided ? <button type="button" className="s-swapbtn" onClick={flip} aria-label="Switch direction" disabled={!from || !to} data-testid="button-switch-direction"><ArrowDownUp size={17} /></button> : <div className="h-3" />}
          <Side id="bottom" label="You receive" asset={tab === 'sell' ? null : to} fiat={tab === 'sell'} onPick={() => setPicker(cryptoSide === 'to' ? 'to' : 'from')} value="" readOnly assetsAvailable={assets.length > 0} />
          <p className="s-muted mt-2 text-xs" aria-live="polite" data-testid="text-receive-note">Receive amount appears once a quote is available.</p>
        </div>
      )}
      {!noAssets && (
        <dl className="s-ratebox mt-4 divide-y rounded-[var(--s-r2)] border px-4 py-2.5" style={{ borderColor: 'var(--s-line)' }} data-testid="panel-rate">
          {rate('rate', 'Rate')}{rate('min', 'Minimum')}{rate('max', 'Maximum')}{rate('fee', 'Network and service fee')}
          <p className="s-muted pt-2 text-xs">{NOQ} Nothing here is an estimate.</p>
        </dl>
      )}
      <button type="submit" className="s-btn s-btn-primary mt-5 w-full" style={{ minHeight: 52 }} disabled={noAssets || insufficient} data-testid="button-exchange-cta">Preview order (sandbox)</button>
      <div role="status" aria-live="polite" className="mt-3 min-h-[1.25rem]">
        {status && <p className="flex items-start gap-2 text-xs leading-relaxed" data-testid="status-sandbox"><ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--s-accent-ink)' }} aria-hidden="true" />{status}</p>}
      </div>
      {picker && <AssetPicker assets={assets} selected={pickerAsset ? assetKey(pickerAsset) : null} blockedAssetId={blocked} title={picker === 'from' ? 'Select asset to send' : 'Select asset to receive'} onSelect={onSelect} onClose={() => setPicker(null)} />}
    </form>
  );
}
