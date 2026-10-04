import type { ReactNode } from 'react';
import { L, Win } from './showcase-frame';
import { Coin, Device } from './showcase-art';
import { Logo, QXMark } from './showcase-brand';
import { Bar, Btn, Chart, Chips, Cn, Kpis, Kv, St, Tr } from './showcase-ui';

const Sb = () => <div className="sx-sb"><b>9:41</b><span>5G 100%</span></div>;
const Asset = ({ c, a, v, d }: { c: 'BTC' | 'ETH' | 'USDT' | 'SOL'; a: string; v: string; d: string }) => (
  <div className="ph-asset"><Coin c={c} size={2} /><span><b>{c}</b><small>{a}</small></span><span className="r"><b>{v}</b><small className={d.startsWith('-') ? 'dn' : 'up'}>{d}</small></span></div>
);
const Tab = ({ items, on }: { items: string[]; on: number }) => <div className="ph-tab">{items.map((t, i) => <span key={t} className={i === on ? 'on' : ''}><i />{t}</span>)}</div>;

const IosWallet = () => <>
  <Sb />
  <div className="ph-top"><Logo s={1.7} /><span className="ph-av">MV</span></div>
  <div className="ph-bal"><small>Total balance</small><strong>$18,432.52</strong><em>+2.4% today / demo</em><Chart a={[30, 38, 34, 50, 46, 62, 58, 74]} h={3.2} /></div>
  <div className="ph-acts">{['Send', 'Receive', 'Swap', 'Buy'].map((t) => <span key={t}><i />{t}</span>)}</div>
  <Asset c="BTC" a="0.0842 BTC" v="$5,716.40" d="+1.8%" /><Asset c="ETH" a="1.62 ETH" v="$5,390.12" d="+3.2%" /><Asset c="USDT" a="4,120.00" v="$4,120.00" d="+0.0%" /><Asset c="SOL" a="18.4 SOL" v="$3,206.00" d="-0.7%" />
  <div style={{ flex: 1 }} /><Tab items={['Home', 'Markets', 'Swap', 'Card', 'Me']} on={0} />
</>;
const IosMarkets = () => <>
  <Sb /><div className="ph-top"><Logo s={1.7} /><small>Markets</small></div>
  <Chips items={['Favorites', 'Gainers', 'Volume']} />
  <Asset c="BTC" a="Bitcoin" v="$67,880" d="+1.8%" /><Asset c="ETH" a="Ethereum" v="$3,327" d="+3.2%" /><Asset c="SOL" a="Solana" v="$174.24" d="-0.7%" /><Asset c="USDT" a="Tether" v="$1.00" d="+0.0%" />
  <Chart a={[40, 52, 46, 60, 54, 70, 66]} h={4} />
  <div style={{ flex: 1 }} /><Tab items={['Home', 'Markets', 'Swap', 'Card', 'Me']} on={1} />
</>;
const DroidHome = () => <>
  <div className="and-sb"><b>9:41</b><span>5G</span></div>
  <div className="and-bar"><Logo s={1.7} /><span className="ph-av">MV</span></div>
  <div className="and-card"><small>Portfolio value</small><strong>$18,432.52</strong><em>Demo / sandbox account</em></div>
  <div className="and-chips">{['Send', 'Receive', 'Swap', 'Earn'].map((t, i) => <span key={t} className={i === 2 ? 'on' : ''}>{t}</span>)}</div>
  <small className="and-h">Recent activity</small>
  <div className="and-tx"><Coin c="BTC" size={1.8} /><span><b>Received BTC</b><small>Today, 08:14</small></span><b className="up">+0.0120</b></div>
  <div className="and-tx"><Coin c="USDT" size={1.8} /><span><b>Swapped to ETH</b><small>Yesterday</small></span><b>-640.00</b></div>
  <div className="and-tx"><Coin c="SOL" size={1.8} /><span><b>Earn payout</b><small>Mon</small></span><b className="up">+0.42</b></div>
  <div style={{ flex: 1 }} />
  <div className="and-nav">{['Home', 'Assets', 'Swap', 'Card'].map((t, i) => <span key={t} className={i === 0 ? 'on' : ''}><i />{t}</span>)}</div>
</>;
const DroidSwap = () => <>
  <div className="and-sb"><b>9:41</b><span>5G</span></div>
  <div className="and-bar"><Logo s={1.7} /><small>Swap</small></div>
  <div className="and-card flat"><small>You pay</small><strong>250.00</strong><span><Cn c="USDT" /></span></div>
  <div className="and-card flat"><small>You get (est.)</small><strong>0.0753</strong><span><Cn c="ETH" /></span></div>
  <Kv k="Rate" v="1 ETH = 3,327 USDT" /><Kv k="Network fee" v="$1.12" />
  <div style={{ flex: 1 }} /><div className="and-fab">Confirm swap</div>
