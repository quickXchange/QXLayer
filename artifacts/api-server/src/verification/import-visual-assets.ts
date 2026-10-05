import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool, withDatabase } from "@workspace/db";
import { visualFile, visualUrl } from "../products/exchange/visual-assets";

interface SourceAsset {
  type: string; code: string; name: string; symbol: string; network?: string; country?: string;
  currency?: string[] | string | null; relative_path: string; sha256: string; byte_size: number; original_format: string;
}
interface Entry {
  kind: string; code: string; name: string; logoUrl: string; alternatives: string[]; recordId: string | null;
  countries: string[]; currencies: string[];
}
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const NETWORK_ALIASES: Record<string, string[]> = {
  BTC: ["bitcoin-testnet"], BITCOIN: ["bitcoin-testnet"],
  ETH: ["ethereum-sepolia"], ERC20: ["ethereum-sepolia"], ETHEREUM: ["ethereum-sepolia"],
  SOL: ["solana-devnet"], SPL: ["solana-devnet"], SOLANA: ["solana-devnet"], BEP20: ["bsc-testnet"], BSC: ["bsc-testnet"],
  POLYGON_LEGACY: ["imported-polygon"],
  TRC20: ["tron-nile"], TRON: ["tron-nile"],
};
async function main() {
  if (process.env.NODE_ENV === "production" || !process.argv.includes("--development")) throw new Error("Development-only importer. Pass --development.");
  const zip = process.argv.find(a => a.endsWith(".zip"));
  if (!zip) throw new Error("Provide the asset ZIP path.");
  const apply = process.argv.includes("--apply");
  const archiveNames = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).trim().split("\n");
  if (archiveNames.some(n => n.startsWith("/") || n.split("/").includes(".."))) throw new Error("Unsafe archive path.");
  const source = JSON.parse(execFileSync("unzip", ["-p", zip, "qxlayer-assets/catalog.json"], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }));
  const files = new Map<string, { bytes: Buffer; filename: string; contentType: string }>();
  const groups = new Map<string, SourceAsset[]>();
  const mime: Record<string, string> = { svg: "image/svg+xml", png: "image/png", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg" };
  for (const a of source.assets as SourceAsset[]) {
    if (!/^(crypto|network|payment-method|flag)$/.test(a.type) || !a.code || !a.relative_path) throw new Error("Invalid catalog mapping.");
    if (a.relative_path.startsWith("/") || a.relative_path.split("/").includes("..")) throw new Error("Unsafe catalog path.");
    const path = `qxlayer-assets/${a.relative_path}`;
    if (!archiveNames.includes(path)) throw new Error(`Missing catalog file: ${a.relative_path}`);
    const bytes = execFileSync("unzip", ["-p", zip, path], { maxBuffer: 3 * 1024 * 1024 });
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (sha !== a.sha256 || bytes.length !== a.byte_size) throw new Error(`Checksum/size mismatch: ${a.relative_path}`);
    const ext = a.relative_path.split(".").at(-1)!.toLowerCase();
    if (!mime[ext]) throw new Error(`Unsupported original format: ${ext}`);
    if (ext === "svg" && /<script\b|<foreignObject\b|<!ENTITY|\bon\w+\s*=|(?:href|xlink:href)\s*=\s*["'](?:https?:|javascript:|\/\/)/i.test(bytes.toString())) throw new Error(`Unsafe SVG: ${a.relative_path}`);
    if (ext === "png" && bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`Invalid PNG: ${a.relative_path}`);
    files.set(`${sha}.${ext}`, { bytes, filename: `${sha}.${ext}`, contentType: mime[ext] });
    const key = `${a.type}:${normalize(a.code)}`;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const rank = (a: SourceAsset) => a.original_format.toUpperCase() === "SVG" ? 0 : a.original_format.toUpperCase() === "PNG" ? 1 : 2;
  const report: Record<string, unknown> = {
    developmentOnly: true, sourceFiles: source.assets.length, uniqueStoredFiles: files.size,
    identicalFileAliases: source.assets.length - files.size, duplicateRecordVariants: source.assets.length - groups.size,
    missing: source.unavailable, matchedExisting: { crypto: [] as string[], network: [] as string[], paymentMethods: 0, currency: [] as string[] },
    newlyAdded: { crypto: [] as string[], network: [] as string[], paymentMethods: [] as string[], flags: [] as string[], currencies: [] as string[] },
    skipped: [] as string[], configurationAttachments: { crypto: 0, paymentMethods: 0 }, preparedPairs: 0, apply,
  };
  const matched = report.matchedExisting as { crypto: string[]; network: string[]; paymentMethods: number; currency: string[] };
  const added = report.newlyAdded as { crypto: string[]; network: string[]; paymentMethods: string[]; flags: string[]; currencies: string[] };
  const attachments = report.configurationAttachments as { crypto: number; paymentMethods: number };
  const entries: Entry[] = [];
  // Never touches Production, tenant asset assignments, routes, switches or order data.
  // All file validation happens before storage or database writes.
  if (apply) {
    for (const f of files.values()) {
      const target = visualFile(f.filename);
      if ((await target.exists())[0]) {
        const [stored] = await target.download();
        if (!stored.equals(f.bytes)) throw new Error(`Stored asset checksum mismatch: ${f.filename}`);
      } else await target.save(f.bytes, { resumable: false, metadata: { contentType: f.contentType, cacheControl: "public,max-age=31536000,immutable" }, preconditionOpts: { ifGenerationMatch: 0 } });
    }
  }
  await withDatabase({ actorId: "development-visual-import", isSuperAdmin: true, canWrite: apply }, async c => {
    if (apply) await c.query("SELECT pg_advisory_xact_lock(hashtextextended('development-visual-import',0))");
    const assets = (await c.query("SELECT id,symbol,name FROM asset_catalog")).rows;
    const networks = (await c.query("SELECT id,name FROM network_catalog")).rows;
    const originalNetworkIds = new Set(networks.map(r => r.id));
    const configurations = (await c.query("SELECT tenant_id,configuration FROM tenant_product_configuration WHERE module_key='crypto_exchange'" + (apply ? " FOR UPDATE" : ""))).rows;
    const previousPath = fileURLToPath(new URL("../products/exchange/visual-catalog.json", import.meta.url));
    const previous = JSON.parse(await readFile(previousPath, "utf8")) as { assets: Entry[] };
    for (const variants of groups.values()) {
      variants.sort((a, b) => rank(a) - rank(b) || a.relative_path.localeCompare(b.relative_path));
      const a = variants[0], kind = a.type, code = a.code.toUpperCase();
      const urls = [...new Set(variants.map(v => visualUrl(`${v.sha256}.${v.relative_path.split(".").at(-1)!.toLowerCase()}`)))];
      let recordId: string | null = null;
      if (kind === "crypto") {
        const matches = assets.filter(r => normalize(r.symbol) === normalize(a.symbol ?? code));
        if (matches.length > 1) throw new Error(`Ambiguous existing crypto code ${code}; no duplicate created.`);
        if (matches[0]) { recordId = matches[0].id; matched.crypto.push(code); }
        else {
          recordId = `imported-${normalize(code)}`; added.crypto.push(code);
          if (assets.some(r => r.id === recordId)) throw new Error(`Conflicting asset identifier ${recordId}`);
          if (apply) await c.query("INSERT INTO asset_catalog(id,symbol,name) VALUES($1,$2,$3)", [recordId, code, a.name]);
          assets.push({ id: recordId, symbol: code, name: a.name });
        }
      } else if (kind === "network") {
        const aliases = NETWORK_ALIASES[code] ?? [];
        const matches = networks.filter(r => normalize(r.id) === normalize(code) || normalize(r.name) === normalize(a.name) || aliases.includes(r.id));
        if (matches.length > 1) throw new Error(`Ambiguous existing network code ${code}; no duplicate created.`);
        if (matches[0]) {
          recordId = matches[0].id;
          if (originalNetworkIds.has(recordId)) matched.network.push(code);
          else (report.skipped as string[]).push(`Network alias ${code} uses the same catalog record as ${recordId}; no duplicate created.`);
        }
        else {
          recordId = `imported-${normalize(code)}`; added.network.push(code);
          if (networks.some(r => r.id === recordId)) throw new Error(`Conflicting network identifier ${recordId}`);
          if (apply) await c.query("INSERT INTO network_catalog(id,name,testnet) VALUES($1,$2,true)", [recordId, a.name]);
          networks.push({ id: recordId, name: a.name });
        }
      } else if (kind === "payment-method") {
        if (!previous.assets.some(e => e.kind === kind && normalize(e.code) === normalize(code))) added.paymentMethods.push(code);
      } else if (kind === "flag") {
        if (!previous.assets.some(e => e.kind === kind && e.code === code)) added.flags.push(code);
      }
      entries.push({ kind, code, name: a.name, logoUrl: urls[0], alternatives: urls.slice(1), recordId,
        countries: a.country ? [a.country] : [], currencies: Array.isArray(a.currency) ? a.currency : a.currency ? [a.currency] : [] });
    }
    // Only catalog-declared asset/network relationships. No tenant assignments
    // or Exchange switches/routes are created; unknown symbols remain reported.
    const existingPairs = (await c.query("SELECT asset_id,network_id FROM asset_network_catalog")).rows;
    for (const network of source.assets.filter((a: SourceAsset) => a.type === "network")) {
      const n = entries.find(e => e.kind === "network" && normalize(e.code) === normalize(network.code));
      for (const symbol of network.asset_codes ?? []) {
        const a = assets.find(r => normalize(r.symbol) === normalize(symbol));
        if (!a || !n?.recordId) { (report.skipped as string[]).push(`Unresolved catalog pair: ${symbol}/${network.code}`); continue; }
        if (existingPairs.some(p => p.asset_id === a.id && p.network_id === n.recordId)) continue;
        if (apply) await c.query("INSERT INTO asset_network_catalog(id,asset_id,network_id) VALUES($1,$2,$3)", [`visual-${a.id}-${n.recordId}`, a.id, n.recordId]);
        existingPairs.push({ asset_id: a.id, network_id: n.recordId });
        report.preparedPairs = Number(report.preparedPairs) + 1;
      }
    }
    const currencies = [...new Set(entries.flatMap(e => e.kind === "flag" ? e.currencies : []))].sort();
    for (const code of currencies) {
      const candidates = entries.filter(e => e.kind === "flag" && e.currencies.includes(code));
      const preferredCountry: Record<string, string> = { USD: "US", EUR: "EU", GBP: "GB", AUD: "AU", CAD: "CA", CHF: "CH", XAF: "CM", XOF: "SN" };
      const primary = candidates.find(e => e.code === preferredCountry[code]) ?? candidates[0];
      entries.push({ kind: "currency", code, name: `${code} currency visual`, logoUrl: primary.logoUrl,
        alternatives: [...new Set(candidates.map(e => e.logoUrl))].filter(u => u !== primary.logoUrl), recordId: null,
        countries: candidates.map(e => e.code), currencies: [code] });
      if (configurations.some(r => r.configuration.fiatCurrency === code)) matched.currency.push(code);
      if (!previous.assets.some(e => e.kind === "currency" && e.code === code)) added.currencies.push(code);
    }
    for (const row of configurations) {
      const cfg = row.configuration;
      let changed = false;
      for (const asset of cfg.assets ?? []) {
        const e = entries.find(e => e.kind === "crypto" && e.recordId === asset.assetId && normalize(e.code) === normalize(asset.symbol));
        if (e && asset.logoUrl !== e.logoUrl) { asset.logoUrl = e.logoUrl; changed = true; attachments.crypto++; }
      }
      for (const method of cfg.paymentMethods ?? []) {
        // Exact normalized identifier/name only. Generic "bank transfer" is NOT SWIFT/SEPA.
        const e = entries.find(e => e.kind === "payment-method" && (normalize(e.code) === normalize(method.id) || normalize(e.name) === normalize(method.label)));
        if (e) {
          matched.paymentMethods++;
          if (method.logoUrl !== e.logoUrl) { method.logoUrl = e.logoUrl; changed = true; attachments.paymentMethods++; }
        }
      }
      if (changed && apply) await c.query("UPDATE tenant_product_configuration SET configuration=$2,updated_at=now() WHERE tenant_id=$1 AND module_key='crypto_exchange'", [row.tenant_id, JSON.stringify(cfg)]);
    }
    if (apply) await writeFile(previousPath, JSON.stringify({ assets: entries, unavailable: source.unavailable, sandboxOnly: true, blobs: [...files.values()].map(f => ({ filename: f.filename, contentType: f.contentType })) }, null, 2) + "\n");
  });
  report.catalogEntries = entries.length;
  if (apply) await writeFile(fileURLToPath(new URL("../../../../reports/qxlayer-development-asset-import.json", import.meta.url)), JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}
main().catch(e => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; }).finally(() => pool.end());
