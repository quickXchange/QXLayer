import { domainToASCII } from "node:url";
import { withDatabase, type DatabaseClient } from "@workspace/db";
import { HttpError } from "../../lib/errors";
import { contextFor, requireSuperAdmin, type Principal } from "../authentication/service";
import {
  CreateTenantBody, UpdateTenantBrandBody, UpdateTenantConfigurationBody,
} from "@workspace/api-zod";
import type { z } from "zod";

const steps = ["brand", "domain", "modules", "assets_networks", "configuration"] as const;
type Step = typeof steps[number];

export async function readTenant(client: DatabaseClient, tenantId: string) {
  const result = await client.query(
    `SELECT t.*, b.brand_name, b.logo_url, b.primary_color, b.accent_color, b.theme_mode,
            b.default_language, b.supported_languages, d.domain,
            c.exchange_enabled, c.payments_enabled, c.allow_guest_checkout
     FROM tenants t JOIN tenant_branding b ON b.tenant_id = t.id
     JOIN tenant_configuration c ON c.tenant_id = t.id
     LEFT JOIN tenant_domains d ON d.tenant_id = t.id WHERE t.id = $1`, [tenantId],
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, "Tenant not found.");
  const modules = await client.query("SELECT module_key FROM tenant_modules WHERE tenant_id = $1 AND enabled = true ORDER BY module_key", [tenantId]);
  const assets = await client.query("SELECT asset_network_id FROM tenant_asset_networks WHERE tenant_id = $1 ORDER BY asset_network_id", [tenantId]);
  const completed = row.completed_steps as string[];
  const enabledModules = modules.rows.map((m) => m.module_key as string);
  const assetNetworkIds = assets.rows.map((a) => a.asset_network_id as string);
  const financial = enabledModules.includes("crypto_exchange") || enabledModules.includes("crypto_payments");
  const complete = steps.every((s) => completed.includes(s)) && enabledModules.length > 0 && (!financial || assetNetworkIds.length > 0);
  return {
    id: row.id as string, name: row.name as string, slug: row.slug as string,
    brandName: row.brand_name as string, domain: row.domain ?? null,
    status: row.status as string, environment: "sandbox" as const,
    enabledModules, provisioningStep: steps.find((s) => !completed.includes(s)) ?? "ready",
    createdAt: row.created_at as Date, logoUrl: row.logo_url ?? null,
    primaryColor: row.primary_color as string, accentColor: row.accent_color as string,
    themeMode: row.theme_mode as string, defaultLanguage: row.default_language as string,
    supportedLanguages: row.supported_languages as string[],
    assetNetworkIds, exchangeEnabled: row.exchange_enabled as boolean,
    paymentsEnabled: row.payments_enabled as boolean,
    allowGuestCheckout: row.allow_guest_checkout as boolean, configurationComplete: complete,
  };
}

export async function audit(client: DatabaseClient, principal: Principal, tenantId: string, eventType: string, description: string) {
  await client.query("INSERT INTO audit_events (tenant_id,actor_id,event_type,description) VALUES ($1,$2,$3,$4)", [tenantId, principal.userId, eventType, description]);
}

export async function getTenant(principal: Principal, tenantId: string) {
  return withDatabase(contextFor(principal, tenantId), (client) => readTenant(client, tenantId));
}

