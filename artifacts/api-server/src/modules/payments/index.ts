import { foundationOnly, type Money, type SandboxContext } from "../shared/contracts";
export const paymentStatuses = ["pending", "waiting_for_payment", "payment_detected", "confirming", "paid", "expired", "underpaid", "overpaid", "failed", "refunded"] as const;
export interface PaymentService {
  createInvoice(context: SandboxContext, amount: Money, idempotencyKey: string): Promise<{ id: string }>;
}
export const paymentService: PaymentService = {
  async createInvoice() { return foundationOnly("Payment invoice execution"); },
};