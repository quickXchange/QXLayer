import { useState } from 'react';
import { useLocation } from 'wouter';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import {
  useListExchangeOrders, getListExchangeOrdersQueryKey, useGetExchangeOrder, getGetExchangeOrderQueryKey,
  useUpdateExchangeOrderStatus, getGetExchangeDashboardQueryKey, getListExchangeAuditQueryKey, getListExchangeCustomersQueryKey,
  useGetExchangeConfiguration, getGetExchangeConfigurationQueryKey, type ListExchangeOrdersParams, type ExchangeOrder,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { useToast } from '@/hooks/use-toast';
import { useInvalidateTenant } from '@/lib/invalidate';
import { stamp } from '@/lib/format';
import { Pick, SimNote, EndpointView, OrderFlow } from './ui';
import { useIdentityResolver } from './logo-identity';
import { NEXT, OrderStatus } from './order-status';
import { BulkBar, BulkBtn, DataTable, useConfirm, useSelection } from './bulk';
import { VisualImg, useVisualCatalog } from './visual-catalog';
import { isCalendarDate } from './ui-validate';

const ALL = 'all';

function useRefresh(tenantId: string) {
  const qc = useQueryClient(); const inv = useInvalidateTenant();
  return (orderId?: string) => {
    qc.invalidateQueries({ queryKey: getListExchangeOrdersQueryKey(tenantId) });
    qc.invalidateQueries({ queryKey: getGetExchangeDashboardQueryKey(tenantId) });
    qc.invalidateQueries({ queryKey: getListExchangeAuditQueryKey(tenantId) });
    qc.invalidateQueries({ queryKey: getListExchangeCustomersQueryKey(tenantId) });
    if (orderId) qc.invalidateQueries({ queryKey: getGetExchangeOrderQueryKey(tenantId, orderId) });
    inv(tenantId);
  };
}

export function OrdersPanel({ tenantId, canEdit, orderId }: { tenantId: string; canEdit: boolean; orderId?: string }) {
  const qc = useQueryClient(); const [, nav] = useLocation(); const { toast } = useToast(); const refresh = useRefresh(tenantId);
  const m = useUpdateExchangeOrderStatus();
  const [text, setText] = useState(''); const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL); const [action, setAction] = useState(ALL);
  const [customer, setCustomer] = useState(() => (new URLSearchParams(window.location.search).get('customer') === 'anonymous' ? 'anonymous' : ALL));
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
   const [range, setRange] = useState({ from: '', to: '' });
   const [dateError, setDateError] = useState('');
  const [bucket, setBucket] = useState<'' | 'active' | 'archived'>('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(orderId ?? null);
  const [step, setStep] = useState<null | 'form' | 'review'>(null);
  const [target, setTarget] = useState(''); const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false); const [failures, setFailures] = useState<string[]>([]);
   const params: ListExchangeOrdersParams = { ...(search ? { search } : {}), ...(status !== ALL ? { status } : {}), ...(action !== ALL ? { action } : {}), ...(bucket ? { view: bucket } : {}), ...(customer === 'anonymous' ? { customer: 'anonymous' as const } : {}), ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}), page };
  const q = useListExchangeOrders(tenantId, params, { query: { queryKey: getListExchangeOrdersQueryKey(tenantId, params), placeholderData: keepPreviousData } });
  const cfgQ = useGetExchangeConfiguration(tenantId, { query: { queryKey: getGetExchangeConfigurationQueryKey(tenantId) } });
  const idr = useIdentityResolver(cfgQ.data?.configuration, cfgQ.data?.catalog);
  const d = q.data;
  const orders = d?.orders ?? [];
  const stale = q.isFetching;
  const sel = useSelection(stale ? [] : orders.map((o) => o.id));
  const [snap, setSnap] = useState<{ id: string; status: string }[]>([]);
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;
  const chosen = stale ? [] : orders.filter((o) => sel.has(o.id));
  const allowed = chosen.length === 0 ? [] : (NEXT[chosen[0].status] ?? []).filter((s) => chosen.every((o) => (NEXT[o.status] ?? []).includes(s)));
  const snapshotAllowed = snap.length === 0 ? [] : (NEXT[snap[0].status] ?? []).filter((s) => snap.every((o) => (NEXT[o.status] ?? []).includes(s)));
  const shortcut = (v: string) => { setBucket(v === 'active' || v === 'archived' ? v : ''); setStatus(ALL); setAction(['swap', 'convert', 'buy', 'sell'].includes(v) ? v : ALL); setPage(1); sel.clear(); };
  const cur = bucket || (action !== ALL ? action : status === ALL ? 'all' : '');
  const reset = () => { setPage(1); sel.clear(); };
  const close = () => { setOpenId(null); if (orderId) nav(`/clients/${tenantId}/exchange/orders`); };
  const run = async () => {
    if (busy || !canEdit || snap.length === 0 || !snapshotAllowed.includes(target)) return; setBusy(true); setFailures([]);
    const bad: string[] = []; let ok = 0;
    for (const o of snap) {
      try { await m.mutateAsync({ tenantId, orderId: o.id, data: { status: target as 'processing', expectedStatus: o.status as 'pending', note: `Bulk: Mark ${target}. ${note.trim()}`.trim().slice(0, 500) } }); ok++; }
      catch (e) { bad.push(`${o.id}: ${(e as Error)?.message ?? 'rejected'}`); }
    }
    setBusy(false); setStep(null); setNote(''); setFailures(bad); sel.clear(); refresh(); snap.forEach((o) => qc.invalidateQueries({ queryKey: getGetExchangeOrderQueryKey(tenantId, o.id) }));
    toast({ title: bad.length ? `${ok} updated, ${bad.length} failed` : `${ok} order${ok === 1 ? '' : 's'} marked ${target}`, description: bad.length ? 'See the failure list above the table.' : undefined, variant: bad.length ? 'destructive' : undefined });
  };
  return (
    <div className="space-y-4">
      <SimNote />
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Order shortcuts" data-testid="order-shortcuts">{[['all', 'All'], ['swap', 'Swap'], ['convert', 'Convert'], ['buy', 'Buy'], ['sell', 'Sell'], ['active', 'Active'], ['archived', 'Archived']].map(([k, l]) => <Button key={k} type="button" size="sm" role="tab" aria-selected={cur === k} variant={cur === k ? 'default' : 'outline'} data-testid={`button-shortcut-${k}`} onClick={() => shortcut(k)}>{l}</Button>)}</div>
      {bucket && <p className="text-xs text-muted-foreground" data-testid="text-bucket-note">{bucket === 'active' ? 'Active: pending and processing orders' : 'Archived: completed, cancelled and failed orders'}, across all pages.</p>}
       <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => {
         e.preventDefault();
         if ([from, to].some((v) => v && !isCalendarDate(v))) { setDateError('Enter complete, valid dates before searching.'); return; }
         if (from && to && from > to) { setDateError('From date must be on or before To date.'); return; }
         setDateError(''); setRange({ from, to }); setSearch(text.trim()); reset();
       }}>
        <Input data-testid="input-order-search" className="w-full sm:w-64" placeholder="Search order id, symbol" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="w-36"><Pick testid="select-order-status" value={status} onChange={(v) => { setStatus(v); setBucket(''); reset(); }} options={[[ALL, 'Any status'], ['pending', 'Pending'], ['processing', 'Processing'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['failed', 'Failed']]} /></div>
        <div className="w-36"><Pick testid="select-order-action" value={action} onChange={(v) => { setAction(v); reset(); }} options={[[ALL, 'Any type'], ['swap', 'Swap'], ['convert', 'Convert'], ['buy', 'Buy'], ['sell', 'Sell']]} /></div>
        <div className="w-44"><Pick testid="select-order-customer" value={customer} onChange={(v) => { setCustomer(v); reset(); }} options={[[ALL, 'Any customer'], ['anonymous', 'Anonymous visitors']]} /></div>
         <label className="text-xs text-muted-foreground">From<Input type="date" min="0001-01-01" max="9999-12-31" data-testid="input-order-from" value={from} onChange={(e) => { setFrom(e.target.value); setDateError(''); }} /></label>
         <label className="text-xs text-muted-foreground">To<Input type="date" min="0001-01-01" max="9999-12-31" data-testid="input-order-to" value={to} onChange={(e) => { setTo(e.target.value); setDateError(''); }} /></label>
        <Button data-testid="button-order-search">Search</Button>
        <Button type="button" variant="ghost" data-testid="button-order-reset" onClick={() => { setBucket(''); setText(''); setSearch(''); setStatus(ALL); setAction(ALL); setCustomer(ALL); setFrom(''); setTo(''); setRange({ from: '', to: '' }); setDateError(''); reset(); }}>Reset</Button>
      </form>
       {dateError && <p role="alert" data-testid="text-order-date-error" className="text-sm text-destructive">{dateError}</p>}
      {failures.length > 0 && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" data-testid="text-bulk-failures"><p className="font-medium">{failures.length} order{failures.length === 1 ? '' : 's'} failed (others succeeded and lists were refreshed)</p><ul className="break-all font-mono text-xs">{failures.map((f) => <li key={f}>{f}</li>)}</ul></div>}
      {q.isLoading ? <ListSkeleton /> : q.isError || !d ? <ErrorState what="orders" onRetry={() => q.refetch()} /> : orders.length === 0 ? <EmptyState title="No orders match" body="Adjust the filters, or wait for simulated orders from this tenant's widget." /> : (
        <>
          <BulkBar sel={sel} noun="orders" locked={!canEdit} testid="orders">
            <BulkBtn sel={sel} locked={!canEdit || stale || allowed.length === 0} testid="button-bulk-status-orders" onClick={() => { setSnap(chosen.map((o) => ({ id: o.id, status: o.status }))); setTarget(allowed[0]); setStep('form'); }}>Update status</BulkBtn>
          </BulkBar>
          {sel.count > 0 && allowed.length === 0 && <p className="text-xs text-muted-foreground" data-testid="text-no-common-status">The selected orders share no allowed next status (terminal orders cannot be reopened).</p>}
           <DataTable testid="order" rows={orders} getId={(o) => o.id} sel={sel} locked={!canEdit} selectionLocked={stale || busy} onRowClick={(o) => setOpenId(o.id)} cols={[
            { h: 'Order', cell: (o) => <button type="button" className="font-mono text-xs text-copper hover:underline" data-testid={`link-order-${o.id}`} onClick={() => setOpenId(o.id)}>{o.id.slice(0, 8)}</button> },
            { h: 'Type', cell: (o) => <span className="capitalize">{o.action}</span> },
            { h: 'Customer', cell: (o) => <span className="text-xs">{o.customerName || 'Anonymous'}</span> },
            { h: 'Send to Receive', cell: (o) => <OrderFlow r={idr} o={o} /> },
            { h: 'Status', cell: (o) => <OrderStatus status={o.status} /> },
            { h: 'Created', cell: (o) => <span className="font-mono text-xs text-muted-foreground">{stamp(o.createdAt)}</span> },
            { h: 'Open', cell: (o) => <Button size="sm" variant="outline" data-testid={`button-open-order-${o.id}`} onClick={() => setOpenId(o.id)}>Details</Button> },
          ]} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-mono text-xs text-muted-foreground" data-testid="text-order-total">{d.total} orders, page {d.page} of {pages}</span>
            <div className="flex gap-2"><Button variant="outline" size="sm" data-testid="button-page-prev" disabled={page <= 1} onClick={() => { setPage(page - 1); sel.clear(); }}>Previous</Button><Button variant="outline" size="sm" data-testid="button-page-next" disabled={page >= pages} onClick={() => { setPage(page + 1); sel.clear(); }}>Next</Button></div></div>
        </>)}
      <Dialog open={step !== null} onOpenChange={(v) => { if (!v && !busy) setStep(null); }}>
        <DialogContent data-testid="dialog-bulk-status">
          <DialogHeader><DialogTitle>Update {snap.length} order{snap.length === 1 ? '' : 's'}</DialogTitle><DialogDescription>Simulated workflow only. Only statuses allowed for every selected order are offered. Orders are updated one by one.</DialogDescription></DialogHeader>
          {step === 'form' ? (
            <div className="space-y-3"><Pick testid="select-bulk-status" value={target} onChange={setTarget} options={snapshotAllowed.map((s) => [s, `Mark ${s}`] as [string, string])} />
              <Textarea data-testid="input-bulk-note" maxLength={450} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          ) : (
            <div className="space-y-1 text-sm" data-testid="text-bulk-preview"><p>Orders: <b>{snap.length}</b> (selection captured at review; a changed order is rejected, not overwritten)</p><ul className="max-h-32 overflow-y-auto font-mono text-xs">{snap.map((o) => <li key={o.id}>{o.id} ({o.status} to {target})</li>)}</ul>{(target === 'cancelled' || target === 'failed') && <p className="font-medium text-destructive" data-testid="text-bulk-destructive">Destructive: {target} orders can never be reopened.</p>}<p>New status: <b className="capitalize">{target}</b></p><p>Note: {note.trim() || 'none'}</p></div>)}
          <DialogFooter>
            <Button variant="ghost" disabled={busy} onClick={() => (step === 'review' ? setStep('form') : setStep(null))}>{step === 'review' ? 'Back' : 'Cancel'}</Button>
            {step === 'form' ? <Button data-testid="button-bulk-review" disabled={!target || !canEdit} onClick={() => setStep('review')}>Review</Button> : <Button data-testid="button-bulk-apply" variant={target === 'cancelled' || target === 'failed' ? 'destructive' : 'default'} disabled={busy || !canEdit} onClick={run}>{busy ? 'Applying' : `Confirm and apply to ${snap.length}`}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OrderDrawer tenantId={tenantId} orderId={openId} canEdit={canEdit} onClose={close} />
    </div>
  );
}

function Row({ l, v }: { l: string; v: React.ReactNode }) {
  return <div className="min-w-0 bg-card p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p><div className="mt-1 break-words [overflow-wrap:anywhere] text-sm">{v}</div></div>;
}

export function OrderDrawer({ tenantId, orderId, canEdit, onClose }: { tenantId: string; orderId: string | null; canEdit: boolean; onClose: () => void }) {
  return (
    <Sheet open={!!orderId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full max-w-none overflow-y-auto sm:max-w-md" data-testid="drawer-order">
        {orderId && <DrawerBody key={orderId} tenantId={tenantId} orderId={orderId} canEdit={canEdit} />}
      </SheetContent>
    </Sheet>
  );
}

function Panel({ title, children, testid }: { title: string; children: React.ReactNode; testid?: string }) {
  return <section className="space-y-2" data-testid={testid}><h3 className="font-display text-xl">{title}</h3>{children}</section>;
}

function Copy({ value, label }: { value: string; label: string }) {
  const { toast } = useToast();
  return <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px]" data-testid={`button-copy-${label.toLowerCase().replace(/\W+/g, '-')}`} onClick={async () => {
    try { if (!navigator.clipboard) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(value); toast({ title: `${label} copied` }); }
    catch (e) { toast({ title: 'Copy failed', description: (e as Error).message || 'Select and copy manually.', variant: 'destructive' }); }
  }}>Copy</Button>;
}