</>;
const TgChat = ({ mini }: { mini?: boolean }) => <>
  <div className="tg-top"><Sb /><div className="tg-h"><span>&lsaquo;</span><QXMark s={2.2} /><div><b>QXLayer Bot</b><small>bot</small></div></div></div>
  <div className="tg-body">
    <div className="tg-b in">Welcome to QXLayer. Pick a service to continue.<time>10:02</time></div>
    <div className="tg-kb"><span>Exchange</span><span>Payment link</span><span>Wallet</span><span>Support</span></div>
    <div className="tg-b out">Exchange<time>10:03 read</time></div>
    <div className="tg-b in">Quote (demo)<br />0.0842 BTC to 1.7186 ETH<br />Network: Bitcoin to Ethereum<br />Rate locked for 02:00<time>10:03</time></div>
    <div className="tg-kb two"><span>Confirm</span><span>Cancel</span></div>
    {mini ? <div className="tg-kb"><span className="web">Open QXLayer Wallet</span></div> : <div className="tg-b in">Order QX-48213 created. Awaiting deposit (sandbox).<time>10:04</time></div>}
  </div>
  <div className="tg-in"><span>Message</span><i /></div>
</>;
const TgMini = () => <>
  <div className="tgm-top"><Sb /><div className="tgm-h"><b>Close</b><Logo s={1.6} /><b>&hellip;</b></div></div>
  <div className="tgm-body">
    <div className="ph-bal"><small>Wallet balance</small><strong>$6,204.18</strong><em>Mini App / demo</em></div>
    <div className="ph-acts">{['Swap', 'Pay', 'Earn', 'Card'].map((t) => <span key={t}><i />{t}</span>)}</div>
    <div className="sx-fld"><div><small>Swap</small><strong>120.00</strong></div><Cn c="USDT" /></div>
    <div className="sx-fld"><div><small>Receive</small><strong>0.0361</strong></div><Cn c="ETH" /></div>
    <Asset c="SOL" a="Earn 5.6%" v="$1,287" d="+0.9%" />
    <div style={{ flex: 1 }} /><div className="sx-btn">Confirm swap</div>
  </div>
</>;
const WaChat = () => <>
  <div className="wa-top"><Sb /><div className="wa-h"><span>&lsaquo;</span><QXMark s={2.2} /><div><b>QXLayer Pay</b><small>Business account</small></div></div></div>
  <div className="wa-body">
    <div className="wa-day">Today</div>
    <div className="wa-b in">Hi Mira, your payment link is ready.<time>09:12</time></div>
    <div className="wa-b in card"><b>Invoice INV-2048 (demo)</b>Amount: 49.00 USDC<br />Network: Ethereum<br />Status: Awaiting payment<div className="wa-act">Open payment page</div><time>09:12</time></div>
    <div className="wa-b out">How long do I have?<time>09:13 read</time></div>
    <div className="wa-b in">The quote holds for 15 minutes. I will message you when it confirms.<time>09:13</time></div>
    <div className="wa-qr"><span>Paid</span><span>Need help</span><span>Status</span></div>
    <div className="wa-b in ok">Payment confirmed. Receipt QX-R-3391 sent.<time>09:21</time></div>
  </div>
  <div className="wa-in"><span>Type a message</span></div>
</>;

const Phone = ({ children, droid, skin }: { children: ReactNode; droid?: boolean; skin?: 'tg' | 'wa' | 'tgm' }) => <Device droid={droid} skin={skin}>{children}</Device>;

