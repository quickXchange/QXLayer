import { Building2, Layers, LifeBuoy, FileText, FlaskConical, ToggleRight } from 'lucide-react';
import { Link } from 'wouter';
import type { PublicSite } from '@workspace/api-client-react';
import { Section, SectionHead } from './common';
import { Reveal } from '../reveal';

export function Trust({ site }: { site: PublicSite }) {
  const ws = site.websiteSettings;
  const base = `/${site.tenantSlug}`;
  const items: { I: typeof Layers; t: string; d: string; to?: string }[] = [
    { I: Building2, t: 'Separate tenant configuration', d: `${site.brandName}'s branding, assets and services are kept apart from every other site on the platform.` },
    { I: ToggleRight, t: 'Services follow the plan', d: 'A service appears only when it is enabled for this site. Anything switched off is unreachable, including by direct link.' },
    { I: Layers, t: 'Assets you can inspect', d: 'The supported assets and networks above are the exact configured list.' },
  ];
  if (site.sandboxOnly) items.push({ I: FlaskConical, t: 'Clearly labelled sandbox', d: 'This environment is a sandbox. No real funds move and no orders are executed.' });
  if (ws.privacyContent.trim() || ws.termsContent.trim()) items.push({ I: FileText, t: 'Published legal documents', d: 'Read the privacy policy and terms before you use the service.', to: `${base}/${ws.privacyContent.trim() ? 'privacy' : 'terms'}` });
  if (ws.supportEmail || ws.supportUrl) items.push({ I: LifeBuoy, t: 'A way to reach support', d: 'Support contact details are listed in the footer.' });
  return (
    <Section id="about" tint>
      <SectionHead eyebrow="About and trust" title="What this site does, stated plainly." body="We describe only what exists today. No guarantees or regulatory claims are made here." />
      <div className="mt-10 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ I, t, d, to }, i) => (
          <Reveal key={t} delay={(i % 3) * 70}>
            <div className="s-feat s-tile h-full" data-testid={`trust-${i}`}>
              <I size={20} style={{ color: 'var(--s-accent-ink)' }} aria-hidden="true" />
              <p className="mt-4 font-semibold">{t}</p><p className="s-muted mt-1.5 text-sm leading-relaxed">{d}</p>
              {to && <Link href={to} className="mt-3 inline-block text-sm font-semibold underline underline-offset-4" style={{ color: 'var(--s-accent-ink)' }}>Read it</Link>}
            </div>
          </Reveal>))}
      </div>
    </Section>
  );
}
