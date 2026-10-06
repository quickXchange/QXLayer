import { Link } from 'wouter';
import { useGetExchangeDashboard, getGetExchangeDashboardQueryKey, useListExchangeAudit, getListExchangeAuditQueryKey } from '@workspace/api-client-react';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { ago, stamp } from '@/lib/format';
import { SimNote, OrderFlow } from './ui';
import { useIdentityResolver } from './logo-identity';
import { useGetExchangeConfiguration, getGetExchangeConfigurationQueryKey } from '@workspace/api-client-react';
import { OrderStatus } from './order-status';
import { MetricCard } from '@/components/app/metrics';

export function DashboardPanel({ tenantId }: { tenantId: string }) {
  const q = useGetExchangeDashboard(tenantId, { query: { queryKey: getGetExchangeDashboardQueryKey(tenantId) } });
  const aq = useListExchangeAudit(tenantId, { page: 1 }, { query: { queryKey: getListExchangeAuditQueryKey(tenantId, { page: 1 }) } });
  const cfg = useGetExchangeConfiguration(tenantId, { query: { queryKey: getGetExchangeConfigurationQueryKey(tenantId) } });
  const idr = useIdentityResolver(cfg.data?.configuration, cfg.data?.catalog);
  const d = q.data;
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError || !d) return <ErrorState what="the exchange dashboard" onRetry={() => q.refetch()} />;
  const base = `/clients/${tenantId}/exchange`;
  const stats: [string, number][] = [['Total orders', d.total], ['Pending', d.pending], ['Processing', d.processing], ['Completed', d.completed], ['Cancelled', d.cancelled], ['Failed', d.failed], ['Customers (identified)', d.customers ?? 0], ['Active assets', d.assets], ['Active networks', d.networks], ['Active payment methods', d.paymentMethods ?? 0], ['Routes', d.routes]];
  return (
    <div className="space-y-8">
      <SimNote />
      <p className="text-sm" data-testid="text-dashboard-enabled">Exchange is <b>{d.enabled ? 'enabled' : 'not enabled'}</b> for this tenant.</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map(([l, v]) => <MetricCard key={l} label={l} value={v} id={`stat-exchange-${l.toLowerCase()}`} />)}
      </div>
      <section><h2 className="font-display mb-2 text-2xl">Quick actions</h2>
        <div className="flex flex-wrap gap-2">{[['orders', 'Review orders'], ['assets', 'Manage assets'], ['payment-methods', 'Payment methods'], ['pricing', 'Pricing & fees'], ['providers', 'Providers'], ['branding', 'Branding']].map(([k, l]) => <Link key={k} href={`${base}/${k}`} data-testid={`link-quick-${k}`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">{l}</Link>)}</div></section>
      <section><h2 className="font-display mb-2 text-2xl">Input volume by asset</h2>
        {d.volume.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No volume yet. Units are never summed across assets.</p> : (
          <div className="grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-4">{d.volume.map((v) => <div key={v.symbol} className="bg-card p-4" data-testid={`volume-${v.symbol}`}><p className="font-mono text-xs text-copper">{v.symbol}</p><p className="mt-1 break-all font-mono text-sm">{v.amount}</p></div>)}</div>)}
      </section>
      <section><div className="mb-2 flex items-baseline justify-between"><h2 className="font-display text-2xl">Recent orders</h2><Link href={`${base}/orders`} className="text-sm text-copper hover:underline" data-testid="link-all-orders">All orders</Link></div>
        {d.recentOrders.length === 0 ? <EmptyState title="No orders yet" body="Simulated orders placed on this tenant's widget appear here." /> : (
          <ul className="divide-y rounded-md border bg-card">{d.recentOrders.map((o) => (
            <li key={o.id}><Link href={`${base}/orders/${o.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50" data-testid={`row-recent-${o.id}`}>
              <span className="font-mono text-[10px] uppercase text-copper">{o.action}</span><OrderFlow r={idr} o={o} />
              <span className="ml-auto flex items-center gap-3"><OrderStatus status={o.status} /><span className="font-mono text-xs text-muted-foreground">{ago(o.createdAt)}</span></span></Link></li>))}</ul>)}
      </section>
      <section><div className="mb-2 flex items-baseline justify-between"><h2 className="font-display text-2xl">Recent activity</h2><Link href={`${base}/audit`} className="text-sm text-copper hover:underline" data-testid="link-all-activity">All activity</Link></div>
        {(aq.data?.events ?? []).length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{aq.isError ? 'Activity could not be loaded.' : 'No activity recorded yet.'}</p> : (
          <ul className="divide-y rounded-md border bg-card">{aq.data!.events.slice(0, 6).map((a) => <li key={a.id} className="px-4 py-2 text-sm" data-testid={`row-activity-${a.id}`}>{a.description}<span className="ml-2 font-mono text-xs text-muted-foreground">{stamp(a.createdAt)}</span></li>)}</ul>)}
      </section>
    </div>
  );
}
