# Supabase-only candidate — NOT safe to Republish yet

## Prepared without changing Live

- No Clerk or Better Auth SDK remains in workspace dependency manifests or the
  lockfile. Removed obsolete external-Clerk adapters, provider provisioning,
  legacy deployment/identity-linking brokers and their dependent legacy QA tools.
- Removed legacy authentication API route handlers; old paths are now ordinary
  404s. No identity, credential, session, role or business record was deleted.
- Development and Staging retain their existing isolated project configuration.
  Production now has an explicit independent configuration interface, a separate
  session cookie, strict canonical origin and cross-environment secret/project
  rejection. No Production target was created or activated.
- Verified-Gmail passwordless login is available in the shared candidate for all
  three environments. Six-digit codes remain browser-bound, single-use,
  five-minute, account/attempt/rate-limited and restricted to already-linked
  verified Super Admins with an existing verified TOTP factor. Email login cannot
  also satisfy the second factor; native Google Authenticator is still required.
  Development-only alternative MFA/recovery mechanisms were not enabled elsewhere.
- Email/password, native recovery, session refresh/logout and identity-link
  authorization are retained. Removed the old frontend verification-success flag
  fallback. Preserved existing business identifiers, including historical
  `clerk_user_id` columns and translation namespaces; these are data contracts,
  not retained authentication providers.
- Declared the existing five-table application Auth support schema in Drizzle
  for reviewed additive publishing. No SQL/schema push or startup DDL was run.
- Production frontend builds map explicit non-secret Production metadata.
  Server secrets never enter Vite. Server startup separately requires cutover
  authorization. The checked-in cutover record is unapproved and blocks publishing.

## Verification

- Workspace type checking passed.
- 68 Auth tests passed, including mocked Staging/Production Gmail + mandatory
  TOTP, original-role preservation, MFA recovery isolation and session protection.
- API and both website production-mode builds passed. The console build used a
  clearly synthetic Production project reference for compile verification only;
  this is not a configured or authenticated Production environment.
- Native lifecycle verification is limited to an exact disposable non-admin
  Development fixture; never change the official Super Admin as a test.
- Native Development browser checks passed: password login, verified TOTP,
  TOTP-protected password reset, new-password sign-in, non-admin `/api/me`,
  denial of `/admin`, security-page reload/session persistence and logout denial.
  The exact disposable fixture and its sessions were cleaned up afterward.
  This did not verify real Gmail inbox receipt or Production administrator custody.
- The first browser pass caught a namespace regression in the tenant-RLS table
  inventory after declaring private Auth tables. It was fixed by classifying the
  namespace before returning public names; no tenant policies or role/grant checks
  were relaxed. Both the regression/fail-closed tests and focused browser retest
  passed. Fifteen release-gate/configuration tests also passed.
- Read-only Live check remained healthy (`/api/healthz` 200); unauthenticated root
  still returns its existing protection response (403). No gate was unlocked.

## Remaining cutover gates

1. Identify the immutable running release and actual database binding through
   authorized read-only evidence. Available metadata/public reads do not expose
   those; do not substitute workspace settings or a matching export connection.
2. Independently configure and verify a real Production-only Supabase project,
   origin/redirects, email templates/delivery, scoped server key and independent
   session key. No Development/Staging credential reuse.
3. Confirm independent encryption-key custody, authorize a private receiving
   destination and real backup/isolated restore, then verify recovery.
4. Prove the original protected administrator's native identity and current MFA,
   link the replacement native identity to the SAME existing business ID and
   verify native Supabase MFA/Admin/session acceptance. Never match by email,
   grant a substitute Owner, remove the original factor or migrate test customers.
   If a factor cannot be transferred, any parallel enrollment needs explicit
   approval while the original provider/factor stays intact.
5. Review the actual supported additive native publish diff and retain the
   original running release/provider for non-destructive rollback. Obtain
   explicit cutover approval before enabling Production or Republish.

No Production/Staging environment, active Clerk configuration, account, factor,
schema or deployment was changed. No real backup/export/restore was performed.

## Production capacity decision

The existing organization-scoped provisioning credential allowed read-only
organization/project inventory even though account-wide listing was forbidden.
The VYNOX organization is Free and contains exactly the two healthy pinned
Development and Staging projects; neither is a spare Production target.
Sanitized evidence: `generated-artifacts/auth-security/supabase-production-capacity-readonly.json`.

Supabase's two-free-project limit applies across organizations in which the user
is Owner/Administrator. Creating another Free organization is not a safe quota
workaround. Do not pause either working project, repurpose its identity store or
upgrade its organization to obtain capacity.

The isolated alternative is a separate Production-only Pro organization with one
Micro project, currently starting at US$25/month before taxes, usage or add-ons.
This is a proposal, not approval or provisioning. Keep spend cap enabled, paid
add-ons disabled and obtain billing approval before creating any paid resources.
No plan upgrade, project creation, account migration or activation was performed.

The standard release test command now includes the Auth approval/preparation,
provider/session/MFA and public-versus-private schema-isolation regression suites
through `pnpm auth:test`. Existing native browser and owner acceptance results are
reused; new synthetic checks must never substitute for Production acceptance.

### Free alternatives reviewed

The paid proposal was not approved. No purchase or provider change is authorized.
The existing organization has one member with the Owner role; its two active
Free projects therefore consume the Owner's two-project allowance.

- Another Free organization does not increase that Owner's allowance. The
  billing FAQ's new-organization workaround concerns a different Owner/Admin
  member exhausting their quota; it does not increase one's own quota.
- Preview/persistent branching is not a $0 workaround: branch compute is billed
  and is not covered by the spend cap.
- Extra schemas or shared Auth in either existing project violate the required
  independent Production identity/data isolation.
- Pausing one non-Production project could free a slot without deleting it, but
  would make that environment's authentication unavailable. That changes the
  current requirement to retain both working environments and needs separate
  approval. The documented pause/restore retention window must also be respected.

There is no supported third simultaneously active, independently isolated
hosted Free project under the current account/availability constraints.
No project was created, paused, transferred or modified.

Sources:
- https://supabase.com/docs/guides/platform/billing-faq
- https://supabase.com/docs/guides/platform/manage-your-usage/branching
- https://supabase.com/docs/guides/platform/free-project-pausing
