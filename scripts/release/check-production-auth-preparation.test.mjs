import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkProductionAuthPreparation as check } from "./check-production-auth-preparation.mjs";

const draft = () => JSON.parse(readFileSync(new URL("../../deploy/production-auth-preparation.json", import.meta.url), "utf8"));
test("current preparation stays inert and explicitly reports missing Production evidence", () => {
  const r = check(draft());
  assert.equal(r.status, "EVIDENCE_MISSING");
  assert.deepEqual(r.errors, []);
  assert(r.missing.includes("evidence.runtimeBusinessDatabaseBinding"));
  assert(!r.missing.includes("continuity.productionDirectory.protectedAdministrationManifestEvidence"));
  assert.equal(r.deploymentAuthorized, false);
});
test("Development/Staging projects and directories cannot be promoted by a draft", () => {
  for (const ref of ["nktstksmfpcsjnjbeqsk", "muvedavhbpgpdrrnjrih"]) {
    const p = draft(); p.target.productionProjectRef = ref; assert(check(p).errors.length);
  }
  for (const environment of ["development", "staging"]) {
    const p = draft(); p.continuity.productionDirectory.environment = environment;
    assert(check(p).errors.length);
  }
});
test("mutation authorization and weakened continuity are rejected", () => {
  for (const key of Object.keys(draft().authorization)) {
    const p = draft(); p.authorization[key] = true; assert(check(p).errors.length);
  }
  const p = draft(); p.continuity.matchByEmail = true; assert(check(p).errors.length);
  const extra = draft(); extra.authorization.forceApply = true; assert(check(extra).errors.length);
});
test("a total count, invalid counts and credential-like values cannot satisfy safe preparation", () => {
  const p = draft(); p.continuity.productionDirectory.totalUsers = 42;
  p.continuity.productionDirectory.protectedAdministrationManifestEvidence = null;
  assert(check(p).missing.includes("continuity.productionDirectory.protectedAdministrationManifestEvidence"));
  p.continuity.productionDirectory.totalUsers = -1; assert(check(p).errors.length);
  p.target.productionProjectRef = "not-a-project"; assert(check(p).errors.length);
  p.target.smtpConfigurationEvidence = "sb_secret_synthetic_do_not_use"; assert(check(p).errors.length);
});
test("complete-looking references still cannot grant migration or deployment authority", () => {
  const p = draft(); p.target.productionProjectRef = "abcdefghijklmnopqrst";
  p.continuity.productionDirectory.totalUsers = 1;
  p.continuity.productionDirectory.instanceIdentifier = "synthetic-production-instance";
  p.continuity.productionDirectory.protectedAdministrationManifestEvidence = "synthetic-review-reference";
  for (const key of Object.keys(p.target).filter(k => k.endsWith("Evidence")))
    p.target[key] = "synthetic-review-reference";
  for (const key of Object.keys(p.evidence)) p.evidence[key] = "synthetic-review-reference";
  const r = check(p);
  assert.equal(r.status, "REFERENCES_LISTED_NOT_VERIFIED");
  assert.equal(r.deploymentAuthorized, false);
});
test("test accounts do not require migration and cleanup never becomes implicit", () => {
  const p = draft();
  assert.equal(p.continuity.strategy, "PROTECTED_ADMINISTRATORS_ONLY");
  assert.equal(p.continuity.migrateUnneededTestAccounts, false);
  assert(!check(p).missing.some(key => /allProductionAccounts|completePerIdManifest/.test(key)));
  p.continuity.migrateUnneededTestAccounts = true;
  assert(check(p).errors.length);
  const unsafeCleanup = draft();
  unsafeCleanup.continuity.cleanupRequiresVerifiedBackupAndExplicitApproval = false;
  assert(check(unsafeCleanup).errors.length);
  const unsafeMfa = draft();
  unsafeMfa.continuity.preserveOriginalSuperAdminMfa = false;
  assert(check(unsafeMfa).errors.length);
  const silentReenrollment = draft();
  silentReenrollment.continuity.factorReenrollmentRequiresExplicitApproval = false;
  assert(check(silentReenrollment).errors.length);
});
test("confirmed directory identity and synthetic encryption do not prove native MFA or real backup", () => {
  const p = draft();
  assert.equal(p.backupPreparation.configuredKeySyntheticChecksPassed, 10);
  assert.equal(p.backupPreparation.authenticatedStreamingSyntheticChecksPassed, 10);
  assert.equal(p.backupPreparation.productionExportExecuted, false);
  assert.equal(p.backupPreparation.realBackupAndRestoreVerified, false);
  assert.equal(p.continuity.productionDirectory.productionDirectoryMatchVerified, true);
  assert.equal(p.continuity.productionDirectory.nativeMfaAndCustodyAccepted, false);
  const result = check(p);
  assert.equal(result.status, "EVIDENCE_MISSING");
  assert(result.missing.includes("evidence.authenticatedBackupAndIsolatedRestore"));
  assert(!result.missing.includes("continuity.productionDirectory.protectedAdministrationManifestEvidence"));
  assert(result.missing.includes("evidence.nativeProductionOwnerMfaAdminAndSessionsAccepted"));
  assert.equal(result.deploymentAuthorized, false);
});
