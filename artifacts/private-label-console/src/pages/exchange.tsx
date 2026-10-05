import { useParams, useLocation, Link } from 'wouter';
import { useGetTenant, getGetTenantQueryKey } from '@workspace/api-client-react';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, ErrorState, ListSkeleton } from '@/components/app/bits';
import { BrandSection, DomainSection } from '@/components/app/sections';
import { useSubscription } from '@/components/app/subscription';
import { WebsiteSection, ResourcesSection } from '@/components/app/advanced';
import { DomainOwnershipSection, StaffAccessSection } from '@/components/app/management';
import { useCan, usePrincipal, type Permission } from '@/lib/principal';
import { useExchangeDraft } from '@/components/exchange/use-exchange-draft';
import { DashboardPanel } from '@/components/exchange/dashboard-panel';
import { OrdersPanel } from '@/components/exchange/orders-panel';
import { AssetsPanel, NetworksPanel } from '@/components/exchange/catalog-sections';
import { RoutesPanel, PaymentMethodsPanel, PricingPanel } from '@/components/exchange/route-sections';
import { SettingsPanel } from '@/components/exchange/settings-panel';
import { ProvidersPanel } from '@/components/exchange/providers-panel';
import { CustomersPanel } from '@/components/exchange/customers-panel';
import { AuditPanel } from '@/components/exchange/audit-panel';

const TABS: [string, string][] = [['', 'Overview'], ['orders', 'Orders'], ['customers', 'Customers'], ['assets', 'Crypto Assets'], ['networks', 'Crypto Networks'], ['routes', 'Routes'], ['swap', 'Swap'], ['convert', 'Convert'], ['buy', 'Buy'], ['sell', 'Sell'], ['fees', 'Fees / Spread'], ['pricing', 'Pricing & Fees'], ['payment-methods', 'Payment Methods'], ['providers', 'Providers / Integrations'], ['branding', 'Branding'], ['website', 'Website'], ['domain', 'Domain'], ['staff', 'Staff & Permissions'], ['api-keys', 'API keys'], ['audit', 'Activity / Audit'], ['settings', 'Settings']];
const DRAFT_SECTIONS = ['assets', 'networks', 'routes', 'swap', 'convert', 'buy', 'sell', 'fees', 'payment-methods', 'pricing', 'providers', 'settings'];

