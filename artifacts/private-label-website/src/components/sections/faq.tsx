import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Caps } from '@/lib/capabilities';
import { Section, SectionHead } from './common';

export function Faq({ caps }: { caps: Caps }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!caps.faq.length) return null;
  return (
    <Section id="faq">
      <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start"><SectionHead eyebrow="FAQ" title="Questions, answered." /></div>
        <div className="border-t" style={{ borderColor: 'var(--s-line)' }}>
          {caps.faq.map((f, i) => {
            const o = open === i;
            return (
              <div key={i} className="s-faq-item border-b" data-open={o} style={{ borderColor: 'var(--s-line)' }} data-testid={`faq-${i}`}>
                <h3><button type="button" aria-expanded={o} aria-controls={`faq-p-${i}`} id={`faq-b-${i}`} onClick={() => setOpen(o ? null : i)} className="flex min-h-[60px] w-full items-center justify-between gap-4 py-5 text-left text-[1.05rem] font-semibold">
                  <span className="flex items-baseline gap-4"><span className="s-mono s-muted text-xs" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{f.question}</span><ChevronDown size={18} aria-hidden="true" style={{ transform: o ? 'rotate(180deg)' : 'none', transition: 'transform .3s', flex: 'none' }} />
                </button></h3>
                <div id={`faq-p-${i}`} role="region" aria-labelledby={`faq-b-${i}`} className="s-faq" data-open={o}><div><p className="s-muted whitespace-pre-line pb-5 text-[0.95rem] leading-relaxed">{f.answer}</p></div></div>
              </div>);
          })}
        </div>
      </div>
    </Section>
  );
}
