import { ArrowRight } from 'lucide-react';
import type { PublicSite } from '@workspace/api-client-react';
import { primaryCta, type Caps } from '../../lib/capabilities';
import { useAnchors } from '../../lib/anchors';
import { Reveal } from '../reveal';

export function FinalCta({ site, caps }: { site: PublicSite; caps: Caps }) {
  const cta = primaryCta(caps);
  const { href, go } = useAnchors(site.tenantSlug);
  const what = [caps.exchange !== 'off' && 'exchange', caps.payments && 'crypto payments', caps.api && 'the merchant API', (caps.bot || caps.mini) && 'Telegram'].filter(Boolean) as string[];
  const list = what.length > 1 ? `${what.slice(0, -1).join(', ')} and ${what[what.length - 1]}` : what[0];
  return (
    <section className="s-section" data-testid="section-final-cta">
      <div className="s-wrap">
        <Reveal>
          <div className="s-cta-panel px-6 py-16 text-center sm:px-12 sm:py-24">
            <h2 className="s-h2 mx-auto max-w-3xl">{list ? `Start with ${list}.` : `Welcome to ${site.brandName}.`}</h2>
            <p className="s-muted mx-auto mt-4 max-w-lg text-[1.02rem]">{site.sandboxOnly ? 'This is a sandbox. Look around; nothing here moves real funds.' : `Have a question first? Support details are in the footer.`}</p>
            <a href={href(cta.id)} onClick={go(cta.id)} className="s-btn s-btn-primary mt-8" style={{ minHeight: 50 }} data-testid="link-final-cta">{cta.label}<ArrowRight size={16} /></a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
