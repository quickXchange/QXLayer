import { useId, type CSSProperties, type ReactNode } from 'react';
import { Coin, type CoinId } from './showcase-art';
import { QXMark } from './showcase-brand';

/** Data-dense presentational atoms. All values are fictional demo data. */
export const Kpis = ({ items }: { items: [string, string, string?][] }) => (
  <div className="sx-kpis" style={{ '--n': items.length } as CSSProperties}>
    {items.map(([l, v, d]) => <div key={l} className="sx-kpi"><small>{l}</small><strong>{v}</strong>{d && <em className={d.startsWith('-') ? 'dn' : 'up'}>{d}</em>}</div>)}
  </div>
);

const path = (pts: number[]) => pts.map((v, i) => `${i ? 'L' : 'M'}${(i * 300) / (pts.length - 1)} ${100 - v}`).join('');
export const Chart = ({ a, b, h = 8 }: { a: number[]; b?: number[]; h?: number }) => {
  const id = `ch${useId().replace(/:/g, '')}`;
  return (
    <svg className="sx-chart" viewBox="0 0 300 100" preserveAspectRatio="none" style={{ '--h': h } as CSSProperties}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--s-accent)" stopOpacity=".42" /><stop offset="1" stopColor="var(--s-accent)" stopOpacity="0" /></linearGradient></defs>
      {[25, 50, 75].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="var(--s-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
      <path d={`${path(a)}L300 100L0 100Z`} fill={`url(#${id})`} />
      {b && <path d={path(b)} fill="none" stroke="var(--s-primary)" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
      <path d={path(a)} fill="none" stroke="var(--s-accent)" strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
};

export const Cols = ({ v, labels, h = 7 }: { v: number[]; labels?: string[]; h?: number }) => (
  <div className="sx-cols" style={{ '--h': h } as CSSProperties}>
    {v.map((x, i) => <div key={i}><span style={{ height: `${x}%` }} />{labels && <small>{labels[i]}</small>}</div>)}
  </div>
);

export const Tr = ({ c, cols, head }: { c: ReactNode[]; cols: string; head?: boolean }) => (
  <div className={`sx-tr ${head ? 'th' : ''}`} style={{ '--c': cols } as CSSProperties}>{c.map((x, i) => <span key={i}>{x}</span>)}</div>
);
export const St = ({ t, k = 'ok' }: { t: string; k?: 'ok' | 'wait' | 'off' }) => <b className={`sx-st ${k}`}>{t}</b>;
export const Cn = ({ c, n }: { c: CoinId; n?: string }) => <span className="sx-cc2"><Coin c={c} size={1.5} />{n ?? c}</span>;

export const Nav = ({ items, on = 0 }: { items: string[]; on?: number }) => (
  <div className="sx-nav sx-nomob">{items.map((t, i) => <span key={t} className={i === on ? 'on' : ''}>{t}</span>)}</div>
);

export const Fld = ({ l, v, r, sub }: { l: string; v: string; r?: ReactNode; sub?: string }) => (
  <div className="sx-fld"><div><small>{l}</small><strong>{v}</strong>{sub && <small>{sub}</small>}</div>{r}</div>
);
export const Btn = ({ t }: { t: string }) => <div className="sx-btn">{t}</div>;
export const Chips = ({ items, on = 0 }: { items: string[]; on?: number }) => <div className="sx-chips">{items.map((c, i) => <span key={c} className={i === on ? 'on' : ''}>{c}</span>)}</div>;
export const Kv = ({ k, v }: { k: string; v: ReactNode }) => <div className="sx-kv"><span>{k}</span><b>{v}</b></div>;
export const Tg = ({ on }: { on?: boolean }) => <i className={`sx-tg ${on ? 'on' : ''}`} />;
export const Bar = ({ p }: { p: number }) => <div className="sx-bar"><i style={{ width: `${p}%` }} /></div>;
export const Pair = ({ a, b }: { a: CoinId; b: CoinId }) => <span className="sx-pair"><Coin c={a} size={1.7} /><Coin c={b} size={1.7} /></span>;

export const Donut = ({ parts, v, s }: { parts: [number, string][]; v: string; s: string }) => {
  let acc = 0;
  const g = parts.map(([n, c]) => { const a = acc; acc += n; return `${c} ${a}% ${acc}%`; }).join(',');
  return <div className="sx-donut" style={{ background: `conic-gradient(${g})` }}><div><strong>{v}</strong><small>{s}</small></div></div>;
};

export const Qr = () => {
  const n = 21; let seed = 11;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const fin = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  const cells: ReactNode[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (fin(x, y) || (Math.abs(x - 10) < 3 && Math.abs(y - 10) < 3)) continue;
    if (rnd() > 0.5) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  }
  const f = (x: number, y: number) => <g key={`${x}${y}`}><rect x={x} y={y} width="7" height="7" rx="1.4" /><rect x={x + 1} y={y + 1} width="5" height="5" rx="1" fill="#f4f1ff" /><rect x={x + 2} y={y + 2} width="3" height="3" rx=".6" /></g>;
  return (
    <div className="sx-qr">
      <svg viewBox="-1 -1 23 23" fill="#1b1340">{cells}{f(0, 0)}{f(14, 0)}{f(0, 14)}</svg>
      <span><QXMark s={1.8} theme="light" /></span>
    </div>
  );
};
