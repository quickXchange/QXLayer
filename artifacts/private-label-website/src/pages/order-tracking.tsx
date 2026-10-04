import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { trackSandboxOrder } from '@workspace/api-client-react';
import { Gate } from './site';

export default function OrderTracking() {
  const { slug = '', orderId = '' } = useParams<{ slug: string; orderId: string }>();
  const [token, setToken] = useState(() => window.location.hash.slice(1));
  const [entry, setEntry] = useState(token);
  const q = useQuery({
    queryKey: ['sandbox-order-tracking', slug, orderId, token],
    queryFn: () => trackSandboxOrder(slug, orderId, { headers: { trackingToken: token } }),
    enabled: token.length >= 32, retry: false, refetchInterval: 15000,
  });
  return <Gate slug={slug}>{() => <section className="s-wrap py-16">
    <Link href={`/${slug}`} className="s-link">Back to exchange</Link>
    <div className="s-glowframe mx-auto mt-8 max-w-2xl"><div className="s-glowinner p-6 sm:p-9">
      <span className="s-badge">Sandbox tracking · no real funds</span>
      <h1 className="mt-4 text-3xl font-semibold">Track your exchange order</h1>
      <p className="s-muted mt-3 break-all text-xs">{orderId}</p>
      {!token && <form className="mt-5" onSubmit={e => { e.preventDefault(); setToken(entry.trim()); }}>
        <label className="s-muted text-sm">Private tracking code<input className="mt-2 w-full rounded-lg border bg-transparent p-3" value={entry} onChange={e => setEntry(e.target.value)} required minLength={32} maxLength={200} /></label>
        <button type="submit" className="s-btn s-btn-primary mt-3">Track sandbox order</button>
      </form>}
      {q.isLoading && token && <p className="s-muted mt-6">Loading order…</p>}
      {q.isError && <p role="alert" className="mt-6 text-sm">Order not available. Check your private tracking link and the client website.</p>}
      {q.data && <div className="mt-6 space-y-4" data-testid="page-order-tracking">
        <p className="font-semibold capitalize" data-testid="text-tracking-status">{q.data.action} · {q.data.status}</p>
        <p>{q.data.inputAmount} {q.data.sourceSymbol} → {q.data.outputAmount} {q.data.destinationSymbol}</p>
        <p className="s-muted text-sm">Rate: {q.data.rate} · source fee: {q.data.fee} {q.data.sourceSymbol} · markup: {q.data.spreadBps / 100}%</p>
        {q.data.destinationFee && <p className="s-muted text-sm">Destination network fee: {q.data.destinationFee} {q.data.destinationSymbol} (included in output)</p>}
        {q.data.paymentMethod && <p className="s-muted text-sm">Configured method: {q.data.paymentMethod} (not charged)</p>}
        <ol className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--s-line)' }}>{q.data.history.map((event, i) => <li key={i} className="text-sm"><p className="capitalize">{event.status} · {new Date(event.at).toLocaleString()}</p><p className="s-muted mt-1">{event.note}</p></li>)}</ol>
        <button type="button" className="s-btn" onClick={() => q.refetch()}>Refresh status</button>
        <p className="s-muted text-xs">Every status is simulated. This order has no deposit address, wallet, blockchain transaction or payment.</p>
      </div>}
    </div></div>
  </section>}</Gate>;
}