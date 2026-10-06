import { withDatabase } from "@workspace/db";
import { SaveExchangePreviewIntegrationsBody, GetExchangePreviewIntegrationsResponse } from "@workspace/api-zod";
import { contextFor, type Principal } from "../../modules/authentication/service";
import { assertOperational, lockTenant, requireFeature, resolveEntitlements } from "../../modules/entitlements/resolver";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";

export function emptyPreviewSettings() {
  return {
    api: { enabled: false, label: "", baseUrl: "" },
    webhooks: { enabled: false, label: "", endpointUrl: "", events: [] },
    rpc: { enabled: false, label: "", endpointUrl: "", networkName: "" },
  };
}

function rejectCredentials(value: unknown) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (/(secret|password|private.?key|api.?key|token|credential|authorization|headers)/i.test(key)) {
      throw new HttpError(400, "Preview settings cannot contain credentials or secrets.");
    }
    rejectCredentials(child);
  }
}

function endpoint(value: string, required: boolean, name: string) {
  if (!value && !required) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.hostname && !url.username && !url.password && !url.search && !url.hash) return;
  } catch { /* Report the same actionable validation error for every invalid URL. */ }
  throw new HttpError(400, `${name} needs an HTTPS URL without credentials, query parameters or fragments.`);
}

/** Private optional metadata only. It never grants entitlements or calls the stored endpoints. */
export function previewIntegrations(principal: Principal, tenantId: string, input?: unknown) {
  rejectCredentials(input);
  const body = input === undefined ? undefined : SaveExchangePreviewIntegrationsBody.parse(input);
  const settings = body?.settings;
  const modules = body?.modules ?? ["api", "webhooks", "rpc"];
  if (settings) {
    settings.api.label = settings.api.label.trim();
    settings.api.baseUrl = settings.api.baseUrl.trim();
    settings.webhooks.label = settings.webhooks.label.trim();
    settings.webhooks.endpointUrl = settings.webhooks.endpointUrl.trim();
    settings.webhooks.events = [...new Set(settings.webhooks.events)];
    settings.rpc.label = settings.rpc.label.trim();
    settings.rpc.endpointUrl = settings.rpc.endpointUrl.trim();
    settings.rpc.networkName = settings.rpc.networkName.trim();
    if (modules.includes("api")) endpoint(settings.api.baseUrl, settings.api.enabled, "API preview");
    if (modules.includes("webhooks")) {
      endpoint(settings.webhooks.endpointUrl, settings.webhooks.enabled, "Webhook preview");
      if (settings.webhooks.enabled && !settings.webhooks.events.length) throw new HttpError(400, "Choose at least one event for the webhook preview.");
    }
    if (modules.includes("rpc")) {
      endpoint(settings.rpc.endpointUrl, settings.rpc.enabled, "RPC preview");
      if (settings.rpc.enabled && !settings.rpc.networkName) throw new HttpError(400, "Enter a network name for the RPC preview.");
    }
  }
  return withDatabase(contextFor(principal, tenantId, settings !== undefined, "configuration.manage"), async client => {
    if (settings) await lockTenant(client, tenantId);
    const effective = await resolveEntitlements(client, tenantId);
    requireFeature(effective, "crypto_exchange");
    if (settings) {
      assertOperational(effective);
      const previous = await client.query("SELECT configuration->'optionalIntegrations' AS settings FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId]);
      const merged = { ...emptyPreviewSettings(), ...previous.rows[0]?.settings,
        ...Object.fromEntries(modules.map(module => [module, settings[module as keyof typeof settings]])) };
      // A private namespace in the existing Exchange row avoids a new database migration.
      // No provisioning step or operational setting is changed by these optional forms.
      await client.query(`INSERT INTO tenant_product_configuration (tenant_id,module_key,configuration)
        VALUES ($1,'crypto_exchange',$2)
        ON CONFLICT (tenant_id,module_key) DO UPDATE SET
          configuration=jsonb_set(tenant_product_configuration.configuration,'{optionalIntegrations}',EXCLUDED.configuration->'optionalIntegrations',true),
          updated_at=now()`, [tenantId, JSON.stringify({ optionalIntegrations: merged })]);
      await audit(client, principal, tenantId, "exchange.preview.saved", "Saved optional sandbox integration settings; no connection or execution", {
        api: merged.api.enabled, webhooks: merged.webhooks.enabled, rpc: merged.rpc.enabled,
      });
    }
    const stored = await client.query("SELECT configuration->'optionalIntegrations' AS settings FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId]);
    return GetExchangePreviewIntegrationsResponse.parse({
      settings: stored.rows[0]?.settings ?? emptyPreviewSettings(),
      sandboxOnly: true, executionStatus: "configuration_only",
    });
  });
}
