import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ExSection as Section } from './manage';
import type { ExchangeProvider, ExchangeProviderConfiguration } from '@workspace/api-client-react';
import { DraftFooter, Field, SimNote } from './ui';
import { VisualImg } from './visual-catalog';
import { BulkBar, BulkBtn, DataTable, EditDrawer, FilterBar, NoMatch, StatusPill, useConfirm, useSelection } from './bulk';
import { DiffList, NameList, PageBar, usePaged } from './manage';
import { Pick } from './ui';
import { useStaged } from './bulk';
import type { ExchangeDraft } from './use-exchange-draft';

const STATUS: Record<string, string> = { sandbox: 'Sandbox only', configuration_only: 'Configuration only', coming_soon: 'Coming soon' };

export function ProvidersPanel({ d, locked }: { d: ExchangeDraft; locked: boolean }) {
  const staged = useStaged(); const [ask, confirmNode] = useConfirm(locked);
  const s = d.draft!;
  const [q, setQ] = useState(''); const [ty, setTy] = useState('all'); const [stf, setStf] = useState('all');
  const all = d.providerCatalog;
  const types = [...new Set(all.map((p) => p.category))];
  const cat = all.filter((p) => (ty === 'all' || p.category === ty) && (stf === 'all' || p.status === stf) && `${p.name} ${p.capabilities.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pg = usePaged(cat, `${q}|${ty}|${stf}`);
  const sel = useSelection(pg.pageRows.map((x) => x.id));
  const bulkEnable = (on: boolean) => { const ids = sel.ids.filter((i) => all.find((x) => x.id === i)?.status !== 'coming_soon'); ask({ title: `${on ? 'Enable' : 'Disable'} ${ids.length} provider${ids.length === 1 ? '' : 's'}?`, label: `Stage ${on ? 'enable' : 'disable'}`, body: <><p>Metadata flag only. Nothing connects, quotes or executes. Coming soon providers are skipped.</p><NameList names={ids.map((i) => all.find((x) => x.id === i)?.name ?? i)} /></>, run: () => { const cur = s.providers ?? []; const next = [...cur.filter((c) => !ids.includes(c.providerId)), ...ids.map((i) => ({ ...cfgOf(i), enabled: on }))]; d.patch({ providers: next }); staged(ids.length, 'provider'); sel.clear(); } }); };
  const resetF = () => { setQ(''); setTy('all'); setStf('all'); };
  const [edit, setEdit] = useState<{ p: ExchangeProvider; c: ExchangeProviderConfiguration } | null>(null);
  const cfgOf = (id: string): ExchangeProviderConfiguration => (s.providers ?? []).find((x) => x.providerId === id) ?? { providerId: id, enabled: false };
  const upsert = (c: ExchangeProviderConfiguration) => { const cur = s.providers ?? []; d.patch({ providers: cur.some((x) => x.providerId === c.providerId) ? cur.map((x) => (x.providerId === c.providerId ? c : x)) : [...cur, c] }); };
  return (
    <Section n="X7" title="Providers / Integrations" note="Provider catalog supplied by the platform. This section stores a label, a public HTTPS endpoint and an enabled flag only." footer={<DraftFooter d={d} locked={locked} />}>
      <SimNote />
      <p className="rounded-md border p-3 text-xs text-muted-foreground" data-testid="text-provider-notice">Enabling a preference here is metadata only and does not authorize connectivity. Manage independent credentials, connection tests and Super Admin pricing assignments in Integrations. Verified read-only adapters may supply indicative Sandbox prices; orders never move funds or execute trades.</p>
      <FilterBar noun="providers" search={q} onSearch={setQ} placeholder="Search provider or capability" shown={cat.length} total={all.length} onReset={resetF} active={q !== '' || ty !== 'all' || stf !== 'all'}>
        <div className="w-44"><Pick testid="select-provider-type" value={ty} onChange={setTy} options={[['all', 'Any type'], ...types.map((t) => [t, t.replace(/_/g, ' ')] as [string, string])]} /></div>
        <div className="w-48"><Pick testid="select-provider-state" value={stf} onChange={setStf} options={[['all', 'Any state'], ...Object.entries(STATUS)]} /></div>
      </FilterBar>
      <BulkBar sel={sel} noun="providers" locked={locked} testid="providers">
        <BulkBtn sel={sel} locked={locked} testid="button-bulk-enable-providers" onClick={() => bulkEnable(true)}>Enable (metadata)</BulkBtn>
        <BulkBtn sel={sel} locked={locked} testid="button-bulk-disable-providers" onClick={() => bulkEnable(false)}>Disable</BulkBtn>
      </BulkBar>
      {all.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-providers">The provider catalog is not available.</p> : cat.length === 0 ? <NoMatch noun="providers" onReset={resetF} /> : (
        <>
          <DataTable testid="provider" rows={pg.pageRows} getId={(x) => x.id} sel={sel} locked={locked} onRowClick={(x) => setEdit({ p: x, c: cfgOf(x.id) })} cols={[
            { h: 'Logo', cell: (x) => <VisualImg label={x.name} kind="provider" size={28} /> },
            { h: 'Name', cell: (x) => { const c = cfgOf(x.id); return <span><span className="font-medium">{c.label || x.name}</span>{c.label && <span className="block text-xs text-muted-foreground">{x.name}</span>}</span>; } },
            { h: 'Type', cell: (x) => <span className="text-xs capitalize">{x.category.replace(/_/g, ' ')}</span> },
            { h: 'Connection', cell: (x) => <span className="flex flex-col gap-1 text-xs"><StatusPill on={false} offLabel="Not connected" /><span className="text-muted-foreground">{STATUS[x.status] ?? x.status}{cfgOf(x.id).enabled && x.status !== 'coming_soon' ? ', metadata flag on' : ''}</span></span> },
            { h: 'Services', cell: (x) => <span className="text-xs">{x.capabilities.join(', ') || 'None'}</span> },
            { h: 'Actions', cell: (x) => { const c = cfgOf(x.id); const soon = x.status === 'coming_soon'; return <span className="flex items-center gap-2"><Switch aria-label="Metadata flag" data-testid={`switch-provider-${x.id}`} disabled={locked || soon} checked={c.enabled && !soon} onCheckedChange={(v) => { upsert({ ...c, enabled: v }); staged(1, 'provider'); }} /><Button size="sm" variant="outline" data-testid={`button-edit-provider-${x.id}`} onClick={() => setEdit({ p: x, c })}>{soon ? 'View' : 'Configure'}</Button></span>; } },
          ]} />
          <PageBar p={pg} noun="providers" testid="providers" />
        </>)}
      <EditDrawer item={edit} itemKey={edit?.p.id ?? ''} title={edit?.p.name ?? 'Provider'} note={edit ? `${STATUS[edit.p.status] ?? edit.p.status}. ${edit.p.functional ? '' : 'Not connected.'}` : ''} locked={locked || edit?.p.status === 'coming_soon'} onClose={() => setEdit(null)}
        applyLabel="Review changes" onApply={(v) => { const c = { ...v.c, label: v.c.label?.trim() || undefined, endpoint: v.c.endpoint?.trim() || null }; const orig = cfgOf(v.p.id); setEdit(null); ask({ title: `Apply changes to ${v.p.name}?`, label: 'Stage changes', body: <><p>Metadata only; no connection is made. Not saved until you press Save.</p><DiffList before={orig} after={c} /></>, run: () => { upsert(c); staged(1, 'provider'); } }); }}>
        {(f, set) => (<>
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">Enabled (metadata only)<Switch checked={f.c.enabled} onCheckedChange={(v) => set({ c: { ...f.c, enabled: v } })} /></div>
          <Field label="Label"><Input maxLength={100} data-testid="input-provider-label" value={f.c.label ?? ''} onChange={(e) => set({ c: { ...f.c, label: e.target.value } })} /></Field>
          <Field label="Public endpoint (HTTPS, no secrets)"><Input data-testid="input-provider-endpoint" placeholder="https://" value={f.c.endpoint ?? ''} onChange={(e) => set({ c: { ...f.c, endpoint: e.target.value } })} /></Field>
          <Field label="API key"><Input disabled placeholder="Not accepted" /></Field>
          <Field label="API secret"><Input disabled placeholder="Not accepted" /></Field>
          <p className="text-xs text-muted-foreground">This preference does not store credentials or test connections. Implemented providers are managed through the tenant's protected Integrations workspace; unsupported catalog entries remain configuration only.</p>
        </>)}
      </EditDrawer>
      {confirmNode}
    </Section>
  );
}
