import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useListTenants, useListWhiteLabelRequests, useGetTenant, getGetTenantQueryKey, type TenantSummary, type WhiteLabelRequest } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton, StatusBadge, stepLabel } from '@/components/app/bits';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OrderStatus } from '@/components/customer/order-view';
import { Chips, DataList, Field, NOT_RECORDED, Pager, Pill, SearchBox, usePaged, type Col } from '@/components/super-admin/kit';
import { usePlatform } from '@/components/super-admin/platform';
import { orderRef } from '@/lib/wl';
import { stamp } from '@/lib/format';

type State = 'Pending' | 'Configuring' | 'Ready' | 'Delivered';
interface Row { key: string; order: WhiteLabelRequest | null; tenant: TenantSummary | null; state: State }

function stateOf(o: WhiteLabelRequest | null, t: TenantSummary | null): State {
  if (o?.status === 'delivered') return 'Delivered';
  if (t && t.status === 'active') return 'Ready';
  if (o?.status === 'ready') return 'Ready';
  if (t || (o && ['in_setup', 'customization'].includes(o.status))) return 'Configuring';
  return 'Pending';
}

function Blockers({ tenantId }: { tenantId: string }) {
  const q = useGetTenant(tenantId, { query: { enabled: !!tenantId, queryKey: getGetTenantQueryKey(tenantId) } });
  if (q.isLoading) return <p className="text-sm text-muted-foreground" role="status">Reading activation facts</p>;
  if (q.isError || !q.data) return <p className="text-sm text-destructive" role="alert">Activation facts could not be read. <button className="underline" onClick={() => q.refetch()}>Retry</button></p>;
  const b = q.data.activationBlockers ?? [];
  return b.length ? <ul className="list-disc space-y-1 pl-5 text-sm" data-testid="list-blockers">{b.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-sm" data-testid="text-no-blockers">The server reports no activation blockers.{q.data.configurationComplete ? '' : ' Configuration is still marked incomplete.'}</p>;
}

export default function Provisioning() {
  const oq = useListWhiteLabelRequests(); const tq = useListTenants(); const { pm, isLoading: pmLoading, isError: pmErr, refetch } = usePlatform();
  const [s, setS] = useState(''); const [f, setF] = useState('all'); const [sel, setSel] = useState<Row | null>(null);
  const rows = useMemo<Row[]>(() => {
    const tenants = tq.data ?? []; const orders = (oq.data ?? []).filter((o) => ['approved', 'in_setup', 'customization', 'ready', 'delivered'].includes(o.status));
    const used = new Set<string>();
    const out: Row[] = orders.map((o) => { const t = tenants.find((x) => x.id === o.tenantId) ?? null; if (t) used.add(t.id); return { key: o.id, order: o, tenant: t, state: stateOf(o, t) }; });
    for (const t of tenants) if (!used.has(t.id) && !(oq.data ?? []).some((o) => o.tenantId === t.id)) out.push({ key: `t-${t.id}`, order: null, tenant: t, state: stateOf(null, t) });
    return out;
  }, [oq.data, tq.data]);
  const cust = (r: Row) => { const id = r.order?.customerUserId ?? pm?.projects.find((p) => p.tenantId === r.tenant?.id)?.customerIds[0]; if (!id) return pmLoading ? 'Loading' : NOT_RECORDED; return pm?.customers.find((c) => c.id === id)?.name || id; };
  const k = s.trim().toLowerCase();
  const list = rows.filter((r) => (f === 'all' || r.state === f) && (!k || [r.order ? orderRef(r.order) : '', r.order?.projectName, r.tenant?.brandName, r.tenant?.slug, cust(r)].some((v) => (v ?? '').toLowerCase().includes(k))));
  const pg = usePaged(list, `${s}|${f}`);
  const name = (r: Row) => r.tenant?.brandName ?? r.order?.brandName ?? r.order?.projectName ?? 'Unnamed';
  const cols: Col<Row>[] = [
    { key: 'p', header: 'White Label', primary: true, cell: (r) => <span><span className="block font-display text-xl">{name(r)}</span><span className="font-mono text-xs text-copper">{r.order ? orderRef(r.order) : 'No order (manually prepared)'}</span></span> },
    { key: 'c', header: 'Customer', cell: cust },
    { key: 'st', header: 'State', cell: (r) => <Pill tone={r.state === 'Delivered' || r.state === 'Ready' ? 'ok' : 'warn'}>{r.state}</Pill> },
    { key: 'o', header: 'Order', cell: (r) => r.order ? <OrderStatus status={r.order.status} /> : 'No order' },
    { key: 't', header: 'Project', cell: (r) => r.tenant ? <span className="flex flex-col gap-1"><StatusBadge status={r.tenant.status} /><span className="text-xs capitalize text-muted-foreground">{stepLabel(r.tenant.provisioningStep)}</span></span> : 'Not prepared' },
    { key: 'cr', header: 'Created', cell: (r) => <span className="font-mono text-xs">{stamp(r.tenant?.createdAt ?? r.order?.createdAt ?? '')}</span> },
    { key: 'u', header: 'Updated', cell: (r) => <span className="font-mono text-xs">{r.order?.updatedAt ? stamp(r.order.updatedAt) : NOT_RECORDED}</span> },
    { key: 'e', header: 'Error / failed', cell: () => <span className="text-xs text-muted-foreground">Not recorded</span> },
    { key: 'l', header: 'Open', cell: (r) => <button className="text-xs text-copper underline" data-testid={`button-details-${r.key}`} onClick={() => setSel(r)}>View details</button> },
  ];
  const states: State[] = ['Pending', 'Configuring', 'Ready', 'Delivered'];
  return (
    <>
      <PageHeader eyebrow="System" title="Provisioning" />
      <div className="mb-5 max-w-3xl rounded-md border bg-card p-4 text-sm text-muted-foreground" data-testid="note-provisioning">
        Read-only view derived from saved order and project records. Approving a native order prepares its draft project automatically. There are no automated provisioning jobs, so running, queued or failed job states are not recorded and error columns read Not recorded.
      </div>
      {pmErr && <p role="alert" className="mb-4 text-sm">Customer names could not be loaded. <button className="text-copper underline" onClick={() => refetch()}>Retry</button></p>}
      {oq.isLoading || tq.isLoading ? <ListSkeleton /> : oq.isError || tq.isError ? <ErrorState what="provisioning facts" onRetry={() => { oq.refetch(); tq.refetch(); }} /> : (
        <div className="space-y-4">
          <SearchBox id="prov" value={s} onChange={setS} placeholder="Search order, project, customer" />
          <Chips id="prov" value={f} onChange={setF} options={[['all', `All (${rows.length})`], ...states.map((x): [string, string] => [x, `${x} (${rows.filter((r) => r.state === x).length})`])]} />
          <DataList id="prov" rows={pg.rows} cols={cols} rowKey={(r) => r.key} onOpen={(r: Row) => setSel(r)} emptyTitle="Nothing to provision" emptyBody="Approved orders and prepared projects appear here." />
          {list.length > 0 && <Pager id="prov" p={pg} />}
        </div>)}
      <Sheet open={!!sel} onOpenChange={(v) => { if (!v) setSel(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl" data-testid="drawer-provisioning">
          {sel && <>
            <SheetHeader><SheetTitle className="font-display text-2xl">{name(sel)}</SheetTitle><SheetDescription>{sel.state}</SheetDescription></SheetHeader>
            <dl className="mt-4 divide-y"><Field k="Customer" v={cust(sel)} /><Field k="Order" v={sel.order ? <Link href={`/white-label-requests/${sel.order.id}`} className="text-copper underline">{orderRef(sel.order)}</Link> : 'No order'} /><Field k="Project" v={sel.tenant ? <Link href={`/clients/${sel.tenant.id}`} className="text-copper underline">{sel.tenant.slug}</Link> : 'Not prepared'} /><Field k="Failure" v={NOT_RECORDED} /></dl>
            <h3 className="mt-6 font-display text-lg">Activation blockers</h3>
            <div className="mt-2">{sel.tenant ? <Blockers tenantId={sel.tenant.id} /> : <p className="text-sm text-muted-foreground">No project is prepared yet, so no activation facts exist. Approval prepares one for native orders.</p>}</div>
          </>}
        </SheetContent>
      </Sheet>
    </>
  );
}
