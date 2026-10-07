import { useState } from 'react';
import { useListExchangeAudit, getListExchangeAuditQueryKey } from '@workspace/api-client-react';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { stamp, label } from '@/lib/format';
import { ExSection } from './manage';
import { FilterBar, NoMatch } from './bulk';
import { Pick } from './ui';

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
  return (
    <ExSection n="A" title="Activity / Audit" note="Read-only administrative history. Search and event-type filters apply to the current page." footer={<div className="flex flex-wrap items-center gap-2"><span className="mr-auto text-xs text-muted-foreground">{q.data?.total ?? 0} events · page {page}</span><Button variant="outline" disabled={page <= 1 || q.isFetching} onClick={() => setPage(n => n - 1)}>Previous</Button><Button variant="outline" disabled={q.isFetching || page * 50 >= (q.data?.total ?? 0)} onClick={() => setPage(n => n + 1)}>Next</Button><Button variant="ghost" onClick={() => q.refetch()}>Refresh</Button></div>}>
      <FilterBar noun="audit events" search={text} onSearch={setText} placeholder="Search this page by text or actor" shown={rows.length} total={all.length} onReset={() => { setText(''); setType('all'); }} active={!!text || type !== 'all'}><div className="w-48"><Pick testid="select-audit-type" value={type} onChange={setType} options={[['all', 'Any event type'], ...types.map(t => [t, label(t)] as [string, string])]} /></div></FilterBar>
      {!all.length ? <EmptyState title="No audit events" body="Administrative actions on this tenant will be recorded here." /> : !rows.length ? <NoMatch noun="audit events" onReset={() => { setText(''); setType('all'); }} /> : null}
      <ol className="relative ml-2 border-l">{rows.map((a) => (
      <li key={a.id} data-testid={`row-audit-${a.id}`} className="relative py-3 pl-6"><span className="absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full bg-copper" />
        <p className="break-words text-sm">{a.description}</p><p className="mt-0.5 font-mono text-xs text-muted-foreground">{label(a.eventType)} · {stamp(a.createdAt)}</p>{a.actorId && <p className="mt-1 break-all text-xs text-muted-foreground">Actor: {a.actorId}</p>}</li>))}</ol>
    </ExSection>
  );
}
