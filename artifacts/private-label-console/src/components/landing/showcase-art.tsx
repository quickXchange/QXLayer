import { useId, type CSSProperties, type ReactNode } from 'react';
import { Logo } from './showcase-brand';

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
export const CoinStack = ({ items, size = 2.6 }: { items: CoinId[]; size?: number }) => <div className="sc-cstack">{items.map((c) => <Coin key={c} c={c} size={size} />)}</div>;
export const Orb = ({ c, x, y, s = 4, d = 0 }: { c: CoinId; x: number; y: number; s?: number; d?: number }) => (
  <div className="sc-orb sx" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` } as CSSProperties}><Coin c={c} size={s} /></div>
);

/** Phone hardware. skin: tg / wa swap the screen theme. */
export const Device = ({ droid, skin, children }: { droid?: boolean; skin?: 'tg' | 'wa' | 'tgm'; children: ReactNode }) => (
  <div className={`sc-dev ${droid ? 'droid' : ''} ${skin ?? ''}`}><i className="sc-btn1" /><i className="sc-btn2" /><div className="sc-scr">{droid ? <i className="sc-punch" /> : <span className="sc-island" />}{children}</div><b className="sc-gloss" /></div>
);

export const Rack = ({ rows = 5, label }: { rows?: number; label: string }) => (
  <div className="sc-rack"><div className="sc-rack-h"><Logo s={1.3} theme="dark" /><small>{label}</small></div>{Array.from({ length: rows }, (_, i) => <div key={i} className="sc-unit"><i style={{ animationDelay: `${i * -.5}s` }} /><i style={{ animationDelay: `${i * -.9}s` }} /><span /><em /></div>)}</div>
);

export const Cube = ({ s = 5 }: { s?: number }) => <div className="sc-cube" style={{ width: `${s}em`, height: `${s}em`, ['--h' as string]: `${s / 2}em` } as CSSProperties}><i /><i /><i /></div>;
