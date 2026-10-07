import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetExchangeConfigurationQueryKey, getGetTenantQueryKey, useListSandboxAssetNetworks, useUpdateTenantAssetsNetworks } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/app/sections';
import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useInvalidateTenant } from '@/lib/invalidate';
import { useConfirm } from './bulk';

export const PAGE_SIZES = [10, 25, 50];

/** Client-side pagination for configuration tables. Resets to page 1 whenever resetKey changes. */
export function usePaged<T>(rows: T[], resetKey: string, size = 10) {
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(size);
  useEffect(() => setPage(1), [resetKey, pageSize]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages);
  const pageRows = useMemo(() => rows.slice((cur - 1) * pageSize, cur * pageSize), [rows, cur, pageSize]);
  return { page: cur, pages, pageSize, setPage, setPageSize, pageRows, total: rows.length };
}

export function PageBar({ p, noun, testid }: { p: ReturnType<typeof usePaged>; noun: string; testid: string }) {
  if (p.total <= PAGE_SIZES[0]) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2" data-testid={`pagination-${testid}`}>
      <span className="font-mono text-xs text-muted-foreground">{p.total} {noun}, page {p.page} of {p.pages}</span>
      <div className="flex items-center gap-2">
        <select aria-label="Rows per page" data-testid={`select-pagesize-${testid}`} className="h-8 rounded-md border bg-background px-2 text-xs" value={p.pageSize} onChange={(e) => p.setPageSize(Number(e.target.value))}>{PAGE_SIZES.map((n) => <option key={n} value={n}>{n} per page</option>)}</select>
        <Button type="button" size="sm" variant="outline" data-testid={`button-prev-${testid}`} disabled={p.page <= 1} onClick={() => p.setPage(p.page - 1)}>Previous</Button>
        <Button type="button" size="sm" variant="outline" data-testid={`button-next-${testid}`} disabled={p.page >= p.pages} onClick={() => p.setPage(p.page + 1)}>Next</Button>
      </div>
    </div>
  );
}

