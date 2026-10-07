import { useMemo, useState } from 'react';
import { useListAddons, useCreateAddon, useUpdateAddon, useListEntitlementDefinitions, type Addon } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton } from '@/components/app/bits';
import { GroupedEntitlementEditor } from '@/components/super-admin/grouped-entitlements';
import { Chips, DataList, Pager, Pill, SearchBox, usePaged, type Col } from '@/components/super-admin/kit';
import { usePlatform, usage } from '@/components/super-admin/platform';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ReviewDialog } from '@/components/super-admin/kit';
import { entriesFrom, entError, toMap, type EntMap } from '@/components/app/entitlement-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCan } from '@/lib/principal';
import { useInvalidateCatalog } from '@/lib/invalidate';
import { useToast } from '@/hooks/use-toast';

export function AddonEditor({ addon, onDone }: { addon: Addon | null; onDone: () => void }) {
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
  const [rev, setRev] = useState(false);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!err) setRev(true); };
  const doSave = () => {
    const data = { name: name.trim(), description, enabled, monthlyPrice: mp, yearlyPrice: yp, setupFee: sf, currency: cur, entitlements: entriesFrom(d, ent, false) };
    const opts = { onSuccess: () => { inv(); toast({ title: 'Add-on saved' }); setRev(false); onDone(); }, onError: (er: unknown) => { setRev(false); toast({ title: 'Save failed', description: (er as Error).message, variant: 'destructive' }); } };
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
        <GroupedEntitlementEditor defs={d} value={ent} onChange={setEnt} limitHint="blank means no increment" />}
      <div className="flex items-center justify-end gap-3">
        {err && <span className="mr-auto text-sm text-destructive">{err}</span>}
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button data-testid="button-save-addon" disabled={!!err || create.isPending || update.isPending}>{create.isPending || update.isPending ? 'Saving' : 'Save add-on'}</Button>
      </div>
      <ReviewDialog open={rev} onClose={() => setRev(false)} title={addon ? 'save add-on' : 'create add-on'} pending={create.isPending || update.isPending} onApply={doSave}
        rows={[['Name', name.trim()], ['Enabled', enabled ? 'Yes' : 'No'], ['Prices', `${mp} / mo, ${yp} / yr, ${sf} setup ${cur}`], ['Entitlements set', String(entriesFrom(d, ent, false).length)]]} />
    </form>
  );
}

function addonType(a: Addon, limits: Set<string>) {
  const f = a.entitlements.filter((e) => !limits.has(e.key) && e.value === true).length; const l = a.entitlements.filter((e) => limits.has(e.key)).length;
  return f && l ? 'Features and limit increments' : f ? 'Feature grant' : l ? 'Limit increment' : 'No entitlements';
}

