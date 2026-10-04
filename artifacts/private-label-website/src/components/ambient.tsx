import { useEffect, useRef } from 'react';

const NODES: [number, number][] = [[90, 140], [260, 70], [420, 210], [610, 110], [790, 240], [960, 90], [1110, 200], [180, 380], [380, 470], [560, 360], [880, 450], [1060, 400]];
const LINKS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [0, 7], [7, 8], [8, 9], [2, 9], [9, 4], [4, 10], [10, 11], [6, 11]];

/** Lightweight CSS/SVG atmosphere. Decorative only; never intercepts input. */
export function Ambient() {
  const light = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth >= 1024;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = light.current;
    if (!fine || reduce || !el) return;
    let raf = 0, x = 0, y = 0;
    const move = (e: PointerEvent) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(() => { raf = 0; el.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`; el.style.opacity = '1'; }); };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <>
      <div className="s-ambient" aria-hidden="true">
        <div className="s-grid" />
        <div className="s-orb s-orb-a" /><div className="s-orb s-orb-b" /><div className="s-orb s-orb-c" />
        <svg className="s-net" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMin slice" fill="none">
          {LINKS.map(([a, b], i) => <line key={i} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} className="s-net-line" style={{ animationDelay: `${(i % 7) * -1.3}s` }} />)}
          {NODES.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3.4 : 2.4} className="s-net-node" style={{ animationDelay: `${(i % 5) * -1.1}s` }} />)}
        </svg>
        <div className="s-fade" />
      </div>
      <div ref={light} className="s-cursor-light" aria-hidden="true" />
    </>
  );
}
