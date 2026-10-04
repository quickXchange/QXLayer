import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Section } from '@/components/app/sections';
import { Dec, DraftFooter, Field, IntInput, Pick, SimNote } from './ui';
import { fiatId, type ExchangeDraft } from './use-exchange-draft';
import type { ExchangeRoute, ExchangePaymentMethod } from '@workspace/api-client-react';

const ACTIONS: [string, string][] = [['swap', 'Swap'], ['convert', 'Convert'], ['buy', 'Buy (fiat to crypto)'], ['sell', 'Sell (crypto to fiat)']];

export function RoutesPanel({ d, locked, action }: { d: ExchangeDraft; locked: boolean; action?: ExchangeRoute['action'] }) {
  const s = d.draft!;
  const fiat = fiatId(s);
  const endpoints: [string, string][] = [...d.catalog.map((c) => [c.assetNetworkId, `${c.symbol} on ${c.networkName}`] as [string, string]), [fiat, `${s.fiatCurrency} (fiat)`]];
  const setR = (id: string, p: Partial<ExchangeRoute>) => d.patch({ routes: s.routes.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const add = () => {
    const c0 = d.catalog[0]?.assetNetworkId; const c1 = d.catalog[1]?.assetNetworkId ?? c0;
    if (!c0) return;
    d.patch({ routes: [...s.routes, { id: crypto.randomUUID(), source: c0, destination: c1 ?? c0, action: action ?? 'swap', enabled: false, rate: '', minimum: '0', maximum: '', fixedFee: '0', feeBps: 0, spreadBps: 0, paymentMethodIds: [] }] });
  };
  const setAction = (r: ExchangeRoute, a: ExchangeRoute['action']) => {
    const c0 = d.catalog[0]?.assetNetworkId ?? ''; const c1 = d.catalog[1]?.assetNetworkId ?? c0;
    if (a === 'buy') setR(r.id, { action: a, source: fiat, destination: d.catalog.some((c) => c.assetNetworkId === r.destination) ? r.destination : c0 });
    else if (a === 'sell') setR(r.id, { action: a, destination: fiat, source: d.catalog.some((c) => c.assetNetworkId === r.source) ? r.source : c0, paymentMethodIds: r.paymentMethodIds });
    else setR(r.id, { action: a, source: r.source === fiat ? c0 : r.source, destination: r.destination === fiat ? c1 : r.destination, paymentMethodIds: [] });
  };
  const pms = s.paymentMethods.filter((p) => p.currency === s.fiatCurrency);
  return (
    <Section n="X3" title={action ? `Routes: ${action}` : 'Routes'} note="Each route is one directed pair with an explicit manual rate. Nothing is derived or fetched." footer={<DraftFooter d={d} locked={locked} />}>
      <SimNote />
      {s.routes.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-routes">No routes yet. {d.catalog.length === 0 ? 'Select tenant assets first.' : 'Add a route and enter its manual rate.'}</p>}
      <div className="space-y-3">
        {s.routes.map((r, i) => {
          if (action && r.action !== action) return null;
          const pay = r.action === 'buy' || r.action === 'sell';
          return (
            <fieldset key={r.id} disabled={locked} className="grid gap-3 rounded-md border p-4 md:grid-cols-4" data-testid={`row-route-${r.id}`}>
              <div className="flex items-center justify-between md:col-span-4">
                <span className="font-mono text-xs text-copper">Route {i + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm"><Switch disabled={locked} checked={r.enabled} onCheckedChange={(v) => setR(r.id, { enabled: v })} data-testid={`switch-route-${r.id}`} />Enabled</label>
                  {!locked && <Button type="button" size="sm" variant="ghost" data-testid={`button-delete-route-${r.id}`} onClick={() => d.patch({ routes: s.routes.filter((x) => x.id !== r.id) })}>Delete</Button>}
                </div>
              </div>
              <Field label="Action"><Pick disabled={locked} value={r.action} onChange={(v) => setAction(r, v as ExchangeRoute['action'])} options={ACTIONS} /></Field>
              <Field label="Source"><Pick disabled={locked || r.action === 'buy'} value={r.source} onChange={(v) => setR(r.id, { source: v })} options={r.action === 'buy' ? [[fiat, `${s.fiatCurrency} (fiat)`]] : endpoints.filter(([v]) => v !== fiat)} /></Field>
              <Field label="Destination"><Pick disabled={locked || r.action === 'sell'} value={r.destination} onChange={(v) => setR(r.id, { destination: v })} options={r.action === 'sell' ? [[fiat, `${s.fiatCurrency} (fiat)`]] : endpoints.filter(([v]) => v !== fiat)} /></Field>
              <Field label="Manual rate (positive)"><Dec positive value={r.rate} onChange={(v) => setR(r.id, { rate: v })} placeholder="required" testid={`input-route-rate-${r.id}`} /></Field>
              <Field label="Minimum"><Dec value={r.minimum} onChange={(v) => setR(r.id, { minimum: v })} /></Field>
              <Field label="Maximum"><Dec value={r.maximum} onChange={(v) => setR(r.id, { maximum: v })} placeholder="required" /></Field>
              <Field label="Service fee (bps)"><IntInput value={r.feeBps} onChange={(v) => setR(r.id, { feeBps: v })} /></Field>
              <Field label="Spread (bps)"><IntInput value={r.spreadBps} onChange={(v) => setR(r.id, { spreadBps: v })} /></Field>
              <Field label="Fixed fee (source units)"><Dec value={r.fixedFee} onChange={(v) => setR(r.id, { fixedFee: v })} /></Field>
              {pay && (
                <div className="md:col-span-4"><p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Payment methods ({s.fiatCurrency})</p>
                  {pms.length === 0 ? <p className="text-sm text-muted-foreground">Create a {s.fiatCurrency} payment method first.</p> : (
                    <div className="flex flex-wrap gap-x-5 gap-y-2">{pms.filter((p) => p[r.action as 'buy' | 'sell']).map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm"><Checkbox disabled={locked} checked={r.paymentMethodIds.includes(p.id)} onCheckedChange={(v) => setR(r.id, { paymentMethodIds: v ? [...r.paymentMethodIds, p.id] : r.paymentMethodIds.filter((x) => x !== p.id) })} />{p.label}{!p.enabled && <span className="text-[10px] uppercase text-muted-foreground">off</span>}</label>))}</div>)}
                </div>)}
            </fieldset>
          );
        })}
      </div>
      {!locked && <Button type="button" variant="outline" data-testid="button-add-route" disabled={d.catalog.length === 0} onClick={add}>Add route</Button>}
    </Section>
  );
}

export function PaymentMethodsPanel({ d, locked }: { d: ExchangeDraft; locked: boolean }) {
  const s = d.draft!;
  const setP = (id: string, p: Partial<ExchangePaymentMethod>) => d.patch({ paymentMethods: s.paymentMethods.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  return (
    <Section n="X4" title="Payment methods" note="Simulated Buy and Sell methods. Labels only: no payment provider is called and no money moves." footer={<DraftFooter d={d} locked={locked} />}>
      {s.paymentMethods.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-methods">No simulated payment methods yet.</p>}
      <div className="divide-y rounded-md border">
        {s.paymentMethods.map((p) => (
          <fieldset key={p.id} disabled={locked} className="grid gap-3 p-4 md:grid-cols-4" data-testid={`row-method-${p.id}`}>
            <Field label="Label" className="md:col-span-2"><Input value={p.label} onChange={(e) => setP(p.id, { label: e.target.value })} data-testid={`input-method-label-${p.id}`} /></Field>
            <Field label="Currency"><Pick disabled={locked} value={p.currency} onChange={(v) => setP(p.id, { currency: v as ExchangePaymentMethod['currency'] })} options={[['USD', 'USD'], ['EUR', 'EUR'], ['GBP', 'GBP']]} /></Field>
            <div className="flex flex-wrap items-end gap-4 pb-2 text-sm">
              <label className="flex items-center gap-2"><Switch disabled={locked} checked={p.enabled} onCheckedChange={(v) => setP(p.id, { enabled: v })} />Enabled</label>
              <label className="flex items-center gap-2"><Checkbox disabled={locked} checked={p.buy} onCheckedChange={(v) => setP(p.id, { buy: v === true })} />Buy</label>
              <label className="flex items-center gap-2"><Checkbox disabled={locked} checked={p.sell} onCheckedChange={(v) => setP(p.id, { sell: v === true })} />Sell</label>
              {!locked && <Button type="button" size="sm" variant="ghost" data-testid={`button-delete-method-${p.id}`} onClick={() => d.patch({ paymentMethods: s.paymentMethods.filter((x) => x.id !== p.id), routes: s.routes.map((r) => ({ ...r, paymentMethodIds: r.paymentMethodIds.filter((x) => x !== p.id) })) })}>Delete</Button>}
            </div>
          </fieldset>
        ))}
      </div>
      {!locked && <Button type="button" variant="outline" data-testid="button-add-method" onClick={() => d.patch({ paymentMethods: [...s.paymentMethods, { id: crypto.randomUUID(), label: '', enabled: false, currency: s.fiatCurrency, buy: true, sell: false }] })}>Add payment method</Button>}
    </Section>
  );
}

export function PricingPanel({ d, locked }: { d: ExchangeDraft; locked: boolean }) {
  const s = d.draft!;
  const label = (id: string) => (id.startsWith('fiat:') ? id.slice(5) : d.catalog.find((c) => c.assetNetworkId === id)?.symbol ?? id);
  const setR = (id: string, p: Partial<ExchangeRoute>) => d.patch({ routes: s.routes.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  return (
    <Section n="X5" title="Pricing" note="Reference rates, service fee, spread and fixed fee per route. Basis points are integers: 100 bps is 1%." footer={<DraftFooter d={d} locked={locked} />}>
      <SimNote />
      <fieldset disabled={locked} className="grid gap-3 md:grid-cols-4">
        <Field label={`Fiat plan rate (${s.fiatCurrency})`}><Dec positive value={s.fiatPlanRate} onChange={(v) => d.patch({ fiatPlanRate: v })} testid="input-fiat-plan-rate" /></Field>
      </fieldset>
      {s.routes.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No routes to price. Create routes first.</p> : (
        <div className="divide-y rounded-md border">
          {s.routes.map((r) => (
            <fieldset key={r.id} disabled={locked} className="grid gap-3 p-4 md:grid-cols-5" data-testid={`row-pricing-${r.id}`}>
              <p className="text-sm md:col-span-5"><span className="font-mono text-[10px] uppercase text-copper">{r.action}</span> {label(r.source)} to {label(r.destination)}{!r.enabled && <span className="ml-2 text-xs text-muted-foreground">disabled</span>}</p>
              <Field label="Rate"><Dec positive value={r.rate} onChange={(v) => setR(r.id, { rate: v })} /></Field>
              <Field label="Fee bps"><IntInput value={r.feeBps} onChange={(v) => setR(r.id, { feeBps: v })} /></Field>
              <Field label="Spread bps"><IntInput value={r.spreadBps} onChange={(v) => setR(r.id, { spreadBps: v })} /></Field>
              <Field label="Fixed fee"><Dec value={r.fixedFee} onChange={(v) => setR(r.id, { fixedFee: v })} /></Field>
              <Field label="Min / Max"><div className="flex gap-1"><Dec value={r.minimum} onChange={(v) => setR(r.id, { minimum: v })} /><Dec value={r.maximum} onChange={(v) => setR(r.id, { maximum: v })} /></div></Field>
            </fieldset>))}
        </div>)}
    </Section>
  );
}
