import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Caps } from '@/lib/capabilities';
import { Section, SectionHead } from './common';

export function Faq({ caps }: { caps: Caps }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!caps.faq.length) return null;
  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <SectionHead eyebrow="FAQ" title="Questions, answered." />
        <div className="border-t" style={{ borderColor: 'var(--s-line)' }}>
          {caps.faq.map((f, i) => {
            const o = open === i;
            return (
              <div key={i} className="border-b" style={{ borderColor: 'var(--s-line)' }} data-testid={`faq-${i}`}>
                <h3><button type="button" aria-expanded={o} aria-controls={`faq-p-${i}`} id={`faq-b-${i}`} onClick={() => setOpen(o ? null : i)} className="flex min-h-[56px] w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold">
                  {f.question}<ChevronDown size={18} aria-hidden="true" style={{ transform: o ? 'rotate(180deg)' : 'none', transition: 'transform .3s', flex: 'none' }} />
                </button></h3>
                <div id={`faq-p-${i}`} role="region" aria-labelledby={`faq-b-${i}`} className="s-faq" data-open={o}><div><p className="s-muted whitespace-pre-line pb-5 text-[0.95rem] leading-relaxed">{f.answer}</p></div></div>
              </div>);
          })}
        </div>
      </div>
    </Section>
  );
}
