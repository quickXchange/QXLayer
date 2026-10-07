import { createHash } from "node:crypto";
import { coreRegistry } from "../core-registry";
import { approvedKeys } from "../catalog-initializer/approved";
import { approvedRecords } from "./catalog-package";

type Row = Record<string, unknown>;
const modules = coreRegistry.filter(m => [...approvedKeys, "website", "merchant_api"].includes(m.key));
const entitlementRows = new Map<string, Row>();
for (const m of modules) for (const f of [{ key: m.key, label: m.name }, ...m.features]) {
  entitlementRows.set(f.key, { key: f.key, label: f.label, kind: "feature", value_type: "boolean" });
}
for (const [key, label, value_type] of [
  ["max_supported_assets", "Supported assets", "integer"], ["max_supported_networks", "Supported networks", "integer"],
  ["max_payment_methods", "Payment method configurations", "integer"], ["max_staff", "Staff members", "integer"],
  ["max_api_keys", "Active API keys", "integer"], ["max_webhooks", "Webhook configurations", "integer"],
  ["max_monthly_transactions", "Monthly sandbox transaction units", "integer"], ["max_monthly_volume", "Monthly volume in plan currency", "decimal"],
]) entitlementRows.set(key, { key, label, kind: "limit", value_type });
const assets = [["btc", "BTC", "Bitcoin"], ["eth", "ETH", "Ethereum"], ["usdt", "USDT", "Tether"], ["sol", "SOL", "Solana"], ["bnb", "BNB", "BNB"]];
const networks = [["bitcoin-testnet", "Bitcoin Testnet"], ["ethereum-sepolia", "Ethereum Sepolia"], ["solana-devnet", "Solana Devnet"], ["bsc-testnet", "BSC Testnet"], ["tron-nile", "TRON Nile"]];
const pairs = [["btc", "bitcoin-testnet"], ["eth", "ethereum-sepolia"], ["usdt", "ethereum-sepolia"], ["sol", "solana-devnet"], ["bnb", "bsc-testnet"], ["usdt", "bsc-testnet"], ["usdt", "tron-nile"]];
export const globalManifest: Record<string, { key: string; columns: string; types: string; rows: Row[] }> = {
  module_catalog: { key: "key", columns: "key,name,description,category,sandbox_available,definition",
    types: "key text,name text,description text,category text,sandbox_available boolean,definition jsonb",
    rows: modules.map(m => ({ key: m.key, name: m.name, description: m.description, category: m.category, sandbox_available: m.sandboxAvailable, definition: m })) },
  entitlement_definitions: { key: "key", columns: "key,label,kind,value_type", types: "key text,label text,kind text,value_type text", rows: [...entitlementRows.values()] },
  asset_catalog: { key: "id", columns: "id,symbol,name", types: "id text,symbol text,name text", rows: assets.map(([id, symbol, name]) => ({ id, symbol, name })) },
  network_catalog: { key: "id", columns: "id,name,testnet", types: "id text,name text,testnet boolean", rows: networks.map(([id, name]) => ({ id, name, testnet: true })) },
  asset_network_catalog: { key: "id", columns: "id,asset_id,network_id", types: "id text,asset_id text,network_id text", rows: pairs.map(([asset_id, network_id]) => ({ id: `${asset_id}:${network_id}`, asset_id, network_id })) },
  landing_products: { key: "key", columns: "key,visible,name,description,icon,starting_price,setup_fee,currency,billing_period,status,cta_label,display_order",
    types: "key text,visible boolean,name text,description text,icon text,starting_price numeric,setup_fee numeric,currency text,billing_period text,status text,cta_label text,display_order integer",
    rows: approvedRecords.map(r => ({ ...r })) },
};
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
export const globalManifestFingerprint = hash(globalManifest);
const jsonSql = (v: unknown) => `convert_from(decode('${Buffer.from(JSON.stringify(v)).toString("hex")}','hex'),'UTF8')::jsonb`;
const scope = (m: typeof globalManifest[string]) => m.rows.map(r => `'${r[m.key]}'`).join(",");
const projection = (m: typeof globalManifest[string]) => m.columns.split(",").map(k => ["starting_price", "setup_fee"].includes(k) ? `${k}::text AS ${k}` : k).join(",");
const aggregate = (table: string, m: typeof globalManifest[string]) => `(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY ${m.key}),'[]'::jsonb) FROM (SELECT ${projection(m)} FROM public.${table} WHERE ${m.key} IN (${scope(m)})) r)`;
export const globalPreflightSql = `SELECT jsonb_build_object('capturedAt',clock_timestamp(),'tables',jsonb_build_object(${Object.entries(globalManifest).map(([t, m]) => `'${t}',${aggregate(t, m)}`).join(",")})) AS recovery_snapshot;`;
export interface GlobalSnapshot { capturedAt: string; tables: Record<string, Row[]> }
export interface GlobalApproval { manifestFingerprint: string; insert: Record<string, string[]>; preserve: Record<string, string[]>; restoreVisibility: string[] }
const canonical = (v: unknown): unknown => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object"
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical((v as Row)[k])])) : v;
const equal = (a: Row, b: Row) => Object.keys(b).every(k => JSON.stringify(canonical(a[k])) === JSON.stringify(canonical(b[k])));
export function classifyGlobal(s: GlobalSnapshot) {
  if (!s || !Number.isFinite(Date.parse(s.capturedAt)) || Object.keys(s.tables).sort().join() !== Object.keys(globalManifest).sort().join()) throw new Error("Unexpected global snapshot.");
  return Object.entries(globalManifest).flatMap(([table, m]) => {
    const rows = s.tables[table];
    if (!Array.isArray(rows) || new Set(rows.map(r => r[m.key])).size !== rows.length ||
      rows.some(r => !m.rows.some(a => a[m.key] === r[m.key]) || Object.keys(r).sort().join() !== m.columns.split(",").sort().join())) throw new Error("Unexpected scope or projection.");
    return m.rows.map(approved => {
      const before = rows.find(r => r[m.key] === approved[m.key]);
      const copy = before && table === "landing_products" ? { ...before, visible: true } : before;
      const classification = !before ? "INSERT" : !equal(copy!, approved) ? "CONFLICT / REVIEW REQUIRED" :
        table === "landing_products" && before.visible === false ? "RESTORE VISIBILITY" : "UNCHANGED";
      return { table, key: String(approved[m.key]), classification, before: before ?? null, approved };
    });
  });
}
export function prepareGlobalApply(s: GlobalSnapshot, approval: GlobalApproval) {
  const rows = classifyGlobal(s);
  if (approval.manifestFingerprint !== globalManifestFingerprint) throw new Error("Manifest review is required.");
  for (const [map, type] of [[approval.insert, "INSERT"], [approval.preserve, "CONFLICT / REVIEW REQUIRED"]] as const) {
    if (!map || Object.keys(map).some(k => !(k in globalManifest))) throw new Error("Unapproved table.");
    for (const [t, keys] of Object.entries(map)) if (!Array.isArray(keys) || new Set(keys).size !== keys.length ||
      keys.some(k => !rows.some(r => r.table === t && r.key === k && r.classification === type))) throw new Error("Invalid per-key approval.");
  }
  if (!Array.isArray(approval.restoreVisibility) || new Set(approval.restoreVisibility).size !== approval.restoreVisibility.length ||
    approval.restoreVisibility.some(k => !rows.some(r => r.table === "landing_products" && r.key === k && r.classification === "RESTORE VISIBILITY"))) throw new Error("Invalid visibility approval.");
  for (const r of rows) if (r.classification === "INSERT" && !approval.insert[r.table]?.includes(r.key) ||
    r.classification === "CONFLICT / REVIEW REQUIRED" && !approval.preserve[r.table]?.includes(r.key) ||
    r.classification === "RESTORE VISIBILITY" && !approval.restoreVisibility.includes(r.key)) throw new Error(`Review required: ${r.table}/${r.key}`);
  const plan = hash({ s, approval, manifest: globalManifestFingerprint });
  const guards = Object.entries(globalManifest).map(([t, m]) => {
    const before = s.tables[t].slice().sort((a, b) => String(a[m.key]).localeCompare(String(b[m.key])));
    return `IF EXISTS(SELECT 1 FROM pg_class WHERE oid='public.${t}'::regclass AND (relrowsecurity OR relforcerowsecurity))
      OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.${t}'::regclass AND NOT tgisinternal AND tgenabled<>'D') THEN
      RAISE EXCEPTION 'Unexpected security/trigger configuration on ${t}; review required.'; END IF;
    IF ${aggregate(t, m)} IS DISTINCT FROM ${jsonSql(before)} THEN RAISE EXCEPTION 'Preflight drift on ${t}; no writes.'; END IF;`;
  }).join("\n");
  const writes = Object.entries(globalManifest).map(([t, m]) => {
    const inserts = rows.filter(r => r.table === t && r.classification === "INSERT").map(r => r.approved);
    return `INSERT INTO public.${t}(${m.columns}) SELECT ${m.columns} FROM jsonb_to_recordset(${jsonSql(inserts)}) AS r(${m.types});`;
  }).join("\n");
  const postconditions = Object.entries(globalManifest).map(([t, m]) => {
    const final = rows.filter(r => r.table === t).map(r => r.classification === "INSERT" ? r.approved : r.classification === "RESTORE VISIBILITY" ? { ...r.before, visible: true } : r.before!)
      .sort((a, b) => String(a[m.key]).localeCompare(String(b[m.key])));
    return `IF ${aggregate(t, m)} IS DISTINCT FROM ${jsonSql(final)} THEN RAISE EXCEPTION 'Postcondition failed on ${t}; roll back.'; END IF;`;
  }).join("\n");
  return `-- PREPARED ONLY; explicit key-level approval and authorized Production writer required.
-- Plan ${plan}; manifest ${globalManifestFingerprint}. No startup/publish hook.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
${Object.keys(globalManifest).map(t => `LOCK TABLE public.${t} IN SHARE ROW EXCLUSIVE MODE;`).join("\n")}
DO $qx_global$
DECLARE captured_at timestamptz := (${jsonSql(s.capturedAt)}#>>'{}')::timestamptz;
BEGIN
IF captured_at < clock_timestamp()-interval '15 minutes'
 OR captured_at > clock_timestamp()+interval '1 minute' THEN RAISE EXCEPTION 'Preflight expired; refreeze after review.'; END IF;
${guards}
${writes}
UPDATE public.landing_products SET visible=true WHERE key IN (SELECT jsonb_array_elements_text(${jsonSql(approval.restoreVisibility)})) AND visible=false;
${postconditions}
END;
$qx_global$;
COMMIT;
-- On failure issue ROLLBACK in the same session. No bypass, deletion or overwrite.`;
}
