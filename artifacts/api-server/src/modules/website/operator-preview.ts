import { getAuth } from "@clerk/express";
import type { Request } from "express";
import { resolvePrincipal, requireSuperAdmin } from "../authentication/service";
import { signProof, readProof } from "../../lib/scoped-proof";
import { HttpError } from "../../lib/errors";

export const PREVIEW_TTL = 15 * 60 * 1000;
export const PREVIEW_COOKIE = "qx_operator_preview";
export interface WebsitePreview { tenantId: string; slug: string; actorId: string; expiresAt: number }
export function issuePreview(tenantId: string, slug: string, actorId: string) {
  const grant: WebsitePreview = { tenantId, slug, actorId, expiresAt: Date.now() + PREVIEW_TTL };
  return { grant, token: signProof("authenticated-operator-preview", grant) };
}
export function verifyPreview(token: string | undefined, slug: string, actorId: string | null | undefined): WebsitePreview | null {
  const v = readProof("authenticated-operator-preview", token);
  return v && typeof actorId === "string" && v.actorId === actorId && v.slug === slug &&
    typeof v.tenantId === "string" && /^[0-9a-f-]{36}$/.test(v.tenantId) &&
    typeof v.expiresAt === "number" && v.expiresAt > Date.now() && v.expiresAt <= Date.now() + PREVIEW_TTL
    ? v as unknown as WebsitePreview : null;
}
export async function authorizedWebsitePreview(req: Request, slug: string): Promise<WebsitePreview | undefined> {
  const marker = req.get("x-qx-website-preview") ?? req.query.preview;
  if (marker === undefined) return undefined;
  if (marker !== "session" && marker !== "1") throw new HttpError(403, "Invalid private preview.");
  const cookie = req.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(`${PREVIEW_COOKIE}=`))?.slice(PREVIEW_COOKIE.length + 1);
  const actorId = getAuth(req).userId;
  const grant = verifyPreview(cookie, slug, actorId);
  if (!grant) throw new HttpError(401, "Sign in as the authorized operator and reopen this private preview.");
  // Revocation is immediate: the signed cookie is NOT sufficient authority.
  requireSuperAdmin(await resolvePrincipal(actorId!));
  return grant;
}
export function previewBrandingUrl(url: string | null | undefined, slug: string, preview?: WebsitePreview) {
  return preview && url?.startsWith(`/api/public/sites/${slug}/branding/`) ? `${url}?preview=1` : url;
}
