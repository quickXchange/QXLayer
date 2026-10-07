import { useState } from 'react';
import { useGetTenantProviderFoundation, getGetTenantProviderFoundationQueryKey, useGetProviderFoundation, getGetProviderFoundationQueryKey } from '@workspace/api-client-react';
import { ErrorState, ListSkeleton } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { useCan } from '@/lib/principal';
import { ExSection as Section } from '@/components/exchange/manage';
import { ConfigEditor } from './config-editor';
import { PolicySection } from './policy-section';
import { useProviderMutations } from './use-providers';
import { ConnPill, Confirm, Err, Lbl, Note, STATUS_LABEL, selectCls } from './shared';

export function TenantProviderPanel({ tenantId, locked }: { tenantId: string; locked: boolean }) {
  const can = useCan(tenantId);
  const isSuper = can.role === 'super_admin';
  const q = useGetTenantProviderFoundation(tenantId, { query: { queryKey: getGetTenantProviderFoundationQueryKey(tenantId), refetchInterval: 30000 } });
  const g = useGetProviderFoundation({ query: { enabled: isSuper, queryKey: getGetProviderFoundationQueryKey(), refetchInterval: 30000 } });
  const { assign, unassign } = useProviderMutations();
  const [pid, setPid] = useState(''); const [cap, setCap] = useState(''); const [env, setEnv] = useState('');
  const [rm, setRm] = useState<string | null>(null); const [open, setOpen] = useState<string | null>(null);
  const b = q.data;
  const pick = (g.data?.providers ?? []).find((p) => p.id === pid);
  const mine = (b?.assignments ?? []).filter((a) => a.tenantId === tenantId);
  const prov = (id: string) => g.data?.providers.find((x) => x.id === id) ?? b?.providers.find((x) => x.id === id);
  const free = (b?.providers ?? []).filter((p) => !mine.some((a) => a.providerId === p.id));
  const rmA = mine.find((a) => a.id === rm);
  return (
    <Section n="X7" title="Providers / Integrations" note="Providers available to this white label and their configuration. Nothing here connects, quotes or executes." footer={null}>
      <Note>No provider is connected. Credentials cannot be entered or stored. Status shown is configuration only.</Note>
      {q.isLoading ? <ListSkeleton /> : q.isError || !b ? <ErrorState what="the provider configuration" onRetry={() => q.refetch()} /> : (
        <div className="space-y-6">
          {locked && <p className="text-xs text-muted-foreground" data-testid="text-providers-readonly">Read-only for your access level or this tenant's state.</p>}
          {mine.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-assignments">No provider is assigned to this white label. A platform administrator assigns providers and capabilities.</p> : (
            <ul className="divide-y rounded-md border bg-card" data-testid="list-provider-assignments">{mine.map((a) => { const p = prov(a.providerId); return (
              <li key={a.id} className="space-y-2 p-3 text-sm" data-testid={`assignment-${a.id}`}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-display text-lg">{p?.name ?? a.providerId}</span><span className="font-mono text-xs text-muted-foreground">{a.capability} / {a.environment}</span>
                  <ConnPill a={a} /><span className="text-xs text-muted-foreground">{p ? STATUS_LABEL[p.status] : ''}</span>
                  <span className="ml-auto flex gap-2"><Button size="sm" variant="outline" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? 'Hide' : 'Configuration'}</Button>
                    {isSuper && !locked && <Button size="sm" variant="outline" data-testid={`button-remove-assignment-${a.id}`} onClick={() => setRm(a.id)}>Remove</Button>}</span></div>
                {open === a.id && p && <ConfigEditor a={a} p={p} locked={locked} />}
              </li>); })}</ul>)}
          {free.length > 0 && (
            <div className="space-y-2" data-testid="list-allowed-providers"><h3 className="font-mono text-xs uppercase tracking-wider text-copper">Allowed, not yet assigned</h3>
              <ul className="divide-y rounded-md border bg-card">{free.map((p) => <li key={p.id} className="flex flex-wrap items-center gap-2 p-3 text-sm"><span className="font-medium">{p.name}</span><span className="text-xs text-muted-foreground">{p.capabilities.join(', ')}</span><span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">{STATUS_LABEL[p.status] ?? p.status}<ConnPill /></span></li>)}</ul>
              <p className="text-xs text-muted-foreground">Available to this white label but not assigned. Planned route and network policies need an explicit assignment for the chosen provider, capability and environment.</p></div>)}
          {isSuper && !locked && (
            <div className="space-y-3 rounded-md border p-3"><h3 className="font-mono text-xs uppercase tracking-wider text-copper">Assign a provider</h3>
              {g.isError ? <p className="text-sm text-destructive">The catalog could not be loaded.</p> : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Lbl t="Provider"><select className={selectCls} data-testid="select-tenant-assign-provider" value={pid} onChange={(e) => { setPid(e.target.value); setCap(''); setEnv(''); }}><option value="">{g.isLoading ? 'Loading' : (g.data?.providers.length ? 'Select' : 'Catalog is empty')}</option>{g.data?.providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Lbl>
                  <Lbl t="Capability"><select className={selectCls} value={cap} disabled={!pick} onChange={(e) => setCap(e.target.value)}><option value="">Select</option>{pick?.capabilities.map((c) => <option key={c}>{c}</option>)}</select></Lbl>
                  <Lbl t="Environment"><select className={selectCls} value={env} disabled={!pick} onChange={(e) => setEnv(e.target.value)}><option value="">Select</option>{pick?.environments.map((c) => <option key={c}>{c}</option>)}</select></Lbl>
                </div>)}
              <Err e={assign.error} />
              <Button size="sm" disabled={!pid || !cap || !env || assign.isPending} data-testid="button-tenant-assign" onClick={() => assign.mutate({ tenantId, data: { providerId: pid, capability: cap, environment: env as 'sandbox' } }, { onSuccess: () => { setPid(''); setCap(''); setEnv(''); } })}>{assign.isPending ? 'Assigning' : 'Assign'}</Button></div>)}
          <PolicySection tenantId={tenantId} bundle={b} locked={locked} />
        </div>)}
      <Confirm open={!!rmA} title="Remove this assignment?" label="Remove assignment" pending={unassign.isPending} error={unassign.error} onClose={() => { setRm(null); unassign.reset(); }}
        body={<p>This removes the provider capability and its saved configuration from this white label.</p>}
        onGo={() => rmA && unassign.mutate({ tenantId, assignmentId: rmA.id }, { onSuccess: () => setRm(null) })} />
    </Section>
  );
}
