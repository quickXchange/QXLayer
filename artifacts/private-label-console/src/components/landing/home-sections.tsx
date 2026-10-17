import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@site/components/reveal';
import { ShowcaseScene } from './showcase-scenes';
import { VxCard, VxFaq } from './vx-ui';
import '@/styles/vynox-marketing.css';

export function ExchangeSpotlight() {
  return (
    <section id="exchange" className="vx-sec vx-wrap" aria-labelledby="vx-ex-h" data-testid="section-exchange-spotlight"><div className="s-wrap vx-split">
      <Reveal><div>
        <p className="s-eyebrow">Flagship</p>
        <h2 id="vx-ex-h" className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl" style={{ lineHeight: 1.05 }}>A white-label Exchange, branded as yours</h2>
        <p className="s-muted mt-4 max-w-lg text-sm leading-relaxed sm:text-base">Swap, Convert, Buy and Sell on a customer website with your logo, colours and domain, plus an admin panel for orders, payment instructions, tracking and invoices.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/products/crypto_exchange" className="s-btn s-btn-primary" data-testid="link-spotlight-explore">Explore Exchange<ArrowRight size={16} /></Link>
          <Link href="/products/crypto_exchange#pricing" className="s-btn s-btn-ghost" data-testid="link-spotlight-pricing">View plans</Link>
        </div>
      </div></Reveal>
      <Reveal delay={90}><ShowcaseScene productKey="crypto_exchange" label="Illustrative product preview - sandbox, not live" /></Reveal>
    </div></section>
  );
}

const STEPS = [
  ['Choose', 'Pick the products that fit your business from the catalog.'],
  ['Brand', 'Provide your name, logo, colours and preferred domain.'],
  ['Review', 'The operator reviews your request and confirms approved pricing.'],
  ['Deliver', 'Delivery follows verified payment and the readiness stated per product.'],
];
export function HomeJourney() {
  return (
    <section id="how-it-works" className="vx-sec vx-wrap" aria-labelledby="vx-jr-h"><div className="s-wrap">
      <p className="s-eyebrow">How it works</p>
      <h2 id="vx-jr-h" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">From idea to your own brand</h2>
      <div className="vx-grid mt-8" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,13rem),1fr))' }}>
        {STEPS.map(([t, b], i) => <Reveal key={t} delay={i * 80}><VxCard className="h-full"><span className="vx-num">0{i + 1}</span><h3 className="mt-3 text-lg font-semibold">{t}</h3><p className="s-muted mt-1.5 text-sm">{b}</p></VxCard></Reveal>)}
      </div>
    </div></section>
  );
}

const FAQ = [
  { question: 'Are these products live?', answer: 'No. Every product is labeled Preview or Coming Soon, and each previews an illustrative scene, not a running service.' },
  { question: 'Can I buy a plan today?', answer: 'Only plans the owner has published with a configured payment method can be ordered. Otherwise plans show as not yet available.' },
  { question: 'What does Get Started do?', answer: 'It opens the existing account and ordering flow. You sign in first, then configure a request that is reviewed before anything is delivered.' },
  { question: 'Are the examples real customers or transactions?', answer: 'No. Sample orders, invoices and reviews are illustrations and carry no real data.' },
];
export function HomeFaq() {
  return (
    <section id="faq" className="vx-sec" aria-labelledby="vx-faq-h"><div className="s-wrap max-w-3xl">
      <p className="s-eyebrow">FAQ</p><h2 id="vx-faq-h" className="mb-4 mt-2 text-3xl font-semibold tracking-tight">Straight answers</h2>
      <VxFaq items={FAQ} id="home" />
    </div></section>
  );
}
