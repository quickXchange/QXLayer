import { ArrowRight, Check } from 'lucide-react';
import type { PublicSite } from '@workspace/api-client-react';
import { primaryCta, type Caps } from '@/lib/capabilities';
import { useAnchors } from '@/lib/anchors';
import { ExchangeWidget } from '@/components/exchange-widget';
import { PaymentMock } from '@/components/sections/payments';

const NAMES = (c: Caps) => [c.exchange !== 'off' && 'Exchange', c.payments && 'Crypto payments', c.bot && 'Telegram bot', c.mini && 'Telegram Mini App', c.api && 'Merchant API'].filter(Boolean) as string[];

export function Hero({ site, caps }: { site: PublicSite; caps: Caps }) {
  const ws = site.websiteSettings;
  const { href, go } = useAnchors(site.tenantSlug);
  const cta = primaryCta(caps);
  const second = caps.exchange !== 'off' && caps.payments ? { id: 'payments', label: 'See payments' } : caps.services > 0 ? { id: 'how', label: 'How it works' } : null;
  const trust = [
    site.sandboxOnly && 'Sandbox environment',
    caps.assets > 0 && `${caps.assets} configured asset${caps.assets === 1 ? '' : 's'}`,
    caps.networks > 0 && `${caps.networks} network${caps.networks === 1 ? '' : 's'}`,
  ].filter(Boolean) as string[];
  const names = NAMES(caps);
  return (
    <section className="relative pb-16 pt-12 md:pt-20" data-testid="section-hero">
      <div className="s-wrap grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
        <div className="s-rise">
          <span className="s-chip"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--s-accent)' }} />{site.brandName}</span>
          <h1 className="s-display mt-6" data-testid="text-hero-title">{ws.heroTitle}</h1>
          {ws.heroSubtitle && <p className="s-muted mt-6 max-w-xl text-[1.08rem] leading-relaxed" data-testid="text-hero-subtitle">{ws.heroSubtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={href(cta.id)} onClick={go(cta.id)} className="s-btn s-btn-primary" style={{ minHeight: 50 }} data-testid="link-hero-cta">{cta.label}<ArrowRight size={16} /></a>
            {second && <a href={href(second.id)} onClick={go(second.id)} className="s-btn s-btn-ghost" style={{ minHeight: 50 }} data-testid="link-hero-secondary">{second.label}</a>}
          </div>
          {trust.length > 0 && <ul className="mt-9 flex flex-wrap gap-2" aria-label="Facts" data-testid="list-trust">{trust.map((t) => <li key={t} className="s-chip"><Check size={13} style={{ color: 'var(--s-accent-ink)' }} aria-hidden="true" />{t}</li>)}</ul>}
        </div>
        <div id={caps.exchange !== 'off' ? 'exchange' : undefined} className="s-rise mx-auto w-full max-w-[30rem] lg:max-w-none" style={{ animationDelay: '.12s' }}>
          {caps.exchange !== 'off' ? <ExchangeWidget site={site} caps={caps} />
            : caps.payments ? <PaymentMock site={site} compact />
            : (
              <div className="s-card p-6" data-testid="panel-services">
                <p className="s-eyebrow">Available here</p>
                {names.length ? <ul className="mt-4 space-y-3">{names.map((n) => <li key={n} className="flex items-center justify-between border-b pb-3 text-[0.95rem] font-medium last:border-0" style={{ borderColor: 'var(--s-line)' }}>{n}<span className="s-badge">Preview</span></li>)}</ul>
                  : <p className="s-muted mt-3 text-sm leading-relaxed">No customer services are enabled for {site.brandName} yet. Check back soon.</p>}
              </div>)}
        </div>
      </div>
    </section>
  );
}
