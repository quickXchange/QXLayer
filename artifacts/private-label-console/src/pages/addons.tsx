import { useState } from 'react';
import { useListAddons, useCreateAddon, useUpdateAddon, useListEntitlementDefinitions, type Addon } from '@workspace/api-client-react';
import { PageHeader, ErrorState, EmptyState, ListSkeleton } from '@/components/app/bits';
import { EntitlementEditor, entriesFrom, entError, toMap, type EntMap } from '@/components/app/entitlement-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCan } from '@/lib/principal';
import { useInvalidateCatalog } from '@/lib/invalidate';
import { useToast } from '@/hooks/use-toast';

function Editor({ addon, onDone }: { addon: Addon | null; onDone: () => void }) {
  const defs = useListEntitlementDefinitions();
  const create = useCreateAddon();
  const update = useUpdateAddon();
  const inv = useInvalidateCatalog();
  const { toast } = useToast();
  const [name, setName] = useState(addon?.name ?? '');
  const [description, setDescription] = useState(addon?.description ?? '');
  const x: Partial<Addon> = addon ?? {};
  const [mp, setMp] = useState(x.monthlyPrice ?? '0'); const [yp, setYp] = useState(x.yearlyPrice ?? '0'); const [sf, setSf] = useState(x.setupFee ?? '0'); const [cur, setCur] = useState(x.currency ?? 'USD');
  const [enabled, setEnabled] = useState(addon?.enabled ?? true);
  const [ent, setEnt] = useState<EntMap>(addon ? toMap(addon.entitlements) : {});
  const d = defs.data ?? [];
  const money = /^[0-9]+(\.[0-9]{1,2})?$/;
  const err = name.trim().length < 2 ? 'Name needs 2+ characters' : ![mp, yp, sf].every((v) => money.test(v)) ? 'Prices use the format 0.00' : !/^[A-Z]{3}$/.test(cur) ? 'Currency is a 3-letter code' : entError(d, ent);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: name.trim(), description, enabled, monthlyPrice: mp, yearlyPrice: yp, setupFee: sf, currency: cur, entitlements: entriesFrom(d, ent, false) };
    const opts = { onSuccess: () => { inv(); toast({ title: 'Add-on saved' }); onDone(); }, onError: (er: unknown) => toast({ title: 'Save failed', description: (er as Error).message, variant: 'destructive' }) };
    if (addon) update.mutate({ addonId: addon.id, data }, opts); else create.mutate({ data }, opts);
  };
  return (
    <form onSubmit={submit} className="space-y-4 rounded-md border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-[2fr_auto]">
        <div className="space-y-1.5"><Label>Name</Label><Input data-testid="input-addon-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="flex items-end gap-2 pb-2"><Switch data-testid="switch-addon-enabled" checked={enabled} onCheckedChange={setEnabled} /><span className="text-sm">Enabled</span></div>
        <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-4">
          <div className="space-y-1.5"><Label>Monthly price</Label><Input data-testid="input-addon-monthly" value={mp} onChange={(e) => setMp(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Yearly price</Label><Input data-testid="input-addon-yearly" value={yp} onChange={(e) => setYp(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Setup fee</Label><Input data-testid="input-addon-setup" value={sf} onChange={(e) => setSf(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Currency</Label><Input data-testid="input-addon-currency" maxLength={3} value={cur} onChange={(e) => setCur(e.target.value.toUpperCase())} /></div>
        </div>
        <div className="space-y-1.5 md:col-span-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      {defs.isLoading ? <ListSkeleton rows={3} /> : defs.isError ? <ErrorState what="definitions" onRetry={() => defs.refetch()} /> :
        <EntitlementEditor defs={d} value={ent} onChange={setEnt} limitHint="blank means no increment" />}
      <div className="flex items-center justify-end gap-3">
        {err && <span className="mr-auto text-sm text-destructive">{err}</span>}
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button data-testid="button-save-addon" disabled={!!err || create.isPending || update.isPending}>{create.isPending || update.isPending ? 'Saving' : 'Save add-on'}</Button>
      </div>
    </form>
  );
}

export default function Addons() {
  const can = useCan();
  const q = useListAddons();
  const [editing, setEditing] = useState<Addon | 'new' | null>(null);
  if (!can.manageCatalog) return <><PageHeader eyebrow="Catalog" title="Add-ons" /><p className="text-sm text-muted-foreground" data-testid="text-forbidden">Only a super admin can manage add-ons.</p></>;
  return (
    <>
      <PageHeader eyebrow="Catalog" title="Add-ons">{!editing && <Button data-testid="button-new-addon" onClick={() => setEditing('new')}>New add-on</Button>}</PageHeader>
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">Add-on features combine with the plan (any grant wins). Numeric limits are increments on top of the plan.</p>
      {editing ? <Editor key={editing === 'new' ? 'new' : editing.id} addon={editing === 'new' ? null : editing} onDone={() => setEditing(null)} /> :
        q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState what="add-ons" onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? (
          <EmptyState title="No add-ons" body="Add-ons extend a tenant's plan with extra features or higher limits." action={<Button onClick={() => setEditing('new')}>New add-on</Button>} />
        ) : (
          <div className="divide-y rounded-md border bg-card">
            {q.data!.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-4 p-4" data-testid={`row-addon-${a.id}`}>
                <div className="min-w-0 flex-1"><p className="font-display text-2xl">{a.name}</p><p className="truncate text-sm text-muted-foreground">{a.description || 'No description'}</p></div>
                <span className="font-mono text-xs text-copper">{(() => { const p = a; return p.monthlyPrice == null || p.yearlyPrice == null || p.setupFee == null ? 'Requires review (pricing not configured)' : `${p.currency ?? 'USD'} ${p.monthlyPrice}/mo · ${p.yearlyPrice}/yr · ${p.setupFee} setup`; })()}</span>
                <span className="font-mono text-xs text-muted-foreground">{a.entitlements.length} entitlements</span>
                <Badge className={`rounded-sm font-mono text-[10px] uppercase shadow-none ${a.enabled ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{a.enabled ? 'enabled' : 'disabled'}</Badge>
                <Button size="sm" variant="outline" onClick={() => setEditing(a)}>Edit</Button>
              </div>))}
          </div>)}
    </>
  );
}
