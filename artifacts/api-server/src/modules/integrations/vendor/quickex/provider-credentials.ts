import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
export type QuickexCredentials = { publicKey: string; secretKey: string };
const credentials = new AsyncLocalStorage<QuickexCredentials>();
export const QUICKEX_VERIFICATION_VERSION = 1;
export class ProviderCredentialStateChangedError extends Error {}
export function quickexCredentialFingerprint(value: QuickexCredentials) {
  return createHash("sha256").update(JSON.stringify([value.publicKey, value.secretKey])).digest("hex");
}
export function withQuickexCredentials<T>(value: QuickexCredentials, work: () => T): T { return credentials.run(value, work); }
export async function getQuickexCredentialStorageState(): Promise<any> {
  const value = credentials.getStore();
  return value ? { status: "available", credentials: value, updatedAt: new Date(), lastTestedAt: new Date(),
    verificationVersion: null, verifiedCredentialFingerprint: null, verifiedAt: null } : { status: "absent" };
}
export async function activateQuickexCredentials(..._args: unknown[]): Promise<never> {
  throw new Error("Live Quickex credential activation is disabled in QXLayer Sandbox.");
}
