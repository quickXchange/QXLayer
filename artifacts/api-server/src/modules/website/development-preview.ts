import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 24 * 60 * 60 * 1000;
type Preview = { tenantId: string; slug: string; expiresAt: number; purpose: string };
export function developmentPreviewEnabled() {
  // REPLIT_ENVIRONMENT describes this container as "production" even in the
  // workspace. Require the API's explicit Development run mode instead.
  return process.env.NODE_ENV === "development" && process.env.REPLIT_DEPLOYMENT !== "1";
}
function signingKey() {
  const secret = developmentPreviewEnabled() ? process.env.SESSION_SECRET : undefined;
  return secret ? createHmac("sha256", secret).update("qxlayer-development-website-preview-key-v1").digest() : undefined;
}
export function createDevelopmentPreviewToken(tenantId: string, slug: string) {
  const key = signingKey();
  if (!key) throw new Error("Development website preview is unavailable.");
  const expiresAt = Date.now() + TTL_MS;
  const body = Buffer.from(JSON.stringify({ tenantId, slug, expiresAt, purpose: "qxlayer-development-website-preview-v1" })).toString("base64url");
  const signature = createHmac("sha256", key).update(body).digest("base64url");
  return { token: `${body}.${signature}`, expiresAt: new Date(expiresAt).toISOString() };
}
export function developmentPreview(slug: string, token?: string): Preview | null {
  const key = signingKey();
  if (!key || !token || token.length > 2048) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return null;
  const expected = createHmac("sha256", key).update(body).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as Preview;
    return data.purpose === "qxlayer-development-website-preview-v1" && data.slug === slug &&
      /^[0-9a-f-]{36}$/.test(data.tenantId) && Number.isFinite(data.expiresAt) &&
      data.expiresAt > Date.now() && data.expiresAt <= Date.now() + TTL_MS ? data : null;
  } catch { return null; }
}
export function previewBrandingUrl(url: string | null | undefined, slug: string, token?: string) {
  return url && developmentPreview(slug, token) && url.startsWith(`/api/public/sites/${slug}/branding/`)
    ? `${url}?preview=${encodeURIComponent(token!)}` : url;
}
