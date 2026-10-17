import assert from "node:assert/strict";
import test from "node:test";
import {UpdateLandingProductBody} from "@workspace/api-zod";
import {defaultExploreContent,assertPublicArtworkUrl} from "./explore-content";
import {DEFAULT_CONCEPTS} from "./explore-concepts";
import {CAPTURED_MEDIA, ALL_CAPTURED_MEDIA, LEGACY_CAPTURED_MEDIA} from "./captured-media";
import {FEATURE_DETAILS} from "./explore-feature-copy";
const input=(key:string)=>({visible:true,name:key,description:"A managed product description.",icon:"engine",startingPrice:null,setupFee:null,currency:"EUR",billingPeriod:"on_request" as const,status:"coming_soon" as const,ctaLabel:"Explore",displayOrder:1,explore:defaultExploreContent(key,key,"A managed product description.")});
test("all fifteen product concepts have complete validated, distinct editable interfaces",()=>{
  const keys=Object.keys(DEFAULT_CONCEPTS).filter(key=>key!=="kolo");
  assert.equal(keys.length,15);
  const titles=new Set<string>();
  for(const key of keys){
    const parsed=UpdateLandingProductBody.parse(input(key));
    assert(parsed.explore?.conceptVisual);
    assert(parsed.explore.sectionVisibility?.heroVisual);
    assert.equal(parsed.explore.features.length,6);
    assert.equal(FEATURE_DETAILS[key].length,6);
    assert(parsed.explore.features.every(f=>f.body.length>100));
    titles.add(parsed.explore.conceptVisual.title);
  }
  assert.equal(titles.size,15);
});
test("capture provenance is limited to twelve actual shared Exchange interfaces",()=>{
  assert.deepEqual(Object.keys(CAPTURED_MEDIA),["crypto_exchange"]);
  const media=CAPTURED_MEDIA.crypto_exchange;
  assert.equal(media.length,12);
  assert(media.some(m=>m.device==="phone"));
  for(const m of media){assert.match(m.file,/^[a-f0-9]{24}\.webp$/);assert.equal(m.mediaKind,"application_capture");assert.match(m.sourceLabel,/sandbox.*fictional/i);assert.doesNotThrow(()=>assertPublicArtworkUrl(m.imageUrl));}
  assert.equal(defaultExploreContent("telegram_mini_app","Mini App","Description").gallery.length,0);
  assert(!media.some(m=>/invoice|telegram/i.test(m.title)));
  assert.equal(LEGACY_CAPTURED_MEDIA.crypto_exchange.length,6);
  assert.equal(new Set(ALL_CAPTURED_MEDIA.map(m=>m.file)).size,18);
  assert.equal(media[0].device,"desktop");
  assert.equal(media[1].device,"phone");
});
test("media provenance, frame and visibility survive CMS input validation",()=>{
  const body=input("crypto_exchange");
  body.explore.gallery[0]={...body.explore.gallery[0],device:"phone",mediaKind:"concept",sourceLabel:"Edited by the operator",visible:false};
  body.explore.sectionVisibility={...body.explore.sectionVisibility,features:false,heroVisual:false};
  body.explore.conceptVisual!.nav[0]="Custom navigation";
  const saved=UpdateLandingProductBody.parse(body).explore!;
  assert.equal(saved.gallery[0].visible,false);assert.equal(saved.gallery[0].device,"phone");
  assert.equal(saved.gallery[0].mediaKind,"concept");assert.equal(saved.gallery[0].sourceLabel,"Edited by the operator");
  assert.equal(saved.sectionVisibility?.features,false);assert.equal(saved.conceptVisual?.nav[0],"Custom navigation");
});
test("malformed editable concepts cannot strand a public render",()=>{
  for(const path of ["kpis","nav","bars"] as const){
    const body=input("telegram_bot");body.explore.conceptVisual![path]=[];
    assert.throws(()=>UpdateLandingProductBody.parse(body));
  }
  const body=input("telegram_bot");body.explore.conceptVisual!.phone.items=[];
  assert.throws(()=>UpdateLandingProductBody.parse(body));
});
test("marketing media paths cannot traverse or read arbitrary private objects",()=>{
  for(const bad of ["/api/public/marketing-media/../../private","/api/private/files/customer.webp","/api/public/marketing-media/a.webp?token=secret","//example.com/image.webp"])assert.throws(()=>assertPublicArtworkUrl(bad));
});
