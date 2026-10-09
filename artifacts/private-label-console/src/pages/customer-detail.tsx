import { OwnerReviewProvider } from '@/components/super-admin/review-gate';
import { Link, useParams } from 'wouter';
import { useListTenants, useListWhiteLabelRequests, useListAddons } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton, StatusBadge, EmptyState } from '@/components/app/bits';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderStatus } from '@/components/customer/order-view';
import { AuditList } from '@/components/super-admin/audit-list';
import { Field, Panel } from '@/components/super-admin/kit';
import { usePlatform } from '@/components/super-admin/platform';
import { SubscriptionSections } from '@/components/app/subscription';
import { stamp } from '@/lib/format';
import { orderRef } from '@/lib/wl';
import { useMemo, useState } from 'react';
import type { PmAudit } from '@/components/super-admin/platform';

export default function CustomerDetail() { return <OwnerReviewProvider><CustomerDetailInner /></OwnerReviewProvider>; }

function CustomerDetailInner() {
  const { customerId = '' } = useParams<{ customerId: string }>();
  const { pm, isLoading, isError, refetch } = usePlatform();
  const tq = useListTenants(); const oq = useListWhiteLabelRequests(); const addons = useListAddons();
  const [ent, setEnt] = useState('');
  const c = pm?.customers.find((x) => x.id === customerId);
  const scope = useMemo(() => (a: PmAudit) => a.actorId === customerId || (c?.tenantIds ?? []).includes(a.tenantId ?? '\0'), [customerId, c]);
  const back = <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Clients</Link>;
  if (isLoading) return <>{back}<ListSkeleton /></>;
  if (isError || !pm) return <>{back}<ErrorState what="this account" onRetry={() => refetch()} /></>;
  if (!c) return <>{back}<EmptyState title="Account not found" body="This account is not in the directory snapshot." /></>;
  if (tq.isLoading || oq.isLoading || addons.isLoading) return <>{back}<ListSkeleton /></>;
  if (tq.isError || oq.isError || addons.isError) return <>{back}<ErrorState what="this customer's projects, orders and add-ons" onRetry={() => { tq.refetch(); oq.refetch(); addons.refetch(); }} /></>;
  const tenants = (tq.data ?? []).filter((t) => c.tenantIds.includes(t.id));
  const orders = (oq.data ?? []).filter((o) => o.customerUserId === c.id);
  const projects = pm.projects.filter((p) => c.tenantIds.includes(p.tenantId));
  const entTenant = ent || tenants[0]?.id || '';
  return (
    <>
      {back}
      <PageHeader eyebrow="Account" title={c.name || 'Unnamed account'}><StatusBadge status={c.status} /></PageHeader>
      <Tabs defaultValue="account">
        <div className="mb-5 overflow-x-auto"><TabsList className="w-max">{[['account', 'Account'], ['wl', 'White Labels'], ['plans', 'Plans & Add-ons'], ['ent', 'Entitlements & Overrides'], ['activity', 'Activity']].map(([v, l]) => <TabsTrigger key={v} value={v} data-testid={`tab-customer-${v}`}>{l}</TabsTrigger>)}</TabsList></div>
        <TabsContent value="account"><div className="max-w-2xl"><Panel title="Account"><dl className="divide-y"><Field k="Name" v={c.name} /><Field k="Email" v={c.email} /><Field k="Account ID" v={<span className="font-mono text-xs">{c.id}</span>} /><Field k="Status" v={c.status} /><Field k="Created" v={c.createdAt ? stamp(c.createdAt) : null} /><Field k="Associated projects" v={c.tenantIds.length ? <span className="font-mono text-xs">{c.tenantIds.join(', ')}</span> : 'None'} /></dl></Panel></div></TabsContent>
        <TabsContent value="wl" className="space-y-4">
          <Panel title="Projects">{tenants.length === 0 ? <p className="text-sm text-muted-foreground">No White Label projects are associated with this account.</p> : <ul className="divide-y">{tenants.map((t) => <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span>{t.brandName} <span className="font-mono text-xs text-muted-foreground">{t.slug}</span></span><span className="flex items-center gap-3"><StatusBadge status={t.status} /><Link href={`/clients/${t.id}?tab=config`} className="text-copper underline" data-testid={`link-config-${t.id}`}>Configuration</Link></span></li>)}</ul>}</Panel>
          <Panel title="Orders">{orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders from this account.</p> : <ul className="divide-y">{orders.map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><Link href={`/white-label-requests/${o.id}`} className="text-copper underline">{orderRef(o)} {o.projectName}</Link><OrderStatus status={o.status} /></li>)}</ul>}</Panel>
        </TabsContent>
        <TabsContent value="plans">{tenants.length === 0 ? <p className="text-sm text-muted-foreground">No project subscriptions recorded for this account.</p> : <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">Project<select data-testid="select-plans-project" className="h-10 min-w-0 max-w-full rounded-md border bg-background px-2" value={entTenant} onChange={(e) => setEnt(e.target.value)}>{tenants.map((t) => <option key={t.id} value={t.id}>{t.brandName}</option>)}</select></label>
          <p className="text-xs text-muted-foreground">Currently: {projects.find((p) => p.tenantId === entTenant)?.planName ?? 'No plan assigned'}; add-ons {(projects.find((p) => p.tenantId === entTenant)?.addonIds ?? []).map((id) => addons.data?.find((a) => a.id === id)?.name ?? id).join(', ') || 'none'}.</p>
          <SubscriptionSections key={`p-${entTenant}`} tenantId={entTenant} canManage show={['plan', 'addons', 'commercial', 'suspension']} /></div>}</TabsContent>
        <TabsContent value="ent">{tenants.length === 0 ? <p className="text-sm text-muted-foreground">No project to resolve entitlements for.</p> : <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">Project<select className="h-10 rounded-md border bg-background px-2" value={entTenant} onChange={(e) => setEnt(e.target.value)}>{tenants.map((t) => <option key={t.id} value={t.id}>{t.brandName}</option>)}</select></label>
          <SubscriptionSections key={entTenant} tenantId={entTenant} canManage show={['capabilities', 'overrides']} /></div>}</TabsContent>
        <TabsContent value="activity"><AuditList id="customer" scope={scope} /></TabsContent>
      </Tabs>
    </>
  );
}
