import { ArrowRight } from 'lucide-react';
import type { PublicSite } from '@workspace/api-client-react';
import { primaryCta, type Caps } from '../lib/capabilities';
import { useAnchors } from '../lib/anchors';
import { ExchangeWidget } from './exchange-widget';
import { PaymentMock } from './sections/payments';

const NAMES = (c: Caps) => [c.exchange !== 'off' && 'Exchange', c.payments && 'Crypto payments', c.bot && 'Telegram bot', c.mini && 'Telegram Mini App', c.api && 'Merchant API'].filter(Boolean) as string[];

export function Hero({ site, caps, root, secondary }: { site: PublicSite; caps: Caps; root?: string; secondary?: { id: string; label: string } }) {
  const ws = site.websiteSettings;
  const { href, go } = useAnchors(site.tenantSlug, root);
  const cta = primaryCta(caps);
  const second = secondary ?? (caps.exchange !== 'off' && caps.payments ? { id: 'payments', label: 'See payments' } : caps.services > 0 ? { id: 'how', label: 'How it works' } : null);
  const trust = [
    caps.assets > 0 && `${caps.assets} configured asset${caps.assets === 1 ? '' : 's'}`,
    caps.networks > 0 && `${caps.networks} network${caps.networks === 1 ? '' : 's'}`,
  ].filter(Boolean) as string[];
  const names = NAMES(caps);
  const eyebrow = caps.exchange !== 'off' ? 'Digital asset exchange' : caps.payments ? 'Crypto payments' : 'Digital assets';
  return (
    <section className="s-hero" data-testid="section-hero">
      <div className="s-wrap s-hero-composition">
        <div className="s-rise s-hero-intro">
          <span className="s-eyebrow s-eyebrow-lit" data-testid="text-hero-eyebrow">{eyebrow}</span>
          <h1 className="s-display s-display-grad mt-5 md:mt-7" data-testid="text-hero-title">{ws.heroTitle}</h1>
        </div>
        <div id={caps.exchange !== 'off' ? 'exchange' : undefined} className="s-rise s-stage mx-auto w-full max-w-[30rem] lg:max-w-none" style={{ animationDelay: '.12s' }}>
          {caps.exchange !== 'off' ? <ExchangeWidget site={site} caps={caps} presentation={root !== undefined} />
            : caps.payments ? <PaymentMock site={site} compact />
            : (
              <div className="s-lit p-6" data-testid="panel-services">
                <p className="s-eyebrow">Available here</p>
                {names.length ? <ul className="mt-4 space-y-3">{names.map((n) => <li key={n} className="flex items-center justify-between border-b pb-3 text-[0.95rem] font-medium last:border-0" style={{ borderColor: 'var(--s-line)' }}>{n}<span className="s-badge">Preview</span></li>)}</ul>
                  : <p className="s-muted mt-3 text-sm leading-relaxed">No customer services are enabled for {site.brandName} yet. Check back soon.</p>}
              </div>)}
        </div>
        <div className="s-rise s-hero-details">
          {ws.heroSubtitle && <p className="s-muted s-hero-sub mt-4 md:mt-7" data-testid="text-hero-subtitle">{ws.heroSubtitle}</p>}
          <div className="s-hero-actions mt-5 md:mt-9">
            <a href={href(cta.id)} onClick={go(cta.id)} className="s-btn s-btn-primary" style={{ minHeight: 54, padding: "0 1.6rem" }} data-testid="link-hero-cta">{cta.label}<ArrowRight size={16} /></a>
            {second && <a href={href(second.id)} onClick={go(second.id)} className="s-btn s-btn-ghost" style={{ minHeight: 54, padding: "0 1.6rem" }} data-testid="link-hero-secondary">{second.label}</a>}
          </div>
          {trust.length > 0 && <ul className="s-facts mt-7 md:mt-10" aria-label="Facts" data-testid="list-trust">{trust.map((t) => <li key={t}>{t}</li>)}</ul>}
        </div>
      </div>
    </section>
  );
}
