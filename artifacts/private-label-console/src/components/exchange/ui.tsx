import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import type { ExchangeOrder, ExchangeSettings } from '@workspace/api-client-react';
import { VisualImg } from './visual-catalog';
import type { useIdentityResolver } from './logo-identity';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useConfirm } from './bulk';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ExchangeDraft } from './use-exchange-draft';
import { isDec, isPos } from './ui-validate';
export { isDec, isPos, isInt } from './ui-validate';


export function Dec({ value, onChange, disabled, positive, testid, placeholder }: { value: string; onChange: (v: string) => void; disabled?: boolean; positive?: boolean; testid?: string; placeholder?: string }) {
  const bad = value !== '' && (positive ? !isPos(value) : !isDec(value));
  return <Input data-testid={testid} inputMode="decimal" disabled={disabled} placeholder={placeholder ?? '0.00'} value={value} onChange={(e) => onChange(e.target.value.trim())} className={`font-mono ${bad ? 'border-destructive' : ''}`} />;
}

export function IntInput({ value, onChange, disabled, testid }: { value: number; onChange: (v: number) => void; disabled?: boolean; testid?: string }) {
  return <Input data-testid={testid} type="number" step={1} min={0} disabled={disabled} value={Number.isFinite(value) ? value : ''} onChange={(e) => onChange(e.target.value === '' ? NaN : Math.trunc(Number(e.target.value)))} className="font-mono" />;
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block space-y-1 ${className}`}><span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}

type Resolver = ReturnType<typeof useIdentityResolver>;
type Ident = ReturnType<Resolver['payment']>;

/** Inline logo + text, for select options and compact lists. */
export function LogoText({ id, text, size = 18 }: { id: Ident; text?: ReactNode; size?: number }) {
  return <span className="inline-flex min-w-0 items-center gap-2"><VisualImg url={id.logoUrl} label={id.label} kind={id.kind} generic={id.generic} size={size} /><span className="truncate">{text ?? id.name}</span></span>;
}

export function EndpointView({ r, id, symbol, amount, paymentMethod, size = 28 }: { r: Resolver; id: string; symbol: string; amount?: string; paymentMethod?: string | null; size?: number }) {
  const e = r.endpoint(id, symbol, null);
  const fiat = id.startsWith('fiat:');
  const pay = fiat && paymentMethod ? r.payment(paymentMethod) : null;
  const main = pay ?? e;
  const badgeUrl = fiat ? (pay ? (e.currencyLogoUrl ?? e.logoUrl) : null) : e.networkLogoUrl;
  const showBadge = fiat ? !!pay : !!e.network;
  const sub = fiat ? (pay ? pay.name : e.name) : e.network;
  const bs = Math.max(12, Math.round(size * 0.5));
  return (
    <span className="inline-flex min-w-0 items-center gap-2" data-testid={`endpoint-${symbol}`}>
      <span className="relative shrink-0"><VisualImg url={main.logoUrl} label={main.label} kind={main.kind} generic={main.generic} size={size} />
        {showBadge && <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-card"><VisualImg url={badgeUrl} label={fiat ? e.label : (e.network ?? '')} kind={fiat ? 'flag' : 'network'} size={bs} /></span>}</span>
      <span className="min-w-0 leading-tight"><span className="block break-all font-mono text-xs">{amount !== undefined ? `${amount} ` : ''}{symbol}</span>{sub && <span className="block truncate text-[10px] text-muted-foreground">{sub}</span>}</span>
    </span>
  );
}

type FlowOrder = Pick<ExchangeOrder, 'source' | 'destination' | 'sourceSymbol' | 'destinationSymbol' | 'inputAmount' | 'outputAmount' | 'paymentMethod'> & { paymentMethodId?: string | null };
export function OrderFlow({ r, o }: { r: Resolver; o: FlowOrder }) {
  const pm = o.paymentMethodId || o.paymentMethod || null;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-2" data-testid="order-flow">
      <EndpointView r={r} id={o.source} symbol={o.sourceSymbol} amount={o.inputAmount} paymentMethod={pm} />
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <EndpointView r={r} id={o.destination} symbol={o.destinationSymbol} amount={o.outputAmount} paymentMethod={pm} />
    </span>
  );
}

export function Pick({ value, onChange, options, disabled, testid, bounded = false, renderOption }: { value: string; onChange: (v: string) => void; options: [string, ReactNode][]; disabled?: boolean; testid?: string; bounded?: boolean; renderOption?: (value: string, label: ReactNode) => ReactNode }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger data-testid={testid}><SelectValue /></SelectTrigger>
      <SelectContent style={bounded ? { maxHeight: 'min(20rem, var(--radix-select-content-available-height, 70vh))', overflowY: 'auto' } : undefined}>{options.map(([v, l]) => <SelectItem key={v} value={v}>{renderOption ? renderOption(v, l) : l}</SelectItem>)}</SelectContent>
    </Select>
  );
}

const COLS: [keyof ExchangeSettings, string][] = [['assets', 'assets'], ['networks', 'networks'], ['routes', 'routes'], ['paymentMethods', 'payment methods'], ['providers', 'providers']];
function SaveSummary({ d }: { d: ExchangeDraft }) {
  const b = d.baseline as unknown as Record<string, unknown> | null; const c = d.draft as unknown as Record<string, unknown> | null;
  const lines = COLS.map(([k, n]) => { const x = (b?.[k] as { id?: string }[] | undefined) ?? []; const y = (c?.[k] as { id?: string }[] | undefined) ?? []; const changed = y.filter((r, i) => JSON.stringify(r) !== JSON.stringify(x[i])).length + Math.max(0, x.length - y.length); return changed ? `${changed} ${n} changed (${x.length} before, ${y.length} after)` : ''; }).filter(Boolean);
  return <><p>These staged changes will be saved to the tenant exchange configuration:</p><ul className="text-xs" data-testid="review-save">{lines.length ? lines.map((l) => <li key={l}>{l}</li>) : <li>General settings changed</li>}</ul></>;
}

export function DraftFooter({ d, locked }: { d: ExchangeDraft; locked: boolean }) {
  const [ask, node] = useConfirm(locked);
  if (locked) return <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Read only: permission, plan feature or subscription state</span>;
  return (
    <>
      <span className="mr-auto text-sm text-destructive" data-testid="text-draft-errors">{d.errors[0] ?? d.saveError ?? ''}{d.errors.length > 1 ? ` (+${d.errors.length - 1} more)` : ''}</span>
      {d.dirty && <Button type="button" variant="ghost" data-testid="button-discard-exchange" onClick={d.discard}>Discard changes</Button>}
      <Button type="button" data-testid="button-save-exchange" disabled={!d.dirty || d.errors.length > 0 || d.saving} onClick={() => ask({ title: 'Save exchange settings?', label: 'Save settings', body: <SaveSummary d={d} />, run: () => { d.save(); return <p>Save submitted. A notification confirms the result.</p>; } })}>{d.saving ? 'Saving' : d.dirty ? 'Save exchange settings' : 'Saved'}</Button>
      {node}
    </>
  );
}

export function SimNote() {
  return <p className="rounded-md border border-copper/40 bg-copper/10 px-3 py-2 text-xs" data-testid="text-simulation">Simulation only. No real funds, wallets or payment providers are involved. Rates, fees and amounts are manual decimal strings. Completed, cancelled and failed orders can never be reopened.</p>;
}
