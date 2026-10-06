import { withDatabase } from "@workspace/db";
import { publicTenantId } from "./service";
import { privateFile } from "../customer/order-files";
import { HttpError } from "../../lib/errors";
import { developmentPreview } from "./development-preview";

// Only the exact uploaded logo/favicon explicitly selected for a delivered site.
// Requirements, references, object paths and other order attachments stay private.
export async function publicBrandingFile(slug: string, kind: string, previewToken?: string) {
  if (!["logo", "favicon"].includes(kind)) throw new HttpError(404, "Branding file not found.");
  const tenantId = await publicTenantId(slug, previewToken);
  return withDatabase({ actorId: "curated-public-branding", isSuperAdmin: true }, async c => {
    const selected = kind === "logo" ? "logoAttachmentId" : "faviconAttachmentId";
    const r = await c.query(`SELECT a.object_key,a.content_type FROM white_label_requests w
      JOIN tenant_branding b ON b.tenant_id=w.tenant_id
      JOIN white_label_attachments a ON a.id::text=w.configuration->'design'->>$2
        AND a.request_id=w.id AND a.owner_user_id=w.customer_user_id AND a.category=$3
      WHERE w.tenant_id=$1 AND (w.status='delivered' OR $5::boolean)
        AND CASE WHEN $3='logo' THEN b.logo_url ELSE b.website_settings->>'faviconUrl' END=$4`,
      [tenantId, selected, kind, `/api/public/sites/${slug}/branding/${kind}`, !!developmentPreview(slug, previewToken)]);
    if (!r.rowCount) throw new HttpError(404, "Branding file not found.");
    return { file: privateFile(r.rows[0].object_key), contentType: r.rows[0].content_type as string };
  });
}
