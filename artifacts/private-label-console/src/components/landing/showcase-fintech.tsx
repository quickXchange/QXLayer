import type { ReactNode } from 'react';
import { L, Win } from './showcase-frame';
import { Coin } from './showcase-art';
import { Logo, QXMark } from './showcase-brand';
import { Bar, Btn, Chart, Chips, Cn, Cols, Donut, Fld, Kpis, Kv, Nav, Pair, Qr, St, Tg, Tr } from './showcase-ui';

const CardVisuals = () => (
  <div className="sx-cards">
    <div className="sx-metal">
      <div className="sx-cardtop"><Logo s={2} theme="dark" /><span className="sx-wave" /></div>
      <div className="sx-chip"><i /><i /><i /><i /></div>
      <div className="sx-pan">4821 0437 9150 7305</div>
      <div className="sx-cardbot"><span><small>Cardholder</small>Mira Valdesar</span><span><small>Valid</small>09/29</span><span className="sx-mc"><i /><i /></span></div>
    </div>
    <div className="sx-glass">
      <div className="sx-cardtop"><Logo s={1.7} theme="dark" /><small>Virtual</small></div>
      <div className="sx-pan s">4821 7702 3318 0462</div>
      <div className="sx-cardbot"><span><small>Cardholder</small>Mira Valdesar</span><span><small>CVV</small>***</span></div>
    </div>
  </div>
);

