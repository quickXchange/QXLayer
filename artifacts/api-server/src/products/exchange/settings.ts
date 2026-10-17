import { SaveExchangeConfigurationBody } from "@workspace/api-zod";
import type { ExchangeSettings, ExchangeCatalogAsset } from "@workspace/api-zod";
import type { DatabaseClient } from "@workspace/db";
import { HttpError } from "../../lib/errors";
import { decimal } from "../../modules/entitlements/decimal";
import { requireFeature, type EffectiveEntitlements } from "../../modules/entitlements/resolver";
import { safeHttps } from "../../modules/website/settings";
import { containsCredential, PROVIDER_CATALOG } from "./providers";
import { isImportedVisualUrl } from "./visual-assets";
import { validatePricingRules,selectPricingRule } from "./pricing-rules";
import { validateWallets } from "./wallets";
import { applyGlobalAvailability, selectedFiats, isFiat, validActionPair, methodCurrencies } from "./global-catalog";

function safeExchangeLogo(value: string | null) {
  if (value && isImportedVisualUrl(value)) return;
  safeHttps(value);
}

export const ACTIONS = ["swap", "convert"] as const;
export function emptySettings(): ExchangeSettings {
  return { enabled: false, defaultAction: "swap", publicNote: "", fiatCurrency: "USD", fiatPlanRate: "0",
    actions: { swap: false, convert: false, buy: false, sell: false },
    assets: [], networks: [], routes: [], paymentMethods: [] };
}
export async function readExchange(client: DatabaseClient, tenantId: string) {
  const rows = await client.query("SELECT configuration FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId]);
  const raw = rows.rows[0]?.configuration ?? {};
  const configuration = await applyGlobalAvailability(client,SaveExchangeConfigurationBody.parse({ ...emptySettings(), ...raw }));
  const catalog = (await client.query(
    `SELECT c.id AS "assetNetworkId",c.asset_id AS "assetId",a.symbol,a.name,c.network_id AS "networkId",n.name AS "networkName",n.testnet,
     (l.metadata->>'decimals')::integer AS decimals, l.metadata->>'contractAddress' AS "contractAddress",
     coalesce((l.metadata->>'native')::boolean,false) AS native,
     coalesce((l.metadata->>'memoRequired')::boolean,false) AS "memoRequired",l.metadata->>'addressFormat' AS "addressFormat"
     FROM tenant_asset_networks t JOIN asset_network_catalog c ON c.id=t.asset_network_id
     JOIN asset_catalog a ON a.id=c.asset_id JOIN network_catalog n ON n.id=c.network_id
     LEFT JOIN global_exchange_catalog_links l ON l.kind='asset_network' AND l.source_id=c.asset_id AND l.target_id=c.network_id
      WHERE t.tenant_id=$1 ORDER BY a.symbol,n.name`, [tenantId])).rows.map(row=>{
        const {decimals,...rest}=row;
        return {...rest,...(decimals==null?{}:{decimals})};
      }) as ExchangeCatalogAsset[];
  return { configuration, catalog, providerCatalog: PROVIDER_CATALOG };
}
function unique(values: string[], label: string) {
  if (values.length !== new Set(values).size) throw new HttpError(400, `Duplicate ${label}.`);
}
export function validateExchange(value: unknown, e: EffectiveEntitlements, catalog?: ExchangeCatalogAsset[]) {
  if (containsCredential(value)) throw new HttpError(400, "Provider credentials are not supported. Do not submit API keys or secrets.");
  const s = SaveExchangeConfigurationBody.parse(value);
  if (Buffer.byteLength(JSON.stringify(s)) > 32768) throw new HttpError(400, "Exchange configuration must be at most 32 KiB.");
  for (const action of ACTIONS) if (s.actions[action]) requireFeature(e, action);
  unique(s.assets.map(a => a.assetId), "assets");
  unique(s.networks.map(n => n.assetNetworkId), "networks");
  unique(s.routes.map(r => r.id), "route identifiers");
  unique(s.routes.map(r => `${r.action}:${r.source}:${r.destination}`), "routes for an action and pair");
  unique(s.paymentMethods.map(m => m.id), "payment methods");
  validatePricingRules(s,catalog);
  validateWallets(s, catalog);
  for (const rule of s.pricingRules ?? []) if (rule.enabled) requireFeature(e, rule.action);
  unique((s.providers ?? []).map(p => p.providerId), "providers");
  for (const p of s.providers ?? []) {
    if (!PROVIDER_CATALOG.some(c => c.id === p.providerId)) throw new HttpError(400, "Unknown provider catalog entry.");
    safeHttps(p.endpoint ?? null);
    if (p.endpoint) {
      const url = new URL(p.endpoint);
      if (url.username || url.password || url.search || url.hash) throw new HttpError(400, "Use a public HTTPS endpoint without credentials, query parameters or fragments.");
    }
  }
  const assignment = (id: string | undefined, capability: string) => {
    if (id && !PROVIDER_CATALOG.some(p => p.id === id && p.capabilities.includes(capability))) throw new HttpError(400, "Provider assignment is not supported for this function.");
  };
  const assetIds = catalog && new Set(catalog.map(a => a.assetId));
  const networkIds = catalog && new Set(catalog.map(a => a.assetNetworkId));
  for (const a of s.assets) {
    if (assetIds && !assetIds.has(a.assetId)) throw new HttpError(400, "Select the asset in tenant Assets & Networks before configuring it.");
    if (!/^[A-Za-z0-9._-]+$/.test(a.symbol)) throw new HttpError(400, "Invalid asset symbol.");
    safeExchangeLogo(a.logoUrl);
  }
  for (const n of s.networks) {
    if (networkIds && !networkIds.has(n.assetNetworkId)) throw new HttpError(400, "Network is not selected for this tenant.");
    if (decimal(n.maximum) < decimal(n.minimum)) throw new HttpError(400, "Network maximum must be at least its minimum.");
    assignment(n.providerId, "swap");
  }
  for (const m of s.paymentMethods) {
    if (!m.label.trim()) throw new HttpError(400, "Payment method label is required.");
    if (m.enabled && methodCurrencies(m).some(f => !selectedFiats(s).includes(f))) throw new HttpError(400, "Payment method currencies must be selected in this exchange.");
    safeExchangeLogo(m.logoUrl ?? null);
    if (m.maximum != null && decimal(m.maximum) < decimal(m.minimum ?? "0")) throw new HttpError(400, "Payment method maximum must be at least its minimum.");
  }
  if (s.actions.buy || s.actions.sell) throw new HttpError(400, "Buy and Sell are retired. Configure Crypto/Fiat Swap or Crypto/Crypto Convert.");
  const validEndpoint = (id: string) => isFiat(id) ? selectedFiats(s).includes(id.slice(5)) : s.networks.some(n => n.assetNetworkId === id);
  for (const r of s.routes) {
    if (r.enabled && (r.source === r.destination || !validEndpoint(r.source) || !validEndpoint(r.destination))) throw new HttpError(400, "Routes require distinct, configured source and destination endpoints.");
    if (r.enabled && !validActionPair(r.action,r.source,r.destination)) throw new HttpError(400, "Swap requires Crypto/Fiat; Convert requires Crypto/Crypto.");
    if (r.enabled && r.action === "swap" && !r.paymentMethodIds.some(id => s.paymentMethods.some(m =>
       m.id === id && m.enabled && methodCurrencies(m).includes((isFiat(r.source) ? r.source : r.destination).slice(5)))))
       throw new HttpError(400, "An enabled Swap route requires a compatible enabled payment method.");
    if (decimal(r.rate) <= 0n || decimal(r.maximum) < decimal(r.minimum) || decimal(r.maximum) === 0n) throw new HttpError(400, "Set a positive rate and valid nonzero route limits.");
    if (r.enabled) requireFeature(e, r.action);
    if (r.paymentMethodIds.some(id => !s.paymentMethods.some(m => m.id === id))) throw new HttpError(400, "Route payment method does not belong to this exchange.");
    assignment(r.providerId, r.action);
  }
  for (const action of ACTIONS) {
    const pair = s.defaultPairs?.[action];
    if (!pair) continue;
    const r = s.routes.find(r => r.enabled && r.action === action && r.source === pair.source && r.destination === pair.destination);
    if (!r || !validActionPair(action,pair.source,pair.destination)) throw new HttpError(400, `Default ${action} pair must have an enabled compatible route.`);
    const selected=selectPricingRule(s,{action,source:pair.source,destination:pair.destination,amount:r.minimum,paymentMethodId:pair.paymentMethodId},catalog);
    if(action==="swap"&&!selected&&s.pricingRules?.some(r=>r.pricingMode==="market"))throw new HttpError(400,"Default Swap direction needs an available matching pricing rule.");
    if (action === "swap" && (!pair.paymentMethodId || !r.paymentMethodIds.includes(pair.paymentMethodId) ||
      !s.paymentMethods.some(m => m.enabled && m.id === pair.paymentMethodId && methodCurrencies(m).includes(
        (isFiat(pair.source) ? pair.source : pair.destination).slice(5))))) throw new HttpError(400, "Default Swap payment method is not compatible.");
  }
  return s;
}