import { createHmac, timingSafeEqual } from "node:crypto";

// No delivery or real signing secret is configured. Helpers operate on caller-provided
// bytes; a future worker must resolve secrets server-side and enforce egress restrictions.
export function signWebhook(payload: Buffer, secret: Buffer) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
export function verifyWebhook(payload: Buffer, signature: string, secret: Buffer) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signWebhook(payload, secret), "hex"), Buffer.from(signature, "hex"));
}