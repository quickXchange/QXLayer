import { useEffect, useMemo, useState } from 'react';
import {
  useGetTenantSubscription, getGetTenantSubscriptionQueryKey, useListPlans, useListAddons, useListEntitlementDefinitions,
  useChangeTenantPlan, useSetTenantAddons, useSetTenantOverrides, useSetTenantSuspension, type SubscriptionView,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useInvalidateTenant } from '@/lib/invalidate';
import { ErrorState } from './bits';
import { Section } from './sections';
import { OverridesEditor, overrideError } from './entitlement-editor';

export function useSubscription(tenantId: string) {
  return useGetTenantSubscription(tenantId, { query: { enabled: !!tenantId, queryKey: getGetTenantSubscriptionQueryKey(tenantId) } });
}

export function hasFeature(sub: SubscriptionView | undefined, ...needles: string[]) {
  if (!sub) return false;
  return Object.entries(sub.features).some(([k, v]) => v && needles.some((n) => k.includes(n)));
}

function useDone(tenantId: string) {
  const inv = useInvalidateTenant();
  const { toast } = useToast();
  return {
    ok: (m: string) => { inv(tenantId); toast({ title: m }); },
    fail: (e: unknown) => toast({ title: 'Action failed', description: (e as Error)?.message ?? 'Request rejected', variant: 'destructive' }),
  };
}

function Capabilities({ sub }: { sub: SubscriptionView }) {
  const defs = useListEntitlementDefinitions();
  const lbl = (k: string) => defs.data?.find((d) => d.key === k)?.label ?? k;
  const feats = Object.entries(sub.features);
  const lims = Object.entries(sub.limits);
  return (
    <div className="space-y-5">
      <div className="grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-3">
        {[['Plan', sub.plan?.name ?? 'None assigned'], ['Subscription', sub.status], ['Limits', sub.overLimit ? 'over limit' : 'within limits']].map(([l, v]) => (
          <div key={l} className="bg-card p-4"><p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{l}</p><p data-testid={`text-sub-${l.toLowerCase()}`} className={`mt-1 text-sm capitalize ${v === 'over limit' ? 'text-destructive' : ''}`}>{v}</p></div>))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div><p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Effective features</p>
          <div className="divide-y rounded-md border">{feats.length === 0 && <p className="p-3 text-sm text-muted-foreground">None.</p>}
            {feats.map(([k, v]) => <div key={k} className="flex items-center justify-between p-3 text-sm"><span>{lbl(k)}</span><span className="font-mono text-[10px] uppercase text-muted-foreground">{v ? 'on' : 'off'}{sub.sources[k] ? ` · ${sub.sources[k]}` : ''}</span></div>)}</div></div>
        <div><p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Usage against limits</p>
          <div className="divide-y rounded-md border">{sub.usage.length === 0 && lims.length === 0 && <p className="p-3 text-sm text-muted-foreground">No limits defined.</p>}
            {sub.usage.map((u) => (
              <div key={u.key} className="p-3" data-testid={`row-usage-${u.key}`}>
                <div className="flex items-center justify-between text-sm"><span>{u.label}</span><span className={`font-mono text-xs ${u.exceeded ? 'text-destructive' : ''}`}>{u.used} / {u.limit}</span></div>
                <div className="mt-2 h-1 rounded bg-muted"><div className={`h-1 rounded ${u.exceeded ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.min(100, Number(u.limit) > 0 ? (Number(u.used) / Number(u.limit)) * 100 : u.exceeded ? 100 : 0)}%` }} /></div>
              </div>))}</div></div>
      </div>
    </div>
  );
}

function PlanPanel({ sub }: { sub: SubscriptionView }) {
  const plans = useListPlans();
  const m = useChangeTenantPlan();
  const d = useDone(sub.tenantId);
  const [sel, setSel] = useState(sub.plan?.id ?? '');
  useEffect(() => setSel(sub.plan?.id ?? ''), [sub.plan?.id]);
  const opts = (plans.data ?? []).filter((p) => p.status === 'enabled' || p.id === sub.plan?.id).sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-72"><p className="mb-1.5 text-sm">Plan</p>
        {plans.isLoading ? <Skeleton className="h-9" /> : plans.isError ? <button className="text-sm text-destructive underline" onClick={() => plans.refetch()}>Retry loading plans</button> : (
          <Select value={sel} onValueChange={setSel}><SelectTrigger data-testid="select-tenant-plan"><SelectValue placeholder="Select a plan" /></SelectTrigger>
            <SelectContent>{opts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.status !== 'enabled' ? ` (${p.status}, current)` : ''}</SelectItem>)}</SelectContent></Select>)}</div>
      <Button data-testid="button-change-plan" disabled={!sel || sel === sub.plan?.id || m.isPending} onClick={() => m.mutate({ tenantId: sub.tenantId, data: { planId: sel } }, { onSuccess: () => d.ok('Plan changed'), onError: d.fail })}>{m.isPending ? 'Changing' : 'Change plan'}</Button>
    </div>
  );
}

