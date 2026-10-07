import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetPlan, getGetPlanQueryKey, useCreatePlan, useUpdatePlan, useListEntitlementDefinitions, type PlanInput } from '@workspace/api-client-react';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, ErrorState, ListSkeleton } from '@/components/app/bits';
import { GroupedEntitlementEditor } from '@/components/super-admin/grouped-entitlements';
import { ReviewDialog } from '@/components/super-admin/kit';
import { entriesFrom, entError, toMap, type EntMap } from '@/components/app/entitlement-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCan } from '@/lib/principal';
import { useInvalidateCatalog } from '@/lib/invalidate';
import { useToast } from '@/hooks/use-toast';

const MONEY = /^[0-9]+(?:\.[0-9]{1,2})?$/;
const blank = { name: '', description: '', monthlyPrice: '0', yearlyPrice: '0', setupFee: '0', currency: 'USD', billingLabel: '', displayOrder: '0', status: 'disabled' as PlanInput['status'] };

export default function PlanDetail() {
  const params = useParams<{ id?: string }>();
  const id = params.id && params.id !== 'new' ? params.id : '';
  const can = useCan();
  const [, nav] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const inv = useInvalidateCatalog();
  const defs = useListEntitlementDefinitions();
  const plan = useGetPlan(id, { query: { enabled: !!id, queryKey: getGetPlanQueryKey(id) } });
  const create = useCreatePlan();
  const update = useUpdatePlan();
  const [f, setF] = useState(blank);
  const [ent, setEnt] = useState<EntMap>({});
  const [rev, setRev] = useState(false);
  const init = useRef('');
  useEffect(() => {
    if (plan.data && init.current !== plan.data.id) {
      init.current = plan.data.id; const p = plan.data;
      setF({ name: p.name, description: p.description, monthlyPrice: p.monthlyPrice, yearlyPrice: p.yearlyPrice, setupFee: p.setupFee, currency: p.currency, billingLabel: p.billingLabel, displayOrder: String(p.displayOrder), status: p.status });
      setEnt(toMap(p.entitlements));
    }
  }, [plan.data]);
  if (!can.manageCatalog) return <p className="text-sm text-muted-foreground">Only a super admin can manage plans.</p>;
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const d = defs.data ?? [];
  const order = Number(f.displayOrder);
  const err = f.name.trim().length < 2 ? 'Name needs 2+ characters' : ![f.monthlyPrice, f.yearlyPrice, f.setupFee].every((x) => MONEY.test(x)) ? 'Prices are decimal strings with up to 2 places'
    : !/^[A-Z]{3}$/.test(f.currency) ? 'Currency is a 3-letter uppercase code' : !Number.isInteger(order) || order < 0 || order > 100000 ? 'Display order 0 - 100000' : entError(d, ent);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!err) setRev(true); };
  const doSave = () => {
    const data: PlanInput = { name: f.name.trim(), description: f.description, monthlyPrice: f.monthlyPrice, yearlyPrice: f.yearlyPrice, setupFee: f.setupFee, currency: f.currency, billingLabel: f.billingLabel, displayOrder: order, status: f.status, entitlements: entriesFrom(d, ent, true) };
    const fail = (er: unknown) => { setRev(false); toast({ title: 'Save failed', description: (er as Error).message, variant: 'destructive' }); };
    if (id) update.mutate({ planId: id, data }, { onSuccess: (p) => { setRev(false); qc.setQueryData(getGetPlanQueryKey(id), p); inv(); toast({ title: 'Plan saved' }); }, onError: fail });
    else create.mutate({ data }, { onSuccess: (p) => { setRev(false); inv(); toast({ title: 'Plan created' }); nav(`/plans/${p.id}`); }, onError: fail });
  };
  const loading = defs.isLoading || (!!id && plan.isLoading);
  return (
    <>
      <Link href="/plans" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Plans</Link>
      <PageHeader eyebrow={id ? 'Edit plan' : 'New plan'} title={id ? (plan.data?.name ?? 'Plan') : 'New plan'} />
      {loading ? <ListSkeleton /> : defs.isError ? <ErrorState what="entitlement definitions" onRetry={() => defs.refetch()} /> : id && (plan.isError || !plan.data) ? <ErrorState what="this plan" onRetry={() => plan.refetch()} /> : (
        <form onSubmit={submit} className="space-y-6">
          <section className="space-y-4 rounded-md border bg-card p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Name</Label><Input data-testid="input-plan-name" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Billing label</Label><Input data-testid="input-plan-billing" value={f.billingLabel} onChange={(e) => set('billingLabel', e.target.value)} /></div>
              <div className="space-y-1.5 md:col-span-2"><Label>Description</Label><Textarea data-testid="input-plan-description" value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
              {([['monthlyPrice', 'Monthly price'], ['yearlyPrice', 'Yearly price'], ['setupFee', 'Setup fee']] as const).map(([k, l]) => (
                <div key={k} className="space-y-1.5"><Label>{l}</Label><Input data-testid={`input-plan-${k}`} className="font-mono" value={f[k]} onChange={(e) => set(k, e.target.value)} /></div>))}
              <div className="space-y-1.5"><Label>Currency</Label><Input data-testid="input-plan-currency" className="font-mono" value={f.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} /></div>
              <div className="space-y-1.5"><Label>Display order</Label><Input data-testid="input-plan-order" className="font-mono" value={f.displayOrder} onChange={(e) => set('displayOrder', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={f.status} onValueChange={(v) => set('status', v)}><SelectTrigger data-testid="select-plan-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{['enabled', 'disabled', 'archived'].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Prices are stored for reference only. No billing is performed.</p>
          </section>
          <section className="space-y-3 rounded-md border bg-card p-5">
            <h2 className="font-display text-2xl">Entitlements</h2>
            <GroupedEntitlementEditor defs={d} value={ent} onChange={setEnt} />
          </section>
          <div className="flex items-center justify-end gap-3">
            {err && <span className="mr-auto text-sm text-destructive">{err}</span>}
            <Button type="submit" data-testid="button-save-plan" disabled={!!err || create.isPending || update.isPending}>{create.isPending || update.isPending ? 'Saving' : id ? 'Save plan' : 'Create plan'}</Button>
          </div>
        </form>)}
      <ReviewDialog open={rev} onClose={() => setRev(false)} title={id ? 'save plan' : 'create plan'} pending={create.isPending || update.isPending} onApply={doSave}
        rows={[['Name', f.name.trim()], ['Status', f.status], ['Prices', `${f.monthlyPrice} / mo, ${f.yearlyPrice} / yr, ${f.setupFee} setup ${f.currency}`], ['Entitlements set', String(entriesFrom(d, ent, true).length)]]} />
    </>
  );
}
