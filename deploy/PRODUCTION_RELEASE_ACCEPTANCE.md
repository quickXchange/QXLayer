# Production release acceptance — prepared, not authorized

Never execute the offline review SQL against Live. The managed database may only
be changed through an explicitly approved native Publish plan. Keep development
data overwrite disabled. Do not add DDL to build/startup commands.

## Secure schema handoff

`generated-artifacts/auth-security/secure-production-schema-review.json` restores
the canonical predicates on 84 policies and includes the five private Auth tables,
private-schema PUBLIC revocation and restricted business-role grants.
It is review material, not a replacement for the native publisher.
The native preview must regenerate with matching USING/WITH CHECK predicates,
the Auth namespace/tables/constraints and required grants. If native serialization
still strips predicates or the private schema, STOP; do not repair it with
custom Live SQL or bypass the release check. Retain the reviewed schema hash.

The source-generated full schema passed the disposable PostgreSQL rehearsal
in `production-candidate-local-rehearsal.json`. This is not Live schema acceptance.

## Runtime credentials and database binding

Keep the independent server key and session secret in Publishing Production
storage and the owner's private vault, never Shared or frontend variables.
For a private, non-mutating credential check, run:

    node scripts/external-hosting/verify-production-private-runtime.mjs --private-readonly-check

The terminal hides both inputs; the checker permits only two GET requests to the
pinned Production Supabase project. It creates no Auth accounts or sessions.
It verifies supplied credentials, not the effective deployed secret store.

Independently attest the immutable running release, its effective Auth provider,
business database target and secret selector names through Publishing metadata
or the owner's private deployment configuration. Do not substitute a matching
database copy or workspace variables for the actual runtime binding.

## Protected original Owner transition — requires separate approval

1. Reuse the protected administrator manifest and its exact original identity and
   business-row hashes. Keep existing role/membership/permission rows untouched.
   Do not match email, create a second Owner or import test customers.
2. Before any provider-user/link/factor/session write, obtain explicit migration
   approval and a fresh native authentication proof from the original Owner,
   bound to that exact business identity and the pinned new Production project.
3. Preserve the original provider account, existing factor, recovery material,
   sessions and old release for rollback. Do not reset or re-enroll MFA silently.
   If direct factor transfer is unsupported, obtain explicit Owner consent for
   parallel enrollment; retain the original factor until native acceptance.
4. Create/link only the approved protected identity using the existing proof-based
   transition implementation. Never assign Super Admin because an email matches.
5. Capture role/permission/business-row hashes before and after linking. Reject
   differences. Preserve business IDs and existing tenant assignments.
6. Never claim the current Supabase identity/session implementation imports legacy
   sessions automatically. Establish an approved coexistence/reauthentication
   policy before cutover; retain the original sessions and provider for rollback.

## Real email and native Owner acceptance — requires account-write approval

SMTP AUTH/envelope checks sent no email. Template readback is not inbox receipt.
While account writes remain prohibited, do not create a disposable Auth identity,
generate a signup link (which can create a user), or migrate the Owner to test mail.

After explicit approval for the exact isolated Production acceptance identity:

- Send the original Supabase-generated verification/login email, observe actual
  inbox receipt, and redeem the originally delivered code/link. Do not replace it
  with an admin-generated token. Retain mailbox cooldowns and rate limits.
- Complete first factor, verify the existing/explicitly approved native TOTP
  factor, and verify the same original business identity reaches Super Admin.
- Verify browser refresh/session persistence, logout/revocation, expiry, rejected
  wrong OTP/TOTP and cross-account/tenant denial.
- Exercise password recovery without removing MFA or changing another account.
- Record only non-sensitive acceptance evidence; keep OTPs, seeds, cookies,
  passwords and recovery codes out of reports/logs.

## Recovery and activity-preserving rollback

The read-only business-source capture tool seals the designated export database
using the existing reviewed AES-GCM/scrypt envelope, authenticates the whole
archive before a local restore, and destroys the local plaintext cluster:

The reviewed encryption/recovery modules are retained byte-for-byte in tracked
`scripts/recovery/`, with integrity tests against the original reviewed hashes.
Outside-Replit recovery must retain these tools and a ciphertext SHA-256 receipt,
not depend on ignored generated workspace files remaining available.

    QXLAYER_READONLY_BUSINESS_BACKUP_APPROVED=true node scripts/release/production-business-backup.mjs

Successful restoration of that designated database does not prove it is the
effective Live database or include an external provider's MFA/password material.
Archive the exact source binding, schema fingerprint, capture time, encryption
format and original Owner baseline. Keep ciphertext outside the repository.
Obtain an independent durable encrypted copy and verify outside-Replit recovery
of its key. Include protected legacy-provider recovery custody separately.

The portable business dump omits database owners/ACLs for safe local restoration.
Preserve the separately encrypted, read-only catalog supplement:

    QXLAYER_READONLY_BUSINESS_BACKUP_APPROVED=true node scripts/release/production-recovery-catalog.mjs

It captures relevant role flags without passwords, membership closure,
schema/relation/function/default ACLs and RLS into private encryption. It verifies
the full encrypted envelope and original catalog hash, but never applies grants
or recreates managed roles. This separate catalog read is not an atomic external
provider/Live backup; managed-role reconstruction requires operator review.

If capture succeeds but a local restore needs repair, reuse the retained
ciphertext without re-exporting the source:

    QXLAYER_READONLY_BUSINESS_BACKUP_APPROVED=true node scripts/release/production-business-backup.mjs --restore-retained-capture

The capture receipt supplies the original plaintext archive hash. The restore
mode does not connect to the export database or require its credentials.

The consolidated safe test/build workflow is:

    node scripts/release/run-production-preparation-checks.mjs

It records every command's exit code, does not treat the last command's success
as the success of earlier steps, and never captures Production data or unlocks
publishing. Security scanner results are retained separately.

Rollback must not overwrite the whole database with a pre-cutover snapshot after
new activity. Preserve an immutable old release and legacy provider configuration,
keep all additive schema and identity/session records, capture the post-cutover
activity watermark and encrypted delta before any approved rollback, and reconcile
new users/orders/configuration forward. Do not delete new records or restore
stale roles/session state. If activity cannot be preserved, STOP for an explicit
maintenance/reconciliation decision rather than running a destructive rollback.

## Final release decision

Only pin evidence as VERIFIED after native factual acceptance. Synthetic/local
tests, credentials supplied to a terminal and candidate SQL are not native Live
attestations. Keep `production-auth-cutover.json` unapproved and all release holds
in place until the technical gates pass and the owner gives final approval.
