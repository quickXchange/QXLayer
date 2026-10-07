import { useState } from 'react';
import type { Tenant, ExchangeNetworkSettings } from '@workspace/api-client-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ExSection as Section } from './manage';
import { useToast } from '@/hooks/use-toast';
import { Dec, DraftFooter, Field, LogoText, Pick, isDec } from './ui';
import { useIdentityResolver } from './logo-identity';
import { VisualImg } from './visual-catalog';
import { BulkBar, BulkBtn, DataTable, FilterBar, NoMatch, EditDrawer, Logo, StatusPill, providerOptions, useConfirm, useSelection, useStaged } from './bulk';
import { DiffList, DraftConflict, NameList, PageBar, REMOVE_NOTE, usePaged, useSetAssignments } from './manage';
import type { ExchangeDraft } from './use-exchange-draft';
export { AssetsPanel } from './assets-panel';

export function NetworksPanel({ tenant, d, locked }: { tenant: Tenant; d: ExchangeDraft; locked: boolean }) {
  const { toast } = useToast(); const staged = useStaged(); const [ask, confirmNode] = useConfirm(locked);
  const s = d.draft!; const idr = useIdentityResolver(s, d.catalog); const setAssign = useSetAssignments(tenant.id);
  const [edit, setEdit] = useState<ExchangeNetworkSettings | null>(null);
  const [bulk, setBulk] = useState<'fields' | 'provider' | null>(null);
  const cat = (id: string) => d.catalog.find((x) => x.assetNetworkId === id);
  const provName = (id?: string) => (id ? d.providerCatalog.find((p) => p.id === id)?.name ?? id : 'Manual / sandbox');
  const [ty, setTy] = useState('all'); const [q, setQ] = useState(''); const [av, setAv] = useState('all'); const [en, setEn] = useState('all'); const [pv, setPv] = useState('all');
  const filtered = s.networks.filter((n) => { const c = cat(n.assetNetworkId); return (ty === 'all' || (ty === 'test') === !!c?.testnet) && (av === 'all' || (av === 'on') === n.available) && (en === 'all' || (en === 'on') === n.enabled) && (pv === 'all' || (n.providerId || 'manual') === pv) && `${c?.networkName ?? ''} ${c?.networkId ?? ''} ${c?.symbol ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()); });
  const resetF = () => { setTy('all'); setQ(''); setAv('all'); setEn('all'); setPv('all'); };
  const pg = usePaged(filtered, `${q}|${av}|${en}|${pv}|${ty}`); const rows = pg.pageRows;
  const sel = useSelection(rows.map((n) => n.assetNetworkId));
  const bindName = (id: string) => `${cat(id)?.symbol ?? ''} on ${cat(id)?.networkName ?? id}`;
  const setMany = (ids: string[], p: Partial<ExchangeNetworkSettings>) => d.patch({ networks: s.networks.map((n) => (ids.includes(n.assetNetworkId) ? { ...n, ...p } : n)) });
  const bulkSet = (label: string, p: Partial<ExchangeNetworkSettings>, only?: string[]) => { const ids = only ?? sel.ids; ask({ title: `${label} on ${ids.length} network binding${ids.length === 1 ? '' : 's'}?`, body: <><p>Proposed: {label} (staged only; nothing is saved until you press Save).</p><ul className="font-mono text-xs">{ids.map((i) => <li key={i}>{bindName(i)} ({i})</li>)}</ul></>, label: 'Stage change', run: () => { setMany(ids, p); staged(ids.length, 'network'); sel.clear(); } }); };
  const provOpts = (cur?: string): [string, React.ReactNode][] => providerOptions(d.providerCatalog, 'swap', cur).map(([v, l]) => [v, v === 'manual' ? l : <span key={v} className="inline-flex items-center gap-2"><VisualImg label={l} kind="provider" size={18} />{l}</span>]);
  const lbl = (id: string) => cat(id)?.symbol ?? id;
  const removeNets = (ids: string[]) => {
    const refs = s.routes.filter((r) => ids.includes(r.source) || ids.includes(r.destination)).map((r) => `${r.action}: ${lbl(r.source)} to ${lbl(r.destination)}`);
    ask({ title: `Remove ${ids.length} network assignment${ids.length === 1 ? '' : 's'} from this tenant?`, destructive: true, label: 'Remove and save', readOnly: d.dirty || refs.length > 0,
      body: <><DraftConflict dirty={d.dirty} /><p>{REMOVE_NOTE}</p>{refs.length > 0 && <div className="rounded-md border border-destructive/40 p-2 text-destructive" data-testid="text-route-blockers"><p>Blocked: routes still use these networks. Delete or retarget them in Routes, save, then remove.</p><NameList names={refs} /></div>}<NameList names={ids.map(bindName)} /><p>The global catalog is not changed. After removal a final Save cleans stale settings from the draft.</p></>,
      run: async () => { await setAssign(tenant.assetNetworkIds.filter((n) => !ids.includes(n))); sel.clear(); return <p data-testid="text-remove-result">Removed {ids.length} assignment{ids.length === 1 ? '' : 's'}.</p>; } });
  };
  return (
    <Section n="X2" title="Networks" note="Each row is an asset-network binding. Type is mainnet or testnet catalog data; every execution is sandbox. Enabled and available are staged settings; removal is a persisted tenant assignment change." footer={<DraftFooter d={d} locked={locked} />}>
      {s.networks.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-networks">No asset networks are selected. Use the Assets section to select them.</p>}{(
        <>
          <FilterBar noun="networks" search={q} onSearch={setQ} placeholder="Search network, code or symbol" shown={filtered.length} total={s.networks.length} onReset={resetF} active={ty !== 'all' || q !== '' || av !== 'all' || en !== 'all' || pv !== 'all'}>
            <div className="w-36"><Pick testid="select-network-type" value={ty} onChange={setTy} options={[['all', 'Any type'], ['main', 'Mainnet'], ['test', 'Testnet']]} /></div>
            <div className="w-36"><Pick testid="select-network-enabled" value={en} onChange={setEn} options={[['all', 'Any state'], ['on', 'Enabled'], ['off', 'Disabled']]} /></div>
            <div className="w-40"><Pick testid="select-network-availability" value={av} onChange={setAv} options={[['all', 'Any availability'], ['on', 'Available'], ['off', 'Unavailable']]} /></div>
            <div className="w-48"><Pick testid="select-network-provider-filter" value={pv} onChange={setPv} options={[['all', 'Any provider'], ['manual', 'Manual / sandbox'], ...d.providerCatalog.filter((p) => s.networks.some((n) => n.providerId === p.id)).map((p) => [p.id, <span key={p.id} className="inline-flex items-center gap-2"><VisualImg label={p.name} kind="provider" size={18} />{p.name}</span>] as [string, React.ReactNode])]} /></div>
          </FilterBar>
          <BulkBar sel={sel} noun="networks" locked={locked} testid="networks">
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-enable-networks" onClick={() => bulkSet('Enable', { enabled: true })}>Enable</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-disable-networks" onClick={() => bulkSet('Disable', { enabled: false })}>Disable</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-available-networks" onClick={() => bulkSet('Mark available', { available: true })}>Mark available</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-unavailable-networks" onClick={() => bulkSet('Mark unavailable', { available: false })}>Mark unavailable</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-edit-networks" onClick={() => setBulk('fields')}>Edit fee / limits</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-provider-networks" onClick={() => setBulk('provider')}>Assign provider</BulkBtn>
            <BulkBtn destructive sel={sel} locked={locked} testid="button-bulk-delete-networks" onClick={() => removeNets(sel.ids)}>Remove from tenant</BulkBtn>
          </BulkBar>
          {filtered.length === 0 ? (s.networks.length > 0 ? <NoMatch noun="networks" onReset={resetF} /> : null) : <><DataTable testid="network" onRowClick={(r) => setEdit(r)} rows={rows} getId={(n) => n.assetNetworkId} sel={sel} locked={locked} cols={[
            { h: 'Logo', cell: (n) => <Logo url={idr.network(n.assetNetworkId).logoUrl} label={cat(n.assetNetworkId)?.networkName ?? '?'} kind="network" /> },
            { h: 'Name', cell: (n) => <span className="font-medium">{cat(n.assetNetworkId)?.symbol} on {cat(n.assetNetworkId)?.networkName ?? n.assetNetworkId}</span> },
            { h: 'Type', cell: (n) => <span className="font-mono text-[10px] uppercase text-copper" data-testid={`text-nettype-${n.assetNetworkId}`}>{cat(n.assetNetworkId)?.testnet ? 'Testnet' : 'Mainnet'}</span> },
            { h: 'Environment', cell: () => <span className="font-mono text-[10px] uppercase" title="Network type is catalog data. Orders on every network execute in the sandbox; no live execution is supported.">Sandbox execution</span> },
            { h: 'Status', cell: (n) => <span className="flex gap-1"><StatusPill on={n.enabled} /><StatusPill on={n.available} onLabel="Available" offLabel="Unavailable" /></span> },
            { h: 'Provider', cell: (n) => <span className="flex items-center gap-2 text-xs">{n.providerId && <VisualImg label={provName(n.providerId)} kind="provider" size={18} />}{provName(n.providerId)}</span> },
            { h: 'Actions', cell: (n) => <span className="flex items-center gap-2"><Switch aria-label="Enabled" data-testid={`switch-network-enabled-${n.assetNetworkId}`} disabled={locked} checked={n.enabled} onCheckedChange={(v) => bulkSet(v ? 'Enable' : 'Disable', { enabled: v }, [n.assetNetworkId])} /><Button size="sm" variant="outline" data-testid={`button-edit-network-${n.assetNetworkId}`} onClick={() => setEdit(n)}>Edit</Button><Button size="sm" variant="outline" className="text-destructive" disabled={locked} data-testid={`button-delete-network-${n.assetNetworkId}`} onClick={() => removeNets([n.assetNetworkId])}>Remove</Button></span> },
          ]} /><PageBar p={pg} noun="networks" testid="networks" /></>}
        </>)}
      <EditDrawer item={edit} itemKey={edit?.assetNetworkId ?? ''} title={edit ? `${cat(edit.assetNetworkId)?.symbol ?? ''} on ${cat(edit.assetNetworkId)?.networkName ?? edit.assetNetworkId}` : 'Network'} note="Stages into the exchange draft. Press Save exchange settings to persist." locked={locked} onClose={() => setEdit(null)}
        applyLabel="Review changes" onApply={(v) => { const orig = s.networks.find((n) => n.assetNetworkId === v.assetNetworkId); setEdit(null); ask({ title: `Apply changes to ${bindName(v.assetNetworkId)}?`, label: 'Stage changes', body: <><p>Staged only; not saved until you press Save.</p>{orig && <DiffList before={orig} after={v} />}</>, run: () => { setMany([v.assetNetworkId], v); staged(1, 'network'); } }); }}>
        {(f, set) => (<>
          <LogoText id={idr.network(f.assetNetworkId)} text={`${cat(f.assetNetworkId)?.symbol ?? ''} on ${cat(f.assetNetworkId)?.networkName ?? f.assetNetworkId}`} size={32} />
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">Enabled<Switch checked={f.enabled} onCheckedChange={(v) => set({ enabled: v })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">Available<Switch checked={f.available} onCheckedChange={(v) => set({ available: v })} /></div>
          <div className="grid grid-cols-3 gap-3"><Field label="Minimum"><Dec value={f.minimum} onChange={(v) => set({ minimum: v })} /></Field><Field label="Maximum"><Dec value={f.maximum} onChange={(v) => set({ maximum: v })} /></Field><Field label="Network fee"><Dec value={f.fee} onChange={(v) => set({ fee: v })} /></Field></div>
          <Field label="Information"><Textarea className="min-h-16" value={f.information} onChange={(e) => set({ information: e.target.value })} /></Field>
          <Field label="Swap provider assignment (future)"><Pick testid="select-network-provider" value={f.providerId || 'manual'} onChange={(v) => set({ providerId: v === 'manual' ? undefined : v })} options={provOpts(f.providerId)} /></Field>
          <p className="text-xs text-muted-foreground">Assignment is stored for future use. All quotes remain manual and sandbox; no provider is called.</p>
        </>)}
      </EditDrawer>
      <EditDrawer item={bulk === 'fields' ? { minimum: '', maximum: '', fee: '' } : null} itemKey="bulk-net" title={`Bulk edit ${sel.count} networks`} note="Blank fields stay unchanged." locked={locked} onClose={() => setBulk(null)} applyLabel="Review"
        onApply={(v) => {
          const p: Partial<ExchangeNetworkSettings> = {};
          for (const k of ['minimum', 'maximum', 'fee'] as const) { if (v[k] !== '') { if (!isDec(v[k])) { toast({ title: `${k} must be a decimal string`, variant: 'destructive' }); return; } p[k] = v[k]; } }
          if (Object.keys(p).length === 0) { toast({ title: 'Nothing to change', variant: 'destructive' }); return; }
          setBulk(null); const ids = sel.ids;
          ask({ title: `Edit ${ids.length} networks?`, body: <><ul className="font-mono text-xs">{Object.entries(p).map(([k, x]) => <li key={k}>{k}: {String(x)}</li>)}</ul><p>Applies to:</p><ul className="font-mono text-xs">{ids.map((i) => <li key={i}>{bindName(i)}</li>)}</ul></>, label: 'Stage edit', run: () => { setMany(ids, p); staged(ids.length, 'network'); sel.clear(); } });
        }}>
        {(f, set) => (<div className="grid grid-cols-3 gap-3"><Field label="Minimum"><Dec value={f.minimum} onChange={(v) => set({ minimum: v })} /></Field><Field label="Maximum"><Dec value={f.maximum} onChange={(v) => set({ maximum: v })} /></Field><Field label="Fee"><Dec value={f.fee} onChange={(v) => set({ fee: v })} /></Field></div>)}
      </EditDrawer>
      <EditDrawer item={bulk === 'provider' ? { providerId: 'manual' } : null} itemKey="bulk-prov" title={`Assign provider to ${sel.count} networks`} note="Future-only assignment. Quotes stay manual and sandbox." locked={locked} onClose={() => setBulk(null)} applyLabel="Review"
        onApply={(v) => { setBulk(null); const ids = sel.ids; ask({ title: `Assign ${v.providerId === 'manual' ? 'Manual / sandbox' : provName(v.providerId)} to ${ids.length} networks?`, body: <><p>Stored for future use only. No provider is called and no integration exists.</p><ul className="font-mono text-xs">{ids.map((i) => <li key={i}>{bindName(i)}: {provName(s.networks.find((n) => n.assetNetworkId === i)?.providerId)} to {v.providerId === 'manual' ? 'Manual / sandbox' : provName(v.providerId)}</li>)}</ul></>, label: 'Stage assignment', run: () => { setMany(ids, { providerId: v.providerId === 'manual' ? undefined : v.providerId }); staged(ids.length, 'network'); sel.clear(); } }); }}>
        {(f, set) => <Field label="Provider"><Pick testid="select-bulk-provider" value={f.providerId} onChange={(v) => set({ providerId: v })} options={provOpts()} /></Field>}
      </EditDrawer>
      {confirmNode}
    </Section>
  );
}
