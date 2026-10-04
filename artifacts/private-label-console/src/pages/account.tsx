import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { UserProfile } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { useSubmitWhiteLabelRequest, getListMyWhiteLabelRequestsQueryKey, type WhiteLabelRequest } from '@workspace/api-client-react';
import { PageHeader, ErrorState, EmptyState, ListSkeleton, StatusBadge } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminPanels, useMyRequests, money } from '@/lib/customer';

const Stat = ({ label, value, id }: { label: string; value: ReactNode; id: string }) => (
  <div className="rounded-md border bg-card p-5"><p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p><p data-testid={id} className="font-display mt-2 text-4xl">{value}</p></div>
);

export function AccountDashboard() {
  const r = useMyRequests(); const a = useAdminPanels();
  const reqs = r.data ?? []; const panels = a.data ?? [];
  return (
    <>
      <PageHeader eyebrow="Customer account" title="Dashboard"><Button asChild data-testid="button-configure"><Link href="/account/configure">Configure Exchange</Link></Button></PageHeader>
      {r.isLoading ? <ListSkeleton rows={2} /> : r.isError ? <ErrorState what="your requests" onRetry={() => r.refetch()} /> : (
        <div className="grid gap-4 md:grid-cols-4">
          <Stat id="stat-requests" label="Requests" value={reqs.length} />
          <Stat id="stat-pending" label="Awaiting review" value={reqs.filter((x) => x.status === 'submitted').length} />
          <Stat id="stat-approved" label="Approved" value={reqs.filter((x) => x.status === 'approved').length} />
          <Stat id="stat-panels" label="Delivered panels" value={panels.length} />
        </div>)}
      {!r.isLoading && reqs.length === 0 && <div className="mt-8"><EmptyState title="No Exchange project yet" body="Configure a white-label Exchange and an operator will review it." action={<Button asChild><Link href="/account/configure">Configure Exchange</Link></Button>} /></div>}
    </>
  );
}

