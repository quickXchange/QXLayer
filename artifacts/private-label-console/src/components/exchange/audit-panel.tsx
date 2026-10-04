import { useState } from 'react';
import { useListExchangeAudit, getListExchangeAuditQueryKey } from '@workspace/api-client-react';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { stamp, label } from '@/lib/format';

export function AuditPanel({ tenantId }: { tenantId: string }) {
  const [page, setPage] = useState(1);
  const params = { page };
  const q = useListExchangeAudit(tenantId, params, { query: { queryKey: getListExchangeAuditQueryKey(tenantId, params) } });
  const rows = q.data?.events ?? [];
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState what="audit events" onRetry={() => q.refetch()} />;
  if (rows.length === 0) return <EmptyState title="No audit events" body="Administrative actions on this tenant will be recorded here." />;
  return (
    <div><p className="mb-3 text-xs text-muted-foreground">{q.data?.total ?? 0} tenant audit events · page {page}</p><ol className="relative ml-2 border-l">{rows.map((a) => (
      <li key={a.id} data-testid={`row-audit-${a.id}`} className="relative py-3 pl-6"><span className="absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full bg-copper" />
        <p className="text-sm">{a.description}</p><p className="mt-0.5 font-mono text-xs text-muted-foreground">{label(a.eventType)} · {stamp(a.createdAt)}</p>{a.actorId && <p className="mt-1 break-all text-xs text-muted-foreground">Actor: {a.actorId}</p>}</li>))}</ol>
      <div className="mt-5 flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>Previous</Button><Button variant="outline" disabled={page * 50 >= (q.data?.total ?? 0)} onClick={() => setPage(n => n + 1)}>Next</Button><Button variant="ghost" onClick={() => q.refetch()}>Refresh</Button></div></div>
  );
}
