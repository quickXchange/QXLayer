/** Contracts only. No network client, wallet, payment or execution implementation. */
export type ProviderEnvironment = "sandbox" | "test" | "live";
export type ConnectionState = "not_configured" | "configured" | "testing" | "connected" | "error";
export type CapabilityResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "unsupported" | "not_implemented" | "not_connected"; message: string };
export interface OperationContext {
  tenantId: string; providerId: string; environment: ProviderEnvironment;
  /** Mandatory for every future operation with external side effects. */
  idempotencyKey: string;
}
export interface Market { source: string; destination: string }
export interface Rate extends Market { rate: string; expiresAt: string }
export interface ExternalOperation { externalId: string; status: string }
export interface Quote extends Rate { inputAmount: string; outputAmount: string; fees: string }
export interface RatesAdapter {
  getRate(market: Market): Promise<CapabilityResult<Rate>>;
  getMarkets(): Promise<CapabilityResult<Market[]>>;
}
export interface ConvertAdapter {
  getQuote(input: Market & { amount: string }): Promise<CapabilityResult<Quote>>;
  createConversion(context: OperationContext, quoteId: string): Promise<CapabilityResult<ExternalOperation>>;
  getConversionStatus(context: OperationContext, externalId: string): Promise<CapabilityResult<ExternalOperation>>;
}
export interface PaymentAdapter {
  createPayment(context: OperationContext, input: { amount: string; currency: string }): Promise<CapabilityResult<ExternalOperation>>;
  getPaymentStatus(context: OperationContext, externalId: string): Promise<CapabilityResult<ExternalOperation>>;
}
export interface DepositAdapter {
  createDepositAddress(context: OperationContext, network: string): Promise<CapabilityResult<{ address: string; memo?: string }>>;
  getDepositStatus(context: OperationContext, externalId: string): Promise<CapabilityResult<ExternalOperation>>;
}
export interface RpcAdapter {
  getBlockHeight(network: string): Promise<CapabilityResult<string>>;
  getTransaction(network: string, hash: string): Promise<CapabilityResult<{ hash: string; status: string }>>;
  getTransactionStatus(network: string, hash: string): Promise<CapabilityResult<string>>;
}
export interface VerifiedWebhook {
  /** Derived from a verified account binding, never trusted from a request tenantId. */
  accountBinding: string; eventId: string; eventType: string; occurredAt: string;
  payload: Record<string, unknown>;
}
export interface WebhookAdapter {
  verifyWebhook(rawBody: Uint8Array, headers: Record<string, string>, credentialReference: string): Promise<boolean>;
  normalizeWebhookEvent(rawBody: Uint8Array): Promise<VerifiedWebhook>;
}
export interface ProviderAdapter {
  providerId: string;
  capabilities: ReadonlySet<string>;
  environments: ReadonlySet<ProviderEnvironment>;
  rates?: RatesAdapter; convert?: ConvertAdapter; payments?: PaymentAdapter;
  deposits?: DepositAdapter; rpc?: RpcAdapter; webhooks?: WebhookAdapter;
  verifyConnection(scope: Omit<OperationContext, "idempotencyKey">, credentialReference: string): Promise<CapabilityResult<{ verifiedAt: string }>>;
}
export const INITIAL_CATEGORIES = ["Exchange / Convert", "Payment", "Rates / Market Data", "RPC / Blockchain Node", "Deposit / Wallet Infrastructure", "Webhook / Event Provider"];
export const INITIAL_CAPABILITIES = ["rates", "quotes", "convert", "buy", "sell", "payments", "deposit_addresses", "deposit_monitoring", "withdrawals", "rpc", "transaction_monitoring", "webhooks"];
export const ROUTE_CAPABILITIES: Record<string, readonly string[]> = {
  swap: ["quotes", "convert"], convert: ["convert", "quotes"],
  buy: ["buy", "payments", "quotes"], sell: ["sell", "payments", "quotes"],
};
export const NETWORK_CAPABILITIES = ["deposit_addresses", "deposit_monitoring", "rpc", "transaction_monitoring"];
