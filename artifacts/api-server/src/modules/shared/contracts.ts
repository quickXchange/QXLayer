import type { Principal } from "../authentication/service";
import { HttpError } from "../../lib/errors";

export interface SandboxContext {
  principal: Principal;
  tenantId: string;
  environment: "sandbox";
}
export interface Money {
  amount: string; // Decimal strings only: do not use floating point for financial amounts.
  assetId: string;
}
export function foundationOnly(capability: string): never {
  throw new HttpError(501, `${capability} is deferred. This build provides configuration and isolation only.`);
}