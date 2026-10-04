import type { ReactNode } from 'react';
import { ShowcaseFrame, L, Win, Row, Tiles, Bars, Field, Btn, Chips, Side } from './showcase-frame';
import { Coin, CoinRow, CoinStack, Orb, CardRender, Device, Core, Rack, Cube, Area } from './showcase-art';

const Brand = ({ t }: { t: string }) => <div className="sc-brand"><span>Your Brand</span><span>{t}</span></div>;
const Wallet = () => <>
  <Brand t="Wallet" />
  <div className="sc-hero"><small>Total balance</small><strong>-- --</strong></div>
  <CoinRow c="BTC" n="BTC" /><CoinRow c="ETH" n="ETH" /><CoinRow c="USDT" n="USDT" /><CoinRow c="SOL" n="SOL" />
  <div style={{ flex: 1 }} /><Btn t="Exchange" />
</>;
const Chat = ({ title }: { title: string }) => <>
  <Brand t={title} />
  <div className="sc-bubble">Welcome. Choose a service to continue.</div>
  <div className="sc-bubble me">Exchange</div>
  <div className="sc-bubble">Select an asset and network. Rates appear here when live.</div>
  <Chips items={['BTC', 'ETH', 'USDC', 'Menu']} on={0} />
  <div className="sc-bubble me">Payment link</div>
  <div className="sc-bubble">Amount: -- Status: Planned</div>
  <div style={{ flex: 1 }} /><Field a="Message" b="" />
</>;
const Lines = ({ pts }: { pts: [number, number][] }) => <svg className="sc-svg" viewBox="0 0 600 500" style={{ position: 'absolute', inset: 0 }}>{pts.map(([x, y], i) => <line key={i} className="sc-dash" x1={x} y1={y} x2="300" y2="250" stroke="var(--s-accent)" strokeOpacity=".6" strokeWidth="1.5" />)}</svg>;

