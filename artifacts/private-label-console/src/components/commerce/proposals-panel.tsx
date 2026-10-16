import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Panel, Pill, ReviewDialog } from '@/components/super-admin/kit';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { useToast } from '@/hooks/use-toast';
import { useCommerceApi } from './api';
import { getListPlansQueryKey, getListAddonsQueryKey } from '@workspace/api-client-react';

export type Proposal = { id: string; name: string; kind: 'plan' | 'addon'; currency: string; monthlyPrice: string | null; yearlyPrice: string | null; setupFee: string | null; approved: boolean };
const KEY = ['phase1-proposals'];
const p = (v: string | null) => (v == null || v === '' ? 'not set' : v);

export function ProposalsPanel() {
  const call = useCommerceApi(); const qc = useQueryClient(); const { toast } = useToast();
  const [pend, setPend] = useState<Proposal | null>(null);
  const q = useQuery({ queryKey: KEY, retry: 1, queryFn: async () => { const x = await call<unknown>('GET', '/operator/phase1/proposals'); if (!Array.isArray(x)) throw new Error('Unexpected proposals response'); return x as Proposal[]; } });
  const approve = useMutation({ mutationFn: (x: Proposal) => call('POST', `/operator/phase1/proposals/${x.kind}/${x.id}/approve`, { confirmed: true, expected: { monthlyPrice: x.monthlyPrice, yearlyPrice: x.yearlyPrice, setupFee: x.setupFee, currency: x.currency } }),
    onSuccess: () => { setPend(null); qc.invalidateQueries({ queryKey: KEY }); qc.invalidateQueries({ queryKey: getListPlansQueryKey() }); qc.invalidateQueries({ queryKey: getListAddonsQueryKey() }); toast({ title: 'Prices approved' }); } });
  return <Panel title="Proposed prices" note="Default Phase 1 prices are proposals until you approve them. Nothing is approved automatically, and unapproved items cannot be purchased.">
    {q.isLoading ? <ListSkeleton rows={2} /> : q.isError ? <ErrorState what="price proposals" onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyState title="No proposals" body="No default Phase 1 plans or add-ons are awaiting approval." /> : <div className="space-y-2">
      {q.data.map((x) => <div key={`${x.kind}-${x.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm" data-testid={`proposal-${x.kind}-${x.id}`}>
        <div className="min-w-0"><p className="[overflow-wrap:anywhere]">{x.name} <span className="font-mono text-xs text-muted-foreground">{x.kind}</span></p>
          <p className="font-mono text-xs text-muted-foreground">{p(x.monthlyPrice)} / mo, {p(x.yearlyPrice)} / yr, {p(x.setupFee)} setup {x.currency}</p></div>
        <div className="flex items-center gap-2"><Pill tone={x.approved ? 'ok' : 'warn'}>{x.approved ? 'approved' : 'proposed'}</Pill>
          <Button size="sm" variant="outline" disabled={x.approved} onClick={() => { approve.reset(); setPend(x); }} data-testid={`button-approve-${x.kind}-${x.id}`}>{x.approved ? 'Approved' : 'Approve prices'}</Button></div></div>)}</div>}
    <ReviewDialog open={!!pend} onClose={() => setPend(null)} title="approve proposed prices" applyLabel="Approve prices" pending={approve.isPending} error={approve.isError ? (approve.error as Error).message : null} onApply={() => pend && !pend.approved && approve.mutate(pend)}
      rows={pend ? [['Item', `${pend.name} (${pend.kind})`], ['Monthly', `${p(pend.monthlyPrice)} ${pend.currency}`], ['Yearly', `${p(pend.yearlyPrice)} ${pend.currency}`], ['Setup fee', `${p(pend.setupFee)} ${pend.currency}`], ['Effect', 'These exact prices become purchasable and are billed to customers']] : []} />
  </Panel>;
}
