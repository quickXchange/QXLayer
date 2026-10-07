import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ErrorState, ListSkeleton } from '@/components/app/bits';
import { Chips, DataList, FilterSelect, NOT_RECORDED, Pager, Pill, SearchBox, usePaged, type Col } from './kit';
import { usePlatform, uniq, type PmAudit } from './platform';
import { stamp, label } from '@/lib/format';

const tone = (r: string | null) => (r == null ? undefined : /fail|denied|error|reject/i.test(r) ? 'bad' : /success|ok|allowed/i.test(r) ? 'ok' : 'warn') as 'ok' | 'bad' | 'warn' | undefined;

/** Last 500 recorded events: searchable and filterable. scope narrows to account or project facts. */
export function AuditList({ scope, id }: { scope?: (a: PmAudit) => boolean; id: string }) {
  const { pm, isLoading, isError, refetch } = usePlatform();
  const [s, setS] = useState(''); const [type, setType] = useState('all'); const [res, setRes] = useState('all'); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const base = useMemo(() => (pm?.audit ?? []).filter((a) => !scope || scope(a)), [pm, scope]);
  const list = useMemo(() => {
    const k = s.trim().toLowerCase();
    return base.filter((a) => (type === 'all' || a.eventType === type)
      && (res === 'all' || (res === 'unrecorded' ? a.result == null : a.result === res))
      && (!from || a.createdAt.slice(0, 10) >= from) && (!to || a.createdAt.slice(0, 10) <= to)
      && (!k || [a.actorId, a.tenantId, a.eventType, a.description, a.resource, a.result].some((v) => (v ?? '').toLowerCase().includes(k))));
  }, [base, s, type, res, from, to]);
  const pg = usePaged(list, `${s}|${type}|${res}|${from}|${to}`);
  if (isLoading) return <ListSkeleton />;
  if (isError || !pm) return <ErrorState what="recorded activity" onRetry={() => refetch()} />;
  const cols: Col<PmAudit>[] = [
    { key: 'd', header: 'Event', primary: true, cell: (a) => <span><span className="block text-sm">{a.description}</span><span className="font-mono text-[11px] text-muted-foreground">{label(a.eventType)}</span></span> },
    { key: 'a', header: 'Actor', cell: (a) => <span className="font-mono text-xs">{a.actorId}</span> },
    { key: 't', header: 'Project', cell: (a) => a.tenantId ? <span onClick={(e) => e.stopPropagation()}><Link href={`/clients/${a.tenantId}`} className="font-mono text-xs text-copper underline">{a.tenantId.slice(0, 8)}</Link></span> : NOT_RECORDED },
    { key: 'r', header: 'Resource', cell: (a) => a.resource ?? NOT_RECORDED },
    { key: 'x', header: 'Result', cell: (a) => a.result == null ? <Pill>Not recorded</Pill> : <Pill tone={tone(a.result)}>{a.result}</Pill> },
    { key: 'w', header: 'When', cell: (a) => <span className="whitespace-nowrap font-mono text-xs">{stamp(a.createdAt)}</span> },
  ];
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground" data-testid="note-audit-window">Showing the last 500 recorded events, not the full history. Resource and result show Not recorded when the event did not capture them.</p>
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox id={`audit-${id}`} value={s} onChange={setS} placeholder="Search actor, project, action, resource" />
        <FilterSelect id={`type-${id}`} label="Action" value={type} onChange={setType} options={[['all', 'All'], ...uniq(base.map((a) => a.eventType)).sort().map((x): [string, string] => [x, label(x)])]} />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">From<input type="date" aria-label="From date" className="h-10 rounded-md border bg-background px-2 text-sm text-foreground" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">To<input type="date" aria-label="To date" className="h-10 rounded-md border bg-background px-2 text-sm text-foreground" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <Chips id={`res-${id}`} value={res} onChange={setRes} options={[['all', 'Any result'], ['unrecorded', 'Not recorded'], ...uniq(base.map((a) => a.result ?? '').filter(Boolean)).map((x): [string, string] => [x, x])]} />
      <DataList id={`audit-${id}`} rows={pg.rows} cols={cols} rowKey={(a) => a.id} emptyTitle="No matching events" emptyBody="No recorded events match these filters." />
      {list.length > 0 && <Pager id={`audit-${id}`} p={pg} />}
    </div>
  );
}

export function TenantActivity({ tenantId }: { tenantId: string }) {
  const scope = useMemo(() => (a: PmAudit) => a.tenantId === tenantId, [tenantId]);
  return <AuditList id="tenant" scope={scope} />;
}
