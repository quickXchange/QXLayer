import { createHash } from "node:crypto";

// PostgreSQL's built-in SHA-256 requires no extension or schema/configuration change.
export function frozenSourceChecksumSql(payload) {
  const digest = createHash("sha256").update(payload, "utf8").digest("hex");
  return `encode(sha256(convert_to(source_text, 'UTF8')), 'hex') <> '${digest}'`;
}
