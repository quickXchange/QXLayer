/** Links exist only after delivery. Identity and slug always come from persisted rows. */
export function deliveryLinks(row: { status: string; tenantId?: string | null }, slug?: string | null) {
  if (row.status !== "delivered" || !row.tenantId || !slug) return { websiteUrl: null, adminPanelUrl: null };
  const origin = process.env.NODE_ENV === "production" ? process.env.QXLAYER_PLATFORM_URL?.replace(/\/$/, "") ?? "" : "";
  return { websiteUrl: `${origin}/private-label-website/${encodeURIComponent(slug)}`,
    adminPanelUrl: `${origin}/clients/${encodeURIComponent(row.tenantId)}/exchange` };
}
