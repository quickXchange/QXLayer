import { useState } from 'react';
import { useListExchangeAudit, getListExchangeAuditQueryKey } from '@workspace/api-client-react';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { stamp, label } from '@/lib/format';

export function AuditPanel({ tenantId }: { tenantId: string }) {
  const [page, setPage] = useState(1);
  const params = { page };
  const q = useListExchangeAudit(tenantId, params, { query: { queryKey: getListExchangeAuditQueryKey(tenantId, params) } });
  const [text, setText] = useState(''); const [type, setType] = useState('all');
  const all = q.data?.events ?? [];
  const types = [...new Set(all.map((a) => a.eventType))];
  const rows = all.filter((a) => (type === 'all' || a.eventType === type) && `${a.description} ${a.actorId ?? ''} ${a.eventType}`.toLowerCase().includes(text.trim().toLowerCase()));
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState what="audit events" onRetry={() => q.refetch()} />;
  if (all.length === 0) return <EmptyState title="No audit events" body="Administrative actions on this tenant will be recorded here." />;
  return (
    <div><div className="mb-3 flex flex-wrap items-center gap-2"><Input className="w-full sm:w-64" data-testid="input-audit-search" placeholder="Filter this page by text or actor" value={text} onChange={(e) => setText(e.target.value)} /><select data-testid="select-audit-type" className="h-9 rounded-md border bg-background px-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}><option value="all">Any event type</option>{types.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>{(text || type !== 'all') && <Button size="sm" variant="ghost" onClick={() => { setText(''); setType('all'); }}>Reset filters</Button>}</div><p className="mb-3 text-xs text-muted-foreground">{rows.length} of {all.length} events on this page shown, {q.data?.total ?? 0} total · page {page}</p>{rows.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-nomatch-audit">No events on this page match the filters.</p>}<ol className="relative ml-2 border-l">{rows.map((a) => (
      <li key={a.id} data-testid={`row-audit-${a.id}`} className="relative py-3 pl-6"><span className="absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full bg-copper" />
        <p className="text-sm">{a.description}</p><p className="mt-0.5 font-mono text-xs text-muted-foreground">{label(a.eventType)} · {stamp(a.createdAt)}</p>{a.actorId && <p className="mt-1 break-all text-xs text-muted-foreground">Actor: {a.actorId}</p>}</li>))}</ol>
      <div className="mt-5 flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>Previous</Button><Button variant="outline" disabled={page * 50 >= (q.data?.total ?? 0)} onClick={() => setPage(n => n + 1)}>Next</Button><Button variant="ghost" onClick={() => q.refetch()}>Refresh</Button></div></div>
  );
}
