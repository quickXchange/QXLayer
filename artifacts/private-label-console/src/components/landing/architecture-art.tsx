import { useId } from 'react';

/** Decorative product architecture, never a quote, balance, transaction or live system. */
export function ArchitectureArt() {
  const id = useId().replace(/:/g, '');
  return <svg className="lp-product-art" viewBox="0 0 600 300" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-surface`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="var(--s-accent-ink)" stopOpacity=".26" />
        <stop offset="1" stopColor="var(--s-primary)" stopOpacity=".08" />
      </linearGradient>
      <radialGradient id={`${id}-light`}>
        <stop stopColor="var(--s-accent-ink)" stopOpacity=".24" />
        <stop offset="1" stopColor="var(--s-accent-ink)" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="300" cy="170" rx="240" ry="120" fill={`url(#${id}-light)`} />
    <g fill="none" stroke="var(--s-accent-ink)">
      <ellipse cx="300" cy="160" rx="225" ry="95" strokeOpacity=".16" />
      <ellipse cx="300" cy="160" rx="170" ry="72" strokeOpacity=".25" strokeDasharray="3 9" className="lp-flow" />
      <path d="M110 112 220 152M490 112 380 152M110 230 240 180M490 230 360 180" strokeOpacity=".45" strokeDasharray="4 8" className="lp-flow" />
    </g>
    {[28, 14, 0].map((offset) => <g key={offset} transform={`translate(0 ${offset})`}>
      <path d="m300 65 120 75-120 75-120-75Z" fill={`url(#${id}-surface)`} stroke="var(--s-accent-ink)" strokeOpacity={offset === 0 ? '.85' : '.3'} />
      <path d="M180 140v10l120 75 120-75v-10M300 215v10" fill="none" stroke="var(--s-accent-ink)" strokeOpacity=".3" />
    </g>)}
    <g fill="none" stroke="var(--s-accent-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m275 127 50-1m-9-9 12 9-13 10m10 17-50 1m9 9-12-9 13-10" />
    </g>
    {[[110, 105], [490, 105], [110, 225], [490, 225]].map(([x, y], i) =>
      <g key={i} transform={`translate(${x} ${y})`}>
        <path d="m0-20 32 20L0 20-32 0Z" fill={`url(#${id}-surface)`} stroke="var(--s-accent-ink)" strokeOpacity=".6" />
        <path d="m-32 0 0 9L0 29 32 9V0M0 20v9" fill="none" stroke="var(--s-accent-ink)" strokeOpacity=".3" />
        <circle r="4" fill="var(--s-primary)" />
      </g>)}
  </svg>;
}