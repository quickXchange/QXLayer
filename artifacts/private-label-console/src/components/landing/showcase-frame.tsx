import { useRef, type CSSProperties, type ReactNode } from 'react';
import '@/styles/product-showcase.css';

/** Shared decorative frame: pointer parallax + glow. Purely presentational, aria-hidden. */
export function ShowcaseFrame({ label, accent, children }: { label: string; accent?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--px', String((x - 0.5) * 2));
    el.style.setProperty('--py', String((y - 0.5) * 2));
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
    el.dataset.active = '1';
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--px', '0');
    el.style.setProperty('--py', '0');
    el.dataset.active = '0';
  };
  return (
    <div ref={ref} className="sc-stage" style={{ '--sc-light': accent ?? 'var(--s-primary)' } as CSSProperties} aria-hidden="true" onPointerMove={move} onPointerLeave={leave} onPointerDown={(e) => { if (e.pointerType === 'touch' && ref.current) { ref.current.dataset.active = '1'; window.setTimeout(() => { if (ref.current) ref.current.dataset.active = '0'; }, 900); } }}>
      <span className="sc-badge s-mono">{label}</span>
      <div className="sc-glow" />
      {children}
    </div>
  );
}

export function L({ x, y, w, d = 10, z = 1, fl, children }: { x: number; y: number; w: number; d?: number; z?: number; fl?: 1 | 2; children: ReactNode }) {
  return (
    <div className="sc-layer" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, zIndex: z, ['--d' as string]: d } as CSSProperties}>
      <div className={`sc-in ${fl ? `sc-fl${fl}` : ''}`}>{children}</div>
    </div>
  );
}

export const Win = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="sc-win"><div className="sc-bar"><i /><i /><i /><b>{title}</b></div><div className="sc-body">{children}</div></div>
);
export const Row = ({ a, b = 'Demo' }: { a: string; b?: string }) => <div className="sc-row2"><span>{a}</span><span className="s-muted">--</span><em>{b}</em></div>;
export const Tiles = ({ items }: { items: string[] }) => <div className="sc-tiles">{items.map((t) => <div key={t} className="sc-tile"><small>{t}</small><strong>--</strong></div>)}</div>;
export const Bars = ({ h }: { h: number[] }) => <div className="sc-bars">{h.map((v, i) => <span key={i} style={{ height: `${v}%` }} />)}</div>;
export const Field = ({ a, b = '--' }: { a: string; b?: string }) => <div className="sc-field"><small>{a}</small><span>{b}</span></div>;
export const Btn = ({ t }: { t: string }) => <div className="sc-btn">{t}</div>;
export const Chips = ({ items, on = 0 }: { items: string[]; on?: number }) => <div className="sc-chips">{items.map((c, i) => <span key={c} className={i === on ? 'on' : ''}>{c}</span>)}</div>;
export const Side = () => <div className="sc-side"><span /><span /><span /><span /><span /></div>;
