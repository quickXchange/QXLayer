import { useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { Section, SectionHead } from '@site/components/sections/common';
import { Reveal } from '@site/components/reveal';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const CUSTOMER_HREF = '/private-label-website/novax-live-demo';
const ADMIN_HREF = `${base}/demo/admin`;
const USERNAME = 'demo@qxlayer.com';
const PASSWORD = 'Demo123!';

function CopyField({ id, label, value }: { id: string; label: string; value: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle');
  const timer = useRef<number>(0);
  const copy = async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(value); ok = true; } catch {
      try {
        const t = document.createElement('textarea');
        t.value = value; t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select(); ok = document.execCommand('copy'); t.remove();
      } catch { ok = false; }
    }
    setState(ok ? 'ok' : 'err');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2200);
  };
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5" style={{ borderColor: 'var(--s-line)', background: 'var(--s-bg2)' }}>
      <div className="min-w-0">
        <p className="s-mono s-muted text-[10px] uppercase tracking-widest">{label}</p>
        <p className="s-mono truncate text-sm" data-testid={`text-demo-${id}`}>{value}</p>
      </div>
      <button type="button" className="s-btn s-btn-ghost shrink-0" onClick={() => void copy()} aria-label={`Copy ${label.toLowerCase()}`} title={state === 'err' ? 'Copy failed - select manually' : undefined} data-testid={`button-copy-${id}`}>
        {state === 'ok' ? <Check size={15} /> : <Copy size={15} />}
        <span role="status" aria-live="polite">{state === 'ok' ? 'Copied' : state === 'err' ? 'Failed' : 'Copy'}</span>
      </button>
    </div>
  );
}

export function LiveDemo() {
  return (
    <Section id="live-demo">
      <SectionHead eyebrow="Sandbox Demo" title="Experience the Live Demo" body="Explore a fully configured White Label Exchange and experience exactly what your customers and administrators will see." />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
        <Reveal>
          <div className="s-card flex h-full min-w-0 flex-col p-6" data-testid="card-demo-customer">
            <span className="s-badge self-start" data-testid="badge-sandbox-customer">Sandbox Demo</span>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">Customer Website Demo</h3>
            <p className="s-muted mt-1.5 text-sm">Experience the customer-facing White Label Exchange.</p>
            <p className="s-muted mt-4 mb-6 text-xs">No login required. Sandbox only - no real funds are involved.</p>
            <a href={CUSTOMER_HREF} target="_blank" rel="noopener noreferrer" className="s-btn s-btn-primary mt-auto self-start" data-testid="link-demo-customer">Open Live Demo<ArrowUpRight size={16} /></a>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="s-card flex h-full min-w-0 flex-col p-6" data-testid="card-demo-admin">
            <span className="s-badge self-start" data-testid="badge-sandbox-admin">Sandbox Demo</span>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">Admin Panel Demo</h3>
            <p className="s-muted mt-1.5 text-sm">Explore the White Label Exchange administration experience.</p>
            <div className="mt-4 grid gap-2">
              <CopyField id="username" label="Username" value={USERNAME} />
              <CopyField id="password" label="Password" value={PASSWORD} />
            </div>
            <p className="s-muted mt-3 text-xs">Public sandbox credentials. The admin demo is read-only and uses no real funds.</p>
            <a href={ADMIN_HREF} target="_blank" rel="noopener noreferrer" className="s-btn s-btn-primary mt-6 self-start" data-testid="link-demo-admin">Open Admin Demo<ArrowUpRight size={16} /></a>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
