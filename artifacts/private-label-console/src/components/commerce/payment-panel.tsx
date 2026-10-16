import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Panel, Pill, Field } from '@/components/super-admin/kit';
import { ErrorState, ListSkeleton } from '@/components/app/bits';
import { useToast } from '@/hooks/use-toast';
import { useCommerceApi, isOrderPay, type OrderPay, type Invoice } from './api';

const TONE = { pending: undefined, reported: 'warn', paid: 'ok', rejected: 'bad' } as const;
const STATUS_TEXT: Record<Invoice['status'], string> = { pending: 'Awaiting payment', reported: 'Reported by customer, not yet verified', paid: 'Paid and verified by an operator', rejected: 'Rejected, no access granted' };

export function InvoiceSummary({ inv }: { inv: Invoice }) {
  return <div className="space-y-2" data-testid="invoice-summary">
    <div className="flex items-center gap-2"><Pill tone={TONE[inv.status]}>{inv.status}</Pill><span className="text-xs text-muted-foreground">{STATUS_TEXT[inv.status]}</span></div>
    <dl className="divide-y"><Field k="Amount due" v={<span className="font-mono">{inv.currency} {inv.amount}</span>} /><Field k="Method" v={inv.methodName} /><Field k="Customer reference" v={inv.reference} />{inv.confirmedAt && <Field k="Decided" v={new Date(inv.confirmedAt).toLocaleString()} />}</dl>
    {inv.instructions && <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs [overflow-wrap:anywhere]">{inv.instructions}</p>}
  </div>;
}

function usePay(role: 'customer' | 'operator', orderId: string) {
  const call = useCommerceApi(); const qc = useQueryClient(); const key = ['phase1-order', role, orderId];
  const q = useQuery({ queryKey: key, enabled: !!orderId, retry: 1, refetchOnWindowFocus: true,
    refetchInterval: (s) => { const st = s.state.data?.invoice?.status; const n = s.state.dataUpdateCount; return (st === 'pending' || st === 'reported') && n < 60 ? 15000 : false; },
    queryFn: async () => { const x = await call<unknown>('GET', `/${role}/phase1/orders/${orderId}`); if (!isOrderPay(x)) throw new Error('Unexpected payment response'); return x; } });
  const set = (x: unknown) => { if (!isOrderPay(x)) throw new Error('Unexpected payment response'); qc.setQueryData(key, x); qc.invalidateQueries({ queryKey: key }); };
  return { q, call, set };
}

export function CustomerPayment({ orderId }: { orderId: string }) {
  const { q, call, set } = usePay('customer', orderId); const { toast } = useToast();
  const [mid, setMid] = useState(''); const [ref, setRef] = useState('');
  const checkout = useMutation({ mutationFn: () => call<OrderPay>('POST', `/customer/phase1/orders/${orderId}/checkout`, { methodId: mid }), onSuccess: (x) => { set(x); toast({ title: 'Invoice created' }); } });
  const report = useMutation({ mutationFn: () => call<OrderPay>('POST', `/customer/phase1/orders/${orderId}/report`, { reference: ref.trim() }), onSuccess: (x) => { set(x); setRef(''); toast({ title: 'Payment reported', description: 'An operator will verify it.' }); } });
  const d = q.data;
  return <Panel title="Payment" note="Payments are verified manually by an operator. Reporting a transfer does not mark it paid.">
    {q.isLoading ? <ListSkeleton rows={2} /> : q.isError || !d ? <ErrorState what="payment details" onRetry={() => q.refetch()} /> : d.invoice ? <div className="space-y-4">
      <InvoiceSummary inv={d.invoice} />
      {d.invoice.status === 'pending' && <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (ref.trim()) report.mutate(); }}>
        <label className="text-xs text-muted-foreground" htmlFor="pay-ref">Transfer reference you used</label>
        <Input id="pay-ref" data-testid="input-pay-reference" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={140} />
        <Button type="submit" disabled={!ref.trim() || report.isPending} data-testid="button-report-payment">{report.isPending ? 'Sending' : 'I have paid'}</Button>
        {report.isError && <p role="alert" className="text-sm text-destructive">{(report.error as Error).message}</p>}</form>}
      {d.invoice.status === 'rejected' && <p className="text-sm text-muted-foreground">This payment was rejected. Contact the team about this order.</p>}
    </div> : !d.purchasable ? <p role="status" className="rounded-md border border-copper/50 p-3 text-sm" data-testid="text-checkout-blocked">{d.blockedReason ?? 'Checkout is not available for this order yet.'}</p> : d.methods.length === 0
      ? <p className="text-sm text-muted-foreground">No payment method is available yet.</p>
      : <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (mid) checkout.mutate(); }}>
        <fieldset className="space-y-2"><legend className="mb-1 text-xs text-muted-foreground">Choose a payment method. The amount is priced by the server.</legend>
          {d.methods.map((m) => <label key={m.id} className={`block cursor-pointer rounded-md border p-3 text-sm ${mid === m.id ? 'border-copper' : ''}`}><input type="radio" name="method" className="mr-2" checked={mid === m.id} onChange={() => setMid(m.id)} data-testid={`radio-method-${m.id}`} />{m.name} <span className="font-mono text-xs text-muted-foreground">{m.currency}</span></label>)}</fieldset>
        <Button type="submit" disabled={!mid || checkout.isPending} data-testid="button-checkout">{checkout.isPending ? 'Creating invoice' : 'Create invoice'}</Button>
        {checkout.isError && <p role="alert" className="text-sm text-destructive">{(checkout.error as Error).message}</p>}</form>}
  </Panel>;
}

