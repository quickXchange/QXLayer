# Production Supabase Auth: administration-only preparation

**Status: plan only; NO GO for Production changes or Republish.**

## Scope clarified by the user

VYNOX LAYER has **no real customers yet**. All customer accounts created so far
are test accounts. This supersedes earlier requirements to migrate every
customer/test account or provide a general progressive customer-migration bridge.

- Preserve the original Super Admin identity, canonical business ID, MFA,
  permissions and all business data.
- Identify and protect any other accounts genuinely required for platform
  administration. Until classification is certain, leave an account unchanged.
- Do not migrate other test accounts unnecessarily. Exclusion from Supabase
  migration does **not** authorize deletion, disabling, unlinking or data removal.
- Keep Development's 42 audited accounts separate from Production.
- No cleanup proposal before backup and restore/record verification.
- Every Production change, account deletion or Republish still requires explicit
  user approval. Keep the authentication release hold intact.

## What is already known — do not repeat the completed audits

- The user observed **2 users** in Cloud → Users & Auth → Production.
  On 2026-10-15 the user confirmed that one Production user-details record has
  the **exact native ID stored on the original active Super Admin business row**.
  This resolves the identity/directory match using user-confirmed read-only
  evidence, not an agent directory export or native authentication test.
- Managed Production has one active legacy-ID Super Admin. The focused read-only
  linkage check found its full-row fingerprint unchanged from the inventory.
- There are no tenant memberships, customer requests, attachment owners, event
  authors, customer notification reads or audit-actor references in that managed
  snapshot. Do not infer “one Owner plus one customer” from a two-user count.
- Managed Production has 40 business tables and no local Supabase application
  identity/session support schema. Retain all existing business records.
- Active deployed provider/release and actual runtime database binding remain
  unconfirmed. Stored Clerk credentials and an inventoried database are not
  conclusive evidence of the running configuration.

Read-only evidence remains in `PRODUCTION_AUTH_READONLY_INVENTORY.md` and ignored
`generated-artifacts/auth-security/production-two-user-business-references.json`.
Fingerprints are comparison evidence, **not restorable backups**.

## Safest path — six bounded steps

### 1. Identify protected administration accounts

Match the existing Production Super Admin's exact native ID to its unchanged
`platform_admins.clerk_user_id`. Check whether any other existing identity has
an actual platform-administration assignment. Do not infer ownership from an
email, display name, account creation date or provider metadata.

Maintain only a small protected-administrator manifest: original native ID,
canonical business ID, existing role/permissions, MFA/locked state and whether
the account is required for administration. If neither visible user matches the
stored Owner, stop and resolve that mismatch without granting or rewriting roles.
A complete customer migration ledger is not required.

Confirm the deployed release/provider and database target using the already
documented read-only access steps. Do not rerun the full schema audit or assume
the current workspace is the deployed release.

### 2. Back up and verify before any Production operation

After approval of backup custody/target, create an authenticated encrypted backup
of the actual Production business database, relevant files/configuration and
available authentication records through an authorized owner-controlled route.
Do not upload raw Clerk exports: they can contain password hashes.

Restore into an approved isolated target with mail/webhook/payment execution
disabled. Verify row counts/fingerprints, identifiers, original Admin state,
permissions, raw constraints, sequences and private file availability. Preserve
the old provider, original MFA and recovery capability; a user-list export alone
does not back up working credentials or factors.

No backup export or restore has been executed by this preparation. No cleanup
is currently proposed. Verification must precede any later cleanup proposal;
each proposed deletion would then need its own exact scope and explicit approval.

### 3. Prepare an independent Supabase Production configuration

Prepare a dedicated Production-only Auth project; create/configure it only after
approval. Never reuse Development or Staging projects, credentials or data.
Keep the existing business database; authentication replacement is not database
relocation.

Pin the Production project/issuer and canonical HTTPS origin, server-only keys,
independent session encryption, scoped SMTP, exact redirects, secure cookies and
password/MFA/abuse policies. The passive `production-auth-preparation.json`
records pending evidence, not executable settings.

The candidate now supports an explicit isolated Production configuration, using
only `QXLAYER_PRODUCTION_SUPABASE_AUTH_*` settings, the canonical Live origin,
independent server/session keys, and a dedicated Production session cookie.
Startup still refuses unapproved cutover, trial flags, Development/Staging project
reuse and cross-environment secrets. Native frontend builds map only public
Production metadata; no server key is exposed. No live settings were changed.

The non-executable `production-auth-cutover.json` remains PREPARATION_ONLY,
unapproved and without a Production project or evidence. Release checks require
explicit approval and five hash-pinned, operator-reviewed, non-synthetic
Production evidence reports for the same release/project. This replaces the
permanent unconditional build failure without authorizing this candidate to
publish. Evidence hashes pin reviewed reports; they do not independently prove
the truth of a report or replace native verification.

