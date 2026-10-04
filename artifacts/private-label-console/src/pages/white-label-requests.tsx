import { useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useListWhiteLabelRequests, getListWhiteLabelRequestsQueryKey, useReviewWhiteLabelRequest, useProvisionWhiteLabelRequest, useListTenants, type WhiteLabelRequest } from '@workspace/api-client-react';
import { PageHeader, ErrorState, EmptyState, ListSkeleton, StatusBadge } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const errMsg = (e: unknown) => (e as { data?: { error?: string; message?: string } }).data?.error ?? (e as { data?: { message?: string } }).data?.message ?? (e as Error).message ?? 'Request failed';

function Card({ x, onDone }: { x: WhiteLabelRequest; onDone: () => void }) {
  const tenants = useListTenants();
  const review = useReviewWhiteLabelRequest(); const prov = useProvisionWhiteLabelRequest();
  const [m, setM] = useState(x.monthlyPrice ?? ''); const [s, setS] = useState(x.setupPrice ?? '');
  const [cur, setCur] = useState(x.currency ?? 'USD'); const [note, setNote] = useState(x.operatorNote);
  const [tid, setTid] = useState(x.tenantId ?? ''); const [err, setErr] = useState<string | null>(null);
  const price = /^\d{1,12}(\.\d{1,2})?$/;
  const priced = price.test(m) && price.test(s);
  const rev = (status: 'approved' | 'rejected') => { setErr(null); review.mutate({ requestId: x.id, data: { status, monthlyPrice: m || '0', setupPrice: s || '0', currency: cur as 'USD', operatorNote: note } }, { onSuccess: onDone, onError: (e) => setErr(errMsg(e)) }); };
  const deliver = () => { setErr(null); prov.mutate({ requestId: x.id, data: { tenantId: tid } }, { onSuccess: onDone, onError: (e) => setErr(errMsg(e)) }); };
  const ready = (tenants.data ?? []).filter((t) => t.status === 'active' && t.exchangeProvisioned === true);
  const editable = x.status === 'submitted';
  return (
    <div className="rounded-md border bg-card p-5" data-testid={`row-request-${x.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-display text-2xl">{x.projectName} <span className="text-sm text-muted-foreground">{x.brandName}</span></p><StatusBadge status={x.status} /></div>
      <p className="mt-1 font-mono text-[11px] uppercase text-copper">{x.actions.join(' / ')} · customer {x.customerUserId}{x.preferredDomain ? ` · ${x.preferredDomain}` : ''}</p>
      {x.details && <p className="mt-2 text-sm text-muted-foreground">{x.details}</p>}
      {editable && (
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="text-sm">Monthly<Input data-testid={`input-monthly-${x.id}`} value={m} onChange={(e) => setM(e.target.value)} placeholder="0.00" /></label>
          <label className="text-sm">Setup<Input data-testid={`input-setup-${x.id}`} value={s} onChange={(e) => setS(e.target.value)} placeholder="0.00" /></label>
          <label className="text-sm">Currency<select value={cur} onChange={(e) => setCur(e.target.value)} className="h-10 w-full rounded-md border bg-background px-2 text-sm"><option>USD</option><option>EUR</option><option>GBP</option></select></label>
          <label className="text-sm md:col-span-4">Operator note<Textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <div className="flex gap-2 md:col-span-4"><Button data-testid={`button-approve-${x.id}`} disabled={!priced || review.isPending} onClick={() => rev('approved')}>Approve</Button><Button variant="outline" data-testid={`button-reject-${x.id}`} disabled={review.isPending} onClick={() => rev('rejected')}>Reject</Button></div>
        </div>)}
      {!editable && <p className="mt-3 text-sm">Monthly {x.monthlyPrice ?? '-'} · Setup {x.setupPrice ?? '-'} {x.currency ?? ''}{x.operatorNote ? ` · ${x.operatorNote}` : ''}</p>}
      {x.status === 'approved' && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <p className="text-sm">Prepare the tenant first, then deliver it to this customer:</p>
          <div className="flex flex-wrap gap-3 text-sm text-copper"><Link href="/clients/new" className="underline" data-testid="link-prepare-new">Prepare new client</Link>
            {ready.length > 0 && <span className="text-muted-foreground">or configure and activate an existing client:</span>}
            {ready.map((t) => <Link key={t.id} href={`/clients/${t.id}`} className="underline">{t.brandName}</Link>)}</div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">Active prepared tenant<select data-testid={`select-tenant-${x.id}`} value={tid} onChange={(e) => setTid(e.target.value)} className="block h-10 min-w-56 rounded-md border bg-background px-2 text-sm"><option value="">Select tenant</option>{ready.map((t) => <option key={t.id} value={t.id}>{t.brandName} ({t.slug})</option>)}</select></label>
            <Button data-testid={`button-deliver-${x.id}`} disabled={!tid || prov.isPending} onClick={deliver}>{prov.isPending ? 'Delivering' : 'Deliver to customer'}</Button>
          </div>
        </div>)}
      {x.status === 'provisioned' && x.tenantId && <Link href={`/clients/${x.tenantId}`} className="mt-3 inline-block text-sm text-copper underline">Delivered tenant detail</Link>}
      {err && <p role="alert" className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" data-testid="text-error">{err}</p>}
    </div>
  );
}

export default function WhiteLabelRequests() {
  const qc = useQueryClient();
  const q = useListWhiteLabelRequests({ query: { queryKey: getListWhiteLabelRequestsQueryKey(), refetchOnWindowFocus: true } });
  const refresh = () => qc.invalidateQueries({ queryKey: getListWhiteLabelRequestsQueryKey() });
  return (
    <>
      <PageHeader eyebrow="Operator" title="White Label requests" />
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState what="the request queue" onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState title="Queue is empty" body="Customer Exchange requests appear here." /> : (
        <div className="space-y-4">{(q.data ?? []).map((x) => <Card key={x.id} x={x} onDone={refresh} />)}</div>)}
    </>
  );
}
