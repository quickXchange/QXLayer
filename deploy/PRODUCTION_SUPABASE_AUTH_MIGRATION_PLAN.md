# Production Supabase authentication migration plan — approval required

Status: **plan only**. No Staging/Production change, migration, account operation,
deployment, DNS change or Republish is authorized by this document. Keep
`scripts/release/authentication-compatibility.mjs` blocking release.

## Evidence and limits

The read-only Development audit paginated all 42 legacy Clerk accounts and
confirmed an identical directory fingerprint before and after the audit:

| Development finding | Accounts |
|---|---:|
| Legacy directory total | 42 |
| Exact proof-linked Supabase identities | 1 |
| Not proof-linked | 41 |
| Unlinked with public business references | 5 |
| Unlinked with tenant-role assignments | 1 |
| Original active Super Admin | 1 |

No account, factor, role or business record was modified by the audit. It did not
match identities by email, label apparently unused accounts disposable, or decide
that unreferenced accounts may be discarded. Per-account pseudonymous results
are in ignored `generated-artifacts/auth-security/legacy-audit.json`; no email
addresses, native IDs or credentials are included in that report.

**These are Development accounts, not a Production migration inventory.** Clerk
Development and Production directories must not be assumed identical. The prior
Production read-only audit found one original active legacy-ID Super Admin and
no Supabase application identity-links, sessions or recovery-codes tables.
Production ingress denied direct auth readback, so its active provider/version
is not independently confirmed. This turn performs no new Production access.

## Non-negotiable invariants

- Keep all existing business IDs, users, roles, tenant memberships, permissions,
  customer/order assignments, files, private object keys and commercial data.
- An existing `clerk_user_id` is a canonical business identifier; do not rename,
  regenerate or replace it merely because authentication changes.
- Preserve the original active Owner record. Do not create another Owner,
  assign ownership by email, use an admin-generated recovery link as proof of
  account custody, or impersonate an existing account.
- Preserve Staging and QuickXchange provider projects, identities and credentials.
- Never copy Development/Staging secrets, factor secrets, test identities or
  encrypted application sessions into Production.
- Keep authentication and financial execution separate; this plan authorizes no
  trading, payments, provider execution or customer delivery.

## Phase 1 — approved read-only Production inventory

Before any implementation/cutover approval:

1. Obtain separate authorization to inventory the actual Production Clerk
   directory, deployed provider/build metadata and business database.
2. Paginate the Production directory completely and capture access-controlled
   immutable fingerprints, not only a total count. Record verified sign-in
   methods, blocked/locked state, current MFA and active membership references.
3. Compare provider IDs against every business identity reference, not just
   customers or active tenant admins. Include audit-actor references and owners.
4. Inventory schema, sequences, indexes, CHECK/FK/unique constraints, RLS/ACLs,
   recovery-code/event semantics, sessions and current grants.
5. Create an explicit continuity decision for every account. Unassigned users
   still require a login-continuity policy. No automatic account deletion,
   abandonment, email matching or duplicate-account creation is allowed.

Deliver a reviewed account matrix and migration acceptance checklist. Sensitive
exports must be encrypted in approved storage, never committed to Git or printed.

## Phase 2 — separately approved Production provider preparation

Provision/configure a dedicated Production Supabase Auth project only after
approval. Pin its project reference and canonical HTTPS auth origin, verified
TLS, server-only API key, SMTP sender, allowed redirects and independent session
encryption key. Use separate scoped setup/runtime capabilities.

No Production environment may select the Development or Staging project. Do not
weaken existing guards by labelling Production as Staging. Provider activation
requires explicit reviewed Production support, not a copied environment flag.

Verify real delivered email confirmation/recovery through controlled native
flows, SMTP quotas, MFA availability, password policy, abuse limits, callback
validation and cookie configuration. Provider-admin test tokens are not inbox
delivery or Owner acceptance evidence.

## Phase 3 — additive database preparation and restore rehearsal

Use a reviewed, versioned, idempotent migration to add only the required
Supabase identity-link/session/recovery structures and least-privilege grants.
Preserve all current business tables and their identifiers. Enforce unique
subject/business binding and subject-scoped recovery/session access; do not
replace business authorization with provider metadata.

Rehearse against an approved isolated Production-like snapshot, with provider
connections disabled and credentials independent. Preserve raw schema/data
captures and verify row fingerprints, raw constraints, sequence ownership,
roles, RLS and ACLs. Validate backups by a full authenticated restore. An empty
schema diff is not proof of constraint parity.

