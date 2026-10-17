import { useEffect, useRef, type ReactNode } from 'react';

export function WidgetShell({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = frame.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!el || motion.matches || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0, px = 0, py = 0;
    const move = (e: PointerEvent) => {
      if (window.innerWidth < 1024 || motion.matches) return;
      const r = el.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; el.style.setProperty('--sx', `${px}px`); el.style.setProperty('--sy', `${py}px`); el.style.setProperty('--so', '1'); });
    };
    const leave = () => el.style.setProperty('--so', '0');
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return <div ref={frame} className="s-glowframe" data-testid="widget-exchange"><div className="s-glowinner p-3.5 sm:p-7"><div className="s-clip" aria-hidden="true"><span className="s-spec" /><span className="s-sheen" /></div>{children}</div></div>;
}
