import { useState } from 'react';
import type { EntitlementDefinition, EntitlementEntry, EntitlementOverride } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const valid = (d: EntitlementDefinition, v: string) => (d.valueType === 'integer' ? /^[0-9]+$/.test(v) : /^[0-9]+(\.[0-9]+)?$/.test(v));

export type EntMap = Record<string, boolean | string>;
export const toMap = (e: EntitlementEntry[]): EntMap => Object.fromEntries(e.map((x) => [x.key, x.value]));

export function entriesFrom(defs: EntitlementDefinition[], m: EntMap, fillLimits: boolean): EntitlementEntry[] {
  const out: EntitlementEntry[] = [];
  for (const d of defs) {
    if (d.kind === 'feature') { if (m[d.key] === true || fillLimits) out.push({ key: d.key, value: m[d.key] === true }); }
    else { const v = String(m[d.key] ?? '').trim(); if (v !== '') out.push({ key: d.key, value: v }); else if (fillLimits) out.push({ key: d.key, value: '0' }); }
  }
  return out;
}
export function entError(defs: EntitlementDefinition[], m: EntMap): string {
  for (const d of defs) if (d.kind === 'limit') { const v = String(m[d.key] ?? '').trim(); if (v !== '' && !valid(d, v)) return `${d.label}: enter a ${d.valueType === 'integer' ? 'whole' : 'decimal'} number`; }
  return '';
}

export function EntitlementEditor({ defs, value, onChange, disabled, limitHint }: { defs: EntitlementDefinition[]; value: EntMap; onChange: (m: EntMap) => void; disabled?: boolean; limitHint?: string }) {
  const features = defs.filter((d) => d.kind === 'feature');
  const limits = defs.filter((d) => d.kind === 'limit');
  const set = (k: string, v: boolean | string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Features</p>
        <div className="divide-y rounded-md border">
          {features.length === 0 && <p className="p-3 text-sm text-muted-foreground">No feature definitions.</p>}
          {features.map((d) => (
            <div key={d.key} className="flex items-center justify-between gap-3 p-3">
              <div><p className="text-sm">{d.label}</p><p className="font-mono text-[10px] text-muted-foreground">{d.key}</p></div>
              <Switch data-testid={`switch-ent-${d.key}`} disabled={disabled} checked={value[d.key] === true} onCheckedChange={(v) => set(d.key, v)} />
            </div>))}
        </div>
      </div>
      <div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Limits {limitHint && <span className="normal-case tracking-normal">- {limitHint}</span>}</p>
        <div className="divide-y rounded-md border">
          {limits.length === 0 && <p className="p-3 text-sm text-muted-foreground">No limit definitions.</p>}
          {limits.map((d) => (
            <div key={d.key} className="flex items-center justify-between gap-3 p-3">
              <div><p className="text-sm">{d.label}</p><p className="font-mono text-[10px] text-muted-foreground">{d.key} · {d.valueType}</p></div>
              <Input data-testid={`input-ent-${d.key}`} disabled={disabled} inputMode="decimal" className="w-28 text-right font-mono" value={String(value[d.key] ?? '')} onChange={(e) => set(d.key, e.target.value)} />
            </div>))}
        </div>
      </div>
    </div>
  );
}

export function OverridesEditor({ defs, rows, onChange, disabled }: { defs: EntitlementDefinition[]; rows: EntitlementOverride[]; onChange: (r: EntitlementOverride[]) => void; disabled?: boolean }) {
  const [pick, setPick] = useState('');
  const avail = defs.filter((d) => !rows.some((r) => r.key === d.key));
  const upd = (i: number, patch: Partial<EntitlementOverride>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } as EntitlementOverride : r)));
  const add = () => { const d = defs.find((x) => x.key === pick); if (!d) return; onChange([...rows, { key: d.key, value: d.kind === 'feature' ? true : '0', reason: '' }]); setPick(''); };
  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No tenant-only overrides. This tenant follows its plan and add-ons.</p>}
      {rows.map((r, i) => { const d = defs.find((x) => x.key === r.key); return (
        <div key={r.key} className="grid items-center gap-2 rounded-md border p-3 md:grid-cols-[1.2fr_8rem_2fr_auto]" data-testid={`row-override-${r.key}`}>
          <div><p className="text-sm">{d?.label ?? r.key}</p><p className="font-mono text-[10px] text-muted-foreground">{r.key}</p></div>
          {typeof r.value === 'boolean' || d?.kind === 'feature'
            ? <Switch disabled={disabled} checked={r.value === true} onCheckedChange={(v) => upd(i, { value: v })} />
            : <Input disabled={disabled} className="font-mono" value={String(r.value)} onChange={(e) => upd(i, { value: e.target.value })} />}
          <Input disabled={disabled} placeholder="Reason (required)" value={r.reason} onChange={(e) => upd(i, { reason: e.target.value })} />
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</Button>
        </div>); })}
      {!disabled && (
        <div className="flex gap-2">
          <Select value={pick} onValueChange={setPick}><SelectTrigger data-testid="select-override-key" className="w-72"><SelectValue placeholder="Add override for..." /></SelectTrigger>
            <SelectContent>{avail.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent></Select>
          <Button type="button" variant="outline" disabled={!pick} onClick={add} data-testid="button-add-override">Add</Button>
        </div>)}
    </div>
  );
}
export const overrideError = (defs: EntitlementDefinition[], rows: EntitlementOverride[]) => {
  for (const r of rows) {
    if (r.reason.trim().length < 2) return `Reason required for ${r.key}`;
    const d = defs.find((x) => x.key === r.key);
    if (d && d.kind === 'limit' && !valid(d, String(r.value))) return `Invalid value for ${d.label}`;
  }
  return '';
};
