import assert from "node:assert/strict";
import {test} from "node:test";
import {emptySettings} from "./settings";
import {calculateQuote} from "./calculation";
import {selectPricingRule} from "./pricing-rules";
import type {ExchangeSettings,ExchangeCatalogAsset} from "@workspace/api-zod";
const catalog=["usdt","btc","eth"].map(assetId=>({assetId,assetNetworkId:`${assetId}:net`,symbol:assetId.toUpperCase(),decimals:8})) as ExchangeCatalogAsset[];
function setup():ExchangeSettings{
 const s={...emptySettings(),enabled:true,fiatCurrency:"EUR",fiatCurrencies:["EUR"],fiatPlanRate:"1",
 actions:{buy:false,sell:false,swap:true,convert:true},
 assets:catalog.map(c=>({assetId:c.assetId,symbol:c.symbol,enabled:true,decimals:8,displayOrder:0,logoUrl:null,sandboxPlanRate:"1"})),
 networks:catalog.map(c=>({assetNetworkId:c.assetNetworkId,enabled:true,available:true,minimum:"0",maximum:"100000",fee:"0",information:""})),
 paymentMethods:["sepa","revolut","wise"].map(id=>({id,label:id,currency:"EUR",enabled:true,buy:true,sell:true})),
 routes:catalog.flatMap((c,i)=>[
 {id:`out-${i}`,action:"swap" as const,source:c.assetNetworkId,destination:"fiat:EUR",enabled:true,rate:"2",minimum:"0",maximum:"100000",feeBps:999,fixedFee:"1",spreadBps:99,paymentMethodIds:["sepa","revolut","wise"]},
 {id:`in-${i}`,action:"swap" as const,source:"fiat:EUR",destination:c.assetNetworkId,enabled:true,rate:"0.5",minimum:"0",maximum:"100000",feeBps:0,fixedFee:"0",spreadBps:0,paymentMethodIds:["sepa","revolut","wise"]}]),
 pricingRules:[{id:"one",action:"swap" as const,source:"crypto:*",destination:"fiat:EUR",enabled:true,priority:10,feeBps:100,fixedFee:"0",spreadBps:0}]};
 return s;
}
test("ONE ANY→EUR rule matches three eligible crypto/method combinations; reverse is independent",()=>{
 const s=setup();
 catalog.forEach((c,i)=>{const q=calculateQuote(s,catalog,{action:"swap",source:c.assetNetworkId,destination:"fiat:EUR",amount:"100",paymentMethodId:["sepa","revolut","wise"][i]}).quote;
 assert.equal(q.pricingRuleId,"one");assert.equal(q.outputAmount,"198");assert.equal(q.fee,"1");});
 assert.equal(selectPricingRule(s,{action:"swap",source:"fiat:EUR",destination:"usdt:net",amount:"100",paymentMethodId:"sepa"},catalog),undefined);
 s.pricingRules!.push({...s.pricingRules![0],id:"reverse",source:"fiat:EUR",destination:"crypto:*",feeBps:200});
 assert.equal(calculateQuote(s,catalog,{action:"swap",source:"fiat:EUR",destination:"usdt:net",amount:"100",paymentMethodId:"sepa"}).quote.outputAmount,"49");
});
test("exact method rule overrides ANY, fee changes are immediate, asset-wide scope and block are deterministic",()=>{
 const s=setup(),input={action:"swap" as const,source:"usdt:net",destination:"fiat:EUR",amount:"100",paymentMethodId:"sepa"};
 s.pricingRules!.push({...s.pricingRules![0],id:"specific",source:"usdt:net",paymentMethodId:"sepa",feeBps:50});
 assert.equal(calculateQuote(s,catalog,input).quote.outputAmount,"199");
 s.pricingRules![1].feeBps=200;
 assert.equal(calculateQuote(s,catalog,input).quote.outputAmount,"196");
 s.pricingRules![1]={...s.pricingRules![1],source:"asset:usdt"};
 assert.equal(selectPricingRule(s,input,catalog)?.id,"specific");
 s.pricingRules![1].state="blocked";
 assert.throws(()=>calculateQuote(s,catalog,input),/blocked/);
});
test("rule limits cannot widen route limits and optional restrictions select a fallback outside their routes",()=>{
 const s=setup(),input={action:"swap" as const,source:"usdt:net",destination:"fiat:EUR",amount:"100",paymentMethodId:"sepa"};
 s.routes[0].minimum="10";s.routes[0].maximum="500";
 s.pricingRules![0].minimum="0";s.pricingRules![0].maximum="1000000";
 const q=calculateQuote(s,catalog,input).quote;
 assert.equal(q.minimum,"10");assert.equal(q.maximum,"500");
 assert.throws(()=>calculateQuote(s,catalog,{...input,amount:"501"}),/between 10 and 500/);
 s.pricingRules!.push({...s.pricingRules![0],id:"restricted",priority:20,feeBps:200,routeIds:["out-1"]});
 assert.equal(selectPricingRule(s,input,catalog)?.id,"one");
 assert.equal(selectPricingRule(s,{...input,source:"btc:net"},catalog)?.id,"restricted");
});
