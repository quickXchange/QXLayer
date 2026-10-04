import { useId, type CSSProperties } from 'react';

type Coin = { x: string; y: string; size: number; mark: number; far?: boolean; hide?: boolean; d: number; l: number; dx: number; dy: number; o: number };
const COINS: Coin[] = [
  { x: '4%', y: '10%', size: 46, mark: 0, d: 24, l: 0, dx: 14, dy: -22, o: .8 },
  { x: '88%', y: '6%', size: 38, mark: 1, d: 28, l: -6, dx: -16, dy: 24, o: .75 },
  { x: '93%', y: '46%', size: 26, mark: 2, far: true, d: 34, l: -12, dx: -10, dy: -20, o: .5 },
  { x: '47%', y: '3%', size: 22, mark: 3, far: true, hide: true, d: 30, l: -3, dx: 18, dy: 14, o: .45 },
  { x: '2%', y: '58%', size: 30, mark: 2, far: true, d: 32, l: -9, dx: 12, dy: 20, o: .5 },
  { x: '76%', y: '84%', size: 42, mark: 3, hide: true, d: 26, l: -14, dx: -18, dy: -18, o: .7 },
  { x: '28%', y: '88%', size: 28, mark: 1, far: true, hide: true, d: 36, l: -5, dx: 14, dy: -16, o: .45 },
];
const MARKS = [
  <path key="0" d="M32 18v28M24 26h12a5 5 0 0 1 0 10H24m0 0h14a5 5 0 0 1 0 10H24" />,
  <path key="1" d="M32 16l14 16-14 16-14-16zM18 32h28" />,
  <path key="2" d="M22 42l10-22 10 22M26 35h12" />,
  <><circle key="3" cx="32" cy="32" r="9" /><path d="M32 14v6M32 44v6M14 32h6M44 32h6" /></>,
];

/** Decorative floating coins. Not assets, prices or balances. */
export function HeroCoins() {
  const id = useId().replace(/:/g, '');
  return (
    <div className="s-hero-coins" aria-hidden="true">
      {COINS.map((c, i) => (
        <span key={i} className={`s-hc${c.far ? ' s-hc-far' : ''}${c.hide ? ' s-hc-hide' : ''}`} style={{ left: c.x, top: c.y, width: c.size, height: c.size, opacity: c.o, '--d': `${c.d}s`, '--l': `${c.l}s`, '--x': `${c.dx}px`, '--y': `${c.dy}px` } as CSSProperties}>
          <svg viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id={`${id}f${i}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--s-glow)" /><stop offset=".55" stopColor="var(--s-primary)" /><stop offset="1" stopColor="var(--s-secondary)" /></linearGradient>
            </defs>
            <circle cx="32" cy="32" r="30" fill={`url(#${id}f${i})`} />
            <circle cx="32" cy="32" r="30" stroke="var(--s-accent)" strokeOpacity=".6" strokeWidth="1.5" />
            <circle cx="32" cy="32" r="23" stroke="#fff" strokeOpacity=".28" strokeWidth="1" />
            <path d="M12 20a26 26 0 0 1 22-9" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
            <g stroke="#fff" strokeOpacity=".9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{MARKS[c.mark]}</g>
          </svg>
        </span>
      ))}
    </div>
  );
}
