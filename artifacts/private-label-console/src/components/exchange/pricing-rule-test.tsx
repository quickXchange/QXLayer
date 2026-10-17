import { useState } from 'react';
import { useTestExchangeQuote, type ExchangeQuote } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Field, Dec, Pick } from './ui';
import { fiatCodes, isFiatEp, methodServes, type ExchangeDraft } from './use-exchange-draft';

const NONE = '__none';
const Cell = ({ l, v }: { l: string; v: React.ReactNode }) => <div className="min-w-0 bg-card p-2"><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p><div className="mt-1 break-words text-sm [overflow-wrap:anywhere]">{v}</div></div>;

/** Tests the SAVED configuration through the same engine as the public quote. */
export function PricingRuleTest({ d }: { d: ExchangeDraft }) {
  const s = d.draft!; const m = useTestExchangeQuote();
  const [route, setRoute] = useState(NONE);
  const [action, setAction] = useState<'swap' | 'convert'>('swap');
  const [source, setSource] = useState(''); const [dest, setDest] = useState(''); const [pm, setPm] = useState(NONE);
  const [amount, setAmount] = useState('100');
  const [res, setRes] = useState<ExchangeQuote | null>(null); const [err, setErr] = useState('');
  const nm = (id: string) => isFiatEp(id) ? `${id.slice(5)} (fiat)` : (() => { const c = d.catalog.find((x) => x.assetNetworkId === id); return c ? `${c.symbol} on ${c.networkName}` : id; })();
  const eps: [string, string][] = [...d.catalog.map((c): [string, string] => [c.assetNetworkId, nm(c.assetNetworkId)]), ...fiatCodes(s).map((c): [string, string] => [`fiat:${c}`, `${c} (fiat)`])];
  const ok = (id: string) => action === 'convert' ? !isFiatEp(id) : true;
  const fiatEp = [source, dest].find(isFiatEp);
  const pms = fiatEp ? s.paymentMethods.filter((p) => p.enabled && methodServes(p, fiatEp.slice(5))) : [];
  const routes = s.routes.filter((r) => r.action === 'swap' || r.action === 'convert');
  const valid = source && dest && source !== dest && /^\d{1,18}(\.\d{1,18})?$/.test(amount) && Number(amount) > 0 && (action === 'convert' || (isFiatEp(source) !== isFiatEp(dest)));
  const pickRoute = (id: string) => { setRoute(id); const r = routes.find((x) => x.id === id); if (r) { setAction(r.action as 'swap' | 'convert'); setSource(r.source); setDest(r.destination); setPm(r.paymentMethodIds[0] ?? NONE); setRes(null); setErr(''); } };
  const run = () => { if (!valid || m.isPending) return; setErr(''); setRes(null);
    m.mutate({ tenantId: d.tenantId, data: { action, source, destination: dest, amount, ...(pm !== NONE && action === 'swap' ? { paymentMethodId: pm } : {}) } }, { onSuccess: setRes, onError: (e) => setErr((e as Error).message || 'Quote rejected') }); };
  return (
    <section className="space-y-3 rounded-md border bg-card p-4" data-testid="section-test-rule">
      <div><h3 className="font-display text-lg">Test rule</h3>
        <p className="text-xs text-muted-foreground" data-testid="text-test-rule-note">Tests run against the saved configuration, the same engine as the public quote. Save your draft first: unsaved rule changes are not applied to the test.{d.dirty && <b className="ml-1 text-copper">You have unsaved changes.</b>}</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Route (optional prefill)"><Pick bounded testid="select-test-route" value={route} onChange={pickRoute} options={[[NONE, 'Choose manually'], ...routes.map((r): [string, string] => [r.id, `${r.action}: ${nm(r.source)} to ${nm(r.destination)}`])]} /></Field>
        <Field label="Action"><Pick testid="select-test-action" value={action} onChange={(v) => { setAction(v as 'swap' | 'convert'); setSource(''); setDest(''); setPm(NONE); setRoute(NONE); }} options={[['swap', 'Swap'], ['convert', 'Convert']]} /></Field>
        <Field label="Amount (source units)"><Dec positive value={amount} onChange={setAmount} testid="input-test-amount" /></Field>
        <Field label="Source"><Pick bounded testid="select-test-source" value={source || NONE} onChange={(v) => { setSource(v === NONE ? '' : v); setRoute(NONE); }} options={[[NONE, 'Select source'], ...eps.filter(([v]) => ok(v))]} /></Field>
        <Field label="Destination"><Pick bounded testid="select-test-destination" value={dest || NONE} onChange={(v) => { setDest(v === NONE ? '' : v); setRoute(NONE); }} options={[[NONE, 'Select destination'], ...eps.filter(([v]) => ok(v) && v !== source)]} /></Field>
        {action === 'swap' && <Field label="Payment method"><Pick bounded testid="select-test-payment" value={pm} onChange={setPm} options={[[NONE, 'Any'], ...pms.map((p): [string, string] => [p.id, p.label || 'Unnamed'])]} /></Field>}
      </div>
      <Button type="button" data-testid="button-run-test-rule" disabled={!valid || m.isPending} onClick={run}>{m.isPending ? 'Testing' : 'Run test'}</Button>
      {err && <p role="alert" className="text-sm text-destructive" data-testid="text-test-error">{err}</p>}
      {res && (
        <div className="space-y-2" data-testid="panel-test-result">
          <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-3">
            <Cell l="Market rate" v={<span className="font-mono">{res.marketRate ?? 'n/a'}</span>} />
            <Cell l="Rate provider" v={res.rateProvider ?? res.pricingSource ?? 'n/a'} />
            <Cell l="Rate updated" v={res.rateUpdatedAt ?? 'n/a'} />
            <Cell l="Matched rule" v={res.pricingRuleId ? <span className="font-mono text-xs">{res.pricingRuleId}{res.pricingRuleSnapshot ? ` (${res.pricingRuleSnapshot.pricingMode ?? 'legacy'}, priority ${res.pricingRuleSnapshot.priority})` : ''}</span> : 'None, route pricing'} />
            <Cell l="Fees" v={<span className="font-mono text-xs">{res.fee} {res.sourceSymbol} source, {res.destinationFee ?? '0'} {res.destinationSymbol} dest, spread {res.spreadBps} bps</span>} />
            <Cell l="Final rate" v={<span className="font-mono">1 {res.sourceSymbol} = {res.rate} {res.destinationSymbol}</span>} />
            <Cell l="Minimum" v={<span className="font-mono">{res.minimum}</span>} />
            <Cell l="Maximum" v={<span className="font-mono">{res.maximum}</span>} />
            <Cell l="Output" v={<span className="font-mono">{res.outputAmount} {res.destinationSymbol}</span>} />
          </div>
          {res.calculation && <p className="rounded-md border bg-muted/40 p-2 font-mono text-xs [overflow-wrap:anywhere]" data-testid="text-test-calculation">{res.calculation}</p>}
        </div>)}
    </section>
  );
}
