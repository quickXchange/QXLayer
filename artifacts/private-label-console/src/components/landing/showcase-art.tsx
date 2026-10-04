import { useId, type CSSProperties, type ReactNode } from 'react';

/** Illustrative marketing coin marks. Not a statement of asset support. */
export type CoinId = 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'SOL' | 'BNB';
const glyph = (c: CoinId, id: string): ReactNode => {
  switch (c) {
    case 'BTC': return <><circle cx="16" cy="16" r="16" fill="#f7931a" /><text x="16" y="22.5" textAnchor="middle" fontSize="19" fontWeight="700" fill="#fff" fontFamily="sans-serif">B</text><path d="M13 6v3M17 6v3M13 23v3M17 23v3" stroke="#fff" strokeWidth="1.6" /></>;
    case 'ETH': return <><circle cx="16" cy="16" r="16" fill="#5d6ad2" /><path d="M16 5l-6 10.5 6 3.5 6-3.5z" fill="#fff" /><path d="M16 20.5l-6-3.5 6 9 6-9z" fill="#dfe3ff" /></>;
    case 'USDT': return <><circle cx="16" cy="16" r="16" fill="#26a17b" /><path d="M9 9h14v3h-5.5v2.4c3 .2 5 .8 5 1.6s-2 1.4-5 1.6V24h-3v-5.4c-3-.2-5-.8-5-1.6s2-1.4 5-1.6V12H9z" fill="#fff" /></>;
    case 'USDC': return <><circle cx="16" cy="16" r="16" fill="#2775ca" /><circle cx="16" cy="16" r="9.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="38 8" /><text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" fontFamily="sans-serif">$</text></>;
    case 'SOL': return <><circle cx="16" cy="16" r="16" fill="#14102a" /><defs><linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor="#9945ff" /><stop offset="1" stopColor="#19fb9b" /></linearGradient></defs>{[9, 14, 19].map((y, i) => <path key={y} d={i === 1 ? `M10 ${y}h14l-2 3.4H8z` : `M8 ${y}h14l2 3.4H10z`} fill={`url(#${id})`} />)}</>;
    default: return <><circle cx="16" cy="16" r="16" fill="#f3ba2f" /><path d="M16 7l3 3-3 3-3-3zM9 14l3 3-3 3-3-3zM23 14l3 3-3 3-3-3zM16 21l3 3-3 3-3-3zM16 14l3 3-3 3-3-3z" fill="#fff" transform="translate(0 -2)" /></>;
  }
};
export const Coin = ({ c, size = 2 }: { c: CoinId; size?: number }) => {
  const id = `coin-${useId().replace(/:/g, '')}`;
  return <svg className="sc-coin" viewBox="0 0 32 32" style={{ width: `${size}em`, height: `${size}em` }} aria-hidden="true">{glyph(c, id)}<circle cx="16" cy="16" r="15.4" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".8" /><path d="M3 10A14 14 0 0 1 22 3" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.4" strokeLinecap="round" /></svg>;
};
export const CoinRow = ({ c, n }: { c: CoinId; n: string }) => <div className="sc-row2"><span className="sc-cr"><Coin c={c} size={1.7} />{n}</span><span className="sc-ph" /><em>Demo</em></div>;
export const CoinStack = ({ items }: { items: CoinId[] }) => <div className="sc-cstack">{items.map((c) => <Coin key={c} c={c} size={2.6} />)}</div>;
export const Orb = ({ c, x, y, s = 4, d = 0 }: { c: CoinId; x: number; y: number; s?: number; d?: number }) => (
  <div className="sc-orb" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` } as CSSProperties}><Coin c={c} size={s} /></div>
);

export const CardRender = ({ tilt = -7 }: { tilt?: number }) => (
  <div className="sc-cc" style={{ transform: `perspective(60em) rotateY(${tilt}deg) rotateX(4deg) rotate(-4deg)` }}>
    <div className="sc-cc-top"><b>YOUR BRAND</b><span className="sc-wave" /></div>
    <div className="sc-chip2"><i /><i /><i /><i /></div>
    <div className="sc-cc-num">•••• •••• •••• ••••</div>
    <div className="sc-cc-bot"><span>CARDHOLDER</span><span className="sc-mc"><i /><i /></span></div>
  </div>
);

export const Device = ({ droid, children }: { droid?: boolean; children: ReactNode }) => (
  <div className={`sc-dev ${droid ? 'droid' : ''}`}><i className="sc-btn1" /><i className="sc-btn2" /><div className="sc-scr">{droid ? <i className="sc-punch" /> : <span className="sc-island" />}{children}</div><b className="sc-gloss" /></div>
);

export const Core = () => (
  <div className="sc-core"><div className="sc-ring r1" /><div className="sc-ring r2" /><div className="sc-ring r3" /><div className="sc-orbm"><b>Core</b><small>Engine</small></div></div>
);

export const Rack = ({ rows = 5, label }: { rows?: number; label: string }) => (
  <div className="sc-rack"><small>{label}</small>{Array.from({ length: rows }, (_, i) => <div key={i} className="sc-unit"><i style={{ animationDelay: `${i * -.5}s` }} /><i style={{ animationDelay: `${i * -.9}s` }} /><span /><em /></div>)}</div>
);

export const Cube = ({ s = 5 }: { s?: number }) => <div className="sc-cube" style={{ width: `${s}em`, height: `${s}em` }}><i /><i /><i /></div>;

export const Area = ({ pts }: { pts: number[] }) => {
  const id = `area-${useId().replace(/:/g, '')}`;
  const w = 200; const h = 70; const st = w / (pts.length - 1);
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${i * st} ${h - v * h / 100}`).join('');
  return <svg className="sc-area" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--s-accent)" stopOpacity=".5" /><stop offset="1" stopColor="var(--s-accent)" stopOpacity="0" /></linearGradient></defs><path d={`${d}L${w} ${h}L0 ${h}Z`} fill={`url(#${id})`} /><path d={d} fill="none" stroke="var(--s-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
};
