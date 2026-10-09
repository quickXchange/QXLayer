import type { ExchangeSettings } from "@workspace/api-zod";
import { decimal } from "../../modules/entitlements/decimal";

/** Incomplete network limits may be saved in a draft, but cannot be released. */
export function networkCapacityBlockers(
  networks: ExchangeSettings["networks"],
  usableRoutes: ExchangeSettings["routes"],
) {
  const blockers = new Set<string>();
  const byId = new Map(networks.map(network => [network.assetNetworkId, network]));
  for (const route of usableRoutes) {
    for (const endpoint of [route.source, route.destination]) {
      const network = byId.get(endpoint);
      if (network && decimal(network.maximum) === 0n) {
        blockers.add(`Set a positive maximum for network ${endpoint} before activating its Exchange route. Zero network limits cannot quote a positive amount.`);
      }
    }
    const source = byId.get(route.source);
    if (source && decimal(source.maximum) > 0n &&
        (decimal(route.minimum) > decimal(source.maximum) || decimal(route.maximum) < decimal(source.minimum))) {
      blockers.add(`Align route ${route.id} with source network ${route.source}: their minimum/maximum ranges do not overlap.`);
    }
  }
  return [...blockers];
}
