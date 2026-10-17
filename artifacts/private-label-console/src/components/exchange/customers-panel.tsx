import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useListExchangeCustomers, getListExchangeCustomersQueryKey, getGetExchangeDashboardQueryKey, updateExchangeCustomer, useUpdateExchangeCustomer, type ExchangeCustomer } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { ago } from '@/lib/format';
import { PageBar, usePaged, NameList } from './manage';
import { ExSection } from './manage';
import { BulkBar, BulkBtn, DataTable, EditDrawer, FilterBar, NoMatch, useConfirm, useSelection } from './bulk';
import { Field, Pick } from './ui';

type C = ExchangeCustomer;
const isContact = (c: C) => c.status !== 'unidentified';

export function CustomersPanel({ tenantId, locked = false }: { tenantId: string; locked?: boolean }) {
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [ask, confirmNode] = useConfirm(locked);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState<C | null>(null);
  const q = useListExchangeCustomers(tenantId, { query: { queryKey: getListExchangeCustomersQueryKey(tenantId) } });
  const upd = useUpdateExchangeCustomer();
  const all = q.data ?? []; const tt = text.trim().toLowerCase();
  const filteredAll = all.filter((c) => (filter === 'all' || c.status === filter) && (!tt || c.name.toLowerCase().includes(tt) || (c.email ?? '').toLowerCase().includes(tt) || c.id.toLowerCase().includes(tt)));
  const pg = usePaged(filteredAll, `${tt}|${filter}`);
  const sel = useSelection(pg.pageRows.map(c => c.id));
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: getListExchangeCustomersQueryKey(tenantId) }), qc.invalidateQueries({ queryKey: getGetExchangeDashboardQueryKey(tenantId) })]); };
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError || !q.data) return <ErrorState what="customers" onRetry={() => q.refetch()} />;
  const rows = pg.pageRows;
  const reset = () => { setText(''); setFilter('all'); sel.clear(); };
  const label = (c: C) => `${c.name} (${c.email ?? c.id})`;
  const save = (v: C) => {
    const name = v.name.trim();
    if (!name || name.length > 120) { toast({ title: 'Name is required, up to 120 characters', variant: 'destructive' }); return; }
    if ((v.notes ?? '').length > 2000) { toast({ title: 'Notes are up to 2000 characters', variant: 'destructive' }); return; }
    setEdit(null);
    ask({ title: 'Save contact?', label: 'Save contact', body: <><p>Updates the display name and internal notes. Orders and financial records are not changed.</p><NameList names={[label(v)]} /></>,
      run: async () => { await upd.mutateAsync({ tenantId, customerId: v.id, data: { name, notes: v.notes ?? '', archived: v.status === 'archived' } }); await refresh(); toast({ title: 'Contact saved' }); return <p data-testid="text-confirm-result">Contact saved. No additional Exchange settings save is needed.</p>; } });
  };
  const bulk = (archive: boolean) => {
    const list = all.filter((c) => sel.ids.includes(c.id) && isContact(c) && (archive ? c.status !== 'archived' : c.status === 'archived'));
    if (!list.length) { toast({ title: `No contacts to ${archive ? 'archive' : 'unarchive'} in the selection`, variant: 'destructive' }); return; }
    ask({ title: `${archive ? 'Archive' : 'Unarchive'} ${list.length} contact${list.length === 1 ? '' : 's'}?`, label: archive ? 'Archive' : 'Unarchive', body: <><p>Only the contact record is affected. Orders, financial records and authentication accounts are never deleted. The anonymous aggregate is skipped.</p><NameList names={list.map(label)} /></>,
      run: async () => {
        const results = await Promise.allSettled(list.map((c) => updateExchangeCustomer(tenantId, c.id, { name: c.name, notes: c.notes ?? '', archived: archive })));
        await refresh(); sel.clear();
        const bad = results.filter((r) => r.status === 'rejected').length;
        if (bad) throw new Error(`${bad} of ${list.length} updates failed. The rest were applied.`);
        toast({ title: `${list.length} contact${list.length === 1 ? '' : 's'} ${archive ? 'archived' : 'unarchived'}` });
        return <p data-testid="text-confirm-result">{list.length} contact{list.length === 1 ? '' : 's'} {archive ? 'archived' : 'unarchived'} and saved. No orders or authentication accounts were deleted.</p>;
      } });
  };
  const contacts = all.filter(isContact).length;
  return (
    <ExSection n="C" title="Customers" note="Opted-in contacts and the anonymous aggregate, with order history." footer={<PageBar p={pg} noun="customers" testid="customers" />}>
      <p className="rounded-md border p-3 text-sm text-muted-foreground" data-testid="text-customers-note">Checkout is anonymous by default. A name and email appear here only when the visitor chose to share them with explicit permission. Contacts are not subscribed to marketing and no email is sent from here. Everyone else stays in one Anonymous aggregate, whose distinct visitors are not known.</p>
      <FilterBar search={text} onSearch={(v) => { sel.clear(); setText(v); }} placeholder="Search name, email or ID" noun="customers" shown={filteredAll.length} total={all.length} onReset={reset} active={!!text || filter !== 'all'}>
        <div className="w-40"><Pick testid="select-customer-filter" value={filter} onChange={(v) => { sel.clear(); setFilter(v); }} options={[['all', 'All customers'], ['contact', 'Contacts'], ['archived', 'Archived'], ['unidentified', 'Anonymous']]} /></div>
      </FilterBar>
      <BulkBar sel={sel} noun="customers" locked={locked} testid="customers">
        <BulkBtn sel={sel} locked={locked} testid="button-bulk-archive-customers" onClick={() => bulk(true)}>Archive</BulkBtn>
        <BulkBtn sel={sel} locked={locked} testid="button-bulk-unarchive-customers" onClick={() => bulk(false)}>Unarchive</BulkBtn>
      </BulkBar>
      {all.length === 0 ? <EmptyState title="No customers" body="Customers appear here once sandbox orders exist. Opted-in contacts: 0." /> : rows.length === 0 ? <NoMatch noun="customers" onReset={reset} /> : <DataTable rows={rows} getId={c => c.id} sel={sel} locked={locked} testid="customer" readOnlyRows cols={[
        { h: 'Customer', cell: c => <span className="flex flex-col"><span className="font-medium">{c.name}</span>{c.notes && <span className="max-w-[16rem] truncate text-xs text-muted-foreground">{c.notes}</span>}</span> },
        { h: 'Email', cell: c => c.email ? <span className="break-all">{c.email}</span> : <span className="text-muted-foreground">Not collected</span> },
        { h: 'Orders', cell: c => c.orders },
        { h: 'Last activity', cell: c => ago(c.lastActivity) },
        { h: 'Status', cell: c => <span className="capitalize">{c.status === 'unidentified' ? 'Anonymous' : c.status}</span> },
        { h: 'Actions', cell: c => <span className="flex flex-wrap gap-2">
          {isContact(c) && <Button size="sm" variant="outline" disabled={locked} data-testid={`button-edit-customer-${c.id}`} onClick={() => setEdit(c)}>Edit</Button>}
          <Button size="sm" variant="outline" data-testid={`button-customer-orders-${c.id}`} onClick={() => nav(`/clients/${tenantId}/exchange/orders?customer=${isContact(c) ? encodeURIComponent(c.id) : 'anonymous'}`)}>View order history</Button></span> },
      ]} />}
      <p className="text-xs text-muted-foreground">{contacts} opted-in contact{contacts === 1 ? '' : 's'}.</p>
      <EditDrawer item={edit} itemKey={edit?.id ?? ''} title={edit?.name || 'Contact'} note="Email is read-only. Archiving hides the contact from active lists; orders are kept." locked={locked} onClose={() => setEdit(null)} applyLabel="Review changes" onApply={save}>
        {(f, set) => (<>
          <Field label="Email"><Input value={f.email ?? ''} readOnly disabled /></Field>
          <Field label="Name"><Input maxLength={120} data-testid="input-customer-name" value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Internal notes"><Textarea maxLength={2000} data-testid="input-customer-notes" value={f.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">Archived<input type="checkbox" aria-label="Archived" checked={f.status === 'archived'} onChange={(e) => set({ status: e.target.checked ? 'archived' : 'contact' })} /></div>
        </>)}
      </EditDrawer>
      {confirmNode}
    </ExSection>
  );
}
