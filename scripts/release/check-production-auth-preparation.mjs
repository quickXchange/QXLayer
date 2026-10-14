import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Local checklist validation only: no environment/secret reads, network, database,
// file writes, provider operations, activation or modification of the release hold.
export function checkProductionAuthPreparation(plan) {
  const errors = [], missing = [];
  const require = (condition, message) => { if (!condition) errors.push(message); };
  require(plan?.schemaVersion === 1 && plan?.mode === "PREPARATION_ONLY", "Preparation-only schema required.");
  const permissions = ["productionChanges", "stagingChanges", "provisionProject", "migrateAccounts", "revokeClerk", "republish"];
  require(permissions.every(key => plan?.authorization?.[key] === false) &&
    Object.keys(plan?.authorization ?? {}).every(key => permissions.includes(key)),
    "Every mutation/deployment authorization must remain false; unknown authorizations are rejected.");
  const t = plan?.target, c = plan?.continuity;
  require(t?.environment === "production", "Target must be explicitly Production.");
  require(t?.canonicalOrigin === "https://www.quicklychan.xyz", "Use the inventoried canonical Production origin, not Preview/Staging.");
  require(t?.businessDatabasePolicy === "PRESERVE_EXISTING_VERIFY_RUNTIME_TARGET", "Preserve and verify the existing business database.");
  require(t?.serverKeySecretName === "QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY" &&
    t?.sessionKeySecretName === "QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET", "Independent proposed Production secret references required.");
  require(c?.strategy === "PROGRESSIVE_EXACT_PROOF" &&
    c?.preserveBusinessIdsRolesPermissionsData === true &&
    c?.preserveExistingClerkSessionsAndCredentials === true &&
    c?.excludeDevelopmentAndStagingAccounts === true && c?.matchByEmail === false,
    "Exact-proof continuity and all preservation/environment boundaries are mandatory.");
  require(c?.productionDirectory?.environment === "production", "A Development/Staging roster cannot stand in for Production.");
  const count = c?.productionDirectory?.totalUsers;
  require(count === null || (Number.isSafeInteger(count) && count >= 0), "Production count must be unknown or a nonnegative integer.");
  const ref = t?.productionProjectRef;
  if (ref === null) missing.push("target.productionProjectRef");
  else require(typeof ref === "string" && /^[a-z]{20}$/.test(ref) &&
    !["nktstksmfpcsjnjbeqsk", "muvedavhbpgpdrrnjrih"].includes(ref),
    "Production project must be valid and distinct from pinned Development/Staging projects.");
  require(!/(?:sb_secret_|sk_live_|sk_test_)[A-Za-z0-9_-]+|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(JSON.stringify(plan)),
    "Do not put actual credentials or JWTs in preparation files.");
  for (const key of ["smtpConfigurationEvidence", "redirectAllowlistEvidence",
    "passwordMfaAbusePolicyEvidence", "independentKeyCustodyEvidence"])
    if (typeof t?.[key] !== "string" || !t[key].trim()) missing.push(`target.${key}`);
  for (const key of ["instanceIdentifier", "completePerIdManifestEvidence"])
    if (typeof c?.productionDirectory?.[key] !== "string" || !c.productionDirectory[key].trim())
      missing.push(`continuity.productionDirectory.${key}`);
  if (count === null) missing.push("continuity.productionDirectory.totalUsers");
  for (const key of ["immutableDeployedReleaseAndEffectiveAuthProvider", "runtimeBusinessDatabaseBinding",
    "productionCapableTransitionImplementation", "reviewedSupportedAdditiveSchemaDiff",
    "authenticatedBackupAndIsolatedRestore", "rollbackPreservingNewUsersAndBusinessActivity",
    "allProductionAccountsContinuityAccepted", "nativeProductionOwnerMfaAdminAndSessionsAccepted", "securitySignOff"])
    if (typeof plan?.evidence?.[key] !== "string" || !plan.evidence[key].trim()) missing.push(`evidence.${key}`);
  return { status: errors.length ? "INVALID_DRAFT" : missing.length ? "EVIDENCE_MISSING" : "REFERENCES_LISTED_NOT_VERIFIED",
    errors, missing, deploymentAuthorized: false,
    note: "Local references are not verified attestations. This check never authorizes provisioning, account migration or Republish." };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const plan = JSON.parse(readFileSync(new URL("../../deploy/production-auth-preparation.json", import.meta.url), "utf8"));
  const result = checkProductionAuthPreparation(plan);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.errors.length ? 1 : result.missing.length ? 2 : 0;
}
