import type { ReactNode } from 'react';
import { ShowcaseFrame, L, Win, Row, Tiles, Bars, Field, Btn, Chips, Side } from './showcase-frame';

const Phone = ({ droid, children }: { droid?: boolean; children: ReactNode }) => (
  <div className={`sc-phone ${droid ? 'droid' : ''}`}><div>{droid ? <i style={{ position: 'absolute', top: '.6em', left: '50%', width: '.7em', height: '.7em', borderRadius: '50%', background: '#05070f' }} /> : <span className="sc-notch" />}{children}</div></div>
);
const Brand = ({ t }: { t: string }) => <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Your Brand</span><span style={{ opacity: .6 }}>{t}</span></div>;
const Wallet = () => <>
  <Brand t="Wallet" />
  <div className="sc-tile" style={{ borderColor: 'rgba(255,255,255,.2)' }}><small>Total balance</small><strong style={{ fontSize: '1.6em' }}>-- --</strong></div>
  <Row a="Asset A" b="Demo" /><Row a="Asset B" b="Demo" /><Row a="Asset C" b="Demo" />
  <div style={{ flex: 1 }} /><Btn t="Exchange" />
</>;

const Chat = ({ title }: { title: string }) => <>
  <Brand t={title} />
  <div className="sc-bubble">Welcome. Choose a service to continue.</div>
  <div className="sc-bubble me">Exchange</div>
  <div className="sc-bubble">Select the asset and network. Rates are shown here when the service is live.</div>
  <Chips items={['Asset A', 'Asset B', 'Menu']} on={0} />
  <div className="sc-bubble me">Payment link</div>
  <div className="sc-bubble">Amount: -- &nbsp; Status: Planned</div>
  <div style={{ flex: 1 }} /><Field a="Message" b="" />
</>;

