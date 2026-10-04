import { useRef, type CSSProperties, type ReactNode } from 'react';
import '@/styles/product-showcase.css';
import { Logo } from './showcase-brand';

/** Shared decorative frame: pointer parallax + glow. Purely presentational, aria-hidden. */
export function ShowcaseFrame({ label, accent, brandLabel, children }: { label: string; accent?: string; brandLabel?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse' || window.matchMedia('(pointer:coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
    <figure className="sc-fig">
      <div ref={ref} className="sc-stage" style={{ '--sc-light': accent ?? 'var(--s-primary)' } as CSSProperties} aria-hidden="true" onPointerMove={move} onPointerLeave={leave}>
        <div className="sc-glow" />
        <div className="sc-tag sc-tag-l"><Logo s={1.7} sub={brandLabel} /></div>
        <div className="sc-tag sc-tag-r">Demo / Sandbox</div>
        {children}
      </div>
      <figcaption className="sc-cap s-mono">Demo / Sandbox screens. Numbers, assets and orders are illustrative, not live support or actual service operation. {label}</figcaption>
    </figure>
  );
}

/** Layer. m = shown on mobile ('n' = narrow centered). Others hide at <=639px. */
export function L({ x, y, w, d = 10, z = 1, fl, m, children }: { x: number; y: number; w: number; d?: number; z?: number; fl?: 1 | 2; m?: boolean | 'n'; children: ReactNode }) {
  return (
    <div className={`sc-layer ${m ? 'mm' : 'sx'} ${m === 'n' ? 'mn' : ''}`} style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, zIndex: z, ['--d' as string]: d } as CSSProperties}>
      <div className={`sc-in ${fl ? `sc-fl${fl}` : ''}`}>{children}</div>
    </div>
  );
}

export const Win = ({ title, children, tone, brandSize = 1.65 }: { title: string; children: ReactNode; tone?: 'flat'; brandSize?: number }) => (
  <div className={`sc-win ${tone ?? ''}`}><div className="sc-bar"><Logo s={brandSize} /><b>{title}</b><u>Demo</u></div><div className="sc-body">{children}</div></div>
);
