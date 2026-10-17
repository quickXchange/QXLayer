import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import '@/styles/vynox-marketing.css';
import type { LandingProduct } from '@workspace/api-client-react';
import { BrandLogo } from '@/components/brand-logo';

const NODES: [string, string, string, number, number][] = [
  ['Exchange', 'crypto_exchange', '', 0, 0], ['Payments', 'crypto_payments', '', 60, 1], ['Cards', 'crypto_card', '', 120, 0],
  ['Staking', 'staking', '', 180, 1], ['Nodes', 'rpc_nodes', '', 240, 0], ['Bots', 'telegram_bot', '', 300, 1],
];

export function VynoxHero({ items }: { items: LandingProduct[] }) {
  const exchangeVisible = items.some(p => p.key === 'crypto_exchange');
  const landing = items.find(p => p.key === 'crypto_exchange')?.explore;
  return (
    <section className="vx-hero vx-wrap" data-testid="section-vynox-hero" aria-labelledby="vx-h1">
      <div className="s-wrap vx-hero-grid">
        <div>
          <p className="vx-in s-badge" style={{ '--i': 0 } as never}>Crypto infrastructure marketplace</p>
          <h1 id="vx-h1" className="vx-h1 vx-in mt-5" style={{ '--i': 1 } as never}><span className="vx-grad">{landing?.landingHeadline || 'One layer for every crypto product you brand.'}</span></h1>
          <p className="s-muted vx-in mt-5 max-w-xl text-base leading-relaxed sm:text-lg" style={{ '--i': 2 } as never}>{landing?.landingSummary || 'Explore a shared white-label foundation for your crypto ecosystem. Current services are clearly labeled Preview or Coming Soon.'}</p>
          <div className="vx-in mt-7 flex flex-wrap gap-3" style={{ '--i': 3 } as never}>
            {exchangeVisible && <Link href="/products/crypto_exchange" className="s-btn s-btn-primary" data-testid="link-hero-exchange">Explore Exchange<ArrowRight size={16} /></Link>}
            <a href="#products" className="s-btn s-btn-ghost" data-testid="link-hero-products">Browse all products</a>
            <Link href="/account/configure" className="s-btn s-btn-ghost" data-testid="link-hero-get-started">Get Started</Link>
          </div>
          <ul className="vx-strip vx-in s-muted mt-8" style={{ '--i': 4 } as never}>
            <li>Illustrative previews</li><li>Sandbox only</li><li>Approved prices only</li>
          </ul>
        </div>
        <div className="vx-orbit vx-in" style={{ '--i': 2 } as never} role="group" aria-label="Product orbit around the VYNOX LAYER core">
          <div className="vx-ring" style={{ '--r': '4%', '--d': '70s' } as never} aria-hidden="true" />
          <div className="vx-ring rev" style={{ '--r': '20%', '--d': '48s' } as never} aria-hidden="true" />
          <div className="vx-pulse" aria-hidden="true" />
          <div className="vx-core"><div><p className="s-eyebrow" style={{ fontSize: '.6rem' }}>Core</p><BrandLogo size={120} className="mx-auto max-w-full" /></div></div>
          <div className="absolute inset-[4%] vx-ring" style={{ '--r': '0', '--d': '60s', border: 0 } as never}>
            {NODES.filter(([, key]) => items.some(p => p.key === key)).map(([label, key, , deg, inner]) => (
              <div key={key} className="absolute inset-0" style={{ transform: `rotate(${deg}deg)` }}>
                <div className="vx-node" style={{ top: inner ? '16%' : 0 }}>
                  <div style={{ transform: `rotate(-${deg}deg)` }}>
                    <div className="vx-counter" style={{ '--d': '60s' } as never}>
                      <Link href={`/products/${key}`} className="vx-chip" data-testid={`link-orbit-${key}`}>{label}</Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
