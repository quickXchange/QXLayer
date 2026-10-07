import { useState } from 'react';
import { useListTenants, type ProviderAssignment, type ProviderDefinition } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { useProviderMutations } from './use-providers';
import { ConfigEditor } from './config-editor';
import { ConnPill, Confirm, Err, Lbl, Note, selectCls } from './shared';

/** Super Admin: assign provider -> tenant -> capability -> environment, edit config, remove. */
export function AssignmentsSection({ p, list, locked }: { p: ProviderDefinition; list: ProviderAssignment[]; locked: boolean }) {
  const tenants = useListTenants();
  const { assign, unassign } = useProviderMutations();
  const [tid, setTid] = useState(''); const [cap, setCap] = useState(p.capabilities[0] ?? ''); const [env, setEnv] = useState<string>(p.environments[0] ?? 'sandbox');
  const [rm, setRm] = useState<ProviderAssignment | null>(null); const [open, setOpen] = useState<string | null>(null);
  const name = (id: string) => tenants.data?.find((t) => t.id === id)?.brandName ?? id;
  return (
    <div className="space-y-4" data-testid="section-provider-assignments">
      {!locked && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Lbl t="Tenant"><select className={selectCls} data-testid="select-assign-tenant" value={tid} onChange={(e) => setTid(e.target.value)} disabled={tenants.isLoading}><option value="">{tenants.isError ? 'Tenants unavailable' : 'Select tenant'}</option>{tenants.data?.map((t) => <option key={t.id} value={t.id}>{t.brandName}</option>)}</select></Lbl>
            <Lbl t="Capability"><select className={selectCls} data-testid="select-assign-capability" value={cap} onChange={(e) => setCap(e.target.value)}>{p.capabilities.map((c) => <option key={c}>{c}</option>)}</select></Lbl>
            <Lbl t="Environment"><select className={selectCls} data-testid="select-assign-environment" value={env} onChange={(e) => setEnv(e.target.value)}>{p.environments.map((c) => <option key={c}>{c}</option>)}</select></Lbl>
          </div>
          <Err e={assign.error} />
          <Button size="sm" disabled={!tid || !cap || assign.isPending} data-testid="button-assign-provider" onClick={() => assign.mutate({ tenantId: tid, data: { providerId: p.id, capability: cap, environment: env as 'sandbox' } })}>{assign.isPending ? 'Assigning' : 'Assign to tenant'}</Button>
        </div>)}
      {list.length === 0 ? <Note>No tenant is assigned to this provider yet.</Note> : (
        <ul className="divide-y rounded-md border">{list.map((a) => (
          <li key={a.id} className="space-y-2 p-3 text-sm" data-testid={`assignment-${a.id}`}>
            <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{name(a.tenantId)}</span><span className="font-mono text-xs text-muted-foreground">{a.capability} / {a.environment}</span><ConnPill a={a} />
              <span className="ml-auto flex gap-2"><Button size="sm" variant="outline" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? 'Hide config' : 'Configuration'}</Button>
                {!locked && <Button size="sm" variant="outline" data-testid={`button-remove-assignment-${a.id}`} onClick={() => setRm(a)}>Remove</Button>}</span></div>
            {open === a.id && <ConfigEditor a={a} p={p} locked={locked} />}
          </li>))}</ul>)}
      <Confirm open={!!rm} title="Remove this assignment?" label="Remove assignment" pending={unassign.isPending} error={unassign.error} onClose={() => { setRm(null); unassign.reset(); }}
        body={<p>{rm ? `${name(rm.tenantId)} loses ${p.name} for ${rm.capability} in ${rm.environment}, including its saved configuration. Policies that reference it may be rejected by the server.` : ''}</p>}
        onGo={() => rm && unassign.mutate({ tenantId: rm.tenantId, assignmentId: rm.id }, { onSuccess: () => setRm(null) })} />
    </div>
  );
}
