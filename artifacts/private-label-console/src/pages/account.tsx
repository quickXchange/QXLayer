import { Link } from 'wouter';
import { UserProfile } from '@clerk/react';
import { PageHeader, ErrorState, EmptyState, ListSkeleton, StatusBadge } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { ConfigureExchange } from '@/components/customer/configure';
import { OrderStatus } from '@/components/customer/order-view';
import { cash, orderRef, type WlOrder } from '@/lib/wl';
import { useAdminPanels, useMyRequests } from '@/lib/customer';
import { NotificationsPanel } from '@/components/customer/notifications';
import { MetricCard } from '@/components/app/metrics';

export function AccountDashboard() {
  const r = useMyRequests(); const a = useAdminPanels();
  const reqs = (r.data ?? []); const panels = a.data ?? [];
  return (
    <>
      <PageHeader eyebrow="Customer account" title="Dashboard"><Button asChild data-testid="button-configure"><Link href="/account/configure">Configure Exchange</Link></Button></PageHeader>
      {r.isLoading ? <ListSkeleton rows={2} /> : r.isError ? <ErrorState what="your requests" onRetry={() => r.refetch()} /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard id="stat-requests" label="Requests" value={reqs.length} />
          <MetricCard id="stat-pending" label="Awaiting review" value={reqs.filter((x) => OPEN.includes(x.status)).length} />
          <MetricCard id="stat-approved" label="Approved" value={reqs.filter((x) => ['approved', 'in_setup', 'customization', 'ready'].includes(x.status)).length} />
          <MetricCard id="stat-panels" label="Delivered panels" value={panels.length} />
        </div>)}
      <NotificationsPanel />
      {!r.isLoading && reqs.length === 0 && <div className="mt-8"><EmptyState title="No Exchange project yet" body="Configure a white-label Exchange and an operator will review it." action={<Button asChild><Link href="/account/configure">Configure Exchange</Link></Button>} /></div>}
    </>
  );
}

const OPEN = ['new', 'submitted', 'reviewing', 'waiting_for_client', 'quote_ready'];
const DONE = ['delivered', 'provisioned'];

