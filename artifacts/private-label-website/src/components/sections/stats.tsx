import type { Caps } from '../../lib/capabilities';
import { Reveal } from '../reveal';
import { CountUp } from '../count-up';

export function Stats({ caps }: { caps: Caps }) {
  const items = [
    caps.assets > 0 && { k: 'assets', n: caps.assets, l: caps.assets === 1 ? 'Configured asset' : 'Configured assets' },
    caps.networks > 0 && { k: 'networks', n: caps.networks, l: caps.networks === 1 ? 'Supported network' : 'Supported networks' },
    caps.services > 0 && { k: 'services', n: caps.services, l: caps.services === 1 ? 'Customer service enabled' : 'Customer services enabled' },
  ].filter(Boolean) as { k: string; n: number; l: string }[];
  if (!items.length) return null;
  return (
    <div className="mt-12 md:mt-16" data-testid="section-stats">
      <div className="s-counts">
        {items.map((i, idx) => (
          <Reveal key={i.k} delay={idx * 120}>
            <div data-testid={`stat-${i.k}`}>
              <p className="s-count-n"><CountUp to={i.n} /></p>
              <span className="s-count-rule" aria-hidden="true" />
              <p className="s-muted mt-2 text-sm">{i.l}</p>
            </div>
          </Reveal>))}
      </div>
      <p className="s-muted mt-5 text-xs">Counts reflect this site&rsquo;s current configuration, not trading activity.</p>
    </div>
  );
}
