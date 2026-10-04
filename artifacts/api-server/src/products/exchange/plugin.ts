import { z } from "zod";
import { requireFeature, type EffectiveEntitlements } from "../../modules/entitlements/resolver";
import type { ProductPlugin } from "../../modules/product-registry/plugins";

const settings = z.object({
  defaultAction: z.enum(["swap", "convert", "buy", "sell"]).optional(),
  publicNote: z.string().max(1000).optional(),
}).strict();
export const exchangePlugin: ProductPlugin = {
  key: "crypto_exchange",
  validateConfiguration(value, effective: EffectiveEntitlements) {
    const input = settings.parse(value);
    if (input.defaultAction) requireFeature(effective, input.defaultAction);
    return input;
  },
};