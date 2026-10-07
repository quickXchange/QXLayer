import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ProviderAssignment, ProviderDefinition } from '@workspace/api-client-react';
import { useCan } from '@/lib/principal';
import { useProviderMutations } from './use-providers';
import { Err, Lbl } from './shared';

type Vals = Record<string, string | number | boolean>;

/** Non-secret scalar configuration for one assignment. No credential inputs exist here. */
export function ConfigEditor({ a, p, locked }: { a: ProviderAssignment; p: ProviderDefinition; locked: boolean }) {
  const { configure } = useProviderMutations();
  const [v, setV] = useState<Vals>({ ...(a.configuration ?? {}) });
  const [msg, setMsg] = useState<string | null>(null);
  const fields = p.configurationSchema;
  const owner = useCan(a.tenantId).role === 'super_admin';
  const off = locked || (!p.tenantConfigurable && !owner);
  if (fields.length === 0) return <p className="text-xs text-muted-foreground">This provider defines no configuration fields.</p>;
  const missing = fields.filter((f) => f.required && f.type !== 'boolean' && (v[f.key] === undefined || v[f.key] === ''));
  const save = () => {
    const out: Vals = {};
    fields.forEach((f) => { const x = f.type === 'boolean' ? (v[f.key] ?? false) : v[f.key]; if (x === undefined || x === '') return; out[f.key] = f.type === 'number' ? Number(x) : x; });
    setMsg(null);
    configure.mutate({ tenantId: a.tenantId, assignmentId: a.id, data: { configuration: out } }, { onSuccess: () => setMsg('Configuration saved. Connection stays not connected.') });
  };
  return (
    <div className="space-y-3" data-testid={`config-${a.id}`}>
      {!p.tenantConfigurable && !owner && <p className="text-xs text-muted-foreground">This provider is not tenant configurable.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <Lbl key={f.key} t={`${f.label}${f.required ? ' *' : ''}`}>
            {f.type === 'boolean'
              ? <div><Switch disabled={off} checked={v[f.key] === true} onCheckedChange={(x) => setV({ ...v, [f.key]: x })} aria-label={f.label} /></div>
              : <Input disabled={off} type={f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : 'text'} placeholder={f.type === 'url' ? 'https://' : ''} data-testid={`input-config-${f.key}`} value={String(v[f.key] ?? '')} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}
          </Lbl>))}
      </div>
      <Err e={configure.error} />
      {msg && <p className="text-xs text-copper" data-testid="text-config-saved">{msg}</p>}
      <Button size="sm" disabled={off || configure.isPending || missing.length > 0} onClick={save} data-testid={`button-save-config-${a.id}`}>{configure.isPending ? 'Saving' : 'Save configuration'}</Button>
      {missing.length > 0 && <p className="text-xs text-muted-foreground">Required: {missing.map((f) => f.label).join(', ')}</p>}
    </div>
  );
}