export default function Exchange() {
  const [, navigate] = useLocation();
  const { id = '', section = '', orderId } = useParams<{ id: string; section?: string; orderId?: string }>();
  const q = useGetTenant(id, { query: { enabled: !!id, queryKey: getGetTenantQueryKey(id) } });
  const can = useCan(id);
  const principal = usePrincipal();
  const subQ = useSubscription(id);
  const d = useExchangeDraft(id);
  const t = q.data; const sub = subQ.data;
  const F = sub?.features ?? {};
  const suspended = t?.status === 'suspended' || sub?.status === 'suspended';
  const unassigned = sub?.status === 'unassigned';
  const base = suspended || unassigned || !sub || subQ.isLoading;
  const feature = F.crypto_exchange === true;
  const ro = (p: Permission) => base || !can.has(p);
  const cfgLocked = base || !can.has('configuration.manage') || !feature;
  const tabs = TABS.filter(([k]) => k !== 'website' || can.role === 'super_admin' || F.website === true);
  const root = `/clients/${id}/exchange`;
  const sec = TABS.some(([k]) => k === section) ? section : '';
  const needsDraft = DRAFT_SECTIONS.includes(sec);

  let body;
  if (!t) body = null;
  else if (needsDraft && (d.loading || (!d.draft && !d.error))) body = <ListSkeleton />;
  else if (needsDraft && (d.error || !d.draft)) body = <ErrorState what="exchange settings" onRetry={d.refetch} />;
  else if (sec === '') body = <DashboardPanel tenantId={id} />;
  else if (sec === 'orders') body = <OrdersPanel key={orderId ?? 'list'} tenantId={id} orderId={orderId} canEdit={!cfgLocked} />;
  else if (sec === 'customers') body = <CustomersPanel tenantId={id} />;
  else if (sec === 'providers') body = <ProvidersPanel d={d} locked={cfgLocked} />;
  else if (sec === 'assets') body = <AssetsPanel tenant={t} d={d} locked={cfgLocked} catalogReadOnly={cfgLocked} />;
  else if (sec === 'networks') body = <NetworksPanel d={d} locked={cfgLocked} />;
  else if (sec === 'routes') body = <RoutesPanel d={d} locked={cfgLocked} />;
  else if (sec === 'swap' || sec === 'convert' || sec === 'buy' || sec === 'sell') body = <RoutesPanel d={d} locked={cfgLocked} action={sec} />;
  else if (sec === 'fees') body = <PricingPanel d={d} locked={cfgLocked} />;
  else if (sec === 'domain') body = <div className="space-y-6"><Guide title="Domain" note="Custom domain and ownership verification." links={[['branding', 'Branding'], ['website', 'Website settings']]} root={root} /><DomainSection tenant={t} readOnly={ro('domains.manage')} /><DomainOwnershipSection tenant={t} readOnly={ro('domains.manage')} /></div>;
  else if (sec === 'payment-methods') body = <PaymentMethodsPanel d={d} locked={cfgLocked} />;
  else if (sec === 'pricing') body = <PricingPanel d={d} locked={cfgLocked} />;
  else if (sec === 'settings') body = <SettingsPanel tenantId={id} d={d} locked={cfgLocked} canManageSub={can.manageSubscription} features={F} />;
  else if (sec === 'branding') body = <div className="space-y-6"><Guide title="Branding" note="Logo, favicon, brand name, colors and appearance (dark and light mode)." links={[['website', 'Website settings'], ['domain', 'Domain']]} root={root} /><BrandSection tenant={t} readOnly={ro('branding.manage')} /></div>;
  else if (sec === 'website') body = <div className="space-y-6"><Guide title="Website settings" note="Public site content and presentation." links={[['branding', 'Branding'], ['domain', 'Domain']]} root={root} /><WebsiteSection tenant={t} readOnly={ro('branding.manage')} /></div>;
  else if (sec === 'staff') body = <div className="space-y-6"><PermissionMap /><StaffAccessSection tenantId={id} canEdit={can.manageStaffGrants && !suspended && !unassigned} />
    <ResourcesSection tenantId={id} allowed={{ staff: Number(sub?.limits.max_staff ?? 0) > 0, api_keys: false, webhooks: false, payment_methods: false }} readOnly={ro('resources.manage')} staffReadOnly={!can.manageStaffGrants || base} /></div>;
  else if (sec === 'api-keys') body = <ResourcesSection tenantId={id} allowed={{ staff: false, api_keys: F.api_keys === true, webhooks: false, payment_methods: false }} readOnly={ro('resources.manage')} />;
  else body = <AuditPanel tenantId={id} />;

  return (
    <>
      {!principal.demo && <Link href={can.role === 'super_admin' ? `/clients/${id}` : '/account/white-labels'} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> {can.role === 'super_admin' ? 'Client detail' : 'My White Labels'}</Link>}
      {q.isLoading ? <ListSkeleton /> : q.isError || !t ? <ErrorState what="this client" onRetry={() => q.refetch()} /> : (
        <>
          <PageHeader eyebrow={`${t.slug} · exchange sandbox`} title={`${t.brandName} exchange`}>
            {can.role === 'super_admin' && <Link href={`/clients/${id}`} className="text-sm text-copper hover:underline" data-testid="link-client-detail">Client detail</Link>}
          </PageHeader>
          {suspended && <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" data-testid="text-suspended">This client is suspended. Everything is read-only.</p>}
          {unassigned && !suspended && <p className="mb-4 text-sm text-muted-foreground">No plan is assigned, so everything is read-only.</p>}
          {!feature && !!sub && <p className="mb-4 text-sm text-muted-foreground" data-testid="text-no-feature">The crypto exchange feature is not part of this plan, so exchange settings are read-only.</p>}
          {needsDraft && d.dirty && !cfgLocked && <p className="mb-4 text-sm text-copper" data-testid="text-unsaved">Unsaved exchange changes. They are kept while you move between sections; save from any editable section.</p>}
          <label className="mb-6 block space-y-1 text-sm md:hidden">Admin section
            <select aria-label="Admin section" data-testid="select-exchange-section" value={sec} onChange={(e) => navigate(e.target.value ? `${root}/${e.target.value}` : root)} className="block h-11 w-full min-w-0 rounded-md border bg-card px-3">
              {tabs.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <nav aria-label="Admin sections" className="mb-6 hidden flex-wrap gap-1 border-b pb-2 md:flex" data-testid="nav-exchange">
            {tabs.map(([k, l]) => <Link key={k} href={k ? `${root}/${k}` : root} data-testid={`tab-exchange-${k || 'dashboard'}`} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${sec === k ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{l}</Link>)}
          </nav>
          {body}
        </>)}
    </>
  );
}

function Guide({ title, note, links, root }: { title: string; note: string; links: [string, string][]; root: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b pb-3" data-testid={`guide-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <h2 className="font-display text-2xl">{title}</h2><p className="text-sm text-muted-foreground">{note}</p>
      <span className="ml-auto flex gap-3 text-sm">{links.map(([k, l]) => <Link key={k} href={`${root}/${k}`} className="text-copper hover:underline">{l}</Link>)}</span>
    </div>
  );
}

const PERMS: [string, string][] = [
  ['Orders, Crypto Assets, Crypto Networks, Payment Methods, Routes, Pricing & Fees, Providers, Settings', 'configuration.manage'],
  ['Branding, Website', 'branding.manage'],
  ['Domain', 'domains.manage'],
  ['Staff resources, API keys', 'resources.manage'],
  ['Staff membership and permission grants', 'Tenant Admin / Super Admin only'],
];
function PermissionMap() {
  return (
    <section className="rounded-md border bg-card p-4" data-testid="permission-map">
      <h2 className="font-display text-2xl">Permissions by section</h2>
      <p className="mt-1 text-sm text-muted-foreground">An explanation of the existing grants. Nothing here changes authorization.</p>
      <ul className="mt-3 divide-y text-sm">{PERMS.map(([sec, g]) => <li key={g} className="flex flex-wrap justify-between gap-2 py-2"><span>{sec}</span><span className="font-mono text-xs text-copper">{g}</span></li>)}
        <li className="flex flex-wrap justify-between gap-2 py-2"><span>Customers, Activity / Audit</span><span className="text-xs text-muted-foreground">Read-only, authorized tenant membership required</span></li></ul>
    </section>
  );
}
