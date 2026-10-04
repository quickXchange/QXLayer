import { foundationOnly, type SandboxContext } from "../shared/contracts";
export interface WalletService {
  assignPaymentInformation(context: SandboxContext, assetNetworkId: string, invoiceId: string): Promise<{ reference: string }>;
}
export const walletService: WalletService = {
  async assignPaymentInformation() { return foundationOnly("Wallet/address assignment"); },
};