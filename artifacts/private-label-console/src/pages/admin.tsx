import { Link, Redirect } from 'wouter';
import { usePrincipal } from '@/lib/principal';
import { useGetPlatformOverview } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton, SandboxNote, EmptyState } from '@/components/app/bits';
import { ago } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { useCan } from '@/lib/principal';
import { MetricCard } from '@/components/app/metrics';

export default function Admin() {
  const q = useGetPlatformOverview();
  const can = useCan();
  const p = usePrincipal();
  const home = p.role === 'client_admin' ? (p.memberships?.[0]?.tenantId ?? p.tenantId) : null;
  if (home) return <Redirect to={`/clients/${home}/exchange`} />;
  const d = q.data;
  const stats = d ? [['Clients', d.totalTenants], ['Active in sandbox', d.activeTenants], ['Draft', d.draftTenants], ['Modules enabled', d.enabledModules]] : [];
  return (
    <>
      <PageHeader eyebrow="Platform" title="Overview">
        {can.createClients && <Button asChild data-testid="link-new-client"><Link href="/clients/new">New client</Link></Button>}
      </PageHeader>
      {q.isLoading ? <ListSkeleton /> : q.isError || !d ? <ErrorState what="the overview" onRetry={() => q.refetch()} /> : (
        <div className="space-y-10">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map(([l, v]) => (
              <MetricCard key={l} label={String(l)} value={v} id={`stat-${String(l).toLowerCase().replace(/\s/g, '-')}`} />
            ))}
          </div>
          <SandboxNote />
          <section>
            <div className="mb-3 flex items-baseline justify-between"><h2 className="font-display text-2xl">Recent activity</h2><Link href="/activity" className="text-sm text-copper underline-offset-4 hover:underline">All activity</Link></div>
            {d.recentActivity.length === 0 ? <EmptyState title="Nothing yet" body="Provisioning actions will be recorded here." /> : (
              <ul className="divide-y rounded-md border bg-card">
                {d.recentActivity.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-4 px-4 py-3"><span className="text-sm">{a.description}</span><span className="shrink-0 font-mono text-xs text-muted-foreground">{ago(a.createdAt)}</span></li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
