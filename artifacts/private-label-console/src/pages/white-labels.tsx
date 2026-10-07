import { useMemo, useState } from 'react';
import { useListTenants, useListWhiteLabelRequests, type TenantSummary } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton, StatusBadge, stepLabel } from '@/components/app/bits';
import { Building2 } from 'lucide-react';
import { Chips, DataList, Pager, Pill, SearchBox, usePaged, type Col } from '@/components/super-admin/kit';
import { ProjectDrawer } from '@/components/super-admin/project-drawer';
import { usePlatform } from '@/components/super-admin/platform';
import { ago } from '@/lib/format';

export default function WhiteLabels() {
  const tq = useListTenants(); const oq = useListWhiteLabelRequests(); const { pm } = usePlatform();
  const [s, setS] = useState(''); const [f, setF] = useState('all'); const [sel, setSel] = useState<TenantSummary | null>(null);
  const all = tq.data ?? [];
  const proj = (id: string) => pm?.projects.find((p) => p.tenantId === id);
  const ord = (id: string) => (oq.data ?? []).find((o) => o.tenantId === id);
  const cust = (id: string) => { const p = proj(id); if (!p?.customerIds.length) return 'Not recorded'; return p.customerIds.map((c) => pm?.customers.find((x) => x.id === c)?.name ?? c).join(', '); };
  const list = useMemo(() => {
    const k = s.trim().toLowerCase();
    return all.filter((t) => (f === 'all' || t.status === f) && (!k || [t.brandName, t.name, t.slug, t.domain, proj(t.id)?.planName, cust(t.id)].some((v) => (v ?? '').toLowerCase().includes(k))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, s, f, pm]);
  const pg = usePaged(list, `${s}|${f}`);
  const cols: Col<TenantSummary>[] = [
    { key: 'b', header: 'White Label', primary: true, cell: (t) => <span className="flex items-center gap-2.5">{proj(t.id)?.logoUrl ? <img src={proj(t.id)!.logoUrl!} alt="" className="h-8 w-8 rounded object-contain" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded border text-muted-foreground" aria-hidden><Building2 className="h-4 w-4" /></span>}<span><span className="block font-display text-lg">{t.brandName}</span><span className="block font-mono text-xs text-muted-foreground">{t.slug}</span></span></span> },
    { key: 'c', header: 'Customer', cell: (t) => cust(t.id) },
    { key: 'd', header: 'Domain', cell: (t) => <span className="font-mono text-xs">{t.domain ?? 'no domain'}</span> },
    { key: 'p', header: 'Plan', cell: (t) => proj(t.id)?.planName ?? (pm ? 'None' : 'Loading') },
    { key: 's', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
    { key: 'f', header: 'Features', cell: (t) => `${t.enabledModules.length} modules` },
    { key: 'st', header: 'Step', cell: (t) => <span className="capitalize">{stepLabel(t.provisioningStep)}</span> },
    { key: 'cr', header: 'Created', cell: (t) => <span className="text-xs text-muted-foreground">{ago(t.createdAt)}</span> },
  ];
  return (
    <>
      <PageHeader eyebrow="White Labels" title="White Labels" />
      {tq.isLoading ? <ListSkeleton /> : tq.isError ? <ErrorState what="white labels" onRetry={() => tq.refetch()} /> : (
        <div className="space-y-4">
          {pm === undefined && <Pill tone="warn">Customer and plan details loading or unavailable</Pill>}
          <SearchBox id="wl" value={s} onChange={setS} placeholder="Search brand, slug, domain, customer, plan" />
          <Chips id="wl" value={f} onChange={setF} options={[['all', `All (${all.length})`], ...['draft', 'active', 'suspended'].map((x): [string, string] => [x, `${x} (${all.filter((t) => t.status === x).length})`])]} />
          <DataList id="wl" rows={pg.rows} cols={cols} rowKey={(t) => t.id} onOpen={(t: TenantSummary) => setSel(t)} emptyTitle="No white labels" emptyBody="Prepared tenant projects, including drafts, appear here." />
          {list.length > 0 && <Pager id="wl" p={pg} />}
        </div>)}
      <ProjectDrawer key={sel?.id ?? 'none'} t={sel} project={sel ? proj(sel.id) : undefined} order={sel ? ord(sel.id) : undefined} customerLabel={sel ? cust(sel.id) : ''} onClose={() => setSel(null)} />
    </>
  );
}
