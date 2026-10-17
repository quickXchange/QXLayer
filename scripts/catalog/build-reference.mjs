// Refresh reference data explicitly; this script never connects to an application database.
// Approved QuickXchange source-only exports are supplied separately as --quickx=/path/file.json.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const quickxPath = process.argv.find(a => a.startsWith("--quickx="))?.slice(9);
if (!quickxPath) throw Error("Provide verified QuickXchange reference exports; never use business database exports.");
const q = JSON.parse(await readFile(quickxPath));
const visuals = JSON.parse(await readFile("artifacts/api-server/src/products/exchange/visual-catalog.json")).assets;
const sources = {
  iso: "https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml",
  regions: "https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-core/supplemental/currencyData.json",
  names: "https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-numbers-full/main/en/currencies.json",
  chains: "https://chainid.network/chains.json",
};
const raw = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([k,url]) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`Reference fetch ${k} status ${r.status}`); return [k,await r.text()];
})));
const regions = JSON.parse(raw.regions).supplemental.currencyData.region;
const names = JSON.parse(raw.names).main.en.numbers.currencies;
const chains = JSON.parse(raw.chains);
const entries = [], links = [], countryMap = new Map(), iso = new Map();
const day = new Date().toISOString().slice(0,10);
for (const block of raw.iso.matchAll(/<CcyNtry>([\s\S]*?)<\/CcyNtry>/g)) {
  const code = block[1].match(/<Ccy>([^<]+)</)?.[1], precision = block[1].match(/<CcyMnrUnts>(\d+)</)?.[1];
  if (code && precision) iso.set(code, { decimals:Number(precision), numericCode:block[1].match(/<CcyNbr>([^<]+)</)?.[1] ?? "" });
}
for (const [country, periods] of Object.entries(regions)) {
  if (!/^[A-Z]{2}$/.test(country) || ["DZ","IL","ZZ"].includes(country)) continue;
  for (const period of periods) for (const [code,p] of Object.entries(period)) {
    if (p._tender === "false" || (p._to && p._to <= day) || (p._from && p._from > day) || !iso.has(code) || ["DZD","ILS"].includes(code)) continue;
    const countries = countryMap.get(code) ?? new Set(); countries.add(country); countryMap.set(code,countries);
  }
}
const logo = (kind, code) => visuals.find(v => v.kind === kind && v.code === code)?.logoUrl ?? null;
const add = (kind,id,code,name,metadata,status="enabled",logoUrl=null) =>
  entries.push({kind,id,code,name,status,logoUrl,metadata,revision:0});
