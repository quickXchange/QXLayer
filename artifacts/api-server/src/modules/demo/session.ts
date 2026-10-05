import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { withDatabase } from "@workspace/db";
import type { Principal } from "../authentication/service";
import { HttpError } from "../../lib/errors";
import { DEMO_SLUG, DEMO_USER_ID } from "./identity";

const COOKIE = "qx_novax_demo";
const TTL = 60 * 60 * 1000;
const sessions = new Map<string, number>();
const loginAttempts = new Map<string, { count: number; until: number }>();
export const demoEnabled = () => process.env.NODE_ENV === "development";
function cookieToken(req: Request) {
  return req.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
}
function collectExpired() {
  const now = Date.now();
  for (const [token, expires] of sessions) if (expires <= now) sessions.delete(token);
  for (const [ip, entry] of loginAttempts) if (entry.until <= now) loginAttempts.delete(ip);
}
export async function demoIdentity(): Promise<Principal> {
  const result = await withDatabase({ actorId: DEMO_USER_ID }, c => c.query(
    `SELECT t.id FROM tenants t JOIN tenant_memberships m ON m.tenant_id=t.id
     WHERE t.slug=$1 AND t.name='NovaX Exchange' AND t.status='active'
     AND 'exchange_provisioned'=ANY(t.completed_steps)
     AND m.clerk_user_id=$2 AND m.active=true AND m.role='staff' AND cardinality(m.permissions)=0`,
    [DEMO_SLUG, DEMO_USER_ID],
  ));
  if (result.rowCount !== 1) throw new HttpError(503, "The development demo is unavailable.");
  // Clip authority to ONE read-only membership even if a mistaken extra grant is added.
  return { userId: DEMO_USER_ID, role: "staff", demo: true,
    memberships: [{ tenantId: result.rows[0].id, role: "staff", permissions: [] }] };
}
export async function demoPrincipal(req: Request) {
  if (!demoEnabled()) return null;
  collectExpired();
  const token = cookieToken(req);
  if (!token || !/^[a-f0-9]{64}$/.test(token) || !sessions.has(token)) return null;
  return demoIdentity();
}
export async function startDemo(req: Request, res: Response, username: string, password: string) {
  collectExpired();
  const ip = req.ip ?? "unknown";
  const attempt = loginAttempts.get(ip) ?? { count: 0, until: Date.now() + 60000 };
  if (attempt.count >= 30) throw new HttpError(429, "Too many demo sign-in attempts. Try again in a minute.");
  attempt.count++;
  loginAttempts.set(ip, attempt);
  // Intentionally public demonstration credentials. Never used for real accounts.
  if (username !== "demo@qxlayer.com" || password !== "Demo123!") throw new HttpError(401, "Incorrect demo credentials.");
  const identity = await demoIdentity();
  if (sessions.size >= 5000) throw new HttpError(503, "Demo session capacity reached. Try again later.");
  const old = cookieToken(req);
  if (old) sessions.delete(old);
  const token = randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + TTL);
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: req.secure || req.get("x-forwarded-proto") === "https", path: "/api", maxAge: TTL });
  return { active: true, tenantId: identity.memberships[0].tenantId, readOnly: true };
}
export function endDemo(req: Request, res: Response) {
  const token = cookieToken(req);
  if (token) sessions.delete(token);
  res.clearCookie(COOKIE, { path: "/api", httpOnly: true, sameSite: "strict" });
  return { active: false, tenantId: null, readOnly: true };
}
export function assertDemoRequest(principal: Principal, req: Request) {
  if (!principal.demo) return;
  if (req.method !== "GET") throw new HttpError(403, "Sandbox Demo is read-only. Persistent changes and account management are disabled.");
  const path = req.originalUrl.split("?")[0];
  const ownRoot = `/api/tenants/${principal.memberships[0].tenantId}`;
  const allowed = ["/api/me", "/api/customer/admin-panels", "/api/tenants", "/api/overview", "/api/activity"];
  if (!allowed.includes(path) && path !== ownRoot && !path.startsWith(`${ownRoot}/`)) throw new HttpError(403, "The demo session can only explore NovaX Exchange.");
}
