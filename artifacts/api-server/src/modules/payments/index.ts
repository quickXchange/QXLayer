import { foundationOnly, type Money, type SandboxContext } from "../shared/contracts";
import { requireEntitlement } from "../entitlements/service";
export const paymentStatuses = ["pending", "waiting_for_payment", "payment_detected", "confirming", "paid", "expired", "underpaid", "overpaid", "failed", "refunded"] as const;
export interface PaymentService {
  createInvoice(context: SandboxContext, amount: Money, idempotencyKey: string): Promise<{ id: string }>;
}
export const paymentService: PaymentService = {
  async createInvoice(context) {
    await requireEntitlement(context.principal, context.tenantId, "crypto_payments");
    return foundationOnly("Payment invoice execution");
  },
};