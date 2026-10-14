# Development authentication retirement — Republish blocked

## Latest closure

See [`docs/authentication-security-review.md`](../docs/authentication-security-review.md)
for the superseding 2026-10-14 closure: user-confirmed resolved Development
Super Admin sign-in, complete 42-account dispositions, exact preservation of both
historical sessions plus one Owner addition, 412 passing tests, zero dependency/
privacy findings, and nine fully dispositioned medium static findings. Production
remains **NO GO**. Historical evidence and limitations below are retained.

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
- existing Supabase identity links match and the original session digest/subject
  remains present;
- the original single active Owner binding and verified TOTP factor remain;
- the disposable Supabase QA identity, sessions and cleanup manifest are removed.

The auth-preservation snapshot excludes rate-limit counters and legitimately
rotated encrypted session envelopes. It does not bypass or recreate sessions.

The latest cleanup readback reports one additional session belonging to the
original Owner. The original singleton session hash still matches exactly; all
non-session table fingerprints, Owner binding and TOTP factor fingerprints match.
The strict historical total-count comparison flags this addition. Neither the
baseline nor either Owner session was overwritten or deleted to clear that flag.

## Development email MFA and password policy

- The sign-in MFA screen has **Another Method** only when the server confirms
  an active Super Admin, verified `gmail.com` address and existing verified TOTP.
  Account ownership comes from the preserved subject/business binding and actual
  authorization, never email similarity or caller-selected metadata.
- Six-digit email codes expire five minutes after issuance, are single-use,
  session/account/recipient-bound and stored only as HMAC digests within encrypted
  pending-session envelopes. Mail goes only to the provider-verified recipient.
- Account limits: one send/minute, five sends/hour, five attempts/code, and twenty
  verification attempts/fifteen minutes. Existing request/IP limits also apply.
  Row locks serialize consumption; resends invalidate old challenges; failed
  delivery cannot elevate assurance. Insecure TLS is refused.
- Email supplies application sign-in assurance, **not provider AAL2**. Existing
  Google Authenticator remains enrolled and available. Password reset/change,
  authenticator removal/enrollment and recovery-code generation retain their
  existing native authenticator requirements; recovery-only sessions remain
  denied business/Admin access.
- Signup, reset and change share Development validation: at least ten characters
  with uppercase, lowercase and numbers; symbols optional; the existing upper
  bound is unchanged. Existing login passwords are not retroactively validated.
- The pinned Development provider's password minimum and required character sets
  were updated and read back. Every other provider configuration field matched.
  Staging rules/configuration were not changed.
- Native disposable browser coverage passed ten-character signup, verification,
  password change, old-password rejection, TOTP enrollment/login, wrong-code
  rejection, reset requiring retained TOTP, reload/new-tab persistence, customer
  access, Admin denial and logout/back isolation. Exact fixture cleanup completed.
- Email MFA security/consumption and transport behavior passed isolated backend
  tests with synthetic authorization. Its UI passed browser network-mocked
  switching/send/countdown/wrong-code/success coverage. **Real Super Admin Gmail
  receipt and native Owner email-code acceptance were not performed.** Mocked
  transport and provider-generated links are not inbox-delivery evidence.
- No live role was granted, no Owner cookie was injected, no existing factor was
  disabled, and no Staging/Production or deployment operation was performed.

## Verification and limitations

- Workspace TypeScript checks pass.
- API, console, website and mockup sandbox production-mode compilation passes. Compilation is
  **not** evidence that Production authentication can start or serve users.
- All 385 tests pass, using the Node test asset loader for
  Vite-managed image imports. Workspace typechecking passes.
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
- Development browser testing now passes native customer login, account access,
  rejection from Admin, reload/new-tab persistence, TOTP enrollment, MFA-required
  login, pending-MFA isolation, post-MFA reload persistence, logout and back
  navigation without stale account content. Only a disposable non-admin was
  used; it was removed afterward and preservation readback passed again.
- Fresh private-window **Owner** login/MFA/Admin UI acceptance remains unverified.
  It requires genuine private Owner participation. Owner credentials, sessions
  and factors were not used for impersonation or modified for testing.

## Security follow-up

- Final managed dependency audit: **0 critical, 0 high, 0 moderate, 0 low**.
  Storage SDK 8.4 is a supported same-major update; its vulnerable UUID dependency
  is gone. Unused typography plugins were removed, eliminating the old selector
  parser. Native Node file discovery replaced mockup fast-glob; regression tests
  preserve hidden/private-file exclusion and add/remove discovery.
- HoundDog 3.11 full core privacy scan completed successfully from workspace-local
  scratch/cache/home directories, without severity filtering or AI review.
  The initial critical Telegram bearer-token Web Storage flow was fixed with
  memory-only credentials and removal of old persisted tokens. A fresh scan has
  **0 flagged dataflows**. Telegram initData is still server-verified on reload.
- Managed full static scan now completes: **10 medium findings, no high or
  critical findings**. Raw warnings remain visible; they are not silently
  suppressed. Five concern protocol/checksum weak-hash heuristics, two signed-cookie/proxy
  heuristics, two redirect heuristics and one synthetic URL-credential fixture.
  The fixed same-origin preview paths now encode slugs; the Preview verification
  proxy refuses off-origin redirects. Further disposition of these warnings
  remains part of release review; zero dependency/privacy findings is not a
  claim that every static warning is cleared.
- The direct community-engine diagnostic is incomplete because supplied rules
  require Pro operators. The direct Pro binary requires its own login. Neither
  diagnostic substitutes for the later successful **managed** static scan.
- All four Development workflows are running after restarts. Their Development
  launchers keep temporary/compiler caches on the workspace volume to avoid the
  system temporary-directory quota. Production start commands are unchanged.

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
2. The completed read-only legacy audit confirms **42 accounts: 1 proof-linked,
   41 unlinked, including 5 with business references and 1 with tenant roles**.
   Full directory fingerprints match before and after the audit. There were
   zero account/role writes and no email-based ownership matching. Audit
   completion is not migration completion. Unlinked accounts need a separately
   approved continuity path; apparently unused accounts must not be deleted.
3. Genuine private Owner login → MFA → Admin Panel → reload/new-tab persistence
   still needs Owner participation. Customer browser coverage does not replace it.
4. The 10 medium static warnings remain explicitly recorded for release review;
   they are not erased merely because dependency and privacy findings are zero.

The separately prepared migration plan is
`deploy/PRODUCTION_SUPABASE_AUTH_MIGRATION_PLAN.md`. It covers a fresh authorized
Production inventory, independent provider/configuration, additive schema and
restore rehearsal, exact-proof account continuity, session transition, native
acceptance, controlled cutover and rollback preserving new business activity.
It executes none of those Production operations.

Staging, Production, external providers' official identities, DNS and published
deployments were not modified. No deployment or Republish was attempted.
