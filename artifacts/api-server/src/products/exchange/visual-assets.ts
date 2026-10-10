import { Storage } from "@google-cloud/storage";
import manifest from "./visual-catalog.json";
import { privateObject } from "../../lib/private-object-storage";

// Imported visuals are public artwork, never customer uploads or order documents.
// Only hash-addressed objects in the compiled manifest can be served.
export const visualCatalog = manifest;
const sidecar = "http://127.0.0.1:1106";
export const visualStorage = new Storage({
  projectId: "",
  credentials: {
    audience: "replit", subject_token_type: "access_token", token_url: `${sidecar}/token`, type: "external_account",
    credential_source: { url: `${sidecar}/credential`, format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  },
});
export function visualFile(filename: string) {
  if (process.env.QXLAYER_STORAGE_PROVIDER === "supabase")
    return privateObject(`qxlayer-development-visuals/${filename}`);
  const segments = process.env.PRIVATE_OBJECT_DIR?.split("/").filter(Boolean);
  if (!segments || segments.length < 2) throw new Error("Visual asset storage is not configured.");
  return visualStorage.bucket(segments[0]).file(`${segments.slice(1).join("/")}/qxlayer-development-visuals/${filename}`);
}
export const visualUrl = (filename: string) => `/api/exchange/visual-assets/${filename}`;
export function isImportedVisualUrl(value: string) {
  return /^\/api\/exchange\/visual-assets\/[a-f0-9]{64}\.(svg|png|webp|jpg|jpeg)$/.test(value) &&
    (visualCatalog.blobs as { filename: string }[]).some(b => visualUrl(b.filename) === value);
}
