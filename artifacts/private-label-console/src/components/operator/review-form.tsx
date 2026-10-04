import { useRef, useState } from 'react';
import { useReviewWhiteLabelRequest, useListPlans, useListAddons, type WhiteLabelStatus } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { TERMINAL, errMsg, statusText, type WlOrder } from '@/lib/wl';

const MANUAL = ['new', 'reviewing', 'waiting_for_client', 'quote_ready', 'approved', 'in_setup', 'customization', 'ready'];
const price = /^\d{1,12}(\.\d{1,2})?$/;
const sel = 'h-10 w-full rounded-md border bg-background px-2 text-sm';

export function ReviewForm({ o, onDone }: { o: WlOrder; onDone: () => void }) {
  const review = useReviewWhiteLabelRequest(); const plans = useListPlans(); const addons = useListAddons();
  const [status, setStatus] = useState<string>(o.status);
  const [m, setM] = useState(o.monthlyPrice ?? ''); const [s, setS] = useState(o.setupPrice ?? ''); const [cur, setCur] = useState(o.currency ?? 'USD');
  const [cust, setCust] = useState(o.customizationPrice ?? ''); const [dec, setDec] = useState<'pending' | 'approved' | 'rejected'>(o.customDesignDecision ?? 'pending');
  const [pid, setPid] = useState(o.approvedPlan?.id ?? o.requestedPlan?.id ?? ''); const [aids, setAids] = useState<string[]>((o.approvedAddons ?? o.requestedAddons ?? []).map((a) => a.id));
  const [err, setErr] = useState<string | null>(null);
  const ro = TERMINAL.includes(o.status); const custom = o.design?.type === 'custom';
  const curRef = useRef(cur); curRef.current = cur;
  const okP = (v: string) => v === '' || price.test(v);
  const formErr = !okP(m) ? 'Recurring price format is 0.00' : !okP(s) ? 'Setup price format is 0.00' : !okP(cust) ? 'Customization price format is 0.00' : !/^[A-Za-z]{3}$/.test(cur) ? 'Currency must be a 3-letter ISO code' : '';
  const planCur = (plans.data ?? []).find((p) => p.id === pid)?.currency;
  const canApprove = price.test(m) && price.test(s) && (!custom || (price.test(cust) && dec === 'approved'));
  const addonList = (addons.data ?? []).filter((a) => a.enabled || aids.includes(a.id)).filter((a) => { const c = a.currency; return !planCur || !c || c === planCur; });
  const save = (st: string) => {
    setErr(null);
    const need = st === 'approved' && (!price.test(m) || !price.test(s) || (custom && (!price.test(cust) || dec !== 'approved')));
    if (need) { setErr(custom ? 'Approval needs recurring, setup and customization prices and an approved custom design decision.' : 'Approval needs recurring and setup prices.'); return; }
    review.mutate({ requestId: o.id, data: { status: st as WhiteLabelStatus, monthlyPrice: m === '' ? null : m, setupPrice: s === '' ? null : s, currency: cur.toUpperCase(), operatorNote: '', customizationPrice: cust === '' ? null : cust, approvedPlanId: pid || null, approvedAddonIds: aids, customDesignDecision: dec } }, { onSuccess: onDone, onError: (e) => setErr(errMsg(e)) });
  };
  if (ro) return <p className="text-sm text-muted-foreground">This order is {statusText(o.status)}. Status and prices are read-only; notes can still be added.</p>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(status); }} className="space-y-4">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 [&>label]:block [&>label]:min-w-0 [&>label]:space-y-1.5 [&_select]:w-full">
        <label className="text-sm md:col-span-2">Status<select data-testid="select-status" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>{MANUAL.map((x) => <option key={x} value={x}>{statusText(x)}</option>)}</select></label>
        <label className="text-sm">Currency<Input data-testid="input-currency" value={cur} maxLength={3} onChange={(e) => setCur(e.target.value.toUpperCase())} /></label>
        <label className="text-sm">Recurring<Input data-testid="input-monthly" value={m} onChange={(e) => setM(e.target.value)} placeholder="0.00" /></label>
        <label className="text-sm">Setup<Input data-testid="input-setup" value={s} onChange={(e) => setS(e.target.value)} placeholder="0.00" /></label>
        <label className="text-sm">Customization<Input data-testid="input-customization" value={cust} onChange={(e) => setCust(e.target.value)} placeholder="none" /></label>
        {custom && <label className="text-sm">Custom design<select className={sel} value={dec} onChange={(e) => setDec(e.target.value as typeof dec)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>}
        <label className="text-sm md:col-span-2">Approved plan<select data-testid="select-plan" className={sel} value={pid} onChange={(e) => { setPid(e.target.value); setAids([]); const pc = (plans.data ?? []).find((p) => p.id === e.target.value)?.currency; if (pc) setCur(pc); }}><option value="">None</option>{(plans.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}{o.requestedPlan?.id === p.id ? ' (requested)' : ''}</option>)}</select></label>
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="mb-1 text-sm">Approved add-ons</legend>
        {addonList.length === 0 && <p className="text-sm text-muted-foreground">No add-ons in this currency.</p>}
        {addonList.map((a) => <label key={a.id} className="flex items-center gap-2 text-sm"><Checkbox checked={aids.includes(a.id)} onCheckedChange={(v) => setAids(v ? [...aids, a.id] : aids.filter((x) => x !== a.id))} />{a.name}</label>)}</fieldset>
      {(err || formErr) && <p role="alert" data-testid="text-error" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">{err ?? formErr}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" data-testid="button-save-review" disabled={!!formErr || review.isPending || (status === 'approved' && !canApprove)}>Save review, pricing and status</Button>
        <Button type="button" variant="secondary" data-testid="button-approve" disabled={!!formErr || !canApprove || review.isPending} onClick={() => { setStatus('approved'); save('approved'); }}>Approve</Button>
        <Button type="button" variant="outline" data-testid="button-reject" disabled={!!formErr || review.isPending} onClick={() => { if (window.confirm('Reject this order?')) { setStatus('rejected'); save('rejected'); } }}>Reject</Button>
      </div>
    </form>
  );
}
