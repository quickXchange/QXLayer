// Keep only preview intent in this tenant/tab. Actual authority is an HttpOnly
// grant plus the live Clerk identity and freshly checked Super Admin role.
export function websitePreviewRequest(slug: string): { headers?: Record<string, string> } {
  const key = `qx-private-website-preview:${slug}`;
  const path = window.location.pathname.slice(import.meta.env.BASE_URL.length).split("/")[0];
  const incoming = path === slug ? new URLSearchParams(window.location.search).get("preview") : null;
  let token = incoming;
  try {
    if (incoming === "1") sessionStorage.setItem(key, "session");
    else token = sessionStorage.getItem(key);
  } catch { /* The initial preview URL still works if storage is unavailable. */ }
  return token === "1" || token === "session" ? { headers: { "X-QX-Website-Preview": "session" } } : {};
}
