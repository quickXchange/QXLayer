import { Link } from 'wouter';
import { useListWhiteLabelRequests, getListWhiteLabelRequestsQueryKey } from '@workspace/api-client-react';
import { PageHeader, ErrorState, EmptyState, ListSkeleton } from '@/components/app/bits';
import { OrderStatus } from '@/components/customer/order-view';
import { orderRef } from '@/lib/wl';

export default function WhiteLabelRequests() {
  const q = useListWhiteLabelRequests({ query: { queryKey: getListWhiteLabelRequestsQueryKey(), refetchInterval: 10000, refetchOnWindowFocus: true } });
  const rows = q.data ?? [];
  return (
    <>
      <PageHeader eyebrow="Operator" title="White Label Orders" />
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState what="the order queue" onRetry={() => q.refetch()} /> : rows.length === 0 ? <EmptyState title="Queue is empty" body="Customer Exchange orders appear here." /> : (
        <div className="divide-y rounded-md border bg-card">{rows.map((x) => (
          <Link key={x.id} href={`/white-label-requests/${x.id}`} data-testid={`row-request-${x.id}`} className="grid gap-2 p-4 transition-colors hover:bg-muted/40 md:grid-cols-[120px_1.5fr_1fr_110px_130px_110px] md:items-center">
            <span className="font-mono text-xs text-copper">{orderRef(x)}</span>
            <span className="min-w-0"><span className="font-display block truncate text-xl">{x.projectName}</span><span className="block truncate text-xs text-muted-foreground">{x.brandName}{x.companyName ? ` · ${x.companyName}` : ''}</span></span>
            <span className="min-w-0 truncate text-xs text-muted-foreground">{x.customerUserId}{x.preferredDomain ? ` · ${x.preferredDomain}` : ''}</span>
            <span className="text-xs capitalize">{x.design?.type ?? 'standard'}</span>
            <OrderStatus status={x.status} />
            <span className="text-xs text-muted-foreground">{new Date(x.createdAt).toLocaleDateString()}</span>
          </Link>))}</div>)}
    </>
  );
}
