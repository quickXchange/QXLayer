import { useParams, Link } from 'wouter';
import { useGetTenant, getGetTenantQueryKey, useActivateTenant } from '@workspace/api-client-react';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, ErrorState, ListSkeleton, StatusBadge, stepLabel } from '@/components/app/bits';
import { BrandSection, DomainSection, ModulesSection, AssetsSection, ConfigSection } from '@/components/app/sections';
import { SubscriptionSections, useSubscription } from '@/components/app/subscription';
import { WebsiteSection, ResourcesSection } from '@/components/app/advanced';
import { DomainOwnershipSection, StaffAccessSection, ProductSettingsSection, AdministratorsSection } from '@/components/app/management';
import { Button } from '@/components/ui/button';
import { useCan, type Permission } from '@/lib/principal';
import { useInvalidateTenant } from '@/lib/invalidate';
import { useToast } from '@/hooks/use-toast';

export default function ClientDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const q = useGetTenant(id, { query: { enabled: !!id, queryKey: getGetTenantQueryKey(id) } });
  const can = useCan(id);
  const inv = useInvalidateTenant();
  const { toast } = useToast();
  const act = useActivateTenant();
  const t = q.data;
  const subQ = useSubscription(id);
  const sub = subQ.data;
  const isSuper = can.role === 'super_admin';
  const suspended = t?.status === 'suspended' || sub?.status === 'suspended';
  const unassigned = sub?.status === 'unassigned';
  const base = suspended || unassigned || !sub || subQ.isLoading;
  const roFor = (p: Permission) => base || !can.has(p);
  const ro = base || !can.editTenant;
  const F = sub?.features ?? {};
  const mods = sub?.enabledModules ?? t?.enabledModules ?? [];
  const showFn = isSuper || F.crypto_exchange === true || F.crypto_payments === true;
  const allowed = { staff: Number(sub?.limits.max_staff ?? 0) > 0, api_keys: F.api_keys === true, webhooks: F.webhooks === true, payment_methods: F.crypto_payments === true };
  return (
    <>
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Clients</Link>
      {q.isLoading ? <ListSkeleton /> : q.isError || !t ? <ErrorState what="this client" onRetry={() => q.refetch()} /> : (
        <>
          <PageHeader eyebrow={`${t.slug} · sandbox`} title={t.brandName}>
            <StatusBadge status={t.status} />
            {can.editTenant && t.status === 'draft' && !suspended && (
              <Button data-testid="button-activate" disabled={!t.configurationComplete || act.isPending}
                onClick={() => act.mutate({ tenantId: t.id }, { onSuccess: () => { inv(t.id); toast({ title: 'Activated in sandbox' }); }, onError: (e) => toast({ title: 'Activation failed', description: (e as Error).message, variant: 'destructive' }) })}>
                {act.isPending ? 'Activating' : 'Activate sandbox'}
              </Button>)}
          </PageHeader>
          <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border md:grid-cols-4">
            {[['Client', t.name], ['Step', stepLabel(t.provisioningStep)], ['Environment', t.environment], ['Configuration', t.configurationComplete ? 'complete' : 'incomplete']].map(([l, v]) => (
              <div key={l} className="bg-card p-4"><p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{l}</p><p className="mt-1 text-sm capitalize">{v}</p></div>))}
          </div>
          {showFn && <Link href={`/clients/${t.id}/exchange`} className="mb-6 block rounded-md border bg-card p-4 text-sm hover:bg-muted/50" data-testid="link-exchange-panel">Open exchange panel: orders, assets, routes, pricing and settings for this tenant</Link>}
          {!t.configurationComplete && <p className="mb-6 text-sm text-muted-foreground">Complete every section below before sandbox activation is available.</p>}
          {unassigned && !suspended && <p className="mb-6 text-sm text-muted-foreground">No plan is assigned, so configuration is read-only.</p>}
          {suspended && <p className="mb-6 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" data-testid="text-suspended">This client is suspended. {isSuper ? 'All configuration is read-only; only subscription controls stay editable. Unsuspend to resume changes.' : 'Configuration is read-only until your operator lifts the suspension.'}</p>}
          {!can.editTenant && <p className="mb-6 text-sm text-muted-foreground">{can.permissions.length ? 'You can edit only the sections granted to you; everything else is read-only.' : 'Your role has read-only access to this client.'}</p>}
          <div className="space-y-6">
            <SubscriptionSections tenantId={t.id} canManage={can.manageSubscription} />
            <BrandSection tenant={t} readOnly={roFor('branding.manage')} />
            <DomainSection tenant={t} readOnly={roFor('domains.manage')} />
            <DomainOwnershipSection tenant={t} readOnly={roFor('domains.manage')} />
            {(isSuper || mods.length > 0) && <ModulesSection tenant={t} readOnly />}
            {showFn && <AssetsSection tenant={t} readOnly={roFor('configuration.manage')} />}
            {showFn && <ConfigSection tenant={t} readOnly={roFor('configuration.manage')} />}
            <ProductSettingsSection tenantId={t.id} sub={sub} readOnly={roFor('configuration.manage')} showAll={isSuper} />
            {(isSuper || F.website === true) && <WebsiteSection tenant={t} readOnly={roFor('branding.manage')} />}
            {(isSuper || can.role === 'client_admin') && <AdministratorsSection tenantId={t.id} canManage={isSuper} />}
            <StaffAccessSection tenantId={t.id} canEdit={can.manageStaffGrants && !suspended} />
            <ResourcesSection tenantId={t.id} allowed={allowed} readOnly={roFor('resources.manage')} staffReadOnly={!can.manageStaffGrants} showAll={isSuper} />
          </div>
        </>)}
    </>
  );
}
