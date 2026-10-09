import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { useGetIntegrationRuntime, getGetIntegrationRuntimeQueryKey } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { IntegrationsWorkspace } from '@/components/integrations/workspace';
import { usePrincipal } from '@/lib/principal';

export default function Integrations() {
  const q = useGetIntegrationRuntime({ query: { queryKey: getGetIntegrationRuntimeQueryKey(), refetchInterval: 30000 } });
  const [sel, setSel] = useState('');
  const b = q.data;
  const tenants = b?.tenants ?? [];
  return (
    <>
      <PageHeader eyebrow="Platform" title="Integrations" />
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground" data-testid="note-integrations">Per-tenant integration settings and credentials. The Providers catalog is unchanged. Enabling an integration is not a connection and does not execute financial operations.</p>
      {q.isLoading ? <ListSkeleton /> : !b ? <ErrorState what="integrations" onRetry={() => q.refetch()} /> : (
        <div className="space-y-5">
          <label className="block max-w-md text-sm" htmlFor="select-tenant"><span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Tenant</span>
            <select id="select-tenant" data-testid="select-tenant" className="h-10 w-full rounded-md border bg-background px-2" value={sel} onChange={(e) => setSel(e.target.value)}>
              <option value="">Select a tenant</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.slug}) - {t.status}</option>)}
            </select></label>
          {sel ? <IntegrationsWorkspace tenantId={sel} /> : <p className="rounded border border-dashed p-6 text-sm text-muted-foreground" data-testid="empty-tenant">{tenants.length ? 'Choose a tenant to review and configure its integrations.' : 'No tenants exist yet.'}</p>}
        </div>)}
    </>
  );
}

export function TenantIntegrations() {
  const { id = '' } = useParams<{ id: string }>();
  const p = usePrincipal();
  return (
    <>
      <PageHeader eyebrow="Admin Panel" title="Integrations">
        {!p.demo && <Button asChild variant="outline" data-testid="link-back-admin"><Link href={`/clients/${id}/exchange`}>Back to Admin Panel</Link></Button>}
      </PageHeader>
      <IntegrationsWorkspace tenantId={id} />
    </>
  );
}
