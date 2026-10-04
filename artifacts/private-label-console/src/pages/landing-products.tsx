import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, RefreshCw } from 'lucide-react';
import {
  useListLandingProducts, useUpdateLandingProduct, getListLandingProductsQueryKey, getGetPublicProductCatalogQueryKey,
  type LandingProduct, type LandingProductInput,
} from '@workspace/api-client-react';
import { usePrincipal } from '@/lib/principal';
import { useToast } from '@/hooks/use-toast';
import { ProductIcon, ICON_KEYS } from '@/components/landing/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Form = { visible: boolean; name: string; description: string; icon: string; startingPrice: string; setupFee: string; currency: string; billingPeriod: string; status: string; ctaLabel: string; displayOrder: string };
const PRICE = /^(0|[1-9][0-9]{0,9})(\.[0-9]{1,2})?$/;

const toForm = (p: LandingProduct): Form => ({ visible: p.visible, name: p.name, description: p.description, icon: p.icon, startingPrice: p.startingPrice ?? '', setupFee: p.setupFee ?? '', currency: p.currency, billingPeriod: p.billingPeriod, status: p.status, ctaLabel: p.ctaLabel, displayOrder: String(p.displayOrder) });

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {};
  if (f.name.trim().length < 2 || f.name.length > 100) e.name = 'Name must be 2 to 100 characters.';
  if (f.description.trim().length < 10 || f.description.length > 500) e.description = 'Description must be 10 to 500 characters.';
  if (f.startingPrice !== '' && !PRICE.test(f.startingPrice)) e.startingPrice = 'Use a number with up to 2 decimals, or leave empty for pricing on request.';
  if (f.setupFee !== '' && !PRICE.test(f.setupFee)) e.setupFee = 'Use a number with up to 2 decimals, or leave empty.';
  if (!/^[A-Z]{3}$/.test(f.currency)) e.currency = 'Three uppercase letters, for example USD.';
  if (f.ctaLabel.trim().length < 2 || f.ctaLabel.length > 40) e.ctaLabel = 'Label must be 2 to 40 characters.';
  const o = Number(f.displayOrder);
  if (f.displayOrder.trim() === '' || !Number.isInteger(o) || o < 0 || o > 10000) e.displayOrder = 'Whole number from 0 to 10000.';
  return e;
}

function Field({ label, error, id, children }: { label: string; error?: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}{error && <p role="alert" className="text-xs text-destructive" data-testid={`error-${id}`}>{error}</p>}</div>;
}

