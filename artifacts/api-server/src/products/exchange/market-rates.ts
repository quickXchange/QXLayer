import { HttpError } from "../../lib/errors";
import { decimal, decimalString } from "../../modules/entitlements/decimal";
import { positiveRate } from "../../modules/integrations/pricing-adapters";

const SCALE = 10n ** 18n;
// Explicit provider identities, never guessed from a ticker or assumed stablecoin peg.
const COINS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", USDT: "tether", USDC: "usd-coin", DAI: "dai",
  TRX: "tron", BNB: "binancecoin", SOL: "solana", XRP: "ripple", LTC: "litecoin",
  DOGE: "dogecoin", BCH: "bitcoin-cash", TON: "the-open-network", ADA: "cardano",
  DOT: "polkadot", AVAX: "avalanche-2", LINK: "chainlink", XLM: "stellar",
  XMR: "monero", ETC: "ethereum-classic", ATOM: "cosmos", NEAR: "near",
  POL: "polygon-ecosystem-token", WBTC: "wrapped-bitcoin", WETH: "weth",
  UNI: "uniswap", SHIB: "shiba-inu", ARB: "arbitrum", OP: "optimism",
};
type Read = (url: string) => Promise<any>;
// Verified USD spot markets only. WBTC/WETH never inherit BTC/ETH prices.
const KRAKEN:Record<string,{pair:string;result:string}>={
  BTC:{pair:"XBTUSD",result:"XXBTZUSD"},ETH:{pair:"ETHUSD",result:"XETHZUSD"},
  USDT:{pair:"USDTUSD",result:"USDTZUSD"},USDC:{pair:"USDCUSD",result:"USDCUSD"},
};
const publicJson: Read = async url => {
  const provider=new URL(url).hostname==="api.coingecko.com"?"CoinGecko":new URL(url).hostname==="api.kraken.com"?"Kraken":"Frankfurter";
  try {
    const r = await fetch(url, { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new HttpError(503,`Fresh market data is unavailable (${provider} HTTP ${r.status}). Automatic quoting is disabled; no invented rate is substituted.`);
    return await r.json();
  } catch(e) { if(e instanceof HttpError)throw e;throw new HttpError(503, `Fresh market data is unavailable (${provider} transport or invalid response). Automatic quoting is disabled; no invented rate is substituted.`); }
};
export interface ReferencePrice { rate: string; provider: string; updatedAt: string; validUntil: number }
/** Read-only market data with bounded freshness and a coalesced, short-lived cache. */
export function marketRates(read: Read = publicJson, now = Date.now) {
  const cache = new Map<string, { until: number; promise: Promise<ReferencePrice> }>();
  let coinBundle:{until:number;promise:Promise<any>}|undefined;
  const coins=()=>{
    if(coinBundle&&coinBundle.until>now())return coinBundle.promise;
    // One coalesced request covers all explicitly mapped identities. Never
    // spend one public API request per wildcard asset or customer quote.
    const promise=read(`https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(COINS).join(",")}&vs_currencies=usd&include_last_updated_at=true`)
      .catch(e=>{if(coinBundle?.promise===promise)coinBundle.until=now()+15000;throw e;});
    coinBundle={until:now()+60000,promise};return promise;
  };
  const cached = (key: string, load: () => Promise<ReferencePrice>) => {
    const old = cache.get(key);
    if (old && old.until > now()) return old.promise.then(p=>p.validUntil>now()?p:load());
    const promise = load().catch(e => { cache.delete(key); throw e; });
    cache.set(key, { until: now() + (key.startsWith("coin:")?60000:300000), promise });
    return promise;
  };
  function cryptoUsd(symbol: string) {
    const id = COINS[symbol];
    if (!id) throw new HttpError(503, `No verified market-data identity is configured for ${symbol}.`);
    return cached(`coin:${id}`, async () => {
      let primaryError:unknown;
      try{
        const data = await coins();
        const row = data?.[id], at = Number(row?.last_updated_at) * 1000;
        if (!Number.isFinite(at) || at > now() + 10000 || now() - at > 180000)
          throw new HttpError(503, "Crypto reference data is stale or has no verified update timestamp.");
        return { rate: positiveRate(row?.usd), provider: "CoinGecko Public", updatedAt: new Date(at).toISOString(), validUntil: at + 180000 };
      }catch(e){primaryError=e;}
      const mapping=KRAKEN[symbol];
      if(!mapping)throw primaryError;
      try{
        // Public read-only last trade, not a ticker without an as-of timestamp.
        // count=1 bounds bandwidth; the per-asset cache coalesces simultaneous reads.
        const data=await read(`https://api.kraken.com/0/public/Trades?pair=${mapping.pair}&count=1`);
        const rows=data?.result?.[mapping.result],row=Array.isArray(rows)?rows.at(-1):undefined;
        const at=Math.floor(Number(row?.[2])*1000);
        if(!Array.isArray(data?.error)||data.error.length||!row||!Number.isFinite(at)||at>now()+10000||now()-at>180000)
          throw new HttpError(503,"Kraken reference data is stale or has no verified market/timestamp.");
        return {rate:positiveRate(row[0]),provider:"Kraken Public / USD last trade (CoinGecko unavailable)",updatedAt:new Date(at).toISOString(),validUntil:at+180000};
      }catch(e){
        const detail=e instanceof HttpError?e.message:"Kraken transport or invalid response";
        throw new HttpError(503,`Fresh crypto reference data is stale or unavailable. ${primaryError instanceof HttpError?primaryError.message:"CoinGecko unavailable"} ${detail} No invented rate is substituted.`);
      }
    });
  }
  function usdFiat(currency: string) {
    if (currency === "USD") return Promise.resolve({ rate: "1", provider: "USD numeraire", updatedAt: new Date(now()).toISOString(), validUntil: now() + 180000 });
    if (!/^[A-Z]{3}$/.test(currency) || ["DZD", "ILS"].includes(currency)) throw new HttpError(400, "Unsupported fiat reference currency.");
    return cached(`fiat:${currency}`, async () => {
      const data = await read(`https://api.frankfurter.dev/v1/latest?base=USD&symbols=${currency}`);
      const at = Date.parse(`${data?.date}T00:00:00Z`);
      // ECB publishes daily, not intraday/on weekends. Never call this an intraday price.
      if (data?.base !== "USD" || !Number.isFinite(at) || at > now() || now() - at > 4 * 86400000)
        throw new HttpError(503, "Fiat reference data is stale or unsupported by Frankfurter.");
      return { rate: positiveRate(data?.rates?.[currency]), provider: "Frankfurter / ECB daily", updatedAt: new Date(at).toISOString(), validUntil: at + 4 * 86400000 };
    });
  }
  return { cryptoUsd, usdFiat,
    async pair(source: { symbol: string; fiat: boolean }, destination: { symbol: string; fiat: boolean }, planCurrency: string,
      forex: (code: string) => Promise<ReferencePrice> = usdFiat) {
      const fiatReads=new Map<string,Promise<ReferencePrice>>();
      const fx=(code:string)=>{
        if(!fiatReads.has(code))fiatReads.set(code,forex(code));
        return fiatReads.get(code)!;
      };
      const usd = async (a: typeof source) => a.fiat
        ? { ...(await fx(a.symbol)), rate: decimalString(SCALE * SCALE / decimal((await fx(a.symbol)).rate)) }
        : cryptoUsd(a.symbol);
      const [from, to, plan] = await Promise.all([usd(source), usd(destination), fx(planCurrency)]);
      const references = [from, to, plan];
      return { rate: decimalString(decimal(from.rate) * SCALE / decimal(to.rate)),
        sourcePlanRate: decimalString(decimal(from.rate) * decimal(plan.rate) / SCALE),
        provider: [...new Set(references.map(r => r.provider).filter(p => p !== "USD numeraire"))].join(" + "),
        updatedAt: new Date(Math.min(...references.map(r => Date.parse(r.updatedAt)))).toISOString(),
        validUntil: Math.min(...references.map(r => r.validUntil)) };
    } };
}
export const referenceMarkets = marketRates();
