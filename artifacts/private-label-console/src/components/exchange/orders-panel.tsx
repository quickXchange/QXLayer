import { useState } from 'react';
import { usePrincipal } from '@/lib/principal';
import { ExchangeStatusInputOperation as Op } from '@workspace/api-client-react';
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
  const [customer, setCustomer] = useState(() => (new URLSearchParams(window.location.search).get('customer') || ALL));
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
   const [range, setRange] = useState({ from: '', to: '' });
   const [dateError, setDateError] = useState('');
  const [bucket, setBucket] = useState<'' | 'active' | 'archived'>('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(orderId ?? null);
  const [step, setStep] = useState<null | 'form' | 'review'>(null);
  const [target, setTarget] = useState(''); const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false); const [failures, setFailures] = useState<string[]>([]);
   const params: ListExchangeOrdersParams = { ...(search ? { search } : {}), ...(status !== ALL ? { status } : {}), ...(action !== ALL ? { action } : {}), ...(bucket ? { view: bucket } : {}), ...(customer !== ALL ? { customer: customer as ListExchangeOrdersParams['customer'] } : {}), ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}), page };
  const q = useListExchangeOrders(tenantId, params, { query: { queryKey: getListExchangeOrdersQueryKey(tenantId, params), placeholderData: keepPreviousData } });
  const cfgQ = useGetExchangeConfiguration(tenantId, { query: { queryKey: getGetExchangeConfigurationQueryKey(tenantId) } });
  const idr = useIdentityResolver(cfgQ.data?.configuration, cfgQ.data?.catalog);
  const d = q.data;
  const orders = d?.orders ?? [];
  const stale = q.isFetching;
  const sel = useSelection(stale ? [] : orders.map((o) => o.id));
  const [snap, setSnap] = useState<{ id: string; status: string; ok: boolean }[]>([]);
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;
  const chosen = stale ? [] : orders.filter((o) => sel.has(o.id));
  const allowed = chosen.length === 0 ? [] : (NEXT[chosen[0].status] ?? []).filter((s) => s !== 'completed' && chosen.every((o) => (NEXT[o.status] ?? []).includes(s) && (s !== 'processing' || o.status !== 'pending' || o.paymentVerification === 'verified')));
  const snapshotAllowed = snap.length === 0 ? [] : (NEXT[snap[0].status] ?? []).filter((s) => s !== 'completed' && snap.every((o) => (NEXT[o.status] ?? []).includes(s) && (s !== 'processing' || o.status !== 'pending' || o.ok)));
  const shortcut = (v: string) => { setBucket(v === 'active' || v === 'archived' ? v : ''); setStatus(ALL); setAction(['swap', 'convert', 'buy', 'sell'].includes(v) ? v : ALL); setPage(1); sel.clear(); };
  const cur = bucket || (action !== ALL ? action : status === ALL ? 'all' : '');
  const reset = () => { setPage(1); sel.clear(); };
  const close = () => { setOpenId(null); if (orderId) nav(`/clients/${tenantId}/exchange/orders`); };
  const run = async () => {
    if (busy || !canEdit || snap.length === 0 || !snapshotAllowed.includes(target)) return; setBusy(true); setFailures([]);
    const bad: string[] = []; let ok = 0;
    for (const o of snap) {
      try { await m.mutateAsync({ tenantId, orderId: o.id, data: { operation: 'status', status: target as 'processing', expectedStatus: o.status as 'pending', note: `Bulk: Mark ${target}. ${note.trim()}`.trim().slice(0, 500) } }); ok++; }
      catch (e) { bad.push(`${o.id}: ${(e as Error)?.message ?? 'rejected'}`); }
    }
    setBusy(false); setStep(null); setNote(''); setFailures(bad); sel.clear(); refresh(); snap.forEach((o) => qc.invalidateQueries({ queryKey: getGetExchangeOrderQueryKey(tenantId, o.id) }));
    toast({ title: bad.length ? `${ok} updated, ${bad.length} failed` : `${ok} order${ok === 1 ? '' : 's'} marked ${target}`, description: bad.length ? 'See the failure list above the table.' : undefined, variant: bad.length ? 'destructive' : undefined });
  };
  return (
    <div className="space-y-4">
      <SimNote />
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Order shortcuts" data-testid="order-shortcuts">{[['all', 'All'], ['swap', 'Swap'], ['convert', 'Convert'], ['buy', 'Buy (legacy)'], ['sell', 'Sell (legacy)'], ['active', 'Active'], ['archived', 'Archived']].map(([k, l]) => <Button key={k} type="button" size="sm" role="tab" aria-selected={cur === k} variant={cur === k ? 'default' : 'outline'} data-testid={`button-shortcut-${k}`} onClick={() => shortcut(k)}>{l}</Button>)}</div>
      {bucket && <p className="text-xs text-muted-foreground" data-testid="text-bucket-note">{bucket === 'active' ? 'Active: pending and processing orders' : 'Archived: completed, cancelled and failed orders'}, across all pages.</p>}
       <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => {
         e.preventDefault();
         if ([from, to].some((v) => v && !isCalendarDate(v))) { setDateError('Enter complete, valid dates before searching.'); return; }
         if (from && to && from > to) { setDateError('From date must be on or before To date.'); return; }
         setDateError(''); setRange({ from, to }); setSearch(text.trim()); reset();
       }}>
        <Input data-testid="input-order-search" className="w-full sm:w-64" placeholder="Search order id, symbol" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="w-36"><Pick testid="select-order-status" value={status} onChange={(v) => { setStatus(v); setBucket(''); reset(); }} options={[[ALL, 'Any status'], ['pending', 'Pending'], ['processing', 'Processing'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['failed', 'Failed']]} /></div>
        <div className="w-36"><Pick testid="select-order-action" value={action} onChange={(v) => { setAction(v); reset(); }} options={[[ALL, 'Any type'], ['swap', 'Swap'], ['convert', 'Convert'], ['buy', 'Buy (legacy)'], ['sell', 'Sell (legacy)']]} /></div>
        <div className="w-44"><Pick testid="select-order-customer" value={customer} onChange={(v) => { setCustomer(v); reset(); }} options={[[ALL, 'Any customer'], ['anonymous', 'Anonymous visitors'], ...(customer !== ALL && customer !== 'anonymous' ? [[customer, 'Selected contact'] as [string, string]] : [])]} /></div>
         <label className="text-xs text-muted-foreground">From<Input type="date" min="0001-01-01" max="9999-12-31" data-testid="input-order-from" value={from} onChange={(e) => { setFrom(e.target.value); setDateError(''); }} /></label>
         <label className="text-xs text-muted-foreground">To<Input type="date" min="0001-01-01" max="9999-12-31" data-testid="input-order-to" value={to} onChange={(e) => { setTo(e.target.value); setDateError(''); }} /></label>
        <Button data-testid="button-order-search">Search</Button>
        <Button type="button" variant="ghost" data-testid="button-order-reset" onClick={() => { setBucket(''); setText(''); setSearch(''); setStatus(ALL); setAction(ALL); setCustomer(ALL); setFrom(''); setTo(''); setRange({ from: '', to: '' }); setDateError(''); reset(); }}>Reset</Button>
      </form>
       {dateError && <p role="alert" data-testid="text-order-date-error" className="text-sm text-destructive">{dateError}</p>}
      {failures.length > 0 && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" data-testid="text-bulk-failures"><p className="font-medium">{failures.length} order{failures.length === 1 ? '' : 's'} failed (others succeeded and lists were refreshed)</p><ul className="break-all font-mono text-xs">{failures.map((f) => <li key={f}>{f}</li>)}</ul></div>}
      {q.isLoading || q.isPlaceholderData ? <ListSkeleton /> : q.isError || !d ? <ErrorState what="orders" onRetry={() => q.refetch()} /> : orders.length === 0 ? <EmptyState title="No orders match" body="Adjust the filters, or wait for simulated orders from this tenant's widget." /> : (
        <>
          <BulkBar sel={sel} noun="orders" locked={!canEdit} testid="orders">
            <BulkBtn sel={sel} locked={!canEdit || stale || allowed.length === 0} testid="button-bulk-status-orders" onClick={() => { setSnap(chosen.map((o) => ({ id: o.id, status: o.status, ok: o.paymentVerification === 'verified' }))); setTarget(allowed[0]); setStep('form'); }}>Update status</BulkBtn>
          </BulkBar>
          {sel.count > 0 && allowed.length === 0 && <p className="text-xs text-muted-foreground" data-testid="text-no-common-status">The selected orders share no allowed next status (terminal orders cannot be reopened). Completion needs individual payout confirmation in each order, and processing needs verified deposits.</p>}
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
      <SheetContent className="h-[100dvh] w-screen max-w-none overflow-y-auto [overflow-wrap:anywhere] sm:w-full sm:max-w-2xl" data-testid="drawer-order">
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


const SECTIONS: [string, string][] = [['overview', 'Overview'], ['customer', 'Customer'], ['pricing', 'Pricing'], ['transaction', 'Transaction'], ['operations', 'Operations']];
const TERMINAL = ['completed', 'cancelled', 'failed'];

function DrawerBody({ tenantId, orderId, canEdit }: { tenantId: string; orderId: string; canEdit: boolean }) {
  const { toast } = useToast(); const refresh = useRefresh(tenantId); const qc = useQueryClient();
  const me = usePrincipal();
  const key = getGetExchangeOrderQueryKey(tenantId, orderId);
  const q = useGetExchangeOrder(tenantId, orderId, { query: { queryKey: key } });
  const cfg = useGetExchangeConfiguration(tenantId, { query: { queryKey: getGetExchangeConfigurationQueryKey(tenantId) } });
  const vis = useVisualCatalog();
  const m = useUpdateExchangeOrderStatus(); const [ask, confirmNode] = useConfirm(!canEdit);
  const [tab, setTab] = useState('overview');
  const [note, setNote] = useState(''); const [internal, setInternal] = useState('');
  const [dep, setDep] = useState(''); const [hash, setHash] = useState(''); const [opNote, setOpNote] = useState('');
  const [payout, setPayout] = useState(''); const [confirmDone, setConfirmDone] = useState(false);
  const o: ExchangeOrder | undefined = q.data;
  const next = o ? NEXT[o.status] ?? [] : [];
  const idr = useIdentityResolver(cfg.data?.configuration, cfg.data?.catalog);
  const pmKey = o ? (o.paymentMethodId || o.paymentMethod || null) : null;
  const pmId = pmKey ? idr.payment(pmKey) : null;
  const verified = o?.paymentVerification === 'verified';
  const terminal = !!o && TERMINAL.includes(o.status);
  const busy = m.isPending || q.isFetching;
  /** Single mutation path; non-status operations always send the CURRENT status so no transition is faked. */
  const send = (data: Record<string, unknown>, done: string, after?: () => void) => new Promise<void>((res, rej) => {
    if (!o || !canEdit || busy) return rej(new Error('Not available'));
    m.mutate({ tenantId, orderId, data: { status: o.status, expectedStatus: o.status, note: '', ...data } as never }, {
      onSuccess: (r) => { qc.setQueryData(key, r); refresh(orderId); after?.(); toast({ title: done }); res(); },
      onError: (e) => { toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' }); rej(e); },
    });
  }).catch(() => undefined);
  const side = (l: string, id: string, sym: string, amt: string) => {
    const e = idr.endpoint(id, sym, null); const fiat = id.startsWith('fiat:');
    return (
      <div className="min-w-0 flex-1 bg-card p-3" data-testid={`order-side-${l.toLowerCase()}`}>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
        <div className="mt-2"><EndpointView r={idr} id={id} symbol={sym} amount={amt} paymentMethod={fiat ? pmKey : null} size={36} /><p className="mt-1 truncate text-xs text-muted-foreground">{e.name}</p></div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          {fiat ? (<>{e.currencyLogoUrl || e.logoUrl ? <VisualImg url={e.currencyLogoUrl ?? e.logoUrl} label={e.label} kind="flag" size={18} /> : null}<span>Fiat currency</span></>) : (<><VisualImg url={e.networkLogoUrl} label={e.network ?? ''} kind="network" size={18} /><span>{e.network ?? 'Unknown network'}</span></>)}
        </div>
      </div>);
  };
  const cd = o?.customerDetails;
  const details: [string, string | undefined][] = cd ? [['Beneficiary', cd.beneficiaryName], ['Bank', cd.bankName], ['IBAN', cd.iban], ['Account number', cd.accountNumber], ['Wallet address', cd.walletAddress], ['Memo / tag', cd.memo], ['Payment description', cd.paymentDescription], ['Telegram', cd.telegram], ['Phone', cd.phone], ['Address', cd.address]] : [];
  const filled = details.filter(([, v]) => v && v.trim());
  const snap = o?.pricingRuleSnapshot;
  const statusGo = (s: string) => {
    if (!o) return;
    if (s === 'processing' && o.status === 'pending' && !verified) { toast({ title: 'Verify the deposit first', description: 'New orders cannot enter processing before the payment is verified.', variant: 'destructive' }); setTab('transaction'); return; }
    const run = async () => { await send({ operation: Op.status, status: s, note: note.trim() }, `Order marked ${s}`, () => setNote('')); };
    if (s === 'cancelled' || s === 'failed') ask({ title: `Mark order ${o.id.slice(0, 8)} ${s}?`, destructive: true, label: `Mark ${s}`, body: <p>Order {o.id} moves from {o.status} to {s}. This cannot be reopened. Sandbox only.</p>, run: async () => { await run(); return <p>Order marked {s}.</p>; } });
    else void run();
  };
  return (
    <>
      <SheetHeader><SheetTitle className="font-display text-2xl">View order</SheetTitle><SheetDescription className="break-all font-mono text-xs" data-testid="text-drawer-order-id">{o ? o.id : orderId}. Sandbox order details; no funds move and no payout is executed.</SheetDescription></SheetHeader>
      <div className="mt-4 space-y-5">
        {q.isLoading ? <ListSkeleton rows={3} /> : q.isError || !o ? <ErrorState what="this order" onRetry={() => q.refetch()} /> : (
          <>
            <div className="flex flex-wrap items-center gap-3"><OrderStatus status={o.status} /><span className="capitalize text-sm">{o.action}</span><span className="font-mono text-[10px] uppercase text-copper">sandbox only</span>{o.paymentVerification && <span className="font-mono text-[10px] uppercase text-muted-foreground" data-testid="text-verification">payment {o.paymentVerification}</span>}</div>
            <div className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto bg-background px-1 py-1" role="tablist" data-testid="drawer-order-tabs">{SECTIONS.map(([k, l]) => <Button key={k} type="button" size="sm" role="tab" aria-selected={tab === k} variant={tab === k ? 'default' : 'outline'} data-testid={`tab-order-${k}`} onClick={() => setTab(k)}>{l}</Button>)}</div>
            {vis.isError && <p className="text-xs text-muted-foreground" data-testid="text-visual-unavailable">Artwork unavailable; showing text labels. <button type="button" className="underline" onClick={() => vis.refetch()}>Retry</button></p>}

            {o.status === 'completed' && <div className="rounded-md border border-copper/40 bg-card p-3" data-testid="banner-complete"><p className="font-mono text-[10px] uppercase tracking-wider text-copper">Transaction complete</p><p className="font-display text-lg">Your {o.action} is complete</p><p className="text-xs text-muted-foreground">Completed {o.completedAt ? stamp(o.completedAt) : ''}. Sandbox record only.</p></div>}
            <ol className="grid grid-cols-4 gap-1 rounded-md border p-3 text-center text-[10px] font-medium" aria-label="Sandbox order progress" data-testid="order-lifecycle">
              {['CREATED','DETECTED','PROCESSING','DONE'].map((label,i)=>{
                const reached=o.status==='completed'?3:o.status==='processing'?2:o.paymentVerification==='verified'?1:0;
                return <li key={label} className={i<=reached?'text-foreground':'text-muted-foreground opacity-50'} aria-current={i===reached?'step':undefined}>{label}</li>;
              })}
            </ol>
            {tab === 'overview' && <div className="space-y-5">
              <Panel title="Send to Receive" testid="order-exchange"><div className="flex flex-col gap-px rounded-md border bg-border sm:flex-row">{side('Send', o.source, o.sourceSymbol, o.inputAmount)}{side('Receive', o.destination, o.destinationSymbol, o.outputAmount)}</div></Panel>
              <Panel title="Order"><div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2" data-testid="order-fields">
                <Row l="Order ID" v={<span className="flex flex-wrap items-center gap-1"><span className="font-mono text-xs">{o.id}</span><Copy value={o.id} label="Order ID" /></span>} />
                <Row l="Type" v={<span className="capitalize">{o.action}</span>} />
                <Row l="Customer" v={o.customerName??'Not recorded'} /><Row l="Email" v={o.customerEmail??'Not recorded'} />
                <Row l="Payment method" v={o.paymentMethod ? <span className="flex items-center gap-2"><VisualImg url={pmId?.logoUrl} label={pmId?.label ?? o.paymentMethod} kind="payment-method" generic={pmId?.generic} size={24} />{o.paymentMethod}</span> : 'None'} />
                <Row l="Assignee" v={o.assigneeId ? (o.assigneeId === me.userId ? 'You' : <span className="font-mono text-xs">{o.assigneeId}</span>) : 'Unassigned'} />
                <Row l="Created" v={stamp(o.createdAt)} /><Row l="Updated" v={o.updatedAt ? stamp(o.updatedAt) : 'Not updated'} />
              </div></Panel>
              {o.paymentInstructions && <Panel title="Payment instructions shown to customer"><p className="whitespace-pre-wrap rounded-md border bg-card p-3 text-sm" data-testid="text-order-payment-instructions">{o.paymentInstructions}</p><Copy value={o.paymentInstructions} label="Payment instructions" /></Panel>}
            </div>}

            {tab === 'customer' && <div className="space-y-5">
              <Panel title="Contact"><div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">
                <Row l="Customer" v={o.customerName || 'Anonymous'} />
                <Row l="Email" v={o.customerEmail ? <span className="flex flex-wrap items-center gap-1">{o.customerEmail}<Copy value={o.customerEmail} label="Email" /></span> : 'Not collected'} />
              </div></Panel>
              <Panel title="Customer-provided details" testid="order-customer-details">
                {filled.length === 0 ? <p className="rounded-md border p-3 text-sm text-muted-foreground" data-testid="text-details-empty">The customer submitted no bank, account, memo, Telegram, phone or address details.</p> :
                  <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">{filled.map(([l, v]) => <Row key={l} l={l} v={<span className="flex flex-wrap items-center gap-1"><span className="whitespace-pre-wrap">{v}</span><Copy value={v!} label={l} /></span>} />)}</div>}
                <p className="text-xs text-muted-foreground">Only fields the customer filled in are shown.</p>
              </Panel>
            </div>}

            {tab === 'pricing' && <div className="space-y-5">
              <Panel title="Rate and fees"><div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">
                <Row l="Final rate" v={<span className="font-mono">1 {o.sourceSymbol} = {o.rate} {o.destinationSymbol}</span>} />
                <Row l="Market rate" v={<span className="font-mono">{o.marketRate ?? 'Not recorded'}</span>} />
                <Row l="Rate provider" v={o.rateProvider ?? o.pricingSource ?? 'Not recorded'} />
                <Row l="Rate updated" v={o.rateUpdatedAt ? stamp(o.rateUpdatedAt) : 'Not recorded'} />
                <Row l="Quote kind" v={o.quoteKind ?? 'Not recorded'} />
                <Row l="Spread" v={`${o.spreadBps} bps`} />
                <Row l="Source fee" v={<span className="font-mono">{o.fee} {o.sourceSymbol}</span>} />
                <Row l="Destination fee" v={<span className="font-mono">{o.destinationFee ?? '0'} {o.destinationSymbol}</span>} />
              </div>
              <Copy value={o.rate} label="Rate" /></Panel>
              <Panel title="Matched rule snapshot" testid="order-rule-snapshot">
                {snap ? <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">
                  <Row l="Rule ID" v={<span className="font-mono text-xs">{snap.id}</span>} /><Row l="Mode" v={snap.pricingMode ?? 'legacy'} />
                  <Row l="Match" v={`${snap.source} to ${snap.destination}`} /><Row l="Priority" v={snap.priority} />
                  <Row l="Fee / spread" v={`${snap.feeBps} bps + ${snap.fixedFee}, spread ${snap.spreadBps} bps`} /><Row l="Manual rate" v={snap.rate ?? 'None'} />
                </div> : <p className="rounded-md border p-3 text-sm text-muted-foreground">{o.pricingRuleId ? <span className="font-mono text-xs">Rule {o.pricingRuleId} (snapshot not stored)</span> : 'No rule matched; route pricing applied.'}</p>}
              </Panel>
              <Panel title="Calculation">{o.calculation ? <p className="rounded-md border bg-muted/40 p-3 font-mono text-xs" data-testid="text-order-calculation">{o.calculation}</p> : <p className="text-sm text-muted-foreground">No calculation recorded for this order.</p>}</Panel>
            </div>}

            {tab === 'transaction' && <div className="space-y-5">
              <Panel title="Transaction references"><div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">
                <Row l="Verification" v={<span className="capitalize">{o.paymentVerification ?? 'unverified'}</span>} />
                <Row l="Deposit reference" v={o.depositReference ?? 'None'} />
                <Row l="Transaction hash" v={o.transactionHash ? <span className="font-mono text-xs">{o.transactionHash}</span> : 'None'} />
                <Row l="Payout reference" v={o.payoutReference ?? 'None'} />
                <Row l="Completed" v={o.completedAt ? stamp(o.completedAt) : 'Not completed'} />
              </div></Panel>
              {canEdit && !terminal && <section className="space-y-2 rounded-md border bg-card p-4" data-testid="section-verify">
                <h3 className="font-display text-lg">Payment review and verification</h3>
                {o.paymentVerification !== 'review' && o.paymentVerification !== 'verified' && <Button size="sm" variant="outline" data-testid="button-review-payment" disabled={busy} onClick={() => void send({ operation: Op.review_payment, note: 'Payment sent for review' }, 'Payment marked for review')}>Mark payment under review</Button>}
                {!verified && <div className="space-y-2">
                  <Input data-testid="input-deposit-ref" placeholder="Deposit reference" maxLength={200} value={dep} onChange={(e) => setDep(e.target.value)} />
                  <Input data-testid="input-tx-hash" placeholder="Transaction hash" maxLength={200} value={hash} onChange={(e) => setHash(e.target.value)} />
                  <Textarea data-testid="input-verify-note" maxLength={450} placeholder="Operator note (required): confirm this is a Sandbox verification, no real funds" value={opNote} onChange={(e) => setOpNote(e.target.value)} />
                  <Button size="sm" data-testid="button-verify-deposit" disabled={busy || (!dep.trim() && !hash.trim()) || !/sandbox/i.test(opNote)} onClick={() => void send({ operation: Op.verify_deposit, note: opNote.trim(), ...(dep.trim() ? { depositReference: dep.trim() } : {}), ...(hash.trim() ? { transactionHash: hash.trim() } : {}) }, 'Deposit verified (Sandbox)', () => { setDep(''); setHash(''); setOpNote(''); })}>Verify deposit</Button>
                  <p className="text-xs text-muted-foreground">Needs a reference or hash and a note that mentions Sandbox.</p></div>}
              </section>}
              <section><h3 className="font-display mb-2 text-xl">History</h3>
                <ol className="space-y-2 border-l pl-4">{o.history.map((h, i) => <li key={i} data-testid={`row-history-${i}`}><OrderStatus status={h.status} /><span className="ml-2 font-mono text-xs text-muted-foreground">{stamp(h.at)}</span>{h.note && <p className="mt-1 text-sm">{h.note}</p>}</li>)}</ol></section>
            </div>}

            {tab === 'operations' && <div className="space-y-5">
              <Panel title="Internal notes (never shown to the customer)" testid="order-internal">
                {(o.internalNotes ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No internal notes yet.</p> : <ol className="space-y-2 border-l pl-4">{o.internalNotes!.map((n, i) => <li key={i} data-testid={`row-internal-note-${i}`}><span className="font-mono text-xs text-muted-foreground">{stamp(n.at)}</span><p className="text-sm">{n.note}</p></li>)}</ol>}
                {canEdit && <div className="space-y-2"><Textarea data-testid="input-internal-note" maxLength={500} placeholder="Add an internal note" value={internal} onChange={(e) => setInternal(e.target.value)} /><Button size="sm" data-testid="button-add-internal-note" disabled={busy || !internal.trim()} onClick={() => void send({ operation: Op.note, note: internal.trim() }, 'Internal note added', () => setInternal(''))}>Add note</Button></div>}
              </Panel>
              <Panel title="Assignee"><p className="text-sm">{o.assigneeId ? (o.assigneeId === me.userId ? 'Assigned to you' : <span className="font-mono text-xs">{o.assigneeId}</span>) : 'Unassigned'}</p>
                {canEdit && !terminal && o.assigneeId !== me.userId && <Button size="sm" variant="outline" data-testid="button-assign-me" disabled={busy} onClick={() => void send({ operation: Op.assign, assigneeId: me.userId, note: 'Assigned' }, 'Assigned to you')}>Assign to me</Button>}</Panel>
              {next.length === 0 ? <p className="rounded-md border p-3 text-sm text-muted-foreground" data-testid="text-terminal">This order is {o.status}. Terminal orders cannot be reopened.</p> : !canEdit ? <p className="text-sm text-muted-foreground">Read only: updating orders needs configuration access, an active subscription and the exchange feature.</p> : (
                <section className="space-y-2 rounded-md border bg-card p-4"><h3 className="font-display text-xl">Update status</h3>
                  <p className="text-xs text-muted-foreground">Sandbox workflow only. {o.status === 'pending' && !verified ? 'Processing is available after deposit verification.' : ''}</p>
                  <Textarea data-testid="input-status-note" maxLength={500} placeholder="Customer-visible status note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="flex flex-wrap gap-2">{next.filter((s) => s !== 'completed').map((s) => <Button key={s} data-testid={`button-status-${s}`} variant={s === 'processing' ? 'default' : 'outline'} disabled={busy || (s === 'processing' && o.status === 'pending' && !verified)} onClick={() => statusGo(s)}>Mark {s}</Button>)}</div>
                  {next.includes('completed') && <div className="space-y-2 border-t pt-3" data-testid="section-complete">
                    <Input data-testid="input-payout-ref" placeholder="Payout reference (required)" maxLength={200} value={payout} onChange={(e) => setPayout(e.target.value)} />
                    <label className="flex items-start gap-2 text-sm"><input type="checkbox" data-testid="check-confirm-completion" className="mt-1" checked={confirmDone} onChange={(e) => setConfirmDone(e.target.checked)} />I confirm the payout was made for this Sandbox order.</label>
                    <Button data-testid="button-status-completed" disabled={busy || !payout.trim() || !confirmDone} onClick={() => void send({ operation: Op.status, status: 'completed', confirmCompletion: true, payoutReference: payout.trim(), note: note.trim() }, 'Order completed', () => { setPayout(''); setConfirmDone(false); setNote(''); })}>Complete order</Button></div>}
                </section>)}
            </div>}
          </>)}
      </div>
      {o && <div className="sticky bottom-0 mt-4 flex gap-2 border-t bg-background py-3" data-testid="drawer-order-footer"><Button type="button" variant="outline" className="flex-1" data-testid="button-copy-info" onClick={async () => { try { await navigator.clipboard.writeText([`Order ${o.id}`, `${o.inputAmount} ${o.sourceSymbol} to ${o.outputAmount} ${o.destinationSymbol}`, `Rate ${o.rate}`, `Status ${o.status}`].join('\n')); toast({ title: 'Order info copied' }); } catch { toast({ title: 'Copy failed', variant: 'destructive' }); } }}>Copy info</Button></div>}
      {confirmNode}
    </>
  );
}
