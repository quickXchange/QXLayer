import assert from "node:assert/strict";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// Review artifact only. Never connects to a database or applies a migration.
const policyKey = statement => {
  const m = /CREATE POLICY\s+"([^"]+)"\s+ON\s+(?:"public"\.)?"([^"]+)"/i.exec(statement);
  return m ? `${m[2]}.${m[1]}` : null;
};
export function secureCandidate(native, canonicalSql) {
  assert(native.success && !native.hasStructuralDataLoss, "Safe source preview required.");
  for (const name of ["tablesToRemove", "tablesToTruncate", "columnsToRemove", "schemasToRemove"])
    assert(!(native[name]?.length), "Destructive preview requires separate review.");
  const canonical = canonicalSql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);
  const policies = new Map(canonical.filter(policyKey).map(s => [policyKey(s), s]));
  let restored = 0;
  const statements = native.statementsToExecute.map(statement => {
    const key = policyKey(statement);
    if (!key) return statement;
    const correct = policies.get(key);
    assert(correct && /\bUSING\s*\(/i.test(correct), "Canonical policy missing explicit restrictions.");
    if (/FOR ALL/i.test(correct))
      assert(/\bWITH CHECK\s*\(/i.test(correct) && /app\.can_write/.test(correct) &&
        /app\.is_super_admin/.test(correct), "Canonical write authority missing.");
    restored++;
    return correct;
  });
  const authStatements = canonical.filter(s =>
    /CREATE SCHEMA\s+"vynox_supabase_auth"/i.test(s) || /"vynox_supabase_auth"\./.test(s));
  assert(authStatements.filter(s => /CREATE TABLE/i.test(s)).length === 5, "Complete Auth support schema required.");
  assert(!authStatements.some(s => /DROP|TRUNCATE|INSERT|UPDATE|DELETE/i.test(s)), "Auth schema must be additive.");
  return {
    status: "OFFLINE_REVIEW_CANDIDATE_NOT_NATIVE_PUBLISH_PLAN", synthetic: false,
    nativePreviewFixed: false, nativePreviewStillRequiresRegeneration: true,
    applied: false, restoredPolicyCount: restored,
    // Explicit review material, NOT a custom Production migration runner.
    reviewStatements: [...statements, ...authStatements,
      'REVOKE ALL ON SCHEMA "vynox_supabase_auth" FROM PUBLIC;',
      'REVOKE ALL ON ALL TABLES IN SCHEMA "vynox_supabase_auth" FROM PUBLIC;',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pg_database_owner;',
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pg_database_owner;'],
    authTables: ["identity_links", "sessions", "rate_limits", "recovery_codes", "recovery_events"],
    warning: "Native publishing must retain these predicates, private schema and grants. This file cannot authorize or replace the native plan.",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = "generated-artifacts/auth-security";
  const dir = `${root}/production-candidate-schema-complete`;
  const files = (await readdir(dir)).filter(f => /^0000_.*\.sql$/.test(f));
  assert(files.length === 1, "Exactly one fresh canonical schema required.");
  const canonical = await readFile(`${dir}/${files[0]}`, "utf8");
  const native = JSON.parse(await readFile(`${root}/final-production-publish-schema-readback.json`, "utf8"));
  const review = secureCandidate(native, canonical);
  await mkdir(root, { recursive: true });
  await writeFile(`${root}/secure-production-schema-review.json`, JSON.stringify(review, null, 2) + "\n");
  console.log(JSON.stringify({ canonicalSchemaGenerated: true, secureReviewPrepared: true,
    correctedPolicies: review.restoredPolicyCount, authTables: review.authTables.length,
    nativePreviewFixed: false, liveApplied: false }));
}
