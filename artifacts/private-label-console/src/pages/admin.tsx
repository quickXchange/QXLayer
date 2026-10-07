import { Link, Redirect } from 'wouter';
import { useListWhiteLabelRequests, useListTenants, useListPlans, useListAddons } from '@workspace/api-client-react';
import { usePrincipal, useCan } from '@/lib/principal';
import { PageHeader, ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/app/metrics';
import { usePlatform } from '@/components/super-admin/platform';
import { Pill } from '@/components/super-admin/kit';
import { ago } from '@/lib/format';

export default function Admin() {
  const can = useCan(); const p = usePrincipal();
  const oq = useListWhiteLabelRequests(); const tq = useListTenants(); const pq = useListPlans(); const aq = useListAddons(); const { pm, isError: pmErr, refetch: pmRefetch } = usePlatform();
  const home = p.role === 'client_admin' ? (p.memberships?.[0]?.tenantId ?? p.tenantId) : null;
  if (home) return <Redirect to={`/clients/${home}/exchange`} />;
  const loading = oq.isLoading || tq.isLoading || pq.isLoading || aq.isLoading;
  const failed = oq.isError || tq.isError || pq.isError || aq.isError;
  const o = oq.data ?? []; const t = tq.data ?? [];
  const n = (st: string[]) => o.filter((x) => st.includes(x.status)).length;
  const cust = !pm ? (pmErr ? 'Unavailable' : '...') : pm.directoryAvailable && pm.customerTotal != null ? pm.customerTotal : 'Unavailable';
  const stats: [string, string | number][] = [
    ['Customers', cust], ['Orders', o.length], ['Active White Labels', t.filter((x) => x.status === 'active').length],
    ['Sandbox / setup', t.filter((x) => x.status === 'draft').length], ['Delivered', n(['delivered'])], ['Suspended', t.filter((x) => x.status === 'suspended').length],
    ['Plans', `${(pq.data ?? []).filter((x) => x.status === 'enabled').length} of ${(pq.data ?? []).length} enabled`], ['Add-ons', `${(aq.data ?? []).filter((x) => x.enabled).length} of ${(aq.data ?? []).length} enabled`],
  ];
  const awaiting = n(['new', 'reviewing', 'waiting_for_client', 'quote_ready']);
  return (
    <>
      <PageHeader eyebrow="Platform" title="Overview">{can.createClients && <Button asChild data-testid="link-new-client"><Link href="/clients/new">New client</Link></Button>}</PageHeader>
      {loading ? <ListSkeleton /> : failed ? <ErrorState what="the overview" onRetry={() => { oq.refetch(); tq.refetch(); pq.refetch(); aq.refetch(); }} /> : (
        <div className="space-y-10">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map(([l, v]) => <MetricCard key={l} label={l} value={<span className={typeof v === 'string' && v.length > 6 ? 'text-2xl' : ''}>{v}</span>} id={`stat-${l.toLowerCase().replace(/[^a-z]+/g, '-')}`} />)}
          </div>
          {pm && !pm.directoryAvailable && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" data-testid="text-directory-unavailable">Customer total is unavailable: the account directory could not be read ({pm.directoryError ?? 'no reason recorded'}).</p>}
          {pmErr && <p className="text-sm">Account directory request failed. <button className="text-copper underline" onClick={() => pmRefetch()}>Retry</button></p>}
          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="font-display mb-3 text-2xl">Provisioning</h2>
              <div className="space-y-2 rounded-md border bg-card p-4 text-sm">
                <p>{awaiting} orders awaiting review or client input</p>
                <p>{n(['approved', 'in_setup', 'customization', 'ready'])} approved orders in setup</p>
                <p>{t.filter((x) => x.status === 'draft').length} prepared projects in draft</p>
                <p className="text-xs text-muted-foreground">Derived from saved records. No automated provisioning jobs run.</p>
                <Link href="/provisioning" className="text-copper underline">Open provisioning</Link>
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-baseline justify-between"><h2 className="font-display text-2xl">Recent activity</h2><Link href="/activity" className="text-sm text-copper underline-offset-4 hover:underline">All activity</Link></div>
              {!pm ? <p className="text-sm text-muted-foreground">Recorded activity unavailable.</p> : pm.audit.length === 0 ? <EmptyState title="Nothing yet" body="Recorded actions will appear here." /> : (
                <ul className="divide-y rounded-md border bg-card">{pm.audit.slice(0, 8).map((a) => <li key={a.id} className="flex items-baseline justify-between gap-4 px-4 py-3"><span className="min-w-0 text-sm [overflow-wrap:anywhere]">{a.description}</span><span className="shrink-0 font-mono text-xs text-muted-foreground">{ago(a.createdAt)}</span></li>)}</ul>)}
            </div>
          </section>
          <Pill>Sandbox only: no financial figures are shown</Pill>
        </div>)}
    </>
  );
}
