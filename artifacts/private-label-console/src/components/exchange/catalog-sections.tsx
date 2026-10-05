import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetExchangeConfigurationQueryKey, type Tenant, type ExchangeAssetSettings, type ExchangeNetworkSettings } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Section, AssetsSection } from '@/components/app/sections';
import { useToast } from '@/hooks/use-toast';
import { Dec, DraftFooter, Field, IntInput, Pick, SimNote, isDec, isInt } from './ui';
import { BulkBar, BulkBtn, DataTable, EditDrawer, Logo, StatusPill, providerOptions, useConfirm, useSelection, useStaged } from './bulk';
import type { ExchangeDraft } from './use-exchange-draft';

export function AssetsPanel({ tenant, d, locked, catalogReadOnly }: { tenant: Tenant; d: ExchangeDraft; locked: boolean; catalogReadOnly: boolean }) {
  const qc = useQueryClient(); const { toast } = useToast(); const staged = useStaged(); const [ask, confirmNode] = useConfirm();
  const s = d.draft!;
  const sel = useSelection(s.assets.map((a) => a.assetId));
  const [edit, setEdit] = useState<ExchangeAssetSettings | null>(null);
  const [bulk, setBulk] = useState(false);
  const nameOf = (id: string) => d.catalog.find((c) => c.assetId === id)?.name ?? id;
  const setMany = (ids: string[], p: Partial<ExchangeAssetSettings>) => d.patch({ assets: s.assets.map((a) => (ids.includes(a.assetId) ? { ...a, ...p } : a)) });
  const toggleBulk = (on: boolean) => { const ids = sel.ids; ask({ title: `${on ? 'Enable' : 'Disable'} ${ids.length} asset${ids.length === 1 ? '' : 's'}?`, body: <p>{ids.map((i) => s.assets.find((a) => a.assetId === i)?.symbol).join(', ')} will be staged as {on ? 'enabled' : 'disabled'}. Nothing is saved until you press Save.</p>, label: `Stage ${on ? 'enable' : 'disable'}`, run: () => { setMany(ids, { enabled: on }); staged(ids.length, 'asset'); sel.clear(); } }); };
  const nets = (id: string) => d.catalog.filter((c) => c.assetId === id);
  return (
    <div className="space-y-6">
      <AssetsSection tenant={tenant} readOnly={catalogReadOnly} onSaved={() => qc.invalidateQueries({ queryKey: getGetExchangeConfigurationQueryKey(tenant.id) })} />
      <Section n="X1" title="Asset details" note="Display and sandbox reference data for each tenant-selected asset. Only enabled assets can quote." footer={<DraftFooter d={d} locked={locked} />}>
        <SimNote />
        {s.assets.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-assets">No assets are selected for this tenant. Select sandbox assets and networks above.</p> : (
          <>
            <BulkBar sel={sel} noun="assets" locked={locked} testid="assets">
              <BulkBtn sel={sel} locked={locked} testid="button-bulk-enable-assets" onClick={() => toggleBulk(true)}>Enable</BulkBtn>
              <BulkBtn sel={sel} locked={locked} testid="button-bulk-disable-assets" onClick={() => toggleBulk(false)}>Disable</BulkBtn>
              <BulkBtn sel={sel} locked={locked} testid="button-bulk-edit-assets" onClick={() => setBulk(true)}>Edit precision</BulkBtn>
            </BulkBar>
            <DataTable testid="asset" rows={s.assets} getId={(a) => a.assetId} sel={sel} locked={locked} cols={[
              { h: 'Logo', cell: (a) => <Logo url={a.logoUrl} label={a.symbol} /> },
              { h: 'Name', cell: (a) => <span className="font-medium">{nameOf(a.assetId)}</span> },
              { h: 'Symbol', cell: (a) => <span className="font-mono text-xs">{a.symbol}</span> },
              { h: 'Decimals', cell: (a) => <span className="font-mono text-xs">{a.decimals}</span> },
              { h: 'Networks', cell: (a) => <span className="text-xs">{nets(a.assetId).map((c) => c.networkName).join(', ') || 'None'}</span> },
              { h: 'Status', cell: (a) => <StatusPill on={a.enabled} /> },
              { h: 'Enabled', cell: (a) => <Switch aria-label="Enabled" data-testid={`switch-asset-${a.assetId}`} disabled={locked} checked={a.enabled} onCheckedChange={(v) => setMany([a.assetId], { enabled: v })} /> },
              { h: 'Edit', cell: (a) => <Button size="sm" variant="outline" data-testid={`button-edit-asset-${a.assetId}`} onClick={() => setEdit(a)}>Edit</Button> },
            ]} />
          </>)}
      </Section>
      <EditDrawer item={edit} itemKey={edit?.assetId ?? ''} title={`Edit ${edit?.symbol ?? 'asset'}`} note="Stages into the exchange draft. Press Save exchange settings to persist." locked={locked} onClose={() => setEdit(null)}
        onApply={(v) => { setMany([v.assetId], v); staged(1, 'asset'); setEdit(null); }}>
        {(f, set) => (<>
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">Enabled<Switch checked={f.enabled} onCheckedChange={(v) => set({ enabled: v })} /></div>
          <Field label="Symbol"><Input data-testid="input-asset-symbol" value={f.symbol} onChange={(e) => set({ symbol: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Display order"><IntInput value={f.displayOrder} onChange={(v) => set({ displayOrder: v })} /></Field><Field label="Precision"><IntInput value={f.decimals} onChange={(v) => set({ decimals: v })} /></Field></div>
          <Field label={`Plan rate (1 ${f.symbol || 'unit'} in plan currency)`}><Dec positive testid="input-asset-rate" value={f.sandboxPlanRate} onChange={(v) => set({ sandboxPlanRate: v })} placeholder="manual reference rate" /></Field>
          <Field label="Logo URL (HTTPS)"><Input placeholder="https://" value={f.logoUrl ?? ''} onChange={(e) => set({ logoUrl: e.target.value.trim() === '' ? null : e.target.value.trim() })} /></Field>
        </>)}
      </EditDrawer>
      <EditDrawer item={bulk ? { decimals: '' } : null} itemKey="bulk-assets" title={`Bulk edit ${sel.count} assets`} note="Blank fields stay unchanged." locked={locked} onClose={() => setBulk(false)} applyLabel="Review"
        onApply={(v) => {
          if (v.decimals === '') { toast({ title: 'Nothing to change', variant: 'destructive' }); return; }
          if (!isInt(Number(v.decimals), 18)) { toast({ title: 'Precision must be an integer 0 to 18', variant: 'destructive' }); return; }
          const ids = sel.ids; setBulk(false);
          ask({ title: `Set precision on ${ids.length} assets?`, body: <p>Precision becomes {v.decimals} decimals for {ids.length} selected assets. Staged only.</p>, label: 'Stage edit', run: () => { setMany(ids, { decimals: Number(v.decimals) }); staged(ids.length, 'asset'); sel.clear(); } });
        }}>
        {(f, set) => <Field label="Precision (0 to 18)"><Input inputMode="numeric" data-testid="input-bulk-decimals" value={f.decimals} onChange={(e) => set({ decimals: e.target.value.trim() })} /></Field>}
      </EditDrawer>
      {confirmNode}
    </div>
  );
}

export function NetworksPanel({ d, locked }: { d: ExchangeDraft; locked: boolean }) {
  const { toast } = useToast(); const staged = useStaged(); const [ask, confirmNode] = useConfirm();
  const s = d.draft!;
  const sel = useSelection(s.networks.map((n) => n.assetNetworkId));
  const [edit, setEdit] = useState<ExchangeNetworkSettings | null>(null);
  const [bulk, setBulk] = useState<'fields' | 'provider' | null>(null);
  const cat = (id: string) => d.catalog.find((x) => x.assetNetworkId === id);
  const logoOf = (id: string) => s.assets.find((a) => a.assetId === cat(id)?.assetId)?.logoUrl ?? null;
  const provName = (id?: string) => (id ? d.providerCatalog.find((p) => p.id === id)?.name ?? id : 'Manual / sandbox');
  const setMany = (ids: string[], p: Partial<ExchangeNetworkSettings>) => d.patch({ networks: s.networks.map((n) => (ids.includes(n.assetNetworkId) ? { ...n, ...p } : n)) });
  const bulkSet = (label: string, p: Partial<ExchangeNetworkSettings>) => { const ids = sel.ids; ask({ title: `${label} on ${ids.length} network binding${ids.length === 1 ? '' : 's'}?`, body: <p>Staged only; nothing is saved until you press Save.</p>, label: 'Stage change', run: () => { setMany(ids, p); staged(ids.length, 'network'); sel.clear(); } }); };
  const provOpts = (cur?: string) => providerOptions(d.providerCatalog, 'swap', cur);
  return (
    <Section n="X2" title="Networks" note="Each row is an asset-network binding. Only networks that are enabled and available can quote. Limits and fee are decimal strings in asset units." footer={<DraftFooter d={d} locked={locked} />}>
      {s.networks.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-networks">No asset networks are selected. Use the Assets section to select them.</p> : (
        <>
          <BulkBar sel={sel} noun="networks" locked={locked} testid="networks">
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-enable-networks" onClick={() => bulkSet('Enable', { enabled: true })}>Enable</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-disable-networks" onClick={() => bulkSet('Disable', { enabled: false })}>Disable</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-available-networks" onClick={() => bulkSet('Mark available', { available: true })}>Mark available</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-unavailable-networks" onClick={() => bulkSet('Mark unavailable', { available: false })}>Mark unavailable</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-edit-networks" onClick={() => setBulk('fields')}>Edit fee / limits</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-provider-networks" onClick={() => setBulk('provider')}>Assign provider</BulkBtn>
          </BulkBar>
          <DataTable testid="network" rows={s.networks} getId={(n) => n.assetNetworkId} sel={sel} locked={locked} cols={[
            { h: 'Logo', cell: (n) => <Logo url={logoOf(n.assetNetworkId)} label={cat(n.assetNetworkId)?.networkName ?? '?'} /> },
            { h: 'Network', cell: (n) => <span className="font-medium">{cat(n.assetNetworkId)?.networkName ?? n.assetNetworkId}{cat(n.assetNetworkId)?.testnet && <span className="ml-2 font-mono text-[10px] uppercase text-copper">testnet</span>}</span> },
            { h: 'Code', cell: (n) => <span className="font-mono text-xs">{cat(n.assetNetworkId)?.networkId ?? n.assetNetworkId}</span> },
            { h: 'Assets', cell: (n) => { const c = cat(n.assetNetworkId); return <span className="font-mono text-xs">{d.catalog.filter((x) => x.networkId === c?.networkId).map((x) => x.symbol).join(', ') || c?.symbol}</span>; } },
            { h: 'Provider', cell: (n) => <span className="text-xs">{provName(n.providerId)}</span> },
            { h: 'Status', cell: (n) => <span className="flex gap-1"><StatusPill on={n.enabled} /><StatusPill on={n.available} onLabel="Available" offLabel="Unavailable" /></span> },
            { h: 'Enabled', cell: (n) => <Switch aria-label="Enabled" data-testid={`switch-network-enabled-${n.assetNetworkId}`} disabled={locked} checked={n.enabled} onCheckedChange={(v) => setMany([n.assetNetworkId], { enabled: v })} /> },
            { h: 'Edit', cell: (n) => <Button size="sm" variant="outline" data-testid={`button-edit-network-${n.assetNetworkId}`} onClick={() => setEdit(n)}>Edit</Button> },
          ]} />
        </>)}
      <EditDrawer item={edit} itemKey={edit?.assetNetworkId ?? ''} title={edit ? `${cat(edit.assetNetworkId)?.symbol ?? ''} on ${cat(edit.assetNetworkId)?.networkName ?? edit.assetNetworkId}` : 'Network'} note="Stages into the exchange draft. Press Save exchange settings to persist." locked={locked} onClose={() => setEdit(null)}
        onApply={(v) => { setMany([v.assetNetworkId], v); staged(1, 'network'); setEdit(null); }}>
        {(f, set) => (<>
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
          ask({ title: `Edit ${ids.length} networks?`, body: <ul className="font-mono text-xs">{Object.entries(p).map(([k, x]) => <li key={k}>{k}: {String(x)}</li>)}</ul>, label: 'Stage edit', run: () => { setMany(ids, p); staged(ids.length, 'network'); sel.clear(); } });
        }}>
        {(f, set) => (<div className="grid grid-cols-3 gap-3"><Field label="Minimum"><Dec value={f.minimum} onChange={(v) => set({ minimum: v })} /></Field><Field label="Maximum"><Dec value={f.maximum} onChange={(v) => set({ maximum: v })} /></Field><Field label="Fee"><Dec value={f.fee} onChange={(v) => set({ fee: v })} /></Field></div>)}
      </EditDrawer>
      <EditDrawer item={bulk === 'provider' ? { providerId: 'manual' } : null} itemKey="bulk-prov" title={`Assign provider to ${sel.count} networks`} note="Future-only assignment. Quotes stay manual and sandbox." locked={locked} onClose={() => setBulk(null)} applyLabel="Review"
        onApply={(v) => { setBulk(null); const ids = sel.ids; ask({ title: `Assign ${v.providerId === 'manual' ? 'Manual / sandbox' : provName(v.providerId)} to ${ids.length} networks?`, body: <p>No real provider call is made.</p>, label: 'Stage assignment', run: () => { setMany(ids, { providerId: v.providerId === 'manual' ? undefined : v.providerId }); staged(ids.length, 'network'); sel.clear(); } }); }}>
        {(f, set) => <Field label="Provider"><Pick testid="select-bulk-provider" value={f.providerId} onChange={(v) => set({ providerId: v })} options={provOpts()} /></Field>}
      </EditDrawer>
      {confirmNode}
    </Section>
  );
}