const show = (v: unknown) => (v === null || v === undefined || v === '' ? 'not set' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Bounded review list of fields that differ. */
export function DiffList({ before, after, max = 14 }: { before: object; after: object; max?: number }) {
  const [expanded, setExpanded] = useState(false);
  const b = before as Record<string, unknown>; const a = after as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
  if (keys.length === 0) return <p>No field differs from the current draft.</p>;
  return <div><ul className="max-h-48 overflow-y-auto font-mono text-xs" data-testid="review-diff">{(expanded ? keys : keys.slice(0, max)).map((k) => <li key={k} className="break-all">{k}: {show(b[k])} to {show(a[k])}</li>)}</ul>{keys.length > max && <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer fields' : `Review all ${keys.length} changed fields`}</Button>}</div>;
}

/** Bounded list of names for review dialogs. */
export function NameList({ names, max = 12 }: { names: string[]; max?: number }) {
  const [expanded, setExpanded] = useState(false);
  return <div><ul className="max-h-40 overflow-y-auto font-mono text-xs">{(expanded ? names : names.slice(0, max)).map((n, i) => <li key={`${n}-${i}`}>{n}</li>)}</ul>{names.length > max && <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer records' : `Review all ${names.length} affected records`}</Button>}</div>;
}

/** Persists the tenant asset/network assignment via the existing endpoint, then refreshes configuration. */
export function useSetAssignments(tenantId: string) {
  const qc = useQueryClient(); const inv = useInvalidateTenant(); const m = useUpdateTenantAssetsNetworks();
  return async (ids: string[]) => {
    const tenant = await m.mutateAsync({ tenantId, data: { assetNetworkIds: ids } });
    qc.setQueryData(getGetTenantQueryKey(tenantId), tenant);
    await qc.invalidateQueries({ queryKey: getGetExchangeConfigurationQueryKey(tenantId) });
    inv(tenantId);
  };
}

export const REMOVE_NOTE = 'Assignment changes are saved immediately through the existing tenant assignment endpoint. Removing an assignment removes that tenant selection, not the global catalog definition. Obsolete asset, network and route settings are then removed from the local configuration draft and need one final Save exchange settings. Discard does not undo the already-saved assignment change.';

export function DraftConflict({ dirty }: { dirty: boolean }) {
  if (!dirty) return null;
  return <p className="rounded-md border border-copper/40 bg-copper/10 px-3 py-2 text-xs" data-testid="text-assign-conflict">There are unsaved exchange changes. Save or discard them before changing assignments, so they are not reset.</p>;
}

/** Bounded, searchable assignment of catalog networks. assetId scopes to one asset. */
export function NetworkAssigner({ routeRefs, open, tenantId, assigned, assetId, title, locked, dirty, onClose }: { routeRefs?: (ids: string[]) => string[]; open: boolean; tenantId: string; assigned: string[]; assetId?: string; title: string; locked: boolean; dirty: boolean; onClose: () => void }) {
  const cat = useListSandboxAssetNetworks();
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full max-w-none overflow-y-auto sm:max-w-lg" data-testid="drawer-assign">
        {open && <AssignerBody routeRefs={routeRefs} key={`${assetId ?? 'all'}`} tenantId={tenantId} assigned={assigned} assetId={assetId} title={title} locked={locked} dirty={dirty} onClose={onClose} loading={cat.isLoading} failed={cat.isError} retry={() => cat.refetch()} items={cat.data?.assets ?? []} />}
      </SheetContent>
    </Sheet>
  );
}

type Item = { assetNetworkId?: string; assetId: string; networkId: string; symbol: string; name: string; networkName: string; testnet: boolean };

function AssignerBody({ routeRefs, tenantId, assigned, assetId, title, locked, dirty, onClose, items, loading, failed, retry }: { routeRefs?: (ids: string[]) => string[]; tenantId: string; assigned: string[]; assetId?: string; title: string; locked: boolean; dirty: boolean; onClose: () => void; items: Item[]; loading: boolean; failed: boolean; retry: () => void }) {
  const [ask, node] = useConfirm(locked || dirty); const apply = useSetAssignments(tenantId);
  const rows = useMemo(() => items.map((i) => ({ ...i, id: i.assetNetworkId ?? `${i.assetId}:${i.networkId}` })).filter((i) => !assetId || i.assetId === assetId), [items, assetId]);
  const scopeIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(assigned));
  const [q, setQ] = useState('');
  const filtered = rows.filter((r) => `${r.symbol} ${r.name} ${r.networkName} ${r.testnet ? 'testnet' : 'mainnet'}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pg = usePaged(filtered, `${q}|${assetId ?? ''}`, 25); const shown = pg.pageRows;
  const inScope = (s: Set<string>) => [...s].filter((i) => scopeIds.has(i));
  const toggle = (id: string, on: boolean) => setPicked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const bulk = (ids: string[], on: boolean) => setPicked((s) => { const n = new Set(s); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; });
  const nameOf = (id: string) => { const r = rows.find((x) => x.id === id); return r ? `${r.symbol} on ${r.networkName}` : id; };
  const added = inScope(picked).filter((i) => !assigned.includes(i));
  const removed = assigned.filter((i) => scopeIds.has(i) && !picked.has(i));
  const review = () => { const blockers = routeRefs?.(removed) ?? []; ask({
    readOnly: blockers.length > 0,
    title: `Apply ${added.length + removed.length} assignment change${added.length + removed.length === 1 ? '' : 's'}?`, destructive: removed.length > 0, label: 'Save assignments',
    body: <><p>{REMOVE_NOTE}</p><p>Assign ({added.length}):</p><NameList names={added.map(nameOf)} /><p>Remove ({removed.length}):</p><NameList names={removed.map(nameOf)} />{blockers.length > 0 && <div className="rounded-md border border-destructive/40 p-2 text-destructive" data-testid="text-route-blockers"><p>Blocked: {blockers.length} route(s) still use these networks. Delete or retarget them in Routes, save, then remove.</p><NameList names={blockers} /></div>}<p>After removal, stale asset, network and route settings are cleaned from the draft and need one final Save.</p></>,
    run: async () => { await apply([...assigned.filter((i) => !scopeIds.has(i)), ...inScope(picked)]); onClose(); return <p data-testid="text-assign-result">Assignments saved. {added.length} assigned, {removed.length} removed.</p>; },
  }); };
  return (
    <>
      <SheetHeader><SheetTitle className="font-display text-2xl">{title}</SheetTitle><SheetDescription>Assign or remove catalog networks for this tenant. Network type (mainnet or testnet) is catalog data; execution is always sandbox.</SheetDescription></SheetHeader>
      <div className="mt-4 space-y-3">
        <DraftConflict dirty={dirty} />
        {loading ? <p className="text-sm text-muted-foreground">Loading catalog</p> : failed ? <p className="text-sm text-destructive">Catalog failed to load. <button type="button" className="underline" onClick={retry}>Retry</button></p> : (
          <>
            <Input aria-label="Search networks" data-testid="input-search-assign" placeholder="Search asset, network or type" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Button type="button" size="sm" variant="outline" data-testid="button-assign-select-all" disabled={locked || filtered.length === 0} onClick={() => bulk(filtered.map((r) => r.id), true)}>Select all {filtered.length} filtered</Button>
              <Button type="button" size="sm" variant="ghost" data-testid="button-assign-clear" disabled={locked} onClick={() => bulk(filtered.map((r) => r.id), false)}>Deselect filtered</Button>
              <span className="ml-auto font-mono text-muted-foreground" data-testid="text-assign-count">{inScope(picked).length} of {rows.length} assigned</span>
            </div>
            <ul className="max-h-[50dvh] divide-y overflow-y-auto rounded-md border bg-card" data-testid="list-assign">
              {shown.map((r) => (
                <li key={r.id} className="flex items-center gap-3 p-2 text-sm">
                  <Checkbox aria-label={`Assign ${r.symbol} on ${r.networkName}`} disabled={locked} checked={picked.has(r.id)} onCheckedChange={(v) => toggle(r.id, v === true)} />
                  <span className="min-w-0 flex-1 truncate"><span className="font-mono text-xs">{r.symbol}</span> <span className="text-muted-foreground">on</span> {r.networkName}</span>
                  <span className="font-mono text-[10px] uppercase text-copper">{r.testnet ? 'testnet' : 'mainnet'}</span>
                  <Switch aria-label="Assigned" disabled={locked} checked={picked.has(r.id)} onCheckedChange={(v) => toggle(r.id, v)} />
                </li>))}
              {shown.length === 0 && <li className="p-3 text-sm text-muted-foreground">No networks match this search.</li>}
            </ul>
            <PageBar p={pg} noun="networks" testid="assign" />
          </>)}
      </div>
      <SheetFooter className="mt-6 gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="button" data-testid="button-assign-review" disabled={locked || dirty || added.length + removed.length === 0} onClick={review}>Review {added.length + removed.length} change{added.length + removed.length === 1 ? '' : 's'}</Button></SheetFooter>
      {node}
    </>
  );
}

export function ManageHeader({ children }: { children?: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2" data-testid="manage-actions">{children}</div>;
}

/** Exchange-only section wrapper: consistent card, header and overflow guard around the shared Section. */
export function ExSection(props: ComponentProps<typeof Section>) {
  return <div className="min-w-0 max-w-full space-y-4 [&>section>header>div]:min-w-0 [&>section>footer]:flex-wrap [&>section>footer>span]:min-w-0 [&>section>footer>span]:break-words" data-testid="exchange-section"><Section {...props} /></div>;
}
