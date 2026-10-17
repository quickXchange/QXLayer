import type { ExchangePricingRule, ExchangeQuote, ExchangeRoute } from '@workspace/api-client-react';
import { fmtDate, pricingLabel } from '../../lib/exchange-model';

const ep = (v: string) => (v === '*' ? 'Any' : v.startsWith('fiat:') ? v.slice(5) : v);
export function describeRule(r?: ExchangePricingRule | null): string {
  if (!r) return 'No pricing rule matched; route pricing applies';
  const parts = [`${ep(r.source)} to ${ep(r.destination)}`, `fee ${r.feeBps / 100}%`];
  if (r.fixedFee && Number(r.fixedFee) > 0) parts.push(`fixed ${r.fixedFee}`);
  if (r.spreadBps) parts.push(`spread ${r.spreadBps / 100}%`);
  return parts.join(', ');
}

export function QuotePanel({ quote, route, quoting, canRefresh, onRefresh }: { quote: ExchangeQuote | null; route?: ExchangeRoute; quoting: boolean; canRefresh: boolean; onRefresh: () => void }) {
  const row = (k: string, label: string, value?: string | null) => <div className="flex items-start justify-between gap-4 py-1.5" key={k}><dt>{label}</dt><dd className="s-muted text-right" data-testid={`text-${k}`}>{value || 'Unavailable'}</dd></div>;
  const q = quote;
  return (
    <dl className="s-ratebox mt-4 divide-y rounded-[var(--s-r2)] border px-4 py-2.5 text-sm" style={{ borderColor: 'var(--s-line)' }} data-testid="panel-rate" aria-busy={quoting}>
      {row('quote-basis', 'Quote basis', q ? [q.quoteKind, pricingLabel(q.pricingSource)].filter(Boolean).join(' / ') : undefined)}
      {q?.marketRate && row('market-rate', q.quoteKind==="manual"?'Manual base rate':'Market reference', `1 ${q.sourceSymbol} = ${q.marketRate} ${q.destinationSymbol}${q.rateProvider ? ` (${q.rateProvider}${q.rateUpdatedAt ? `, ${fmtDate(q.rateUpdatedAt)}` : ''})` : ''}`)}
      {row('pricing-rule', 'Matched pricing rule', q ? describeRule(q.pricingRuleSnapshot) : undefined)}
      {row('rate', 'Your rate', q ? `1 ${q.sourceSymbol} = ${q.rate} ${q.destinationSymbol}` : undefined)}
      {row('fee', 'Fees', q ? `${q.fee} ${q.sourceSymbol}${q.destinationFee ? ` + ${q.destinationFee} ${q.destinationSymbol}` : ''}` : undefined)}
      {row('min', 'Minimum', q?.minimum ?? route?.minimum)}
      {row('max', 'Maximum', q?.maximum ?? route?.maximum)}
      {row('final', 'You receive', q ? `${q.outputAmount} ${q.destinationSymbol}` : undefined)}
      <div className="pt-2 text-xs s-muted">
        {q?.calculation && <p className="mb-1" data-testid="text-calculation">{q.calculation}</p>}
        <p>Sandbox pricing only. No funds move until a real execution workflow is configured.</p>
        {q?.rateProvider?.includes("CoinGecko")&&<p className="mt-1">Crypto reference: <a className="s-link" href="https://www.coingecko.com/en/api" target="_blank" rel="noreferrer">CoinGecko</a>.</p>}
        {q?.rateProvider?.includes("Frankfurter")&&<p className="mt-1">Fiat: <a className="s-link" href="https://frankfurter.dev/v1/" target="_blank" rel="noreferrer">Frankfurter / ECB daily</a>, not an intraday executable price.</p>}
        {canRefresh && <button type="button" className="s-link mt-2" onClick={onRefresh} data-testid="button-refresh-quote">Request fresh quote</button>}
      </div>
    </dl>
  );
}
