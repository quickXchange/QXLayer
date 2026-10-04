import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useCreateTenant, type Tenant } from '@workspace/api-client-react';
import { PageHeader } from '@/components/app/bits';
import { BrandSection, DomainSection, ModulesSection, AssetsSection, ConfigSection } from '@/components/app/sections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCan } from '@/lib/principal';
import { useInvalidateTenant } from '@/lib/invalidate';
import { useGetTenant, getGetTenantQueryKey } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

const steps = ['Create client', 'Brand', 'Domain', 'Modules', 'Assets and networks', 'Configuration'];
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

function Wizard({ initial }: { initial: Tenant }) {
  const [step, setStep] = useState(1);
  const [, nav] = useLocation();
  const q = useGetTenant(initial.id, { query: { enabled: true, queryKey: getGetTenantQueryKey(initial.id), initialData: initial } });
  const t = q.data ?? initial;
  const next = () => (step === 5 ? nav(`/clients/${t.id}`) : setStep(step + 1));
  const common = { tenant: t, onSaved: next, saveLabel: step === 5 ? 'Save and finish' : 'Save and continue' };
  return (
    <div className="space-y-4">
      {step > 1 && step < 5 && <button className="text-sm text-muted-foreground hover:text-foreground" onClick={next} data-testid="button-skip">Skip this step</button>}
      {step === 1 && <BrandSection {...common} />}
      {step === 2 && <DomainSection {...common} />}
      {step === 3 && <ModulesSection {...common} />}
      {step === 4 && <AssetsSection {...common} />}
      {step === 5 && <ConfigSection {...common} />}
      {step > 1 && <Button variant="ghost" onClick={() => setStep(step - 1)} data-testid="button-back">Back</Button>}
    </div>
  );
}

export default function ClientNew() {
  const can = useCan();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState<Tenant | null>(null);
  const m = useCreateTenant();
  const inv = useInvalidateTenant();
  const { toast } = useToast();
  const s = touched ? slug : slugify(name);
  const valid = name.trim().length >= 2 && s.length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
  if (!can.createClients) return (<><PageHeader eyebrow="Tenants" title="New client" /><p className="text-sm text-muted-foreground" data-testid="text-forbidden">Only a super admin can create clients. <Link href="/clients" className="text-copper underline">Back to clients</Link></p></>);
  return (
    <>
      <PageHeader eyebrow="Provisioning wizard" title="New client" />
      <ol className="mb-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider">
        {steps.map((l, i) => <li key={l} className={i === 0 ? (created ? 'text-muted-foreground line-through' : 'text-copper') : created ? 'text-muted-foreground' : 'text-muted-foreground/60'}>0{i + 1} {l}</li>)}
      </ol>
      <div className="max-w-3xl">
        {created ? <Wizard initial={created} /> : (
          <form className="space-y-4 rounded-md border bg-card p-5" onSubmit={(e) => { e.preventDefault(); m.mutate({ data: { name: name.trim(), slug: s } }, { onSuccess: (t) => { inv(); setCreated(t); }, onError: (er) => toast({ title: 'Could not create client', description: (er as Error).message, variant: 'destructive' }) }); }}>
            <div className="space-y-1.5"><Label>Client name</Label><Input data-testid="input-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Slug</Label><Input data-testid="input-slug" className="font-mono" value={s} onChange={(e) => { setTouched(true); setSlug(e.target.value); }} />
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers and hyphens.</p></div>
            <div className="flex justify-end"><Button data-testid="button-create" disabled={!valid || m.isPending}>{m.isPending ? 'Creating' : 'Create draft client'}</Button></div>
          </form>)}
      </div>
    </>
  );
}
