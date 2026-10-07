import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { PageHeader, ErrorState, ListSkeleton, StatusBadge } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { Chips, DataList, Pager, Pill, SearchBox, usePaged, type Col } from '@/components/super-admin/kit';
import { usePlatform, type PmCustomer } from '@/components/super-admin/platform';
import { useCan } from '@/lib/principal';
import { ago } from '@/lib/format';

export default function Clients() {
  const { pm, isLoading, isError, refetch } = usePlatform(); const can = useCan();
  const [s, setS] = useState(''); const [f, setF] = useState('all');
  const all = pm?.customers ?? [];
  const statuses = Array.from(new Set(all.map((c) => c.status)));
  const list = useMemo(() => { const k = s.trim().toLowerCase(); return all.filter((c) => (f === 'all' || c.status === f) && (!k || [c.name, c.email, c.id, ...c.tenantIds].some((v) => (v ?? '').toLowerCase().includes(k)))); }, [all, s, f]);
  const pg = usePaged(list, `${s}|${f}`);
  const cols: Col<PmCustomer>[] = [
    { key: 'n', header: 'Account', primary: true, cell: (c) => <span><span className="block font-display text-lg">{c.name || 'Unnamed account'}</span><span className="block text-xs text-muted-foreground">{c.email ?? 'No email recorded'}</span></span> },
    { key: 'i', header: 'Account ID', cell: (c) => <span className="font-mono text-xs">{c.id}</span> },
    { key: 's', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { key: 't', header: 'White Labels', cell: (c) => c.tenantIds.length },
    { key: 'c', header: 'Created', cell: (c) => <span className="text-xs text-muted-foreground">{c.createdAt ? ago(c.createdAt) : 'Not recorded'}</span> },
  ];
  return (
    <>
      <PageHeader eyebrow="White Labels" title="Clients">{can.createClients && <Button asChild data-testid="link-new-client"><Link href="/clients/new">New client</Link></Button>}</PageHeader>
      {isLoading ? <ListSkeleton /> : isError || !pm ? <ErrorState what="the account directory" onRetry={() => refetch()} /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm" data-testid="text-customer-total">
            {pm.directoryAvailable && pm.customerTotal != null ? <span><span className="font-display text-3xl">{pm.customerTotal ?? 'Unavailable'}</span> registered accounts <span className="text-xs text-muted-foreground">({all.length} identities listed, including historical linked ones)</span></span> : <><span className="font-display text-3xl">Unavailable</span><Pill tone="bad">Directory unavailable</Pill></>}
          </div>
          {!pm.directoryAvailable && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" data-testid="text-directory-error">The account directory could not be read ({pm.directoryError ?? 'no reason recorded'}). The list below shows only accounts linked to projects or orders and is not a customer total.</p>}
          <SearchBox id="clients" value={s} onChange={setS} placeholder="Search name, email, account ID, project" />
          {statuses.length > 1 && <Chips id="clients" value={f} onChange={setF} options={[['all', `All (${all.length})`], ...statuses.map((x): [string, string] => [x, `${x} (${all.filter((c) => c.status === x).length})`])]} />}
          <DataList id="client" rows={pg.rows} cols={cols} rowKey={(c) => c.id} href={(c) => `/customers/${c.id}`} emptyTitle="No accounts" emptyBody="Registered customer accounts appear here." />
          {list.length > 0 && <Pager id="clients" p={pg} />}
        </div>)}
    </>
  );
}
