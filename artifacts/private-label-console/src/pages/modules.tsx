import { useState } from 'react';
import { useListProductRegistry, useRegisterProductModule, getListProductRegistryQueryKey, type ProductModule } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader, ErrorState, ListSkeleton, SandboxNote } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCan } from '@/lib/principal';
import { label } from '@/lib/format';

export const LIFECYCLE: Record<string, { name: string; note: string }> = {
  core_ready: { name: 'Core ready', note: 'Entitlements and settings are managed; execution is reported per product.' },
  sandbox_only: { name: 'Sandbox only', note: 'Runs in the sandbox only. Nothing is executed for real.' },
  deferred: { name: 'Deferred', note: 'Registered as a manifest. No service is implemented.' },
};
const KEY = /^[a-z][a-z0-9_]*$/;
interface F { key: string; label: string; dependsOn: string }
interface L { key: string; label: string; valueType: 'integer' | 'decimal' }

function RegisterForm({ taken, onDone }: { taken: string[]; onDone: () => void }) {
  const m = useRegisterProductModule();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [key, setKey] = useState(''); const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [category, setCategory] = useState('');
  const [req, setReq] = useState(false);
  const [feats, setFeats] = useState<F[]>([]); const [lims, setLims] = useState<L[]>([]);
  const fk = feats.map((f) => f.key);
  const err = !KEY.test(key) ? 'Key: lowercase letters, digits, underscores; start with a letter' : taken.includes(key) ? 'That key is already registered'
    : name.trim().length < 2 ? 'Name needs 2+ characters' : category.trim().length < 2 ? 'Category needs 2+ characters'
    : feats.some((f) => !KEY.test(f.key) || f.label.trim().length < 2) || new Set(fk).size !== fk.length ? 'Each feature needs a unique key and a label'
    : feats.some((f) => f.dependsOn.split(',').map((s) => s.trim()).filter(Boolean).some((d) => !KEY.test(d) || d === f.key)) ? 'Dependencies must be valid keys (this manifest or existing entitlements); the server rejects unknown ones'
    : lims.some((l) => !KEY.test(l.key) || l.label.trim().length < 2) || new Set(lims.map((l) => l.key)).size !== lims.length ? 'Each limit needs a unique key and a label' : '';
  const submit = () => {
    const data: ProductModule = {
      key, name: name.trim(), description: description.trim(), category: category.trim().toLowerCase().replace(/\s+/g, '_'),
      lifecycle: 'deferred', sandboxAvailable: false, requiresAssetNetworks: req,
      features: feats.map((f) => ({ key: f.key, label: f.label.trim(), dependsOn: f.dependsOn.split(',').map((s) => s.trim()).filter(Boolean) })),
      limits: lims.map((l) => ({ key: l.key, label: l.label.trim(), valueType: l.valueType })),
    };
    m.mutate({ data }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListProductRegistryQueryKey() }); toast({ title: 'Manifest registered as deferred' }); onDone(); },
      onError: (e) => toast({ title: 'Registration failed', description: (e as Error).message, variant: 'destructive' }),
    });
  };
  return (
    <form data-testid="form-register-product" className="mb-8 space-y-4 rounded-md border bg-card p-5" onSubmit={(e) => { e.preventDefault(); if (!err) submit(); }}>
      <div><h2 className="font-display text-2xl">Register a product manifest</h2>
        <p className="text-sm text-muted-foreground">Registration records a manifest only. It does not implement a service: lifecycle is fixed to deferred and sandbox availability to off.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5"><Label>Key</Label><Input data-testid="input-product-key" className="font-mono" value={key} onChange={(e) => setKey(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Name</Label><Input data-testid="input-product-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Category</Label><Input data-testid="input-product-category" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
        <label className="flex items-end gap-2 pb-2 text-sm"><Checkbox data-testid="checkbox-product-assets" checked={req} onCheckedChange={(v) => setReq(v === true)} /> Requires asset and network selection</label>
        <div className="space-y-1.5 md:col-span-2"><Label>Description</Label><Textarea data-testid="input-product-description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      <div className="space-y-2"><Label>Features</Label>
        {feats.map((f, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <Input data-testid={`input-feature-key-${i}`} className="w-44 font-mono" placeholder="key" value={f.key} onChange={(e) => setFeats(feats.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
            <Input data-testid={`input-feature-label-${i}`} className="w-52" placeholder="Label" value={f.label} onChange={(e) => setFeats(feats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <Input data-testid={`input-feature-deps-${i}`} className="w-56 font-mono" placeholder="depends on (keys, comma)" value={f.dependsOn} onChange={(e) => setFeats(feats.map((x, j) => (j === i ? { ...x, dependsOn: e.target.value } : x)))} />
            <Button type="button" variant="ghost" onClick={() => setFeats(feats.filter((_, j) => j !== i))}>Remove</Button>
          </div>))}
        {feats.length < 50 && <Button type="button" size="sm" variant="outline" data-testid="button-add-feature" onClick={() => setFeats([...feats, { key: '', label: '', dependsOn: '' }])}>Add feature</Button>}</div>
      <div className="space-y-2"><Label>Limits</Label>
        {lims.map((l, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <Input data-testid={`input-limit-key-${i}`} className="w-44 font-mono" placeholder="key" value={l.key} onChange={(e) => setLims(lims.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
            <Input data-testid={`input-limit-label-${i}`} className="w-52" placeholder="Label" value={l.label} onChange={(e) => setLims(lims.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <Select value={l.valueType} onValueChange={(v) => setLims(lims.map((x, j) => (j === i ? { ...x, valueType: v as L['valueType'] } : x)))}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="integer">integer</SelectItem><SelectItem value="decimal">decimal</SelectItem></SelectContent></Select>
            <Button type="button" variant="ghost" onClick={() => setLims(lims.filter((_, j) => j !== i))}>Remove</Button>
          </div>))}
        {lims.length < 50 && <Button type="button" size="sm" variant="outline" data-testid="button-add-limit" onClick={() => setLims([...lims, { key: '', label: '', valueType: 'integer' }])}>Add limit</Button>}</div>
      <div className="flex items-center justify-end gap-3">
        {err && key !== '' && <span className="mr-auto text-sm text-destructive" data-testid="text-register-error">{err}</span>}
        <Button type="button" variant="ghost" onClick={onDone} data-testid="button-cancel-register">Cancel</Button>
        <Button data-testid="button-register-product" disabled={!!err || m.isPending}>{m.isPending ? 'Registering' : 'Register manifest'}</Button>
      </div>
    </form>
  );
}

export default function Modules() {
  const q = useListProductRegistry();
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [exp, setExp] = useState<string | null>(null);
  const all = q.data ?? [];
  const list = all.filter((m) => filter === 'all' || m.lifecycle === filter);
  return (
    <>
      <PageHeader eyebrow="Registry" title="Products">
        {can.editModules && !open && <Button data-testid="button-open-register" onClick={() => setOpen(true)}>Register manifest</Button>}
      </PageHeader>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">Every product the platform knows about, read from the registry. A manifest describes features and limits a client can be granted. It never implies a running service; the lifecycle shows what actually exists.</p>
      {open && can.editModules && <RegisterForm taken={all.map((m) => m.key)} onDone={() => setOpen(false)} />}
      <div className="mb-4 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
        {['all', 'core_ready', 'sandbox_only', 'deferred'].map((f) => (
          <button key={f} data-testid={`filter-${f}`} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 ${filter === f ? 'border-copper text-copper' : 'text-muted-foreground hover:text-foreground'}`}>
            {f === 'all' ? `All (${all.length})` : `${LIFECYCLE[f].name} (${all.filter((m) => m.lifecycle === f).length})`}</button>))}
      </div>
      {q.isLoading ? <ListSkeleton rows={6} /> : q.isError ? <ErrorState what="the product registry" onRetry={() => q.refetch()} /> : list.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground" data-testid="text-registry-empty">No products match this filter.</p>
      ) : (
        <div className="grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-2">
          {list.map((m, i) => (
            <div key={m.key} data-testid={`card-module-${m.key}`} className="bg-card p-5">
              <div className="flex items-baseline justify-between"><span className="font-mono text-xs text-copper">{String(i + 1).padStart(2, '0')}</span><span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label(m.category)}</span></div>
              <h3 className="font-display mt-3 text-2xl">{m.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
              <p className="mt-4 font-mono text-[11px] text-muted-foreground" data-testid={`text-lifecycle-${m.key}`}>{m.key} · {LIFECYCLE[m.lifecycle]?.name ?? m.lifecycle} · {m.sandboxAvailable ? 'sandbox available' : 'not in sandbox'}{m.requiresAssetNetworks ? ' · needs assets' : ''}</p>
              <p className="mt-1 text-xs text-muted-foreground">{LIFECYCLE[m.lifecycle]?.note}</p>
              <button className="mt-3 text-xs text-copper underline" data-testid={`button-toggle-${m.key}`} onClick={() => setExp(exp === m.key ? null : m.key)}>{exp === m.key ? 'Hide manifest' : `Manifest: ${m.features.length} features, ${m.limits.length} limits`}</button>
              {exp === m.key && (
                <div className="mt-3 space-y-3 text-sm" data-testid={`detail-module-${m.key}`}>
                  <div><p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Features</p>
                    {m.features.length === 0 ? <p className="text-xs text-muted-foreground">None declared.</p> : m.features.map((f) => <p key={f.key} className="text-xs"><span className="font-mono">{f.key}</span> · {f.label}{f.dependsOn.length > 0 && <span className="text-muted-foreground"> · needs {f.dependsOn.join(', ')}</span>}</p>)}</div>
                  <div><p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Limits</p>
                    {m.limits.length === 0 ? <p className="text-xs text-muted-foreground">None declared.</p> : m.limits.map((l) => <p key={l.key} className="text-xs"><span className="font-mono">{l.key}</span> · {l.label} · {l.valueType}</p>)}</div>
                </div>)}
            </div>
          ))}
        </div>)}
      <div className="mt-6"><SandboxNote /></div>
    </>
  );
}
