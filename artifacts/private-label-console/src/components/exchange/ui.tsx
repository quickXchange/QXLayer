import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

export function Pick({ value, onChange, options, disabled, testid, bounded = false }: { value: string; onChange: (v: string) => void; options: [string, string][]; disabled?: boolean; testid?: string; bounded?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger data-testid={testid}><SelectValue /></SelectTrigger>
      <SelectContent style={bounded ? { maxHeight: 'min(20rem, var(--radix-select-content-available-height, 70vh))', overflowY: 'auto' } : undefined}>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function DraftFooter({ d, locked }: { d: ExchangeDraft; locked: boolean }) {
  if (locked) return <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Read only: permission, plan feature or subscription state</span>;
  return (
    <>
      <span className="mr-auto text-sm text-destructive" data-testid="text-draft-errors">{d.errors[0] ?? d.saveError ?? ''}{d.errors.length > 1 ? ` (+${d.errors.length - 1} more)` : ''}</span>
      {d.dirty && <Button type="button" variant="ghost" data-testid="button-discard-exchange" onClick={d.discard}>Discard changes</Button>}
      <Button type="button" data-testid="button-save-exchange" disabled={!d.dirty || d.errors.length > 0 || d.saving} onClick={d.save}>{d.saving ? 'Saving' : d.dirty ? 'Save exchange settings' : 'Saved'}</Button>
    </>
  );
}

export function SimNote() {
  return <p className="rounded-md border border-copper/40 bg-copper/10 px-3 py-2 text-xs" data-testid="text-simulation">Simulation only. No real funds, wallets or payment providers are involved. Rates, fees and amounts are manual decimal strings. Completed, cancelled and failed orders can never be reopened.</p>;
}
