import { useMemo, useState } from 'react';
import { Plug } from 'lucide-react';
import { PageHeader, ErrorState, ListSkeleton } from '@/components/app/bits';
import { Chips, DataList, Pager, Pill, SearchBox, usePaged, type Col } from '@/components/super-admin/kit';
import { usePlatform, type PmProvider } from '@/components/super-admin/platform';
import { label } from '@/lib/format';

const avail = (p: PmProvider) => p.status === 'sandbox' ? 'Sandbox' : p.status === 'configuration_only' ? 'Metadata only' : p.status === 'coming_soon' ? 'Planned' : label(p.status);

export default function Providers() {
  const { pm, isLoading, isError, refetch } = usePlatform();
  const [s, setS] = useState(''); const [f, setF] = useState('all');
  const all = pm?.providers ?? [];
  const list = useMemo(() => { const k = s.trim().toLowerCase(); return all.filter((p) => (f === 'all' || p.status === f) && (!k || [p.name, p.id, p.category, ...p.capabilities].some((v) => v.toLowerCase().includes(k)))); }, [all, s, f]);
  const pg = usePaged(list, `${s}|${f}`);
  const cols: Col<PmProvider>[] = [
    { key: 'n', header: 'Provider', primary: true, cell: (p) => <span className="flex items-center gap-2.5">{p.logoUrl ? <img src={p.logoUrl} alt="" className="h-8 w-8 rounded object-contain" /> : <span className="grid h-8 w-8 place-items-center rounded border text-muted-foreground"><Plug className="h-4 w-4" /></span>}<span><span className="block font-display text-lg">{p.name}</span><span className="font-mono text-xs text-muted-foreground">{p.id}</span></span></span> },
    { key: 'c', header: 'Category', cell: (p) => label(p.category) },
    { key: 'k', header: 'Capabilities', cell: (p) => p.capabilities.length ? p.capabilities.map(label).join(', ') : 'None listed' },
    { key: 'a', header: 'Availability', cell: (p) => <Pill tone={p.status === 'sandbox' ? 'ok' : 'warn'}>{avail(p)}</Pill> },
    { key: 'i', header: 'Implemented', cell: (p) => p.implemented ? 'Sandbox simulation' : 'No' },
    { key: 'x', header: 'Connection', cell: () => <Pill>Not connected</Pill> },
  ];
  return (
    <>
      <PageHeader eyebrow="Platform" title="Providers" />
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground" data-testid="note-providers">Catalog metadata only. No provider is connected, and no credentials are stored or shown here.</p>
      {isLoading ? <ListSkeleton /> : isError || !pm ? <ErrorState what="the provider catalog" onRetry={() => refetch()} /> : (
        <div className="space-y-4">
          <SearchBox id="providers" value={s} onChange={setS} placeholder="Search provider, category, capability" />
          <Chips id="providers" value={f} onChange={setF} options={[['all', `All (${all.length})`], ...Array.from(new Set(all.map((p) => p.status))).map((x): [string, string] => [x, avail({ status: x } as PmProvider)])]} />
          <DataList id="provider" rows={pg.rows} cols={cols} rowKey={(p) => p.id} emptyTitle="No providers" emptyBody="No provider matches." />
          {list.length > 0 && <Pager id="providers" p={pg} />}
        </div>)}
    </>
  );
}
