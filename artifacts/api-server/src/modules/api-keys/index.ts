import { createHash, timingSafeEqual } from "node:crypto";

// Keys are not issued in this foundation. Future issuance must return a raw key once,
// persist only this hash, and bind scopes + tenant + sandbox environment.
export function hashApiKey(rawKey: string) {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}
export function apiKeyMatches(rawKey: string, storedHash: string) {
  if (!/^[a-f0-9]{64}$/.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(hashApiKey(rawKey), "hex"), Buffer.from(storedHash, "hex"));
}