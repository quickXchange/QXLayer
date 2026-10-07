import { useState } from 'react';
import type { Tenant, ExchangeAssetSettings } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ExSection as Section } from './manage';
import { useToast } from '@/hooks/use-toast';
import { Dec, DraftFooter, Field, IntInput, LogoText, Pick, SimNote, isDec, isInt } from './ui';
import { useIdentityResolver } from './logo-identity';
import { BulkBar, BulkBtn, DataTable, FilterBar, NoMatch, EditDrawer, Logo, StatusPill, useConfirm, useSelection, useStaged } from './bulk';
import { LogoChooser, VisualCatalogBrowser } from './visual-catalog';
import { DiffList, DraftConflict, NameList, NetworkAssigner, PageBar, REMOVE_NOTE, usePaged, useSetAssignments } from './manage';
import type { ExchangeDraft } from './use-exchange-draft';

export function AssetsPanel({ tenant, d, locked }: { tenant: Tenant; d: ExchangeDraft; locked: boolean; catalogReadOnly?: boolean }) {
  const { toast } = useToast(); const staged = useStaged(); const [ask, confirmNode] = useConfirm(locked);
  const s = d.draft!; const idr = useIdentityResolver(s, d.catalog); const setAssign = useSetAssignments(tenant.id);
  const [q, setQ] = useState(''); const [st, setSt] = useState('all'); const [nw, setNw] = useState('all');
  const nameOf = (id: string) => d.catalog.find((c) => c.assetId === id)?.name ?? id;
  const bindings = (id: string) => d.catalog.filter((c) => c.assetId === id);
  const enabledNets = (id: string) => bindings(id).filter((c) => s.networks.find((n) => n.assetNetworkId === c.assetNetworkId)?.enabled);
  const netOptions = [...new Map(d.catalog.map((c) => [c.networkId, c.networkName])).entries()];
  const filtered = s.assets.filter((a) => (st === 'all' || (st === 'on') === a.enabled) && (nw === 'all' || bindings(a.assetId).some((c) => c.networkId === nw)) && `${a.symbol} ${nameOf(a.assetId)}`.toLowerCase().includes(q.trim().toLowerCase()));
  const resetF = () => { setQ(''); setSt('all'); setNw('all'); };
  const pg = usePaged(filtered, `${q}|${st}|${nw}`);
  const rows = pg.pageRows;
  const sel = useSelection(rows.map((a) => a.assetId));
  const [edit, setEdit] = useState<ExchangeAssetSettings | null>(null);
  const [bulk, setBulk] = useState(false);
  const [assign, setAssignOpen] = useState<null | { assetId?: string; title: string }>(null);
  const setMany = (ids: string[], p: Partial<ExchangeAssetSettings>) => d.patch({ assets: s.assets.map((a) => (ids.includes(a.assetId) ? { ...a, ...p } : a)) });
  const toggleBulk = (on: boolean, ids = sel.ids) => ask({ title: `${on ? 'Enable' : 'Disable'} ${ids.length} asset${ids.length === 1 ? '' : 's'}?`, body: <><p>Proposed: {on ? 'enable' : 'disable'} these assets (staged, not saved until you press Save).</p><NameList names={ids.map((i) => `${s.assets.find((a) => a.assetId === i)?.symbol} (${i}): ${s.assets.find((a) => a.assetId === i)?.enabled ? 'enabled' : 'disabled'} to ${on ? 'enabled' : 'disabled'}`)} /></>, label: `Stage ${on ? 'enable' : 'disable'}`, run: () => { setMany(ids, { enabled: on }); staged(ids.length, 'asset'); sel.clear(); } });
  const remove = (ids: string[]) => {
    const nets = ids.flatMap((i) => bindings(i).map((c) => c.assetNetworkId));
    ask({ title: `Remove ${ids.length} asset${ids.length === 1 ? '' : 's'} from this tenant?`, destructive: true, label: 'Remove and save', readOnly: d.dirty || routeRefs(nets).length > 0,
      body: <><DraftConflict dirty={d.dirty} /><p>{REMOVE_NOTE}</p>{routeRefs(nets).length > 0 && <div className="rounded-md border border-destructive/40 p-2 text-destructive" data-testid="text-route-blockers"><p>Blocked: routes still use these assets. Delete or retarget them in Routes, save, then remove.</p><NameList names={routeRefs(nets)} /></div>}<p>Assets ({ids.length}):</p><NameList names={ids.map((i) => `${s.assets.find((a) => a.assetId === i)?.symbol ?? i} ${nameOf(i)}`)} /><p>Network assignments removed ({nets.length}):</p><NameList names={nets.map((n) => { const c = d.catalog.find((x) => x.assetNetworkId === n); return `${c?.symbol} on ${c?.networkName}`; })} /></>,
      run: async () => { await setAssign(tenant.assetNetworkIds.filter((n) => !nets.includes(n))); sel.clear(); return <p data-testid="text-remove-result">Removed {ids.length} asset{ids.length === 1 ? '' : 's'} and {nets.length} assignment{nets.length === 1 ? '' : 's'}.</p>; } });
  };
  const lbl = (id: string) => (id.startsWith('fiat:') ? id.slice(5) : d.catalog.find((c) => c.assetNetworkId === id)?.symbol ?? id);
  const routeRefs = (ids: string[]) => s.routes.filter((r) => ids.includes(r.source) || ids.includes(r.destination)).map((r) => `${r.action}: ${lbl(r.source)} to ${lbl(r.destination)}`);
  const onNet = (assetNetworkId: string, enabled: boolean) => ask({ title: `${enabled ? 'Enable' : 'Disable'} ${d.catalog.find((c) => c.assetNetworkId === assetNetworkId)?.networkName ?? 'network'}?`, label: `Stage ${enabled ? 'enable' : 'disable'}`, body: <p>Operational setting only: the network stays assigned to this tenant. Staged into the draft, not saved until you press Save exchange settings.</p>, run: () => { stageNet(assetNetworkId, enabled); staged(1, 'network'); } });
  const stageNet = (assetNetworkId: string, enabled: boolean) => d.patch({ networks: s.networks.map((n) => (n.assetNetworkId === assetNetworkId ? { ...n, enabled } : n)) });
  const dirtyBlock = d.dirty;
  return (
    <div className="space-y-6">
      <Section n="X1" title="Crypto assets" note="Assets and networks this tenant offers. Only enabled assets with an enabled, available network can quote." footer={<DraftFooter d={d} locked={locked} />}>
        <SimNote />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" data-testid="button-assign-networks" disabled={locked} onClick={() => setAssignOpen({ title: 'Assign assets and networks' })}>Assign assets and networks</Button>
          <span className="text-xs text-muted-foreground">{tenant.assetNetworkIds.length} network assignments in this tenant</span>
        </div>
        {dirtyBlock && !locked && <DraftConflict dirty />}
        {s.assets.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-assets">No assets are assigned to this tenant. Use Assign assets and networks to pick from the catalog.</p>}{(
          <>
            <FilterBar noun="assets" search={q} onSearch={setQ} placeholder="Search name or symbol" shown={filtered.length} total={s.assets.length} onReset={resetF} active={q !== '' || st !== 'all' || nw !== 'all'}>
              <div className="w-36"><Pick testid="select-asset-status" value={st} onChange={setSt} options={[['all', 'Any status'], ['on', 'Enabled'], ['off', 'Disabled']]} /></div>
              <div className="w-44"><Pick testid="select-asset-network" bounded value={nw} onChange={setNw} options={[['all', 'Any network'], ...netOptions]} /></div>
            </FilterBar>
            <BulkBar sel={sel} noun="assets" locked={locked} testid="assets">
              <BulkBtn sel={sel} locked={locked} testid="button-bulk-enable-assets" onClick={() => toggleBulk(true)}>Enable</BulkBtn>
              <BulkBtn sel={sel} locked={locked} testid="button-bulk-disable-assets" onClick={() => toggleBulk(false)}>Disable</BulkBtn>
              <BulkBtn sel={sel} locked={locked} testid="button-bulk-edit-assets" onClick={() => setBulk(true)}>Bulk edit</BulkBtn>
              <BulkBtn destructive sel={sel} locked={locked} testid="button-bulk-delete-assets" onClick={() => remove(sel.ids)}>Delete</BulkBtn>
            </BulkBar>
            {filtered.length === 0 ? (s.assets.length > 0 ? <NoMatch noun="assets" onReset={resetF} /> : null) : <>
              <DataTable testid="asset" rows={rows} getId={(a) => a.assetId} sel={sel} locked={locked} onRowClick={(r) => setEdit(r)} cols={[
                { h: 'Logo', cell: (a) => <Logo url={a.logoUrl ?? idr.asset(a.assetId, a.symbol).logoUrl} label={a.symbol} kind="crypto" /> },
                { h: 'Asset', cell: (a) => <span className="font-medium">{nameOf(a.assetId)}</span> },
                { h: 'Symbol', cell: (a) => <span className="font-mono text-xs">{a.symbol}</span> },
                { h: 'Status', cell: (a) => <StatusPill on={a.enabled} /> },
                { h: 'Enabled networks', cell: (a) => { const n = enabledNets(a.assetId); return <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs" data-testid={`text-nets-${a.assetId}`}>{n.slice(0, 3).map((c) => <LogoText key={c.assetNetworkId} id={idr.network(c.assetNetworkId)} text={c.networkName} size={16} />)}{n.length > 3 && <span className="font-mono text-muted-foreground">+{n.length - 3} more</span>}{n.length === 0 && <span className="text-muted-foreground">None enabled ({bindings(a.assetId).length} assigned)</span>}</span>; } },
                { h: 'Actions', cell: (a) => <span className="flex items-center gap-2"><Switch aria-label="Enabled" data-testid={`switch-asset-${a.assetId}`} disabled={locked} checked={a.enabled} onCheckedChange={(v) => toggleBulk(v, [a.assetId])} /><Button size="sm" variant="outline" data-testid={`button-edit-asset-${a.assetId}`} onClick={() => setEdit(a)}>Edit</Button><Button size="sm" variant="outline" className="text-destructive" data-testid={`button-delete-asset-${a.assetId}`} disabled={locked} onClick={() => remove([a.assetId])}>Delete</Button></span> },
              ]} />
              <PageBar p={pg} noun="assets" testid="assets" />
            </>}
          </>)}
      </Section>
      <details className="min-w-0 rounded-md border bg-card" data-testid="details-asset-artwork">
        <summary className="cursor-pointer px-5 py-4 font-display text-lg">Optional logo artwork library</summary>
        <div className="min-w-0 border-t p-4"><VisualCatalogBrowser /></div>
      </details>
      <EditDrawer item={edit} itemKey={edit?.assetId ?? ''} title={`Edit ${edit?.symbol ?? 'asset'}`} note="Review, then stage into the exchange draft. Save persists." locked={locked} onClose={() => setEdit(null)} applyLabel="Review changes"
        onApply={(v) => { const orig = s.assets.find((a) => a.assetId === v.assetId); setEdit(null); ask({ title: `Apply changes to ${v.symbol}?`, label: 'Stage changes', body: <><p>Staged only; not saved until you press Save.</p>{orig ? <DiffList before={orig} after={v} /> : null}</>, run: () => { setMany([v.assetId], v); staged(1, 'asset'); } }); }}>
        {(f, set) => (<>
          <LogoText id={idr.asset(f.assetId, f.symbol)} text={nameOf(f.assetId)} size={32} />
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">Enabled<Switch checked={f.enabled} onCheckedChange={(v) => set({ enabled: v })} /></div>
          <Field label="Symbol"><Input data-testid="input-asset-symbol" value={f.symbol} onChange={(e) => set({ symbol: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Display order"><IntInput value={f.displayOrder} onChange={(v) => set({ displayOrder: v })} /></Field><Field label="Precision"><IntInput value={f.decimals} onChange={(v) => set({ decimals: v })} /></Field></div>
          <Field label={`Plan rate (1 ${f.symbol || 'unit'} in plan currency)`}><Dec positive testid="input-asset-rate" value={f.sandboxPlanRate} onChange={(v) => set({ sandboxPlanRate: v })} placeholder="manual reference rate" /></Field>
          <Field label="Logo URL (HTTPS)"><Input placeholder="https://" value={f.logoUrl ?? ''} onChange={(e) => set({ logoUrl: e.target.value.trim() === '' ? null : e.target.value.trim() })} /></Field>
          <Field label="Choose supplied logo"><LogoChooser kind="crypto" hint={f.symbol} current={f.logoUrl} disabled={locked} onPick={(u) => set({ logoUrl: u })} /></Field>
          <section className="space-y-2 rounded-md border p-3" data-testid="section-asset-networks">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-lg">Networks ({bindings(f.assetId).length})</h3><Button type="button" size="sm" variant="outline" data-testid="button-manage-networks" disabled={locked} onClick={() => {
              const original = s.assets.find(a => a.assetId === f.assetId);
              const openAssignment = () => { setEdit(null); setAssignOpen({ assetId: f.assetId, title: `Networks for ${original?.symbol ?? f.symbol}` }); };
              if (original && JSON.stringify(original) !== JSON.stringify(f)) ask({ title: 'Discard these unstaged asset edits?', destructive: true, label: 'Discard edits and open networks', body: <><p>Opening network assignment closes this editor. Review and stage these asset edits first if you want to keep them, then save the exchange draft before changing assignments.</p><DiffList before={original} after={f} /></>, run: () => { openAssignment(); return <p>Unstaged asset edits discarded. Network assignment opened; no assignment has been saved.</p>; } });
              else openAssignment();
            }}>Assign or remove</Button></div>
            <ul className="max-h-44 divide-y overflow-y-auto text-sm">{bindings(f.assetId).map((c) => { const n = s.networks.find((x) => x.assetNetworkId === c.assetNetworkId); return <li key={c.assetNetworkId} className="flex items-center gap-2 py-1.5"><span className="min-w-0 flex-1 truncate">{c.networkName}</span><span className="font-mono text-[10px] uppercase text-copper">{c.testnet ? 'testnet' : 'mainnet'}</span><Switch aria-label={`Enable ${c.networkName}`} disabled={locked} checked={!!n?.enabled} onCheckedChange={(v) => onNet(c.assetNetworkId, v)} /></li>; })}{bindings(f.assetId).length === 0 && <li className="py-2 text-xs text-muted-foreground">No networks assigned.</li>}</ul>
            <p className="text-xs text-muted-foreground">Enable switches are reviewed, then staged in the draft (saved with Save exchange settings). Assignment is separate: assigning or removing networks is a reviewed, immediately persisted tenant change.</p>
          </section>
        </>)}
      </EditDrawer>
      <EditDrawer item={bulk ? { decimals: '', displayOrder: '', rate: '' } : null} itemKey="bulk-assets" title={`Bulk edit ${sel.count} assets`} note="Blank fields stay unchanged. Reviewed, then staged; Save persists." locked={locked} onClose={() => setBulk(false)} applyLabel="Review"
        onApply={(v) => {
          const p: Partial<ExchangeAssetSettings> = {};
          if (v.decimals !== '') { if (!/^\d+$/.test(v.decimals) || !isInt(Number(v.decimals), 18)) { toast({ title: 'Precision must be an integer 0 to 18', variant: 'destructive' }); return; } p.decimals = Number(v.decimals); }
          if (v.displayOrder !== '') { if (!/^\d+$/.test(v.displayOrder) || !isInt(Number(v.displayOrder), 1000)) { toast({ title: 'Display order must be an integer 0 to 1000', variant: 'destructive' }); return; } p.displayOrder = Number(v.displayOrder); }
          if (v.rate !== '') { if (!isDec(v.rate) || !/[1-9]/.test(v.rate)) { toast({ title: 'Reference rate must be a positive decimal', variant: 'destructive' }); return; } p.sandboxPlanRate = v.rate; }
          if (Object.keys(p).length === 0) { toast({ title: 'Nothing to change', variant: 'destructive' }); return; }
          const ids = sel.ids; setBulk(false);
          ask({ title: `Edit ${ids.length} asset${ids.length === 1 ? '' : 's'}?`, body: <><p>Proposed changes (staged only):</p><ul className="font-mono text-xs">{Object.entries(p).map(([k, x]) => <li key={k}>{k}: {String(x)}</li>)}</ul><p>Assets:</p><NameList names={ids.map((i) => `${nameOf(i)} (${i})`)} /></>, label: 'Stage edit', run: () => { setMany(ids, p); staged(ids.length, 'asset'); sel.clear(); } });
        }}>
        {(f, set) => (<>
          <Field label="Precision (0 to 18)"><Input inputMode="numeric" data-testid="input-bulk-decimals" value={f.decimals} onChange={(e) => set({ decimals: e.target.value.trim() })} /></Field>
          <Field label="Display order (0 to 1000)"><Input inputMode="numeric" data-testid="input-bulk-displayOrder" value={f.displayOrder} onChange={(e) => set({ displayOrder: e.target.value.trim() })} /></Field>
          <Field label="Reference rate (positive, same for all selected)"><Dec positive testid="input-bulk-rate" value={f.rate} onChange={(v) => set({ rate: v })} /></Field>
        </>)}
      </EditDrawer>
      <NetworkAssigner routeRefs={routeRefs} open={assign !== null} tenantId={tenant.id} assigned={tenant.assetNetworkIds} assetId={assign?.assetId} title={assign?.title ?? ''} locked={locked} dirty={d.dirty} onClose={() => setAssignOpen(null)} />
      {confirmNode}
    </div>
  );
}
