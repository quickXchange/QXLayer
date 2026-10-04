import { useEffect, useRef } from 'react';

const NODES: [number, number][] = [[90, 140], [260, 70], [420, 210], [610, 110], [790, 240], [960, 90], [1110, 200], [180, 380], [380, 470], [560, 360], [880, 450], [1060, 400]];
const LINKS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [0, 7], [7, 8], [8, 9], [2, 9], [9, 4], [4, 10], [10, 11], [6, 11]];

const RIBBONS: [string, string][] = [["M-40 470C220 330 430 560 700 400S1040 120 1260 210", "0"], ["M-40 250C240 90 470 330 760 220S1060 330 1260 120", "-3.2"], ["M-40 560C260 560 520 280 820 330S1100 500 1260 400", "-6.1"]];

/** Lightweight CSS/SVG atmosphere. Decorative only; never intercepts input. */
export function Ambient() {
  const light = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth >= 1024;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const el = light.current;
    if (!fine || motion.matches || !el) return;
    let raf = 0, x = 0, y = 0;
    const move = (e: PointerEvent) => { if (window.innerWidth < 1024 || motion.matches) return; x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(() => { raf = 0; el.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`; el.style.opacity = '1'; }); };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <>
      <div className="s-ambient" aria-hidden="true">
        <div className="s-aurora" /><div className="s-grid" />
        <div className="s-orb s-orb-a" /><div className="s-orb s-orb-b" /><div className="s-orb s-orb-c" />
        <svg className="s-net" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMin slice" fill="none">
          <defs><linearGradient id="s-rg" x1="0" x2="1"><stop offset="0" stopColor="var(--s-primary)" stopOpacity="0" /><stop offset=".45" stopColor="var(--s-accent)" stopOpacity=".55" /><stop offset=".8" stopColor="var(--s-glow)" stopOpacity=".7" /><stop offset="1" stopColor="var(--s-glow)" stopOpacity="0" /></linearGradient></defs>
          {RIBBONS.map(([d, delay], i) => <g key={`r${i}`}><path d={d} className="s-rib" /><circle r="9" className="s-comet-halo" style={{ offsetPath: `path("${d}")`, animationDelay: `${delay}s` }} /><circle r="2.6" className={`s-comet${i === 2 ? ' s-comet-x' : ''}`} style={{ offsetPath: `path("${d}")`, animationDelay: `${delay}s` }} /></g>)}
                    {LINKS.map(([a, b], i) => <line key={i} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} className="s-net-line" />)}
          {LINKS.map(([a, b], i) => i % 2 === 0 && <line key={`f${i}`} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} className="s-net-flow" style={{ animationDelay: `${i * -0.9}s` }} />)}
          {NODES.map(([x, y], i) => <circle key={`m${i}`} cx={x + 24} cy={y + 40} r={1.6} className="s-mote" style={{ animationDelay: `${i * -1.7}s` }} />)}
          {NODES.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3.4 : 2.4} className="s-net-node" style={{ animationDelay: `${(i % 5) * -1.1}s` }} />)}
        </svg>
        <div className="s-fade" />
      </div>
      <div ref={light} className="s-cursor-light" aria-hidden="true" />
    </>
  );
}
