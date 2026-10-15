import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

// This is an approval boundary, not an environment flag or a build-mode workaround.
// Production must receive its own reviewed provider, identity/session migration
// and native Owner acceptance before this release hold can be removed.
export function verifyAuthenticationCompatibility(
  cutover = JSON.parse(readFileSync(new URL("../../deploy/production-auth-cutover.json", import.meta.url), "utf8")),
  read = path => readFileSync(resolve(import.meta.dirname, "../..", path), "utf8"),
) {
  const blocked = "REPUBLISH BLOCKED: verified Production Supabase target, runtime binding, encrypted recovery, original Super Admin/MFA continuity, reviewed schema, native acceptance and explicit cutover approval are required.";
  assert(cutover?.schemaVersion === 1 && cutover.mode === "APPROVED_CUTOVER" &&
    cutover.approvedByUser === true, blocked);
  assert(/^[a-z0-9]{20}$/.test(cutover.productionProjectRef ?? "") &&
    !["nktstksmfpcsjnjbeqsk", "muvedavhbpgpdrrnjrih"].includes(cutover.productionProjectRef), blocked);
  assert(typeof cutover.runningReleaseId === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(cutover.runningReleaseId), blocked);
  for (const kind of ["runtimeBinding", "encryptedRecovery", "protectedAdministrator", "additiveSchema", "nativeAcceptance"]) {
    const ref = cutover.evidence?.[kind];
    assert(ref && /^generated-artifacts\/auth-security\/[a-zA-Z0-9_-]+\.json$/.test(ref.path ?? "") &&
      /^[a-f0-9]{64}$/.test(ref.sha256 ?? ""), `${blocked} Missing pinned ${kind} evidence.`);
    const text = read(ref.path);
    assert(createHash("sha256").update(text).digest("hex") === ref.sha256, `${blocked} Changed ${kind} evidence.`);
    const proof = JSON.parse(text);
    assert(proof.status === "VERIFIED" && proof.synthetic === false &&
      proof.environment === "production" && proof.kind === kind &&
      proof.productionProjectRef === cutover.productionProjectRef &&
      proof.runningReleaseId === cutover.runningReleaseId, `${blocked} Invalid ${kind} evidence.`);
    // Pinned operator-reviewed native evidence, not an automatic verification of
    // its factual claims. Never manufacture these reports from candidate tests.
  }
  return true;
}
