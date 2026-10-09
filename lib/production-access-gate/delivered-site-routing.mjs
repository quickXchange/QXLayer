/** Only minimal server-verified delivery metadata can authorize a slug. */
export function deliveredSiteSlug(pathname) {
  const match = /^\/(?:api\/public\/sites|private-label-website)\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/.exec(pathname);
  return match && match[1] !== "assets" && match[1].length <= 48 ? match[1] : null;
}
export function isDeliveryLookup(pathname) {
  return /^\/api\/public\/site-delivery\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pathname);
}
export function isWebsiteAsset(pathname, method) {
  return ["GET", "HEAD"].includes(method) && pathname.startsWith("/private-label-website/assets/");
}
export async function resolveDeliveredSite(slug, env, fetcher = fetch) {
  if (!slug || !env.QXLAYER_PLATFORM_URL) return false;
  try {
    const platform = new URL(env.QXLAYER_PLATFORM_URL);
    if (platform.protocol !== "https:") return false;
    const response = await fetcher(`${platform.origin}/api/public/site-delivery/${encodeURIComponent(slug)}`,
      { redirect: "error", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return false;
    const metadata = await response.json();
    return metadata.tenantSlug === slug && metadata.delivered === true;
  } catch { return false; }
}
