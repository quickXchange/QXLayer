import { useParams, Link } from 'wouter';
import { useGetTenant, getGetTenantQueryKey, useActivateTenant } from '@workspace/api-client-react';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, ErrorState, ListSkeleton, StatusBadge, stepLabel } from '@/components/app/bits';
import { BrandSection, DomainSection, ModulesSection, AssetsSection, ConfigSection } from '@/components/app/sections';
import { Button } from '@/components/ui/button';
import { useCan } from '@/lib/principal';
import { useInvalidateTenant } from '@/lib/invalidate';
import { useToast } from '@/hooks/use-toast';

export default function ClientDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const q = useGetTenant(id, { query: { enabled: !!id, queryKey: getGetTenantQueryKey(id) } });
  const can = useCan();
  const inv = useInvalidateTenant();
  const { toast } = useToast();
  const act = useActivateTenant();
  const t = q.data;
  return (
    <>
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Clients</Link>
      {q.isLoading ? <ListSkeleton /> : q.isError || !t ? <ErrorState what="this client" onRetry={() => q.refetch()} /> : (
        <>
          <PageHeader eyebrow={`${t.slug} · sandbox`} title={t.brandName}>
            <StatusBadge status={t.status} />
            {can.editTenant && t.status !== 'active' && (
              <Button data-testid="button-activate" disabled={!t.configurationComplete || act.isPending}
                onClick={() => act.mutate({ tenantId: t.id }, { onSuccess: () => { inv(t.id); toast({ title: 'Activated in sandbox' }); }, onError: (e) => toast({ title: 'Activation failed', description: (e as Error).message, variant: 'destructive' }) })}>
                {act.isPending ? 'Activating' : 'Activate sandbox'}
              </Button>)}
          </PageHeader>
          <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border md:grid-cols-4">
            {[['Client', t.name], ['Step', stepLabel(t.provisioningStep)], ['Environment', t.environment], ['Configuration', t.configurationComplete ? 'complete' : 'incomplete']].map(([l, v]) => (
              <div key={l} className="bg-card p-4"><p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{l}</p><p className="mt-1 text-sm capitalize">{v}</p></div>))}
          </div>
          {!t.configurationComplete && <p className="mb-6 text-sm text-muted-foreground">Complete every section below before sandbox activation is available.</p>}
          {!can.editTenant && <p className="mb-6 text-sm text-muted-foreground">Your role has read-only access to this client.</p>}
          <div className="space-y-6">
            <BrandSection tenant={t} readOnly={!can.editTenant} />
            <DomainSection tenant={t} readOnly={!can.editTenant} />
            <ModulesSection tenant={t} readOnly={!can.editModules} />
            <AssetsSection tenant={t} readOnly={!can.editTenant} />
            <ConfigSection tenant={t} readOnly={!can.editTenant} />
          </div>
        </>)}
    </>
  );
}
