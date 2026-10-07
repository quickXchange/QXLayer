import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProviderSchemaField } from '@workspace/api-client-react';
import { selectCls } from './shared';

export function SchemaRows({ rows, onChange, types, example, noun }: { rows: ProviderSchemaField[]; onChange: (r: ProviderSchemaField[]) => void; types: string[]; example: string; noun: string }) {
  const set = (i: number, p: Partial<ProviderSchemaField>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="space-y-2" data-testid={`schema-${noun}`}>
      <p className="text-xs text-muted-foreground">Example: {example}. Definition only; no values are stored here.</p>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr] gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_7rem_auto_auto]">
          <Input aria-label="Key" placeholder="key" value={r.key} onChange={(e) => set(i, { key: e.target.value })} />
          <Input aria-label="Label" placeholder="Label" maxLength={100} value={r.label} onChange={(e) => set(i, { label: e.target.value })} />
          <select aria-label="Type" className={selectCls} value={r.type} onChange={(e) => set(i, { type: e.target.value as ProviderSchemaField['type'] })}>{types.map((t) => <option key={t}>{t}</option>)}</select>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.required} onChange={(e) => set(i, { required: e.target.checked })} />Required</label>
          <Button type="button" size="icon" variant="ghost" aria-label="Remove field" onClick={() => onChange(rows.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
        </div>))}
      <Button type="button" size="sm" variant="outline" disabled={rows.length >= 30} onClick={() => onChange([...rows, { key: '', label: '', type: types[0] as ProviderSchemaField['type'], required: false }])} data-testid={`button-add-${noun}`}><Plus className="mr-1 h-4 w-4" />Add field</Button>
    </div>
  );
}