export function OperatorPayment({ orderId, onDone }: { orderId: string; onDone?: () => void }) {
  const { q, call, set } = usePay('operator', orderId); const { toast } = useToast();
  const [amt, setAmt] = useState(''); const [cur, setCur] = useState('EUR'); const [ref, setRef] = useState(''); const [ev, setEv] = useState('');
  const done = (x: unknown, t: string) => { set(x); toast({ title: t }); onDone?.(); };
  const id = q.data?.invoice?.id;
  const confirm = useMutation({ mutationFn: () => call<OrderPay>('POST', `/operator/phase1/invoices/${id}/confirm`, { receivedAmount: amt.trim(), currency: cur.trim().toUpperCase(), reference: ref.trim(), evidence: ev.trim() }), onSuccess: (x) => done(x, 'Payment confirmed') });
  const reject = useMutation({ mutationFn: () => call<OrderPay>('POST', `/operator/phase1/invoices/${id}/reject`, { evidence: ev.trim() }), onSuccess: (x) => done(x, 'Payment rejected') });
  const d = q.data; const open = d?.invoice && (d.invoice.status === 'pending' || d.invoice.status === 'reported');
  const err = (confirm.error ?? reject.error) as Error | null;
  return <Panel title="Payment" note="Only mark paid after you have verified the funds in your own settlement records. A customer report is not evidence.">
    {q.isLoading ? <ListSkeleton rows={2} /> : q.isError || !d ? <ErrorState what="payment details" onRetry={() => q.refetch()} /> : !d.invoice ? <p className="text-sm text-muted-foreground" data-testid="text-no-invoice">No invoice yet. {d.purchasable ? 'The customer has not checked out.' : d.blockedReason ?? 'Checkout is blocked for this order.'}</p> : <div className="space-y-4">
      <InvoiceSummary inv={d.invoice} />
      {open && <form className="space-y-2 border-t pt-4" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-2 sm:grid-cols-3"><Input aria-label="Received amount" placeholder="Received amount" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} data-testid="input-received-amount" /><Input aria-label="Currency" value={cur} onChange={(e) => setCur(e.target.value)} maxLength={3} /><Input aria-label="Bank reference" placeholder="Bank reference" value={ref} onChange={(e) => setRef(e.target.value)} data-testid="input-settlement-reference" /></div>
        <Textarea aria-label="Evidence" placeholder="Evidence: where and how you verified the funds" value={ev} onChange={(e) => setEv(e.target.value)} data-testid="input-evidence" />
        <div className="flex flex-wrap gap-2"><Button type="button" disabled={!amt.trim() || !cur.trim() || !ref.trim() || !ev.trim() || confirm.isPending || reject.isPending} onClick={() => confirm.mutate()} data-testid="button-confirm-payment">Confirm paid</Button>
          <Button type="button" variant="outline" disabled={!ev.trim() || confirm.isPending || reject.isPending} onClick={() => reject.mutate()} data-testid="button-reject-payment">Reject</Button></div>
        {err && <p role="alert" className="text-sm text-destructive">{err.message}</p>}</form>}
    </div>}
  </Panel>;
}
