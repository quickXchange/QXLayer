import { useEffect, useState } from 'react';
import type { ExchangeOrderReview, ExchangeQuote } from '@workspace/api-client-react';
import type { DetailsForm, PayoutKind } from '../../lib/exchange-details';
import type { Pair } from '../../lib/exchange-model';
import { fmtDate } from '../../lib/exchange-model';
import { OptionLogo } from './option-logo';
import { describeRule } from './quote-panel';

function useCountdown(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ReviewStep({ quote, pair, form, kind, review }: { review: ExchangeOrderReview | null; quote: ExchangeQuote; pair: Pair; form: DetailsForm; kind: PayoutKind }) {
  const left = useCountdown(quote.expiresAt);
  const R = (k: string, l: string, v?: string) => v ? <div className="flex items-start justify-between gap-4 py-1.5" key={k}><dt>{l}</dt><dd className="s-muted break-all text-right" data-testid={`text-review-${k}`}>{v}</dd></div> : null;
  const side = (label: string, amt: string, sym: string, o: Pair['from']) => (
    <div className="s-side flex items-center gap-3">
      <OptionLogo option={o} size={44} />
      <div className="min-w-0 flex-1"><p className="s-lab">{label}</p><p className="text-lg font-semibold" data-testid={`text-review-${label.replace(/\s/g, '-').toLowerCase()}`}>{amt} {sym}</p><p className="s-muted truncate text-xs">{o.title} {o.kind === 'crypto' ? `on ${o.asset?.networkName}` : ''}</p></div>
    </div>);
  const instr = review?.paymentInstructions;
  return (
    <div className="mt-5 space-y-4" data-testid="step-review">
      {side('You send', quote.inputAmount, quote.sourceSymbol, pair.from)}
      {side('You receive', quote.outputAmount, quote.destinationSymbol, pair.to)}
      <dl className="s-ratebox divide-y rounded-[var(--s-r2)] border px-4 py-2 text-sm" style={{ borderColor: 'var(--s-line)' }}>
        {R('rate', 'Exchange rate', `1 ${quote.sourceSymbol} = ${quote.rate} ${quote.destinationSymbol}`)}
        {R('fees', 'Fees', `${quote.fee} ${quote.sourceSymbol}${quote.destinationFee ? ` + ${quote.destinationFee} ${quote.destinationSymbol}` : ''}`)}
        {R('rule', 'Pricing rule', describeRule(quote.pricingRuleSnapshot))}
        {R('final', 'Final amount', `${quote.outputAmount} ${quote.destinationSymbol}`)}
        {R('valid', 'Quote valid until', `${fmtDate(quote.expiresAt)} (${left} left)`)}
      </dl>
      <dl className="s-ratebox divide-y rounded-[var(--s-r2)] border px-4 py-2 text-sm" style={{ borderColor: 'var(--s-line)' }}>
        {R('name', 'Name', form.name.trim())}{R('email', 'Email', form.email.trim())}
        {kind === 'bank' ? <>{R('holder', 'Account holder', form.beneficiaryName.trim())}{R('bank', 'Bank', form.bankName.trim())}{R('iban', 'IBAN', form.iban.trim())}{R('account', 'Account number', form.accountNumber.trim())}</> : <>{R('wallet', 'Wallet address', form.walletAddress.trim())}{R('memo', 'Memo', form.memo.trim())}</>}
        {R('description', 'Payment description', form.paymentDescription.trim())}{R('telegram', 'Telegram', form.telegram.trim())}{R('phone', 'Phone', form.phone.trim())}{R('address', 'Address', form.address.trim())}
      </dl>
      <div className="rounded-[var(--s-r2)] border p-4 text-sm" style={{ borderColor: 'var(--s-line)' }} data-testid="text-review-instructions">
        <p className="font-semibold">Payment instructions</p>
        <p className="s-muted mt-1 whitespace-pre-wrap break-words">{instr || 'No extra instructions were configured. Payment details are shown on your order page after you create it.'}</p>
        {review?.paymentAddress && <p className="mt-2 break-all text-xs" data-testid="text-review-address"><span className="s-lab">Address </span>{review.paymentAddress}</p>}
        {review?.paymentMemo && <p className="mt-1 break-all text-xs" data-testid="text-review-memo"><span className="s-lab">Memo </span>{review.paymentMemo}</p>}
      </div>
    </div>
  );
}
