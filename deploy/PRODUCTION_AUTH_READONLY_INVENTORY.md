# VYNOX LAYER Production Auth preparation — 2026-10-14

## Decision

**Current scope supersedes the historical all-account continuity proposal:**
the user clarified that VYNOX LAYER has no real customers and all customer
accounts are tests. Prepare migration only for the original Super Admin and
other proven required platform administrators. Unneeded test accounts need no
Supabase migration; leave them unchanged. No cleanup proposal until backup and
restore/record verification, and no deletion or Production change without
explicit approval. The simplified current plan is
`PRODUCTION_SUPABASE_AUTH_MIGRATION_PLAN.md`; inventory facts below remain valid
as captured, not as fresh queries.

**Subsequent identity confirmation, 2026-10-15:** the user confirmed that the
exact native ID on the unchanged original active Super Admin row is present in
Production Auth. The Owner's business-to-directory match is resolved by this
user-confirmed evidence; historical “identity unresolved” observations below
describe the earlier capture. Native MFA/custody, deployed target binding and
Supabase acceptance are not established by this confirmation.

**NO GO for Republish or account migration.** This is a read-only inventory and
procedure, not authorization to execute a migration. No Production/Staging
configuration, account, role, factor, session, schema, row, DNS or deployment was
changed. No backup export, restore, replica creation request, provider
provisioning, login impersonation or access-gate unlock was performed.

The database tooling enforced a Production read-only transaction; readback
confirmed `transaction_read_only=on`. A proposed explicit transaction wrapper
was rejected by that protection before execution; the inventory was then
collected through a single read-only SELECT inside the managed wrapper.

## 1. Deployment and active authentication evidence

Fresh deployment metadata identifies:

- Primary published URL: `https://www.quicklychan.xyz`.
- Additional published URL: `https://private-label-crypto-platform.replit.app`.
- Autoscale deployment, public visibility, successful current build.

Both hosts return **HTTP 403** for anonymous GET requests to `/`,
`/api/supabase-auth/status`, and `/api/__clerk/v1/environment`. This denies
runtime/provider readback; it does **not** prove the app is down or that either
authentication provider is active. Access controls were not disabled or bypassed.
Filtered deployment logs contained no Clerk/Supabase provider evidence.

Clerk management readback reports **Replit-managed**, with authorized dashboard
access. Production-environment inspection reports Clerk credentials configured,
but no reported Supabase Auth selector/project/server-key/session-secret setup
under the inspected names. Secret values were not read or displayed.

**Best-supported conclusion: Production is consistent with the earlier Clerk
release, but its actual running authentication provider is not conclusively
verified.** Workspace source, a successful build and stored configuration do not
identify the immutable deployed build or its effective runtime configuration.
The current workspace is Development Supabase-only and must not be republished.

Required evidence before proceeding:

1. Read-only identification of the immutable deployed release, effective auth
   selector, pinned issuer/project and actual business-database target.
2. Identify the original Production Super Admin and any other required
   administrator among the **2 users the user subsequently observed** through
   the managed read-only administration surface. The count is user-confirmed;
   protected-administrator mapping remains pending. Do not substitute the
   workspace's test-key directory or request a raw credential-bearing export.
3. Native owner/browser acceptance later, under separate migration approval.

The available read tools did not expose a Production Clerk directory credential
or export. No key was copied, rotated, replaced, or requested to work around this.

## 2. Managed Production database inventory

The following was directly observed on Replit's managed **Production** database.
Because runtime readback is blocked, this must not be represented as proof that
an unobserved deployed external database is identical or selected.

| Item | Observed |
|---|---:|
| PostgreSQL | 16.15 |
| Public business tables | 40 |
| Public columns | 243 |
| Constraints | 139 |
| Primary / foreign / CHECK / unique constraints | 40 / 44 / 46 / 9 |
| Indexes | 52 |
| Public RLS policies | 0 |
| Business tables with RLS enabled/forced | 0 / 0 |
| Exact business rows | 278 |
| Active Super Admin records | 1 |
| Tenant memberships / tenants / customer requests | 0 / 0 / 0 |

