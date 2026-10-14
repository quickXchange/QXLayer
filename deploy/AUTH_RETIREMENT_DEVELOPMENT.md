# Development authentication retirement — Republish blocked

## Scope and preservation

The working Development application now uses only Supabase Auth. Clerk and
Better Auth SDK dependencies, provider components, proxy, default fallbacks,
Better Auth authentication handlers, and legacy linking/enrollment screens are
removed. Old authentication endpoints return 410; existing identity links remain
valid. No email-based role assignment or replacement Owner was introduced.

No provider accounts, credentials, legacy authentication database tables,
business-ID columns, roles or business records were deleted. In particular,
`clerk_user_id` remains a stored business identifier, not a dependency on Clerk.
Shared/Production credentials were not revoked or changed. Historical external
migration tools and translation keys are not active authentication providers.

Preservation readback after disposable QA cleanup confirmed:

- all 42 original public business-table fingerprints match;
- all captured retired-authentication table fingerprints match;
- existing Supabase identity links and original session digests/subjects match;
- the original single active Owner binding and verified TOTP factor remain;
- the disposable Supabase QA identity, sessions and cleanup manifest are removed.

The auth-preservation snapshot excludes rate-limit counters and legitimately
rotated encrypted session envelopes. It does not bypass or recreate sessions.

## Verification and limitations

- Workspace TypeScript checks pass.
- API, console and website production-mode compilation passes. Compilation is
  **not** evidence that Production authentication can start or serve users.
- 46 authentication/security regression tests pass.
- Existing release-contract/business regression suites pass; the separate new
  authentication release-hold test confirms Republish is blocked.
- Native Development HTTP tests passed signup, rejection of unverified login,
  email-token verification, password login, TOTP enrollment/verification,
  rejection of wrong TOTP, pending-MFA isolation, customer access,
  non-admin rejection from Admin management, recovery request, password reset,
  old-password rejection, retained MFA after reset, logout and retired endpoints.
- Verification/recovery token consumption in this pass used provider-generated
  disposable test tokens. The actual email request paths were exercised, but
  mailbox delivery/link completion was not re-observed in this pass. The
  recipient previously confirmed both real inbox flows before SDK retirement.
- Native testing found and fixed password reset for MFA-enabled accounts:
  an existing authenticator must elevate the recovery session before updating
  the password. Even after MFA, a recovery session cannot enter business routes.
- Automated browser testing failed twice with internal infrastructure errors.
  Fresh private-window Owner login/MFA/Admin UI acceptance after this cleanup,
  and browser confirmation of the revised reset form, remain unverified. Owner
  credentials, sessions and factors were not used for impersonation or testing.

## Read-only Production compatibility audit

Deployment metadata identifies a currently published successful build. HTTP
requests to its custom and native host authentication endpoints returned 403
at the access/ingress boundary, so the active runtime provider could not be
conclusively read back.

Read-only Production database queries returned:

- one active Super Admin with the original legacy-format business ID;
- no Supabase identity-links table;
- no Supabase application-sessions table;
- no Supabase recovery-codes table.

The pre-cleanup source contains the published Clerk fallback, while the new
working source intentionally has no legacy provider fallback. Current provider
configuration rejects Production Supabase activation, and Development's
project/origin/session configuration cannot be reused for Production.

**Do not Republish this working release.** The release preflight intentionally
fails with `REPUBLISH BLOCKED`. Removing the hold is not authorization to deploy.
Production needs a separately approved provider and proof-based account/session
migration, reviewed schema readiness and actual native Owner/MFA/Admin acceptance.
No automatic migration, database copy, startup DDL or Production changes were made.

## Remaining blockers

1. Production provider, schema, identity-link and session migration is not
   approved or complete. Existing Production logins cannot safely consume this
   Development-only source release.
2. The Development legacy directory contains 42 accounts, while Development has
   one proof-linked Supabase identity. The legacy accounts are untouched, but
   they must be reviewed individually for continuity before claiming every
   legacy user can sign in without the retired migration path. No automatic
   email matching, duplicate Owner creation or account deletion is permitted.
3. Post-cleanup signed-in browser coverage and fresh Owner/Admin acceptance are
   incomplete because the browser-testing infrastructure failed.
4. Dependency audit still reports two high findings (`braces` 3.0.3 and `uuid`
   9.0.1) and one moderate finding (`postcss-selector-parser` 6.0.10).
   `proxy-addr` and `source-map-js` were updated to compatible fixed patches;
   the final dependency scan reports zero critical findings. Remaining
   build-tool/storage reachability is bounded, not an upstream fix. Do not
   force unsupported major overrides merely to clear a scanner.
5. An initial static scan completed with ten medium findings needing review,
   including TOTP/protocol SHA-1 and session/redirect heuristics. The final
   static-scan attempt failed with a filesystem quota error; the privacy scanner
   failed twice. A clean final full-scan result is therefore unavailable.

Staging, Production, external providers' official identities, DNS and published
deployments were not modified. No deployment or Republish was attempted.
