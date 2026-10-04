import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import {
  useListExchangeOrders, getListExchangeOrdersQueryKey, useGetExchangeOrder, getGetExchangeOrderQueryKey,
  useUpdateExchangeOrderStatus, getGetExchangeDashboardQueryKey, type ListExchangeOrdersParams,
} from '@workspace/api-client-react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { useToast } from '@/hooks/use-toast';
import { useInvalidateTenant } from '@/lib/invalidate';
import { stamp } from '@/lib/format';
import { Pick, SimNote } from './ui';
import { NEXT, OrderStatus } from './order-status';

const ALL = 'all';
export function OrdersPanel({ tenantId }: { tenantId: string }) {
  const [, nav] = useLocation();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [page, setPage] = useState(1);
  const params: ListExchangeOrdersParams = { ...(search ? { search } : {}), ...(status !== ALL ? { status } : {}), ...(action !== ALL ? { action } : {}), page };
  const q = useListExchangeOrders(tenantId, params, { query: { queryKey: getListExchangeOrdersQueryKey(tenantId, params), placeholderData: keepPreviousData } });
  const d = q.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;
  const base = `/clients/${tenantId}/exchange/orders`;
  return (
    <div className="space-y-4">
      <SimNote />
      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(text.trim()); setPage(1); }}>
        <Input data-testid="input-order-search" className="w-64" placeholder="Search order id, symbol" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="w-40"><Pick testid="select-order-status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[[ALL, 'Any status'], ['pending', 'Pending'], ['processing', 'Processing'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['failed', 'Failed']]} /></div>
        <div className="w-40"><Pick testid="select-order-action" value={action} onChange={(v) => { setAction(v); setPage(1); }} options={[[ALL, 'Any action'], ['swap', 'Swap'], ['convert', 'Convert'], ['buy', 'Buy'], ['sell', 'Sell']]} /></div>
        <Button data-testid="button-order-search">Search</Button>
      </form>
      {q.isLoading ? <ListSkeleton /> : q.isError || !d ? <ErrorState what="orders" onRetry={() => q.refetch()} /> : d.orders.length === 0 ? <EmptyState title="No orders match" body="Adjust the filters, or wait for simulated orders from this tenant's widget." /> : (
        <>
          <div className="overflow-x-auto rounded-md border bg-card">
            <table className="w-full text-left text-sm"><thead className="border-b font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{['Order', 'Action', 'Input', 'Output', 'Status', 'Created'].map((h) => <th key={h} className="px-3 py-2 font-normal">{h}</th>)}</tr></thead>
              <tbody className="divide-y">{d.orders.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-muted/50" data-testid={`row-order-${o.id}`} onClick={() => nav(`${base}/${o.id}`)}>
                  <td className="px-3 py-2 font-mono text-xs"><Link href={`${base}/${o.id}`} onClick={(e) => e.stopPropagation()}>{o.id.slice(0, 8)}</Link></td>
                  <td className="px-3 py-2 capitalize">{o.action}</td>
                  <td className="px-3 py-2 font-mono text-xs">{o.inputAmount} {o.sourceSymbol}</td>
                  <td className="px-3 py-2 font-mono text-xs">{o.outputAmount} {o.destinationSymbol}</td>
                  <td className="px-3 py-2"><OrderStatus status={o.status} /></td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{stamp(o.createdAt)}</td></tr>))}</tbody></table>
          </div>
          <div className="flex items-center justify-between text-sm"><span className="font-mono text-xs text-muted-foreground" data-testid="text-order-total">{d.total} orders, page {d.page} of {pages}</span>
            <div className="flex gap-2"><Button variant="outline" size="sm" data-testid="button-page-prev" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" data-testid="button-page-next" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button></div></div>
        </>)}
    </div>
  );
}

export function OrderDetail({ tenantId, orderId, canEdit }: { tenantId: string; orderId: string; canEdit: boolean }) {
  const qc = useQueryClient(); const inv = useInvalidateTenant(); const { toast } = useToast();
  const key = getGetExchangeOrderQueryKey(tenantId, orderId);
  const q = useGetExchangeOrder(tenantId, orderId, { query: { queryKey: key } });
  const m = useUpdateExchangeOrderStatus();
  const [note, setNote] = useState('');
  const o = q.data;
  const next = o ? NEXT[o.status] ?? [] : [];
  const go = (status: string) => m.mutate({ tenantId, orderId, data: { status: status as 'processing', note: note.trim() } }, {
    onSuccess: (r) => { qc.setQueryData(key, r); qc.invalidateQueries({ queryKey: getListExchangeOrdersQueryKey(tenantId) }); qc.invalidateQueries({ queryKey: getGetExchangeDashboardQueryKey(tenantId) }); inv(tenantId); setNote(''); toast({ title: `Order marked ${status}` }); },
    onError: (e) => toast({ title: 'Status change failed', description: (e as Error).message, variant: 'destructive' }),
  });
  return (
    <div className="space-y-5">
      <Link href={`/clients/${tenantId}/exchange/orders`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-orders"><ArrowLeft className="h-4 w-4" /> Orders</Link>
      <SimNote />
      {q.isLoading ? <ListSkeleton rows={3} /> : q.isError || !o ? <ErrorState what="this order" onRetry={() => q.refetch()} /> : (
        <>
          <div className="flex items-center gap-3"><h2 className="font-display text-3xl">Order {o.id.slice(0, 8)}</h2><OrderStatus status={o.status} /><span className="font-mono text-[10px] uppercase text-copper">sandbox only</span></div>
          <div className="grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-4">
            {[['Action', o.action], ['Input', `${o.inputAmount} ${o.sourceSymbol}`], ['Output', `${o.outputAmount} ${o.destinationSymbol}`], ['Rate', o.rate], ['Source fee', `${o.fee} ${o.sourceSymbol}`], ['Destination fee', `${o.destinationFee ?? '0'} ${o.destinationSymbol}`], ['Spread', `${o.spreadBps} bps`], ['Payment method', o.paymentMethod ?? 'none'], ['Created', stamp(o.createdAt)]].map(([l, v]) => (
              <div key={l} className="bg-card p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p><p className="mt-1 break-all font-mono text-sm capitalize">{v}</p></div>))}
          </div>
          <section><h3 className="font-display mb-2 text-xl">History</h3>
            <ol className="space-y-2 border-l pl-4">{o.history.map((h, i) => <li key={i} data-testid={`row-history-${i}`}><OrderStatus status={h.status} /><span className="ml-2 font-mono text-xs text-muted-foreground">{stamp(h.at)}</span>{h.note && <p className="mt-1 text-sm">{h.note}</p>}</li>)}</ol></section>
          {next.length === 0 ? <p className="rounded-md border p-3 text-sm text-muted-foreground" data-testid="text-terminal">This order is {o.status}. Terminal orders cannot be reopened.</p> : !canEdit ? <p className="text-sm text-muted-foreground">Read only: updating orders needs configuration access, an active subscription and the exchange feature.</p> : (
            <section className="space-y-2 rounded-md border bg-card p-4"><h3 className="font-display text-xl">Update status</h3>
              <p className="text-xs text-muted-foreground">Simulated workflow only. Pending moves to processing, cancelled or failed. Processing moves to completed, cancelled or failed. No funds move.</p>
              <Textarea data-testid="input-status-note" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex flex-wrap gap-2">{next.map((s) => <Button key={s} data-testid={`button-status-${s}`} variant={s === 'completed' || s === 'processing' ? 'default' : 'outline'} disabled={m.isPending} onClick={() => go(s)}>Mark {s}</Button>)}</div></section>)}
        </>)}
    </div>
  );
}
