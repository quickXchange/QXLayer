import assert from "node:assert/strict";
import test from "node:test";
import { UpdateLandingProductBody } from "@workspace/api-zod";
import { assertPublicArtworkUrl, defaultExploreContent } from "./explore-content";
import { saveProduct, listProducts } from "./service";
import type { Principal } from "../authentication/service";

const keys = ["crypto_exchange","crypto_payments","crypto_card","crypto_engine","ios_app","android_app","staking","earn","dex","articles","telegram_bot","telegram_mini_app","whatsapp_bot","rpc_nodes","cloud_mining"];
for (const key of keys) test(`Explore content contract and safe claims: ${key}`, () => {
  const explore = defaultExploreContent(key, `Product ${key}`, "A database-managed product description.");
  const parsed = UpdateLandingProductBody.parse({ visible:true,name:`Product ${key}`,description:"A database-managed product description.",icon:"engine",startingPrice:null,setupFee:null,currency:"EUR",billingPeriod:"on_request",status:"coming_soon",ctaLabel:"Explore",displayOrder:1,explore });
  assert(parsed.explore?.headline);
  for (const section of ["features","benefits","steps","integrations","useCases","faqs"] as const) assert(parsed.explore![section].length > 0);
  assert.match(explore.faqs[0].answer, key === "crypto_exchange" ? /non-executing sandbox/ : /Coming Soon/);
});
test("existing services have distinctive marketing headlines", () => {
  assert.equal(new Set(keys.map(k=>defaultExploreContent(k,k,"A service description").headline)).size,keys.length);
});
test("future registered services receive a complete reusable content template", () => {
  const content=defaultExploreContent("future_service","Future Service","A future service description.");
  assert.match(content.headline,/Future Service/);
  assert.match(content.faqs[0].answer,/Coming Soon/);
});
test("artwork permits public HTTPS only, never credential or private-network URLs", () => {
  for (const good of ["","https://images.example.com/product.png"]) assert.doesNotThrow(()=>assertPublicArtworkUrl(good));
  for (const bad of ["javascript:alert(1)","data:image/svg+xml,test","http://images.example.com/a.png","https://user:pass@images.example.com/p.png","https://localhost/a.png","https://127.0.0.1/a.png","https://10.1.1.1/a.png","https://192.168.1.1/a.png","https://172.16.0.1/a.png","https://169.254.169.254/a.png","https://example.local/a.png","https://[::1]/a.png"])
    assert.throws(()=>assertPublicArtworkUrl(bad),/public HTTPS|public network|private network/);
});
for(const role of ["client_admin","staff","unassigned"] as const) test(`CMS read/write denied before any SQL for ${role}`, async()=>{
  const p={userId:"qa:role-only",role,memberships:[]} as unknown as Principal;
  assert.throws(()=>saveProduct(p,"crypto_exchange",{} as never),e=>(e as any).status===403||(e as any).statusCode===403);
  await assert.rejects(async()=>listProducts(p),e=>(e as any).status===403||(e as any).statusCode===403);
});