function DrawerBody({ tenantId, orderId, canEdit }: { tenantId: string; orderId: string; canEdit: boolean }) {
  const { toast } = useToast(); const refresh = useRefresh(tenantId); const qc = useQueryClient();
  const key = getGetExchangeOrderQueryKey(tenantId, orderId);
  const q = useGetExchangeOrder(tenantId, orderId, { query: { queryKey: key } });
  const cfg = useGetExchangeConfiguration(tenantId, { query: { queryKey: getGetExchangeConfigurationQueryKey(tenantId) } });
  const vis = useVisualCatalog();
  const m = useUpdateExchangeOrderStatus(); const [ask, confirmNode] = useConfirm(!canEdit);
  const [note, setNote] = useState('');
  const o: ExchangeOrder | undefined = q.data;
  const next = o ? NEXT[o.status] ?? [] : [];
  const idr = useIdentityResolver(cfg.data?.configuration, cfg.data?.catalog);
  const pmKey = o ? (o.paymentMethodId || o.paymentMethod || null) : null;
  const pmId = pmKey ? idr.payment(pmKey) : null;
  const go = (status: string) => { if (m.isPending || !o || !canEdit || q.isFetching) return; const seen = o.status; m.mutate({ tenantId, orderId, data: { status: status as 'processing', expectedStatus: seen as 'pending', note: note.trim() } }, {
    onSuccess: (r) => { qc.setQueryData(key, r); refresh(orderId); setNote(''); toast({ title: `Order marked ${status}` }); },
    onError: (e) => toast({ title: 'Status change failed', description: (e as Error).message, variant: 'destructive' }),
  }); };
  const side = (l: string, id: string, sym: string, amt: string) => {
    const e = idr.endpoint(id, sym, null); const fiat = id.startsWith('fiat:');
    return (
      <div className="min-w-0 flex-1 bg-card p-3" data-testid={`order-side-${l.toLowerCase()}`}>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="min-w-0"><EndpointView r={idr} id={id} symbol={sym} amount={amt} paymentMethod={fiat ? pmKey : null} size={36} /><p className="mt-1 truncate text-xs text-muted-foreground">{e.name}</p></div></div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          {fiat ? (<>{e.currencyLogoUrl || e.logoUrl ? <VisualImg url={e.currencyLogoUrl ?? e.logoUrl} label={e.label} kind="flag" size={18} /> : null}<span>Fiat currency{e.currencyFlagName ? `, ${e.currencyFlagName} (currency mapping, not customer country)` : ''}</span></>) : (<><VisualImg url={e.networkLogoUrl} label={e.network ?? ''} kind="network" size={18} /><span>{e.network ?? 'Unknown network'}</span></>)}
        </div>
      </div>);
  };
  return (
    <>
      <SheetHeader><SheetTitle className="font-display text-2xl">{o ? `Order ${o.id.slice(0, 8)}` : 'Order'}</SheetTitle><SheetDescription>Sandbox order details. No funds move.</SheetDescription></SheetHeader>
      <div className="mt-4 space-y-5">
        {q.isLoading ? <ListSkeleton rows={3} /> : q.isError || !o ? <ErrorState what="this order" onRetry={() => q.refetch()} /> : (
          <>
            <div className="flex flex-wrap items-center gap-3"><OrderStatus status={o.status} /><span className="capitalize text-sm">{o.action}</span><span className="font-mono text-[10px] uppercase text-copper">sandbox only</span></div>
            {vis.isError && <p className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="text-visual-unavailable">Artwork unavailable; showing text labels. <button type="button" className="underline" onClick={() => vis.refetch()}>Retry</button></p>}
            <Panel title="Send → Receive" testid="order-exchange">
              <div className="flex flex-col gap-px overflow-hidden rounded-md border bg-border sm:flex-row">{side('Send', o.source, o.sourceSymbol, o.inputAmount)}{side('Receive', o.destination, o.destinationSymbol, o.outputAmount)}</div>
            </Panel>
            <Panel title="Pricing">
              <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2" data-testid="order-fields">
                <Row l="Rate" v={<span className="font-mono"><span className="block">1 {o.sourceSymbol} =</span><span className="block">{o.rate} {o.destinationSymbol}</span></span>} />
                <Row l="Spread" v={`${o.spreadBps} bps`} />
                <Row l="Source fee" v={<span className="font-mono">{o.fee} {o.sourceSymbol}</span>} />
                <Row l="Destination fee" v={<span className="font-mono">{o.destinationFee ?? '0'} {o.destinationSymbol}</span>} />
              </div>
            </Panel>
            <Panel title="Payment">
              <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">
                <Row l="Payment method" v={o.paymentMethod ? <span className="flex items-center gap-2"><VisualImg url={pmId?.logoUrl} label={pmId?.label ?? o.paymentMethod} kind="payment-method" generic={pmId?.generic} size={24} />{o.paymentMethod}</span> : 'None'} />
                <Row l="Account or card details" v={<span className="text-muted-foreground">Not collected</span>} />
                <Row l="Payment details" v={<span className="text-muted-foreground" data-testid="text-payment-not-collected">Not collected in this sandbox.</span>} />
              </div>
            </Panel>
            <Panel title="Customer and order">
              <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">
                <Row l="Order ID" v={<span className="flex flex-wrap items-center gap-1"><span className="font-mono text-xs">{o.id}</span><Copy value={o.id} label="Order ID" /></span>} />
                <Row l="Type" v={<span className="capitalize">{o.action}</span>} />
                <Row l="Customer" v={o.customerName || 'Anonymous'} />
                <Row l="Country" v={<span className="text-muted-foreground" data-testid="text-country-not-collected">Not collected</span>} />
                <Row l="Email" v={o.customerEmail ? <span className="flex flex-wrap items-center gap-1">{o.customerEmail}<Copy value={o.customerEmail} label="Email" /></span> : 'Not collected'} />
                <Row l="Created" v={stamp(o.createdAt)} />
                <Row l="Updated" v={o.updatedAt ? stamp(o.updatedAt) : 'Not updated'} />
              </div>
              <div className="flex flex-wrap gap-1"><Copy value={`${o.inputAmount} ${o.sourceSymbol}`} label="Send amount" /><Copy value={`${o.outputAmount} ${o.destinationSymbol}`} label="Receive amount" /><Copy value={o.rate} label="Rate" /></div>
            </Panel>
            <section><h3 className="font-display mb-2 text-xl">Timeline and notes</h3>
              <ol className="space-y-2 border-l pl-4">{o.history.map((h, i) => <li key={i} data-testid={`row-history-${i}`}><OrderStatus status={h.status} /><span className="ml-2 font-mono text-xs text-muted-foreground">{stamp(h.at)}</span>{h.note && <p className="mt-1 text-sm">{h.note}</p>}</li>)}</ol></section>
            {next.length === 0 ? <p className="rounded-md border p-3 text-sm text-muted-foreground" data-testid="text-terminal">This order is {o.status}. Terminal orders cannot be reopened.</p> : !canEdit ? <p className="text-sm text-muted-foreground">Read only: updating orders needs configuration access, an active subscription and the exchange feature.</p> : (
              <section className="space-y-2 rounded-md border bg-card p-4"><h3 className="font-display text-xl">Update status</h3>
                <p className="text-xs text-muted-foreground">Simulated workflow only. No funds move.</p>
                <Textarea data-testid="input-status-note" maxLength={500} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex flex-wrap gap-2">{next.map((s) => <Button key={s} data-testid={`button-status-${s}`} variant={s === 'completed' || s === 'processing' ? 'default' : 'outline'} disabled={m.isPending || q.isFetching} onClick={() => (s === 'cancelled' || s === 'failed' ? ask({ title: `Mark order ${o?.id.slice(0, 8)} ${s}?`, destructive: true, label: `Mark ${s}`, body: <p>Order {o?.id} moves from {o?.status} to {s}. This cannot be reopened. Sandbox only, no funds move.</p>, run: async () => { await new Promise<void>((res, rej) => { if (!o) return rej(new Error('Order missing')); m.mutate({ tenantId, orderId, data: { status: s as 'processing', expectedStatus: o.status as 'pending', note: note.trim() } }, { onSuccess: (r) => { qc.setQueryData(key, r); refresh(orderId); setNote(''); res(); }, onError: (e) => rej(e) }); }); return <p>Order marked {s}.</p>; } }) : go(s))}>Mark {s}</Button>)}</div></section>)}
          </>)}
      </div>
      {confirmNode}
    </>
  );
}