export const phoneScenes: Record<string, () => ReactNode> = {
  ios_app: () => <>
    <L x={7} y={14} w={20} d={10} z={1} fl={2}><Phone><IosMarkets /></Phone></L>
    <L x={30} y={9} w={23} d={22} z={3} fl={1} m="n"><Phone><IosWallet /></Phone></L>
    <L x={58} y={14} w={38} d={14} z={2} fl={2}><Win title="Confirm swap" ><Kv k="You pay" v="0.0842 BTC" /><Kv k="You receive" v="1.7186 ETH" /><Kv k="Fee" v="$13.72" /><Kv k="Face ID" v="Required" /><Btn t="Confirm with Face ID" /></Win></L>
    <L x={58} y={64} w={38} d={10} z={2} fl={1}><div className="sx-glassnote wide"><QXMark s={2.4} /><span><b>QXLayer for iPhone</b><small>Wallet, markets and swaps. Demo screens.</small></span></div></L>
  </>,
  android_app: () => <>
    <L x={36} y={9} w={23} d={22} z={3} fl={1} m="n"><Phone droid><DroidHome /></Phone></L>
    <L x={9} y={15} w={21} d={10} z={1} fl={2}><Phone droid><DroidSwap /></Phone></L>
    <L x={64} y={12} w={33} d={14} z={2} fl={2}><Win title="Notifications"><div className="and-note"><QXMark s={1.8} /><span><b>Payment received</b><small>+0.0120 BTC credited / demo</small></span></div><div className="and-note"><QXMark s={1.8} /><span><b>Price alert</b><small>ETH crossed $3,300</small></span></div><div className="and-note"><QXMark s={1.8} /><span><b>Earn payout</b><small>+0.42 SOL</small></span></div></Win></L>
    <L x={64} y={66} w={33} d={10} z={2} fl={1}><div className="sx-glassnote wide"><QXMark s={2.4} /><span><b>QXLayer for Android</b><small>Material layout. Demo screens.</small></span></div></L>
  </>,
  telegram_bot: () => <>
    <L x={2} y={10} w={52} d={6} z={1}><div className="tgd">
      <div className="tgd-side"><div className="tgd-s">Search</div>
        {([['QXLayer Bot', 'Order QX-48213 created', '10:04'], ['Saved Messages', 'Rates sheet', '09:40'], ['Ops channel', 'Daily summary ready', 'Mon']] as const).map(([n, m, t], i) => <div key={n} className={`tgd-c ${i === 0 ? 'on' : ''}`}>{i === 0 ? <QXMark s={2.4} /> : <span className="ph-av">{n[0]}</span>}<span><b>{n}</b><small>{m}</small></span><time>{t}</time></div>)}
      </div>
      <div className="tgd-main"><div className="tgd-h"><QXMark s={2} /><b>QXLayer Bot</b><small>bot</small></div>
        <div className="tg-b in">/start<time>10:01</time></div>
        <div className="tg-b in">Welcome to QXLayer. Exchange, pay links and wallet in one chat.<time>10:02</time></div>
        <div className="tg-kb"><span>Exchange</span><span>Payment link</span><span>Wallet</span></div>
      </div></div></L>
    <L x={58} y={8} w={23} d={22} z={3} fl={1} m="n"><Phone skin="tg"><TgChat /></Phone></L>
    <L x={80} y={50} w={18} d={12} z={4} fl={2}><Win title="Bot commands"><Kv k="/start" v="Menu" /><Kv k="/swap" v="Quote" /><Kv k="/pay" v="Link" /></Win></L>
    <L x={6} y={66} w={46} d={8} z={2}><div className="sx-glassnote wide"><QXMark s={2.4} /><span><b>QXLayer Bot flow</b><small>Start, select, confirm. Sandbox conversation.</small></span><Chips items={['Start', 'Select', 'Confirm']} on={1} /></div></L>
  </>,
  telegram_mini_app: () => <>
    <L x={8} y={13} w={21} d={10} z={1} fl={2}><Phone skin="tg"><TgChat mini /></Phone></L>
    <L x={34} y={8} w={23} d={22} z={3} fl={1} m="n"><Phone skin="tgm"><TgMini /></Phone></L>
    <L x={62} y={12} w={35} d={14} z={2} fl={2}><Win title="Mini App widgets">
      <div className="sx-two"><div className="sx-kpi"><small>Rewards</small><strong>148 pts</strong></div><div className="sx-kpi"><small>Streak</small><strong>6 days</strong></div></div>
      <Tr cols="1fr 5em" c={[<><Cn c="USDT" />to<Cn c="ETH" /></>, '$120.00']} /><Bar p={62} />
    </Win></L>
    <L x={62} y={62} w={35} d={10} z={2} fl={1}><div className="sx-glassnote wide"><QXMark s={2.4} /><span><b>QXLayer Mini App</b><small>Opens inside the chat. Demo screens.</small></span></div></L>
  </>,
  whatsapp_bot: () => <>
    <L x={6} y={8} w={23} d={22} z={3} fl={1} m="n"><Phone droid skin="wa"><WaChat /></Phone></L>
    <L x={33} y={11} w={64} d={8} z={2}><Win title="Automation flow">
      <div className="sx-flow">{['Trigger: order created', 'Verify identity', 'Quote + payment link', 'Confirm receipt'].map((t, i) => <div key={t}><b>{i + 1}</b><span>{t}</span></div>)}</div>
      <Kpis items={[['Conversations', '2,184', '+9.1%'], ['Auto-resolved', '81.6%'], ['Median reply', '4 s']]} />
      <Chart a={[30, 42, 38, 54, 50, 66, 62, 78]} h={5} />
    </Win></L>
    <L x={33} y={68} w={34} d={12} z={3} fl={2}><Win title="Message templates"><Tr cols="1fr 5em" c={['Payment link', <St t="Approved" />]} /><Tr cols="1fr 5em" c={['Order receipt', <St t="Approved" />]} /><Tr cols="1fr 5em" c={['Rate alert', <St t="Review" k="wait" />]} /></Win></L>
    <L x={70} y={68} w={27} d={10} z={2} fl={1}><Win title="Quick replies"><Chips items={['Paid', 'Need help', 'Status']} on={0} /></Win></L>
  </>,
};
