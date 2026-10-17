import { useEffect, useState } from 'react';
import { Link, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { trackSandboxOrder } from '@workspace/api-client-react';
import { Gate } from './site';
import { OrderView } from '../components/exchange/order-view';

export default function OrderTracking() {
  const { slug = '', orderId = '' } = useParams<{ slug: string; orderId: string }>();
  const [token, setToken] = useState(() => window.location.hash.slice(1));
  const [entry, setEntry] = useState(token);
  useEffect(() => {
    const sync = () => { const next = window.location.hash.slice(1); setToken(next); setEntry(next); };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [slug, orderId]);
  const malformed = token.length > 0 && token.length < 32;
  const q = useQuery({
    queryKey: ['sandbox-order-tracking', slug, orderId, token],
    queryFn: () => trackSandboxOrder(slug, orderId, { headers: { trackingToken: token } }),
    enabled: token.length >= 32, retry: false, refetchInterval: 15000,
  });
  const needsCode = token.length < 32 || q.isError;
  return <Gate slug={slug}>{(site) => <section className="s-wrap py-10 sm:py-16">
    <Link href={`/${slug}`} className="s-link s-noprint">Back to exchange</Link>
    <div className="mt-6">
      {q.isLoading && token && <div className="s-glowframe mx-auto max-w-3xl" aria-busy="true" data-testid="state-order-loading"><div className="s-glowinner space-y-4 p-8"><div className="h-6 w-40 animate-pulse rounded" style={{ background: 'var(--s-line)' }} /><div className="h-10 w-3/4 animate-pulse rounded" style={{ background: 'var(--s-line)' }} /><div className="h-24 animate-pulse rounded" style={{ background: 'var(--s-line)' }} /></div></div>}
      {needsCode && !q.isLoading && <div className="s-glowframe mx-auto max-w-xl"><div className="s-glowinner p-6 sm:p-9">
        <h1 className="text-2xl font-semibold">Track your exchange order</h1>
        <p className="s-muted mt-2 break-all text-xs">{orderId}</p>
        {(q.isError || malformed) && <p role="alert" className="mt-4 text-sm">Order not available. Check your private tracking link and the client website.</p>}
        <form className="mt-5" onSubmit={(e) => { e.preventDefault(); setToken(entry.trim()); }}>
          <label className="s-muted text-sm">Private tracking code<input className="mt-2 w-full rounded-lg border bg-transparent p-3" value={entry} onChange={(e) => setEntry(e.target.value)} required minLength={32} maxLength={200} data-testid="input-tracking-code" /></label>
          <button type="submit" className="s-btn s-btn-primary mt-3" data-testid="button-track-order">Track order</button>
        </form>
      </div></div>}
      {q.data && !q.isError && token.length >= 32 && <OrderView site={site} order={q.data} token={token} refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
    </div>
  </section>}</Gate>;
}