Visible business-table grants belong to `neondb_owner`. This catalog observation
is not a least-privilege or cross-tenant authorization test. Keep the database
server-only; no anonymous browser/database grants may be introduced. Application
authorization remains required. RLS/grant changes are a separate reviewed scope,
not an automatic consequence of changing authentication.

Nonempty table counts:

| Table | Rows |
|---|---:|
| `addon_entitlements` | 4 |
| `addons` | 1 |
| `asset_catalog` | 33 |
| `asset_network_catalog` | 37 |
| `entitlement_definitions` | 32 |
| `landing_products` | 16 |
| `module_catalog` | 18 |
| `network_catalog` | 19 |
| `plan_entitlements` | 112 |
| `plans` | 5 |
| `platform_admins` | 1 |

The other 29 public tables are empty in this snapshot, including audit events,
orders, invoices, integrations/provider configuration, tenant configuration and
customer references. Empty does not mean disposable; preserve every table and
its constraints and identifiers.

The order-number sequence has `last_value=1`, `is_called=false`, increment 1.
Its next value was not consumed. No application enums were found. The managed
`_system` migration ledger and its sequence were observed but not changed.

Only `_system` and `public` application schemas are present. There are no local
`vynox_supabase_auth` identity-links, sessions, rate-limits, recovery-codes or
recovery-events tables, and no local retired custom-auth users table.
Absence of local `auth.users` does not rule out a separate remote Auth provider.

Development has 42 public tables, including `tenant_integrations` and
`tenant_telegram_receipts`, plus five Supabase application-support tables:

- `identity_links`
- `sessions`
- `rate_limits`
- `recovery_codes`
- `recovery_events`

Therefore current-source compatibility is not an auth-only schema toggle.
Review the complete supported publish diff, raw constraints/defaults/grants,
and every unrelated addition before any future release. Do not copy Development
rows or generate a bespoke managed-Production DDL script.

Evidence in ignored, access-controlled workspace output:

- `generated-artifacts/auth-security/production-schema-details-normalized.json`
- `generated-artifacts/auth-security/production-data-inventory-normalized.json`
- `generated-artifacts/auth-security/production-readonly-boundary.json`
- `generated-artifacts/auth-security/production-http-inventory.json`

The HTTP evidence file records the initial unavailable sandbox-network probes
and the subsequent independent shell GET observations of six HTTP 403 results.
The data inventory contains exact counts and SHA-256 row fingerprints for all
40 tables. These are baselines, **not restorable backups**.

## 3. Historical Development account audit — not Production migration scope

**The 42-account roster is Development, not verified Production.** The user
subsequently confirmed **2 users** in Replit Cloud → Users & Auth → Production.
Their native records/IDs have not been retrieved by the agent. One business
Owner row and no tenant memberships do not identify either authentication user.
Do not import all 42 into Production or copy their Development assignments
merely because they are in the earlier audit.

