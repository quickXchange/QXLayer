import assert from "node:assert/strict";
import test from "node:test";
import { integrationIncluded, customerCredentialsAllowed, requireIntegrationGrant, customerSettings, mergeCustomerSettings, applyServiceDependencies } from "./service-policy";
import { pricingRevision, assertPublicationRevision } from "../commerce/pricing-publication";

const grant = {status:"active",features:{crypto_exchange:true,quickex:true,quickex_customer_credentials:true,whitebit:true,whitebit_customer_credentials:true,telegram_bot:true,telegram_mini_app:true}};
test("RPC, nodes, rates and unknown services remain forbidden despite arbitrary plan flags", () => {
  for (const key of ["rpc","alchemy","1forge","rpc_nodes","crypto_engine","unknown"]) {
    assert.equal(integrationIncluded({...grant,features:{...grant.features,[key]:true}},key),false);
    assert.throws(()=>requireIntegrationGrant({...grant,features:{...grant.features,[key]:true}},key));
  }
});
test("service grants deny missing, revoked, suspended and parentless service access", () => {
  for (const key of ["quickex","whitebit","telegram_bot","telegram_mini_app"]) {
    assert.equal(integrationIncluded(grant,key),true);
    assert.equal(integrationIncluded({...grant,status:"suspended"},key),false);
    assert.equal(integrationIncluded({...grant,features:{...grant.features,[key]:false}},key),false);
    assert.equal(integrationIncluded({...grant,features:{...grant.features,crypto_exchange:false}},key),false);
  }
  assert.equal(integrationIncluded({...grant,features:{...grant.features,telegram_bot:false}},"telegram_mini_app"),false);
  assert.equal(integrationIncluded({...grant,features:{...grant.features,telegram_mini_app:false}},"telegram_bot"),true);
});
test("own credentials require both grants, actual client_admin and exclusively customer ownership", () => {
  for (const key of ["quickex","whitebit"]) {
    for (const role of ["client_admin","staff","super_admin","unassigned"]) for (const mode of ["super_admin","both","customer"])
      assert.equal(customerCredentialsAllowed(grant,key,role,mode),role==="client_admin"&&mode==="customer");
    assert.equal(customerCredentialsAllowed({...grant,features:{...grant.features,[`${key}_customer_credentials`]:false}},key,"client_admin","customer"),false);
  }
  assert.equal(customerCredentialsAllowed(grant,"telegram_bot","client_admin","customer"),false);
});
test("customer projections omit central network endpoints, assignments and infrastructure", () => {
  assert.deepEqual(customerSettings("quickex",{rpcUrl:"secret",adapterKind:"evm",assignments:[1],quoteActions:["convert"],chainId:"1",customerActivation:true}),{customerActivation:true});
  assert.deepEqual(customerSettings("telegram_bot",{botUsername:"private",webhookUrl:"private",miniAppUrl:"private",primaryColor:"#ffffff",menu:["swap"]}),{primaryColor:"#ffffff",menu:["swap"]});
});
test("customer sparse updates preserve master settings; hostile updates are rejected", () => {
  const old={quoteActions:["convert"],assignments:[{assetId:"a"}],customerActivation:true};
  assert.deepEqual(mergeCustomerSettings("quickex",old,{}),old);
  for (const input of [{assignments:[]},{quoteActions:[]},{customerActivation:false},{rpcUrl:"https://example.invalid"}])
    assert.throws(()=>mergeCustomerSettings("quickex",old,input));
  assert.deepEqual(mergeCustomerSettings("telegram_bot",{webhookUrl:"protected"},{primaryColor:"#ffffff"}),{webhookUrl:"protected",primaryColor:"#ffffff"});
});
test("plan/addon/override dependency removal revokes child credentials and Mini App", () => {
  const features={...grant.features,crypto_exchange:false},sources:Record<string,string>={};
  applyServiceDependencies(features,sources);
  for(const key of ["quickex","whitebit","quickex_customer_credentials","whitebit_customer_credentials","telegram_bot","telegram_mini_app"])
    assert.equal(features[key as keyof typeof features],false);
});
test("pricing preview digests are stable and require both current draft and public revision", () => {
  const a=pricingRevision({plans:[{name:"A",price:"10",features:["swap"]}],addons:[]});
  assert.equal(a,pricingRevision({addons:[],plans:[{features:["swap"],price:"10",name:"A"}]}));
  assert.notEqual(a,pricingRevision({plans:[{name:"A",price:"20",features:["swap"]}],addons:[]}));
  assertPublicationRevision(a,a,null,null);
  assert.throws(()=>assertPublicationRevision(a,"old",null,null));
  assert.throws(()=>assertPublicationRevision(a,a,"new","old"));
});