No destructive migration, startup DDL, truncate, reset, Development database
copy, or business-ID rewrite is permitted.

## Phase 4 — account continuity before fallback retirement

Choose and approve a bounded transition design **before** implementation:

- Retain the current published Clerk login/session path during the transition.
  Do not publish the current Development-only release as a transition bridge.
- Build a separately reviewed, issuer/origin-pinned legacy-proof bridge, or an
  approved provider-supported migration flow. Its purpose is account custody,
  not general anonymous account creation or permanent Clerk dependency.
- Existing users prove control of the exact legacy identity and their verified
  new identity. Any existing Owner additionally requires the approved fresh
  native Owner/MFA proof. Email similarity is never sufficient.
- Create the identity link atomically, preserving the old business ID. Refuse
  conflicting subjects, duplicate business IDs and privilege changes. Retry
  without duplicate accounts or role writes.
- Do not assume Clerk password hashes or existing TOTP secrets are exportable.
  If unavailable, use explicit user-controlled new password/factor enrollment
  after authenticated custody proof. Bulk factor resets, silent password resets,
  automatic email confirmation and unsolicited migration email campaigns are
  not authorized.
- Preserve current Clerk sessions until a reviewed transition boundary. Existing
  encrypted sessions cannot simply be interpreted as Supabase sessions. Document
  any unavoidable reauthentication, expiry and rollback effects before approval.

The 41 unlinked Development accounts cannot be treated as migrated. Their five
business-linked accounts and the tenant-role account are priority cases, not
the only accounts entitled to continuity. A separate Production matrix is
required before deciding when any legacy fallback can be retired.

## Phase 5 — native acceptance and failure testing

Use disposable, unprivileged fixtures for automated tests; never a substitute
Owner or injected Owner cookie. Require genuine private Owner participation for
native Owner login → TOTP → Admin Panel acceptance.

Cover:

- Signup, real verification receipt/consumption, password login, incorrect
  password, unverified/blocked/locked users and confirmation timing.
- TOTP setup/challenge/wrong codes, pending-MFA denial, recovery-code behavior,
  trusted assurance readback and MFA retained after password recovery.
- Recovery-only sessions denied business/Admin routes before and after MFA.
- Refresh, reload, multiple tabs, expiry, provider outage, cookie persistence,
  logout, back/BFCache and revoked sessions; fail closed without stale account
  data or cross-account query caches.
- Original Owner access; client-admin/staff permissions; customer access;
  tenant isolation; non-admin denial; all delivered customer assignments.
- Cookies with Secure/HttpOnly/SameSite, CSRF/origin/redirect controls, independent
  encryption keys, token/log redaction and no bearer tokens in Web Storage.
- Typechecks, all unit/regression suites, production-mode builds, dependency,
  static and privacy scans; explicitly disposition scanner errors/findings.

## Phase 6 — cutover approval and controlled release

Do not remove the release hold until the actual Production inventory,
provider/configuration/schema readiness, account continuity, restore rehearsal,
security review and native Owner acceptance are approved. Then request separate
deployment/Republish approval. A successful compile or removal of the assertion
is never deployment permission.

If approved, use an explicit maintenance/transition window, verified immutable
release, rollback checkpoint and controlled rollout. Read back the actual live
build, provider, schema constraints and native Owner/customer behavior before
declaring success. No DNS changes are needed merely to replace authentication.

## Rollback and abort conditions

Abort for any changed/missing business fingerprint, broken original Owner
binding, missing verified factor, role drift, cross-tenant access, conflicting
identity link, recovery-session privilege leak, unexpected provider project,
unavailable restore, or failed critical native acceptance.

Keep the previous published build/provider and additive schema available
through the agreed transition. Rollback must preserve new business activity and
new identity links; never restore an old full database over current orders.
Document how accounts created after cutover authenticate after rollback before
approving the cutover. Retire old credentials/accounts only with later explicit
authorization and demonstrated continuity for every in-scope account.

## Current release decision

**NO GO.** This document prepares the migration but executes none of it. The
Production provider/schema transition and per-account continuity are not yet
approved or implemented. Development Owner native browser acceptance also needs
genuine private authentication; preserved bindings and unit tests do not prove
a fresh Owner login or browser persistence.
