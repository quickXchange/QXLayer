import { useMemo, useState } from 'react';
import { useGetExchangeConfiguration, getGetExchangeConfigurationQueryKey, type ProviderFoundation, type ProviderPolicy, type ProviderPolicyInput } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/super-admin/kit';
import { useProviderMutations } from './use-providers';
import { ENVS, Confirm, Err, Lbl, Note, selectCls } from './shared';

const ROUTE_CAPS: Record<string, string[]> = { swap: ['quotes', 'convert'], convert: ['convert', 'quotes'], buy: ['buy', 'payments', 'quotes'], sell: ['sell', 'payments', 'quotes'] };
const NET_CAPS = ['rpc', 'deposit_addresses', 'deposit_monitoring', 'transaction_monitoring'];

export function PolicySection({ tenantId, bundle, locked }: { tenantId: string; bundle: ProviderFoundation; locked: boolean }) {
  const cfg = useGetExchangeConfiguration(tenantId, { query: { queryKey: getGetExchangeConfigurationQueryKey(tenantId) } });
  const { savePolicy, removePolicy } = useProviderMutations();
  const [scope, setScope] = useState<'route' | 'network'>('route');
  const [res, setRes] = useState(''); const [cap, setCap] = useState(''); const [env, setEnv] = useState<string>('sandbox');
  const [mode, setMode] = useState<string>('sandbox_manual'); const [prov, setProv] = useState(''); const [fb, setFb] = useState<string>('manual'); const [sec, setSec] = useState('');
  const [rm, setRm] = useState<ProviderPolicy | null>(null);
  const c = (cfg.data as { configuration?: { routes?: { id: string; action: string; source: string; destination: string }[]; networks?: { assetNetworkId: string }[] } } | undefined)?.configuration;
  const resources = useMemo<{ id: string; text: string; caps: string[] }[]>(() => scope === 'route'
    ? (c?.routes ?? []).map((r) => ({ id: r.id, text: `${r.action}: ${r.source} to ${r.destination}`, caps: ROUTE_CAPS[r.action] ?? [] }))
    : (c?.networks ?? []).map((n) => ({ id: n.assetNetworkId, text: n.assetNetworkId, caps: NET_CAPS })), [c, scope]);
  const caps = resources.find((r) => r.id === res)?.caps ?? [];
  const name = (id: string | null) => (id ? bundle.providers.find((p) => p.id === id)?.name ?? id : 'None');
  const eligible = (cp: string) => Array.from(new Set(bundle.assignments.filter((a) => a.capability === cp && a.environment === env).map((a) => a.providerId)));
  const opts = cap ? eligible(cap) : [];
  const need = (mode === 'provider' && !prov) || (fb === 'secondary_provider' && (!sec || sec === prov));
  const input: ProviderPolicyInput = { scope, resourceId: res, capability: cap, environment: env as 'sandbox', executionMode: mode as 'sandbox_manual', providerId: prov || null, fallback: fb as 'none', secondaryProviderId: fb === 'secondary_provider' ? sec || null : null };
  const poName = (p: ProviderPolicy) => resources.find((r) => r.id === p.resourceId)?.text ?? p.resourceId;
  const reset = () => { setRes(''); setCap(''); setProv(''); setSec(''); };
  const provSel = (v: string, set: (s: string) => void, blank: string) => <select className={selectCls} value={v} onChange={(e) => set(e.target.value)}><option value="">{blank}</option>{opts.map((id) => <option key={id} value={id}>{name(id)}</option>)}</select>;
  return (
    <section className="space-y-4 rounded-md border bg-card p-4" data-testid="section-provider-policies">
      <div><h3 className="font-display text-xl">Route and network policies</h3>
        <p className="text-sm text-muted-foreground">Planned provider routing. Policies are saved separately and never change existing route or network arithmetic.</p></div>
      <Note>Planned only. Execution is not enabled, so nothing is routed to a provider. A provider selection requires an explicit assignment for that capability and environment, even for platform wide providers. Automatic failover needs a verified idempotent adapter, which does not exist yet; fallback here records intent only.</Note>
      {bundle.policies.length === 0 ? <p className="text-sm text-muted-foreground" data-testid="text-no-policies">No policies saved. Routes and networks keep their default manual sandbox handling.</p> : (
        <div className="max-w-full overflow-x-auto rounded-md border"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><th className="px-3 py-2 font-normal">Resource</th><th className="px-3 py-2 font-normal">Capability</th><th className="px-3 py-2 font-normal">Mode</th><th className="px-3 py-2 font-normal">Provider</th><th className="px-3 py-2 font-normal">Fallback</th><th className="px-3 py-2" /></tr></thead>
          <tbody>{bundle.policies.map((p) => <tr key={p.id} className="border-b last:border-0" data-testid={`policy-${p.id}`}>
            <td className="px-3 py-2"><span className="block">{poName(p)}</span><span className="font-mono text-xs text-muted-foreground">{p.scope} / {p.environment}</span></td>
            <td className="px-3 py-2">{p.capability}</td><td className="px-3 py-2">{p.executionMode === 'provider' ? 'Provider (planned)' : 'Sandbox manual'} <Pill>Not executing</Pill></td>
            <td className="px-3 py-2">{name(p.providerId)}</td><td className="px-3 py-2">{p.fallback.replace(/_/g, ' ')}{p.secondaryProviderId ? `: ${name(p.secondaryProviderId)}` : ''}</td>
            <td className="px-3 py-2 text-right"><Button size="sm" variant="outline" disabled={locked} data-testid={`button-remove-policy-${p.id}`} onClick={() => setRm(p)}>Remove</Button></td></tr>)}</tbody></table></div>)}
      {cfg.isLoading ? <p className="text-sm text-muted-foreground">Loading routes and networks</p> : cfg.isError ? <p className="text-sm text-destructive">Routes and networks could not be loaded. <button className="underline" onClick={() => cfg.refetch()}>Retry</button></p> : (
        <fieldset disabled={locked} className="space-y-3 border-t pt-4">
          <h4 className="font-mono text-xs uppercase tracking-wider text-copper">Add or update a policy</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Lbl t="Scope"><select className={selectCls} data-testid="select-policy-scope" value={scope} onChange={(e) => { setScope(e.target.value as 'route'); reset(); }}><option value="route">Route</option><option value="network">Network</option></select></Lbl>
            <Lbl t={scope === 'route' ? 'Route' : 'Network'}><select className={selectCls} data-testid="select-policy-resource" value={res} onChange={(e) => { setRes(e.target.value); setCap(''); setProv(''); setSec(''); }}><option value="">{resources.length ? 'Select' : `No ${scope}s configured`}</option>{resources.map((r) => <option key={r.id} value={r.id}>{r.text}</option>)}</select></Lbl>
            <Lbl t="Capability"><select className={selectCls} data-testid="select-policy-capability" value={cap} disabled={!res} onChange={(e) => { setCap(e.target.value); setProv(''); setSec(''); }}><option value="">Select</option>{caps.map((x) => <option key={x}>{x}</option>)}</select></Lbl>
            <Lbl t="Environment"><select className={selectCls} value={env} onChange={(e) => { setEnv(e.target.value); setProv(''); setSec(''); }}>{ENVS.map((x) => <option key={x}>{x}</option>)}</select></Lbl>
            <Lbl t="Execution mode"><select className={selectCls} data-testid="select-policy-mode" value={mode} onChange={(e) => setMode(e.target.value)}><option value="sandbox_manual">Sandbox manual</option><option value="provider">Provider (planned only, not executed)</option></select></Lbl>
            <Lbl t="Provider (explicitly assigned)">{provSel(prov, setProv, opts.length || !cap ? 'None' : 'No assigned provider')}</Lbl>
            <Lbl t="Fallback"><select className={selectCls} value={fb} onChange={(e) => setFb(e.target.value)}><option value="none">None</option><option value="manual">Manual</option><option value="secondary_provider">Secondary provider</option></select></Lbl>
            {fb === 'secondary_provider' && <Lbl t="Secondary provider">{provSel(sec, setSec, 'Select')}</Lbl>}
          </div>
          {cap && opts.length === 0 && <p className="text-xs text-muted-foreground">No provider is assigned for {cap} in {env}. Ask a platform administrator to assign one.</p>}
          <Err e={savePolicy.error} />
          <Button size="sm" disabled={!res || !cap || need || savePolicy.isPending} data-testid="button-save-policy" onClick={() => savePolicy.mutate({ tenantId, data: input }, { onSuccess: reset })}>{savePolicy.isPending ? 'Saving' : 'Save planned policy'}</Button>
        </fieldset>)}
      <Confirm open={!!rm} title="Remove this policy?" label="Remove policy" pending={removePolicy.isPending} error={removePolicy.error} onClose={() => { setRm(null); removePolicy.reset(); }}
        body={<p>The route or network returns to its default metadata: sandbox manual handling with no provider and no fallback.</p>}
        onGo={() => rm && removePolicy.mutate({ tenantId, policyId: rm.id }, { onSuccess: () => setRm(null) })} />
    </section>
  );
}
