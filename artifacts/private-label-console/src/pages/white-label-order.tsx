import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetWhiteLabelRequest, getGetWhiteLabelRequestQueryKey, getListWhiteLabelRequestsQueryKey } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { OrderStatus, OrderSummary, Timeline } from '@/components/customer/order-view';
import { ReviewForm } from '@/components/operator/review-form';
import { NoteForm, Delivery } from '@/components/operator/notes-delivery';
import { orderRef } from '@/lib/wl';

const Box = ({ t, children }: { t: string; children: React.ReactNode }) => <section className="rounded-md border bg-card p-5"><h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-copper">{t}</h2>{children}</section>;

export default function WhiteLabelOrder() {
  const { orderId = '' } = useParams<{ orderId: string }>(); const qc = useQueryClient();
  const key = getGetWhiteLabelRequestQueryKey(orderId);
  const q = useGetWhiteLabelRequest(orderId, { query: { queryKey: key, enabled: !!orderId } });
  const d = q.data;
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: getListWhiteLabelRequestsQueryKey() }); };
  if (q.isLoading) return <ListSkeleton rows={4} />;
  if (q.isError || !d) return <ErrorState what="this order" onRetry={() => q.refetch()} />;
  const o = d.order;
  return (
    <>
      <PageHeader eyebrow={`Order ${orderRef(o)}`} title={o.projectName}><OrderStatus status={o.status} /><Button asChild variant="outline" size="sm"><Link href="/white-label-requests">All orders</Link></Button></PageHeader>
      <p className="mb-6 font-mono text-[11px] uppercase text-muted-foreground">Customer {o.customerUserId}</p>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <OrderSummary o={o} />
        <div className="space-y-4">
          <Box t="Review, pricing and status"><ReviewForm key={`${o.id}-${o.updatedAt}`} o={o} onDone={refresh} /></Box>
          <Box t="Delivery"><Delivery o={o} onDone={refresh} /></Box>
          <Box t="Notes and history"><NoteForm id={o.id} onDone={refresh} /><div className="mt-5"><Timeline history={d.history} /></div></Box>
        </div>
      </div>
    </>
  );
}