for (const [code,countries] of countryMap) {
  const countryCodes = [...countries].sort(), flagCountry = code === "EUR" ? "EU" : countryCodes[0];
  add("currencies",code,code,names[code]?.displayName ?? code,{
    ...iso.get(code),symbol:names[code]?.symbol ?? code,countryCodes,flagCountry,
    sourceUrl:sources.iso,verified:true,
  },"enabled",logo("flag",flagCountry) ?? `https://flagcdn.com/${flagCountry.toLowerCase()}.svg`);
}
const docs = {
  "sepa-transfer":"https://www.europeanpaymentscouncil.eu/what-we-do/sepa-credit-transfer",
  "sepa-instant":"https://www.europeanpaymentscouncil.eu/what-we-do/sepa-instant-credit-transfer",
  ach:"https://www.nacha.org/content/ach-network", fedwire:"https://www.frbservices.org/financial-services/wires",
  "faster-payments":"https://www.wearepay.uk/what-we-do/payment-systems/faster-payment-system/",
  chaps:"https://www.bankofengland.co.uk/payment-and-settlement/chaps",
  interac:"https://www.interac.ca/en/payments/personal/send-receive-money-with-interac-e-transfer/",
  pix:"https://www.bcb.gov.br/en/financialstability/pix_en", spei:"https://www.banxico.org.mx/services/interbanking-electronic-payme.html",
  wise:"https://wise.com/help/articles/2897238/which-currencies-can-i-add-keep-and-receive-in-my-wise-account",
  "revolut-eur":"https://help.revolut.com/help/transfers/supported-countries-currencies/what-currencies-are-supported-for-outbound-transfer/",
  "revolut-usd":"https://help.revolut.com/help/transfers/supported-countries-currencies/what-currencies-are-supported-for-outbound-transfer/",
  n26:"https://support.n26.com/en-eu/payments-transfers-and-withdrawals/transfers/what-types-of-transfers-can-i-make",
  paysera:"https://www.paysera.com/v2/en/fees/transfers-in-euros",
  bunq:"https://www.bunq.com/personal-account/banking-features/sepa-payments",
  bbva:"https://www.bbva.es/en/personas/productos/cuentas/transferencias.html",
  "bnp-paribas":"https://mabanque.bnpparibas/en/our-offers/payment-and-cards",
  ing:"https://www.ing.com/Products-services.htm",
  commerzbank:"https://www.commerzbank.com/accounts-payment/transactions/sepa/",
  caixabank:"https://www.caixabank.es/particular/cuentas/transferencias_en.html",
  alipay:"https://global.alipay.com/docs/",
  "swift-bank-transfer":"https://www.swift.com/our-solutions/global-financial-messaging",
  "local-bank-transfer":"https://www.iso20022.org/",
};
const extra = {id:"n26",name:"N26",family:"bank-transfer",compatibleCurrencyCodes:["EUR"],countries:["DE","FR","ES","IT"],fields:[{key:"beneficiary_name",required:true},{key:"iban",required:true}]};
const conservative = {wise:["EUR","USD","GBP","AUD","CAD","CHF","SGD","JPY"],"revolut-eur":["EUR"],"revolut-usd":["USD"]};
for (const p of [...q.payments,extra]) {
  const sourceUrl = docs[p.id], verified = Boolean(sourceUrl);
  const currencies = conservative[p.id] ?? p.compatibleCurrencyCodes;
  const countryCodes = (p.countries ?? []).filter(c => /^[A-Z]{2}$/.test(c) && !["DZ","IL"].includes(c));
  add("payment_methods",p.id,p.id.toUpperCase(),p.name,{provider:p.name,category:p.family,countryCodes,
    requiredFields:p.fields.filter(f=>f.required).map(f=>f.key),sourceUrl:sourceUrl ?? "https://www.iso20022.org/",verified},
    verified ? "enabled":"catalog_only",
    logo("payment-method",p.name.toUpperCase()) ?? visuals.find(v=>v.kind==="payment-method" && v.name.toLowerCase()===p.name.toLowerCase())?.logoUrl ?? null);
  for (const code of currencies) if (countryMap.has(code)) links.push({
    id:`payment:${p.id}:${code}`,kind:"payment_fiat",sourceId:p.id,targetId:code,enabled:verified,verified,
    metadata:{countryCodes:countryCodes.length?countryCodes:[...countryMap.get(code)],sourceUrl:sourceUrl ?? "https://www.iso20022.org/"},
  });
}
const assetIds = new Map();
for (const v of visuals.filter(v=>v.kind==="crypto")) {
  if (assetIds.has(v.code)) continue;
  const id = v.recordId ?? v.code.toLowerCase(); assetIds.set(v.code,id);
  add("assets",id,v.code,v.name,{decimals:18,sourceUrl:"https://www.iso20022.org/",verified:false},"catalog_only",v.logoUrl);
}
const nativeChains = [
  ["BTC","bitcoin-mainnet","Bitcoin Mainnet",8,"bitcoin-mainnet","https://developer.bitcoin.org/reference/",false,"Bitcoin base58 or bech32",null],
  ["ETH","ethereum-mainnet","Ethereum ERC20",18,"1","https://ethereum.org/developers/docs/networks/",false,"0x + 40 hexadecimal characters",1],
  ["BNB","bsc-mainnet","BNB Smart Chain BEP20",18,"56","https://docs.bnbchain.org/bnb-smart-chain/",false,"0x + 40 hexadecimal characters",56],
  ["TRX","tron-mainnet","TRON TRC20",6,"mainnet","https://developers.tron.network/docs/account",false,"Base58Check starting T",null],
  ["POL","polygon-mainnet","Polygon PoS",18,"137","https://docs.polygon.technology/pos/",false,"0x + 40 hexadecimal characters",137],
  ["SOL","solana-mainnet","Solana",9,"mainnet-beta","https://solana.com/docs/core/accounts",false,"Base58 public key (32 bytes)",null],
  ["ETH","arbitrum-mainnet","Arbitrum One",18,"42161","https://docs.arbitrum.io/",false,"0x + 40 hexadecimal characters",42161],
  ["ETH","optimism-mainnet","OP Mainnet",18,"10","https://docs.optimism.io/",false,"0x + 40 hexadecimal characters",10],
  ["ETH","base-mainnet","Base",18,"8453","https://docs.base.org/",false,"0x + 40 hexadecimal characters",8453],
  ["AVAX","avalanche-mainnet","Avalanche C-Chain",18,"43114","https://build.avax.network/docs",false,"0x + 40 hexadecimal characters",43114],
  ["LTC","litecoin-mainnet","Litecoin",8,"mainnet","https://litecoin.org/",false,"Litecoin base58 or ltc1 bech32",null],
  ["XRP","xrp-mainnet","XRP Ledger",6,"0","https://xrpl.org/docs/concepts/accounts",true,"XRP classic address; destination tag where required",null],
  ["TON","ton-mainnet","TON",9,"-239","https://docs.ton.org/",true,"TON user-friendly or raw account address",null],
  ["ADA","cardano-mainnet","Cardano",6,"1","https://docs.cardano.org/",false,"Cardano bech32 addr1 address",null],
  ["DOGE","dogecoin-mainnet","Dogecoin",8,"mainnet","https://dogecoin.com/",false,"Dogecoin Base58Check address",null],
  ["DOT","polkadot-mainnet","Polkadot",10,"polkadot","https://docs.polkadot.com/",false,"SS58 prefix 0",null],
  ["BTC","bitcoin-testnet","Bitcoin Testnet",8,"testnet3","https://developer.bitcoin.org/reference/",false,"Bitcoin testnet base58/bech32",null],
  ["ETH","ethereum-sepolia","Ethereum Sepolia",18,"11155111","https://ethereum.org/developers/docs/networks/",false,"0x + 40 hexadecimal characters",null],
];
for (const [symbol,id,name,decimals,chainId,sourceUrl,memoRequired,addressFormat,evm] of nativeChains) {
  if (evm && !chains.some(c=>c.chainId===evm && c.nativeCurrency?.symbol===symbol)) throw Error(`Chain registry mismatch ${id}`);
  let assetId = assetIds.get(symbol);
  if (!assetId) { assetId=symbol.toLowerCase(); assetIds.set(symbol,assetId);add("assets",assetId,symbol,symbol,{decimals,sourceUrl,verified:true},"enabled",logo("crypto",symbol)); }
  const asset=entries.find(e=>e.kind==="assets"&&e.id===assetId);
  Object.assign(asset,{status:"enabled",metadata:{decimals,sourceUrl,verified:true}});
  const testnet = ["bitcoin-testnet","ethereum-sepolia"].includes(id);
  add("networks",id,id.toUpperCase(),name,{chainId,addressFormat,memoRequired,testnet,sourceUrl,verified:true},"enabled",logo("crypto",symbol));
  links.push({id:`asset:${assetId}:${id}`,kind:"asset_network",sourceId:assetId,targetId:id,enabled:true,verified:true,
    metadata:{legacyAssetNetworkId:`${assetId}:${id}`,native:true,decimals,memoRequired,addressFormat,sourceUrl}});
}
const tokenSource = "https://developers.circle.com/stablecoins/usdc-contract-addresses";
const tetherSource = "https://tether.to/supported-protocols/";
const tokens = [
  ["USDT","ethereum-mainnet","0xdac17f958d2ee523a2206206994597c13d831ec7",tetherSource],
  ["USDT","tron-mainnet","TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",tetherSource],
  ["USDT","avalanche-mainnet","0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7",tetherSource],
  ["USDC","ethereum-mainnet","0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",tokenSource],
  ["USDC","solana-mainnet","EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",tokenSource],
  ["USDC","arbitrum-mainnet","0xaf88d065e77c8cC2239327C5EDb3A432268e5831",tokenSource],
  ["USDC","optimism-mainnet","0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",tokenSource],
  ["USDC","base-mainnet","0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",tokenSource],
  ["USDC","polygon-mainnet","0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",tokenSource],
  ["USDC","avalanche-mainnet","0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",tokenSource],
];
for (const [symbol,network,contractAddress,sourceUrl] of tokens) {
  const assetId=assetIds.get(symbol), a=entries.find(e=>e.kind==="assets"&&e.id===assetId);
  Object.assign(a,{status:"enabled",metadata:{decimals:6,sourceUrl,verified:true}});
  const net=entries.find(e=>e.kind==="networks"&&e.id===network);
  links.push({id:`asset:${assetId}:${network}`,kind:"asset_network",sourceId:assetId,targetId:network,enabled:true,verified:true,
    metadata:{legacyAssetNetworkId:`${assetId}:${network}`,native:false,contractAddress,decimals:6,memoRequired:false,addressFormat:net.metadata.addressFormat,sourceUrl}});
}
const bundle = {entries:entries.sort((a,b)=>(a.kind+a.code).localeCompare(b.kind+b.code)),links};
// The BSC representation is not issuer-native USDt. Retain accurate reference
// metadata, but do not make it selectable until the operator approves support.
links.push({id:"asset:usdt:bsc-mainnet",kind:"asset_network",sourceId:assetIds.get("USDT"),targetId:"bsc-mainnet",
  enabled:false,verified:true,metadata:{legacyAssetNetworkId:`${assetIds.get("USDT")}:bsc-mainnet`,native:false,decimals:18,
    contractAddress:"0x55d398326f99059ff775485246999027b3197955",memoRequired:false,addressFormat:"0x + 40 hexadecimal characters",
    representation:"Binance-Peg BSC-USD; not issuer-native USDt",sourceUrl:"https://bscscan.com/token/0x55d398326f99059ff775485246999027b3197955"}});
if (entries.some(e=>e.kind==="currencies"&&["DZD","ILS"].includes(e.code))) throw Error("Excluded currency");
if (new Set(entries.map(e=>`${e.kind}:${e.id}`)).size!==entries.length) throw Error("Duplicate canonical identity");
await writeFile("artifacts/api-server/src/products/exchange/catalog-reference.json",JSON.stringify(bundle,null,2)+"\n");
await writeFile("docs/exchange-catalog-provenance.json",JSON.stringify({retrievedAt:day,sources,
  hashes:Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,createHash("sha256").update(v).digest("hex")])),
  quickxSha256:createHash("sha256").update(await readFile(quickxPath)).digest("hex"),
  counts:Object.fromEntries(["currencies","payment_methods","assets","networks"].map(k=>[k,entries.filter(e=>e.kind===k).length])),
  mappings:links.length,financialExecution:false,notes:"QuickXchange source-only catalogs adapted. Unverified payment providers and asset deployments remain catalog-only; no routes or tenant activation are generated."
},null,2)+"\n");
console.log("Reference catalog generated:",Object.fromEntries(["currencies","payment_methods","assets","networks"].map(k=>[k,entries.filter(e=>e.kind===k).length])),"links",links.length);
