import type { EffectiveEntitlements } from "../entitlements/resolver";
import { exchangePlugin } from "../../products/exchange/plugin";

/** Trusted code adapters, never scripts uploaded through the catalog API.
 * Future implementations register here without changing tenant storage, RBAC or entitlements.
 * Registration metadata alone never mounts routes or activates execution.
 */
export interface ProductPlugin {
  key: string;
  validateConfiguration(value: Record<string, unknown>, effective: EffectiveEntitlements): Record<string, unknown>;
}
const plugins = new Map<string, ProductPlugin>([exchangePlugin].map((p) => [p.key, p]));
export function pluginFor(key: string) { return plugins.get(key); }