export default function Addons() {
  const can = useCan(); const q = useListAddons(); const defs = useListEntitlementDefinitions(); const { pm } = usePlatform();
  const [editing, setEditing] = useState<Addon | 'new' | null>(null);
  const [s, setS] = useState(''); const [f, setF] = useState('all');
  const inv = useInvalidateCatalog(); const { toast } = useToast();
  const toggle = useUpdateAddon(); const [pend, setPend] = useState<Addon | null>(null); const [err, setErr] = useState<string | null>(null);
  const all = q.data ?? [];
  const limits = useMemo(() => new Set((defs.data ?? []).filter((d) => d.kind === 'limit').map((d) => d.key)), [defs.data]);
  const list = useMemo(() => { const k = s.trim().toLowerCase(); return all.filter((a) => (f === 'all' || (f === 'enabled') === a.enabled) && (!k || [a.name, a.description].some((v) => v.toLowerCase().includes(k)))); }, [all, s, f]);
  const pg = usePaged(list, `${s}|${f}`);
  if (!can.manageCatalog) return <><PageHeader eyebrow="Commercial" title="Add-ons" /><p className="text-sm text-muted-foreground" data-testid="text-forbidden">Only a super admin can manage add-ons.</p></>;
  const applyToggle = () => {
    if (!pend) return; setErr(null);
    const { id, pricingConfigured: _pc, ...rest } = pend; void _pc;
    toggle.mutate({ addonId: id, data: { ...rest, enabled: !pend.enabled } }, { onSuccess: () => { inv(); setPend(null); toast({ title: pend.enabled ? 'Add-on disabled' : 'Add-on enabled' }); }, onError: (e) => setErr((e as Error).message) });
  };
  const cols: Col<Addon>[] = [
    { key: 'n', header: 'Add-on', primary: true, cell: (a) => <span><span className="block font-display text-xl">{a.name}</span><span className="block max-w-xs truncate text-xs text-muted-foreground">{a.description || 'No description'}</span></span> },
    { key: 's', header: 'Status', cell: (a) => <Pill tone={a.enabled ? 'ok' : undefined}>{a.enabled ? 'enabled' : 'disabled'}</Pill> },
    { key: 't', header: 'Type', cell: (a) => addonType(a, limits) },
    { key: 'p', header: 'Prices', cell: (a) => <span className="font-mono text-xs">{a.monthlyPrice ?? '-'} / mo<br />{a.yearlyPrice ?? '-'} / yr<br />{a.setupFee ?? '-'} setup {a.currency}</span> },
    { key: 'e', header: 'Entitlements', cell: (a) => a.entitlements.length },
    { key: 'u', header: 'Used by', cell: (a) => { if (!pm) return 'Unavailable'; const u = usage(pm.projects, (x) => x.addonIds.includes(a.id)); return `${u.customers} customers, ${u.tenants} projects`; } },
    { key: 'a', header: 'Actions', cell: (a) => <span className="flex gap-1" onClick={(e) => e.stopPropagation()}><Button size="sm" variant="outline" onClick={() => setEditing(a)} data-testid={`button-edit-addon-${a.id}`}>Edit</Button><Button size="sm" variant="outline" onClick={() => { setErr(null); setPend(a); }} data-testid={`button-toggle-addon-${a.id}`}>{a.enabled ? 'Disable' : 'Enable'}</Button></span> },
  ];
  return (
    <>
      <PageHeader eyebrow="Commercial" title="Add-ons"><Button data-testid="button-new-addon" onClick={() => setEditing('new')}>New add-on</Button></PageHeader>
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">Add-on features combine with the plan (any grant wins). Numeric limits are increments on top of the plan. Type is derived from the entitlements an add-on carries.</p>
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState what="add-ons" onRetry={() => q.refetch()} /> : (
        <div className="space-y-4">
          <SearchBox id="addons" value={s} onChange={setS} placeholder="Search add-ons" />
          <Chips id="addons" value={f} onChange={setF} options={[['all', `All (${all.length})`], ['enabled', 'Enabled'], ['disabled', 'Disabled']]} />
          <DataList id="addon" rows={pg.rows} cols={cols} rowKey={(a) => a.id} onOpen={(a: Addon) => setEditing(a)} emptyTitle="No add-ons" emptyBody="Add-ons extend a tenant's plan with extra features or higher limits." />
          {list.length > 0 && <Pager id="addons" p={pg} />}
        </div>)}
      <Sheet open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl" data-testid="drawer-addon">
          <SheetHeader><SheetTitle className="font-display text-2xl">{editing === 'new' ? 'New add-on' : 'Edit add-on'}</SheetTitle><SheetDescription>Grouped entitlements. Saving asks for review and confirmation.</SheetDescription></SheetHeader>
          <div className="mt-4">{editing && <AddonEditor key={editing === 'new' ? 'new' : editing.id} addon={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}</div>
        </SheetContent>
      </Sheet>
      <ReviewDialog open={!!pend} onClose={() => setPend(null)} title={pend?.enabled ? 'disable add-on' : 'enable add-on'} pending={toggle.isPending} error={err} onApply={applyToggle}
        rows={pend ? [['Add-on', pend.name], ['Change', pend.enabled ? 'enabled to disabled' : 'disabled to enabled'], ['Existing subscribers', 'Keep current grants']] : []} />
    </>
  );
}
