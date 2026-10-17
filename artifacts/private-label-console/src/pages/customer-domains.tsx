import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListCustomerDomains, useGetDomainVerification, getGetDomainVerificationQueryKey, useVerifyTenantDomain,
  useCheckTenantDomainHosting, useManageTenantDomainHosting,
} from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DnsRecordList } from '@/components/app/management';

function Detail({ id, requestId }: { id: string; requestId: string | null }) {
  const q = useGetDomainVerification(id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const verify = useVerifyTenantDomain();
  const host = useCheckTenantDomainHosting();
  const manage = useManageTenantDomainHosting();
  const d = q.data;
  const put = (r: never) => { qc.setQueryData(getGetDomainVerificationQueryKey(id), r); };
  const fail = (t: string) => (e: unknown) => toast({ title: t, description: (e as Error).message, variant: 'destructive' });
  const act = (action: 'register' | 'refresh') => manage.mutate({ tenantId: id, data: { action } }, {
    onSuccess: (r) => { put(r as never); setConfirm(false); toast({ title: action === 'register' ? 'Registration requested' : 'Provider state refreshed' }); },
    onError: (e) => { setConfirm(false); const s = (e as { status?: number }).status; toast({ title: s === 409 ? 'Activation is held' : 'Hosting action failed', description: (e as Error).message, variant: 'destructive' }); },
  });
  return (
    <div className="space-y-3 rounded-md border bg-card p-5" data-testid="panel-domain-detail">
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href={`/clients/${id}`} className="text-copper hover:underline" data-testid="link-domain-settings">Client settings</Link>
        {requestId && <Link href={`/white-label-requests/${requestId}`} className="text-copper hover:underline" data-testid="link-domain-order">Order</Link>}
      </div>
      {q.isLoading ? <ListSkeleton /> : q.isError || !d ? <ErrorState what="domain verification" onRetry={() => q.refetch()} /> : d.status === 'unconfigured' ? <p className="text-sm text-muted-foreground">No domain saved for this tenant.</p> : (
        <>
          <div className="grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-4">
            {[['Domain', d.domain ?? ''], ['TXT ownership', d.status], ['Provider registration', d.providerRegistered ? (d.providerVerified ? 'registered, verified' : 'registered, unverified') : 'not registered'], ['HTTPS', d.httpsReady ? 'proven' : 'not proven']].map(([l, v]) => (
              <div key={l} className="bg-card p-3"><p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{l}</p><p className="mt-1 break-all text-sm">{v}</p></div>))}
          </div>
          <p className="text-xs text-muted-foreground">TXT ownership, provider registration and HTTPS are separate. Ownership never implies HTTPS.</p>
          <DnsRecordList d={d} />
          {d.providerError && <p role="alert" className="text-sm text-destructive [overflow-wrap:anywhere]">Provider: {d.providerError}</p>}
          {d.hostingError && <p role="alert" className="text-sm text-destructive [overflow-wrap:anywhere]">Hosting: {d.hostingError}</p>}
          {d.providerCheckedAt && <p className="text-xs text-muted-foreground">Provider checked {new Date(d.providerCheckedAt).toLocaleString()}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" data-testid="button-op-verify" disabled={verify.isPending} onClick={() => verify.mutate({ tenantId: id }, { onSuccess: (r) => { put(r as never); toast({ title: r.status === 'verified' ? 'Domain verified' : 'TXT record not found yet' }); }, onError: fail('Verification failed') })}>Check DNS record</Button>
            <Button variant="outline" data-testid="button-op-hosting" disabled={d.status !== 'verified' || host.isPending} onClick={() => host.mutate({ tenantId: id }, { onSuccess: (r) => { put(r as never); toast({ title: r.httpsReady ? 'HTTPS is ready' : 'Hosting not ready yet' }); }, onError: fail('Hosting check failed') })}>Check hosting and HTTPS</Button>
            <Button variant="outline" data-testid="button-op-refresh" disabled={!d.providerManagementAvailable || manage.isPending} onClick={() => act('refresh')}>Refresh provider state</Button>
            <Button data-testid="button-op-register" disabled={!d.providerManagementAvailable || manage.isPending} onClick={() => setConfirm(true)}>Register with provider</Button>
          </div>
          {!d.providerManagementAvailable && <p className="text-xs text-muted-foreground" data-testid="text-provider-unavailable">Provider management is not configured on the backend, so register and refresh are disabled.</p>}
          {confirm && (
            <div className="space-y-2 rounded-md border border-copper/50 bg-copper/10 p-3" data-testid="panel-confirm-register">
              <p className="text-sm">Register {d.domain} with the hosting provider. This does not edit the customer's DNS. The backend may hold activation (409) until requirements are met.</p>
              <div className="flex gap-2"><Button size="sm" data-testid="button-confirm-register" disabled={manage.isPending} onClick={() => act('register')}>{manage.isPending ? 'Working' : 'Confirm register'}</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button></div>
            </div>)}
        </>)}
    </div>
  );
}

export default function CustomerDomains() {
  const q = useListCustomerDomains();
  const [s, setS] = useState('');
  const [sel, setSel] = useState('');
  const rows = useMemo(() => (q.data ?? []).filter((r) => `${r.name} ${r.slug} ${r.domain ?? ''} ${r.deliveryStatus} ${r.status}`.toLowerCase().includes(s.toLowerCase())), [q.data, s]);
  const cur = (q.data ?? []).find((r) => r.tenantId === sel);
  return (
    <>
      <PageHeader eyebrow="Platform" title="Customer Domains" />
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">Saved tenant domains and their delivery state. Operators control hosting registration; no customer DNS is edited here.</p>
      <Input data-testid="input-search-domains" className="mb-4 max-w-md" placeholder="Search tenant, slug, domain" value={s} onChange={(e) => setS(e.target.value)} />
      {q.isLoading ? <ListSkeleton /> : q.isError || !q.data ? <ErrorState what="customer domains" onRetry={() => q.refetch()} /> : rows.length === 0 ? <p className="rounded border border-dashed p-6 text-sm text-muted-foreground" data-testid="empty-domains">No tenant domains match.</p> : (
        <div className="space-y-4">
          <div className="divide-y rounded-md border bg-card">
            {rows.map((r) => (
              <button key={r.tenantId} type="button" data-testid={`row-domain-${r.tenantId}`} onClick={() => setSel(r.tenantId)} className={`flex w-full flex-wrap items-center gap-3 p-3 text-left text-sm hover:bg-muted/40 ${sel === r.tenantId ? 'bg-muted/50' : ''}`}>
                <span className="min-w-0 flex-1"><span className="block">{r.name} <span className="font-mono text-[11px] text-muted-foreground">{r.slug}</span></span><span className="block break-all font-mono text-xs text-muted-foreground">{r.domain ?? 'no domain'}</span></span>
                <span className="font-mono text-[10px] uppercase text-muted-foreground">domain {r.status}</span>
                <span className="font-mono text-[10px] uppercase text-muted-foreground">delivery {r.deliveryStatus}</span>
              </button>))}
          </div>
          {cur && <Detail key={cur.tenantId} id={cur.tenantId} requestId={cur.requestId} />}
        </div>)}
    </>
  );
}
