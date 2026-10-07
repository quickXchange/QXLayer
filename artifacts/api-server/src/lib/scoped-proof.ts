import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./errors";

// Different purposes derive independent keys. No process-local session store,
// development authentication or database seeding is used in published replicas.
export function signProof(purpose: string, value: object) {
  if (!process.env.SESSION_SECRET) throw new HttpError(503, "Secure preview sessions are unavailable.");
  const body = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${body}.${signature(purpose, body)}`;
}
function signature(purpose: string, body: string) {
  return createHmac("sha256", process.env.SESSION_SECRET!).update(`qxlayer:${purpose}:v1:${body}`).digest("base64url");
}
export function readProof(purpose: string, token?: string): Record<string, unknown> | null {
  if (!process.env.SESSION_SECRET || !token || token.length > 4096) return null;
  const [body, supplied, extra] = token.split(".");
  if (!body || !supplied || extra || !/^[a-zA-Z0-9_-]+$/.test(body) || !/^[a-zA-Z0-9_-]{43}$/.test(supplied)) return null;
  const expected = signature(purpose, body);
  if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString());
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
