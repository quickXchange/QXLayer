import { useEffect, useRef, useState } from 'react';

/** Counts to a real configured value once visible. Reduced motion shows the final value. */
export function CountUp({ to, ms = 1400 }: { to: number; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(to);
  useEffect(() => {
    const el = ref.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!el || motion.matches || typeof IntersectionObserver === 'undefined') { setV(to); return; }
    setV(0);
    let raf = 0;
    const duration = window.innerWidth < 768 ? Math.min(ms, 600) : ms;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
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
  return <span ref={ref}>{v}</span>;
}
