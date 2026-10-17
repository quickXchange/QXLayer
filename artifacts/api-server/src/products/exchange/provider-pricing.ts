import type { DatabaseClient } from "@workspace/db";
import type { ExchangeSettings, ExchangeQuoteInput, ExchangeCatalogAsset } from "@workspace/api-zod";
import { HttpError } from "../../lib/errors";
import { resolveEntitlements, requireFeature } from "../../modules/entitlements/resolver";
import { open } from "../../modules/integrations/vault";
import { providerRate, positiveRate } from "../../modules/integrations/pricing-adapters";
import { decimal } from "../../modules/entitlements/decimal";
import { selectPricingRule } from "./pricing-rules";
import { isFiat } from "./global-catalog";
import { referenceMarkets, type ReferencePrice } from "./market-rates";

export interface PricingSnapshot {
  providerKey: string; revision: number; routeId: string; rate: string; manualFallback: boolean;
  sourceEndpoint?: string; sourceAssetId?:string; sourcePlanRate?: string; rateProvider?: string; rateUpdatedAt?: string;
  quoteKind?: "manual"|"indicative"|"provider"; validUntil?: number;
}
export function applyPricing(settings: ExchangeSettings, snapshot?: PricingSnapshot): ExchangeSettings {
  if (!snapshot) return settings;
  const rate = positiveRate(snapshot.rate);
  const assetPrefix=snapshot.sourceAssetId;
  return { ...settings, routes: settings.routes.map(r => r.id === snapshot.routeId ? { ...r, rate } : r),
    ...(snapshot.sourcePlanRate && snapshot.sourceEndpoint ? isFiat(snapshot.sourceEndpoint)
      ? {fiatPlanRates:{...settings.fiatPlanRates,[snapshot.sourceEndpoint.slice(5)]:snapshot.sourcePlanRate},
        ...(snapshot.sourceEndpoint===`fiat:${settings.fiatCurrency}`?{fiatPlanRate:snapshot.sourcePlanRate}:{})}
      : {assets:settings.assets.map(a=>a.assetId===assetPrefix?{...a,sandboxPlanRate:snapshot.sourcePlanRate!}:a)} : {}) };
}
export async function sandboxPricing(c: DatabaseClient, tenantId: string, input: ExchangeQuoteInput,
  settings: ExchangeSettings, catalog: ExchangeCatalogAsset[], planCurrency=settings.fiatCurrency): Promise<PricingSnapshot | undefined> {
  if (!settings.enabled || !settings.actions[input.action]) throw new HttpError(409, "This exchange action is paused.");
  const route = settings.routes.find(r => r.enabled && r.action === input.action && r.source === input.source && r.destination === input.destination);
  if (!route) throw new HttpError(400, "No enabled route exists for this pair.");
  const amount = decimal(input.amount);
  if (amount <= 0n || amount < decimal(route.minimum) || amount > decimal(route.maximum)) throw new HttpError(400, "Amount is outside this route's limits.");
  const rule = selectPricingRule(settings, input,catalog);
  if(!rule&&input.action==="swap"&&settings.pricingRules?.some(r=>r.pricingMode==="market"))
    throw new HttpError(409,"No pricing rule covers this Swap direction. Configure its own market or explicit manual rule.");
  if(rule?.pricingMode==="market") {
    const asset=(id:string)=> {
      if(isFiat(id))return {symbol:id.slice(5),fiat:true};
      const row=catalog.find(a=>a.assetNetworkId===id);
      if(!row||!settings.assets.some(a=>a.assetId===row.assetId&&a.enabled)||!settings.networks.some(n=>n.assetNetworkId===id&&n.enabled&&n.available))
        throw new HttpError(409,"Market pricing cannot enable an unavailable asset/network.");
      return {symbol:row.symbol,fiat:false};
    };
    const forex=async(code:string):Promise<ReferencePrice>=>{
      if(code!=="USD"){
        const rows=await c.query("SELECT * FROM tenant_integrations WHERE tenant_id=$1 AND provider_key='1forge' AND enabled=true",[tenantId]);
        const row=rows.rows[0];
        if(row?.encrypted_credentials&&row.health?.state==="connected"){
          try{
            const secrets=open({tenantId,providerKey:"1forge",environment:"sandbox"},row.encrypted_credentials);
            const url=new URL("https://api.1forge.com/quotes");
            url.searchParams.set("pairs",`USD/${code}`);url.searchParams.set("api_key",secrets.apiKey);
            const response=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(8000)});
            if(!response.ok)throw Error();
            const data=await response.json();
            const q=Array.isArray(data)&&data.find(x=>String(x.symbol??x.s).replace("/","")===`USD${code}`);
            const raw=Number(q?.timestamp??q?.t),at=raw<1e12?raw*1000:raw;
            if(!Number.isFinite(at)||Date.now()-at>180000||at>Date.now()+10000)throw Error();
            return {rate:positiveRate(q.price??q.p),provider:"1Forge",updatedAt:new Date(at).toISOString(),validUntil:at+180000};
          }catch{/* Explicit authorized Sandbox fallback; never manufacture a rate. */}
        }
      }
      return referenceMarkets.usdFiat(code);
    };
    const reference=await referenceMarkets.pair(asset(input.source),asset(input.destination),planCurrency,forex);
    return {providerKey:"market_reference",revision:0,routeId:route.id,rate:reference.rate,manualFallback:false,
      sourceEndpoint:input.source,sourceAssetId:catalog.find(a=>a.assetNetworkId===input.source)?.assetId,
      sourcePlanRate:reference.sourcePlanRate,rateProvider:reference.provider,
      rateUpdatedAt:reference.updatedAt,validUntil:reference.validUntil,quoteKind:"indicative"};
  }
  // An explicitly configured manual override never requires an external call.
  // The signed quote binds the entire tenant configuration, including this rule.
  if (rule?.rate !== undefined) return { providerKey: "manual_rule", revision: 0, routeId: route.id, rate: rule.rate, manualFallback: false };
  // Crypto/Fiat Swap is the manual desk, never a crypto conversion-provider call.
  if(input.action==="swap" && (isFiat(input.source)||isFiat(input.destination)))
    return {providerKey:"manual_rule",revision:0,routeId:route.id,rate:route.rate,manualFallback:false};
  const rows = await c.query(`SELECT * FROM tenant_integrations WHERE tenant_id=$1
    AND provider_key IN ('1forge','whitebit','quickex') AND settings->'quoteActions' ? $2`, [tenantId, input.action]);
  if (!rows.rowCount) return undefined;
  if (rows.rowCount !== 1) throw new HttpError(409, "Super Admin must assign exactly one pricing provider to this action.");
  const row = rows.rows[0];
  if (["quickex","whitebit"].includes(row.provider_key)) requireFeature(await resolveEntitlements(c,tenantId), row.provider_key);
  if (!row.enabled) throw new HttpError(409, "The assigned pricing provider is disabled.");
  const source = catalog.find(a => a.assetNetworkId === input.source);
  const destination = catalog.find(a => a.assetNetworkId === input.destination);
  const symbol = (id: string, asset?: ExchangeCatalogAsset) => {
    if (id === `fiat:${settings.fiatCurrency}`) return settings.fiatCurrency;
    const configured = asset && settings.assets.find(a => a.enabled && a.assetId === asset.assetId);
    if (!configured || !settings.networks.some(n => n.assetNetworkId === id && n.enabled && n.available))
      throw new HttpError(409, "The route asset/network is unavailable.");
    if (id === input.source && amount % (10n ** BigInt(18 - configured.decimals)) !== 0n)
      throw new HttpError(400, "Source amount exceeds its configured precision.");
    return configured.symbol;
  };
  const sourceSymbol = symbol(input.source, source), destinationSymbol = symbol(input.destination, destination);
  for (const asset of [source, destination]) if (asset && !(row.settings.assignments ?? []).some(
    (a: any) => a.assetId === asset.assetId && a.networkId === asset.networkId))
      throw new HttpError(403, "This provider is not assigned to both route asset/networks.");
  const snapshot: PricingSnapshot = { providerKey: row.provider_key, revision: Number(row.revision),
    routeId: route.id, rate: route.rate, manualFallback: false };
  try {
    if (!row.encrypted_credentials || row.health.state !== "connected" ||
      !Number.isFinite(Date.parse(row.health.checkedAt)) || Date.now() - Date.parse(row.health.checkedAt) > 15 * 60000)
      throw new HttpError(409, "Verify the configured provider before using its Sandbox rates.");
    const secrets = open({ tenantId, providerKey: row.provider_key, environment: "sandbox" }, row.encrypted_credentials);
    const networks = await c.query(`SELECT id,coalesce(to_jsonb(n)->>'code',to_jsonb(n)->>'name') AS code
      FROM network_catalog n WHERE id::text=ANY($1::text[])`, [[source?.networkId, destination?.networkId].filter(Boolean)]);
    const networkCode = (id?: string) => networks.rows.find(n => n.id === id)?.code ?? "";
    snapshot.rate = await providerRate(row.provider_key, { source: sourceSymbol, destination: destinationSymbol,
      sourceNetwork: networkCode(source?.networkId), destinationNetwork: networkCode(destination?.networkId), amount: input.amount }, secrets);
  } catch {
    if (!row.settings.manualFallback || row.provider_key === "quickex") throw new HttpError(502, "Assigned provider pricing is unavailable. Verify credentials and route support before retrying.");
    snapshot.manualFallback = true; // Explicit configured fallback, disclosed in the quote/order.
  }
  return snapshot;
}
export async function assertPricingSnapshot(c: DatabaseClient, tenantId: string, snapshot: PricingSnapshot | undefined, action: string, effective?: {status:string;features:Record<string,boolean>}) {
  if (snapshot && ["quickex","whitebit"].includes(snapshot.providerKey) &&
    (!effective || effective.status !== "active" || !effective.features.crypto_exchange || !effective.features[snapshot.providerKey]))
    throw new HttpError(403,"This pricing provider is no longer included in the tenant's plan.");
  if (snapshot?.providerKey === "manual_rule" || snapshot?.providerKey==="market_reference") {
    if(snapshot.validUntil && Date.now()>=snapshot.validUntil)throw new HttpError(409,"Accepted reference expired. Request a fresh quote.");
    return;
  }
  if (!snapshot) {
    const changed = await c.query(`SELECT 1 FROM tenant_integrations WHERE tenant_id=$1
      AND provider_key IN ('1forge','whitebit','quickex') AND settings->'quoteActions' ? $2`, [tenantId, action]);
    if (changed.rowCount) throw new HttpError(409, "Pricing authorization changed. Request a new Sandbox quote.");
    return;
  }
  const r = await c.query("SELECT enabled,revision FROM tenant_integrations WHERE tenant_id=$1 AND provider_key=$2",
    [tenantId, snapshot.providerKey]);
  if (!r.rows[0]?.enabled || Number(r.rows[0].revision) !== snapshot.revision)
    throw new HttpError(409, "Provider authorization or configuration changed. Request a new Sandbox quote.");
}
