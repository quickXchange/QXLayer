import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type { Principal } from "../authentication/service";
import { HttpError } from "../../lib/errors";
import { signProof, readProof } from "../../lib/scoped-proof";
import { DEMO_USER_ID } from "./identity";
import { DEMO_TENANT_ID } from "./fixture";

const COOKIE = "qx_novax_demo";
const TTL = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; until: number }>();
export const demoEnabled = () => !!process.env.SESSION_SECRET;
function cookieToken(req: Request) {
  return req.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
}
export function demoIdentity(): Principal {
  return { userId: DEMO_USER_ID, role: "staff", demo: true,
    memberships: [{ tenantId: DEMO_TENANT_ID, role: "staff", permissions: [] }] };
}
export async function demoPrincipal(req: Request) {
  // Explicit tab-scoped intent prevents demo cookies shadowing the real Owner.
  if (req.get("x-qx-demo") !== "read-only") return null;
  const proof = readProof("isolated-admin-demo", cookieToken(req));
  if (!proof || proof.tenantId !== DEMO_TENANT_ID || typeof proof.expiresAt !== "number" ||
    proof.expiresAt <= Date.now() || proof.expiresAt > Date.now() + TTL) throw new HttpError(401, "Demo expired. Reopen the Admin Demo.");
  return demoIdentity();
}
export async function startDemo(req: Request, res: Response) {
  const now = Date.now(), ip = req.ip ?? "unknown";
  for (const [k, v] of attempts) if (v.until <= now) attempts.delete(k);
  const attempt = attempts.get(ip) ?? { count: 0, until: now + 60000 };
  if (++attempt.count > 30 || attempts.size >= 10000) throw new HttpError(429, "Please pause before reopening the demo.");
  attempts.set(ip, attempt);
  const token = signProof("isolated-admin-demo", { tenantId: DEMO_TENANT_ID, expiresAt: now + TTL, nonce: randomBytes(16).toString("hex") });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" || req.secure, path: "/api", maxAge: TTL });
  return { active: true, tenantId: DEMO_TENANT_ID, readOnly: true };
}
export function endDemo(_req: Request, res: Response) {
  res.clearCookie(COOKIE, { path: "/api", httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
  return { active: false, tenantId: null, readOnly: true };
}
export function assertDemoRequest(principal: Principal, req: Request) {
  if (!principal.demo) return;
  if (req.method !== "GET") throw new HttpError(403, "Demo is read-only. Persistent changes and account management are disabled.");
}
