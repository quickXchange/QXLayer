import { useState } from 'react';
import { useLocation } from 'wouter';
import { useListExchangeCustomers, getListExchangeCustomersQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { ago } from '@/lib/format';
import { PageBar, usePaged } from './manage';
import { ExSection } from './manage';
import { DataTable, FilterBar, NoMatch, useSelection } from './bulk';

export function CustomersPanel({ tenantId }: { tenantId: string }) {
  const [, nav] = useLocation();
  const [text, setText] = useState('');
  const q = useListExchangeCustomers(tenantId, { query: { queryKey: getListExchangeCustomersQueryKey(tenantId) } });
  const all = q.data ?? []; const tt = text.trim().toLowerCase();
  const filteredAll = all.filter((c) => !tt || c.name.toLowerCase().includes(tt) || (c.email ?? '').toLowerCase().includes(tt) || c.id.toLowerCase().includes(tt));
  const pg = usePaged(filteredAll, tt);
  const sel = useSelection(pg.pageRows.map(c => c.id));
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError || !q.data) return <ErrorState what="customers" onRetry={() => q.refetch()} />;
  const rows = pg.pageRows;
  return (
    <ExSection n="C" title="Customers" note="Read-only customer summaries and order history." footer={<PageBar p={pg} noun="customers" testid="customers" />}>
      <p className="rounded-md border p-3 text-sm text-muted-foreground" data-testid="text-customers-note">The sandbox deliberately collects no customer identity: no names or emails are captured at checkout. Orders are grouped into one Anonymous aggregate; the number of distinct visitors behind it is not known.</p>
      <FilterBar search={text} onSearch={setText} placeholder="Search customers" noun="customers" shown={filteredAll.length} total={all.length} onReset={() => setText('')} active={!!text} />
      {q.data.length === 0 ? <EmptyState title="No customers" body="Customers appear here once sandbox orders exist. Identified customers: 0." /> : rows.length === 0 ? <NoMatch noun="customers" onReset={() => setText('')} /> : <DataTable rows={rows} getId={c => c.id} sel={sel} testid="customer" readOnlyRows cols={[
        { h: 'Customer', cell: c => <span className="font-medium">{c.name}</span> },
        { h: 'Email', cell: () => <span className="text-muted-foreground">Not collected</span> },
        { h: 'Orders', cell: c => c.orders },
        { h: 'Last activity', cell: c => ago(c.lastActivity) },
        { h: 'Status', cell: c => <span className="capitalize">{c.status}</span> },
        { h: 'Actions', cell: c => <Button size="sm" variant="outline" data-testid={`button-customer-orders-${c.id}`} onClick={() => nav(`/clients/${tenantId}/exchange/orders?customer=anonymous`)}>View order history</Button> },
      ]} />}
    </ExSection>
  );
}
