import assert from "node:assert/strict";

// This is an approval boundary, not an environment flag or a build-mode workaround.
// Production must receive its own reviewed provider, identity/session migration
// and native Owner acceptance before this release hold can be removed.
export function verifyAuthenticationCompatibility() {
  assert.fail("REPUBLISH BLOCKED: Development is Supabase-only. Production authentication migration, legacy-account continuity, Production session/schema readiness, and native Owner/MFA/Admin acceptance are not approved or verified. Do not publish this release.");
}
