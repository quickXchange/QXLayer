import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useListTenantResources, getListTenantResourcesQueryKey, useSetStaffPermissions, useRemoveTenantResource, type ResourceItem, type StaffPermissionsPermissionsItem } from '@workspace/api-client-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ExSection as Section, PageBar, usePaged } from './manage';
import { ErrorState, ListSkeleton } from '@/components/app/bits';
import { Pick } from './ui';
import { BulkBar, BulkBtn, DataTable, EditDrawer, FilterBar, NoMatch, useConfirm, useSelection } from './bulk';

const PERMS: [StaffPermissionsPermissionsItem, string][] = [['branding.manage', 'Brand and website'], ['domains.manage', 'Domain'], ['configuration.manage', 'Exchange configuration'], ['resources.manage', 'Resources']];
const same = (a: string[], b: string[]) => [...a].sort().join() === [...b].sort().join();

export function StaffPanel({ tenantId, canEdit }: { tenantId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const q = useListTenantResources(tenantId, 'staff');
  const setPerms = useSetStaffPermissions(); const remove = useRemoveTenantResource();
  const [ask, confirmNode] = useConfirm(!canEdit);
  const [text, setText] = useState(''); const [st, setSt] = useState('all'); const [pf, setPf] = useState('all');
  const [edit, setEdit] = useState<{ perms: StaffPermissionsPermissionsItem[] } | null>(null);
  const [target, setTarget] = useState<string[] | null>(null);
  const items: ResourceItem[] = q.data ?? [];
  const rows = items.filter((s) => (st === 'all' || s.status === st) && (pf === 'all' || (pf === 'none' ? (s.permissions ?? []).length === 0 : (s.permissions ?? []).includes(pf))) && `${s.label} ${s.reference ?? ''}`.toLowerCase().includes(text.trim().toLowerCase()));
  const eligible = (s: ResourceItem) => s.status === 'active';
  const pg = usePaged(rows, `${text}|${st}|${pf}`);
  const sel = useSelection(pg.pageRows.filter(eligible).map((s) => s.id));
  const resetF = () => { setText(''); setSt('all'); setPf('all'); };
  const nameOf = (id: string) => items.find((s) => s.id === id)?.label ?? id;
  const fresh = () => qc.invalidateQueries({ queryKey: getListTenantResourcesQueryKey(tenantId, 'staff') });
  const [failed, setFailed] = useState<string[]>([]);

  const results = (verb: string, ok: string[], bad: [string, string][]) => (
    <div className="space-y-2" data-testid="text-staff-result">
      <p>{ok.length} succeeded, {bad.length} failed. Saved on the server; the staff list was refreshed.</p>
      {ok.length > 0 && <ul className="text-xs">{ok.map((i) => <li key={i}>{verb}: {nameOf(i)} ({i})</li>)}</ul>}
      {bad.length > 0 && <><p className="font-medium text-destructive">Failed (kept selected for retry):</p><ul className="break-all text-xs text-destructive">{bad.map(([i, e]) => <li key={i}>{nameOf(i)} ({i}): {e}</li>)}</ul></>}
    </div>
  );
  const runEach = async (ids: string[], verb: string, fn: (id: string) => Promise<unknown>) => {
    const ok: string[] = []; const bad: [string, string][] = [];
    for (const id of ids) { try { await fn(id); ok.push(id); } catch (e) { bad.push([id, (e as Error)?.message ?? 'rejected']); } }
    await fresh(); setFailed(bad.map(([i]) => i));
    sel.clear(); bad.forEach(([i]) => sel.toggle(i));
    return results(verb, ok, bad);
  };
  const review = (ids: string[], perms: StaffPermissionsPermissionsItem[]) => ask({
    title: `Replace access for ${ids.length} staff member${ids.length === 1 ? '' : 's'}?`, label: 'Replace access',
    destructive: ids.some((id) => (items.find((s) => s.id === id)?.permissions ?? []).some((permission) => !perms.includes(permission as StaffPermissionsPermissionsItem))),
    body: <><p>Each member's grants are replaced (not merged) with: <b>{perms.length ? perms.map((p) => PERMS.find((x) => x[0] === p)?.[1]).join(', ') : 'no grants (read-only)'}</b>. Applied on the server immediately; there is no staging step here.</p>
      <ul className="text-xs">{ids.map((i) => { const cur = items.find((s) => s.id === i)?.permissions ?? []; return <li key={i}>{nameOf(i)} ({i}): {cur.join(', ') || 'none'}{same(cur, perms) ? ' (unchanged)' : ''}</li>; })}</ul></>,
    run: () => runEach(ids, 'Access replaced', (id) => setPerms.mutateAsync({ tenantId, userId: id, data: { permissions: perms } })),
  });
  const revoke = (ids: string[]) => ask({
    title: `Revoke access for ${ids.length} staff member${ids.length === 1 ? '' : 's'}?`, destructive: true, label: 'Revoke access',
    body: <><p>These staff lose all access to this tenant immediately. They can be re-added later from a known Clerk user ID, which restores them as read-only.</p><ul className="text-xs">{ids.map((i) => <li key={i}>{nameOf(i)} ({i})</li>)}</ul></>,
    run: () => runEach(ids, 'Revoked', (id) => remove.mutateAsync({ tenantId, resourceType: 'staff', resourceId: id })),
  });

  return (
    <Section n="R0" title="Staff access" note="Staff are read-only until granted a section. The server enforces every grant." footer={canEdit ? <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Tenant Admin only</span> : <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Read only for your role, plan or demo</span>}>
      <p className="rounded-md border border-copper/40 bg-copper/10 px-3 py-2 text-xs" data-testid="text-staff-protected">The Owner and client Admin roles are protected: they are not listed here and cannot be edited, promoted, demoted or revoked from this panel. Plan and suspension rules still apply. Only active staff are listed. Use Revoke access to remove staff access, or re-add a staff member from a known Clerk ID below to restore read-only access.</p>
      {q.isLoading ? <ListSkeleton rows={3} /> : q.isError ? <ErrorState what="staff" onRetry={() => q.refetch()} /> : items.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-staff">No staff to manage. Add staff below.</p> : (
        <>
          <FilterBar noun="staff" search={text} onSearch={setText} placeholder="Search name or reference" shown={rows.length} total={items.length} onReset={resetF} active={text !== '' || st !== 'all' || pf !== 'all'}>
            <div className="w-32"><Pick testid="select-staff-status" value={st} onChange={setSt} options={[['all', 'Listed staff'], ['active', 'Active']]} /></div>
            <div className="w-48"><Pick testid="select-staff-permission" value={pf} onChange={setPf} options={[['all', 'Any permission'], ['none', 'No grants'], ...PERMS.map(([k, l]) => [k, l] as [string, string])]} /></div>
          </FilterBar>
          <BulkBar sel={sel} noun="staff" locked={!canEdit} testid="staff">
            <BulkBtn sel={sel} locked={!canEdit} testid="button-bulk-staff-access" onClick={() => { setTarget(sel.ids); setEdit({ perms: [] }); }}>Replace access</BulkBtn>
            <BulkBtn destructive sel={sel} locked={!canEdit} testid="button-bulk-staff-revoke" onClick={() => revoke(sel.ids)}>Revoke access</BulkBtn>
          </BulkBar>
          {failed.length > 0 && <p className="text-xs text-destructive" data-testid="text-staff-failed">{failed.length} failed row(s) remain selected for retry.</p>}
          {rows.length === 0 ? <NoMatch noun="staff" onReset={resetF} /> : <><DataTable testid="staff" rows={pg.pageRows} getId={(s) => s.id} sel={sel} locked={!canEdit} cols={[
            { h: 'Name', cell: (s) => <span className="font-medium">{s.label}</span> },
            { h: 'Reference', cell: (s) => <span className="break-all font-mono text-xs">{s.reference ?? s.id}</span> },
            { h: 'Status', cell: (s) => <span className="font-mono text-[10px] uppercase">{s.status}{!eligible(s) ? ' (not selectable)' : ''}</span> },
            { h: 'Grants', cell: (s) => <span className="text-xs">{(s.permissions ?? []).map((p) => PERMS.find((x) => x[0] === p)?.[1] ?? p).join(', ') || 'None (read-only)'}</span> },
            { h: 'Edit', cell: (s) => <Button size="sm" variant="outline" disabled={!canEdit || !eligible(s)} data-testid={`button-edit-staff-${s.id}`} onClick={() => { setTarget([s.id]); setEdit({ perms: [...(s.permissions ?? [])] as StaffPermissionsPermissionsItem[] }); }}>Edit access</Button> },
          ]} /><PageBar p={pg} noun="staff" testid="staff" /></>}
        </>)}
      <EditDrawer item={edit} itemKey={(target ?? []).join(',')} title={`Replace access: ${target?.length ?? 0} staff`} note="Replaces each member's grants. You review the result before it is applied." locked={!canEdit} onClose={() => setEdit(null)} applyLabel="Review changes" onApply={(v) => { const ids = target ?? []; setEdit(null); review(ids, v.perms); }}>
        {(f, set) => <div className="space-y-2">{PERMS.map(([p, l]) => <label key={p} className="flex items-center gap-2 text-sm"><Checkbox data-testid={`checkbox-bulk-grant-${p}`} checked={f.perms.includes(p)} onCheckedChange={() => set({ perms: f.perms.includes(p) ? f.perms.filter((x) => x !== p) : [...f.perms, p] })} />{l}</label>)}<p className="text-xs text-muted-foreground">Leave all unchecked to make selected staff read-only.</p></div>}
      </EditDrawer>
      {confirmNode}
    </Section>
  );
}
