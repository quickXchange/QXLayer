import { useMemo, useState } from 'react';
import { useListWhiteLabelRequests, getListWhiteLabelRequestsQueryKey } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton } from '@/components/app/bits';
import { OrderStatus } from '@/components/customer/order-view';
import { Chips, DataList, Pager, SearchBox, usePaged, type Col } from '@/components/super-admin/kit';
import { ALL_STATUSES } from '@/components/super-admin/lifecycle';
import { orderRef, statusText, cash, type WlOrder } from '@/lib/wl';
import { ago } from '@/lib/format';

export default function WhiteLabelRequests() {
  const q = useListWhiteLabelRequests({ query: { queryKey: getListWhiteLabelRequestsQueryKey(), refetchInterval: 10000, refetchOnWindowFocus: true } });
  const [s, setS] = useState(''); const [f, setF] = useState('all');
  const all = q.data ?? [];
  const list = useMemo(() => {
    const k = s.trim().toLowerCase();
    return all.filter((o) => (f === 'all' || o.status === f) && (!k || [orderRef(o), o.projectName, o.brandName, o.companyName, o.customerUserId, o.preferredDomain, o.websiteName].some((v) => (v ?? '').toLowerCase().includes(k))));
  }, [all, s, f]);
  const pg = usePaged(list, `${s}|${f}`);
  const cols: Col<WlOrder>[] = [
    { key: 'p', header: 'Project', primary: true, cell: (o) => <span><span className="block font-display text-xl">{o.projectName}</span><span className="block text-xs text-muted-foreground">{o.brandName}{o.companyName ? ` / ${o.companyName}` : ''}</span></span> },
    { key: 'r', header: 'Reference', cell: (o) => <span className="font-mono text-xs text-copper">{orderRef(o)}</span> },
    { key: 'c', header: 'Customer', cell: (o) => <span className="font-mono text-xs">{o.customerUserId}</span> },
    { key: 'pl', header: 'Plan', cell: (o) => (o.approvedPlan ?? o.requestedPlan)?.name ?? 'None' },
    { key: 'pr', header: 'Quote', cell: (o) => cash(o.monthlyPrice, o.currency) },
    { key: 's', header: 'Status', cell: (o) => <OrderStatus status={o.status} /> },
    { key: 'u', header: 'Updated', cell: (o) => <span className="text-xs text-muted-foreground">{ago(o.updatedAt)}</span> },
  ];
  return (
    <>
      <PageHeader eyebrow="White Labels" title="White Label Orders" />
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState what="the order queue" onRetry={() => q.refetch()} /> : (
        <div className="space-y-4">
          <SearchBox id="orders" value={s} onChange={setS} placeholder="Search reference, project, brand, customer, domain" />
          <Chips id="orders" value={f} onChange={setF} options={[['all', `All (${all.length})`], ...ALL_STATUSES.map((x): [string, string] => [x, `${statusText(x)} (${all.filter((o) => o.status === x).length})`])]} />
          <DataList id="request" rows={pg.rows} cols={cols} rowKey={(o) => o.id} href={(o) => `/white-label-requests/${o.id}`} emptyTitle={all.length ? 'No matching orders' : 'Queue is empty'} emptyBody={all.length ? 'Adjust the search or status filter.' : 'Customer Exchange orders appear here.'} />
          {list.length > 0 && <Pager id="orders" p={pg} />}
        </div>)}
    </>
  );
}
