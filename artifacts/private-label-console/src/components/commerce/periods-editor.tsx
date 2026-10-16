import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/super-admin/kit';
import { ErrorState, ListSkeleton } from '@/components/app/bits';
import { useToast } from '@/hooks/use-toast';
import { discounted } from '@/lib/wl';
import { useCommerceApi } from './api';

type Periods = { monthly: boolean; yearly: boolean };
export type PeriodPlan = { monthlyPrice?: string | null; yearlyPrice?: string | null; setupFee?: string | null; discountPercent?: string | null; currency: string; entitlements: { key: string; value: unknown }[] };

export function PeriodsEditor({ planId, plan }: { planId: string; plan: PeriodPlan }) {
  const call = useCommerceApi(); const qc = useQueryClient(); const { toast } = useToast(); const key = ['phase1-periods', planId];
  const [v, setV] = useState<Periods>({ monthly: false, yearly: false });
  const q = useQuery({ queryKey: key, retry: 1, queryFn: async () => { const x = await call<Periods>('GET', `/operator/phase1/plans/${planId}/periods`); if (typeof x?.monthly !== 'boolean' || typeof x?.yearly !== 'boolean') throw new Error('Unexpected periods response'); return x; } });
  useEffect(() => { if (q.data) setV({ monthly: q.data.monthly, yearly: q.data.yearly }); }, [q.data]);
  const save = useMutation({ mutationFn: () => call<Periods>('PUT', `/operator/phase1/plans/${planId}/periods`, v), onSuccess: (x) => { qc.setQueryData(key, x); qc.invalidateQueries({ queryKey: ['phase1-catalog'] }); toast({ title: 'Billing periods saved' }); } });
  const dirty = !!q.data && (q.data.monthly !== v.monthly || q.data.yearly !== v.yearly);
  const price = (p: string | null | undefined) => (p ? `${currencyOf(plan)} ${discounted(p, plan.discountPercent)}` : 'Price not configured');
  const feats = plan.entitlements.filter((e) => e.value === true).map((e) => e.key);
  return <Panel title="Billing periods" note="Choose which periods customers can buy. Preview uses the prices saved on this plan.">
    {q.isLoading ? <ListSkeleton rows={1} /> : q.isError ? <ErrorState what="billing periods" onRetry={() => q.refetch()} /> : <div className="space-y-3">
      {([['monthly', 'Monthly', plan.monthlyPrice], ['yearly', 'Yearly', plan.yearlyPrice]] as const).map(([k, l, pr]) => <label key={k} className="flex items-start gap-2 rounded-md border p-3 text-sm"><input type="checkbox" className="mt-1" checked={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.checked })} data-testid={`check-period-${k}`} /><span><span className="font-medium">{l}</span><span className="block font-mono text-xs text-muted-foreground">{price(pr)}{plan.setupFee ? ` + ${plan.setupFee} setup` : ''}</span></span></label>)}
      <div className="rounded-md border bg-muted/40 p-3 text-xs" data-testid="periods-preview"><p className="mb-1 font-mono uppercase tracking-wider text-muted-foreground">Customer preview</p>
        <p>{[v.monthly && `Monthly ${price(plan.monthlyPrice)}`, v.yearly && `Yearly ${price(plan.yearlyPrice)}`].filter(Boolean).join(' | ') || 'No period selected: this plan cannot be purchased.'}</p>
        <p className="mt-1 text-muted-foreground [overflow-wrap:anywhere]">Features: {feats.length ? feats.join(', ') : 'none enabled'}</p></div>
      {save.isError && <p role="alert" className="text-sm text-destructive">{(save.error as Error).message}</p>}
      <Button type="button" disabled={!dirty || save.isPending} onClick={() => save.mutate()} data-testid="button-save-periods">{save.isPending ? 'Saving' : 'Save periods'}</Button></div>}
  </Panel>;
}
const currencyOf = (p: PeriodPlan) => p.currency;
