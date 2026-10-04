import { useId, type ReactNode } from 'react';

/**
 * Decorative dimensional illustrations selected by the immutable product key.
 * Never data: no prices, balances, quotes or live systems. Admin-editable icons are unaffected.
 */
type Ctx = { id: string };
const A = 'var(--s-accent-ink)';
const P = 'var(--s-primary)';
const G = 'var(--s-glow)';
const U = (id: string, n: string) => `url(#${id}-${n})`;

function Coin({ x, y, r = 11, id, cls = '' }: { x: number; y: number; r?: number; id: string; cls?: string }) {
  return (
    <g className={cls}>
      <ellipse cx={x} cy={y + r * 0.35} rx={r} ry={r * 0.45} fill="rgb(0 0 0/.35)" />
      <circle cx={x} cy={y} r={r} fill={U(id, 'coin')} stroke={A} strokeOpacity=".7" />
      <circle cx={x} cy={y} r={r * 0.68} fill="none" stroke="#fff" strokeOpacity=".35" />
      <path d={`M${x - r * 0.3} ${y + r * 0.3}l${r * 0.3}-${r * 0.6}l${r * 0.3} ${r * 0.6}`} stroke="#fff" strokeOpacity=".85" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}
function Slab({ x, y, w, h, id, o = 0.9, r = 5 }: { x: number; y: number; w: number; h: number; id: string; o?: number; r?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={r} fill={U(id, 'glass')} stroke={A} strokeOpacity={o * 0.7} />;
}
function Phone({ x, y, w = 40, h = 78, id, kind, cls = '' }: { x: number; y: number; w?: number; h?: number; id: string; kind: 'ios' | 'android'; cls?: string }) {
  return (
    <g className={cls}>
      <rect x={x} y={y} width={w} height={h} rx={kind === 'ios' ? 9 : 6} fill={U(id, 'metal')} stroke={A} strokeOpacity=".8" strokeWidth="1.4" />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={kind === 'ios' ? 7 : 4} fill={U(id, 'screen')} />
      {kind === 'ios' ? <rect x={x + w / 2 - 7} y={y + 5} width="14" height="4" rx="2" fill="#0b0f1d" /> : <circle cx={x + w / 2} cy={y + 8} r="2" fill="#0b0f1d" />}
      <circle cx={x + w / 2} cy={y + 30} r="9" fill={U(id, 'coin')} opacity=".95" />
      <text x={x + w / 2} y={y + 33} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="var(--s-font)">P</text>
      <path d={`M${x + 8} ${y + 48}h${w - 16}M${x + 8} ${y + 55}h${w - 26}`} stroke="#fff" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round" />
      <rect x={x + 8} y={y + h - 16} width={w - 16} height="7" rx={kind === 'ios' ? 3.5 : 2} fill={P} opacity=".9" />
      {kind === 'ios' ? <rect x={x + w / 2 - 8} y={y + h - 6} width="16" height="1.8" rx=".9" fill="#fff" opacity=".6" /> : <path d={`M${x + w / 2 - 8} ${y + h - 5}h3M${x + w / 2 - 1.5} ${y + h - 5}h3M${x + w / 2 + 5} ${y + h - 5}h3`} stroke="#fff" opacity=".6" />}
    </g>
  );
}
function Bubble({ x, y, w, h, id, tail = 'l', cls = '' }: { x: number; y: number; w: number; h: number; id: string; tail?: 'l' | 'r'; cls?: string }) {
  const tx = tail === 'l' ? x + 8 : x + w - 8;
  return (
    <g className={cls}>
      <path d={`M${tx} ${y + h}l${tail === 'l' ? -5 : 5} 9l${tail === 'l' ? 11 : -11}-9z`} fill={U(id, 'glass')} stroke={A} strokeOpacity=".5" />
      <rect x={x} y={y} width={w} height={h} rx="8" fill={U(id, 'glass')} stroke={A} strokeOpacity=".7" />
      <path d={`M${x + 9} ${y + h / 2 - 4}h${w - 18}M${x + 9} ${y + h / 2 + 4}h${w - 30}`} stroke={A} strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}
function Bot({ x, y, id, cls = '' }: { x: number; y: number; id: string; cls?: string }) {
  return (
    <g className={cls}>
      <path d={`M${x + 20} ${y - 2}v-8`} stroke={A} strokeWidth="2" /><circle cx={x + 20} cy={y - 12} r="3" fill={G} className="pa-pulse" />
      <rect x={x} y={y} width="40" height="32" rx="10" fill={U(id, 'metal')} stroke={A} strokeOpacity=".8" strokeWidth="1.4" />
      <rect x={x + 5} y={y + 7} width="30" height="16" rx="7" fill={U(id, 'screen')} />
      <circle cx={x + 14} cy={y + 15} r="3" fill={A} /><circle cx={x + 26} cy={y + 15} r="3" fill={A} />
    </g>
  );
}
function Cube({ x, y, s = 22, id }: { x: number; y: number; s?: number; id: string }) {
  const h = s / 2;
  return (
    <g>
      <path d={`M${x} ${y - s}l${s} ${h}v${s}l-${s} ${h}l-${s}-${h}v-${s}z`} fill={U(id, 'metal')} stroke={A} strokeOpacity=".7" />
      <path d={`M${x - s} ${y - h}l${s} ${h}l${s}-${h}M${x} ${y + h}v${s}`} stroke={A} strokeOpacity=".5" fill="none" />
    </g>
  );
}

const scenes: Record<string, (c: Ctx) => ReactNode> = {
  crypto_exchange: ({ id }) => <>
    <Slab x={30} y={34} w={96} h={78} id={id} />
    {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={40 + i * 17} y={96 - (i % 2 ? 36 : 22) - i * 4} width="9" height={(i % 2 ? 36 : 22) + i * 4} rx="2" fill={i % 2 ? P : A} opacity=".8" className="pa-pulse" style={{ animationDelay: `${i * -0.7}s` }} />)}
    <path d="M40 52h76" stroke={A} strokeOpacity=".4" />
    <path d="M138 62h64m0 0-9-8m9 8-9 8" stroke={A} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" className="pa-fl" />
    <path d="M202 96h-64m0 0 9-8m-9 8 9 8" stroke={G} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" className="pa-fl2" />
    <Coin x={170} y={30} id={id} cls="pa-fl2" r={12} /><Coin x={196} y={118} id={id} cls="pa-fl" r={9} />
  </>,
  crypto_payments: ({ id }) => <>
    <Slab x={44} y={22} w={110} h={96} id={id} r={9} />
    <rect x={56} y={34} width="86" height="10" rx="4" fill={A} opacity=".35" />
    <path d="M56 58h54M56 68h38" stroke={A} strokeOpacity=".5" strokeWidth="2.4" strokeLinecap="round" />
    <rect x={56} y={90} width="86" height="18" rx="9" fill={P} stroke={A} strokeOpacity=".6" />
    <path d="M86 99l5 5 10-11" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <g className="pa-fl"><Coin x={182} y={50} id={id} r={15} /></g>
    <path d="M166 62q-4 14-12 22" stroke={A} strokeDasharray="3 5" fill="none" className="lp-flow" />
    <Coin x={200} y={108} id={id} cls="pa-fl2" r={9} />
  </>,
  crypto_engine: ({ id }) => <>
    <ellipse cx="120" cy="104" rx="84" ry="22" fill="none" stroke={A} strokeOpacity=".3" strokeDasharray="3 8" className="lp-flow" />
    <g className="pa-spin" style={{ transformOrigin: '120px 70px' }}>
      <circle cx="120" cy="70" r="40" fill="none" stroke={A} strokeOpacity=".5" strokeWidth="9" strokeDasharray="8 7" />
    </g>
    <circle cx="120" cy="70" r="28" fill={U(id, 'metal')} stroke={A} strokeOpacity=".8" strokeWidth="1.5" />
    <circle cx="120" cy="70" r="12" fill={G} className="pa-pulse" />
    {[[28, 40], [212, 40], [34, 112], [206, 112]].map(([x, y], i) => <g key={i}><path d={`M${x} ${y}L120 70`} stroke={A} strokeOpacity=".45" strokeDasharray="4 6" className="lp-flow" /><rect x={x - 10} y={y - 8} width="20" height="16" rx="4" fill={U(id, 'glass')} stroke={A} strokeOpacity=".7" className="pa-fl2" style={{ animationDelay: `${i * -1.3}s` }} /></g>)}
  </>,
  ios_app: ({ id }) => <>
    <Phone x={54} y={26} id={id} kind="android" cls="pa-fl2" />
    <Phone x={116} y={16} w={46} h={90} id={id} kind="ios" cls="pa-fl" />
    <Coin x={188} y={40} id={id} cls="pa-fl2" r={10} /><ellipse cx="120" cy="124" rx="70" ry="9" fill="rgb(0 0 0/.3)" />
  </>,
  android_app: ({ id }) => <>
    <Phone x={50} y={20} w={46} h={90} id={id} kind="ios" cls="pa-fl2" />
    <Phone x={112} y={28} id={id} kind="android" cls="pa-fl" />
    <Coin x={188} y={44} id={id} cls="pa-fl2" r={10} /><ellipse cx="120" cy="124" rx="70" ry="9" fill="rgb(0 0 0/.3)" />
  </>,
  crypto_card: ({ id }) => <g className="pa-card" style={{ transformOrigin: '120px 75px' }}>
    <rect x={44} y={92} width="152" height="14" rx="7" fill="rgb(0 0 0/.3)" />
    <rect x={40} y={24} width="160" height="92" rx="12" fill={U(id, 'metal')} stroke={A} strokeOpacity=".8" strokeWidth="1.4" />
    <rect x={40} y={24} width="160" height="92" rx="12" fill={U(id, 'sheen')} className="pa-sheen" />
    <text x="54" y="38" fill="#fff" fillOpacity=".9" fontSize="7" fontWeight="600" fontFamily="var(--s-font)" letterSpacing="1">PRIVATE LABEL</text>
    <rect x={54} y={46} width="26" height="20" rx="4" fill={U(id, 'gold')} stroke="#fff" strokeOpacity=".4" />
    <path d="M54 56h26M67 46v20" stroke="#000" strokeOpacity=".3" />
    <path d="M88 52q6 4 0 8M93 49q10 7 0 14" stroke={A} fill="none" strokeLinecap="round" />
    <text x="54" y="92" fill="#fff" fillOpacity=".8" fontSize="9" fontFamily="monospace" letterSpacing="1.5">•••• •••• •••• ••••</text>
    <circle cx="170" cy="38" r="7" fill={G} opacity=".9" /><circle cx="180" cy="38" r="7" fill={P} opacity=".9" />
    <path d="M54 104h34" stroke="#fff" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round" />
  </g>,
  staking: ({ id }) => <>
    {[[70, 108, 4], [120, 108, 6], [170, 108, 3]].map(([x, y, n], k) => <g key={k} className={k === 1 ? 'pa-fl' : 'pa-fl2'} style={{ animationDelay: `${k * -1.5}s` }}>{Array.from({ length: n }, (_, i) => <Coin key={i} x={x} y={y - i * 9} id={id} r={13} />)}</g>)}
    <path d="M40 126h160" stroke={A} strokeOpacity=".4" />
  </>,
  earn: ({ id }) => <>
    <ellipse cx="120" cy="108" rx="66" ry="16" fill="none" stroke={A} strokeOpacity=".4" className="pa-pulse" />
    <ellipse cx="120" cy="108" rx="42" ry="10" fill="none" stroke={A} strokeOpacity=".6" />
    <Coin x={120} y={104} id={id} r={14} />
    <path d="M52 100C84 90 100 62 124 52s50-6 66-22" stroke={A} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="5 8" className="lp-flow" />
    <path d="M178 26h14v14" stroke={G} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Coin x={96} y={60} id={id} cls="pa-fl" r={9} /><Coin x={150} y={42} id={id} cls="pa-fl2" r={7} />
  </>,
  dex: ({ id }) => <>
    <circle cx="82" cy="76" r="40" fill={U(id, 'glass')} stroke={A} strokeOpacity=".7" />
    <circle cx="158" cy="76" r="40" fill={U(id, 'glass')} stroke={P} strokeOpacity=".9" />
    <path d="M120 44a40 40 0 0 1 0 64a40 40 0 0 1 0-64z" fill={G} opacity=".25" className="pa-pulse" />
    <path d="M96 24c14-12 34-12 48 0m0 0-9-1m9 1-2 9M144 128c-14 12-34 12-48 0m0 0 9 1m-9-1 2-9" stroke={A} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" className="pa-fl" />
    <Coin x={74} y={74} id={id} cls="pa-fl2" r={14} /><Coin x={166} y={78} id={id} cls="pa-fl" r={14} />
  </>,
  articles: ({ id }) => <>
    {[0, 1, 2].map((i) => <g key={i} className={i === 1 ? 'pa-fl' : 'pa-fl2'} style={{ animationDelay: `${i * -1.2}s` }}><Slab x={58 + i * 22} y={26 + i * 8} w={78} h={88} id={id} o={0.5 + i * 0.25} />{i === 2 && <><rect x={70 + i * 22} y={40 + i * 8} width="54" height="22" rx="3" fill={P} opacity=".6" /><path d={`M${70 + i * 22} 74h54M${70 + i * 22} 84h54M${70 + i * 22} 94h32`} stroke={A} strokeOpacity=".6" strokeWidth="2.4" strokeLinecap="round" /></>}</g>)}
    <path d="M190 40l12-12 8 8-12 12-10 2z" fill={U(id, 'gold')} stroke={A} className="pa-fl2" />
  </>,
  telegram_bot: ({ id }) => <>
    <Bot x={52} y={58} id={id} cls="pa-fl2" />
    <Bubble x={102} y={26} w={74} h={30} id={id} cls="pa-fl" />
    <Bubble x={118} y={84} w={74} h={28} id={id} tail="r" cls="pa-fl2" />
    <g className="pa-fl"><path d="M196 26l30 -12-6 30-10-8-7 8-1-12z" fill={U(id, 'coin')} stroke={A} strokeLinejoin="round" /><path d="M196 26l23-9" stroke="#fff" /></g>
  </>,
  telegram_mini_app: ({ id }) => <>
    <Phone x={90} y={20} w={52} h={92} id={id} kind="ios" cls="pa-fl" />
    {[[40, 40], [40, 72], [166, 52], [166, 86]].map(([x, y], i) => <g key={i} className="pa-fl2" style={{ animationDelay: `${i * -1.1}s` }}><rect x={x} y={y} width="28" height="24" rx="6" fill={U(id, 'glass')} stroke={A} strokeOpacity=".7" /><circle cx={x + 14} cy={y + 12} r="5" fill={i % 2 ? P : A} opacity=".8" /></g>)}
  </>,
  whatsapp_bot: ({ id }) => <>
    <Phone x={58} y={20} w={46} h={92} id={id} kind="android" cls="pa-fl2" />
    <Bubble x={118} y={30} w={70} h={30} id={id} cls="pa-fl" />
    <Bot x={134} y={78} id={id} cls="pa-fl2" />
    <circle cx="178" cy="22" r="9" fill={P} stroke={A} className="pa-pulse" /><path d="M174 22l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
  </>,
  rpc_nodes: ({ id }) => <>
    {[0, 1, 2].map((i) => <g key={i}><rect x={34} y={30 + i * 28} width="64" height="22" rx="5" fill={U(id, 'metal')} stroke={A} strokeOpacity=".7" /><circle cx={46} cy={41 + i * 28} r="2.6" fill={G} className="pa-pulse" style={{ animationDelay: `${i * -0.9}s` }} /><path d={`M58 ${41 + i * 28}h30`} stroke={A} strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" /></g>)}
    <path d="M98 41C130 41 130 40 152 40M98 69h54M98 97c32 0 34 0 54-3" stroke={A} strokeDasharray="4 6" fill="none" className="lp-flow" />
    {[[158, 38], [190, 62], [166, 96], [212, 100]].map(([x, y], i) => <g key={i} className="pa-fl2" style={{ animationDelay: `${i * -1.4}s` }}><rect x={x - 10} y={y - 10} width="20" height="20" rx="4" fill={U(id, 'glass')} stroke={A} strokeOpacity=".8" /><rect x={x - 4} y={y - 4} width="8" height="8" rx="1.5" fill={i % 2 ? P : G} /></g>)}
    <path d="M168 38L190 62M190 62L166 96M166 96L212 100" stroke={A} strokeOpacity=".4" />
  </>,
  cloud_mining: ({ id }) => <>
    <g className="pa-fl"><path d="M70 74a22 22 0 0 1 8-42a30 30 0 0 1 56-6a26 26 0 0 1 36 24a20 20 0 0 1 0 24z" fill={U(id, 'glass')} stroke={A} strokeOpacity=".8" transform="translate(0 4)" /></g>
    {[78, 110, 142].map((x, i) => <g key={x}><path d={`M${x + 11} 82v22`} stroke={A} strokeDasharray="3 5" className="lp-flow" /><rect x={x} y={104} width="22" height="22" rx="4" fill={U(id, 'metal')} stroke={A} strokeOpacity=".7" /><rect x={x + 6} y={110} width="10" height="10" rx="2" fill={i === 1 ? G : P} className="pa-pulse" style={{ animationDelay: `${i * -0.8}s` }} /></g>)}
    <Coin x={192} y={96} id={id} cls="pa-fl2" r={11} />
  </>,
  kolo: ({ id }) => <>
    <ellipse cx="120" cy="76" rx="84" ry="26" fill="none" stroke={A} strokeOpacity=".35" strokeDasharray="3 8" className="lp-flow" />
    <g className="pa-fl"><path d="M120 18l38 22v44l-38 22-38-22V40z" fill={U(id, 'metal')} stroke={A} strokeOpacity=".8" strokeWidth="1.4" />
      <path d="M120 18v44M82 40l38 22 38-22" stroke={A} strokeOpacity=".5" fill="none" />
      <path d="M110 48v28M110 62l16-14M114 64l14 14" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" /></g>
    <Coin x={42} y={90} id={id} cls="pa-fl2" r={9} /><Coin x={204} y={50} id={id} cls="pa-fl2" r={9} />
  </>,
  crypto_exchange_fallback: () => null,
};

export function ProductArt({ productKey, className = '' }: { productKey: string; className?: string }) {
  const id = 'pa' + useId().replace(/:/g, '');
  const scene = scenes[productKey] ?? scenes.crypto_engine;
  return (
    <div className={`pa ${className}`} aria-hidden="true" data-art={productKey}>
      <svg viewBox="0 0 240 150" className="pa-svg" focusable="false">
        <defs>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c9cfe8" /><stop offset=".3" stopColor={P} /><stop offset=".7" stopColor="#1c2347" /><stop offset="1" stopColor="#8d94b8" /></linearGradient>
          <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={A} stopOpacity=".3" /><stop offset="1" stopColor={P} stopOpacity=".1" /></linearGradient>
          <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1a2150" /><stop offset="1" stopColor="#0d1128" /></linearGradient>
          <linearGradient id={`${id}-coin`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={G} /><stop offset=".6" stopColor={P} /><stop offset="1" stopColor="#222a58" /></linearGradient>
          <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f6e3b0" /><stop offset="1" stopColor="#b48c4c" /></linearGradient>
          <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <radialGradient id={`${id}-halo`}><stop stopColor={G} stopOpacity=".35" /><stop offset="1" stopColor={G} stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="120" cy="82" rx="110" ry="62" fill={U(id, 'halo')} />
        <g className="pa-scene">{scene({ id })}</g>
      </svg>
    </div>
  );
}
