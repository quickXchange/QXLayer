import { foundationOnly, type SandboxContext } from "../shared/contracts";
export interface BlockchainProvider {
  readonly id: string;
  health(): Promise<{ status: "not_connected"; sandbox: true }>;
  monitor(context: SandboxContext, reference: string): Promise<void>;
}
class SandboxProvider implements BlockchainProvider {
  readonly id = "sandbox";
  async health() { return { status: "not_connected" as const, sandbox: true as const }; }
  async monitor(): Promise<void> { foundationOnly("Blockchain deposit monitoring"); }
}
export function getBlockchainProvider(adapter: string): BlockchainProvider {
  if (adapter !== "sandbox") foundationOnly("Live blockchain providers");
  return new SandboxProvider();
}
// Primary/secondary/manual priority is stored per tenant/network. No external RPC calls are made.