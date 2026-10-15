import test from "node:test";
import assert from "node:assert/strict";
import { verifyAuthenticationCompatibility } from "./authentication-compatibility.mjs";
import { createHash } from "node:crypto";
test("authentication retirement blocks Republish independently of runtime environment flags", () => {
  // Test the approval boundary without making unit success depend on whether a
  // future operator-reviewed real cutover record has legitimately been approved.
  assert.throws(() => verifyAuthenticationCompatibility({
    schemaVersion: 1, mode: "PREPARATION_ONLY", approvedByUser: false,
  }, () => assert.fail("Unapproved preparation must not read release evidence")), /REPUBLISH BLOCKED/);
});

const fixture = () => {
  const files = {};
  const c = { schemaVersion: 1, mode: "APPROVED_CUTOVER", approvedByUser: true,
    productionProjectRef: "abcdefghijklmnopqrst", runningReleaseId: "synthetic-release-id", evidence: {} };
  for (const kind of ["runtimeBinding", "encryptedRecovery", "protectedAdministrator", "additiveSchema", "nativeAcceptance"]) {
    const path = `generated-artifacts/auth-security/fixture-${kind}.json`;
    // In-memory test only, never written or used as real release evidence.
    files[path] = JSON.stringify({ kind, status: "VERIFIED", synthetic: false,
      environment: "production", productionProjectRef: c.productionProjectRef, runningReleaseId: c.runningReleaseId });
    c.evidence[kind] = { path, sha256: createHash("sha256").update(files[path]).digest("hex") };
  }
  return { c, files, read: path => files[path] };
};
test("explicit reviewed cutover requires every immutable evidence reference", () => {
  const { c, read } = fixture();
  assert.equal(verifyAuthenticationCompatibility(c, read), true);
  for (const kind of Object.keys(c.evidence)) {
    const copy = structuredClone(c); copy.evidence[kind] = null;
    assert.throws(() => verifyAuthenticationCompatibility(copy, read), /REPUBLISH BLOCKED/);
  }
});
test("trial projects, missing approval and evidence changes cannot pass", () => {
  const { c, read } = fixture();
  for (const patch of [{ approvedByUser: false }, { mode: "PREPARATION_ONLY" },
    { productionProjectRef: "muvedavhbpgpdrrnjrih" }, { productionProjectRef: "nktstksmfpcsjnjbeqsk" },
    { runningReleaseId: null }]) assert.throws(() => verifyAuthenticationCompatibility({ ...c, ...patch }, read), /REPUBLISH BLOCKED/);
  assert.throws(() => verifyAuthenticationCompatibility(c, path => read(path) + " "), /Changed/);
});
test("synthetic, cross-environment or stale-release evidence fails even with a matching hash", () => {
  for (const patch of [{ synthetic: true }, { environment: "development" },
    { runningReleaseId: "another-release" }, { status: "UNVERIFIED" }]) {
    const { c, files, read } = fixture(), ref = c.evidence.nativeAcceptance;
    files[ref.path] = JSON.stringify({ ...JSON.parse(files[ref.path]), ...patch });
    ref.sha256 = createHash("sha256").update(files[ref.path]).digest("hex");
    assert.throws(() => verifyAuthenticationCompatibility(c, read), /Invalid/);
  }
});
