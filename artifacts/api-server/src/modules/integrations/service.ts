import { withDatabase } from "@workspace/db";
import { z } from "zod/v4";
import { contextFor, requireSuperAdmin, type Principal } from "../authentication/service";
import { resolveEntitlements, requireFeature } from "../entitlements/resolver";
import { audit } from "../../lib/audit";
import { HttpError } from "../../lib/errors";
import { definitions, SOURCE_COMMIT } from "./definitions";
import { definition, saveIntegrationInput, mayManageSecrets, validateSecrets, safeProviderEndpoint } from "./input";
import { credentialIdentity, open, seal, vaultAvailable, type Scope } from "./vault";
import { testProvider } from "./adapters";

const publicView = (r: Record<string, any>, p: Principal) => {
  const role = p.role === "super_admin" ? p.role : p.memberships.find(m => m.tenantId === r.tenant_id)?.role;
  return { id: r.id, tenantId: r.tenant_id, providerKey: r.provider_key, environment: "sandbox",
    credentialManagement: r.credential_management, enabled: r.enabled, settings: r.settings,
    credentialsConfigured: !!r.encrypted_credentials, canManageCredentials: mayManageSecrets(role ?? "", r.credential_management),
    revision: Number(r.revision), health: r.health, updatedAt: r.updated_at };
};
export async function accessible(p: Principal, tenantId: string, write = false) {
  const ctx = contextFor(p, tenantId, write);
  await withDatabase(ctx, async c => {
    const e = await resolveEntitlements(c, tenantId);
    if (p.role !== "super_admin" && (e.tenantStatus === "suspended" || e.status !== "active")) throw new HttpError(403, "Tenant Admin access is suspended.");
    if (p.role !== "super_admin") requireFeature(e, "crypto_exchange");
  });
  return ctx;
}
export async function integrationBundle(p: Principal, tenantId?: string) {
  const ctx = tenantId ? await accessible(p, tenantId) : (requireSuperAdmin(p), contextFor(p));
  return withDatabase(ctx, async c => {
    const runtime = p.role === "super_admin" ? (await c.query(`SELECT current_user AS role,
      rolsuper AS superuser,(rolsuper OR rolbypassrls) AS "bypassesRls" FROM pg_roles WHERE rolname=current_user`)).rows[0] : undefined;
    const r = await c.query(`SELECT * FROM tenant_integrations ${tenantId ? "WHERE tenant_id=$1" : ""} ORDER BY tenant_id,provider_key`, tenantId ? [tenantId] : []);
    const tenants = await c.query(`SELECT id,name,slug,status FROM tenants ${tenantId ? "WHERE id=$1" : ""} ORDER BY name`, tenantId ? [tenantId] : []);
    const assetNetworks = tenantId ? await c.query(`SELECT ac.asset_id AS "assetId",ac.network_id AS "networkId",a.symbol,n.name AS "networkName"
      FROM tenant_asset_networks t JOIN asset_network_catalog ac ON ac.id=t.asset_network_id
      JOIN asset_catalog a ON a.id=ac.asset_id JOIN network_catalog n ON n.id=ac.network_id WHERE t.tenant_id=$1`, [tenantId]) : { rows: [] };
    const connections = r.rows.map(r => publicView(r, p));
    const visibleDefinitions = p.role === "super_admin" ? definitions :
      definitions.filter(d => connections.some(r => r.providerKey === d.key)).map(d => ({
        ...d, secretFields: connections.find(r => r.providerKey === d.key)?.canManageCredentials ? d.secretFields : [],
      }));
    return { sourceCommit: SOURCE_COMMIT, sandboxOnly: true, executionEnabled: false, vaultAvailable: vaultAvailable(),
      definitions: visibleDefinitions, connections, tenants: tenants.rows, assetNetworks: assetNetworks.rows, databaseRuntime: runtime };
  });
}
export async function saveIntegration(p: Principal, tenantId: string, key: string, input: unknown) {
  const ctx = await accessible(p, tenantId, true);
  const d = definition(key), body = saveIntegrationInput.parse(input);
  if (body.settings.manualFallback && !d.manualFallback) throw new HttpError(400, "Manual fallback is not supported by this integration.");
  if (body.secrets) validateSecrets(key, body.secrets);
  if (body.secrets?.rpcUrl) safeProviderEndpoint(body.secrets.rpcUrl);
  for (const u of [body.settings.webhookUrl, body.settings.miniAppUrl]) if (u) {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash ||
      parsed.port && parsed.port !== "443" || !parsed.hostname.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname) ||
      parsed.hostname.startsWith("[") || /(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(parsed.hostname))
      throw new HttpError(400, "Use a public HTTPS domain on port 443 without credentials, IP literals or query parameters.");
  }
  return withDatabase(ctx, async c => {
    await c.query("SELECT id FROM tenants WHERE id=$1 FOR UPDATE", [tenantId]);
    const prior = await c.query("SELECT * FROM tenant_integrations WHERE tenant_id=$1 AND provider_key=$2 FOR UPDATE", [tenantId, key]);
    const old = prior.rows[0];
    if (!old && p.role !== "super_admin") throw new HttpError(403, "Super Admin must first authorize this tenant integration.");
    const mode = body.credentialManagement ?? old?.credential_management ?? "super_admin";
    if (p.role !== "super_admin" && (mode !== old.credential_management ||
      (body.enabled !== old.enabled && !old.settings.customerActivation) ||
      (body.settings.customerActivation === true) !== (old.settings.customerActivation === true) ||
      JSON.stringify(body.settings.quoteActions ?? []) !== JSON.stringify(old.settings.quoteActions ?? []) ||
      JSON.stringify(body.settings.assignments ?? []) !== JSON.stringify(old.settings.assignments ?? [])))
      throw new HttpError(403, "Only Super Admin can change authorization, assignments or credential policy. Customer activation requires explicit permission.");
    if ((body.settings.quoteActions?.length ?? 0) && !["1forge", "whitebit", "quickex"].includes(key))
      throw new HttpError(400, "This integration is not a pricing provider.");
    if (key === "quickex" && body.settings.quoteActions?.includes("swap"))
      throw new HttpError(400, "Quickex pricing is assigned to Convert only.");
    if (body.settings.quoteActions?.length) {
      const overlap = await c.query(`SELECT provider_key FROM tenant_integrations WHERE tenant_id=$1 AND provider_key<>$2
        AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(settings->'quoteActions','[]'::jsonb)) action
          WHERE action=ANY($3::text[]))`, [tenantId, key, body.settings.quoteActions]);
      if (overlap.rowCount) throw new HttpError(409, "Remove this action's previous pricing assignment before assigning another provider.");
    }
    const role = p.role === "super_admin" ? p.role : p.memberships.find(m => m.tenantId === tenantId)?.role;
    if ((body.secrets || body.clearCredentials) && !mayManageSecrets(role ?? "", mode)) throw new HttpError(403, "Credential management is not permitted for your tenant role.");
    for (const a of body.settings.assignments ?? []) {
      const owned = await c.query(`SELECT 1 FROM tenant_asset_networks t JOIN asset_network_catalog ac ON ac.id=t.asset_network_id
        WHERE t.tenant_id=$1 AND ac.asset_id=$2 AND ac.network_id=$3`, [tenantId, a.assetId, a.networkId]);
      if (!owned.rowCount) throw new HttpError(400, "Assign only asset/network combinations already enabled for this tenant.");
    }
    const scope: Scope = { tenantId, providerKey: key, environment: "sandbox" };
    let credentials = body.clearCredentials ? null : old?.encrypted_credentials ?? null;
    let identity = body.clearCredentials ? null : old?.credential_identity ?? null;
    if (body.secrets && Object.keys(body.secrets).length) {
      const previous = credentials ? open(scope, credentials) : {};
      const merged = { ...previous, ...body.secrets };
      identity = credentialIdentity(key, merged);
      if (identity) {
        const duplicate = await c.query("SELECT 1 FROM tenant_integrations WHERE provider_key=$1 AND credential_identity=$2 AND tenant_id<>$3", [key, identity, tenantId]);
        if (duplicate.rowCount) throw new HttpError(409, "Use independent credentials. This provider identity is already bound to another tenant.");
      }
      credentials = seal(scope, merged);
    }
    const health = { state: credentials ? "configured" : "not_configured", message: "Settings saved; connection has not been verified for this revision." };
    const r = await c.query(`INSERT INTO tenant_integrations(tenant_id,provider_key,enabled,credential_management,settings,encrypted_credentials,health,credential_identity)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(tenant_id,provider_key,environment) DO UPDATE SET
      enabled=EXCLUDED.enabled,credential_management=EXCLUDED.credential_management,settings=EXCLUDED.settings,
      encrypted_credentials=EXCLUDED.encrypted_credentials,credential_identity=EXCLUDED.credential_identity,health=EXCLUDED.health,revision=tenant_integrations.revision+1,updated_at=now() RETURNING *`,
    [tenantId, key, body.enabled, mode, body.settings, credentials, health, identity]);
    await audit(c, p, tenantId, "integration.settings_saved", "Tenant-scoped integration updated; no financial execution", { providerKey: key, enabled: body.enabled, credentialManagement: mode });
    return publicView(r.rows[0], p);
  });
}
export async function testIntegration(p: Principal, tenantId: string, key: string, input: unknown) {
  const ctx = await accessible(p, tenantId, true);
  z.object({ reason: z.string().trim().min(2).max(500) }).strict().parse(input);
  definition(key);
  const snapshot = await withDatabase(ctx, async c => {
    const r = await c.query("SELECT * FROM tenant_integrations WHERE tenant_id=$1 AND provider_key=$2 FOR UPDATE", [tenantId, key]);
    if (!r.rowCount) throw new HttpError(409, "Save this tenant integration first.");
    const row = r.rows[0];
    if (key === "whitebit") {
      const n = await c.query(`UPDATE tenant_integrations SET last_nonce=GREATEST(last_nonce+1,floor(extract(epoch FROM clock_timestamp())*1000)::bigint)
        WHERE id=$1 RETURNING last_nonce`, [row.id]);
      row.last_nonce = Number(n.rows[0].last_nonce);
    }
    return row;
  });
  const started = Date.now();
  let health: Record<string, unknown>;
  try {
    if (key === "telegram_mini_app") {
      const bot = await withDatabase(ctx, c => c.query("SELECT enabled,health FROM tenant_integrations WHERE tenant_id=$1 AND provider_key='telegram_bot'", [tenantId]));
      if (!snapshot.settings.miniAppUrl || !bot.rows[0]?.enabled || bot.rows[0].health.state !== "connected") throw new HttpError(409, "Configure a public Mini App URL and verify the enabled tenant Bot first.");
      health = { state: "ready", message: "Bot and Mini App configuration ready. Telegram client and domain delivery still require external verification." };
    } else {
      if (!snapshot.encrypted_credentials) throw new HttpError(409, "Provider credentials are not configured.");
      const secrets = open({ tenantId, providerKey: key, environment: "sandbox" }, snapshot.encrypted_credentials);
      health = await testProvider(key, snapshot.settings, secrets, Number(snapshot.last_nonce));
    }
  } catch (e) {
    health = { state: "error", errorCode: e instanceof HttpError && e.status < 500 ? "configuration" : "provider_unavailable",
      message: e instanceof HttpError ? e.message : "Provider test failed or timed out. No secrets or endpoint details are returned." };
  }
  health.checkedAt = new Date().toISOString(); health.latencyMs = Date.now() - started;
  return withDatabase(ctx, async c => {
    const r = await c.query(`UPDATE tenant_integrations SET health=$3,updated_at=now() WHERE tenant_id=$1 AND provider_key=$2 AND revision=$4 RETURNING *`,
      [tenantId, key, health, snapshot.revision]);
    if (!r.rowCount) throw new HttpError(409, "Integration settings changed during testing. Test the new revision.");
    await audit(c, p, tenantId, "integration.connection_tested", "Read-only connection diagnostic completed", { providerKey: key, state: health.state, latencyMs: health.latencyMs });
    return publicView(r.rows[0], p);
  });
}
