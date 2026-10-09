import { useMemo, useState } from 'react';
import { useListAddons, useCreateAddon, useUpdateAddon, useDeleteAddon, useListEntitlementDefinitions, type Addon } from '@workspace/api-client-react';
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
import { discounted } from '@/lib/wl';
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
  const [mp, setMp] = useState(x.monthlyPrice ?? ''); const [yp, setYp] = useState(x.yearlyPrice ?? ''); const [sf, setSf] = useState(x.setupFee ?? ''); const [dp, setDp] = useState(x.discountPercent ?? '0');
  const [cfg, setCfg] = useState(addon ? (addon.pricingConfigured ?? (addon.monthlyPrice != null && addon.yearlyPrice != null && addon.setupFee != null)) : false);
  const del = useDeleteAddon(); const [delOpen, setDelOpen] = useState(false); const [delErr, setDelErr] = useState<string | null>(null); const [cur, setCur] = useState(x.currency ?? 'USD');
  const [enabled, setEnabled] = useState(addon?.enabled ?? true);
  const [ent, setEnt] = useState<EntMap>(addon ? toMap(addon.entitlements) : {});
  const d = defs.data ?? [];
  const money = /^[0-9]+(\.[0-9]{1,2})?$/;
  const err = name.trim().length < 2 ? 'Name needs 2+ characters' : cfg && ![mp, yp, sf].every((v) => money.test(v)) ? 'Configured pricing needs monthly, yearly and setup in the format 0.00' : !/^\d{1,3}(\.\d{1,2})?$/.test(dp) || Number(dp) > 100 ? 'Discount is a percentage from 0 to 100' : !/^[A-Z]{3}$/.test(cur) ? 'Currency is a 3-letter code' : entError(d, ent);
  const [rev, setRev] = useState(false);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!err) setRev(true); };
  const doSave = () => {
    const data = { name: name.trim(), description, enabled, monthlyPrice: cfg ? mp : null, yearlyPrice: cfg ? yp : null, setupFee: cfg ? sf : null, discountPercent: dp, currency: cur, entitlements: entriesFrom(d, ent, false) };
    const opts = { onSuccess: () => { inv(); toast({ title: 'Add-on saved' }); setRev(false); onDone(); }, onError: (er: unknown) => { setRev(false); toast({ title: 'Save failed', description: (er as Error).message, variant: 'destructive' }); } };
    if (addon) update.mutate({ addonId: addon.id, data }, opts); else create.mutate({ data }, opts);
  };
  return (
    <form onSubmit={submit} className="space-y-4 rounded-md border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-[2fr_auto]">
        <div className="space-y-1.5"><Label>Name</Label><Input data-testid="input-addon-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="flex items-end gap-2 pb-2"><Switch data-testid="switch-addon-enabled" checked={enabled} onCheckedChange={setEnabled} /><span className="text-sm">Enabled</span></div>
        <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-4">
          <div className="flex flex-wrap items-center gap-3 col-span-2 md:col-span-4"><Switch id="addon-cfg" data-testid="switch-addon-configured" checked={cfg} onCheckedChange={setCfg} /><Label htmlFor="addon-cfg">Pricing configured</Label><span className="text-xs text-muted-foreground">{cfg ? 'All three prices required.' : 'Off: saved as unconfigured (Requires review).'}</span></div>
          <div className="space-y-1.5"><Label htmlFor="ad-m">Monthly price</Label><Input id="ad-m" data-testid="input-addon-monthly" disabled={!cfg} placeholder={cfg ? '0.00' : 'Not configured'} value={mp} onChange={(e) => setMp(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="ad-y">Yearly price</Label><Input id="ad-y" data-testid="input-addon-yearly" disabled={!cfg} placeholder={cfg ? '0.00' : 'Not configured'} value={yp} onChange={(e) => setYp(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="ad-s">Setup fee</Label><Input id="ad-s" data-testid="input-addon-setup" disabled={!cfg} placeholder={cfg ? '0.00' : 'Not configured'} value={sf} onChange={(e) => setSf(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="ad-d">Discount % (recurring)</Label><Input id="ad-d" data-testid="input-addon-discount" inputMode="decimal" value={dp} onChange={(e) => setDp(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Currency</Label><Input data-testid="input-addon-currency" maxLength={3} value={cur} onChange={(e) => setCur(e.target.value.toUpperCase())} /></div>
        </div>
        <div className="space-y-1.5 md:col-span-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      {defs.isLoading ? <ListSkeleton rows={3} /> : defs.isError ? <ErrorState what="definitions" onRetry={() => defs.refetch()} /> :
        <GroupedEntitlementEditor defs={d} value={ent} onChange={setEnt} limitHint="blank means no increment" />}
      <div className="flex items-center justify-end gap-3">
        {err && <span role="alert" className="mr-auto text-sm text-destructive">{err}</span>}
        {addon && <Button type="button" variant="outline" className="text-destructive" data-testid="button-delete-addon" onClick={() => { setDelErr(null); setDelOpen(true); }}>Delete</Button>}
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button data-testid="button-save-addon" disabled={!!err || create.isPending || update.isPending}>{create.isPending || update.isPending ? 'Saving' : 'Save add-on'}</Button>
      </div>
      <ReviewDialog open={delOpen} onClose={() => setDelOpen(false)} title="delete add-on" destructive applyLabel="Delete add-on" pending={del.isPending} error={delErr}
        onApply={() => addon && del.mutate({ addonId: addon.id }, { onSuccess: () => { inv(); setDelOpen(false); toast({ title: 'Add-on deleted' }); onDone(); }, onError: (e) => setDelErr(`${(e as Error).message}. An add-on assigned to a project or referenced by an order cannot be deleted; disable it instead.`) })}
        rows={[['Add-on', name.trim() || addon?.name || ''], ['Rule', 'Refused if assigned or referenced by any order'], ['Alternative', 'Disable to stop offering it']]} />
      <ReviewDialog open={rev} onClose={() => setRev(false)} title={addon ? 'save add-on' : 'create add-on'} pending={create.isPending || update.isPending} onApply={doSave}
        rows={[['Name', name.trim()], ['Enabled', enabled ? 'Yes' : 'No'], ['Prices', cfg ? `${mp} / mo, ${yp} / yr, ${sf} setup ${cur}${money.test(mp) ? ` (monthly after discount ${discounted(mp, dp)})` : ''}` : 'Unconfigured (Requires review)'], ['Discount (recurring only)', `${dp}%`], ['Entitlements set', String(entriesFrom(d, ent, false).length)]]} />
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
    { key: 'p', header: 'Prices', cell: (a) => <span className="font-mono text-xs">{a.monthlyPrice == null && a.yearlyPrice == null && a.setupFee == null ? 'Unconfigured' : <>{a.monthlyPrice ?? '-'} / mo<br />{a.yearlyPrice ?? '-'} / yr<br />{a.setupFee ?? '-'} setup {a.currency}{a.discountPercent && Number(a.discountPercent) > 0 ? <><br />{a.discountPercent}% off recurring</> : null}</>}</span> },
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
