import type { DatabaseClient } from "@workspace/db";
import type { EffectiveEntitlements } from "../../modules/entitlements/resolver";
import { HttpError } from "../../lib/errors";
import { ACTIONS, readExchange, validateExchange } from "./settings";

/** Operational readiness only: optional integration metadata never makes an Exchange ready. */
export async function exchangeActivationBlockers(client: DatabaseClient, tenantId: string, effective: EffectiveEntitlements, legacyEnabled: boolean) {
  const linked = await client.query(
    "SELECT configuration->'actions' AS actions,approved_configuration->'plan'->>'id' AS reviewed_plan FROM white_label_requests WHERE tenant_id=$1",
    [tenantId],
  );
  const stored = await client.query(
    "SELECT configuration FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId],
  );
  const raw = stored.rows[0]?.configuration;
  // Other products' visual previews and metadata-only saves are not operational Exchanges.
  if (!linked.rowCount && raw?.enabled !== true) return [];
  if (!raw || !Array.isArray(raw.assets) || !Array.isArray(raw.networks) || !Array.isArray(raw.routes)) {
    return ["Save the Exchange setup: assets, available networks, enabled actions, routes and pricing."];
  }
  const blockers: string[] = [];
  if (!effective.features.crypto_exchange || !effective.features.website) {
    blockers.push("Assign a plan with Exchange and Website access.");
  }
  if (linked.rows.some(row => row.reviewed_plan && row.reviewed_plan !== effective.plan?.id)) {
    blockers.push("Assign the operator-reviewed plan before releasing this Exchange.");
  }
  if (raw.referenceCurrency !== effective.plan?.currency) {
    blockers.push("Review and save Exchange pricing for the assigned plan currency.");
  }
  let settings;
  let assetForNetwork = new Map<string, string>();
  try {
    const saved = await readExchange(client, tenantId);
    settings = validateExchange(saved.configuration, effective, saved.catalog);
    assetForNetwork = new Map(saved.catalog.map(asset => [asset.assetNetworkId, asset.assetId]));
  } catch (error) {
    blockers.push(error instanceof HttpError ? error.message : "Review and save valid Exchange settings.");
    return blockers;
  }
  if (!settings.enabled || !legacyEnabled) blockers.push("Enable the Exchange in sandbox Settings.");
  const enabledAssets = new Set(settings.assets.filter(asset => asset.enabled).map(asset => asset.assetId));
  const availableNetworks = new Set(settings.networks
    .filter(network => network.enabled && network.available && enabledAssets.has(assetForNetwork.get(network.assetNetworkId) ?? ""))
    .map(network => network.assetNetworkId));
  if (!enabledAssets.size) blockers.push("Enable at least one Exchange asset.");
  if (!availableNetworks.size) blockers.push("Enable an available Exchange network for an enabled asset.");
  const available = (endpoint: string) => endpoint === `fiat:${settings.fiatCurrency}` || availableNetworks.has(endpoint);
  const usableRoutes = settings.routes.filter(route => route.enabled && settings.actions[route.action] && available(route.source) && available(route.destination));
  if (!usableRoutes.length) blockers.push("Save an enabled route connecting available Exchange endpoints.");
  const requestedActions = new Set(linked.rows.flatMap(row => Array.isArray(row.actions) ? row.actions as string[] : []));
  for (const action of ACTIONS) {
    if (requestedActions.has(action) && (!settings.actions[action] || !usableRoutes.some(route => route.action === action))) {
      blockers.push(`Enable the requested ${action} action and configure an available ${action} route.`);
    }
  }
  return blockers;
}
