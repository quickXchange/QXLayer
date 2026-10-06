// Scope a preview proof to this tenant/tab. Navigation and reloads keep it,
// but it never grants access to another slug or to mutation endpoints.
export function websitePreviewRequest(slug: string): { headers?: Record<string, string> } {
  const key = `qx-development-website-preview:${slug}`;
  const path = window.location.pathname.slice(import.meta.env.BASE_URL.length).split("/")[0];
  const incoming = path === slug ? new URLSearchParams(window.location.search).get("preview") : null;
  let token = incoming;
  try {
    if (incoming) sessionStorage.setItem(key, incoming);
    else token = sessionStorage.getItem(key);
  } catch { /* The initial preview URL still works if storage is unavailable. */ }
  return token ? { headers: { "X-QX-Website-Preview": token } } : {};
}
