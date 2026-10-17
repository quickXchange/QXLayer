import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, ErrorState, ListSkeleton } from '@/components/app/bits';
import { BulkBar, BulkBtn, DataTable, EditDrawer, FilterBar, Logo, NoMatch, StatusPill, useConfirm, useSelection } from '@/components/exchange/bulk';
import { Field, Pick } from '@/components/exchange/ui';
import { PageBar, usePaged } from '@/components/exchange/manage';
import { useGlobalCatalog, usePatchGlobalCatalog, type CatalogEntry, type CatalogKind, type CatalogLink, type CatalogPatch } from '@/hooks/use-global-catalog';

const SECTIONS: { kind: CatalogKind; label: string; noun: string; link?: { kind: CatalogLink['kind']; self: 'sourceId' | 'targetId'; other: CatalogKind; otherLabel: string }; meta: [string, string, boolean?][] }[] = [
  { kind: 'currencies', label: 'Currencies', noun: 'currencies', link: { kind: 'payment_fiat', self: 'targetId', other: 'payment_methods', otherLabel: 'Payment methods' }, meta: [['symbol', 'Symbol'], ['decimals', 'Decimals'], ['countryCodes', 'Country codes (comma)', true], ['sourceUrl', 'Source URL']] },
  { kind: 'payment_methods', label: 'Payment Methods', noun: 'payment methods', link: { kind: 'payment_fiat', self: 'sourceId', other: 'currencies', otherLabel: 'Fiat currencies' }, meta: [['provider', 'Provider'], ['category', 'Category'], ['countryCodes', 'Country codes (comma)', true], ['requiredFields', 'Required fields (comma)', true], ['sourceUrl', 'Source URL']] },
  { kind: 'assets', label: 'Crypto Assets', noun: 'assets', link: { kind: 'asset_network', self: 'sourceId', other: 'networks', otherLabel: 'Networks' }, meta: [['decimals', 'Decimals'], ['sourceUrl', 'Source URL']] },
  { kind: 'networks', label: 'Crypto Networks', noun: 'networks', link: { kind: 'asset_network', self: 'targetId', other: 'assets', otherLabel: 'Assets' }, meta: [['chainId', 'Chain ID'], ['addressFormat', 'Address format'], ['sourceUrl', 'Source URL']] },
];
const STATUS: [string, string][] = [['enabled', 'Enabled'], ['disabled', 'Disabled'], ['catalog_only', 'Catalog only']];
const LINK_FIELDS: Record<string, [string, string, boolean?][]> = {
  asset_network: [['legacyAssetNetworkId', 'Legacy asset-network id'], ['contractAddress', 'Token contract address (blank for native)'], ['decimals', 'Decimals'], ['addressFormat', 'Address format'], ['sourceUrl', 'Source URL']],
  payment_fiat: [['countryCodes', 'Country codes (comma)', true], ['sourceUrl', 'Source URL']],
};
const str = (v: unknown) => (Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v));

