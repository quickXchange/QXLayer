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

### Approved temporary Staging pause

The user subsequently approved pausing Staging only (not deleting it) and creating
an empty, independent Production project in the released Free slot. Development,
Live, existing accounts, MFA and all data remain protected; no cutover or
Republish is authorized.

Pre-pause read-only evidence captured 74 table fingerprints, verified all 42
business tables unchanged, and confirmed the existing protected Staging
administrator is still linked to its verified native TOTP factor. TLS used the
retained verified Staging CA, with hostname verification enabled. Provider backup
listing is not authorized by the retained tokens; an independently restored
backup is NOT claimed. Supabase documents same-project data/configuration
restoration within one year after pause.

The guarded Free provisioning sequence checks preservation, independent password
availability, the Free plan and healthy Development before pausing. It records
durable progress, refuses duplicate provisioning, never migrates accounts and
reconciles ambiguous creation before attempting Staging recovery. New synthetic
tests cover its safety boundaries.

No pause has been executed yet: independent Production provisioning credentials
must be present first, avoiding an unnecessary Staging outage while setup is
blocked. After Production occupies the slot, resuming Staging requires another
available Free slot or separately approved paid capacity.

### Current secrets-only preparation boundary

The later user instruction withholds Staging pause and Live/Republish approval.
Secret presence does not renew the earlier pause/create approval. Independent
Publishing copies are user-confirmed, not independently attested by the secure
existence interface, which includes Shared entries in its Production view.
Both Shared entries now exist; missing-secret availability is no longer the
reported blocker. Approval and a secure isolated execution context remain gates.
See `deploy/PRODUCTION_SECRET_SCOPE.md` for the dependency assessment, safe
Shared-copy removal and the separate provisioning-context limitation.

The local provisioning guard now requires distinct current pause and creation
approvals and both independent credentials before provider calls. No provider
operation or provisioning-state write was performed for this preparation.

The user subsequently renewed pause/create approval after removing Shared copies.
Workspace absence is verified; Publishing storage remains user-confirmed, not
independently readable by the agent. The retained preservation snapshot is still
recent and is reused without repeating the audit. A hidden-input interactive
runner supplies credentials only to the one approved provisioning process, with
no Shared reinstatement, credential file or shell-argument exposure. Execution
still awaits that unavoidable private input; no pause or creation is claimed.

### Independent Production project verified

The owner completed the private execution. Saved provisioning state reached
`FREE_PROJECT_CREATED_AUTH_NOT_ACTIVATED`. Fresh organization-scoped GET evidence
confirms the independent Production project `qcgvhlphalxqzzsxqjhi` is
`ACTIVE_HEALTHY`, Development remains `ACTIVE_HEALTHY`, and Staging is `INACTIVE`.
There are three retained projects, with only Development and Production active.
The actual target reference is now recorded in the preparation-only draft;
release/cutover authorization is still false and no Live runtime binding changed.

The organization creation token receives HTTP 403 for this new project's Auth
Config. It cannot configure Auth. A separate fine-grained setup token scoped
ONLY to this Production project is required; do not reuse Staging/Development
tokens or request Legacy account-wide authorization. No matching Supabase
management integration was found.

`deploy/production-supabase-auth-bootstrap.json` records the unapplied policy
proposal and write boundaries. Configure only after reading the native baseline
with the newly scoped token. No accounts, factors, mail credentials, Auth
configuration or Live settings were changed during this readback.

### New-project Auth core prepared

The separately scoped setup token reads the pinned Production project and Auth
Config. Core policy is now natively read back: exact canonical HTTPS site and
verification/recovery redirect URLs, public signup disabled while preparation is
incomplete, email confirmation required, ten-character uppercase/lowercase/digit
password policy, TOTP enrollment/verification enabled and six-digit email OTP.
Phone-factor and anonymous-login defaults remain disabled. No users, factors or
business records were created, migrated or modified.

Supabase rejected the combined template update with HTTP 400. A bounded
separation confirmed the core patch succeeds while custom template writes fail
with an SMTP-related response on this SMTP-unconfigured project. The guarded
helper now prepares core policy independently and defers all custom templates
until custom SMTP exists. Native core readback succeeded and unrelated settings
were preserved. Eight helper tests passed, including scope, secret-field,
SMTP-prerequisite, idempotency and readback-drift boundaries.

Remaining operational credentials are not silently substituted. The existing
Resend connection's read-only domain lookup returned 400; its API-key connection,
domains and existing keys were not changed. An independent Production-only
domain-restricted Sending Access key is needed for the new project's SMTP.
The Supabase setup token's API-key metadata GET returned 403; native runtime-key
custody and owner verification remain separate gates, not completed acceptance.

Evidence: `generated-artifacts/auth-security/production-auth-config-readback.json`.
SMTP, custom templates, inbox delivery and native Production Owner/MFA/Admin
acceptance remain unverified. No Production application runtime was activated,
no Live configuration was modified and no Republish occurred.

### Independent Production SMTP and templates prepared

The owner supplied the requested separate Production Resend sending key through
the secure Secrets flow. Its management-domain lookup was explicitly denied with
the provider's restricted-key classification, confirming send-only access.
Direct SMTP authentication and the `production-auth@quicklychan.xyz` sender
envelope succeeded over verified TLS. The transaction used RSET/QUIT, never DATA;
no email was sent and no native Auth identity was created.

Only the pinned new Production project's SMTP fields and bounded 30-message/hour
quota were configured. Canonical origin, signup hold, confirmation requirement,
password rules, TOTP and all unrelated settings were preserved. Supabase's opaque
SMTP secret readback was checked only for persistence, never compared as
plaintext or retransmitted.

After SMTP existed, the independent Auth helper applied all three subjects and
confirmation/recovery/login-code templates. Native readback verified their exact
contents, corresponding boolean override flags and the unchanged core policy.
There are no pending core/template fields. Evidence:
`generated-artifacts/auth-security/production-smtp-readback.json` and
`generated-artifacts/auth-security/production-auth-config-readback.json`.

Send-only access and permission to send from the approved domain do not
independently prove the key is restricted to that single domain; its restriction
was requested from the owner and remains explicitly distinguished in evidence.
SMTP acceptance is not Supabase-generated inbox delivery. Runtime server-key
custody, native Owner/MFA/Admin acceptance, real recovery backup/restore and final
cutover authorization remain unresolved gates. No Live, Development, Staging,
DNS, shared Resend connection or existing account changes were performed.

The temporary workspace SMTP setup copy is no longer needed for configuration
readback. Retain its independent private backup before removing that workspace
copy; the separate credential stored in Supabase Auth remains the SMTP runtime
credential. Do not remove Supabase's saved credential or Publishing-only runtime
secrets as workspace cleanup.
