import { Link } from 'wouter';
import { useGetExchangeDashboard, getGetExchangeDashboardQueryKey } from '@workspace/api-client-react';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { ago } from '@/lib/format';
import { SimNote } from './ui';
import { OrderStatus } from './order-status';
import { MetricCard } from '@/components/app/metrics';

export function DashboardPanel({ tenantId }: { tenantId: string }) {
  const q = useGetExchangeDashboard(tenantId, { query: { queryKey: getGetExchangeDashboardQueryKey(tenantId) } });
  const d = q.data;
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError || !d) return <ErrorState what="the exchange dashboard" onRetry={() => q.refetch()} />;
  const base = `/clients/${tenantId}/exchange`;
  const stats: [string, number][] = [['Orders', d.total], ['Pending', d.pending], ['Processing', d.processing], ['Completed', d.completed], ['Cancelled', d.cancelled], ['Failed', d.failed], ['Assets', d.assets], ['Networks', d.networks], ['Routes', d.routes]];
  return (
    <div className="space-y-8">
      <SimNote />
      <p className="text-sm" data-testid="text-dashboard-enabled">Exchange is <b>{d.enabled ? 'enabled' : 'not enabled'}</b> for this tenant.</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map(([l, v]) => <MetricCard key={l} label={l} value={v} id={`stat-exchange-${l.toLowerCase()}`} />)}
      </div>
      <section><h2 className="font-display mb-2 text-2xl">Input volume by asset</h2>
        {d.volume.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No volume yet. Units are never summed across assets.</p> : (
          <div className="grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-4">{d.volume.map((v) => <div key={v.symbol} className="bg-card p-4" data-testid={`volume-${v.symbol}`}><p className="font-mono text-xs text-copper">{v.symbol}</p><p className="mt-1 break-all font-mono text-sm">{v.amount}</p></div>)}</div>)}
      </section>
      <section><div className="mb-2 flex items-baseline justify-between"><h2 className="font-display text-2xl">Recent orders</h2><Link href={`${base}/orders`} className="text-sm text-copper hover:underline" data-testid="link-all-orders">All orders</Link></div>
        {d.recentOrders.length === 0 ? <EmptyState title="No orders yet" body="Simulated orders placed on this tenant's widget appear here." /> : (
          <ul className="divide-y rounded-md border bg-card">{d.recentOrders.map((o) => (
            <li key={o.id}><Link href={`${base}/orders/${o.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50" data-testid={`row-recent-${o.id}`}>
              <span className="font-mono text-[10px] uppercase text-copper">{o.action}</span><span className="font-mono">{o.inputAmount} {o.sourceSymbol} to {o.outputAmount} {o.destinationSymbol}</span>
              <span className="ml-auto flex items-center gap-3"><OrderStatus status={o.status} /><span className="font-mono text-xs text-muted-foreground">{ago(o.createdAt)}</span></span></Link></li>))}</ul>)}
      </section>
    </div>
  );
}
