import { test } from "node:test";
import assert from "node:assert/strict";
import reference from "./catalog-reference.json";
import { validateCatalogEntry, validateCatalogMetadata, validActionPair, currentOfferings, fiatPrecision, globalCatalog } from "./global-catalog";
import { calculateQuote } from "./calculation";
import { emptySettings } from "./settings";
import { selectPricingRule,validatePricingRules } from "./pricing-rules";
import { paymentInstructionsSnapshot } from "./payment-snapshot";
import type { ExchangeSettings, ExchangeCatalogAsset, GlobalCatalogEntry } from "@workspace/api-zod";
import type { Principal } from "../../modules/authentication/service";

test("ISO catalog is canonical, comprehensive and excludes DZD/ILS and DZ/IL mappings",()=>{
 const fiat=reference.entries.filter(e=>e.kind==="currencies");
 assert(fiat.length>=145);
 assert.equal(new Set(fiat.map(e=>e.code)).size,fiat.length);
 assert(!fiat.some(e=>["DZD","ILS"].includes(e.code)));
 for(const e of fiat) { const m=e.metadata as {countryCodes:string[]};assert(!m.countryCodes.some(c=>["DZ","IL"].includes(c))); }
 assert((fiat.find(e=>e.code==="EUR")!.metadata as {countryCodes:string[]}).countryCodes.length>10);
 assert.equal(fiatPrecision("JPY"),0);assert.equal(fiatPrecision("KWD"),3);
});
test("enabled mappings have the right canonical parents, evidence and exact token identities",()=>{
 for(const l of reference.links) {
  const [s,t]=l.kind==="payment_fiat"?["payment_methods","currencies"]:["assets","networks"];
  assert(reference.entries.some(e=>e.kind===s&&e.id===l.sourceId));
  assert(reference.entries.some(e=>e.kind===t&&e.id===l.targetId));
  if(l.enabled){assert(l.verified);assert(l.metadata.sourceUrl.startsWith("https://"));}
  if(l.kind==="asset_network" && !(l.metadata as {native?:boolean}).native) assert((l.metadata as {contractAddress?:string}).contractAddress);
 }
 const usdt=reference.links.find(l=>l.kind==="asset_network"&&l.sourceId==="usdt"&&l.targetId==="tron-mainnet")!;
 assert.equal((usdt.metadata as {contractAddress:string}).contractAddress,"TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
});
test("unverified entries, excluded territories and invalid precision cannot be silently enabled",()=>{
 const usd=reference.entries.find(e=>e.kind==="currencies"&&e.id==="USD") as GlobalCatalogEntry;
 assert.throws(()=>validateCatalogEntry({...usd,metadata:{...usd.metadata,verified:false}}),/verified/);
 assert.throws(()=>validateCatalogEntry({...usd,id:"DZD",code:"DZD"}),/excluded/);
 assert.throws(()=>validateCatalogMetadata("currencies",{countryCodes:["IL"]}),/excluded/);
 assert.throws(()=>validateCatalogMetadata("assets",{decimals:19}),/Decimals/);
 assert.throws(()=>validateCatalogMetadata("assets",{apiSecret:"not-permitted"}),/Unsupported/);
});
test("customer cannot mutate global reference data even with a forged patch",async()=>{
 const p={role:"client_admin",userId:"fixture-only",memberships:[]} as unknown as Principal;
 await assert.rejects(()=>globalCatalog(p,{entries:[]}),/Super administrator/);
});
const net="btc:bitcoin-testnet",method="00000000-0000-4000-8000-000000000001";
const crypto=[{assetNetworkId:net,assetId:"btc",symbol:"BTC",name:"Bitcoin",networkId:"bitcoin-testnet",networkName:"Bitcoin Testnet",testnet:true,decimals:8}] satisfies ExchangeCatalogAsset[];
function fixture():ExchangeSettings {
 return {...emptySettings(),enabled:true,fiatPlanRate:"1",fiatCurrencies:["USD","EUR","JPY"],fiatPlanRates:{USD:"1",EUR:"1.1",JPY:"0.007"},
  actions:{swap:true,convert:true,buy:false,sell:false},
  assets:[{assetId:"btc",enabled:true,displayOrder:0,symbol:"BTC",decimals:8,logoUrl:null,sandboxPlanRate:"50000"}],
  networks:[{assetNetworkId:net,enabled:true,available:true,minimum:"0",maximum:"10",fee:"0",information:"Sandbox"}],
  paymentMethods:[{id:method,catalogId:"ach",label:"Demo ACH",currency:"USD",currencies:["USD"],buy:false,sell:false,
    enabled:true,instructions:"Sandbox only — never send money.",accountFields:{beneficiary_name:"Solara Sandbox",bank_account_number:"00000000"}}],
  routes:[{id:"00000000-0000-4000-8000-000000000002",source:net,destination:"fiat:USD",action:"swap",enabled:true,
    rate:"50000",minimum:"0.001",maximum:"1",feeBps:0,fixedFee:"0",spreadBps:0,paymentMethodIds:[method]},
   {id:"00000000-0000-4000-8000-000000000003",source:"fiat:USD",destination:net,action:"swap",enabled:true,
    rate:"0.00002",minimum:"10",maximum:"10000",feeBps:0,fixedFee:"0",spreadBps:0,paymentMethodIds:[method]}]};
}
test("Swap crypto/fiat works both directions and rejects incompatible payment currency",()=>{
 const s=fixture();
 assert.equal(calculateQuote(s,crypto,{action:"swap",source:net,destination:"fiat:USD",amount:"0.01",paymentMethodId:method}).quote.outputAmount,"500");
 assert.equal(calculateQuote(s,crypto,{action:"swap",source:"fiat:USD",destination:net,amount:"500",paymentMethodId:method}).quote.outputAmount,"0.01");
 assert.throws(()=>calculateQuote({...s,paymentMethods:s.paymentMethods.map(m=>({...m,currencies:["EUR"]}))},crypto,
  {action:"swap",source:net,destination:"fiat:USD",amount:"0.01",paymentMethodId:method}),/payment method/);
 assert(!validActionPair("swap",net,"eth:test"));assert(!validActionPair("convert","fiat:USD",net));
 assert(!validActionPair("buy","fiat:USD",net));
 assert.match(paymentInstructionsSnapshot(s,{action:"swap",source:"fiat:USD",destination:net,amount:"500",paymentMethodId:method})!,/Solara Sandbox/);
});
test("typed Any Crypto / Any Fiat rules are less specific than an exact pair",()=>{
 const s=fixture(),base={id:method,action:"swap" as const,source:"crypto:*",destination:"fiat:*",enabled:true,priority:100,feeBps:0,fixedFee:"0",spreadBps:0};
 s.pricingRules=[base,{...base,id:"00000000-0000-4000-8000-000000000004",source:net,destination:"fiat:USD",priority:0}];
 assert.equal(selectPricingRule(s,{action:"swap",source:net,destination:"fiat:USD",amount:"0.01"})?.priority,0);
});
test("Any Crypto→Any Crypto is valid for Convert, not Swap or fiat-to-fiat",()=>{
 const s=fixture();
 const r={id:method,action:"convert" as const,source:"crypto:*",destination:"crypto:*",enabled:true,priority:1,feeBps:0,fixedFee:"0",spreadBps:0};
 s.pricingRules=[r];assert.doesNotThrow(()=>validatePricingRules(s));
 s.pricingRules=[{...r,action:"swap"}];assert.throws(()=>validatePricingRules(s),/action/);
 s.pricingRules=[{...r,source:"fiat:*",destination:"fiat:*"}];assert.throws(()=>validatePricingRules(s));
});
test("retirement preserves stored history/configuration and cannot create routes from catalog data",()=>{
 const s=fixture();s.actions.buy=true;
 s.routes.push({...s.routes[0],action:"buy",id:"00000000-0000-4000-8000-000000000005"});
 const before=JSON.stringify(s),projected=currentOfferings(s);
 assert.equal(JSON.stringify(s),before);assert.equal(projected.actions.buy,false);
 assert.equal(projected.routes.at(-1)?.enabled,false);
 assert.equal(currentOfferings(emptySettings()).routes.length,0);
});
