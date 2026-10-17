import type { ReactNode } from 'react';
import type { Mock } from './explore-data';
import '@/styles/explore-scenes.css';

const C = () => <span className="xp-cbadge">Concept</span>;
const g = (r: string[] | undefined, i: number) => r?.[i] ?? '';
const num = (s: string) => { const n = parseFloat(String(s).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };
const WARN = /Pending|Await|Wait|Draft|Review|Sync|Start|Degr|Concept|Queue|Sched|Frozen|Open|Expired/i;
const Pill = ({ t }: { t: string }) => <em className={`xs-pill ${WARN.test(t) ? 'w' : ''}`}>{t}</em>;
const Head = ({ m, t }: { m: Mock; t?: string }) => <div className="xs-head"><b>{t ?? m.title}</b><C /></div>;
const Kpis = ({ m }: { m: Mock }) => <div className="xs-kp">{m.kpis.map(([l, v, d]) => <div key={l}><small>{l} (sample)</small><strong>{v}</strong>{d && <em>{d}</em>}</div>)}</div>;
const Lines = ({ m }: { m: Mock }) => <>{m.phone.items.map(([a, b]) => <div key={a} className="xs-ln"><span>{a}</span><b>{b}</b></div>)}</>;

function Exchange({ m }: { m: Mock }) {
  return <div className="xs xs-ex"><Head m={m} /><Kpis m={m} />
    <div className="xs-g2">
      <div className="xs-box"><h5>Order desk</h5>{m.rows.map((r) => <div key={r[0]} className="xs-ord"><span className="mono">{r[0]}</span><span>{g(r, 1)}</span><b>{g(r, 2)}</b><Pill t={g(r, 3)} /></div>)}</div>
      <div className="xs-box acc"><h5>{m.phone.title}</h5><small>{m.phone.hero[0]}</small><strong className="xs-big">{m.phone.hero[1]}</strong><small>{m.phone.sub}</small><Lines m={m} /><div className="xs-cta">{m.phone.cta}</div></div>
    </div></div>;
}

function Payments({ m }: { m: Mock }) {
  return <div className="xs xs-pay"><Head m={m} />
    <div className="xs-g2">
      <div className="xs-box acc"><h5>Hosted checkout</h5><small>{m.phone.hero[0]}</small><strong className="xs-big">{m.phone.hero[1]}</strong><small>{m.phone.sub}</small><Lines m={m} /><div className="xs-cta">{m.phone.cta}</div></div>
      <div className="xs-receipt"><h5>Receipts</h5>{m.rows.map((r) => <div key={r[0]} className="xs-rl"><span className="mono">{r[0]}</span><span>{g(r, 1)}</span><b>{g(r, 2)}</b><Pill t={g(r, 3)} /></div>)}<i className="xs-tear" /></div>
    </div><Kpis m={m} /></div>;
}

function Engine({ m }: { m: Mock }) {
  return <div className="xs xs-eng"><Head m={m} />
    <div className="xs-lanes">{m.rows.map((r) => <div key={r[0]} className="xs-lane">
      <b>{r[0]}</b>
      <div className="xs-route">{g(r, 1).split('>').map((x, i, a) => <span key={i} className="xs-node">{x.trim()}{i < a.length - 1 && <i>›</i>}</span>)}</div>
      <div className="xs-lat"><i style={{ width: `${Math.min(100, num(g(r, 2)) / 2.4)}%` }} /></div><small>{g(r, 2)}</small><Pill t={g(r, 3)} />
    </div>)}</div><Kpis m={m} /></div>;
}

function Staking({ m }: { m: Mock }) {
  return <div className="xs xs-stk"><Head m={m} />
    <div className="xs-g2">
      <div className="xs-ringbox"><div className="xs-ring" style={{ ['--p' as string]: '64%' }}><div><small>{m.kpis[1]?.[0]}</small><strong>{m.kpis[1]?.[1]}</strong></div></div><small>{m.kpis[0]?.[0]}: {m.kpis[0]?.[1]}</small></div>
      <div className="xs-box"><h5>Validators and locks</h5>{m.rows.map((r) => <div key={r[0]} className="xs-val"><b>{r[0]}</b><span>{g(r, 1)}</span><strong>{g(r, 2)}</strong><div className="xs-lock"><i style={{ width: `${Math.max(10, 100 - num(g(r, 3)) * 2)}%` }} /></div><small>{g(r, 3)}</small></div>)}</div>
    </div>
    <div className="xs-note">Risk notice shown before any commitment. Rates are sample figures.</div></div>;
}

function Earn({ m }: { m: Mock }) {
  const max = Math.max(1, ...m.rows.map((r) => num(g(r, 3))));
  return <div className="xs xs-earn"><Head m={m} />
    <div className="xs-ladder">{m.rows.map((r) => <div key={r[0]} className="xs-step"><div className="xs-bar" style={{ width: `${Math.max(24, (num(g(r, 3)) / max) * 100)}%` }}><b>{r[0]}</b><span>{g(r, 3)}</span></div><div className="xs-rate"><strong>{g(r, 2)}</strong><small>{g(r, 1)}</small></div></div>)}</div>
    <div className="xs-tl">{m.rows.map((r) => <span key={r[0]}><i />{g(r, 1)}</span>)}</div><Kpis m={m} /></div>;
}

function Dex({ m }: { m: Mock }) {
  const rev = [...m.bars].reverse();
  return <div className="xs xs-dex"><Head m={m} />
    <div className="xs-g3">
      <div className="xs-box acc"><h5>{m.phone.title}</h5><div className="xs-pair"><small>{m.phone.hero[0]}</small><strong>{m.phone.hero[1]}</strong></div><div className="xs-flip">&#8645;</div><div className="xs-pair"><small>To</small><strong>{m.phone.sub}</strong></div><Lines m={m} /><div className="xs-cta">{m.phone.cta}</div></div>
      <div className="xs-box"><h5>Depth</h5><div className="xs-depth">{rev.map((b, i) => <i key={`a${i}`} className="a" style={{ height: `${b}%` }} />)}{m.bars.map((b, i) => <i key={`b${i}`} className="b" style={{ height: `${b}%` }} />)}</div><Kpis m={m} /></div>
      <div className="xs-box"><h5>Pools</h5>{m.rows.map((r) => <div key={r[0]} className="xs-pool"><b>{r[0]}</b><span>{g(r, 1)}</span><strong>{g(r, 2)}</strong></div>)}</div>
    </div></div>;
}

function Native({ m, os }: { m: Mock; os: 'ios' | 'android' }) {
  return <div className={`xs xs-nat ${os}`}><Head m={m} />
    <div className="xs-natgrid">
      <div className={`xs-os ${os}`}>
        <div className="xs-status"><span>9:41</span>{os === 'ios' ? <i className="isl" /> : <i className="punch" />}<span>{os === 'ios' ? '5G' : 'LTE'}</span></div>
        <small>{m.phone.title}</small><div className="xs-ph-bal"><small>{m.phone.hero[0]}</small><strong>{m.phone.hero[1]}</strong><small>{m.phone.sub}</small></div>
        {m.phone.items.map(([a, b]) => <div key={a} className="xs-ln"><span>{a}</span><b>{b}</b></div>)}
        <div className={`xs-cta ${os === 'android' ? 'pill' : ''}`}>{m.phone.cta}</div>
        <div className="xs-navbar">{os === 'ios' ? <i className="home" /> : <><i /><i /><i /></>}</div>
      </div>
      <div className="xs-box"><h5>{os === 'ios' ? 'Release screens' : 'Layouts by form factor'}</h5>{m.rows.map((r) => <div key={r[0]} className="xs-chk"><span>{r[0]}</span><small>{g(r, 1)}</small><Pill t={g(r, 3)} /></div>)}<Kpis m={m} /></div>
    </div></div>;
}

function Bot({ m }: { m: Mock }) {
  return <div className="xs xs-tg"><Head m={m} />
    <div className="xs-chat"><div className="xs-chath"><i />{m.phone.title}<small>bot</small></div>
      <div className="xs-b out">{g(m.rows[0], 0)}</div>
      <div className="xs-b in"><b>{m.phone.hero[0]}</b> {m.phone.hero[1]}<small>{m.phone.sub}</small></div>
      <div className="xs-kbd">{m.rows.map((r) => <span key={r[0]}>{r[0]}</span>)}{m.phone.items.map(([a]) => <span key={a} className="alt">{a}</span>)}</div>
      <div className="xs-b out">{m.phone.cta}</div></div>
    <div className="xs-box"><h5>Flow map</h5>{m.rows.map((r) => <div key={r[0]} className="xs-chk"><span className="mono">{r[0]}</span><small>{g(r, 1)} to {g(r, 2)}</small><Pill t={g(r, 3)} /></div>)}</div></div>;
}

function Mini({ m }: { m: Mock }) {
  return <div className="xs xs-mini"><Head m={m} />
    <div className="xs-minigrid">
      <div className="xs-dim"><div className="xs-b in">{m.story}</div><div className="xs-b in">Menu button</div></div>
      <div className="xs-sheet"><div className="xs-sheeth"><span>Close</span><b>{m.phone.title}</b><span>&#8942;</span></div>
        <div className="xs-ph-bal"><small>{m.phone.hero[0]}</small><strong>{m.phone.hero[1]}</strong><small>{m.phone.sub}</small></div>
        <div className="xs-tiles">{m.phone.items.map(([a, b]) => <div key={a}><b>{a}</b><small>{b}</small></div>)}</div>
        <div className="xs-cta">{m.phone.cta}</div>
        <div className="xs-tabs">{m.nav.map((n, i) => <span key={n} className={i === 0 ? 'on' : ''}>{n}</span>)}</div></div>
    </div></div>;
}

function Whats({ m }: { m: Mock }) {
  return <div className="xs xs-wa"><Head m={m} />
    <div className="xs-g2">
      <div className="xs-chat wa"><div className="xs-chath"><i />{m.phone.title}<small>business</small></div>
        <div className="xs-b in tpl"><b>{m.phone.hero[0]}</b><strong>{m.phone.hero[1]}</strong><small>{m.phone.sub}</small><div className="xs-link">{m.phone.cta}</div></div>
        <div className="xs-qr">{m.phone.items.map(([a]) => <span key={a}>{a}</span>)}</div>
        <div className="xs-b out">{m.phone.items[0]?.[0]}<small>Read</small></div></div>
      <div className="xs-box"><h5>Templates and consent</h5>{m.rows.map((r) => <div key={r[0]} className="xs-chk"><span>{r[0]}</span><small>{g(r, 1)}</small><Pill t={g(r, 3)} /></div>)}</div>
    </div></div>;
}

function Article({ m }: { m: Mock }) {
  const r = m.rows[0];
  return <div className="xs xs-art"><Head m={m} />
    <div className="xs-artgrid"><article><small className="mono">{m.phone.title} / {g(r, 3)}</small><h3>{g(r, 0)}</h3><p className="by">By {g(r, 1)}, {g(r, 2)}</p><p className="dc">{m.story} Body copy continues in the editor. Sample text only.</p></article>
      <aside><h5>Publishing queue</h5>{m.rows.map((x) => <div key={x[0]} className="xs-chk"><span>{x[0]}</span><small>{g(x, 2)}</small><Pill t={g(x, 3)} /></div>)}<Kpis m={m} /></aside></div></div>;
}

function Nodes({ m }: { m: Mock }) {
  return <div className="xs xs-nodes"><Head m={m} /><div className="xs-gw"><b>Gateway</b><small>Credentials held by Super Admin</small></div>
    <div className="xs-eps">{m.rows.map((r, n) => <div key={r[0]} className="xs-ep"><div className="xs-epH"><i className={WARN.test(g(r, 3)) ? 'w' : ''} /><b>{r[0]}</b></div><small>{g(r, 1)}</small><strong>{g(r, 2)}</strong>
      <div className="xs-spark">{m.bars.slice(n, n + 8).concat(m.bars).slice(0, 8).map((b, i) => <i key={i} style={{ height: `${b}%` }} />)}</div><Pill t={g(r, 3)} /></div>)}</div><Kpis m={m} /></div>;
}

function Mining({ m }: { m: Mock }) {
  return <div className="xs xs-min"><Head m={m} />
    <div className="xs-g2">
      <div className="xs-rack">{m.rows.map((r) => <div key={r[0]} className="xs-unit"><i className={WARN.test(g(r, 3)) ? 'w' : ''} /><b>{r[0]}</b><span>{g(r, 1)}</span><div className="xs-hash"><i style={{ width: `${Math.min(100, num(g(r, 2)) / 2.4)}%` }} /></div><small>{g(r, 2)}</small><Pill t={g(r, 3)} /></div>)}</div>
      <div className="xs-box acc"><h5>{m.kpis[0]?.[0]}</h5><strong className="xs-big">{m.kpis[0]?.[1]}</strong><div className="xs-depth out">{m.bars.map((b, i) => <i key={i} className="b" style={{ height: `${b}%` }} />)}</div><small>Concept metrics only. Disclosure shown before purchase.</small></div>
    </div><Kpis m={m} /></div>;
}

function Kolo({ m }: { m: Mock }) {
  return <div className="xs xs-kolo"><Head m={m} />
    <div className="xs-orbit"><div className="xs-core"><b>{m.phone.title}</b><strong>{m.phone.hero[1]}</strong><small>{m.phone.sub}</small></div>
      {m.rows.map((r) => <div key={r[0]} className="xs-mod"><b>{r[0]}</b><small>{g(r, 1)}</small><Pill t={g(r, 3)} /></div>)}</div><Kpis m={m} /></div>;
}

export function ProductScene({ k, m, fallback }: { k: string; m: Mock; fallback: ReactNode }) {
  switch (k) {
    case 'crypto_exchange': return <Exchange m={m} />;
    case 'crypto_payments': return <Payments m={m} />;
    case 'crypto_engine': return <Engine m={m} />;
    case 'staking': return <Staking m={m} />;
    case 'earn': return <Earn m={m} />;
    case 'dex': return <Dex m={m} />;
    case 'ios_app': return <Native m={m} os="ios" />;
    case 'android_app': return <Native m={m} os="android" />;
    case 'telegram_bot': return <Bot m={m} />;
    case 'telegram_mini_app': return <Mini m={m} />;
    case 'whatsapp_bot': return <Whats m={m} />;
    case 'articles': return <Article m={m} />;
    case 'rpc_nodes': return <Nodes m={m} />;
    case 'cloud_mining': return <Mining m={m} />;
    case 'kolo': return <Kolo m={m} />;
    default: return <>{fallback}</>;
  }
}
