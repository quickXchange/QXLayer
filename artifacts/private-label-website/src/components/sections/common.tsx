import type { ReactNode } from 'react';
import { Reveal } from '@/components/reveal';

export function SectionHead({ eyebrow, title, body, center }: { eyebrow: string; title: string; body?: string; center?: boolean }) {
  return (
    <Reveal className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="s-eyebrow">{eyebrow}</p>
      <h2 className="s-h2 mt-3">{title}</h2>
      {body && <p className="s-muted mt-4 text-[1.02rem] leading-relaxed">{body}</p>}
    </Reveal>
  );
}
export function Section({ id, children, tint }: { id?: string; children: ReactNode; tint?: boolean }) {
  return <section id={id} className="s-section" style={tint ? { background: 'var(--s-bg2)', borderBlock: '1px solid var(--s-line)' } : undefined}><div className="s-wrap">{children}</div></section>;
}
export const PreviewNote = ({ children }: { children: ReactNode }) => <p className="s-muted mt-5 text-xs leading-relaxed">{children}</p>;
