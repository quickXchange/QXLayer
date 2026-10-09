import { statusText, type WlOrder, type WlEvent } from '@/lib/wl';
import { stamp } from '@/lib/format';

const STAGES = ['new', 'reviewing', 'quote_ready', 'approved', 'in_setup', 'customization', 'ready', 'delivered'];
const ALIAS: Record<string, string> = { submitted: 'new', provisioned: 'delivered', waiting_for_client: 'reviewing' };

export function StageTracker({ o, history }: { o: WlOrder; history: WlEvent[] }) {
  const s = ALIAS[o.status] ?? o.status;
  const idx = STAGES.indexOf(s); const closed = idx < 0;
  const last = [...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return (
    <div className="mb-4 rounded-md border bg-card p-4" data-testid="panel-stage-tracker">
      <ol className="grid grid-cols-4 gap-2 md:grid-cols-8" aria-label="Order stages">{STAGES.map((st, i) => {
        const done = !closed && i < idx; const cur = !closed && i === idx;
        return <li key={st} aria-current={cur ? 'step' : undefined} className="min-w-0">
          <div className={`h-1.5 rounded ${done || cur ? 'bg-primary' : 'bg-muted'}`} />
          <p className={`mt-1.5 font-mono text-[10px] uppercase leading-tight tracking-wide ${cur ? 'text-foreground' : 'text-muted-foreground'}`}>{statusText(st)}{done ? ' (done)' : cur ? ' (current)' : ''}</p></li>;
      })}</ol>
      {closed && <p className="mt-3 text-sm text-destructive">This order is {statusText(o.status).toLowerCase()}. No further stages will run.</p>}
      {o.status === 'waiting_for_client' && <p className="mt-3 text-sm">Our team is waiting for information from you. Check the notes below.</p>}
      <p className="mt-3 text-xs text-muted-foreground" data-testid="text-last-update">Last update {stamp(last?.createdAt ?? o.updatedAt)}{last?.message ? `: ${last.message.slice(0, 140)}` : ''}</p>
    </div>
  );
}
