import { Link2, QrCode, Wallet, LineChart, Plug } from 'lucide-react';
import type { PublicSite } from '@workspace/api-client-react';
import { Section, SectionHead, PreviewNote } from './common';
import { Reveal } from '@/components/reveal';

const Qr = () => {
  const cells: React.ReactElement[] = [];
  for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
    const corner = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
    if (corner || ((x * 7 + y * 13 + x * y) % 5 < 2)) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  }
  return <svg viewBox="0 0 11 11" width="88" height="88" fill="currentColor" aria-hidden="true">{cells}</svg>;
};

export function PaymentMock({ site, compact }: { site: PublicSite; compact?: boolean }) {
  return (
    <div className="s-glowframe" data-testid="mock-payment"><div className="s-glowinner p-5 sm:p-6">
      <div className="flex items-center justify-between"><p className="text-sm font-semibold">Payment request</p><span className="s-badge">Illustrative</span></div>
      <div className="mt-5 flex items-start gap-5">
        <div className="rounded-lg p-2" style={{ background: 'var(--s-fg)', color: 'var(--s-bg)' }}><Qr /></div>
        <div className="flex-1 space-y-3 pt-1"><div className="s-bar w-2/3" /><div className="s-bar w-full" /><div className="s-bar w-1/2" /></div>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-lg border px-4 py-3" style={{ borderColor: 'var(--s-line)' }}>
        <span className="s-muted text-xs">Pay {site.brandName}</span><span className="s-mono text-xs">link / QR</span>
      </div>
      {!compact && <ol className="mt-5 space-y-2.5 text-xs">{['Awaiting payment', 'Payment detected', 'Settled'].map((t, i) => <li key={t} className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full" style={{ background: i === 0 ? 'var(--s-accent)' : 'var(--s-line)' }} />{t}</li>)}</ol>}
      <p className="s-muted mt-4 text-[11px]">Layout preview only. No live payment data.</p>
    </div></div>
  );
}

export function Payments({ site }: { site: PublicSite }) {
  const f = [[Wallet, 'Accept crypto', 'Take payment in the assets this site supports.'], [Link2, 'Payment links', 'Share a request without building a checkout.'], [QrCode, 'QR payments', 'Show a code for in-person or on-screen payment.'], [Plug, 'Merchant integrations', 'Connect payments to your own systems.'], [LineChart, 'Settlement visibility', 'Follow each payment from request to settlement.']] as const;
  return (
    <Section id="payments">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_.9fr]">
        <div>
          <SectionHead eyebrow="Crypto payments" title="Get paid in crypto, with a clear trail." body="Payments is part of this site's plan. The flows below are previews and are not live in the sandbox." />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {f.map(([I, t, d], i) => <Reveal key={t} delay={i * 60}><li className="s-card s-tile h-full p-4" data-testid={`feature-payments-${i}`}><I size={20} style={{ color: 'var(--s-accent-ink)' }} aria-hidden="true" /><p className="mt-3 font-semibold">{t}</p><p className="s-muted mt-1 text-sm leading-relaxed">{d}</p></li></Reveal>)}
          </ul>
          <PreviewNote>Preview: payment creation is not available yet.</PreviewNote>
        </div>
        <Reveal className="mx-auto w-full max-w-md"><PaymentMock site={site} /></Reveal>
      </div>
    </Section>
  );
}
