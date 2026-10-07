import { useMemo, useState } from 'react';
import { Plug, Plus } from 'lucide-react';
import { useGetProviderFoundation, getGetProviderFoundationQueryKey, type ProviderDefinition } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton } from '@/components/app/bits';
import { DataList, FilterSelect, Pager, Pill, SearchBox, usePaged, type Col } from '@/components/super-admin/kit';
import { Button } from '@/components/ui/button';
import { useCan } from '@/lib/principal';
import { label } from '@/lib/format';
import { DetailDrawer } from '@/components/providers/detail-drawer';
import { StatusPill, STATUS_OPTIONS } from '@/components/providers/shared';

export default function Providers() {
  const q = useGetProviderFoundation({ query: { queryKey: getGetProviderFoundationQueryKey(), refetchInterval: 30000 } });
  const canEdit = useCan().role === 'super_admin';
  const [s, setS] = useState(''); const [cat, setCat] = useState('all'); const [cap, setCap] = useState('all'); const [st, setSt] = useState('all');
  const [open, setOpen] = useState<string | 'new' | null>(null);
  const f = q.data;
  const all = f?.providers ?? [];
  const list = useMemo(() => { const k = s.trim().toLowerCase(); return all.filter((p) => (cat === 'all' || p.categories.includes(cat)) && (cap === 'all' || p.capabilities.includes(cap)) && (st === 'all' || p.status === st) && (!k || [p.name, p.id, ...p.categories, ...p.capabilities, ...p.services].some((v) => v.toLowerCase().includes(k)))); }, [all, s, cat, cap, st]);
  const pg = usePaged(list, `${s}|${cat}|${cap}|${st}`);
  const cats = useMemo(() => Array.from(new Set([...(f?.categories ?? []), ...all.flatMap((p) => p.categories)])), [f, all]);
  const caps = useMemo(() => Array.from(new Set([...(f?.capabilities ?? []), ...all.flatMap((p) => p.capabilities)])), [f, all]);
  const sel: ProviderDefinition | 'new' | null = open === 'new' ? 'new' : open ? all.find((p) => p.id === open) ?? null : null;
  const cols: Col<ProviderDefinition>[] = [
    { key: 'n', header: 'Provider', primary: true, cell: (p) => <span className="flex items-center gap-2.5">{p.logoUrl ? <img src={p.logoUrl} alt="" className="h-8 w-8 rounded object-contain" /> : <span className="grid h-8 w-8 place-items-center rounded border text-muted-foreground"><Plug className="h-4 w-4" /></span>}<span><span className="block font-display text-lg">{p.name}</span><span className="font-mono text-xs text-muted-foreground">{p.id}</span></span></span> },
    { key: 'c', header: 'Category', cell: (p) => p.categories.join(', ') },
    { key: 'k', header: 'Capabilities', cell: (p) => p.capabilities.map(label).join(', ') },
    { key: 'a', header: 'Availability', cell: (p) => <StatusPill p={p} /> },
    { key: 'i', header: 'Implementation', cell: () => 'Not implemented' },
    { key: 'x', header: 'Connection', cell: () => <Pill>Not connected</Pill> },
    { key: 't', header: 'Tenants', cell: (p) => p.assignedTenants },
    { key: 'o', header: 'Actions', cell: (p) => <Button size="sm" variant="outline" data-testid={`button-open-provider-${p.id}`} onClick={() => setOpen(p.id)}>Details</Button> },
  ];
  return (
    <>
      <PageHeader eyebrow="Platform" title="Providers">{canEdit && <Button onClick={() => setOpen('new')} data-testid="button-new-provider"><Plus className="mr-1 h-4 w-4" />New provider</Button>}</PageHeader>
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground" data-testid="note-providers">Provider catalog and tenant assignments. No provider is connected, no execution is enabled, and no credentials are stored or shown.</p>
      {q.isLoading ? <ListSkeleton /> : q.isError || !f ? <ErrorState what="the provider catalog" onRetry={() => q.refetch()} /> : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <SearchBox id="providers" value={s} onChange={setS} placeholder="Search provider, category, capability" />
            <FilterSelect id="provider-category" label="Category" value={cat} onChange={setCat} options={[['all', 'All categories'], ...cats.map((c): [string, string] => [c, c])]} />
            <FilterSelect id="provider-capability" label="Capability" value={cap} onChange={setCap} options={[['all', 'All capabilities'], ...caps.map((c): [string, string] => [c, label(c)])]} />
            <FilterSelect id="provider-status" label="Status" value={st} onChange={setSt} options={[['all', 'All statuses'], ...STATUS_OPTIONS]} />
          </div>
          <DataList id="provider" rows={pg.rows} cols={cols} rowKey={(p) => p.id} onOpen={(p) => setOpen(p.id)}
            emptyTitle={all.length === 0 ? 'The catalog is empty' : 'No providers match'} emptyBody={all.length === 0 ? (canEdit ? 'Create the first provider definition to start assigning capabilities to tenants.' : 'No provider has been added yet.') : 'Adjust the search or filters.'} />
          {list.length > 0 && <Pager id="providers" p={pg} />}
        </div>)}
      <DetailDrawer p={sel} assignments={f?.assignments ?? []} activity={f?.activity ?? []} categories={cats} capabilities={caps} canEdit={canEdit} onClose={() => setOpen(null)} onSaved={(p) => setOpen(p.id)} />
    </>
  );
}
