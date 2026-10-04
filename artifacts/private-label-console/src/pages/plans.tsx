import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useListPlans, useDuplicatePlan, useSetPlanStatus, type Plan } from '@workspace/api-client-react';
import { PageHeader, ErrorState, EmptyState, ListSkeleton } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCan } from '@/lib/principal';
import { useInvalidateCatalog } from '@/lib/invalidate';
import { useToast } from '@/hooks/use-toast';

export const planTone = (s: string) => (s === 'enabled' ? 'bg-primary text-primary-foreground' : s === 'archived' ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground');

export default function Plans() {
  const can = useCan();
  const q = useListPlans();
  const dup = useDuplicatePlan();
  const st = useSetPlanStatus();
  const inv = useInvalidateCatalog();
  const { toast } = useToast();
  const [, nav] = useLocation();
  const [busy, setBusy] = useState('');
  const fail = (e: unknown) => toast({ title: 'Action failed', description: (e as Error).message, variant: 'destructive' });
  if (!can.manageCatalog) return <><PageHeader eyebrow="Catalog" title="Plans" /><p className="text-sm text-muted-foreground" data-testid="text-forbidden">Only a super admin can manage plans.</p></>;
  const setStatus = (p: Plan, status: Plan['status']) => { setBusy(p.id); st.mutate({ planId: p.id, data: { status } }, { onSuccess: () => { inv(); toast({ title: `Plan ${status}` }); }, onError: fail, onSettled: () => setBusy('') }); };
  const plans = [...(q.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <>
      <PageHeader eyebrow="Catalog" title="Plans">
        <Button asChild data-testid="button-new-plan"><Link href="/plans/new">New plan</Link></Button>
      </PageHeader>
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">Disabled and archived plans cannot be assigned to new clients. Existing subscribers keep what they have.</p>
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState what="plans" onRetry={() => q.refetch()} /> : plans.length === 0 ? (
        <EmptyState title="No plans yet" body="Create the first plan to start provisioning clients." action={<Button asChild><Link href="/plans/new">New plan</Link></Button>} />
      ) : (
        <div className="divide-y rounded-md border bg-card">
          {plans.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 p-4" data-testid={`row-plan-${p.id}`}>
              <div className="min-w-0 flex-1">
                <Link href={`/plans/${p.id}`} className="font-display text-2xl hover:underline" data-testid={`link-plan-${p.id}`}>{p.name}</Link>
                <p className="truncate text-sm text-muted-foreground">{p.description || 'No description'}</p>
              </div>
              <div className="font-mono text-xs text-muted-foreground"><p>{p.monthlyPrice} {p.currency} / mo</p><p>{p.yearlyPrice} {p.currency} / yr</p></div>
              <Badge className={`${planTone(p.status)} rounded-sm font-mono text-[10px] uppercase shadow-none`}>{p.status}</Badge>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => nav(`/plans/${p.id}`)}>Edit</Button>
                <Button size="sm" variant="outline" disabled={dup.isPending} data-testid={`button-duplicate-${p.id}`} onClick={() => dup.mutate({ planId: p.id }, { onSuccess: (n) => { inv(); toast({ title: 'Plan duplicated' }); nav(`/plans/${n.id}`); }, onError: fail })}>Duplicate</Button>
                {p.status !== 'enabled' && p.status !== 'archived' || p.status === 'archived' ? <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => setStatus(p, 'enabled')}>Enable</Button> : null}
                {p.status === 'enabled' && <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => setStatus(p, 'disabled')}>Disable</Button>}
                {p.status !== 'archived' && <Button size="sm" variant="ghost" disabled={busy === p.id} onClick={() => setStatus(p, 'archived')}>Archive</Button>}
              </div>
            </div>))}
        </div>)}
    </>
  );
}