const scenes: Record<string, () => ReactNode> = {
  crypto_exchange: () => <>
    <L x={30} y={13} w={66} d={6} z={1}><Win title="Client admin dashboard"><div className="sc-split"><Side /><div style={{ display: 'grid', gap: '.6em' }}><Tiles items={['Orders', 'Assets', 'Networks']} /><Bars h={[30, 50, 40, 70, 55, 85, 65]} /></div></div></Win></L>
    <L x={4} y={26} w={34} d={18} z={4} fl={1}><Win title="Exchange widget"><Field a="You send" b="-- Asset A" /><Field a="You receive" b="-- Asset B" /><Chips items={['Network A', 'Network B']} /><Btn t="Exchange" /></Win></L>
    <L x={58} y={56} w={38} d={14} z={3} fl={2}><Win title="Orders"><Row a="Order #----" /><Row a="Order #----" b="Sandbox" /><Row a="Order #----" /></Win></L>
    <L x={36} y={66} w={30} d={22} z={5} fl={1}><Win title="Assets and networks"><Chips items={['Asset A', 'Asset B', 'Asset C', 'Network A', 'Network B']} on={3} /></Win></L>
    <L x={4} y={70} w={28} d={10} z={2} fl={2}><Win title="Payment methods"><Row a="Method A" b="Off" /><Row a="Method B" b="On" /></Win></L>
  </>,
  crypto_payments: () => <>
    <L x={6} y={12} w={62} d={6}><Win title="Merchant dashboard"><div className="sc-split"><Side /><div style={{ display: 'grid', gap: '.6em' }}><Tiles items={['Volume', 'Orders', 'Links']} /><Bars h={[40, 35, 60, 55, 75, 62, 90]} /><Row a="Order #----" /><Row a="Order #----" /></div></div></Win></L>
    <L x={56} y={22} w={38} d={18} z={4} fl={1}><Win title="Hosted checkout"><Field a="Amount" b="-- --" /><Chips items={['Asset A', 'Asset B', 'Asset C']} /><Field a="Network" b="Network A" /><Btn t="Pay" /></Win></L>
    <L x={10} y={62} w={34} d={14} z={3} fl={2}><Win title="Payment links"><Row a="Link name" b="Draft" /><Row a="Link name" b="Draft" /></Win></L>
    <L x={50} y={68} w={44} d={10} z={2} fl={2}><Win title="Analytics (schematic)"><Bars h={[20, 45, 35, 65, 50, 80]} /></Win></L>
  </>,
  crypto_card: () => <>
    <L x={26} y={12} w={62} d={22} z={4} fl={1}><div className="sc-cc" style={{ transform: 'rotate(-6deg)' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ letterSpacing: '.16em', fontSize: '.9em' }}>PRIVATE LABEL</b><span>Your Brand</span></div><div className="sc-chip" /><div style={{ fontFamily: 'monospace', letterSpacing: '.2em', fontSize: '1.2em' }}>**** **** **** ****</div><div style={{ display: 'flex', justifyContent: 'space-between', opacity: .8 }}><span>CARDHOLDER</span><span>--/--</span></div></div></L>
    <L x={4} y={44} w={46} d={10} z={2} fl={2}><Win title="Card management"><Field a="Card status" b="Preview" /><Field a="Limits" b="--" /><div className="sc-row2"><span>Freeze card</span><em>Off</em></div></Win></L>
    <L x={52} y={56} w={44} d={14} z={3} fl={2}><Win title="Activity"><Row a="Merchant" b="--" /><Row a="Merchant" b="--" /><Row a="Merchant" b="--" /></Win></L>
  </>,
  ios_app: () => <>
    <L x={10} y={16} w={30} d={10} z={1} fl={2}><Phone droid><Chat title="Markets" /></Phone></L>
    <L x={36} y={6} w={34} d={22} z={3} fl={1}><Phone><Wallet /></Phone></L>
    <L x={68} y={20} w={26} d={14} z={2} fl={2}><Win title="Branded app"><Chips items={['Your logo', 'Your colors']} /><Btn t="Install" /></Win></L>
  </>,
  android_app: () => <>
    <L x={8} y={8} w={34} d={20} z={3} fl={1}><Phone droid><Wallet /></Phone></L>
    <L x={40} y={18} w={30} d={10} z={1} fl={2}><Phone><Chat title="Markets" /></Phone></L>
    <L x={68} y={46} w={28} d={14} z={4} fl={2}><Win title="Branded app"><Chips items={['Your logo', 'Your colors']} /><Btn t="Install" /></Win></L>
  </>,
  telegram_bot: () => <>
    <L x={30} y={5} w={36} d={18} z={3} fl={1}><Phone><Chat title="Bot" /></Phone></L>
    <L x={3} y={30} w={30} d={8} z={1} fl={2}><Win title="Bot menu"><Row a="Exchange" b="/start" /><Row a="Payments" b="/pay" /><Row a="Support" b="/help" /></Win></L>
    <L x={66} y={52} w={30} d={12} z={2} fl={2}><Win title="Conversation flow"><Chips items={['Start', 'Select', 'Confirm']} on={1} /></Win></L>
  </>,
  whatsapp_bot: () => <>
    <L x={30} y={5} w={36} d={18} z={3} fl={1}><Phone droid><Chat title="Business chat" /></Phone></L>
    <L x={3} y={34} w={30} d={8} z={1} fl={2}><Win title="Quick replies"><Chips items={['Exchange', 'Payments', 'Help']} on={0} /></Win></L>
    <L x={66} y={50} w={30} d={12} z={2} fl={2}><Win title="Message templates"><Row a="Template A" b="Draft" /><Row a="Template B" b="Draft" /></Win></L>
  </>,
  crypto_engine: () => <>
    <svg className="sc-svg" viewBox="0 0 600 500" style={{ position: 'absolute', inset: 0 }}>{[[110, 90], [490, 90], [90, 250], [510, 250], [130, 410], [470, 410]].map(([x, y], i) => <line key={i} className="sc-dash" x1={x} y1={y} x2="300" y2="250" stroke="var(--s-accent)" strokeOpacity=".6" />)}</svg>
    <L x={36} y={38} w={28} d={20} z={4} fl={1}><Win title="Engine core"><Chips items={['Routing', 'Ledger', 'Policy']} on={0} /><Bars h={[40, 70, 50]} /></Win></L>
    <L x={5} y={10} w={26} d={8}><Win title="Exchange"><Row a="Module" b="Plan" /></Win></L>
    <L x={69} y={10} w={26} d={8}><Win title="Payments"><Row a="Module" b="Plan" /></Win></L>
    <L x={3} y={42} w={26} d={12} fl={2}><Win title="Wallets"><Row a="Module" b="Plan" /></Win></L>
    <L x={71} y={42} w={26} d={12} fl={2}><Win title="APIs"><Row a="Module" b="Plan" /></Win></L>
    <L x={8} y={76} w={26} d={8}><Win title="Providers"><Row a="Module" b="Plan" /></Win></L>
    <L x={66} y={76} w={26} d={8}><Win title="Nodes"><Row a="Module" b="Plan" /></Win></L>
  </>,
  rpc_nodes: () => <>
    <L x={5} y={18} w={42} d={10} z={2} fl={1}><div style={{ display: 'grid', gap: '.6em' }}>{[0, 1, 2, 3, 4].map((i) => <div key={i} className="sc-server"><i style={{ animationDelay: `${i * -.6}s` }} /><span /><small className="s-muted">Node {i + 1}</small></div>)}</div></L>
    <svg className="sc-svg" viewBox="0 0 600 500" style={{ position: 'absolute', inset: 0 }}><path className="sc-dash" d="M270 150C340 150 340 250 400 250M270 230C340 230 340 250 400 250M270 310C340 310 340 250 400 250" fill="none" stroke="var(--s-accent)" /></svg>
    <L x={62} y={14} w={34} d={18} z={3} fl={2}><Win title="Endpoint console"><Field a="Network" b="Network A" /><Field a="Endpoint" b="https://----" /><Tiles items={['Latency', 'Uptime']} /></Win></L>
    <L x={52} y={62} w={42} d={8} z={2}><Win title="Chain nodes"><Chips items={['Network A', 'Network B', 'Network C']} on={0} /><Bars h={[30, 40, 35, 55]} /></Win></L>
  </>,
  staking: () => <>
    <L x={5} y={14} w={56} d={8} z={2}><Win title="Staking"><Tiles items={['Staked', 'Rewards', 'Period']} /><Bars h={[20, 30, 42, 55, 68, 82]} /><Row a="Asset A pool" b="Preview" /><Row a="Asset B pool" b="Preview" /></Win></L>
    <L x={58} y={30} w={36} d={20} z={4} fl={1}><Win title="Stake"><Field a="Amount" b="-- Asset" /><Chips items={['Flexible', 'Locked']} /><Btn t="Stake" /></Win></L>
    <L x={20} y={68} w={50} d={12} z={3} fl={2}><div style={{ display: 'flex', gap: '1em', justifyContent: 'center' }}>{[0, 1, 2].map((i) => <div key={i} style={{ width: '5em', height: `${4 + i * 1.5}em`, borderRadius: '50% / 14%', background: 'linear-gradient(var(--s-accent),var(--s-primary))', opacity: .85 }} />)}</div></L>
  </>,
  earn: () => <>
    <L x={4} y={14} w={50} d={8} z={2}><Win title="Earn products"><Row a="Product A" b="Preview" /><Row a="Product B" b="Preview" /><Row a="Product C" b="Preview" /></Win></L>
    <L x={52} y={22} w={42} d={18} z={4} fl={1}><Win title="Yield overview (schematic)"><Bars h={[25, 38, 50, 62, 78, 92]} /><Tiles items={['Deposited', 'Accrued']} /></Win></L>
    <L x={18} y={62} w={40} d={12} z={3} fl={2}><Win title="Deposit"><Field a="Amount" b="-- Asset" /><Btn t="Deposit" /></Win></L>
  </>,
  dex: () => <>
    <svg className="sc-svg" viewBox="0 0 600 500" style={{ position: 'absolute', inset: 0 }}><circle cx="300" cy="250" r="190" fill="none" stroke="var(--s-accent)" strokeOpacity=".3" className="sc-dash" />{[[120, 120], [480, 140], [110, 380], [500, 390]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="14" fill="var(--s-primary)" />)}</svg>
    <L x={30} y={14} w={40} d={20} z={4} fl={1}><Win title="Swap"><Field a="From" b="-- Asset A" /><Field a="To" b="-- Asset B" /><Chips items={['Network A', 'Network B']} /><Btn t="Swap" /></Win></L>
    <L x={4} y={52} w={38} d={10} z={2} fl={2}><Win title="Liquidity pools"><Row a="A / B" b="Plan" /><Row a="A / C" b="Plan" /></Win></L>
    <L x={58} y={56} w={38} d={14} z={3} fl={2}><Win title="Pool depth (schematic)"><Bars h={[40, 60, 80, 60, 40]} /></Win></L>
  </>,
  cloud_mining: () => <>
    <L x={24} y={4} w={52} d={10} z={1} fl={1}><div style={{ height: '9em', borderRadius: '6em 6em 3em 3em', background: 'linear-gradient(var(--s-accent),var(--s-primary))', opacity: .35, border: '1px solid var(--s-line)' }} /></L>
    <L x={6} y={36} w={42} d={14} z={3} fl={2}><div style={{ display: 'grid', gap: '.5em' }}>{[0, 1, 2, 3].map((i) => <div key={i} className="sc-server"><i style={{ animationDelay: `${i * -.7}s` }} /><span /><small className="s-muted">Rig {i + 1}</small></div>)}</div></L>
    <L x={52} y={34} w={42} d={20} z={4} fl={1}><Win title="Mining contract"><Tiles items={['Hashrate', 'Term']} /><Bars h={[35, 50, 45, 65, 60]} /><Row a="Contract" b="Preview" /></Win></L>
    <L x={30} y={70} w={40} d={8} z={2}><Win title="Pool connection"><Chips items={['Pool A', 'Pool B']} on={0} /></Win></L>
  </>,
};

export function ShowcaseScene({ productKey, label }: { productKey: string; label: string }) {
  const s = scenes[productKey] ?? scenes.crypto_engine;
  const teal = ['crypto_payments', 'whatsapp_bot', 'rpc_nodes', 'staking', 'dex'].includes(productKey);
  return <ShowcaseFrame label={label} accent={teal ? 'var(--s-accent)' : 'var(--s-primary)'}>{s()}</ShowcaseFrame>;
}
export const SHOWCASE_KEYS = Object.keys(scenes);
