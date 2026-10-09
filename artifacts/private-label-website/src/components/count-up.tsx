import { useEffect, useRef } from 'react';

/** Counts to a real configured value once visible. Reduced motion shows the final value. */
export function CountUp({ to, ms = 1400 }: { to: number; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!el) return;
    const setV = (value: number) => { const text = String(value); if (el.textContent !== text) el.textContent = text; };
    if (motion.matches || typeof IntersectionObserver === 'undefined') { setV(to); return; }
    // Keep truthful values in offscreen DOM. Reset only when the existing
    // count-up animation actually starts, not while waiting for visibility.
    setV(to);
    let raf = 0;
    const duration = window.innerWidth < 768 ? Math.min(ms, 600) : ms;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setV(0);
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    const stop = () => {
      if (!motion.matches) return;
      io.disconnect();
      cancelAnimationFrame(raf);
      setV(to);
    };
    motion.addEventListener('change', stop);
    return () => { io.disconnect(); cancelAnimationFrame(raf); motion.removeEventListener('change', stop); };
  }, [to, ms]);
  return <span ref={ref}>{to}</span>;
}
