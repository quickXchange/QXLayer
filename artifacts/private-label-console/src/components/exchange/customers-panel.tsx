import { useState } from 'react';
import { useLocation } from 'wouter';
import { useListExchangeCustomers, getListExchangeCustomersQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { ago } from '@/lib/format';

export function CustomersPanel({ tenantId }: { tenantId: string }) {
  const [, nav] = useLocation();
  const [text, setText] = useState('');
  const q = useListExchangeCustomers(tenantId, { query: { queryKey: getListExchangeCustomersQueryKey(tenantId) } });
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError || !q.data) return <ErrorState what="customers" onRetry={() => q.refetch()} />;
  const t = text.trim().toLowerCase();
  const rows = q.data.filter((c) => !t || c.name.toLowerCase().includes(t) || (c.email ?? '').toLowerCase().includes(t) || c.id.toLowerCase().includes(t));
  return (
    <div className="space-y-4">
      <p className="rounded-md border p-3 text-sm text-muted-foreground" data-testid="text-customers-note">The sandbox deliberately collects no customer identity: no names or emails are captured at checkout. Orders are grouped into one Anonymous aggregate; the number of distinct visitors behind it is not known.</p>
      <Input data-testid="input-customer-search" className="max-w-xs" placeholder="Search customers" value={text} onChange={(e) => setText(e.target.value)} />
      {q.data.length === 0 ? <EmptyState title="No customers" body="Customers appear here once sandbox orders exist. Identified customers: 0." /> : rows.length === 0 ? <EmptyState title="No match" body="No customer summary matches this search." /> : (
        <div className="overflow-x-auto rounded-md border bg-card"><table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{['Customer', 'Email', 'Orders', 'Last activity', 'Status', ''].map((h) => <th key={h} className="px-3 py-2 font-normal">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{rows.map((c) => (
            <tr key={c.id} data-testid={`row-customer-${c.id}`}><td className="px-3 py-2 font-medium">{c.name}</td><td className="px-3 py-2 text-xs text-muted-foreground">Not collected</td><td className="px-3 py-2 font-mono text-xs">{c.orders}</td><td className="px-3 py-2 font-mono text-xs">{ago(c.lastActivity)}</td><td className="px-3 py-2 text-xs capitalize">{c.status}</td>
              <td className="px-3 py-2"><Button size="sm" variant="outline" data-testid={`button-customer-orders-${c.id}`} onClick={() => nav(`/clients/${tenantId}/exchange/orders?customer=anonymous`)}>View order history</Button></td></tr>))}</tbody></table></div>)}
    </div>
  );
}
