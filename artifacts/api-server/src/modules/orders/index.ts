import { foundationOnly, type Money, type SandboxContext } from "../shared/contracts";
export interface OrderService {
  create(context: SandboxContext, input: Money, outputAsset: string, idempotencyKey: string): Promise<{ id: string }>;
}
export const orderService: OrderService = {
  async create() { return foundationOnly("Exchange order execution"); },
};