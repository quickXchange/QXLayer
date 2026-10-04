import { foundationOnly, type Money, type SandboxContext } from "../shared/contracts";
import { requireEntitlement } from "../entitlements/service";
export interface OrderService {
  create(context: SandboxContext, input: Money, outputAsset: string, idempotencyKey: string): Promise<{ id: string }>;
}
export const orderService: OrderService = {
  async create(context) {
    await requireEntitlement(context.principal, context.tenantId, "crypto_exchange");
    return foundationOnly("Exchange order execution");
  },
};