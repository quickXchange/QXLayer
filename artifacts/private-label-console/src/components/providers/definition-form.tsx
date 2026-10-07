import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ProviderDefinition, ProviderDefinitionInput } from '@workspace/api-client-react';
import { useProviderMutations } from './use-providers';
import { SchemaRows } from './schema-rows';
import { definitionInput } from './definition-input';
import { ACCESS_LABEL, ENVS, Err, Lbl, Note, STATUS_OPTIONS, selectCls } from './shared';

const csv = (s: string, max = 80) => s.split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.slice(0, max));
export const EMPTY: ProviderDefinitionInput = { name: '', logoUrl: null, description: '', categories: [], services: [], capabilities: [], status: 'coming_soon', environments: ['sandbox'], credentialSchema: [], configurationSchema: [], access: 'assigned', entitlementKey: null, tenantConfigurable: true };

export function DefinitionForm({ provider, knownCategories, knownCaps, onDone }: { provider?: ProviderDefinition; knownCategories: string[]; knownCaps: string[]; onDone: (p: ProviderDefinition) => void }) {
  const { create, update } = useProviderMutations();
  const base: ProviderDefinitionInput = definitionInput(provider ?? EMPTY);
  const [f, setF] = useState<ProviderDefinitionInput>({ ...base });
  const [cats, setCats] = useState(base.categories.join(', '));
  const [svc, setSvc] = useState(base.services.join(', '));
  const [caps, setCaps] = useState(base.capabilities.join(', '));
  const [problem, setProblem] = useState<string | null>(null);
  const m = provider ? update : create;
  const set = (p: Partial<ProviderDefinitionInput>) => setF((x) => ({ ...x, ...p }));
  const submit = () => {
    const data: ProviderDefinitionInput = { ...definitionInput(f), name: f.name.trim(), logoUrl: f.logoUrl?.trim() || null, categories: csv(cats), services: csv(svc), capabilities: csv(caps, 64).map((c) => c.toLowerCase()), entitlementKey: f.access === 'entitlement' ? f.entitlementKey?.trim() || null : null };
    const keys = [...data.credentialSchema, ...data.configurationSchema];
    const bad = !data.name ? 'Name is required.' : data.categories.length === 0 ? 'Add at least one category.' : data.capabilities.length === 0 ? 'Add at least one capability.'
      : data.capabilities.some((c) => !/^[a-z][a-z0-9_]{0,63}$/.test(c)) ? 'Capabilities use lowercase letters, digits and underscores, for example quotes or deposit_addresses.'
      : data.environments.length === 0 ? 'Select at least one environment.'
      : keys.some((k) => !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(k.key) || !k.label.trim()) ? 'Every schema field needs a key (letters, digits, underscore) and a label.'
      : new Set(data.configurationSchema.map((k) => k.key)).size !== data.configurationSchema.length || new Set(data.credentialSchema.map((k) => k.key)).size !== data.credentialSchema.length ? 'Schema keys must be unique.'
      : data.access === 'entitlement' && !data.entitlementKey ? 'Plan entitlement access needs an existing feature key.' : null;
    setProblem(bad);
    if (bad) return;
    if (provider) update.mutate({ providerId: provider.id, data }, { onSuccess: onDone });
    else create.mutate({ data }, { onSuccess: onDone });
  };
  const pick = (v: string, cur: string, setter: (s: string) => void) => { const l = csv(cur); if (!l.includes(v)) setter([...l, v].join(', ')); };
  return (
    <div className="mt-4 space-y-4" data-testid="form-provider-definition">
      <Note>Catalog metadata only. Saving does not connect anything, and no credential values can be entered.</Note>
      <Lbl t="Name"><Input maxLength={120} data-testid="input-provider-name" value={f.name} onChange={(e) => set({ name: e.target.value })} /></Lbl>
      <Lbl t="Logo URL (optional)"><Input maxLength={500} placeholder="https://" value={f.logoUrl ?? ''} onChange={(e) => set({ logoUrl: e.target.value })} /></Lbl>
      <Lbl t="Description"><Textarea maxLength={2000} rows={3} value={f.description} onChange={(e) => set({ description: e.target.value })} /></Lbl>
      <Lbl t="Categories (comma separated)"><Input list="provider-cats" data-testid="input-provider-categories" value={cats} onChange={(e) => setCats(e.target.value)} placeholder="Payment, Rates / Market Data" /></Lbl>
      <datalist id="provider-cats">{knownCategories.map((c) => <option key={c} value={c} />)}</datalist>
      <Lbl t="Supported services (comma separated)"><Input value={svc} onChange={(e) => setSvc(e.target.value)} placeholder="Card payments, Spot rates" /></Lbl>
      <Lbl t="Capabilities (comma separated identifiers)"><Input data-testid="input-provider-capabilities" value={caps} onChange={(e) => setCaps(e.target.value)} placeholder="quotes, convert" /></Lbl>
      {knownCaps.length > 0 && <div className="flex flex-wrap gap-1.5">{knownCaps.map((c) => <button key={c} type="button" className="rounded-full border px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground" onClick={() => pick(c, caps, setCaps)}>+ {c}</button>)}</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Lbl t="Status"><select className={selectCls} data-testid="select-provider-status" value={f.status} onChange={(e) => set({ status: e.target.value as ProviderDefinitionInput['status'] })}>{STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Lbl>
        <Lbl t="Access"><select className={selectCls} data-testid="select-provider-access" value={f.access} onChange={(e) => set({ access: e.target.value as ProviderDefinitionInput['access'] })}>{Object.entries(ACCESS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Lbl>
      </div>
      {f.access === 'entitlement' && <Lbl t="Entitlement feature key"><Input maxLength={100} value={f.entitlementKey ?? ''} onChange={(e) => set({ entitlementKey: e.target.value })} placeholder="existing plan feature key" /></Lbl>}
      <fieldset className="flex flex-wrap gap-4 text-sm"><legend className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">Environments</legend>
        {ENVS.map((e) => <label key={e} className="flex items-center gap-1.5"><input type="checkbox" checked={f.environments.includes(e)} onChange={(x) => set({ environments: x.target.checked ? [...f.environments, e] : f.environments.filter((y) => y !== e) })} />{e}</label>)}</fieldset>
      <label className="flex items-center justify-between rounded-md border p-3 text-sm">Tenant configurable<Switch checked={f.tenantConfigurable} onCheckedChange={(v) => set({ tenantConfigurable: v })} /></label>
      <div className="space-y-1"><h3 className="font-mono text-xs uppercase tracking-wider text-copper">Configuration schema</h3>
        <SchemaRows noun="configuration" rows={f.configurationSchema} onChange={(r) => set({ configurationSchema: r })} types={['text', 'number', 'boolean', 'url']} example="key accountRegion, label Account region, type text" /></div>
      <div className="space-y-1"><h3 className="font-mono text-xs uppercase tracking-wider text-copper">Credential schema</h3>
        <SchemaRows noun="credentials" rows={f.credentialSchema} onChange={(r) => set({ credentialSchema: r })} types={['secret', 'text', 'url']} example="key apiKey, label API key, type secret" /></div>
      {problem && <p role="alert" className="text-sm text-destructive" data-testid="text-form-problem">{problem}</p>}
      <Err e={m.error} />
      <Button disabled={m.isPending} onClick={submit} data-testid="button-save-provider">{m.isPending ? 'Saving' : provider ? 'Save provider' : 'Create provider'}</Button>
    </div>
  );
}
