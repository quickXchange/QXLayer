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
  assert(r.missing.includes("continuity.productionDirectory.completePerIdManifestEvidence"));
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
  assert(check(p).missing.includes("continuity.productionDirectory.completePerIdManifestEvidence"));
  p.continuity.productionDirectory.totalUsers = -1; assert(check(p).errors.length);
  p.target.productionProjectRef = "not-a-project"; assert(check(p).errors.length);
  p.target.smtpConfigurationEvidence = "sb_secret_synthetic_do_not_use"; assert(check(p).errors.length);
});
test("complete-looking references still cannot grant migration or deployment authority", () => {
  const p = draft(); p.target.productionProjectRef = "abcdefghijklmnopqrst";
  p.continuity.productionDirectory.totalUsers = 1;
  p.continuity.productionDirectory.instanceIdentifier = "synthetic-production-instance";
  p.continuity.productionDirectory.completePerIdManifestEvidence = "synthetic-review-reference";
  for (const key of Object.keys(p.target).filter(k => k.endsWith("Evidence")))
    p.target[key] = "synthetic-review-reference";
  for (const key of Object.keys(p.evidence)) p.evidence[key] = "synthetic-review-reference";
  const r = check(p);
  assert.equal(r.status, "REFERENCES_LISTED_NOT_VERIFIED");
  assert.equal(r.deploymentAuthorized, false);
});