export async function listTenants(principal: Principal) {
  if (principal.role === "super_admin") return withDatabase(contextFor(principal), async (client) => {
    const rows = await client.query("SELECT id FROM tenants ORDER BY created_at DESC");
    return Promise.all(rows.rows.map((row) => readTenant(client, row.id)));
  });
  if (!principal.memberships.length) throw new HttpError(403, "Administrator access has not been assigned.");
  const tenants = await Promise.all(principal.memberships.map((m) => getTenant(principal, m.tenantId)));
  return tenants.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createTenant(principal: Principal, input: z.infer<typeof CreateTenantBody>) {
  requireSuperAdmin(principal);
  return withDatabase(contextFor(principal, undefined, true), async (client) => {
    const result = await client.query("INSERT INTO tenants (name,slug) VALUES ($1,$2) RETURNING id", [input.name.trim(), input.slug]);
    const id = result.rows[0].id as string;
    await client.query("INSERT INTO tenant_branding (tenant_id,brand_name) VALUES ($1,$2)", [id, input.name.trim()]);
    await client.query("INSERT INTO tenant_configuration (tenant_id) VALUES ($1)", [id]);
    await audit(client, principal, id, "tenant.created", `Created sandbox client ${input.name.trim()}`);
    return readTenant(client, id);
  });
}

async function saveStep(principal: Principal, tenantId: string, step: Step, work: (client: DatabaseClient) => Promise<void>) {
  return withDatabase(contextFor(principal, tenantId, true), async (client) => {
    await readTenant(client, tenantId);
    await client.query("SELECT id FROM tenants WHERE id = $1 FOR UPDATE", [tenantId]);
    await work(client);
    await client.query(
      "UPDATE tenants SET completed_steps = ARRAY(SELECT DISTINCT unnest(completed_steps || $2::text[])), updated_at = now() WHERE id = $1",
      [tenantId, [step]],
    );
    await audit(client, principal, tenantId, `tenant.${step}.saved`, `Saved ${step.replaceAll("_", " ")} configuration`);
    return readTenant(client, tenantId);
  });
}

export function saveBrand(principal: Principal, tenantId: string, input: z.infer<typeof UpdateTenantBrandBody>) {
  if (!input.supportedLanguages.includes(input.defaultLanguage)) throw new HttpError(400, "Default language must be included in supported languages.");
  if (input.logoUrl) {
    try {
      const url = new URL(input.logoUrl);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    } catch { throw new HttpError(400, "Logo reference must be an HTTPS URL, or left empty. File uploads are not enabled."); }
  }
  return saveStep(principal, tenantId, "brand", async (client) => {
    await client.query(
      `UPDATE tenant_branding SET brand_name=$2,logo_url=$3,primary_color=$4,accent_color=$5,
       theme_mode=$6,default_language=$7,supported_languages=$8 WHERE tenant_id=$1`,
      [tenantId, input.brandName.trim(), input.logoUrl, input.primaryColor, input.accentColor, input.themeMode, input.defaultLanguage, [...new Set(input.supportedLanguages)]],
    );
  });
}

export function saveDomain(principal: Principal, tenantId: string, raw: string | null) {
  let domain: string | null = null;
  if (raw) {
    domain = domainToASCII(raw.trim().toLowerCase().replace(/\.$/, ""));
    if (domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(domain)) {
      throw new HttpError(400, "Provide a hostname only, such as client.example. No protocol, path, or IP address.");
    }
  }
  return saveStep(principal, tenantId, "domain", async (client) => {
    if (domain) await client.query("INSERT INTO tenant_domains (tenant_id,domain) VALUES ($1,$2) ON CONFLICT (tenant_id) DO UPDATE SET domain=EXCLUDED.domain", [tenantId, domain]);
    else await client.query("DELETE FROM tenant_domains WHERE tenant_id=$1", [tenantId]);
  });
}

export function saveModules(principal: Principal, tenantId: string, keys: string[]) {
  requireSuperAdmin(principal);
  return saveStep(principal, tenantId, "modules", async (client) => {
    await client.query("DELETE FROM tenant_modules WHERE tenant_id=$1", [tenantId]);
    for (const key of [...new Set(keys)]) await client.query("INSERT INTO tenant_modules (tenant_id,module_key,enabled) VALUES ($1,$2,true)", [tenantId, key]);
    await client.query("UPDATE tenant_configuration SET exchange_enabled=exchange_enabled AND $2, payments_enabled=payments_enabled AND $3 WHERE tenant_id=$1", [tenantId, keys.includes("crypto_exchange"), keys.includes("crypto_payments")]);
  });
}

export function saveAssets(principal: Principal, tenantId: string, ids: string[]) {
  return saveStep(principal, tenantId, "assets_networks", async (client) => {
    const catalog = await client.query("SELECT id FROM asset_network_catalog WHERE id = ANY($1::text[])", [ids]);
    if (catalog.rows.length !== new Set(ids).size) throw new HttpError(400, "Only configured sandbox asset/network pairs are supported.");
    await client.query("DELETE FROM tenant_asset_networks WHERE tenant_id=$1", [tenantId]);
    for (const id of [...new Set(ids)]) await client.query("INSERT INTO tenant_asset_networks (tenant_id,asset_network_id) VALUES ($1,$2)", [tenantId, id]);
  });
}

export function saveConfiguration(principal: Principal, tenantId: string, input: z.infer<typeof UpdateTenantConfigurationBody>) {
  return saveStep(principal, tenantId, "configuration", async (client) => {
    const tenant = await readTenant(client, tenantId);
    if (input.exchangeEnabled && !tenant.enabledModules.includes("crypto_exchange")) throw new HttpError(400, "Crypto Exchange entitlement is disabled.");
    if (input.paymentsEnabled && !tenant.enabledModules.includes("crypto_payments")) throw new HttpError(400, "Crypto Payments entitlement is disabled.");
    await client.query("UPDATE tenant_configuration SET environment='sandbox',exchange_enabled=$2,payments_enabled=$3,allow_guest_checkout=$4 WHERE tenant_id=$1", [tenantId, input.exchangeEnabled, input.paymentsEnabled, input.allowGuestCheckout]);
  });
}

export function activateTenant(principal: Principal, tenantId: string) {
  return withDatabase(contextFor(principal, tenantId, true), async (client) => {
    await client.query("SELECT id FROM tenants WHERE id = $1 FOR UPDATE", [tenantId]);
    const tenant = await readTenant(client, tenantId);
    if (!tenant.configurationComplete) throw new HttpError(400, "Complete provisioning, select at least one module, and select sandbox assets for financial modules.");
    await client.query("UPDATE tenants SET status='active',updated_at=now() WHERE id=$1", [tenantId]);
    await audit(client, principal, tenantId, "tenant.sandbox_activated", "Activated configuration in sandbox only; no domain or financial execution launched");
    return readTenant(client, tenantId);
  });
}