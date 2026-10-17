import assert from "node:assert/strict";
import {test} from "node:test";
import {marketRates} from "./market-rates";
import {decimal} from "../../modules/entitlements/decimal";
const now=Date.parse("2026-10-17T12:00:00Z");
test("real-provider contracts build directional cross rates without assuming stablecoins equal one dollar",async()=>{
  let calls=0;
  const markets=marketRates(async url=>{
    calls++;
    if(url.includes("frankfurter"))return {base:"USD",date:"2026-10-16",rates:{EUR:0.9}};
    const ids=new URL(url).searchParams.get("ids")!.split(",");
    return Object.fromEntries(ids.map(id=>[id,{usd:id==="tether"?0.99:100,last_updated_at:now/1000-10}]));
  },()=>now);
  const a={symbol:"USDT",fiat:false},b={symbol:"EUR",fiat:true};
  const forward=await markets.pair(a,b,"EUR"),reverse=await markets.pair(b,a,"EUR");
  assert.equal(forward.rate,"0.891");assert.equal(forward.sourcePlanRate,"0.891");
  assert(reverse.provider.includes("CoinGecko")&&reverse.provider.includes("Frankfurter"));
  const product=decimal(forward.rate)*decimal(reverse.rate)/10n**18n;
  assert(product<=decimal("1")&&product>decimal("0.999999999999"));
  assert.equal(calls,2,"fresh reference fetches coalesce; rules/fees are not cached");
  await markets.cryptoUsd("BTC");
  assert.equal(calls,2,"a second asset uses the same bounded CoinGecko bundle, not another public API request");
});
test("stale or missing prices, unsupported coverage and blocked currencies fail closed",async()=>{
  const stale=marketRates(async()=>({bitcoin:{usd:100,last_updated_at:now/1000-181}}),()=>now);
  await assert.rejects(()=>stale.cryptoUsd("BTC"),/stale/);
  const missing=marketRates(async()=>({}),()=>now);
  await assert.rejects(()=>missing.cryptoUsd("USDT"),/stale/);
  assert.throws(()=>missing.cryptoUsd("UNKNOWN"),/verified market/);
  assert.throws(()=>missing.usdFiat("DZD"),/Unsupported/);
  const oldFx=marketRates(async()=>({base:"USD",date:"2026-10-01",rates:{EUR:0.9}}),()=>now);
  await assert.rejects(()=>oldFx.usdFiat("EUR"),/stale/);
});
test("verified Kraken last-trade fallback keeps timestamps, real stablecoin prices and coalesced failures",async()=>{
 const calls:string[]=[];
 const markets=marketRates(async url=>{
  calls.push(url);
  if(url.includes("coingecko"))throw new Error("upstream unavailable");
  if(url.includes("pair=USDTUSD"))return{error:[],result:{USDTZUSD:[["0.99871","1",now/1000-5]],last:"cursor"}};
  if(url.includes("pair=ETHUSD"))return{error:[],result:{XETHZUSD:[["2376.49","1",now/1000-6]],last:"cursor"}};
  throw new Error("unverified market");
 },()=>now);
 const [a,b]=await Promise.all([markets.cryptoUsd("USDT"),markets.cryptoUsd("USDT")]);
 assert.equal(a.rate,"0.99871");assert.equal(a.updatedAt,new Date(now-5000).toISOString());
 assert.equal(a.validUntil,now-5000+180000);assert.match(a.provider,/Kraken.*CoinGecko unavailable/);assert.deepEqual(a,b);
 assert.equal((await markets.cryptoUsd("ETH")).rate,"2376.49");
 assert.equal(calls.filter(u=>u.includes("coingecko")).length,1,"short failure cache avoids hammering the primary");
 assert.equal(calls.filter(u=>u.includes("USDTUSD")).length,1,"simultaneous reads coalesce");
});
test("Kraken fallback never accepts stale, future, missing, wrong-pair or malformed prices",async()=>{
 for(const row of[["100","1",now/1000-181],["100","1",now/1000+11],["0","1",now/1000],["-1","1",now/1000],["bad","1",now/1000]]){
  const m=marketRates(async url=>url.includes("coingecko")?{}:{error:[],result:{XXBTZUSD:[row]}},()=>now);
  await assert.rejects(()=>m.cryptoUsd("BTC"),/stale or unavailable/);
 }
 for(const data of[{error:["EGeneral:Permission denied"],result:{XXBTZUSD:[["100","1",now/1000]]}},
  {error:[],result:{XETHZUSD:[["100","1",now/1000]]}},{error:[],result:{XXBTZUSD:[]}}]){
  const m=marketRates(async url=>url.includes("coingecko")?{}:data,()=>now);
  await assert.rejects(()=>m.cryptoUsd("BTC"),/stale or unavailable/);
 }
 let kraken=false;const noAlias=marketRates(async url=>{if(url.includes("kraken"))kraken=true;throw Error("Unavailable");},()=>now);
 await assert.rejects(()=>noAlias.cryptoUsd("WBTC"));assert.equal(kraken,false,"wrapped assets never substitute another asset's price");
});
