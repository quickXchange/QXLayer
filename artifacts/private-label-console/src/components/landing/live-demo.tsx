import { ArrowUpRight } from 'lucide-react';
import { Section, SectionHead } from '@site/components/sections/common';
import { Reveal } from '@site/components/reveal';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export function LiveDemo() {
  return <Section id="live-demo">
    <SectionHead eyebrow="Sandbox Demo" title="Experience the Live Demo" body="Explore the shared Master White Label Exchange and its real administration interface using isolated fictional demo configuration." />
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
      <Reveal><div className="s-card flex h-full min-w-0 flex-col p-6" data-testid="card-demo-customer">
        <span className="s-badge self-start">Sandbox Demo</span>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight">Customer Website Demo</h3>
        <p className="s-muted mt-1.5 text-sm">The same shared implementation used by customer websites.</p>
        <p className="s-muted mt-4 mb-6 text-xs">No login. Quotes and browser-held order snapshots are simulations. Nothing is saved to customer databases and no funds move.</p>
        <a href="/private-label-website/novax-live-demo" target="_blank" rel="noopener noreferrer" className="s-btn s-btn-primary mt-auto self-start" data-testid="link-demo-customer">Open Live Demo<ArrowUpRight size={16} /></a>
      </div></Reveal>
      <Reveal delay={80}><div className="s-card flex h-full min-w-0 flex-col p-6" data-testid="card-demo-admin">
        <span className="s-badge self-start">Sandbox Demo · Read-only</span>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight">Admin Panel Demo</h3>
        <p className="s-muted mt-1.5 text-sm">Explore the real Exchange Admin UI without credentials.</p>
        <p className="s-muted mt-4 mb-6 text-xs">Short-lived secure session. Fictional configuration only; no writes, real accounts, customer records, secrets or provider execution.</p>
        <a href={`${base}/demo/admin`} target="_blank" rel="noopener noreferrer" className="s-btn s-btn-primary mt-auto self-start" data-testid="link-demo-admin">Open Admin Demo<ArrowUpRight size={16} /></a>
      </div></Reveal>
    </div>
  </Section>;
}
