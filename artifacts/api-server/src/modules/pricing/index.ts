import { foundationOnly, type Money, type SandboxContext } from "../shared/contracts";
export interface PricingService {
  quote(context: SandboxContext, input: Money, outputAsset: string): Promise<{ output: Money; fee: Money; expiresAt: Date }>;
}
export const pricingService: PricingService = {
  async quote() { return foundationOnly("Pricing execution"); },
};