function ReqRow({ x }: { x: WlOrder }) {
  const rec = x.monthlyPrice == null ? 'Quote pending' : `${cash(x.monthlyPrice, x.currency)} / ${x.billingPeriod === 'yearly' ? 'year' : 'month'}`;
  return (
    <Link href={`/account/orders/${x.id}`} className="block rounded-md border bg-card p-4 transition-colors hover:bg-muted/40" data-testid={`row-request-${x.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 font-display text-xl [overflow-wrap:anywhere]">{x.projectName} <span className="text-sm text-muted-foreground">{x.brandName}</span></p><OrderStatus status={x.status} /></div>
      <p className="mt-1 font-mono text-[11px] uppercase text-copper">{orderRef(x)} · {new Date(x.createdAt).toLocaleDateString()}</p>
      <p className="mt-2 text-sm">Recurring: {rec} · Setup: {x.setupPrice == null ? 'Pending' : cash(x.setupPrice, x.currency)}</p>
      {x.operatorNote && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">Current note: {x.operatorNote}</p>}
    </Link>
  );
}

export function AccountOrders() {
  const r = useMyRequests(); const reqs = (r.data ?? []);
  return (
    <>
      <PageHeader eyebrow="Purchase and service requests" title="My Orders"><Button asChild variant="outline"><Link href="/account/configure">Configure Exchange</Link></Button></PageHeader>
      {r.isLoading ? <ListSkeleton /> : r.isError ? <ErrorState what="your requests" onRetry={() => r.refetch()} /> : reqs.length === 0 ? (
        <EmptyState title="No orders yet" body="Nothing has been requested. Configure an Exchange to get started." action={<Button asChild><Link href="/account/configure">Configure Exchange</Link></Button>} />
      ) : <div className="space-y-3">{reqs.map((x) => <ReqRow key={x.id} x={x} />)}</div>}
    </>
  );
}

export function AccountWhiteLabels() {
  const r = useMyRequests(); const a = useAdminPanels();
  const delivered = (r.data ?? []).filter((x) => DONE.includes(x.status));
  const panels = a.data ?? []; const ids = panels.map((p) => p.tenantId);
  const orphan = panels.filter((p) => !delivered.some((x) => x.tenantId === p.tenantId));
  const loading = r.isLoading || a.isLoading;
  return (
    <>
      <PageHeader eyebrow="Projects" title="My White Labels"><Button asChild variant="outline"><Link href="/account/configure">Configure Exchange</Link></Button></PageHeader>
      {loading ? <ListSkeleton /> : r.isError ? <ErrorState what="your orders" onRetry={() => r.refetch()} /> : a.isError ? <ErrorState what="your admin panels" onRetry={() => a.refetch()} /> : delivered.length + orphan.length === 0 ? (
        <EmptyState title="No white labels yet" body="Your project appears here once our team delivers your order." action={<Button asChild><Link href="/account/orders">My Orders</Link></Button>} />
      ) : <div className="grid gap-4 md:grid-cols-2">
        {delivered.map((x) => (
          <div key={x.id} className="rounded-md border bg-card p-5" data-testid={`card-wl-${x.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-mono text-[11px] uppercase text-copper">{orderRef(x)}</p><OrderStatus status={x.status} /></div><p className="font-display mt-1 text-2xl [overflow-wrap:anywhere]">{x.projectName}</p><p className="text-sm text-muted-foreground">{x.brandName}</p>
            <div className="mt-4 flex flex-wrap gap-2">{x.websiteUrl && <Button asChild size="sm" variant="outline"><a href={x.websiteUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-wl-website-${x.id}`}>Open website</a></Button>}{x.tenantId && ids.includes(x.tenantId) && <Button asChild size="sm"><Link href={`/clients/${x.tenantId}/exchange`}>Open Admin</Link></Button>}<Button asChild size="sm" variant="outline"><Link href={`/account/orders/${x.id}`}>Order details</Link></Button></div>
          </div>))}
        {orphan.map((p) => (
          <div key={p.tenantId} className="rounded-md border bg-card p-5" data-testid={`card-wl-panel-${p.tenantId}`}>
            <p className="font-mono text-[11px] uppercase text-copper">{p.slug}</p><p className="font-display mt-1 text-2xl">{p.brandName}</p>
            <div className="mt-4 flex flex-wrap gap-2"><Button asChild size="sm"><Link href={`/clients/${p.tenantId}/exchange`}>Open Admin</Link></Button><Button asChild size="sm" variant="outline"><Link href={`/clients/${p.tenantId}/integrations`} data-testid={`link-integrations-${p.tenantId}`}>Integrations</Link></Button></div>
          </div>))}
      </div>}
    </>
  );
}

export function AdminPanels() {
  const a = useAdminPanels();
  const panels = a.data ?? [];
  return (
    <>
      <PageHeader eyebrow="Delivered projects" title="My Admin Panels" />
      {a.isLoading ? <ListSkeleton rows={2} /> : a.isError ? <ErrorState what="your admin panels" onRetry={() => a.refetch()} /> : panels.length === 0 ? (
        <EmptyState title="No Admin Panel yet" body="Your Admin Panel appears here after our team delivers your Exchange." action={<Button asChild><Link href="/account">Back to Dashboard</Link></Button>} />
      ) : <div className="grid gap-4 md:grid-cols-2">{panels.map((p) => (
        <div key={p.tenantId} className="rounded-md border bg-card p-5" data-testid={`card-panel-${p.tenantId}`}>
          <div className="flex items-center justify-between"><p className="font-display text-2xl">{p.brandName}</p><StatusBadge status={p.status} /></div>
          <p className="mt-1 font-mono text-[11px] uppercase text-copper">{p.slug} · {p.role.replace('_', ' ')}</p>
          <div className="mt-4 flex flex-wrap gap-2"><Button asChild><Link href={`/clients/${p.tenantId}/exchange`}>Open Admin</Link></Button><Button asChild variant="outline"><Link href={`/clients/${p.tenantId}/integrations`} data-testid={`link-integrations-${p.tenantId}`}>Integrations</Link></Button></div>
        </div>))}</div>}
    </>
  );
}

export function NotProvisioned() {
  return <EmptyState title="Not provisioned" body="This Exchange admin is not delivered to your account." action={<Button asChild><Link href="/account">Back to Dashboard</Link></Button>} />;
}

export { ConfigureExchange };

export function AccountProfile() {
  return (<><PageHeader eyebrow="Your sign-in" title="Profile / Account" /><div className="overflow-x-auto"><UserProfile routing="hash" appearance={{
    variables: {
      colorPrimary: 'var(--s-primary)', colorForeground: 'var(--s-fg)',
      colorMutedForeground: 'var(--s-muted)', colorBackground: 'var(--s-card)',
      colorInput: 'var(--s-bg2)', colorInputForeground: 'var(--s-fg)',
      colorNeutral: 'var(--s-muted)', colorDanger: 'hsl(var(--destructive))',
      fontFamily: 'var(--s-font)', borderRadius: 'var(--s-r1)',
    },
  }} /></div></>);
}
