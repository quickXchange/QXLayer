import { useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Link } from 'wouter';
import { AlertTriangle, Check, Copy, Download, Printer, RefreshCw, XCircle } from 'lucide-react';
import type { ExchangeOrder, PublicSite } from '@workspace/api-client-react';
import { downloadSandboxOrderInvoice, getGetPublicExchangeQueryKey, useGetPublicExchange } from '@workspace/api-client-react';
import '../../styles/site-exchange.css';
import { fmtDate, methodCurrencies, pricingLabel } from '../../lib/exchange-model';
import { LogoCircle } from './option-logo';
import { Coin } from '../asset-picker';
import { describeRule } from './quote-panel';

const TIMELINE = ['CREATED', 'DETECTED', 'PROCESSING', 'DONE'];
/** Stage is derived strictly from backend-reported status and payment verification. */
export function stageOf(o: ExchangeOrder): number {
  if (o.status === 'completed') return 3;
  if (o.status === 'processing') return 2;
  if (o.paymentVerification === 'verified') return 1;
  return 0;
}
const COPY: Record<string, { title: string; body: string }> = {
  pending: { title: 'Order created', body: 'We are waiting for your payment to be detected and verified.' },
  processing: { title: 'Order processing', body: 'Your payment was verified and the exchange is being processed.' },
  completed: { title: 'Transaction complete', body: 'This exchange was confirmed as completed.' },
  cancelled: { title: 'Order cancelled', body: 'This order was cancelled and will not be processed.' },
  failed: { title: 'Order failed', body: 'This order could not be completed. Contact support with your order number.' },
};

