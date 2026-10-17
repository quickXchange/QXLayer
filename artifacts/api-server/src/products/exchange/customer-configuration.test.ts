import assert from "node:assert/strict";
import test from "node:test";
import type { ExchangeSettings } from "@workspace/api-zod";
import { customerExchangeConfiguration, mergeCustomerExchangeConfiguration } from "./customer-configuration";
const grants={features:{swap:true,buy:false,convert:false,sell:false}};
const settings={actions:{swap:true,buy:true,convert:false,sell:false},
  routes:[{id:"allowed",action:"swap"},{id:"hidden",action:"buy"}],
  pricingRules:[{id:"allowed-rule",action:"swap"},{id:"hidden-rule",action:"buy"}],
  wallets:[{id:"master-wallet"}],providers:[{providerId:"central-rpc"}]} as unknown as ExchangeSettings;
test("customer Exchange reads exclude monitoring and ungranted action configuration",()=>{
  const view=customerExchangeConfiguration(settings,grants);
  assert.deepEqual(view.wallets,[]);
  assert.deepEqual(view.providers,[]);
  assert.deepEqual(view.actions,{swap:true,buy:false,convert:false,sell:false});
  assert.deepEqual(view.routes.map(r=>r.id),["allowed"]);
  assert.deepEqual(view.pricingRules?.map(r=>r.id),["allowed-rule"]);
});
test("customer saves retain hidden downgraded actions and central wallets",()=>{
  const view=customerExchangeConfiguration(settings,grants);
  const result=mergeCustomerExchangeConfiguration(view,settings,grants);
  assert.deepEqual(result,settings);
});
test("customer cannot inject an ungranted action, route, rule or infrastructure wallet",()=>{
  const view=customerExchangeConfiguration(settings,grants);
  for(const input of [
    {...view,actions:{...view.actions,buy:true}},
    {...view,routes:settings.routes},
    {...view,pricingRules:settings.pricingRules},
    {...view,wallets:settings.wallets},
    {...view,providers:settings.providers},
  ])assert.throws(()=>mergeCustomerExchangeConfiguration(input,settings,grants),(e:any)=>e.status===403);
});
test("customers manage only public-address records and cannot replace monitoring IDs", () => {
  const own = { id: "customer-wallet", purpose: "customer", providerKey: "rpc" };
  const existing = { ...settings, wallets: [...settings.wallets!, own] } as ExchangeSettings;
  const view = customerExchangeConfiguration(existing, grants);
  assert.deepEqual(view.wallets, [own]);
  assert.deepEqual(mergeCustomerExchangeConfiguration(view, existing, grants).wallets, [own, settings.wallets![0]]);
  const edited = { ...own, label: "Customer address" };
  assert.deepEqual(mergeCustomerExchangeConfiguration({ ...view, wallets: [edited] } as ExchangeSettings, existing, grants).wallets,
    [edited, settings.wallets![0]]);
  assert.throws(() => mergeCustomerExchangeConfiguration({ ...view, wallets: [{ ...own, id: "master-wallet" }] } as ExchangeSettings, existing, grants));
  assert.throws(() => mergeCustomerExchangeConfiguration({ ...view, wallets: [{ ...own, providerKey: "alchemy" }] } as ExchangeSettings, existing, grants));
});
