import type { Caps } from '@/lib/capabilities';
import { Section, SectionHead } from './common';
import { Reveal } from '@/components/reveal';

function steps(c: Caps) {
  if (c.exchange !== 'off') return [
    ['Choose', 'Pick the asset you hold and the asset you want, from the configured list.'],
    ['Enter details', 'Set the amount. Rate, limits and fees are shown once a pricing source is connected.'],
    ['Send', 'Follow the instructions for your order. Order execution is not enabled in this sandbox.'],
    ['Receive', 'Funds arrive at the address you provide, once execution is available.'],
  ];
  if (c.payments) return [
    ['Create', 'Set up a payment request for what you are selling.'],
    ['Share', 'Send a payment link or show a QR code.'],
    ['Customer pays', 'Your customer pays in a supported crypto asset.'],
    ['Review', 'Follow each payment through to settlement.'],
  ];
  return [['Explore', 'See what is available for this site.'], ['Connect', 'Follow the steps for each enabled service.'], ['Use', 'Services open as they are enabled.'], ['Get help', 'Reach support from the footer at any time.']];
}
export function How({ caps }: { caps: Caps }) {
  const s = steps(caps);
  return (
    <Section id="how" tint>
      <SectionHead eyebrow="How it works" title="Four steps, no detours." body="This describes the intended flow. Live execution is not enabled in the sandbox." />
      <Reveal className="relative mt-12">
        <svg className="pointer-events-none absolute left-0 top-[26px] hidden h-2 w-full lg:block" viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true"><path d="M12.5 .5H87.5" pathLength={1} className="s-path" vectorEffect="non-scaling-stroke" fill="none" /></svg>
        <ol className="relative grid gap-8 lg:grid-cols-4 lg:gap-6">
          {s.map(([t, d], i) => (
            <li key={t} className="flex gap-5 lg:block lg:text-center" data-testid={`step-${i + 1}`}>
              <span className="s-mono grid h-[52px] w-[52px] flex-none place-items-center border text-sm font-semibold lg:mx-auto" style={{ borderRadius: '50%', borderColor: 'var(--s-accent)', background: 'var(--s-bg2)', color: 'var(--s-accent-ink)', position: 'relative' }}>0{i + 1}</span>
              <div className="lg:mt-5"><h3 className="text-lg font-semibold">{t}</h3><p className="s-muted mt-1.5 text-sm leading-relaxed">{d}</p></div>
            </li>))}
        </ol>
      </Reveal>
    </Section>
  );
}