export function OrderView({ site, order, token, refreshing, onRefresh }: { site: PublicSite; order: ExchangeOrder; token: string; refreshing: boolean; onRefresh: () => void }) {
  const slug = site.tenantSlug;
  const cfg = useGetPublicExchange(slug, { query: { queryKey: getGetPublicExchangeQueryKey(slug), staleTime: 60000 } }).data;
  const [msg, setMsg] = useState('');
  const [dl, setDl] = useState('');
  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); setMsg(`${label} copied.`); } catch { setMsg('Copy is unavailable here. Select the text and copy it manually.'); }
  };
  const stage = stageOf(order);
  const bad = order.status === 'cancelled' || order.status === 'failed';
  const review = order.paymentVerification === 'review' && !bad && order.status !== 'completed';
  const copyBlock = COPY[order.status] ?? { title: 'Order update', body: 'Status is shown as reported by the exchange.' };
  const title = copyBlock.title;
  const qrSvg = useMemo(() => { if (!order.paymentAddress) return null; try { const q = qrcode(0, 'M'); q.addData(order.paymentAddress); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch { return null; } }, [order.paymentAddress]);
  const trackUrl = `${window.location.origin}${import.meta.env.BASE_URL}${slug}/orders/${order.id}#${token}`;
  const d = order.customerDetails ?? {};

  const logo = (endpoint: string, sym: string) => {
    const a = cfg?.assets.find((x) => x.assetNetworkId === endpoint);
    if (a) return <Coin asset={a} size={44} />;
    const m = cfg?.paymentMethods.find((x) => x.id === order.paymentMethodId) ?? cfg?.paymentMethods.find((x) => endpoint.startsWith('fiat:') && methodCurrencies(x).includes(endpoint.slice(5)));
    return <LogoCircle url={endpoint.startsWith('fiat:') ? m?.logoUrl : null} label={sym} size={44} />;
  };
  const netOf = (endpoint: string) => cfg?.assets.find((x) => x.assetNetworkId === endpoint)?.networkName ?? (order.paymentMethod && endpoint.startsWith('fiat:') ? order.paymentMethod : '');

  const details: [string, string | undefined][] = [
    ['Account holder', d.beneficiaryName], ['Bank', d.bankName], ['IBAN', d.iban], ['Account number', d.accountNumber], ['Wallet address', d.walletAddress], ['Memo', d.memo],
    ['Payment description', d.paymentDescription], ['Telegram', d.telegram], ['Phone', d.phone], ['Address', d.address],
  ];
  const shown = details.filter((x): x is [string, string] => !!x[1]);
  const reference = order.depositReference ?? order.payoutReference;
  const allText = [`Order ${order.id}`, order.paymentAddress ? `Address: ${order.paymentAddress}` : '', order.paymentMemo ? `Memo: ${order.paymentMemo}` : '', `${order.inputAmount} ${order.sourceSymbol} -> ${order.outputAmount} ${order.destinationSymbol}`, order.paymentInstructions ?? '', reference ? `Reference: ${reference}` : '', ...shown.map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join('\n');

  const download = async () => {
    setDl('Preparing PDF…');
    try {
      const blob = await downloadSandboxOrderInvoice(slug, order.id, { headers: { trackingToken: token } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${site.brandName.replace(/\W+/g, '-').toLowerCase()}-invoice-${order.id.slice(0, 8)}.pdf`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDl('Download started.');
    } catch { setDl('PDF unavailable right now. Try again shortly.'); }
  };
  const print = async () => {
    setDl('Preparing invoice…');
    try {
      const blob = await downloadSandboxOrderInvoice(slug, order.id, { headers: { trackingToken: token } });
      const url = URL.createObjectURL(blob);
      const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; f.src = url;
      f.onload = () => { try { f.contentWindow?.focus(); f.contentWindow?.print(); setDl(''); } catch { setDl('Printing is blocked here. Use Download PDF instead.'); } setTimeout(() => { f.remove(); URL.revokeObjectURL(url); }, 60000); };
      document.body.appendChild(f);
    } catch { setDl('PDF unavailable right now. Try again shortly.'); }
  };
  const Row = ({ k, l, v }: { k: string; l: string; v?: string | null }) => v ? <div className="flex items-start justify-between gap-4 py-2"><dt>{l}</dt><dd className="s-muted break-all text-right" data-testid={`text-order-${k}`}>{v}</dd></div> : null;
  const card = 'rounded-[var(--s-r2)] border p-4 sm:p-5';
  const line = { borderColor: 'var(--s-line)' };
  const reviewLinks = site.websiteSettings.reviewLinks ?? [];

  return (
    <div className="s-printarea mx-auto max-w-3xl space-y-5" data-testid="page-order-tracking">
      <div className="s-printonly items-center gap-3 border-b pb-3" style={line}>
        {site.logoUrl && <img src={site.logoUrl} alt="" height={40} style={{ height: 40 }} />}
        <div><p className="text-lg font-semibold">{site.brandName}</p><p className="text-xs">Exchange order invoice</p></div>
      </div>
      <div className="s-glowframe"><div className="s-glowinner p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="s-badge" data-testid="badge-order-status">{order.status}</span>
          <div className="flex items-center gap-2">{site.logoUrl && <img src={site.logoUrl} alt="" height={28} style={{ height: 28 }} className="s-noprint" />}<span className="text-sm font-semibold">{site.brandName}</span></div>
        </div>
        <p className="s-lab mt-4">Current status</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl" data-testid="text-tracking-heading">{title}</h1>
        <p className="s-muted mt-2 text-sm" data-testid="text-tracking-status">{copyBlock.body}</p>
        {review && <p className="mt-3 flex items-start gap-2 text-sm" data-testid="text-verification-review"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Your payment is under manual review. This can take longer than usual.</p>}
        {bad && <p className="mt-3 flex items-start gap-2 text-sm" role="alert"><XCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />No funds are shown as received or sent for this order.</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="s-lab">Order number</span><code className="break-all text-sm" data-testid="text-order-id">{order.id}</code>
          <button type="button" className="s-btn s-noprint" onClick={() => copy(order.id, 'Order number')} data-testid="button-copy-order-id"><Copy size={14} aria-hidden="true" /> Copy</button>
        </div>
        <ol className="s-tl mt-8" aria-label="Order progress" data-testid="timeline-order">
          {TIMELINE.map((t, i) => <li key={t} className="s-tl-step" data-done={!bad && i <= stage} data-current={!bad && i === stage} data-bad={bad && i === stage} data-testid={`timeline-${t.toLowerCase()}`}><span className="s-tl-dot">{!bad && i <= stage ? <Check size={14} aria-hidden="true" /> : i + 1}</span>{t}</li>)}
        </ol>
        {bad && <p className="s-muted mt-4 text-center text-xs">Progress stopped at {TIMELINE[stage]}.</p>}
      </div></div>

      <section className={card} style={line} aria-label="Exchange summary">
        <h2 className="text-lg font-semibold">Exchange summary</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[['You send', order.inputAmount, order.sourceSymbol, order.source], ['You receive', order.outputAmount, order.destinationSymbol, order.destination]].map(([l, a, s, e]) => (
            <div key={l} className="s-side flex items-center gap-3">{logo(e, s)}<div className="min-w-0"><p className="s-lab">{l}</p><p className="text-lg font-semibold" data-testid={`text-order-${l.replace(' ', '-').toLowerCase()}`}>{a} {s}</p><p className="s-muted truncate text-xs">{netOf(e)}</p></div></div>
          ))}
        </div>
        <dl className="mt-3 divide-y text-sm" style={line}>
          <Row k="rate" l="Rate" v={`1 ${order.sourceSymbol} = ${order.rate} ${order.destinationSymbol}`} />
          {order.marketRate && <Row k="market" l="Market rate" v={`${order.marketRate}${order.rateProvider ? ` (${order.rateProvider}${order.rateUpdatedAt ? `, ${fmtDate(order.rateUpdatedAt)}` : ''})` : ''}`} />}
          <Row k="fees" l="Fees" v={`${order.fee} ${order.sourceSymbol}${order.destinationFee ? ` + ${order.destinationFee} ${order.destinationSymbol}` : ''}`} />
          <Row k="rule" l="Pricing rule" v={order.pricingRuleSnapshot ? describeRule(order.pricingRuleSnapshot) : undefined} />
          <Row k="basis" l="Pricing source" v={pricingLabel(order.pricingSource)} />
          <Row k="method" l="Payment method" v={order.paymentMethod ?? undefined} />
          <Row k="created" l="Created" v={fmtDate(order.createdAt)} />
          <Row k="completed" l="Completed" v={fmtDate(order.completedAt)} />
          <Row k="customer" l="Customer" v={[order.customerName, order.customerEmail].filter(Boolean).join(' / ')} />
        </dl>
        {order.calculation && <p className="s-muted mt-2 text-xs">{order.calculation}</p>}
      </section>

      {order.status !== 'completed' && !bad && <section className={card} style={line} aria-label="Payment instructions" data-testid="panel-payment-instructions">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Payment instructions</h2><button type="button" className="s-btn s-noprint" onClick={() => copy(allText, 'Order details')} data-testid="button-copy-all"><Copy size={14} aria-hidden="true" /> Copy all</button></div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm" data-testid="text-payment-instructions">{order.paymentInstructions || 'No payment instructions were configured for this method. Contact support and quote your order number before sending anything.'}</p>
        {reference && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="s-lab">Payment reference</span><code data-testid="text-payment-reference">{reference}</code><button type="button" className="s-link s-noprint" onClick={() => copy(reference, 'Reference')}>Copy</button></div>}
        {order.paymentAddress && <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center" data-testid="panel-payment-address">
          {qrSvg && <div className="mx-auto w-40 rounded-lg bg-white p-2" role="img" aria-label="QR code of the payment address" data-testid="img-payment-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
          <div className="min-w-0 text-sm"><p className="s-lab">Send to this address</p><code className="block break-all" data-testid="text-payment-address">{order.paymentAddress}</code>
            <button type="button" className="s-btn s-noprint mt-2" onClick={() => copy(order.paymentAddress!, 'Address')} data-testid="button-copy-address"><Copy size={14} aria-hidden="true" /> Copy address</button>
            {order.paymentMemo && <div className="mt-3"><p className="s-lab">Memo / tag (required)</p><code className="break-all" data-testid="text-payment-memo">{order.paymentMemo}</code> <button type="button" className="s-link s-noprint" onClick={() => copy(order.paymentMemo!, 'Memo')} data-testid="button-copy-memo">Copy memo</button></div>}
            <p className="s-muted mt-3 text-xs">Sandbox: no real funds move. Never send real funds to this address.</p></div>
        </div>}
        {shown.length > 0 && <dl className="mt-4 divide-y text-sm" style={line} data-testid="list-order-details">{shown.map(([k, v]) => <div key={k} className="flex items-start justify-between gap-3 py-2"><dt>{k}</dt><dd className="s-muted flex items-center gap-2 break-all text-right">{v}<button type="button" className="s-link s-noprint shrink-0" onClick={() => copy(v, k)} aria-label={`Copy ${k}`}>Copy</button></dd></div>)}</dl>}
      </section>}

      {order.status === 'completed' && <section className={card} style={line} aria-label="Completed order" data-testid="panel-completed">
        <h2 className="text-lg font-semibold">Your invoice</h2>
        <p className="s-muted mt-1 text-sm">Issued by {site.brandName}{order.completedAt ? ` on ${fmtDate(order.completedAt)}` : ''}.</p>
        <div className="s-noprint mt-4 flex flex-wrap gap-3">
          <button type="button" className="s-btn s-btn-primary" onClick={download} data-testid="button-download-invoice"><Download size={14} aria-hidden="true" /> Download PDF invoice</button>
          <button type="button" className="s-btn" onClick={print} data-testid="button-print-invoice"><Printer size={14} aria-hidden="true" /> Print invoice</button>
        </div>
        {dl && <p role="status" className="s-muted mt-2 text-xs">{dl}</p>}
        {reviewLinks.length > 0 && <div className="s-noprint mt-5"><p className="mb-2 font-semibold">Leave a review</p><ul className="flex flex-wrap gap-3">{reviewLinks.map((l, i) => <li key={i}><a className="s-btn" href={l.url} target="_blank" rel="noopener noreferrer" data-testid={`link-review-${i}`}>{l.label}</a></li>)}</ul></div>}
      </section>}

      <section className={`${card} s-noprint`} style={line} aria-label="Private tracking link">
        <h2 className="text-lg font-semibold">Track this order</h2>
        <p className="s-muted mt-1 text-sm">Keep this link private. Anyone with it can view this order.</p>
        <code className="mt-3 block break-all rounded-lg border p-3 text-xs" style={line} data-testid="text-tracking-link">{trackUrl}</code>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" className="s-btn" onClick={() => copy(trackUrl, 'Tracking link')} data-testid="button-copy-tracking"><Copy size={14} aria-hidden="true" /> Copy link</button>
          <button type="button" className="s-btn" onClick={onRefresh} disabled={refreshing} data-testid="button-refresh-order"><RefreshCw size={14} aria-hidden="true" /> {refreshing ? 'Refreshing…' : 'Refresh status'}</button>
          <Link href={`/${slug}`} className="s-btn s-btn-primary" data-testid="link-start-another">Start another exchange</Link>
        </div>
        {msg && <p role="status" className="s-muted mt-3 text-xs" data-testid="text-copy-status">{msg}</p>}
        {order.history.length > 0 && <ol className="mt-5 space-y-2 border-t pt-4 text-sm" style={line}>{order.history.map((e, i) => <li key={i}><p className="capitalize">{e.status} / {fmtDate(e.at)}</p><p className="s-muted text-xs">{e.note}</p></li>)}</ol>}
        <p className="s-muted mt-4 text-xs">Sandbox exchange. Statuses reflect what the operator has recorded; nothing is marked complete automatically.</p>
      </section>
    </div>
  );
}
