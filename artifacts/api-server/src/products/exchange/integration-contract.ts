import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type IntegrationState = "not_connected" | "connected" | "error" | "disabled" | "configuration_only";
export type IntegrationKind = "exchange" | "rates" | "payment" | "rpc" | "webhook" | "deposit";
export interface IntegrationScope { tenantId: string; kind: IntegrationKind; providerId: string }
export interface EncryptedIntegrationCredentials {
  version: 1; keyId: string; iv: string; ciphertext: string; tag: string;
}
export interface PrivateIntegrationRecord extends IntegrationScope {
  state: IntegrationState;
  credentials: EncryptedIntegrationCredentials | null;
}
const scopeProof = (scope: IntegrationScope) => Buffer.from(JSON.stringify([scope.tenantId, scope.kind, scope.providerId]));

// Future verified adapters must obtain a versioned key from server-side secrets,
// never from tenant metadata or browser input. No adapter is connected by this module.
export function sealIntegrationCredentials(scope: IntegrationScope, credentials: Record<string, string>, key: Buffer, keyId: string): EncryptedIntegrationCredentials {
  if (key.length !== 32 || !keyId) throw new Error("A versioned 256-bit server-side encryption key is required.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(scopeProof(scope));
  const bytes = Buffer.concat([cipher.update(JSON.stringify(credentials)), cipher.final()]);
  return { version: 1, keyId, iv: iv.toString("base64url"), ciphertext: bytes.toString("base64url"), tag: cipher.getAuthTag().toString("base64url") };
}
export function openIntegrationCredentials(scope: IntegrationScope, sealed: EncryptedIntegrationCredentials, key: Buffer): Record<string, string> {
  if (sealed.version !== 1 || key.length !== 32) throw new Error("Unsupported credential envelope.");
  const cipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64url"));
  cipher.setAAD(scopeProof(scope));
  cipher.setAuthTag(Buffer.from(sealed.tag, "base64url"));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(sealed.ciphertext, "base64url")), cipher.final()]).toString("utf8"));
}
// The ONLY public projection: never spread a private record into an API response.
export function integrationSummary(record: PrivateIntegrationRecord) {
  return { kind: record.kind, providerId: record.providerId, state: record.state, hasCredentials: record.credentials !== null };
}
