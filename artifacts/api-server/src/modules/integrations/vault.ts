import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { HttpError } from "../../lib/errors";

export interface Scope { tenantId: string; providerKey: string; environment: string }
export interface Envelope { version: "v1"; iv: string; tag: string; ciphertext: string }
const aad = (scope: Scope) => Buffer.from(JSON.stringify(["qxlayer-provider-v1", scope.tenantId, scope.providerKey, scope.environment]));
export function vaultAvailable() {
  return /^[0-9a-f]{64}$/i.test(process.env.PROVIDER_VAULT_KEY_V1 ?? "");
}
function key() {
  if (!vaultAvailable()) throw new HttpError(503, "Provider vault is not provisioned. Add PROVIDER_VAULT_KEY_V1 securely before storing credentials.");
  return Buffer.from(process.env.PROVIDER_VAULT_KEY_V1!, "hex");
}
export function seal(scope: Scope, values: Record<string, string>): Envelope {
  return scopedVault(key).seal(scope, values);
}
export function scopedVault(loadKey: () => Buffer) {
  return { seal(scope: Scope, values: Record<string, string>): Envelope {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", loadKey(), iv);
  cipher.setAAD(aad(scope));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(values), "utf8"), cipher.final()]);
  return { version: "v1", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
  }, open(scope: Scope, value: Envelope): Record<string, string> {
    if (value.version !== "v1") throw new HttpError(503, "Provider credential key version is unavailable.");
    try {
      const decipher = createDecipheriv("aes-256-gcm", loadKey(), Buffer.from(value.iv, "base64"));
      decipher.setAAD(aad(scope)); decipher.setAuthTag(Buffer.from(value.tag, "base64"));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8"));
    } catch {
      throw new HttpError(503, "Provider credentials could not be opened for this scope. Check vault key availability.");
    }
  } };
}
export function credentialIdentity(providerKey: string, values: Record<string, string>) {
  const identity = values.botToken || values.apiKey || (providerKey === "alchemy" ? values.rpcUrl : undefined);
  return identity ? createHmac("sha256", key()).update(JSON.stringify([providerKey, identity])).digest("hex") : null;
}
export function webhookProof(scope: Scope, secrets: Record<string, string>) {
  return createHmac("sha256", key()).update(aad(scope)).update(JSON.stringify([secrets.botToken, secrets.webhookSecret])).digest("hex");
}
export function open(scope: Scope, value: Envelope): Record<string, string> {
  return scopedVault(key).open(scope, value);
}
