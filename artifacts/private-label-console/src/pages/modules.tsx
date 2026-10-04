import { useListModuleCatalog } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton, SandboxNote } from '@/components/app/bits';
import { label } from '@/lib/format';

export default function Modules() {
  const q = useListModuleCatalog();
  return (
    <>
      <PageHeader eyebrow="Catalog" title="Modules" />
      <p className="mb-6 max-w-xl text-sm text-muted-foreground">Modules are entitlements a client can be granted. Enabling one records access in the sandbox; it does not deploy a product.</p>
      {q.isLoading ? <ListSkeleton rows={6} /> : q.isError ? <ErrorState what="the catalog" onRetry={() => q.refetch()} /> : (
        <div className="grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-2">
          {q.data?.map((m, i) => (
            <div key={m.key} data-testid={`card-module-${m.key}`} className="bg-card p-5">
              <div className="flex items-baseline justify-between"><span className="font-mono text-xs text-copper">0{i + 1}</span><span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label(m.category)}</span></div>
              <h3 className="font-display mt-3 text-2xl">{m.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
              <p className="mt-4 font-mono text-[11px] text-muted-foreground">{m.key} · {m.sandboxAvailable ? 'sandbox available' : 'not in sandbox'}</p>
            </div>
          ))}
        </div>)}
      <div className="mt-6"><SandboxNote /></div>
    </>
  );
}