function AddonsPanel({ sub }: { sub: SubscriptionView }) {
  const addons = useListAddons();
  const m = useSetTenantAddons();
  const d = useDone(sub.tenantId);
  const cur = sub.addons.map((a) => a.id);
  const [sel, setSel] = useState<string[]>(cur);
  const key = cur.join(',');
  useEffect(() => setSel(cur), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = (addons.data ?? []).filter((a) => a.enabled || cur.includes(a.id));
  if (addons.isLoading) return <Skeleton className="h-24" />;
  if (addons.isError) return <ErrorState what="add-ons" onRetry={() => addons.refetch()} />;
  return (
    <div className="space-y-3">
      {list.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No add-ons in the catalog.</p>}
      <div className="grid gap-2 md:grid-cols-2">
        {list.map((a) => (
          <label key={a.id} className="flex cursor-pointer gap-3 rounded-md border p-3 hover:bg-muted/50">
            <Checkbox data-testid={`checkbox-addon-${a.id}`} checked={sel.includes(a.id)} onCheckedChange={() => setSel((s) => (s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id]))} className="mt-0.5" />
            <span><span className="block text-sm font-medium">{a.name}</span><span className="block text-xs text-muted-foreground">{a.description}</span></span>
          </label>))}
      </div>
      <Button data-testid="button-save-addons" disabled={m.isPending} onClick={() => m.mutate({ tenantId: sub.tenantId, data: { addonIds: sel } }, { onSuccess: () => d.ok('Add-ons saved'), onError: d.fail })}>{m.isPending ? 'Saving' : 'Save add-ons'}</Button>
    </div>
  );
}

function OverridesPanel({ sub }: { sub: SubscriptionView }) {
  const defs = useListEntitlementDefinitions();
  const m = useSetTenantOverrides();
  const d = useDone(sub.tenantId);
  const [rows, setRows] = useState(sub.overrides);
  useEffect(() => setRows(sub.overrides), [sub.overrides]);
  const defList = useMemo(() => defs.data ?? [], [defs.data]);
  const err = overrideError(defList, rows);
  if (defs.isLoading) return <Skeleton className="h-24" />;
  if (defs.isError) return <ErrorState what="definitions" onRetry={() => defs.refetch()} />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Overrides apply to this tenant only. A numeric override replaces the combined plan and add-on value.</p>
      <OverridesEditor defs={defList} rows={rows} onChange={setRows} />
      <div className="flex items-center gap-3">
        <Button data-testid="button-save-overrides" disabled={!!err || m.isPending} onClick={() => m.mutate({ tenantId: sub.tenantId, data: { overrides: rows } }, { onSuccess: () => d.ok('Overrides saved'), onError: d.fail })}>{m.isPending ? 'Saving' : 'Save overrides'}</Button>
        {err && <span className="text-sm text-destructive">{err}</span>}
      </div>
    </div>
  );
}

function SuspensionPanel({ sub }: { sub: SubscriptionView }) {
  const m = useSetTenantSuspension();
  const d = useDone(sub.tenantId);
  const [reason, setReason] = useState('');
  const suspended = sub.status === 'suspended' || sub.tenantStatus === 'suspended';
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{suspended ? 'This tenant is suspended: its public site is unavailable and its client admin is read-only. It cannot be activated until unsuspended.' : 'Suspending makes the tenant site unavailable and locks the client admin to read-only.'}</p>
      <div className="flex flex-wrap gap-2">
        <Input data-testid="input-suspend-reason" className="max-w-md" placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button data-testid="button-suspend" variant={suspended ? 'outline' : 'destructive'} disabled={reason.trim().length < 2 || m.isPending}
          onClick={() => m.mutate({ tenantId: sub.tenantId, data: { suspended: !suspended, reason: reason.trim() } }, { onSuccess: () => { setReason(''); d.ok(suspended ? 'Tenant unsuspended' : 'Tenant suspended'); }, onError: d.fail })}>
          {m.isPending ? 'Working' : suspended ? 'Unsuspend' : 'Suspend tenant'}</Button>
      </div>
    </div>
  );
}

export function SubscriptionSections({ tenantId, canManage }: { tenantId: string; canManage: boolean }) {
  const q = useSubscription(tenantId);
  const sub = q.data;
  return (
    <div className="space-y-6">
      <Section n="S1" title={canManage ? 'Subscription' : 'Your capabilities'} note="Effective rights resolved from plan, add-ons and tenant overrides." footer={<span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{canManage ? 'Operator controls below' : 'Managed by your platform operator'}</span>}>
        {q.isLoading ? <Skeleton className="h-48" /> : q.isError || !sub ? <ErrorState what="subscription" onRetry={() => q.refetch()} /> : <Capabilities sub={sub} />}
      </Section>
      {canManage && sub && (
        <>
          <Section n="S2" title="Plan" note="Disabled or archived plans cannot be newly assigned." footer={<span />}><PlanPanel sub={sub} /></Section>
          <Section n="S3" title="Add-ons" note="Feature grants combine with the plan; numeric increments add to it." footer={<span />}><AddonsPanel sub={sub} /></Section>
          <Section n="S4" title="Overrides" note="Tenant-only feature and limit replacements, each with a reason." footer={<span />}><OverridesPanel sub={sub} /></Section>
          <Section n="S5" title="Suspension" note="Reason is recorded in activity." footer={<span />}><SuspensionPanel sub={sub} /></Section>
        </>)}
    </div>
  );
}
