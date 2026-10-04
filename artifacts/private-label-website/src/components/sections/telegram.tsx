import type { ReactNode } from 'react';
import type { Caps } from '@/lib/capabilities';
import { Section, SectionHead, PreviewNote } from './common';
import { Reveal } from '@/components/reveal';

function Phone({ title, children, tid }: { title: string; children: ReactNode; tid: string }) {
  return (
    <div className="s-phone mx-auto w-full max-w-[17rem]" data-testid={tid}>
      <div className="overflow-hidden" style={{ borderRadius: '1.6rem', background: 'var(--s-bg)', minHeight: 330 }}>
        <div className="s-notch" aria-hidden="true" /><div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--s-line)' }}><span className="h-6 w-6 rounded-full" style={{ background: 'var(--s-primary)' }} /><span className="text-xs font-semibold">{title}</span></div>
        <div className="space-y-2.5 p-4">{children}</div>
      </div>
    </div>
  );
}
const Bub = ({ me, w }: { me?: boolean; w: string }) => <div className={`flex ${me ? 'justify-end' : ''}`}><div className="space-y-1.5 rounded-2xl px-3 py-2.5" style={{ width: w, background: me ? 'color-mix(in srgb,var(--s-accent) 22%,transparent)' : 'color-mix(in srgb,var(--s-fg) 8%,transparent)' }}><div className="s-bar" /><div className="s-bar w-2/3" /></div></div>;

export function Telegram({ caps, brand }: { caps: Caps; brand: string }) {
  return (
    <Section id="telegram" tint>
      <SectionHead eyebrow={caps.bot && caps.mini ? 'Telegram' : caps.bot ? 'Telegram bot' : 'Telegram Mini App'} title={`${brand}, inside the app you already use.`} body="These are visual previews. Telegram is not connected in this phase." />
      <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-4">
        {caps.bot && <Reveal><Phone title={`${brand} bot`} tid="phone-bot"><Bub w="70%" /><Bub me w="48%" /><Bub w="78%" /><div className="flex gap-2 pt-2"><span className="s-chip text-[11px]">Menu</span><span className="s-chip text-[11px]">Help</span></div></Phone><p className="mt-4 text-center text-sm font-semibold">Telegram bot</p></Reveal>}
        {caps.mini && <Reveal delay={100} className="s-phone-b"><Phone title={`${brand} Mini App`} tid="phone-mini"><div className="s-lit space-y-3 p-3"><div className="s-bar w-1/2" /><div className="s-bar h-9 w-full" style={{ height: '2.25rem' }} /><div className="s-bar h-9 w-full" style={{ height: '2.25rem' }} /></div><div className="grid h-11 place-items-center rounded-lg text-xs font-semibold" style={{ background: 'var(--s-primary)', color: 'var(--s-primary-fg)' }}>Continue</div></Phone><p className="mt-4 text-center text-sm font-semibold">Telegram Mini App</p></Reveal>}
      </div>
      <PreviewNote>Not live: neither is connected to a Telegram account yet.</PreviewNote>
    </Section>
  );
}
