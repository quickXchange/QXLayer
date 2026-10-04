import { Storage } from "@google-cloud/storage";
import { createHash, randomUUID } from "node:crypto";
import { withDatabase, type DatabaseClient } from "@workspace/db";
import type { Principal } from "../authentication/service";
import { HttpError } from "../../lib/errors";
import { requestContext, attachmentColumns } from "./order-model";

// Replit's private object storage, with the existing Clerk principal and
// PostgreSQL ownership checks. Never public URLs or a second authentication flow.
const sidecar = "http://127.0.0.1:1106";
const storage = new Storage({
  projectId: "",
  credentials: {
    audience: "replit", subject_token_type: "access_token", token_url: `${sidecar}/token`, type: "external_account",
    credential_source: { url: `${sidecar}/credential`, format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  },
});
function privateFile(key: string) {
  const segments = process.env.PRIVATE_OBJECT_DIR?.split("/").filter(Boolean);
  if (!segments?.length || segments.length < 2) throw new HttpError(503, "Private upload storage is not configured.");
  return storage.bucket(segments[0]).file(`${segments.slice(1).join("/")}/${key}`);
}
export const allowedCategories = ["logo", "favicon", "design_reference", "requirement"] as const;
const extensions: Record<string, string[]> = {
  "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"], "image/webp": [".webp"], "image/gif": [".gif"],
  "image/x-icon": [".ico"], "image/vnd.microsoft.icon": [".ico"], "application/pdf": [".pdf"], "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/zip": [".zip"],
};
export function validateUpload(fileName: string, contentType: string, category: string, bytes: Buffer) {
  if (!allowedCategories.includes(category as typeof allowedCategories[number])) throw new HttpError(400, "Unknown attachment category.");
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new HttpError(400, "Choose a nonempty file no larger than 8 MB.");
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (!extensions[contentType]?.includes(ext)) throw new HttpError(400, "Supported files: PNG, JPEG, WEBP, GIF, ICO, PDF, TXT, DOCX and ZIP. HTML, SVG and executable files are not accepted.");
  if (category === "logo" && !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(contentType)) throw new HttpError(400, "Logos must be PNG, JPEG, WEBP or GIF.");
  if (category === "favicon" && !["image/png", "image/x-icon", "image/vnd.microsoft.icon"].includes(contentType)) throw new HttpError(400, "Favicons must be PNG or ICO.");
  const starts = (hex: string) => bytes.subarray(0, hex.length / 2).toString("hex") === hex;
  const valid = contentType === "image/png" ? starts("89504e470d0a1a0a") :
    contentType === "image/jpeg" ? starts("ffd8ff") :
    contentType === "image/gif" ? /GIF8[79]a/.test(bytes.subarray(0, 6).toString("ascii")) :
    contentType === "image/webp" ? bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP" :
    contentType.includes("icon") ? starts("00000100") :
    contentType === "application/pdf" ? bytes.subarray(0, 5).toString() === "%PDF-" :
    contentType === "text/plain" ? !bytes.includes(0) :
    starts("504b0304");
  if (!valid) throw new HttpError(400, "The file content does not match its declared type.");
}
export async function uploadAttachment(p: Principal, fileName: string, contentType: string, category: string, bytes: Buffer) {
  validateUpload(fileName, contentType, category, bytes);
  const name = fileName.replace(/^.*[\\/]/, "").replace(/[\x00-\x1f\x7f"]/g, "_").slice(0, 150);
  return withDatabase(requestContext(p, true), async c => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`order-upload:${p.userId}`]);
    const count = await c.query("SELECT count(*)::int AS n FROM white_label_attachments WHERE owner_user_id=$1 AND created_at>now()-interval '1 day'", [p.userId]);
    if (count.rows[0].n >= 50) throw new HttpError(429, "The account upload limit is 50 files per day.");
    const id = randomUUID();
    const key = `white-label-orders/${createHash("sha256").update(p.userId).digest("hex").slice(0, 24)}/${id}`;
    const file = privateFile(key);
    await file.save(bytes, { resumable: false, metadata: { contentType, cacheControl: "private, no-store" }, preconditionOpts: { ifGenerationMatch: 0 } });
    try {
      const r = await c.query(`INSERT INTO white_label_attachments (id,owner_user_id,object_key,file_name,content_type,size,category) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${attachmentColumns}`, [id, p.userId, key, name, contentType, bytes.length, category]);
      return r.rows[0];
    } catch (error) {
      await file.delete({ ignoreNotFound: true }).catch(() => undefined);
      throw error;
    }
  });
}
export async function attachmentFor(p: Principal, id: string) {
  return withDatabase(requestContext(p), async c => {
    const r = await c.query("SELECT object_key,file_name,content_type FROM white_label_attachments WHERE id=$1 AND (owner_user_id=$2 OR ($3 AND request_id IS NOT NULL))", [id, p.userId, p.role === "super_admin"]);
    if (!r.rowCount) throw new HttpError(404, "Attachment not found.");
    return { row: r.rows[0], file: privateFile(r.rows[0].object_key) };
  });
}
export async function deleteFixtureFiles(c: Pick<DatabaseClient, "query">, ownerIds: string[]) {
  const r = await c.query("SELECT object_key FROM white_label_attachments WHERE owner_user_id=ANY($1::text[])", [ownerIds]);
  for (const row of r.rows) await privateFile(row.object_key).delete({ ignoreNotFound: true });
}