### 4. Preserve and verify only protected administrators

Use fresh proof of the original identity, including its actual existing MFA,
and genuine native Supabase authentication. Link the new native UUID to the
**same existing business ID**; do not replace that ID, create a second Owner
record or rewrite roles/permissions.

Keep the original MFA and Clerk credentials untouched. Do not assume a TOTP
secret is transferable. If exact factor transfer is unsupported, pause for the
Owner's explicit approval of parallel Supabase factor enrollment, prove the new
factor, and retain the original factor/provider for rollback. No silent reset,
factor removal, imported session or substitute Owner is acceptable.

There is no need for mass account import, dormant-customer recovery campaigns,
all-test-user acceptance or a permanent dual-provider customer bridge. Leave
unneeded test accounts in their existing provider, unchanged. Native Supabase
sessions are separate: document the protected administrators' planned
reauthentication rather than trying to convert Clerk cookies.

### 5. Verify readiness and obtain separate Republish approval

Before execution, require:

- Correct deployed/runtime targets and the protected-administrator manifest.
- Verified encrypted backup/isolated restore and rollback procedure.
- Reviewed Production-capable implementation and complete supported additive
  schema diff; no unrelated or destructive change.
- Genuine protected-administrator password/MFA/Admin access, exact identity and
  permission preservation, session refresh/logout, denial of non-admin and
  recovery/pending-MFA sessions, and appropriate security checks.
- An agreed short cutover window, administrator reauthentication and rollback
  behavior. Do not open new registrations during the window; a temporary pause,
  if needed, is itself a separately approved Production change.

For the managed Replit database, schema changes use the reviewed native Publish
flow only after approval; no custom Production DDL, startup repair or schema-push
hook. If the verified runtime target is external, revise the mechanism first.

Only after these gates pass request **explicit final Republish approval**.
Do not remove `scripts/release/authentication-compatibility.mjs` protection merely
to make a build succeed. Native Production checks occur in the approved window;
a workspace pass alone cannot establish Production acceptance.

### 6. Retain a simple, non-destructive rollback

Keep the immutable previous Clerk-capable release, original provider/credentials,
MFA and business data available. Roll back code/provider selection, not business
history. Do not restore an old database over new activity or delete additive
identity links to make rollback look clean.

Avoid new registrations during the approved window. If any new Supabase-only
identity or business activity exists, it must remain accessible and preserved
through an explicitly reviewed recovery path; an old Clerk release cannot
authenticate a new Supabase-only user.

Cleanup and legacy-provider retirement are optional later work, never release
prerequisites and never automatic consequences of migration.

## Immediate next prerequisite

The focused read-only check retrieved the exact stored Super Admin ID and
confirmed its original active business record unchanged. The user subsequently
confirmed that exact ID is present in Production Auth on 2026-10-15.
**The original Super Admin's Production identity is identified; do not request
this proof again.** The protected manifest records the evidence source and
retains the original ID/role without creating or linking an account.

There is one active Admin in the managed baseline and no evidence of another
required platform administrator. Do not migrate the other visible identity
merely because it exists; leave it unchanged. Native MFA/custody, session/Admin
acceptance, the actual deployed target and Supabase linking remain unverified.

Encrypted backup preparation is in
[`PRODUCTION_AUTH_BACKUP_READINESS.md`](PRODUCTION_AUTH_BACKUP_READINESS.md).
The existing configured-key encryption and authenticated recovery tools passed
20 synthetic-only checks. No real backup, export, restore or remote Storage write
was performed. The actual runtime source and independent recovery custody still
need confirmation before capture/restore can be considered ready. These are the
next evidence blockers, not a request for further Owner-ID proof or test records.

Read-only follow-through has verified the pinned export connection over TLS 1.3
against the unchanged Admin baseline and identified the existing private backup
bucket as **Staging-only, 50 MB/object**. No Storage writes are approved. A
disposable, Unix-socket-only local PostgreSQL 16.15 restore candidate passed a
synthetic dump/restore without Production credentials and was removed.
Management metadata GETs return 403; provider backups/other cloud targets cannot
be enumerated with current access. The simplest procedure and precise remaining
custody/source approvals are recorded in the backup-readiness document.

No whole-customer migration inventory, mass import, new backup service or general
customer bridge is needed. Source-schema/runtime support and native protected-
administrator acceptance remain separately reviewed release work, not permission
to alter Production now.

No Production or Staging account, configuration, role, factor, session, schema,
data, DNS or deployment was modified by this plan. No account was deleted.
