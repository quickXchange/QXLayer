import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetWhiteLabelRequest, getGetWhiteLabelRequestQueryKey, getListWhiteLabelRequestsQueryKey } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderStatus, OrderSummary, Timeline } from '@/components/customer/order-view';
import { ReviewForm } from '@/components/operator/review-form';
import { NoteForm, Delivery } from '@/components/operator/notes-delivery';
import { OrderActions } from '@/components/super-admin/order-actions';
import { Panel } from '@/components/super-admin/kit';
import { orderRef } from '@/lib/wl';

export default function WhiteLabelOrder() {
  const { orderId = '' } = useParams<{ orderId: string }>(); const qc = useQueryClient();
  const [tab, setTab] = useState('summary');
  const key = getGetWhiteLabelRequestQueryKey(orderId);
  const q = useGetWhiteLabelRequest(orderId, { query: { queryKey: key, enabled: !!orderId } });
  const d = q.data;
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: getListWhiteLabelRequestsQueryKey() }); qc.invalidateQueries(); };
  if (q.isLoading) return <ListSkeleton rows={4} />;
  if (q.isError || !d) return <ErrorState what="this order" onRetry={() => q.refetch()} />;
  const o = d.order;
  const notes = (v: 'internal' | 'customer') => d.history.filter((e) => e.kind === 'note' && e.visibility === v);
  const status = d.history.filter((e) => e.kind === 'status');
  return (
    <>
      <PageHeader eyebrow={`Order ${orderRef(o)}`} title={o.projectName}><OrderStatus status={o.status} /><Button asChild variant="outline" size="sm"><Link href="/white-label-requests">All orders</Link></Button></PageHeader>
      <p className="mb-4 text-sm text-muted-foreground [overflow-wrap:anywhere]">Customer: {o.companyName || o.brandName} <span className="font-mono text-xs">({o.customerUserId})</span></p>
      <div className="mb-6"><OrderActions o={o} onDone={refresh} onDeliver={() => setTab('delivery')} /></div>
      <Tabs value={tab} onValueChange={setTab}>
        <div className="mb-4 overflow-x-auto"><TabsList className="w-max">
          {[['summary', 'Summary'], ['review', 'Review & pricing'], ['delivery', 'Delivery'], ['internal', `Internal notes (${notes('internal').length})`], ['customer', `Customer notes (${notes('customer').length})`], ['timeline', 'Timeline']].map(([v, l]) => <TabsTrigger key={v} value={v} data-testid={`tab-order-${v}`}>{l}</TabsTrigger>)}
        </TabsList></div>
        <TabsContent value="summary"><OrderSummary o={o} /></TabsContent>
        <TabsContent value="review"><div className="max-w-3xl"><Panel title="Review, pricing and status"><ReviewForm key={`${o.id}-${o.updatedAt}`} o={o} onDone={refresh} /></Panel></div></TabsContent>
        <TabsContent value="delivery"><div className="max-w-3xl"><Panel title="Delivery"><Delivery o={o} onDone={refresh} /></Panel></div></TabsContent>
        <TabsContent value="internal"><div className="max-w-3xl"><Panel title="Internal notes" note="Never shown to the customer."><NoteForm fixed="internal" id={o.id} onDone={refresh} />
          <div className="mt-5">{notes('internal').length ? <Timeline history={notes('internal')} customerUserId={o.customerUserId} /> : <EmptyState title="No internal notes" body="Notes added here stay with operators." />}</div></Panel></div></TabsContent>
        <TabsContent value="customer"><div className="max-w-3xl"><Panel title="Customer notes" note="Visible to the customer on their order."><NoteForm fixed="customer" id={o.id} onDone={refresh} />
          <div className="mt-5">{notes('customer').length ? <Timeline history={notes('customer')} customerUserId={o.customerUserId} /> : <EmptyState title="No customer notes" body="Messages sent to the customer appear here." />}</div></Panel></div></TabsContent>
        <TabsContent value="timeline"><div className="max-w-3xl"><Panel title="Status timeline"><Timeline history={status} customerUserId={o.customerUserId} empty="No status changes recorded." /></Panel></div></TabsContent>
      </Tabs>
    </>
  );
}
