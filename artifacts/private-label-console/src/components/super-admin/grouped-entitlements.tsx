import type { EntitlementDefinition } from '@workspace/api-client-react';
import { EntitlementEditor, type EntMap } from '@/components/app/entitlement-editor';

const GROUPS: [string, RegExp][] = [
  ['Swap', /swap/i], ['Convert', /convert/i], ['Buy', /(^|_)buy|buy(_|$)/i], ['Sell', /(^|_)sell|sell(_|$)/i],
  ['Admin', /admin|staff|domain|brand|website|custom/i], ['Integration allowances', /api|webhook|rpc|integration|key|provider/i],
];
export function groupDefs(defs: EntitlementDefinition[]) {
  const out = new Map<string, EntitlementDefinition[]>();
  for (const d of defs) {
    const hit = d.kind === 'limit' ? undefined : GROUPS.find(([, re]) => re.test(`${d.key} ${d.label}`));
    const g = hit ? hit[0] : d.kind === 'limit' ? 'Limits' : 'Other';
    out.set(g, [...(out.get(g) ?? []), d]);
  }
  const order = [...GROUPS.map(([n]) => n), 'Limits', 'Other'];
  return order.filter((n) => out.has(n)).map((n) => [n, out.get(n)!] as const);
}

/** Owner-only wrapper: same shared editor and value map, defs split into collapsible groups. */
export function GroupedEntitlementEditor({ defs, value, onChange, disabled, limitHint }: { defs: EntitlementDefinition[]; value: EntMap; onChange: (m: EntMap) => void; disabled?: boolean; limitHint?: string }) {
  return (
    <div className="space-y-3" data-testid="grouped-entitlements">
      {groupDefs(defs).map(([name, list], i) => {
        const on = list.filter((d) => (d.kind === 'feature' ? value[d.key] === true : String(value[d.key] ?? '').trim() !== '')).length;
        return (
          <details key={name} open={i < 2} className="rounded-md border bg-card/60">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 font-display text-lg">{name}<span className="font-mono text-[11px] text-muted-foreground">{on} of {list.length} set</span></summary>
            <div className="border-t p-4"><EntitlementEditor defs={list} value={value} onChange={onChange} disabled={disabled} limitHint={limitHint} /></div>
          </details>);
      })}
    </div>
  );
}