function EditDialog({ product, onClose }: { product: LandingProduct; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [f, setF] = useState<Form>(() => toForm(product));
  const [errs, setErrs] = useState<Partial<Record<keyof Form, string>>>({});
  const [serverErr, setServerErr] = useState<string | null>(null);
  const m = useUpdateLandingProduct();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((c) => ({ ...c, [k]: v }));

  const save = () => {
    const e = validate(f); setErrs(e); setServerErr(null);
    if (Object.keys(e).length) return;
    const data = {
      visible: f.visible, name: f.name.trim(), description: f.description.trim(), icon: f.icon,
      startingPrice: f.startingPrice === '' ? null : f.startingPrice, setupFee: f.setupFee === '' ? null : f.setupFee,
      currency: f.currency, billingPeriod: f.billingPeriod, status: f.status, ctaLabel: f.ctaLabel.trim(), displayOrder: Number(f.displayOrder),
    } as LandingProductInput;
    m.mutate({ productKey: product.key, data }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLandingProductsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetPublicProductCatalogQueryKey() });
        toast({ title: 'Product saved', description: `${data.name} was updated.` });
        onClose();
      },
      onError: (err) => setServerErr((err as Error)?.message || 'The product could not be saved.'),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto" data-testid="dialog-edit-product">
        <DialogHeader><DialogTitle className="font-display text-2xl">Edit {product.name}</DialogTitle><DialogDescription>Key {product.key}. Readiness ({product.readiness === 'sandbox_only' ? 'sandbox only' : 'planned'}) is fixed and cannot be edited.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2"><div><Label htmlFor="lp-visible">Visible on landing page</Label><p className="text-xs text-muted-foreground">Hidden products are not returned by the public catalog.</p></div><Switch id="lp-visible" checked={f.visible} onCheckedChange={(v) => set('visible', v)} data-testid="switch-visible" /></div>
          <Field label="Name" id="lp-name" error={errs.name}><Input id="lp-name" value={f.name} onChange={(e) => set('name', e.target.value)} data-testid="input-name" /></Field>
          <Field label="Icon" id="lp-icon"><Select value={f.icon} onValueChange={(v) => set('icon', v)}><SelectTrigger id="lp-icon" data-testid="select-icon"><SelectValue /></SelectTrigger><SelectContent>{ICON_KEYS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select></Field>
          <div className="sm:col-span-2"><Field label="Description" id="lp-desc" error={errs.description}><Textarea id="lp-desc" rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} data-testid="input-description" /><p className="text-right text-xs text-muted-foreground">{f.description.length}/500</p></Field></div>
          <Field label="Starting price (empty = pricing on request)" id="lp-price" error={errs.startingPrice}><Input id="lp-price" inputMode="decimal" value={f.startingPrice} onChange={(e) => set('startingPrice', e.target.value)} data-testid="input-price" /></Field>
          <Field label="Setup fee (optional)" id="lp-setup" error={errs.setupFee}><Input id="lp-setup" inputMode="decimal" value={f.setupFee} onChange={(e) => set('setupFee', e.target.value)} data-testid="input-setup-fee" /></Field>
          <Field label="Currency" id="lp-cur" error={errs.currency}><Input id="lp-cur" maxLength={3} value={f.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} data-testid="input-currency" /></Field>
          <Field label="Billing period" id="lp-bill"><Select value={f.billingPeriod} onValueChange={(v) => set('billingPeriod', v)}><SelectTrigger id="lp-bill" data-testid="select-billing"><SelectValue /></SelectTrigger><SelectContent>{[['monthly', 'Monthly'], ['yearly', 'Yearly'], ['one_time', 'One-time'], ['on_request', 'On request']].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Status" id="lp-status"><Select value={f.status} onValueChange={(v) => set('status', v)}><SelectTrigger id="lp-status" data-testid="select-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="coming_soon">Coming soon</SelectItem></SelectContent></Select></Field>
          <Field label="CTA label" id="lp-cta" error={errs.ctaLabel}><Input id="lp-cta" value={f.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} data-testid="input-cta" /></Field>
          <Field label="Display order" id="lp-order" error={errs.displayOrder}><Input id="lp-order" inputMode="numeric" value={f.displayOrder} onChange={(e) => set('displayOrder', e.target.value)} data-testid="input-order" /></Field>
        </div>
        {serverErr && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" data-testid="error-save">{serverErr}</p>}
        <DialogFooter><Button variant="ghost" onClick={onClose} data-testid="button-cancel">Cancel</Button><Button onClick={save} disabled={m.isPending} data-testid="button-save-product">{m.isPending ? 'Saving...' : 'Save product'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LandingProducts() {
  const p = usePrincipal();
  if (p.role !== 'super_admin') return <div className="py-16"><h1 className="font-display text-3xl">Super Admin only</h1><p className="mt-2 text-muted-foreground" data-testid="text-forbidden">Landing products can only be edited by a Super Admin.</p></div>;
  return <Editor />;
}

function Editor() {
  const q = useListLandingProducts({ query: { refetchInterval: 30000, refetchOnWindowFocus: true } as never });
  const [edit, setEdit] = useState<LandingProduct | null>(null);
  const items = [...(q.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-copper">Landing page</p>
      <h1 className="font-display mt-2 text-4xl">Landing products</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Everything on the public product catalog is read from these records. Changes appear on the landing page within about 30 seconds.</p>
      <div className="mt-8 space-y-2">
        {q.isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        {q.isError && <div className="rounded-md border p-6" role="alert" data-testid="error-list"><p className="font-medium">Could not load landing products.</p><Button className="mt-3" onClick={() => q.refetch()} data-testid="button-retry"><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>}
        {q.data && items.length === 0 && <p className="rounded-md border p-6 text-sm text-muted-foreground" data-testid="empty-list">No landing products exist.</p>}
        {items.map((it) => (
          <div key={it.key} className="flex items-center gap-4 rounded-md border bg-card p-3" data-testid={`row-landing-${it.key}`}>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-sidebar text-sidebar-primary"><ProductIcon icon={it.icon} className="h-8 w-8" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{it.name}</p>
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">#{it.displayOrder} · {it.status === 'available' ? 'Available' : 'Coming soon'} · {it.readiness === 'sandbox_only' ? 'Sandbox only' : 'Planned'} · {it.startingPrice === null ? 'On request' : `${it.startingPrice} ${it.currency}`}</p>
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase ${it.visible ? 'text-emerald-600' : 'text-muted-foreground'}`}>{it.visible ? 'Visible' : 'Hidden'}</span>
            <Button size="sm" variant="outline" onClick={() => setEdit(it)} data-testid={`button-edit-${it.key}`}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
          </div>
        ))}
      </div>
      {edit && <EditDialog key={edit.key} product={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
