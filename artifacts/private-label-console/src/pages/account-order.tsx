import { Link, useParams } from 'wouter';
import { useGetMyWhiteLabelRequest, getGetMyWhiteLabelRequestQueryKey } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { OrderStatus, OrderSummary, Timeline } from '@/components/customer/order-view';
import { StageTracker } from '@/components/customer/stage-tracker';
import { orderRef } from '@/lib/wl';

export default function AccountOrderDetail() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const q = useGetMyWhiteLabelRequest(orderId, { query: { queryKey: getGetMyWhiteLabelRequestQueryKey(orderId), enabled: !!orderId, refetchInterval: 10000, refetchOnWindowFocus: true } });
  const d = q.data;
  if (q.isLoading) return <ListSkeleton rows={4} />;
  if (q.isError || !d) return <ErrorState what="this order" onRetry={() => q.refetch()} />;
  const o = d.order; const customer = d.history.filter((e) => e.visibility === 'customer');
  const tid = o.tenantId; const delivered = o.status === 'delivered'; const admin = o.adminPanelUrl;
  return (
    <>
      <PageHeader eyebrow={`Order ${orderRef(o)}`} title={o.projectName}><OrderStatus status={o.status} /><Button asChild variant="outline" size="sm"><Link href="/account/orders">All orders</Link></Button></PageHeader>
      <StageTracker o={o} history={customer} />
      {['delivered', 'provisioned'].includes(o.status) && tid && <div className="mb-4"><Button asChild><Link href={`/clients/${tid}/exchange`}>Open Admin</Link></Button></div>}
      {delivered && (o.websiteUrl || admin) && <div className="mb-4 space-y-2 rounded-md border bg-card p-4 text-sm" data-testid="panel-delivery">
        <p>Your website has been delivered. Sign in with this account to manage it in the Admin Panel.</p>
        <div className="flex flex-wrap gap-4">
          {o.websiteUrl && <a href={o.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-copper underline" data-testid="link-website">Open website</a>}
          {admin && (admin.startsWith('/') ? <Link href={admin} className="text-copper underline" data-testid="link-admin-panel">Admin Panel</Link> : <a href={admin} className="text-copper underline" data-testid="link-admin-panel">Admin Panel</a>)}
        </div></div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <OrderSummary o={o} />
        <aside className="space-y-4"><div className="rounded-md border bg-card p-5"><h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-copper">Status and notes</h2>
          {customer.length ? <Timeline history={customer} customerUserId={o.customerUserId} /> : <EmptyState title="No updates yet" body="Status updates and notes from our team appear here." />}</div></aside>
      </div>
    </>
  );
}
