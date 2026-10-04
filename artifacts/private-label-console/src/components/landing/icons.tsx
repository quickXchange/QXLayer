import type { ReactNode } from 'react';

const P = (d: string, acc?: boolean) => <path d={d} className={acc ? 'acc' : undefined} />;
const glyphs: Record<string, ReactNode> = {
  exchange: <>{P('M8 17h28m0 0-6-6m6 6-6 6')}{P('M40 31H12m0 0 6-6m-6 6 6 6')}<circle className="acc" cx="24" cy="24" r="4" /></>,
  card: <><rect className="acc" x="6" y="12" width="36" height="24" rx="4" />{P('M6 21h36M12 29h9')}</>,
  payments: <><circle className="acc" cx="24" cy="24" r="16" />{P('M24 13v22M29 19c-1-3-9-3-10 1s10 3 10 8-8 5-11 1')}</>,
  staking: <>{P('M7 17l17-8 17 8-17 8z', true)}{P('M7 24l17 8 17-8M7 31l17 8 17-8')}</>,
  earn: <>{P('M7 37l11-11 8 6 15-18')}{P('M30 14h11v11')}<circle className="acc" cx="18" cy="26" r="3" /></>,
  dex: <><circle cx="17" cy="24" r="11" /><circle className="acc" cx="31" cy="24" r="11" />{P('M24 18v12')}</>,
  content: <><rect className="acc" x="10" y="7" width="28" height="34" rx="3" />{P('M16 16h16M16 23h16M16 30h9')}</>,
  telegram: <>{P('M41 8L6 22l11 4 4 13 6-7 9 7z', true)}{P('M17 26L41 8')}</>,
  miniapp: <><rect className="acc" x="8" y="8" width="14" height="14" rx="3" /><rect x="26" y="8" width="14" height="14" rx="3" /><rect x="8" y="26" width="14" height="14" rx="3" /><circle cx="33" cy="33" r="7" /></>,
  whatsapp: <>{P('M24 7a17 17 0 1 0 8 32l-7 3 1-7A17 17 0 0 0 24 7z', true)}{P('M17 18c0 7 5 12 12 12l2-3-4-2-2 2c-2-1-4-3-5-5l2-2-2-4z')}</>,
  ios: <><rect className="acc" x="13" y="5" width="22" height="38" rx="6" />{P('M20 37h8M21 10h6')}</>,
  android: <><rect className="acc" x="11" y="11" width="26" height="31" rx="6" />{P('M16 5l3 5M32 5l-3 5')}<circle cx="19" cy="22" r="1.5" /><circle cx="29" cy="22" r="1.5" />{P('M19 33h10')}</>,
  engine: <><circle className="acc" cx="24" cy="24" r="7" /><circle cx="24" cy="24" r="14" />{[0, 45, 90, 135].map((a) => <path key={a} d="M24 4v6M24 38v6" transform={`rotate(${a} 24 24)`} />)}</>,
  nodes: <><circle className="acc" cx="24" cy="11" r="5" /><circle cx="10" cy="36" r="5" /><circle cx="38" cy="36" r="5" />{P('M21 15L13 32M27 15l8 17M15 36h18')}</>,
  mining: <><rect className="acc" x="13" y="13" width="22" height="22" rx="4" />{P('M19 7v6M29 7v6M19 35v6M29 35v6M7 19h6M7 29h6M35 19h6M35 29h6')}<rect x="20" y="20" width="8" height="8" rx="1" /></>,
  kolo: <>{P('M24 5l16 9v20l-16 9-16-9V14z', true)}{P('M20 16v16M20 24l10-8M23 25l8 8')}</>,
};

export function ProductIcon({ icon, className = 'h-10 w-10' }: { icon: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lp-ico ${className}`} aria-hidden="true">
      {glyphs[icon] ?? glyphs.nodes}
    </svg>
  );
}
export const ICON_KEYS = Object.keys(glyphs);