function ReqRow({ x, panelIds }: { x: WhiteLabelRequest; panelIds: string[] }) {
  return (
    <div className="rounded-md border bg-card p-4" data-testid={`row-request-${x.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-display text-xl">{x.projectName} <span className="text-sm text-muted-foreground">{x.brandName}</span></p><StatusBadge status={x.status} /></div>
      <p className="mt-1 font-mono text-[11px] uppercase text-copper">{x.actions.join(' / ')} · {new Date(x.createdAt).toLocaleDateString()}</p>
      {x.details && <p className="mt-2 text-sm text-muted-foreground">{x.details}</p>}
      <p className="mt-2 text-sm">Monthly: {money(x.monthlyPrice, x.currency)} · Setup: {money(x.setupPrice, x.currency)}</p>
      {x.operatorNote && <p className="mt-1 text-sm">Operator note: {x.operatorNote}</p>}
      {x.status === 'provisioned' && x.tenantId && panelIds.includes(x.tenantId) && <Button asChild size="sm" className="mt-3"><Link href={`/clients/${x.tenantId}/exchange`}>Open Admin</Link></Button>}
    </div>
  );
}

function RequestList({ title, eyebrow, withPanels }: { title: string; eyebrow: string; withPanels?: boolean }) {
  const r = useMyRequests(); const a = useAdminPanels();
  const reqs = r.data ?? []; const ids = (a.data ?? []).map((p) => p.tenantId);
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title}><Button asChild variant="outline"><Link href="/account/configure">Configure Exchange</Link></Button></PageHeader>
      {r.isLoading ? <ListSkeleton /> : r.isError ? <ErrorState what="your requests" onRetry={() => r.refetch()} /> : reqs.length === 0 ? (
        <EmptyState title={withPanels ? 'No white labels yet' : 'No orders yet'} body="Nothing has been requested. Configure an Exchange to get started." action={<Button asChild><Link href="/account/configure">Configure Exchange</Link></Button>} />
      ) : <div className="space-y-3">{reqs.map((x) => <ReqRow key={x.id} x={x} panelIds={withPanels ? ids : []} />)}</div>}
    </>
  );
}
export const AccountOrders = () => <RequestList title="My Orders" eyebrow="Purchase and service requests" />;
export const AccountWhiteLabels = () => <RequestList title="My White Labels" eyebrow="Projects" withPanels />;

export function AdminPanels() {
  const a = useAdminPanels();
  const panels = a.data ?? [];
  return (
    <>
      <PageHeader eyebrow="Delivered projects" title="My Admin Panels" />
      {a.isLoading ? <ListSkeleton rows={2} /> : a.isError ? <ErrorState what="your admin panels" onRetry={() => a.refetch()} /> : panels.length === 0 ? (
        <EmptyState title="No admin panel is provisioned" body="An admin panel appears here after an operator delivers your Exchange." action={<Button asChild><Link href="/account">Back to Dashboard</Link></Button>} />
      ) : <div className="grid gap-4 md:grid-cols-2">{panels.map((p) => (
        <div key={p.tenantId} className="rounded-md border bg-card p-5" data-testid={`card-panel-${p.tenantId}`}>
          <div className="flex items-center justify-between"><p className="font-display text-2xl">{p.brandName}</p><StatusBadge status={p.status} /></div>
          <p className="mt-1 font-mono text-[11px] uppercase text-copper">{p.slug} · {p.role.replace('_', ' ')}</p>
          <Button asChild className="mt-4"><Link href={`/clients/${p.tenantId}/exchange`}>Open Admin</Link></Button>
        </div>))}</div>}
    </>
  );
}

export function NotProvisioned() {
  return <EmptyState title="Not provisioned" body="This Exchange admin is not delivered to your account." action={<Button asChild><Link href="/account">Back to Dashboard</Link></Button>} />;
}

const ACTS = ['swap', 'convert', 'buy', 'sell'] as const;
export function ConfigureExchange() {
  const qc = useQueryClient(); const submit = useSubmitWhiteLabelRequest();
  const [f, setF] = useState({ projectName: '', brandName: '', domain: '', details: '' });
  const [acts, setActs] = useState<string[]>(['swap']);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const key = useRef(crypto.randomUUID());
  const valid = f.projectName.trim().length >= 2 && f.brandName.trim().length >= 2 && acts.length > 0;
  const go = () => {
    setErr(null);
    submit.mutate({ data: { projectName: f.projectName.trim(), brandName: f.brandName.trim(), preferredDomain: f.domain.trim() || null, actions: ACTS.filter((x) => acts.includes(x)), details: f.details, idempotencyKey: key.current } }, {
      onSuccess: () => { setDone(true); key.current = crypto.randomUUID(); setF({ projectName: '', brandName: '', domain: '', details: '' }); qc.invalidateQueries({ queryKey: getListMyWhiteLabelRequestsQueryKey() }); },
      onError: (e) => setErr((e as { data?: { error?: string; message?: string }; message?: string }).data?.error ?? (e as { data?: { message?: string } }).data?.message ?? (e as Error).message ?? 'Submission failed'),
    });
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setDone(false); setF({ ...f, [k]: e.target.value }); };
  return (
    <>
      <PageHeader eyebrow="White label" title="Configure Exchange" />
      <form onSubmit={(e) => { e.preventDefault(); go(); }} className="max-w-xl space-y-4">
        <p className="text-sm text-muted-foreground">Describe the Exchange you want. An operator reviews the request and sets pricing; nothing is charged here.</p>
        <label className="block text-sm">Project name<Input data-testid="input-project" value={f.projectName} onChange={set('projectName')} maxLength={100} /></label>
        <label className="block text-sm">Brand name<Input data-testid="input-brand" value={f.brandName} onChange={set('brandName')} maxLength={100} /></label>
        <label className="block text-sm">Preferred domain (optional)<Input data-testid="input-domain" value={f.domain} onChange={set('domain')} maxLength={253} /></label>
        <fieldset className="flex flex-wrap gap-5 text-sm"><legend className="mb-1">Actions</legend>
          {ACTS.map((x) => <label key={x} className="flex items-center gap-2 capitalize"><Checkbox data-testid={`check-${x}`} checked={acts.includes(x)} onCheckedChange={(v) => setActs(v ? [...acts, x] : acts.filter((y) => y !== x))} />{x}</label>)}
        </fieldset>
        <label className="block text-sm">Details<Textarea data-testid="input-details" value={f.details} onChange={set('details')} maxLength={1000} /></label>
        {err && <p role="alert" data-testid="text-error" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">{err}</p>}
        {done && <p data-testid="text-submitted" className="rounded-md border p-3 text-sm">Request submitted. <Link href="/account/orders" className="text-copper underline">View My Orders</Link></p>}
        <Button type="submit" data-testid="button-submit" disabled={!valid || submit.isPending}>{submit.isPending ? 'Submitting' : 'Submit request'}</Button>
      </form>
    </>
  );
}

export function AccountProfile() {
  return (<><PageHeader eyebrow="Your sign-in" title="Profile / Account" /><div className="overflow-x-auto"><UserProfile routing="hash" /></div></>);
}
