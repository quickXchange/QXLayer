import { Link, useParams } from 'wouter';
import { useGetMyWhiteLabelRequest, getGetMyWhiteLabelRequestQueryKey } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { OrderStatus, OrderSummary, Timeline } from '@/components/customer/order-view';
import { orderRef } from '@/lib/wl';

export default function AccountOrderDetail() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const q = useGetMyWhiteLabelRequest(orderId, { query: { queryKey: getGetMyWhiteLabelRequestQueryKey(orderId), enabled: !!orderId, refetchInterval: 10000, refetchOnWindowFocus: true } });
  const d = q.data;
  if (q.isLoading) return <ListSkeleton rows={4} />;
  if (q.isError || !d) return <ErrorState what="this order" onRetry={() => q.refetch()} />;
  const o = d.order; const customer = d.history.filter((e) => e.visibility === 'customer');
  const tid = o.tenantId;
  return (
    <>
      <PageHeader eyebrow={`Order ${orderRef(o)}`} title={o.projectName}><OrderStatus status={o.status} /><Button asChild variant="outline" size="sm"><Link href="/account/orders">All orders</Link></Button></PageHeader>
      {['delivered', 'provisioned'].includes(o.status) && tid && <div className="mb-4"><Button asChild><Link href={`/clients/${tid}/exchange`}>Open Admin</Link></Button></div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <OrderSummary o={o} />
        <aside className="space-y-4"><div className="rounded-md border bg-card p-5"><h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-copper">Status and notes</h2>
          {customer.length ? <Timeline history={customer} customerUserId={o.customerUserId} /> : <EmptyState title="No updates yet" body="Status updates and notes from our team appear here." />}</div></aside>
      </div>
    </>
  );
}