The focused subsequent Production linkage readback and two-user preservation
matrix are in
[`PRODUCTION_SUPABASE_AUTH_MIGRATION_PLAN.md`](PRODUCTION_SUPABASE_AUTH_MIGRATION_PLAN.md#what-is-already-known--do-not-repeat-the-completed-audits).
It found one unchanged active Super Admin reference and no tenant/customer/actor
references in the seven typed identity-reference columns. Which, if either, of
the two Production users matches that Admin remains unresolved without their
native IDs. Do not infer “one Owner and one customer”.

The existing complete pseudonymous audit is retained as historical evidence.
Its conditional paths below are **not a requirement or authorization to migrate
test accounts**. Only independently identified required Production
administrators belong in the current migration scope:

| Cohort | Accounts | Proposed path — no execution |
|---|---:|---|
| `legacy-005`, original proof-linked Development Owner | 1 | Keep the official Development link and factor untouched. Independently prove the original Production Owner and bind a Production-only native subject to its unchanged Production business ID. Never copy the Development link, tokens or factor secret. |
| `legacy-011`, unlinked client admin with no reported password/social method | 1 | Establish its actual existing Clerk email OTP/link, passkey or controlled recovery capability. Require exact legacy/native custody proof; preserve its client-admin role, permissions, tenant membership and customer request. No unsolicited password reset or email-based grant. |
| `legacy-006`, `legacy-024`, `legacy-026`, `legacy-030` | 4 | Progressive migration after fresh legacy password sign-in and verified new native identity. Keep every customer/request/audit reference attached to the unchanged business ID. Add only an atomic unique identity link; do not rewrite the referenced records. |
| Remaining password-enabled, unlinked accounts with no discovered business references | 36 | Same proof-based user-controlled transition. Preserve every account, including inactive/unreferenced users. No deletion, forced new identity, automatic email merge or invented assignments. |
| **Total** | **42** | **All have prepared paths; none were migrated.** |

Create a small protected per-ID matrix only for required Production
administrators before provisioning or cutover. For each protected account record: actual issuer/
environment, immutable native ID, preserved business ID, existing role and
permissions, blocked/locked state, supported sign-in/MFA methods, business
references, target subject if proven, collision checks and acceptance evidence.
Pseudonymous aliases alone are not an executable native-ID mapping.

### Historical progressive design — not a required customer bridge

The following exact-proof safeguards remain relevant to protected
administrators, but a general customer bridge, complete test-user migration and
dormant-test-user recovery are not required. Prefer a bounded administrator-only
cutover with explicit reauthentication and rollback, as specified in the current
simplified plan. Leave excluded accounts and their existing provider unchanged.

Keep the existing published Clerk authentication/session path during a bounded
transition. Build a separately reviewed Production-capable transitional release;
do not publish the current Development-only release as that bridge.

Require fresh exact legacy proof plus verified new native proof, pinned issuer,
audience/authorized origin, CSRF/state/nonce binding, short expiry and single-use
consumption. Owner proof requires its actual native MFA when enrolled. Link the
two subjects atomically to the existing business ID, with unique constraints and
conflict rejection. Derive privileges from preserved business authorization,
never email similarity, provider profile metadata or caller-supplied roles.

Retain existing Clerk sessions under their existing expiry/revocation policy.
Do not convert cookies into Supabase tokens, replay Owner sessions, extend old
session lifetimes, or bulk-log users out. New native sessions require native
authentication. Recovery-only and pending-MFA sessions must remain denied
business/Admin access.

Do not assume password hashes, TOTP seeds, recovery codes or OAuth identities
are exportable. Confirm provider-supported capabilities first. If unavailable,
use approved user-controlled new native password/MFA enrollment while retaining
old credentials/factors until verified continuity and explicit retirement
approval. Never silently reset or disable the existing factor. Preserve locked/
banned state rather than enabling an account as a migration side effect.

Dormant/unreachable **required administrators** need an approved exact-custody
recovery path. Unneeded customer/test accounts need no migration or recovery
campaign; exclusion does not authorize deletion or disabling.

## 4. Backup and restore procedure — prepare only

Before a future authorized transition:

1. Confirm the actual Production database/provider targets, immutable old
   release, canonical hosts and independent provider credentials. Do not export
   the wrong environment based on a Development connection string.
2. Approve export scope, encrypted storage, custody, retention and recovery
   operator. Do not put plaintext data, keys, native account exports or tokens
   in Git, chat, screenshots or publicly downloadable reports.
3. Capture a consistent database backup with schema/data, sequence state, raw
   constraints/defaults, indexes, grants/RLS, extensions and dependency/role
   requirements. Record exact counts and deterministic fingerprints, including
   configuration, original Owner and every identity reference.
4. Export the authoritative provider directory and supported migration material
   read-only, subject to capability checks. An API user list does not back up
   password hashes, factors, recovery codes or transferable sessions. Preserve
   the original provider itself throughout the transition.
5. Include authorized files/private object keys and the app's configuration/key
   custody procedure. Inventory provider configuration without printing secrets.
   Keep new Production keys independent of Development/Staging.
6. Encrypt with authenticated encryption and an independent trusted ciphertext
   checksum. Verify the complete envelope before exposing plaintext; do not
   stream unauthenticated GCM update output into a restore.
7. Restore only into an expressly approved isolated target, with outbound
   provider/mail/webhook/payment calls disabled and independent test credentials.
   Check role/ACL dependencies, raw CHECK/FK/unique definitions, sequences,
   constraints, counts, fingerprints and private file access. Capture proof of
   restoration and operator recovery before accepting a backup as usable.

No export, sensitive archive, restore target or backup test was created/run in
this inventory. Existing encrypted external-transfer artifacts are not evidence
of a current, restorable Production authentication backup.

For the managed Replit database, Production schema changes belong to the
reviewed native Publish flow after explicit approval. Prepare/test the source
schema in Development and inspect the complete additive publish diff. No
standalone Production DDL script, startup self-healing DDL, schema-push deploy
hook, or overwrite-data option is permitted. If runtime evidence later proves
the active business database is external, revise this procedure for that
specific documented target before approval.

## 5. Rollback and account-continuity verification

Approve rollback **before** starting a transition:

- Preserve the immutable previous Clerk-capable release and provider.
- Prefer code/provider rollback while retaining additive schema, new links and
  all new business activity. Never restore an old full database over newer
  orders, memberships, configuration or audit events.
- Define how new Supabase-only registrations authenticate after rollback:
  keep a reviewed dual-provider recovery path or pause new registration during
  the approved cutover window. Do not claim an old Clerk-only release can
  authenticate accounts that never existed in Clerk.
- Classify mixed/intermediate states and resume idempotently. Abort on changed
  business IDs/roles, conflicting links, missing factors, cross-tenant access,
  recovery/pending-MFA privilege leaks, wrong provider/project or unavailable
  authenticated restore.
- Do not revoke old sessions or delete links/providers/secrets to force rollback
  or make a fingerprint comparison appear clean.

Required acceptance ledger for **each protected Production administrator**:

1. Existing account and exact issuer verified; native target proof is genuine.
2. Business ID, role, permissions, blocked/locked status and every reference
   preserved; no duplicate Owner or privilege escalation.
3. Unique link, simultaneous/replayed proof rejection and safe retries verified.
4. Real password/OAuth/email delivery behavior and the actual MFA enrollment/
   challenge/recovery behavior validated without bypassing assurance.
5. Existing-session continuity; new native login; refresh, expiry, reload, new
   tab, logout and back-navigation isolation; provider outage fails closed.
6. Owner Admin acceptance, non-admin denial and cross-tenant/customer boundaries.
7. Recovery-only sessions denied business access even after factor verification.
8. Rollback preserves both old and post-cutover users and all business activity.

Owner browser acceptance must be performed by the genuine Owner, not a server
minted sign-in ticket, imported cookie or substitute privileged test account.
Development tests and private Development sign-in do not establish Production
acceptance.

## 6. Approval decisions and prerequisites before Republish

| Decision | Recommendation / approval boundary |
|---|---|
| Authoritative Production directory and runtime evidence | Obtain a read-only managed Production directory export and immutable deployed provider/database evidence. Do not replace managed keys, disable access controls or treat test keys as live. |
| Account scope | All customer accounts are tests. Migrate only the original Super Admin and other required Production administrators. Do not promote Development users, import tests unnecessarily or delete excluded accounts. |
| Business database location | Keep the existing managed business database for this auth-only migration unless runtime evidence or explicit approval establishes another target. Do not bundle a database relocation. |
| Continuity strategy | Prefer bounded administrator-only exact-proof migration and reauthentication with a previous-release rollback; no bulk test import or general customer bridge is required. |
| Credentials, MFA and unreachable users | Approve provider-supported transfer or parallel user-controlled native enrollment, plus dormant-account recovery and the old-provider retirement criteria. No silent resets. |
| Independent Production provider/configuration | Approve provisioning, scoped capabilities, SMTP/real delivery, password/MFA/abuse rules, origins, cookie/key custody and least privilege. No Development/Staging credential reuse. |
| Backup/restore custody | Approve encrypted export/storage, authorized operator, isolated restore target and retention. Fingerprints alone are not a backup. |
| Cutover and rollback policy | Approve old-session expiry handling, registration policy, dual-provider rollback behavior, acceptance ledger, maintenance window and abort thresholds. |
| Final release | Require a fully reviewed supported schema diff, security sign-off, restorable backup, protected-administrator continuity, native Production acceptance and a **separate explicit Republish approval**. |

The authentication release hold remains untouched. Prior Development evidence
(412 passing tests, no dependency/privacy findings, nine reviewed medium static
warnings) remains Development evidence, not permission to release or a newly
performed Production acceptance test.
