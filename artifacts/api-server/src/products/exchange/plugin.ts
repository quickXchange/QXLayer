import type { EffectiveEntitlements } from "../../modules/entitlements/resolver";
import type { ProductPlugin } from "../../modules/product-registry/plugins";
import { validateExchange } from "./settings";

export const exchangePlugin: ProductPlugin = {
  key: "crypto_exchange",
  validateConfiguration(value, effective: EffectiveEntitlements) {
    return validateExchange(value, effective);
  },
};