export const fintechScenes: Record<string, () => ReactNode> = {
  crypto_exchange: () => <>
    <L x={2} y={9} w={64} d={6}><Win title="Exchange admin dashboard" brandSize={1.9}>
      <div className="sx-split"><Nav items={['Overview', 'Orders', 'Assets', 'Networks', 'Payment methods', 'Analytics']} />
        <div className="sx-grid">
          <Kpis items={[['Orders today', '1,284', '+6.1%'], ['Volume', '$2.41M', '+11.4%'], ['Fee income', '$7,318.20', '+4.9%'], ['Avg settle', '3m 42s', '-0:18']]} />
          <div className="sx-two"><Chart a={[28, 36, 33, 48, 44, 58, 52, 67, 61, 78]} b={[20, 26, 30, 34, 38, 41, 47, 50, 55, 60]} h={9} /><Donut parts={[[41, 'var(--s-primary)'], [33, 'var(--s-accent)'], [26, '#f4b73e']]} v="1,284" s="by method" /></div>
          <div>
            <Tr head cols="6.5em 1fr 6.5em 5em" c={['Order', 'Pair', 'Amount', 'Status']} />
            <Tr cols="6.5em 1fr 6.5em 5em" c={['QX-48213', <><Cn c="BTC" />to<Cn c="ETH" /></>, '$5,716.40', <St t="Filled" />]} />
            <Tr cols="6.5em 1fr 6.5em 5em" c={['QX-48212', <><Cn c="USDT" />to<Cn c="SOL" /></>, '$1,240.00', <St t="Filled" />]} />
            <Tr cols="6.5em 1fr 6.5em 5em" c={['QX-48211', <><Cn c="ETH" />to<Cn c="USDC" /></>, '$3,880.15', <St t="Pending" k="wait" />]} />
          </div>
        </div>
      </div></Win></L>
    <L x={60} y={12} w={37} d={18} z={5} fl={1} m><Win title="Swap / Convert" brandSize={1.8}>
      <Fld l="You send" v="0.0842" sub="$5,716.40" r={<Cn c="BTC" />} />
      <div className="sx-swap">&#8645;</div>
      <Fld l="You receive" v="1.7186" sub="$5,702.88" r={<Cn c="ETH" />} />
      <Kv k="Rate" v="1 BTC = 20.41 ETH" /><Kv k="Network" v="Bitcoin to Ethereum (ERC-20)" /><Kv k="Fee" v="0.24% / $13.72" />
      <Chips items={['Card', 'Bank transfer', 'Wallet']} on={1} /><Btn t="Convert BTC to ETH" />
    </Win></L>
    <L x={43} y={77} w={27} d={14} z={4} fl={2}><Win title="Assets and networks"><div className="sx-coinrow"><Coin c="BTC" size={2} /><Coin c="ETH" size={2} /><Coin c="USDT" size={2} /><Coin c="USDC" size={2} /><Coin c="SOL" size={2} /><Coin c="BNB" size={2} /></div></Win></L>
    <L x={72} y={78} w={25} d={10} z={4} fl={2}><Win title="Payment methods"><Kv k="Card" v={<Tg on />} /><Kv k="Bank transfer" v={<Tg on />} /></Win></L>
  </>,

  crypto_payments: () => <>
    <L x={2} y={9} w={60} d={6}><Win title="Pay merchant dashboard">
      <div className="sx-split"><Nav items={['Payments', 'Links', 'Payouts', 'Customers', 'Settings']} />
        <div className="sx-grid">
          <Kpis items={[['Volume 24h', '$182,406.50', '+8.2%'], ['Payments', '1,942', '+3.4%'], ['Success rate', '97.3%', '+0.6%'], ['Avg order', '$93.92']]} />
          <Chart a={[22, 30, 28, 40, 38, 52, 49, 63, 70, 66, 82]} b={[15, 20, 26, 30, 34, 40, 45, 51, 55, 62, 68]} h={9} />
          <Tr cols="6.5em 1fr 6.5em 5em" c={['PAY-7731', <><Cn c="USDT" />Northwind Outfitters</>, '$128.40', <St t="Paid" />]} />
          <Tr cols="6.5em 1fr 6.5em 5em" c={['PAY-7730', <><Cn c="ETH" />Harbor Air demo</>, '$612.00', <St t="Paid" />]} />
          <Tr cols="6.5em 1fr 6.5em 5em" c={['PAY-7729', <><Cn c="BTC" />Lumen Studio</>, '$74.15', <St t="Waiting" k="wait" />]} />
        </div>
      </div></Win></L>
    <L x={58} y={11} w={39} d={18} z={5} fl={1} m><Win title="Crypto checkout">
      <div className="sx-merch"><span><b>Northwind Outfitters</b><small>Order 4417 / demo</small></span><strong>$128.40</strong></div>
      <div className="sx-pay"><Cn c="BTC" /><Cn c="ETH" /><span className="sx-cc2 on"><Coin c="USDT" size={1.5} />USDT</span></div>
      <div className="sx-payrow"><Qr /><div className="sx-grid">
        <Kv k="Send exactly" v="128.400000 USDT" /><Kv k="Network" v="Ethereum" /><Kv k="Address" v="0x7a3f...c91e" /><Kv k="Expires in" v="14:32" />
        <div className="sx-note">Illustrative sample code, not scannable.</div>
      </div></div>
      <Btn t="I have sent the payment" />
    </Win></L>
    <L x={4} y={73} w={36} d={14} z={3} fl={2}><Win title="Payment link"><div className="sx-link"><span>pay.qxlayer.demo/l/studio-kit</span><em>Copy</em></div><Kv k="Amount" v="$49.00 in USDC" /><Kv k="Status" v={<St t="Active" />} /></Win></L>
    <L x={44} y={74} w={30} d={8} z={2}><Win title="Settlement"><Cols v={[40, 55, 48, 72, 60, 86, 74]} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} h={4} /></Win></L>
  </>,

  crypto_card: () => <>
    <L x={2} y={11} w={42} d={18} z={4} fl={1} m><CardVisuals /></L>
    <L x={45} y={9} w={52} d={8} z={2}><Win title="Card management">
      <div className="sx-two2">
        <div className="sx-grid">
          <div className="sx-bal"><small>Available balance</small><strong>$4,286.90</strong><em className="up">Spent this month $1,318.55</em></div>
          <Cols v={[30, 44, 28, 62, 40, 75, 52, 36, 58, 48]} h={5} />
          <Kv k="Daily limit" v="$2,500.00" /><Bar p={38} />
          <Kv k="Freeze card" v={<Tg />} /><Kv k="Online payments" v={<Tg on />} /><Kv k="ATM withdrawals" v={<Tg />} />
        </div>
        <div className="sx-grid">
          <Tr head cols="1fr 5.5em" c={['Recent', 'Amount']} />
          <Tr cols="1fr 5.5em" c={['Aldervale Coffee', '-$6.40']} />
          <Tr cols="1fr 5.5em" c={['Lumen Cloud', '-$42.00']} />
          <Tr cols="1fr 5.5em" c={['Top-up from USDT', <b className="up">+$500.00</b>]} />
          <Tr cols="1fr 5.5em" c={['Harbor Air demo', '-$318.20']} />
          <Chips items={['Travel', 'Food', 'Software']} />
        </div>
      </div></Win></L>
    <L x={48} y={74} w={46} d={12} z={3} fl={2}><Win title="Spending controls"><div className="sx-two"><Kv k="Merchant categories" v="12 allowed" /><Kv k="Virtual cards" v="3 active" /></div></Win></L>
  </>,

  staking: () => <>
    {([['SOL', '18.40 SOL', '6.8%', 64], ['ETH', '2.15 ETH', '3.9%', 48], ['BNB', '9.60 BNB', '4.7%', 72], ['USDC', '3,200 USDC', '5.2%', 35]] as const).map(([c, a, apy, p], i) => (
      <L key={c} x={2 + i * 24.5} y={10} w={23} d={8 + i * 3} z={3} fl={i % 2 ? 2 : 1} m={i < 2}><Win title={`${c} position`}>
        <div className="sx-pos"><Coin c={c} size={2.6} /><span><small>Staked</small><strong>{a}</strong></span></div>
        <Kv k="APY (demo)" v={<b className="up">{apy}</b>} /><Bar p={p} /><small className="sx-note">Unlocks in {20 + i * 9} days</small>
      </Win></L>
    ))}
    <L x={2} y={42} w={58} d={6} z={2} m><Win title="Rewards overview">
      <Kpis items={[['Total staked', '$11,486.30'], ['Rewards earned', '$412.86', '+2.9%'], ['Avg APY', '5.4%']]} />
      <Chart a={[18, 24, 30, 38, 42, 53, 60, 71, 77, 90]} h={8} />
    </Win></L>
    <L x={62} y={42} w={35} d={18} z={4} fl={1}><Win title="Stake"><Fld l="Amount" v="5.00" sub="$871.20" r={<Cn c="SOL" />} /><Chips items={['Flexible', '30 days', '90 days']} on={1} /><Kv k="Est. reward" v="0.028 SOL / mo" /><Btn t="Stake SOL" /></Win></L>
  </>,

  earn: () => <>
    <L x={2} y={10} w={29} d={8} z={2} m><Win title="Earn portfolio">
      <div className="sx-center"><Donut parts={[[38, 'var(--s-primary)'], [27, 'var(--s-accent)'], [20, '#f4b73e'], [15, '#26a17b']]} v="$24,918" s="deposited" /></div>
      <Kv k="Accrued" v={<b className="up">+$412.86</b>} /><Kv k="Blended APY" v="4.6%" /><Chips items={['USDC', 'USDT', 'BTC', 'ETH']} />
    </Win></L>
    <L x={33} y={14} w={38} d={14} z={3} fl={2}><Win title="Yield assets">
      <Tr head cols="1fr 4em 5.5em" c={['Asset', 'APY', 'Balance']} />
      {([['USDC', '5.1%', '$9,470.20'], ['USDT', '4.7%', '$6,728.00'], ['BTC', '1.9%', '$4,983.71'], ['ETH', '2.8%', '$2,449.11'], ['SOL', '5.6%', '$1,287.35']] as const).map(([c, a, b]) => <Tr key={c} cols="1fr 4em 5.5em" c={[<Cn key="c" c={c} />, <b key="a" className="up">{a}</b>, b]} />)}
    </Win></L>
    <L x={73} y={9} w={25} d={18} z={4} fl={1}><Win title="Deposit"><Fld l="Amount" v="2,500" r={<Cn c="USDC" />} /><Kv k="APY" v="5.1%" /><Kv k="Est. monthly" v="$10.63" /><Btn t="Deposit USDC" /></Win></L>
    <L x={33} y={66} w={64} d={8} z={2}><Win title="Yield accrual, 90 days"><Chart a={[14, 20, 26, 28, 36, 40, 46, 52, 60, 66, 75, 84]} b={[10, 13, 16, 19, 23, 27, 31, 36, 40, 45, 50, 55]} h={6} /></Win></L>
    <L x={2} y={72} w={29} d={10} z={3} fl={2}><div className="sx-glassnote"><QXMark s={2.2} /><span><b>Earn on QXLayer</b><small>Demo yields, sandbox only</small></span></div></L>
  </>,

  dex: () => <>
    <L x={34} y={10} w={32} d={20} z={5} fl={1} m><Win title="Swap">
      <Fld l="From" v="1.000" sub="$3,327.40" r={<Cn c="ETH" />} />
      <div className="sx-swap">&#8645;</div>
      <Fld l="To (estimated)" v="19.098" sub="$3,321.10" r={<Cn c="SOL" />} />
      <Kv k="Price impact" v="0.07%" /><Kv k="Slippage" v="0.5%" /><Kv k="Route" v="ETH > USDC > SOL" /><Kv k="Network" v="Ethereum / Solana bridge" />
      <Btn t="Swap ETH for SOL" />
    </Win></L>
    <L x={2} y={14} w={31} d={8} z={3} fl={2}><Win title="Liquidity pools">
      <Tr head cols="1fr 4.5em 3.8em" c={['Pool', 'TVL', 'APR']} />
      <Tr cols="1fr 4.5em 3.8em" c={[<><Pair a="ETH" b="USDC" />ETH/USDC</>, '$41.2M', <b className="up">12.4%</b>]} />
      <Tr cols="1fr 4.5em 3.8em" c={[<><Pair a="SOL" b="USDC" />SOL/USDC</>, '$28.7M', <b className="up">18.9%</b>]} />
      <Tr cols="1fr 4.5em 3.8em" c={[<><Pair a="BNB" b="USDT" />BNB/USDT</>, '$19.3M', <b className="up">9.6%</b>]} />
      <Tr cols="1fr 4.5em 3.8em" c={[<><Pair a="BTC" b="ETH" />BTC/ETH</>, '$33.8M', <b className="up">7.1%</b>]} />
    </Win></L>
    <L x={68} y={12} w={30} d={12} z={3} fl={2}><Win title="Networks and recent swaps">
      <Chips items={['Ethereum', 'Solana', 'BNB Chain']} on={0} />
      <Tr cols="1fr 6em" c={[<><Cn c="USDT" />to<Cn c="BNB" /></>, '$1,205.00']} />
      <Tr cols="1fr 6em" c={[<><Cn c="SOL" />to<Cn c="ETH" /></>, '$742.60']} />
      <Chart a={[40, 36, 48, 44, 58, 52, 66, 61, 72]} h={5} />
    </Win></L>
    <L x={6} y={72} w={50} d={6} z={2}><div className="sx-glassnote wide"><QXMark s={2.2} /><span><b>Liquidity depth, last 7 days</b><small>Demo pool data for illustration</small></span><Cols v={[40, 52, 46, 70, 58, 82, 66]} h={3} /></div></L>
    <L x={60} y={72} w={37} d={10} z={2} fl={1}><Win title="Add liquidity"><Fld l="Deposit" v="2.00 ETH" r={<Pair a="ETH" b="USDC" />} /><Btn t="Add to ETH/USDC" /></Win></L>
  </>,

  articles: () => <>
    <L x={2} y={9} w={55} d={6} z={2}><Win title="Articles CMS editor">
      <div className="sx-split"><Nav items={['Articles', 'Drafts', 'Media', 'Categories', 'Authors']} />
        <div className="sx-grid">
          <div className="sx-tool">{['B', 'I', 'H2', 'Link', 'Quote', 'Image'].map((t) => <span key={t}>{t}</span>)}<em>Autosaved 2 min ago</em></div>
          <div className="sx-title">What settlement times really tell you about a payment rail</div>
          <p className="sx-p">Merchants rarely ask how an invoice is routed. They ask when the money lands. Across the demo cohort, median settlement fell from eleven minutes to under four once confirmations were tuned per network.</p>
          <p className="sx-p">Below, three tuning decisions that moved the number, and the one that did not.</p>
          <div className="sx-two"><Kv k="Status" v={<St t="Scheduled" k="wait" />} /><Kv k="SEO score" v="92 / 100" /></div>
          <Chips items={['Payments', 'Guides', 'Settlement']} />
        </div>
      </div></Win></L>
    <L x={52} y={11} w={45} d={16} z={4} fl={1} m><div className="sx-site">
      <div className="sx-sitebar"><Logo s={1.5} sub="Insights" /><span>Markets</span><span>Guides</span><span>Updates</span></div>
      <div className="sx-hero"><QXMark s={5} /></div>
      <div className="sx-art"><small>Guides / 6 min read</small><h4>What settlement times really tell you about a payment rail</h4><span>By Ilse Brandt / 14 March 2026 (demo)</span>
        <p>Merchants rarely ask how an invoice is routed. They ask when the money lands. Median settlement fell from eleven minutes to under four once confirmations were tuned per network.</p>
        <p>Three decisions moved the number, and one that did not.</p></div>
    </div></L>
    <L x={4} y={76} w={46} d={10} z={3} fl={2}><Win title="Publishing queue"><Tr cols="1fr 5.5em 5em" c={['Fee tiers explained', '16 Mar', <St t="Queued" k="wait" />]} /><Tr cols="1fr 5.5em 5em" c={['Quarterly rail report', '12 Mar', <St t="Live demo" />]} /></Win></L>
  </>,
};
