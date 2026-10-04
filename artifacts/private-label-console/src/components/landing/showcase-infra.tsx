import type { CSSProperties, ReactNode } from 'react';
import { L, Win } from './showcase-frame';
import { Coin, Cube, Rack } from './showcase-art';
import { Logo, QXMark } from './showcase-brand';
import { Bar, Chart, Chips, Cols, Kpis, Kv, St, Tr } from './showcase-ui';

const Mod = ({ n, t, a, b, p }: { n: string; t: string; a: [string, string]; b: [string, string]; p: number }) => (
  <Win title={`${n} ${t}`}><Kv k={a[0]} v={a[1]} /><Kv k={b[0]} v={b[1]} /><Bar p={p} /></Win>
);
const Asic = ({ i }: { i: number }) => (
  <div className="sx-asic"><span className="fan" /><span className="fan" /><div><Logo s={1.2} theme="dark" /><small>Unit {i + 1} / 110 TH/s</small></div><i style={{ animationDelay: `${i * -.7}s` }} /></div>
);

export const infraScenes: Record<string, () => ReactNode> = {
  crypto_engine: () => <>
    <svg className="sc-svg sx" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
      {[[28, 19.5], [28, 43.5], [28, 67.5]].map(([x, y]) => <path key={y} className="sc-dash" d={`M${x} ${y}C40 ${y} 40 32 50 32`} fill="none" stroke="var(--s-accent)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />)}
      {[[72, 19.5], [72, 43.5], [72, 67.5]].map(([x, y]) => <path key={y} className="sc-dash" d={`M${x} ${y}C60 ${y} 60 32 50 32`} fill="none" stroke="var(--s-primary)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />)}
    </svg>
    <L x={2} y={9} w={26} d={8}><Mod n="01" t="Exchange" a={['Orders routed', '12,408']} b={['Median', '118 ms']} p={82} /></L>
    <L x={2} y={33} w={26} d={10} fl={2}><Mod n="03" t="Wallets" a={['Hot / cold', '6 / 3']} b={['Pending sweeps', '14']} p={64} /></L>
    <L x={2} y={57} w={26} d={12}><Mod n="04" t="Providers" a={['Liquidity online', '5 of 5']} b={['Failover', 'Armed']} p={91} /></L>
    <L x={72} y={9} w={26} d={8}><Mod n="05" t="Nodes" a={['Chains synced', '9 / 9']} b={['Block lag', '1.2 s']} p={96} /></L>
    <L x={72} y={33} w={26} d={10} fl={2}><Mod n="06" t="Payments" a={['Open invoices', '218']} b={['Webhooks ok', '97.8%']} p={78} /></L>
    <L x={72} y={57} w={26} d={12}><Mod n="07" t="APIs" a={['Requests / s', '842']} b={['p95 latency', '96 ms']} p={88} /></L>
    <L x={40} y={11} w={20} d={22} z={4} fl={1} m="n"><div className="sx-hub"><div className="r1" /><div className="r2" /><div className="core"><QXMark s={4.2} /><b>QXLayer</b><small>02 Engine</small></div></div></L>
    <L x={31} y={57} w={38} d={10} z={3} m><Win title="Traffic and health monitor"><Kpis items={[['Requests / min', '50,482', '+4.2%'], ['Error rate', '0.18%', '-0.03%'], ['Uptime 30d', '99.94%']]} /><Chart a={[44, 50, 48, 58, 54, 66, 62, 70, 66, 74]} b={[30, 34, 40, 38, 46, 44, 52, 50, 56, 58]} h={5} /></Win></L>
  </>,

  rpc_nodes: () => <>
    <svg className="sc-svg sx" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
      <path className="sc-dash" d="M30 38C38 38 38 55 47 55M30 68C38 68 38 55 47 55" fill="none" stroke="var(--s-accent)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
    <L x={3} y={10} w={14} d={10} z={2} fl={1} m="n"><Rack label="Archive" rows={7} /></L>
    <L x={18} y={20} w={14} d={14} z={2} fl={2}><Rack label="Full nodes" rows={6} /></L>
    <L x={9} y={74} w={9} d={8} z={2} fl={1}><Cube s={5} /></L>
    <L x={24} y={76} w={8} d={8} z={2} fl={2}><Cube s={4} /></L>
    <L x={36} y={12} w={61} d={12} z={3} m><Win title="RPC monitoring dashboard">
      <Kpis items={[['Requests / s', '4,806', '+5.3%'], ['p50 latency', '38 ms'], ['Uptime 30d', '99.96%'], ['Synced chains', '6 / 6']]} />
      <div className="sx-two"><Chart a={[40, 46, 44, 55, 52, 63, 58, 70, 66, 72]} h={7} /><Cols v={[60, 74, 52, 82, 66, 90]} labels={['ETH', 'SOL', 'BNB', 'BTC', 'ARB', 'OP']} h={7} /></div>
      <Tr head cols="1fr 5em 4.5em 5em" c={['Endpoint', 'Region', 'Latency', 'Status']} />
      <Tr cols="1fr 5em 4.5em 5em" c={[<><Coin c="ETH" size={1.5} />Ethereum mainnet</>, 'EU West', '36 ms', <St t="Healthy" />]} />
      <Tr cols="1fr 5em 4.5em 5em" c={[<><Coin c="SOL" size={1.5} />Solana mainnet</>, 'US East', '41 ms', <St t="Healthy" />]} />
      <Tr cols="1fr 5em 4.5em 5em" c={[<><Coin c="BNB" size={1.5} />BNB Chain</>, 'Asia', '58 ms', <St t="Syncing" k="wait" />]} />
    </Win></L>
    <L x={36} y={74} w={61} d={8} z={2}><Win title="Access keys"><Tr cols="1fr 7em 5em" c={['qxl_demo_prod_****a41c', '1.2M calls', <St t="Active" />]} /></Win></L>
  </>,

  cloud_mining: () => <>
    <L x={4} y={9} w={30} d={10} z={1} fl={1}><div className="sx-cloudbox"><div className="sc-cloud"><i /><i /><i /><b><QXMark s={3.4} /></b></div><Logo s={1.6} sub="Cloud" /></div></L>
    <L x={3} y={42} w={36} d={14} z={3} fl={2} m><div className="sx-shelf">{[0, 1, 2, 3].map((i) => <Asic key={i} i={i} />)}</div></L>
    <L x={42} y={9} w={55} d={8} z={4} m><Win title="Mining contracts dashboard">
      <Kpis items={[['Hashrate', '440 TH/s', '+2.1%'], ['Daily output', '0.00182 BTC'], ['Uptime', '99.2%'], ['Power', '1.43 kW']]} />
      <div className="sx-two"><Chart a={[36, 42, 40, 52, 48, 58, 56, 64]} h={7} /><Cols v={[52, 60, 48, 70, 64, 76, 58]} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} h={7} /></div>
      <Tr head cols="1fr 6em 5em" c={['Contract', 'Term', 'Status']} />
      <Tr cols="1fr 6em 5em" c={['Contract CM-102 (demo)', '12 months', <St t="Running" />]} />
      <Tr cols="1fr 6em 5em" c={['Contract CM-103 (demo)', '6 months', <St t="Starting" k="wait" />]} />
    </Win></L>
    <L x={42} y={72} w={26} d={10} z={2}><Win title="Pool connection"><Chips items={['Pool Alpha', 'Pool Beta']} on={0} /><Kv k="Workers online" v="22 / 22" /></Win></L>
    <L x={71} y={72} w={26} d={8} z={2} fl={1}><div className="sx-glassnote wide"><QXMark s={2.2} /><span><b>Demo metrics</b><small>Not live mining output</small></span></div></L>
  </>,

  kolo: () => <>
    <L x={31} y={8} w={38} d={20} z={4} fl={1} m="n"><div className="sx-wheel"><div className="ring a" /><div className="ring b" /><div className="spokes" /><div className="ring c" />
      <div className="core"><QXMark s={5} /><b>QXLayer Kolo</b><small>Ecosystem core</small></div>
      {(['Wallet', 'Pay', 'Earn', 'Swap', 'Card', 'Nodes'] as const).map((t, i) => <span key={t} className="sat" style={{ ['--a' as string]: `${i * 60 - 90}deg` } as CSSProperties}><em>{t}</em></span>)}
    </div></L>
    <L x={2} y={14} w={27} d={8} z={2} fl={2}><Win title="Kolo wallet"><Kv k="Balance" v="$9,214.60" /><div className="sx-coinrow"><Coin c="BTC" size={1.9} /><Coin c="ETH" size={1.9} /><Coin c="USDT" size={1.9} /><Coin c="SOL" size={1.9} /></div></Win></L>
    <L x={2} y={52} w={27} d={12} z={2} fl={1}><Win title="Kolo rewards"><Kv k="Points" v="3,480" /><Bar p={68} /><small className="sx-note">Level 4 of 6 (demo)</small></Win></L>
    <L x={71} y={9} w={27} d={8} z={2} fl={1} m><Win title="Ecosystem console"><Kpis items={[['Active modules', '6'], ['Syncs / h', '1,204']]} /><Chart a={[30, 40, 36, 52, 48, 62, 58, 72]} h={5} /></Win></L>
    <L x={71} y={52} w={27} d={12} z={2} fl={2}><Win title="Services"><Chips items={['Wallet', 'Pay', 'Earn', 'Swap']} on={1} /><Kv k="Health" v={<St t="Nominal" />} /></Win></L>
    <L x={31} y={80} w={38} d={6} z={2}><div className="sx-glassnote wide"><QXMark s={2.2} /><span><b>Kolo ecosystem map</b><small>Illustrative modules, sandbox only</small></span></div></L>
  </>,
};
