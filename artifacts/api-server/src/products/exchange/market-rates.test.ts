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
