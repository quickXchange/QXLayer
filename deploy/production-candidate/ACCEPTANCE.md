# Isolated Production initialization and protected acceptance

The active ordered migration contract is `manifest.json`. Its checksums are
immutable once applied. The old Better Auth migration is deliberately excluded:
this target uses native Supabase Auth and five private application support tables.
Migrations never run at application startup or in the frontend deployment job.

## Verified database evidence

- Fresh source column/default/constraint/index and RLS comparison passed before DDL.
- Target identity and verified TLS checked before the encrypted pre-change backup.
- All 42 public application tables, 84 policies, FORCE RLS, restricted grants and
  migration checksums matched readback after the atomic transaction.
- Separate `qxlayer_app` and `qxlayer_auth_app` logins passed 276 hosted permission
  assertions. Business access requires transaction-local `qxlayer_runtime`.
  The Auth login cannot query business data or assume the business runtime role.
- Synthetic permission records were rolled back. Native Auth identity, MFA,
  session and refresh-token keyed digests were unchanged.
- The native Auth directory was empty before initialization. No owner account,
  replacement administrator, MFA factor or identity link was created.
- The encrypted pre-change snapshot has a private local copy and a private
  Supabase Storage copy whose downloaded ciphertext hash was verified.

Detailed receipts are private/ignored under `generated-artifacts/external-finalization/`.
They are evidence, not credentials or a substitute for user acceptance.

## Protected acceptance, not Live cutover

The candidate requires explicit acceptance approval, verified-schema confirmation,
the separate private Auth login, and the private access gate. Authentication uses
only the pinned provider-owned acceptance alias while the cutover flag is false.
Workers and integration health polling stay disabled. The custom Live domain,
current public Live deployment, source data and source accounts are unchanged.

Vercel remains SSO-protected. Deployment metadata does not prove authenticated
browser access or a working frontend-to-API session. An existing approved browser
session or separately approved temporary automation-bypass credential is needed
for that acceptance test; do not disable protection.

The original administrator must be migrated/enrolled with immutable identity
proof and verified MFA custody. Never substitute a QA administrator, match owners
by email, silently enable mail readiness, copy unrecoverable MFA ciphertext, or
claim original-owner login/session acceptance from an empty Auth directory.

## Remaining cutover conditions

1. Complete protected frontend/API acceptance on the exact approved commit.
2. Migrate and verify the original administrator, mail delivery, MFA and session
   lifecycle with owner participation; preserve source access and identities.
3. Review required commercial configuration and any explicitly required data.
4. Obtain explicit Live cutover approval before changing canonical Auth origin,
   public deployment, domains/DNS, worker state or public activation.
