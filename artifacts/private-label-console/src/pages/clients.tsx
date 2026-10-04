import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Search } from 'lucide-react';
import { useListTenants } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton, EmptyState, StatusBadge, stepLabel } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCan } from '@/lib/principal';
import { ago } from '@/lib/format';

export default function Clients() {
  const q = useListTenants();
  const can = useCan();
  const [s, setS] = useState('');
  const rows = useMemo(() => (q.data ?? []).filter((t) => `${t.name} ${t.slug} ${t.brandName} ${t.domain ?? ''}`.toLowerCase().includes(s.toLowerCase())), [q.data, s]);
  const newBtn = can.createClients ? <Button asChild data-testid="link-new-client"><Link href="/clients/new">New client</Link></Button> : null;
  return (
    <>
      <PageHeader eyebrow="Tenants" title="Clients">{newBtn}</PageHeader>
      <div className="relative mb-4 max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input data-testid="input-search" className="pl-9" placeholder="Search name, slug, domain" value={s} onChange={(e) => setS(e.target.value)} /></div>
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState what="clients" onRetry={() => q.refetch()} /> :
        rows.length === 0 ? <EmptyState title={s ? 'No match' : 'No clients yet'} body={s ? 'Nothing matches that search.' : can.createClients ? 'Create the first client to begin provisioning.' : 'No client is visible to your account.'} action={!s && newBtn} /> : (
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="hidden grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground md:grid"><span>Client</span><span>Domain</span><span>Status</span><span>Step</span><span>Created</span></div>
          {rows.map((t) => (
            <Link key={t.id} href={`/clients/${t.id}`} data-testid={`row-client-${t.id}`} className="grid gap-1 border-b px-4 py-3 last:border-0 hover:bg-muted/40 md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr] md:items-center md:gap-4">
              <div><p className="font-medium">{t.brandName}</p><p className="font-mono text-xs text-muted-foreground">{t.slug} · {t.enabledModules.length} modules</p></div>
              <span className="truncate font-mono text-xs">{t.domain ?? 'no domain'}</span>
              <span><StatusBadge status={t.status} /></span>
              <span className="text-sm capitalize">{stepLabel(t.provisioningStep)}</span>
              <span className="text-xs text-muted-foreground">{ago(t.createdAt)}</span>
            </Link>
          ))}
        </div>)}
    </>
  );
}
