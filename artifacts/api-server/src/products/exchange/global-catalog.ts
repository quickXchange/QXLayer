import { withDatabase, type DatabaseClient } from "@workspace/db";
import type { GlobalCatalogEntry, GlobalCatalogLink, GlobalCatalogPatch, GlobalExchangeCatalog, ExchangeSettings } from "@workspace/api-zod";
import { requireSuperAdmin, contextFor, type Principal } from "../../modules/authentication/service";
import { HttpError } from "../../lib/errors";
import { safeHttps } from "../../modules/website/settings";
import { isImportedVisualUrl } from "./visual-assets";
import referenceCatalog from "./catalog-reference.json";

export const BLOCKED_FIAT = new Set(["DZD", "ILS"]);
const COUNTRIES = /^[A-Z]{2}$/;
const fields: Record<string, string[]> = {
  currencies: ["symbol", "decimals", "countryCodes", "flagCountry", "sourceUrl", "verified", "numericCode"],
  payment_methods: ["provider", "category", "countryCodes", "requiredFields", "sourceUrl", "verified"],
  assets: ["decimals", "sourceUrl", "verified"],
  networks: ["chainId", "addressFormat", "memoRequired", "testnet", "sourceUrl", "verified"],
  payment_fiat: ["countryCodes", "sourceUrl"],
  asset_network: ["legacyAssetNetworkId", "contractAddress", "native", "decimals", "memoRequired", "addressFormat", "sourceUrl", "representation"],
};
export function validateCatalogMetadata(kind: string, m: Record<string, unknown>) {
  if (Object.keys(m).some(k => !fields[kind]?.includes(k))) throw new HttpError(400, "Unsupported catalog metadata field.");
  if (JSON.stringify(m).length > 12000) throw new HttpError(400, "Catalog metadata is too large.");
  if (m.decimals !== undefined && (!Number.isInteger(m.decimals) || Number(m.decimals) < 0 || Number(m.decimals) > 18))
    throw new HttpError(400, "Decimals must be an integer from 0 to 18.");
  if (m.countryCodes !== undefined && (!Array.isArray(m.countryCodes) ||
      m.countryCodes.some(c => typeof c !== "string" || !COUNTRIES.test(c) || c === "DZ" || c === "IL")))
    throw new HttpError(400, "Country mappings must use eligible ISO country codes; DZ and IL are excluded.");
  if (m.sourceUrl !== undefined) safeHttps(String(m.sourceUrl));
  if(m.flagCountry!==undefined && (typeof m.flagCountry!=="string" || !COUNTRIES.test(m.flagCountry) || ["DZ","IL"].includes(m.flagCountry)))
    throw new HttpError(400,"Use an eligible country or region flag.");
  if (m.requiredFields !== undefined && (!Array.isArray(m.requiredFields) || m.requiredFields.length > 24 ||
      m.requiredFields.some(f => typeof f !== "string" || !/^[a-zA-Z][a-zA-Z0-9_]{0,60}$/.test(f))))
    throw new HttpError(400, "Required account fields must be safe field identifiers.");
  for (const k of ["native", "memoRequired", "testnet", "verified"])
    if (m[k] !== undefined && typeof m[k] !== "boolean") throw new HttpError(400, `${k} must be boolean.`);
  for (const [k, v] of Object.entries(m))
    if (!["countryCodes", "requiredFields", "decimals", "native", "memoRequired", "testnet", "verified"].includes(k) &&
        (typeof v !== "string" || v.length > 2000)) throw new HttpError(400, `Invalid ${k}.`);
}
export function validateCatalogEntry(e: GlobalCatalogEntry) {
  validateCatalogMetadata(e.kind, e.metadata);
  if (e.kind === "currencies" && (!/^[A-Z]{3}$/.test(e.code) || e.id !== e.code || BLOCKED_FIAT.has(e.code)))
    throw new HttpError(400, "Use an eligible canonical ISO 4217 currency; DZD and ILS are excluded.");
  if (e.logoUrl && !isImportedVisualUrl(e.logoUrl)) safeHttps(e.logoUrl);
  if (e.status === "enabled" && (e.metadata.verified !== true || !e.metadata.sourceUrl))
    throw new HttpError(400, "Enabled reference entries require verified source metadata; otherwise keep catalog-only.");
}
export async function readGlobalCatalog(client: DatabaseClient): Promise<GlobalExchangeCatalog> {
  const entries = (await client.query(`SELECT kind,id,code,name,status,logo_url AS "logoUrl",metadata,revision
    FROM global_exchange_catalog ORDER BY kind,code,id`)).rows as GlobalCatalogEntry[];
  const links = (await client.query(`SELECT id,kind,source_id AS "sourceId",target_id AS "targetId",enabled,verified,metadata
    FROM global_exchange_catalog_links ORDER BY kind,source_id,target_id`)).rows as GlobalCatalogLink[];
  return { entries, links };
}
export async function globalCatalog(principal: Principal, patch?: GlobalCatalogPatch) {
  if (patch) requireSuperAdmin(principal);
  const scope = principal.role === "super_admin" ? contextFor(principal, undefined, !!patch)
    : contextFor(principal, principal.memberships[0]?.tenantId);
  return withDatabase(scope, async client => {
    if (patch) {
      // One transaction-level lock serializes imports, edits and reference-safe removal.
      await client.query("SELECT pg_advisory_xact_lock(hashtext('global-exchange-catalog'))");
      for (const e of patch.entries ?? []) {
        validateCatalogEntry(e);
        const r = await client.query(`INSERT INTO global_exchange_catalog(kind,id,code,name,status,logo_url,metadata,revision)
          VALUES($1,$2,$3,$4,$5,$6,$7,1) ON CONFLICT(kind,id) DO UPDATE
          SET code=excluded.code,name=excluded.name,status=excluded.status,logo_url=excluded.logo_url,
          metadata=excluded.metadata,revision=global_exchange_catalog.revision+1
          WHERE global_exchange_catalog.revision=$8 RETURNING id`,
          [e.kind,e.id,e.code,e.name,e.status,e.logoUrl,JSON.stringify(e.metadata),e.revision]);
        if (!r.rowCount) throw new HttpError(409, "Catalog entry changed in another session. Reload before saving.");
        await syncLegacyCatalog(client, e);
      }
      for (const link of patch.links ?? []) {
        validateCatalogMetadata(link.kind, link.metadata);
        const [sourceKind, targetKind] = link.kind === "payment_fiat" ? ["payment_methods", "currencies"] : ["assets", "networks"];
        const parents = (await client.query(`SELECT kind,id,status FROM global_exchange_catalog
          WHERE (kind=$1 AND id=$2) OR (kind=$3 AND id=$4)`, [sourceKind,link.sourceId,targetKind,link.targetId])).rows;
        if (parents.length !== 2) throw new HttpError(400, "Both linked catalog entries must exist.");
        if (link.enabled && (!link.verified || !link.metadata.sourceUrl || parents.some(p => p.status !== "enabled")))
          throw new HttpError(400, "Enabled mappings require verified evidence and enabled parent entries.");
        if (link.kind === "asset_network" && link.verified && link.metadata.native !== true && !link.metadata.contractAddress)
          throw new HttpError(400, "Verified token deployments require an exact contract or mint address.");
        if (link.kind === "asset_network" && link.metadata.legacyAssetNetworkId) {
          const binding = await client.query("SELECT asset_id,network_id FROM asset_network_catalog WHERE id=$1",[link.metadata.legacyAssetNetworkId]);
          if (binding.rows.some(r=>r.asset_id!==link.sourceId || r.network_id!==link.targetId))
            throw new HttpError(400,"An asset/network identity cannot be reassigned to another asset or chain.");
        }
        const changed = await client.query(`INSERT INTO global_exchange_catalog_links(id,kind,source_id,target_id,enabled,verified,metadata)
          VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,
          verified=excluded.verified,metadata=excluded.metadata
          WHERE global_exchange_catalog_links.kind=excluded.kind AND global_exchange_catalog_links.source_id=excluded.source_id
          AND global_exchange_catalog_links.target_id=excluded.target_id RETURNING id`,
          [link.id,link.kind,link.sourceId,link.targetId,link.enabled,link.verified,JSON.stringify(link.metadata)]);
        if(!changed.rowCount)throw new HttpError(409,"A mapping identity cannot be reassigned. Reload and create a separate mapping.");
        if (link.kind === "asset_network") {
          const id = String(link.metadata.legacyAssetNetworkId ?? `${link.sourceId}:${link.targetId}`);
          await client.query(`INSERT INTO asset_network_catalog(id,asset_id,network_id) VALUES($1,$2,$3)
            ON CONFLICT(id) DO NOTHING`, [id,link.sourceId,link.targetId]);
        }
      }
      for (const entry of patch.deleteEntries ?? []) {
        const linked = await client.query(`SELECT 1 FROM global_exchange_catalog_links WHERE
          (source_id=$2 AND kind=CASE WHEN $1='assets' THEN 'asset_network' WHEN $1='payment_methods' THEN 'payment_fiat' ELSE '' END)
          OR (target_id=$2 AND kind=CASE WHEN $1='networks' THEN 'asset_network' WHEN $1='currencies' THEN 'payment_fiat' ELSE '' END) LIMIT 1`, [entry.kind,entry.id]);
        const used = await client.query(`SELECT 1 FROM tenant_product_configuration WHERE module_key='crypto_exchange'
          AND position($1 in configuration::text)>0 LIMIT 1`, [entry.id]);
        const selected = entry.kind === "assets" || entry.kind === "networks" ? await client.query(`SELECT 1
          FROM tenant_asset_networks t JOIN asset_network_catalog a ON a.id=t.asset_network_id
          WHERE ${entry.kind === "assets" ? "a.asset_id" : "a.network_id"}=$1 LIMIT 1`, [entry.id]) : null;
        if (linked.rowCount || used.rowCount || selected?.rowCount)
          throw new HttpError(409, "This entry is linked or selected by a tenant. Disable it instead of deleting history.");
        await client.query("DELETE FROM global_exchange_catalog WHERE kind=$1 AND id=$2", [entry.kind,entry.id]);
      }
    }
    return readGlobalCatalog(client);
  });
}
async function syncLegacyCatalog(client: DatabaseClient, e: GlobalCatalogEntry) {
  if (e.kind === "assets")
    await client.query("INSERT INTO asset_catalog(id,symbol,name) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET symbol=excluded.symbol,name=excluded.name", [e.id,e.code,e.name]);
  if (e.kind === "networks")
    await client.query("INSERT INTO network_catalog(id,name,testnet) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET name=excluded.name,testnet=excluded.testnet", [e.id,e.name,e.metadata.testnet === true]);
}
export const selectedFiats = (s: ExchangeSettings) => s.fiatCurrencies ?? [s.fiatCurrency];
export const isFiat = (id: string) => id.startsWith("fiat:");
export function fiatPrecision(code: string, configured?:number) {
  if(BLOCKED_FIAT.has(code))throw new HttpError(400,"Unsupported fiat currency.");
  if(configured!==undefined && Number.isInteger(configured) && configured>=0 && configured<=18)return configured;
  const e = referenceCatalog.entries.find(e => e.kind === "currencies" && e.code === code);
  if (!e || BLOCKED_FIAT.has(code)) throw new HttpError(400, "Unsupported fiat currency.");
  return Number((e.metadata as { decimals?: number }).decimals ?? 2);
}
export const methodCurrencies = (m: ExchangeSettings["paymentMethods"][number]) => m.currencies ?? [m.currency];
export function validActionPair(action: string, source: string, destination: string) {
  return source !== destination && (action === "swap" ? isFiat(source) !== isFiat(destination)
    : action === "convert" && !isFiat(source) && !isFiat(destination));
}
/** Retire old offerings without changing/deleting stored configuration or historical orders. */
export function currentOfferings(s: ExchangeSettings): ExchangeSettings {
  return { ...s, defaultAction: s.defaultAction === "convert" ? "convert" : "swap",
    actions: { ...s.actions, buy: false, sell: false },
    routes: s.routes.map(r => validActionPair(r.action,r.source,r.destination) ? r : { ...r, enabled: false }),
    pricingRules: s.pricingRules?.map(r => ["swap","convert"].includes(r.action) &&
      !(r.action === "swap" && r.source !== "*" && r.destination !== "*" && !validActionPair(r.action,r.source,r.destination))
      ? r : { ...r, enabled: false }) };
}
export async function validateTenantCatalog(client: DatabaseClient, s: ExchangeSettings) {
  const c = await readGlobalCatalog(client);
  const active = (kind: string, id: string) => c.entries.some(e => e.kind === kind && e.id === id && e.status === "enabled");
  if (selectedFiats(s).some(f => BLOCKED_FIAT.has(f) || !active("currencies",f)))
    throw new HttpError(400, "Select only eligible enabled fiat currencies from the global catalog.");
  for (const m of s.paymentMethods.filter(m => m.enabled)) {
    if (!m.catalogId || !active("payment_methods",m.catalogId))
      throw new HttpError(400, "Enabled payment methods require an enabled global catalog selection.");
    if (methodCurrencies(m).some(f => !selectedFiats(s).includes(f) || !c.links.some(l =>
      l.kind === "payment_fiat" && l.sourceId === m.catalogId && l.targetId === f && l.enabled && l.verified)))
      throw new HttpError(400, "Payment method and fiat currency mapping is not enabled and verified.");
    const required = c.entries.find(e => e.kind === "payment_methods" && e.id === m.catalogId)?.metadata.requiredFields;
    if (Array.isArray(required) && required.length && !m.instructions?.trim())
      throw new HttpError(400, "Configured bank/payment methods require tenant payment instructions.");
    if (Array.isArray(required) && required.some(k => typeof k !== "string" || !m.accountFields?.[k]?.trim()))
      throw new HttpError(400, "Complete the required payment account fields before enabling the method.");
  }
}
export async function applyGlobalAvailability(client: DatabaseClient, settings: ExchangeSettings): Promise<ExchangeSettings> {
  const c = await readGlobalCatalog(client), s = currentOfferings(settings);
  const active = (kind: string, id: string) => c.entries.some(e=>e.kind===kind && e.id===id && e.status==="enabled");
  const fiats = selectedFiats(s).filter(f=>active("currencies",f) && !BLOCKED_FIAT.has(f));
  return { ...s, fiatCurrencies:fiats,
    fiatPrecisions:Object.fromEntries(c.entries.filter(e=>e.kind==="currencies"&&fiats.includes(e.code)).map(e=>[e.code,Number(e.metadata.decimals??2)])),
    assets:s.assets.map(a=>active("assets",a.assetId)?a:{...a,enabled:false}),
    networks:s.networks.map(n=>c.links.some(l=>l.kind==="asset_network" && l.enabled && l.verified &&
      l.metadata.legacyAssetNetworkId===n.assetNetworkId && active("assets",l.sourceId) && active("networks",l.targetId))
      ?n:{...n,enabled:false,available:false}),
    paymentMethods:s.paymentMethods.map(m=>m.catalogId && active("payment_methods",m.catalogId) &&
      methodCurrencies(m).every(f=>fiats.includes(f) && c.links.some(l=>l.kind==="payment_fiat" && l.sourceId===m.catalogId &&
        l.targetId===f && l.enabled && l.verified)) ?m:{...m,enabled:false}),
  };
}
