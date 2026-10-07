import { HttpError } from "../../lib/errors";
import type { ProviderEnvironment } from "./contracts";
import type { ProviderSchemaField } from "@workspace/api-zod";

export interface CredentialScope {
  tenantId: string; providerId: string; environment: ProviderEnvironment;
}
export interface CredentialState { configured: boolean; masked: "Not configured" | "••••••••"; keyVersion: string | null }
/** Vault is the only future boundary for secrets. Never return plaintext to API callers.
 * Must use a provisioned, versioned server key and bind tenant/provider/environment
 * as authenticated encryption context. Existing AES-GCM helper alone is NOT a vault.
 */
export interface ProviderCredentialVault {
  state(scope: CredentialScope): Promise<CredentialState>;
  put(scope: CredentialScope, secret: Readonly<Record<string, string>>): Promise<CredentialState>;
  remove(scope: CredentialScope): Promise<void>;
  withCredentials<T>(scope: CredentialScope, work: (secret: Readonly<Record<string, string>>) => Promise<T>): Promise<T>;
}
export const unavailableCredentialVault: ProviderCredentialVault = {
  async state() { return { configured: false, masked: "Not configured", keyVersion: null }; },
  async put() { throw new HttpError(501, "Secure provider credential persistence is not provisioned. Credentials are not accepted."); },
  async remove() { throw new HttpError(501, "Credential storage is not available."); },
  async withCredentials() { throw new HttpError(501, "Credential storage is not available."); },
};
const sensitive = /secret|password|token|credential|authorization|private.?key|api.?key|api.?secret|account.?id|rpc.?url/i;
export function rejectSecrets(value: unknown, schemaDefinition = false): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (schemaDefinition && (key === "credentialSchema" || key === "configurationSchema")) continue;
    if (sensitive.test(key)) throw new HttpError(400, "Secret values are not accepted by provider configuration.");
    rejectSecrets(child);
  }
}
export function safeUrl(value: string): void {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash) return;
  } catch { /* uniform failure without echoing the unsafe input */ }
  throw new HttpError(400, "Use a public HTTPS URL without credentials, query parameters or fragments.");
}
export function validateFields(fields: ProviderSchemaField[], credentials: boolean) {
  if (new Set(fields.map(f => f.key)).size !== fields.length) throw new HttpError(400, "Schema field keys must be unique.");
  for (const field of fields) {
    if (!credentials && (field.type === "secret" || sensitive.test(field.key))) throw new HttpError(400, "Secret/account/RPC credential fields belong in the credentials schema, not configuration.");
  }
}
export function validateConfiguration(fields: ProviderSchemaField[], configuration: Record<string, unknown>) {
  rejectSecrets(configuration);
  if (Object.keys(configuration).length > 30) throw new HttpError(400, "Too many configuration fields.");
  for (const key of Object.keys(configuration)) {
    const field = fields.find(f => f.key === key);
    if (!field) throw new HttpError(400, "Configuration contains a field not defined by the provider schema.");
    const value = configuration[key];
    if ((field.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) ||
      (field.type === "boolean" && typeof value !== "boolean") ||
      (["text", "url"].includes(field.type) && (typeof value !== "string" || value.length > 2000))) {
      throw new HttpError(400, "Configuration field type does not match the schema.");
    }
    if (field.type === "url") safeUrl(value as string);
  }
  for (const field of fields) if (field.required && (configuration[field.key] === undefined || configuration[field.key] === "")) {
    throw new HttpError(400, "Complete all required non-secret configuration fields.");
  }
}