export default function GlobalCatalog() {
  const cat = useGlobalCatalog(); const patch = usePatchGlobalCatalog(); const { toast } = useToast();
  const [kind, setKind] = useState<CatalogKind>('currencies');
  const sec = SECTIONS.find((s) => s.kind === kind)!;
  const [q, setQ] = useState(''); const [fs, setFs] = useState('all'); const [fl, setFl] = useState('all');
  const [edit, setEdit] = useState<(CatalogEntry & { _new?: boolean; _links: string[]; _meta: Record<string, string> }) | null>(null);
  const [ask, confirmNode] = useConfirm(false);
  const [linkEdit, setLinkEdit] = useState<{ l: CatalogLink; m: Record<string, string>; native: boolean; memo: boolean } | null>(null);
  const enableBlock = (e: Pick<CatalogEntry, 'metadata' | 'code'>) => (e.metadata.verified !== true ? `${e.code}: mark verified` : !str(e.metadata.sourceUrl).trim() ? `${e.code}: source URL required` : null);
  const fileRef = useRef<HTMLInputElement>(null);
  const entries = useMemo(() => cat.data?.entries ?? [], [cat.data]);
  const links = useMemo(() => cat.data?.links ?? [], [cat.data]);
  const mine = useMemo(() => entries.filter((e) => e.kind === kind), [entries, kind]);
  const byId = (id: string) => entries.find((e) => e.id === id);
  const linksOf = (e: CatalogEntry) => sec.link ? links.filter((l) => l.kind === sec.link!.kind && l[sec.link!.self] === e.id) : [];
  const otherId = (l: CatalogLink) => (sec.link!.self === 'sourceId' ? l.targetId : l.sourceId);
  const rows = mine.filter((e) => (fs === 'all' || e.status === fs) && (fl === 'all' || (fl === 'linked') === (linksOf(e).length > 0)) && `${e.code} ${e.name}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pg = usePaged(rows, `${kind}|${q}|${fs}|${fl}`);
  const sel = useSelection(pg.pageRows.map((e) => e.id));
  const reset = () => { setQ(''); setFs('all'); setFl('all'); };
  const run = (p: CatalogPatch, ok: string) => patch.mutateAsync({ data: p }).then(() => { toast({ title: ok }); }).catch((e: Error) => { toast({ title: 'Catalog change rejected', description: e.message, variant: 'destructive' }); throw e; });
  const setStatus = (ids: string[], status: CatalogEntry['status']) => { if (status === 'enabled') { const bad = ids.map((i) => byId(i)).filter((x): x is CatalogEntry => !!x).map(enableBlock).filter(Boolean); if (bad.length) { toast({ title: 'Cannot enable unverified entries', description: `${bad.slice(0, 4).join('; ')}${bad.length > 4 ? ` and ${bad.length - 4} more` : ''}. Edit each entry: tick Verified and add a source URL.`, variant: 'destructive' }); return; } } askStatus(ids, status); };
  const askStatus = (ids: string[], status: CatalogEntry['status']) => ask({ title: `Set ${ids.length} ${sec.noun} to ${status.replace('_', ' ')}?`, body: <p>Global change. Tenants only see enabled entries they are entitled to. Catalog entries do not imply live integration.</p>, label: 'Apply', run: async () => { await run({ entries: ids.flatMap((id) => { const x = byId(id); return x ? [{ ...x, status }] : []; }) }, 'Status updated'); sel.clear(); } });
  const del = (ids: string[]) => ask({ title: `Delete ${ids.length} ${sec.noun}?`, destructive: true, label: 'Delete', body: <><p>The server blocks deletion when an entry is referenced by tenants, routes or orders. Use Disable to retire an entry safely.</p><ul className="font-mono text-xs">{ids.map((i) => <li key={i}>{byId(i)?.code} ({byId(i)?.name})</li>)}</ul></>, run: async () => { await run({ deleteEntries: ids.map((id) => ({ kind, id })) }, 'Deleted'); sel.clear(); } });
  const open = (e?: CatalogEntry) => {
    const base = e ?? { kind, id: crypto.randomUUID(), code: '', name: '', status: 'catalog_only' as const, logoUrl: null, metadata: {}, revision: 0 };
    setEdit({ ...base, _new: !e, _links: e ? linksOf(e).filter((l) => l.enabled).map(otherId) : [], _meta: Object.fromEntries(sec.meta.map(([k]) => [k, str(base.metadata[k])])) });
  };
  const save = (v: NonNullable<typeof edit>) => {
    if (!v.code.trim() || !v.name.trim()) { toast({ title: 'Code and name are required', variant: 'destructive' }); return; }
    const metadata: Record<string, unknown> = { ...v.metadata };
    for (const [k, , list] of sec.meta) { const t = v._meta[k].trim(); if (!t) delete metadata[k]; else if (list) metadata[k] = t.split(',').map((x) => x.trim()).filter(Boolean); else if (['decimals', 'chainId'].includes(k) && /^\d+$/.test(t)) metadata[k] = Number(t); else metadata[k] = t; }
    if (v.status === 'enabled') { const b = enableBlock({ code: v.code || 'Entry', metadata }); if (b) { toast({ title: 'Cannot enable', description: `${b}.`, variant: 'destructive' }); return; } }
    const entry = { kind, id: v.id, code: v.code.trim().toUpperCase(), name: v.name.trim(), status: v.status, logoUrl: v.logoUrl?.trim() || null, metadata, revision: v.revision };
    const L: CatalogLink[] = [];
    if (sec.link) {
      const existing = v._new ? [] : linksOf(v);
      for (const o of mine.length ? entries.filter((x) => x.kind === sec.link!.other) : []) {
        const on = v._links.includes(o.id); const ex = existing.find((l) => otherId(l) === o.id);
        if (on === !!ex?.enabled && (ex || !on)) continue;
        L.push(ex ? { ...ex, enabled: on } : { kind: sec.link.kind, id: crypto.randomUUID(), sourceId: sec.link.self === 'sourceId' ? v.id : o.id, targetId: sec.link.self === 'targetId' ? v.id : o.id, enabled: on, verified: false, metadata: {} });
      }
    }
    setEdit(null);
    run({ entries: [entry], links: L }, v._new ? 'Entry created' : 'Entry saved').catch(() => undefined);
  };
  const openLink = (l: CatalogLink) => setLinkEdit({ l, m: Object.fromEntries((LINK_FIELDS[l.kind] ?? []).map(([k]) => [k, str(l.metadata[k])])), native: l.metadata.native === true, memo: l.metadata.memoRequired === true });
  const saveLink = () => {
    if (!linkEdit) return; const { l, m, native, memo } = linkEdit; const metadata: Record<string, unknown> = { ...l.metadata };
    for (const [k, , list] of LINK_FIELDS[l.kind] ?? []) { const t = m[k].trim(); if (!t) delete metadata[k]; else if (list) metadata[k] = t.split(',').map((x) => x.trim()).filter(Boolean); else if (k === 'decimals' && /^\d+$/.test(t)) metadata[k] = Number(t); else metadata[k] = t; }
    if (l.kind === 'asset_network') { metadata.native = native; metadata.memoRequired = memo; if (native) delete metadata.contractAddress; }
    if (l.verified && l.kind === 'asset_network' && !native && !str(metadata.contractAddress).trim()) { toast({ title: 'A verified token link needs a contract address, or mark it native', variant: 'destructive' }); return; }
    if (l.verified && !str(metadata.sourceUrl).trim()) { toast({ title: 'A verified link needs a source URL', variant: 'destructive' }); return; }
    setLinkEdit(null); run({ links: [{ ...l, metadata }] }, 'Link saved').catch(() => undefined);
  };
  const exportJson = () => { const blob = new Blob([JSON.stringify({ entries: mine, links: links.filter((l) => sec.link && l.kind === sec.link.kind) }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `catalog-${kind}.json`; a.click(); URL.revokeObjectURL(a.href); };
  const importJson = async (f: File) => {
    try {
      const j = JSON.parse(await f.text()); const es = (Array.isArray(j) ? j : j.entries ?? []) as CatalogEntry[]; const ls = (Array.isArray(j) ? [] : j.links ?? []) as CatalogLink[];
      if (!es.every((e) => e.code && e.name && e.kind === kind)) throw new Error(`Every entry needs code, name and kind "${kind}"`);
      ask({ title: `Import ${es.length} entries and ${ls.length} links?`, label: 'Import', body: <p>Existing ids are updated by revision; new ids are created. The server validates everything.</p>, run: async () => { await run({ entries: es, links: ls }, 'Import complete'); } });
    } catch (e) { toast({ title: 'Import failed', description: (e as Error).message, variant: 'destructive' }); }
  };

  return (
    <>
      <PageHeader eyebrow="Super Admin · global catalog" title="Exchange catalog" />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">One global source for currencies, payment methods, crypto assets and networks. Entries and links here never create routes or pricing, and do not imply live banking or blockchain connectivity.</p>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" data-testid="tabs-catalog">
        {SECTIONS.map((s) => <button key={s.kind} role="tab" aria-selected={s.kind === kind} data-testid={`tab-catalog-${s.kind}`} onClick={() => { setKind(s.kind); reset(); sel.clear(); }} className={`rounded-md border px-3 py-1.5 text-sm ${s.kind === kind ? 'border-copper text-copper' : 'text-muted-foreground hover:text-foreground'}`}>{s.label} <span className="font-mono text-[10px]">{entries.filter((e) => e.kind === s.kind).length}</span></button>)}
      </div>
      {cat.isLoading ? <ListSkeleton /> : cat.isError ? <ErrorState what="the catalog" onRetry={() => cat.refetch()} /> : (
        <div className="space-y-3">
          <FilterBar noun={sec.noun} search={q} onSearch={setQ} placeholder="Search code or name" shown={rows.length} total={mine.length} onReset={reset} active={q !== '' || fs !== 'all' || fl !== 'all'}>
            <div className="w-40"><Pick testid="select-catalog-status" value={fs} onChange={setFs} options={[['all', 'Any status'], ...STATUS]} /></div>
            <div className="w-40"><Pick testid="select-catalog-linked" value={fl} onChange={setFl} options={[['all', 'Any links'], ['linked', 'Has links'], ['unlinked', 'No links']]} /></div>
          </FilterBar>
          <div className="flex flex-wrap gap-2">
            <Button data-testid="button-catalog-add" onClick={() => open()}>Add entry</Button>
            <Button variant="outline" data-testid="button-catalog-export" onClick={exportJson}>Export JSON</Button>
            <Button variant="outline" data-testid="button-catalog-import" onClick={() => fileRef.current?.click()}>Import JSON</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" data-testid="input-catalog-import" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ''; }} />
          </div>
          <BulkBar sel={sel} noun={sec.noun} testid="catalog">
            <BulkBtn sel={sel} locked={false} testid="button-catalog-bulk-enable" onClick={() => setStatus(sel.ids, 'enabled')}>Enable</BulkBtn>
            <BulkBtn sel={sel} locked={false} testid="button-catalog-bulk-disable" onClick={() => setStatus(sel.ids, 'disabled')}>Disable</BulkBtn>
            <BulkBtn sel={sel} locked={false} testid="button-catalog-bulk-only" onClick={() => setStatus(sel.ids, 'catalog_only')}>Catalog only</BulkBtn>
            <BulkBtn destructive sel={sel} locked={false} testid="button-catalog-bulk-delete" onClick={() => del(sel.ids)}>Delete</BulkBtn>
          </BulkBar>
          {mine.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-catalog-empty">No {sec.noun} yet. Add one or import a JSON file.</p> : rows.length === 0 ? <NoMatch noun={sec.noun} onReset={reset} /> : <>
            <DataTable testid="catalog" rows={pg.pageRows} getId={(e) => e.id} sel={sel} locked={false} onRowClick={(e: CatalogEntry) => open(e)} cols={[
              { h: 'Logo', cell: (e) => <Logo url={e.logoUrl} label={e.code} kind={kind === 'currencies' ? 'flag' : kind === 'payment_methods' ? 'payment-method' : kind === 'networks' ? 'network' : 'crypto'} /> },
              { h: 'Code', cell: (e) => <span className="font-mono text-xs">{e.code}</span> },
              { h: 'Name', cell: (e) => <span className="font-medium">{e.name}</span> },
              { h: sec.link?.otherLabel ?? 'Links', cell: (e) => { const ls = linksOf(e); return <span className="flex max-w-xs flex-wrap gap-1">{ls.length === 0 && <span className="text-xs text-muted-foreground">None</span>}{ls.slice(0, 6).map((l) => <button key={l.id} type="button" title="Edit link metadata and verification" data-testid={`chip-link-${l.id}`} onClick={(ev) => { ev.stopPropagation(); openLink(l); }} className={`rounded-full border px-1.5 py-0.5 font-mono text-[10px] ${l.enabled ? '' : 'opacity-50 line-through'} ${l.verified ? 'border-copper text-copper' : ''}`}>{byId(otherId(l))?.code ?? '?'}{l.verified ? ' ✓' : ''}</button>)}{ls.length > 6 && <span className="text-[10px] text-muted-foreground">+{ls.length - 6}</span>}</span>; } },
              { h: 'Source', cell: (e) => <span className="max-w-[10rem] truncate text-xs text-muted-foreground">{str(e.metadata.sourceUrl) || 'not recorded'}</span> },
              { h: 'Status', cell: (e) => e.status === 'catalog_only' ? <StatusPill on={false} offLabel="Catalog only" /> : <StatusPill on={e.status === 'enabled'} /> },
              { h: 'Actions', cell: (e) => <span className="flex items-center gap-2"><Switch aria-label="Enabled" data-testid={`switch-catalog-${e.id}`} checked={e.status === 'enabled'} onCheckedChange={(v) => setStatus([e.id], v ? 'enabled' : 'disabled')} /><Button size="sm" variant="outline" data-testid={`button-catalog-edit-${e.id}`} onClick={() => open(e)}>Edit</Button><Button size="sm" variant="outline" className="text-destructive" data-testid={`button-catalog-delete-${e.id}`} onClick={() => del([e.id])}>Delete</Button></span> },
            ]} /><PageBar p={pg} noun={sec.noun} testid="catalog" /></>}
        </div>)}
      <EditDrawer item={edit} itemKey={edit?.id ?? ''} title={edit?._new ? `New ${sec.label.toLowerCase()} entry` : `${edit?.code ?? ''} ${edit?.name ?? ''}`} note="Saved immediately to the global catalog (revision-checked)." locked={patch.isPending} onClose={() => setEdit(null)} applyLabel="Save" onApply={save}>
        {(f, set) => (<>
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3"><Logo url={f.logoUrl} label={f.code || '?'} size={40} /><span className="text-sm">{f.name || 'Unnamed'}</span></div>
          <div className="grid grid-cols-2 gap-3"><Field label="Code"><Input data-testid="input-catalog-code" value={f.code} onChange={(e) => set({ code: e.target.value })} /></Field><Field label="Status"><Pick testid="select-catalog-edit-status" value={f.status} onChange={(v) => set({ status: v as CatalogEntry['status'] })} options={STATUS} /></Field></div>
          <Field label="Name"><Input data-testid="input-catalog-name" value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Logo URL (blank for generated fallback)"><Input data-testid="input-catalog-logo" value={f.logoUrl ?? ''} onChange={(e) => set({ logoUrl: e.target.value })} /></Field>
          <label className="flex items-center gap-2 rounded-md border p-2 text-sm"><Checkbox data-testid="check-catalog-verified" checked={f.metadata.verified === true} onCheckedChange={(v) => set({ metadata: { ...f.metadata, verified: v === true } })} />Verified against the source URL (required to enable)</label>
          {sec.meta.map(([k, l]) => <Field key={k} label={l}><Input data-testid={`input-catalog-meta-${k}`} value={f._meta[k]} onChange={(e) => set({ _meta: { ...f._meta, [k]: e.target.value } })} /></Field>)}
          {kind === 'networks' && <div className="grid grid-cols-2 gap-3 text-sm">{(['memoRequired', 'testnet'] as const).map((k) => <label key={k} className="flex items-center gap-2 rounded-md border p-2"><Checkbox checked={f.metadata[k] === true} onCheckedChange={(v) => set({ metadata: { ...f.metadata, [k]: v === true } })} />{k === 'memoRequired' ? 'Memo required' : 'Testnet'}</label>)}</div>}
          {sec.link && <Field label={`Linked ${sec.link.otherLabel.toLowerCase()}`}><div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">{entries.filter((x) => x.kind === sec.link!.other).map((o) => <label key={o.id} className="flex items-center gap-2 text-sm"><Checkbox data-testid={`check-catalog-link-${o.id}`} checked={f._links.includes(o.id)} onCheckedChange={(v) => set({ _links: v === true ? [...f._links, o.id] : f._links.filter((x) => x !== o.id) })} /><span className="font-mono text-xs">{o.code}</span><span className="truncate text-muted-foreground">{o.name}</span></label>)}</div><p className="text-xs text-muted-foreground">New links start unverified. Mark them verified from the table only after confirming against the source URL.</p></Field>}
        </>)}
      </EditDrawer>
      <EditDrawer item={linkEdit} itemKey={linkEdit?.l.id ?? ''} title={linkEdit ? `Link: ${byId(linkEdit.l.sourceId)?.code ?? '?'} to ${byId(linkEdit.l.targetId)?.code ?? '?'}` : 'Link'} note="Link metadata and verification. A verified link needs a source URL; a verified token link needs a contract address or the native flag." locked={patch.isPending} onClose={() => setLinkEdit(null)} applyLabel="Save link" onApply={() => saveLink()}>
        {(f) => linkEdit ? (<>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2 rounded-md border p-2"><Checkbox data-testid="check-link-enabled" checked={linkEdit.l.enabled} onCheckedChange={(v) => setLinkEdit({ ...linkEdit, l: { ...linkEdit.l, enabled: v === true } })} />Enabled</label>
            <label className="flex items-center gap-2 rounded-md border p-2"><Checkbox data-testid="check-link-verified" checked={linkEdit.l.verified} onCheckedChange={(v) => setLinkEdit({ ...linkEdit, l: { ...linkEdit.l, verified: v === true } })} />Verified</label>
          </div>
          {linkEdit.l.kind === 'asset_network' && <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2 rounded-md border p-2"><Checkbox data-testid="check-link-native" checked={linkEdit.native} onCheckedChange={(v) => setLinkEdit({ ...linkEdit, native: v === true })} />Native coin</label>
            <label className="flex items-center gap-2 rounded-md border p-2"><Checkbox data-testid="check-link-memo" checked={linkEdit.memo} onCheckedChange={(v) => setLinkEdit({ ...linkEdit, memo: v === true })} />Memo required</label>
          </div>}
          {(LINK_FIELDS[linkEdit.l.kind] ?? []).map(([k, lab]) => <Field key={k} label={lab}><Input data-testid={`input-link-${k}`} value={linkEdit.m[k]} onChange={(e) => setLinkEdit({ ...linkEdit, m: { ...linkEdit.m, [k]: e.target.value } })} /></Field>)}
          <span className="hidden">{String(f.l.id)}</span>
        </>) : null}
      </EditDrawer>
      {confirmNode}
    </>
  );
}
