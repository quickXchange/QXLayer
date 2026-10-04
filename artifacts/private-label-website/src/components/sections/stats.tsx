import type { Caps } from '@/lib/capabilities';
import { Reveal } from '@/components/reveal';

export function Stats({ caps }: { caps: Caps }) {
  const items = [
    caps.assets > 0 && { k: 'assets', n: caps.assets, l: caps.assets === 1 ? 'Configured asset' : 'Configured assets' },
    caps.networks > 0 && { k: 'networks', n: caps.networks, l: caps.networks === 1 ? 'Supported network' : 'Supported networks' },
    caps.services > 0 && { k: 'services', n: caps.services, l: caps.services === 1 ? 'Customer service enabled' : 'Customer services enabled' },
  ].filter(Boolean) as { k: string; n: number; l: string }[];
  if (!items.length) return null;
  return (
    <section className="s-section" style={{ paddingBlock: 'clamp(1.5rem,4vw,3rem)' }} data-testid="section-stats">
      <div className="s-wrap">
        <div className="grid gap-px overflow-hidden border sm:grid-cols-3" style={{ borderColor: 'var(--s-line)', background: 'var(--s-line)', borderRadius: 'var(--s-r2)' }}>
          {items.map((i, idx) => (
            <Reveal key={i.k} delay={idx * 90}>
              <div className="flex items-baseline gap-4 px-6 py-6 sm:block" style={{ background: 'var(--s-panel)' }} data-testid={`stat-${i.k}`}>
                <p className="text-5xl font-semibold tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{i.n}</p>
                <p className="s-muted text-sm sm:mt-2">{i.l}</p>
              </div>
            </Reveal>))}
        </div>
        <p className="s-muted mt-3 text-xs">Counts reflect this site&rsquo;s current configuration, not trading activity.</p>
      </div>
    </section>
  );
}