export const scenes: Record<string, () => ReactNode> = {
  crypto_exchange: () => <>
    <L x={30} y={10} w={66} d={6}><Win title="Client admin dashboard"><div className="sc-split"><Side /><div style={{ display: 'grid', gap: '.6em' }}><Tiles items={['Orders', 'Assets', 'Networks']} /><Area pts={[30, 45, 38, 62, 55, 80, 70]} /></div></div></Win></L>
    <L x={4} y={24} w={36} d={18} z={4} fl={1}><Win title="Exchange widget"><Field a="You send" b="-- BTC" /><div className="sc-swap">&#8645;</div><Field a="You receive" b="-- ETH" /><Chips items={['Network A', 'Network B']} /><Btn t="Exchange" /></Win></L>
    <L x={58} y={52} w={38} d={14} z={3} fl={2}><Win title="Orders"><Row a="Order #----" /><Row a="Order #----" b="Sandbox" /><Row a="Order #----" /></Win></L>
    <L x={38} y={68} w={30} d={22} z={5} fl={1}><Win title="Assets and networks"><CoinStack items={['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'BNB']} /></Win></L>
    <L x={4} y={72} w={28} d={10} z={2} fl={2}><Win title="Payment methods"><Row a="Method A" b="Off" /><Row a="Method B" b="On" /></Win></L>
  </>,
  crypto_payments: () => <>
    <L x={5} y={10} w={62} d={6}><Win title="Merchant dashboard"><div className="sc-split"><Side /><div style={{ display: 'grid', gap: '.6em' }}><Tiles items={['Volume', 'Orders', 'Links']} /><Area pts={[40, 35, 60, 55, 75, 62, 90]} /><Row a="Order #----" /></div></div></Win></L>
    <L x={58} y={20} w={38} d={18} z={4} fl={1}><Win title="Hosted checkout"><Field a="Amount" b="-- --" /><div className="sc-pay"><Coin c="USDC" size={2} /><Coin c="USDT" size={2} /><Coin c="BTC" size={2} /><Coin c="ETH" size={2} /></div><Field a="Network" b="Network A" /><Btn t="Pay" /></Win></L>
    <L x={6} y={62} w={36} d={14} z={3} fl={2}><Win title="Payment link"><div className="sc-link"><span>pay.yourbrand/--</span><em>Copy</em></div><Row a="Link name" b="Draft" /></Win></L>
    <L x={48} y={70} w={46} d={10} z={2} fl={2}><Win title="Analytics (schematic)"><Bars h={[20, 45, 35, 65, 50, 80]} /></Win></L>
  </>,
  crypto_card: () => <>
    <L x={22} y={8} w={64} d={22} z={4} fl={1}><CardRender /></L>
    <L x={3} y={50} w={46} d={10} z={2} fl={2}><Win title="Card management"><Field a="Card status" b="Preview" /><Field a="Limits" b="--" /><div className="sc-row2"><span>Freeze card</span><em>Off</em></div></Win></L>
    <L x={52} y={58} w={44} d={14} z={3} fl={2}><Win title="Activity"><Row a="Merchant" b="--" /><Row a="Merchant" b="--" /><Row a="Merchant" b="--" /></Win></L>
  </>,
  ios_app: () => <>
    <L x={8} y={14} w={28} d={10} z={1} fl={2}><Device droid><Chat title="Markets" /></Device></L>
    <L x={34} y={4} w={32} d={22} z={3} fl={1}><Device><Wallet /></Device></L>
    <L x={66} y={22} w={28} d={14} z={2} fl={2}><Win title="Branded app"><Chips items={['Your logo', 'Your colors']} /><Btn t="Install" /></Win></L>
  </>,
  android_app: () => <>
    <L x={6} y={6} w={33} d={20} z={3} fl={1}><Device droid><Wallet /></Device></L>
    <L x={38} y={16} w={28} d={10} z={1} fl={2}><Device><Chat title="Markets" /></Device></L>
    <L x={66} y={46} w={30} d={14} z={4} fl={2}><Win title="Branded app"><Chips items={['Your logo', 'Your colors']} /><Btn t="Install" /></Win></L>
  </>,
  telegram_bot: () => <>
    <L x={30} y={4} w={38} d={18} z={3} fl={1}><Device><Chat title="Bot" /></Device></L>
    <L x={3} y={30} w={30} d={8} z={1} fl={2}><Win title="Bot menu"><Row a="Exchange" b="/start" /><Row a="Payments" b="/pay" /><Row a="Support" b="/help" /></Win></L>
    <L x={68} y={52} w={30} d={12} z={2} fl={2}><Win title="Conversation flow"><Chips items={['Start', 'Select', 'Confirm']} on={1} /></Win></L>
  </>,
  whatsapp_bot: () => <>
    <L x={30} y={4} w={38} d={18} z={3} fl={1}><Device droid><Chat title="Business chat" /></Device></L>
    <L x={3} y={34} w={30} d={8} z={1} fl={2}><Win title="Quick replies"><Chips items={['Exchange', 'Payments', 'Help']} on={0} /></Win></L>
    <L x={68} y={50} w={30} d={12} z={2} fl={2}><Win title="Message templates"><Row a="Template A" b="Draft" /><Row a="Template B" b="Draft" /></Win></L>
  </>,
  crypto_engine: () => <>
    <Lines pts={[[110, 90], [490, 90], [90, 250], [510, 250], [130, 410], [470, 410]]} />
    <L x={34} y={30} w={32} d={20} z={4} fl={1}><Core /></L>
    {([['Exchange', 5, 8], ['Payments', 69, 8], ['Wallets', 2, 40], ['APIs', 72, 40], ['Providers', 7, 74], ['Nodes', 67, 74]] as [string, number, number][]).map(([t, x, y], i) => <L key={t} x={x} y={y} w={26} d={8 + i} fl={i % 2 ? 2 : undefined}><Win title={t}><Row a="Module" b="Plan" /></Win></L>)}
  </>,
  rpc_nodes: () => <>
    <svg className="sc-svg" viewBox="0 0 600 500" style={{ position: 'absolute', inset: 0 }}><path className="sc-dash" d="M230 150C330 150 330 250 410 250M230 250C330 250 330 250 410 250M230 350C330 350 330 250 410 250" fill="none" stroke="var(--s-accent)" strokeWidth="1.5" /></svg>
    <L x={4} y={14} w={20} d={10} z={2} fl={1}><Rack label="Node rack" rows={6} /></L>
    <L x={26} y={20} w={20} d={14} z={2} fl={2}><Rack label="Chain nodes" rows={5} /></L>
    <L x={60} y={12} w={36} d={18} z={3} fl={2}><Win title="Endpoint console"><Field a="Network" b="Network A" /><Field a="Endpoint" b="https://----" /><Tiles items={['Latency', 'Uptime']} /></Win></L>
    <L x={58} y={62} w={14} d={8} z={2} fl={1}><Cube s={5} /></L>
    <L x={78} y={66} w={14} d={8} z={2} fl={2}><Cube s={4} /></L>
    <L x={8} y={70} w={40} d={8} z={2}><Win title="Chain nodes"><Chips items={['Network A', 'Network B', 'Network C']} on={0} /></Win></L>
  </>,
  staking: () => <>
    <L x={4} y={12} w={58} d={8} z={2}><Win title="Staking"><Tiles items={['Staked', 'Rewards', 'Period']} /><Area pts={[20, 30, 42, 55, 68, 82]} /><Row a="SOL pool" b="Preview" /><Row a="ETH pool" b="Preview" /></Win></L>
    <L x={58} y={28} w={38} d={20} z={4} fl={1}><Win title="Stake"><Field a="Amount" b="-- SOL" /><Chips items={['Flexible', 'Locked']} /><Btn t="Stake" /></Win></L>
    <L x={16} y={68} w={50} d={12} z={3} fl={2}><div className="sc-coins"><Coin c="SOL" size={4} /><Coin c="ETH" size={4} /><Coin c="BNB" size={4} /></div></L>
  </>,
  earn: () => <>
    <L x={3} y={12} w={52} d={8} z={2}><Win title="Earn products"><CoinRow c="USDC" n="USDC" /><CoinRow c="USDT" n="USDT" /><CoinRow c="BTC" n="BTC" /></Win></L>
    <L x={52} y={20} w={44} d={18} z={4} fl={1}><Win title="Yield overview (schematic)"><Area pts={[25, 38, 50, 62, 78, 92]} /><Tiles items={['Deposited', 'Accrued']} /></Win></L>
    <L x={16} y={62} w={42} d={12} z={3} fl={2}><Win title="Deposit"><Field a="Amount" b="-- USDC" /><Btn t="Deposit" /></Win></L>
  </>,
  dex: () => <>
    <svg className="sc-svg" viewBox="0 0 600 500" style={{ position: 'absolute', inset: 0 }}><circle cx="300" cy="250" r="190" fill="none" stroke="var(--s-accent)" strokeOpacity=".4" strokeWidth="1.5" className="sc-dash" /><circle cx="300" cy="250" r="120" fill="none" stroke="var(--s-primary)" strokeOpacity=".35" /></svg>
    <Orb c="ETH" x={14} y={20} s={4.5} /><Orb c="SOL" x={80} y={24} s={4.5} d={-2} /><Orb c="BNB" x={12} y={70} s={4} d={-3} /><Orb c="USDC" x={82} y={70} s={4} d={-1} />
    <L x={30} y={14} w={40} d={20} z={4} fl={1}><Win title="Swap"><Field a="From" b="-- ETH" /><div className="sc-swap">&#8645;</div><Field a="To" b="-- SOL" /><Btn t="Swap" /></Win></L>
    <L x={30} y={66} w={40} d={12} z={3} fl={2}><Win title="Liquidity pools"><Row a="ETH / USDC" b="Plan" /><Row a="SOL / USDC" b="Plan" /></Win></L>
  </>,
  cloud_mining: () => <>
    <L x={20} y={4} w={60} d={10} z={1} fl={1}><div className="sc-cloud"><i /><i /><i /></div></L>
    <L x={5} y={36} w={42} d={14} z={3} fl={2}><div className="sc-rigs">{[0, 1, 2].map((i) => <div key={i} className="sc-rig"><span /><span /><i style={{ animationDelay: `${i * -.7}s` }} /></div>)}</div></L>
    <L x={52} y={34} w={44} d={20} z={4} fl={1}><Win title="Mining contract"><Tiles items={['Hashrate', 'Term']} /><Bars h={[35, 50, 45, 65, 60]} /><Row a="Contract" b="Preview" /></Win></L>
    <L x={30} y={74} w={40} d={8} z={2}><Win title="Pool connection"><Chips items={['Pool A', 'Pool B']} on={0} /></Win></L>
  </>,
  articles: () => <>
    <L x={4} y={10} w={60} d={8} z={2}><Win title="Editorial dashboard"><div className="sc-split"><Side /><div style={{ display: 'grid', gap: '.6em' }}><div className="sc-feat"><b /><span /><span /></div><Row a="Draft headline" b="Draft" /><Row a="Draft headline" b="Review" /></div></div></Win></L>
    <L x={58} y={26} w={38} d={18} z={4} fl={1}><Win title="News feed"><div className="sc-news"><i /><span /></div><div className="sc-news"><i /><span /></div><Chips items={['Markets', 'Guides', 'Updates']} /></Win></L>
    <L x={14} y={64} w={46} d={10} z={3} fl={2}><Win title="Reader view"><div className="sc-line w9" /><div className="sc-line w6" /><div className="sc-line w8" /></Win></L>
  </>,
  kolo: () => <>
    <Lines pts={[[120, 110], [480, 110], [100, 390], [500, 390]]} />
    <L x={36} y={34} w={28} d={18} z={4} fl={1}><div className="sc-hub"><b>Kolo</b><small>Ecosystem</small></div></L>
    <Orb c="BTC" x={10} y={12} s={4.5} /><Orb c="ETH" x={80} y={14} s={4.5} d={-2} /><Orb c="USDT" x={8} y={70} s={4} d={-3} /><Orb c="SOL" x={82} y={70} s={4} d={-1} />
    <L x={30} y={72} w={40} d={8} z={2}><Win title="Ecosystem services"><Chips items={['Wallet', 'Pay', 'Earn']} on={0} /></Win></L>
  </>,
  telegram_mini_app: () => <>
    <L x={6} y={8} w={32} d={8} z={1} fl={2}><Device><Chat title="Bot" /></Device></L>
    <L x={34} y={2} w={34} d={22} z={3} fl={1}><Device><Wallet /></Device></L>
    <L x={68} y={26} w={28} d={14} z={2} fl={2}><Win title="Mini App"><Chips items={['Wallet', 'Swap', 'Pay']} on={1} /><Btn t="Open" /></Win></L>
  </>,
};

export function ShowcaseScene({ productKey, label }: { productKey: string; label: string }) {
  const s = scenes[productKey] ?? scenes.crypto_engine;
  const teal = ['crypto_payments', 'whatsapp_bot', 'rpc_nodes', 'staking', 'dex', 'articles'].includes(productKey);
  return <ShowcaseFrame label={label} accent={teal ? 'var(--s-accent)' : 'var(--s-primary)'}>{s()}</ShowcaseFrame>;
}
export const SHOWCASE_KEYS = Object.keys(scenes);
