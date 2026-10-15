---
name: Project-owned authentication
description: Administrator-only Production migration scope, test-customer status, and isolated Development/Staging preservation.
---

VYNOX LAYER has no real customers yet. All customer accounts created so far are
test accounts. Prepare Production migration only for the original Super Admin
and other genuinely required platform administrators; do not migrate test users
unnecessarily. Preserve the original identity, MFA, business IDs, permissions
and business data. Back up and verify records before proposing cleanup; do not
delete accounts or change Production without explicit approval.

**Why:** The user explicitly clarified the product's customer status and
requested the simplest safe path to Supabase Auth and Republish, rather than
unnecessary all-account migration complexity.

**How to apply:** A protected-administrator manifest replaces an all-test-user
migration ledger; no mass import or general customer bridge is required.
Excluding a test account from migration does not authorize deleting or disabling
it. Reuse completed audits and do not promote Development-only users.
Keep Staging and Production unchanged while preparing; provider provisioning,
credential retirement and Republish still need separate approval.
Clerk's standard CSV export
can include password hashes: request minimal non-secret directory evidence
first, never a raw export upload, and require separately reviewed custody and
field-whitelisting before a full roster handoff.

The user confirmed on 2026-10-15 that the exact native ID stored on the original
active Super Admin business row appears in the Production Auth user-details
view. This resolves the Owner's business-to-directory identification, not native
MFA/custody, runtime database binding or Supabase acceptance.

**Why:** The user explicitly confirmed the exact-ID Production record match.

**How to apply:** Do not ask for the Owner ID or both test-user records again
unless contradictory evidence arises. Preserve the original Owner and factor;
retain user-confirmed provenance rather than claiming an agent directory export
or successful native authentication.

The user wants a full authentication system from their side, integrated with this project, instead of Clerk.

The user authorizes preparing a Supabase-only source candidate for Development,
Staging and Production, removing Clerk and Better Auth runtime implementations,
dependencies and obsolete setup tools while preserving the original Super Admin,
verified MFA, roles, permissions and all business data. The existing Live website
and active Production Clerk configuration must remain unchanged until the
replacement is confirmed working and the user explicitly approves cutover.

**Why:** The user expanded the earlier Development-only source cleanup to all
three environments, while explicitly withholding Production changes and Republish.

**How to apply:** Prepare isolated configuration and verify candidate flows/builds
autonomously. Keep stored legacy business identifiers and proof-based links;
never rename identifiers or delete legacy accounts/tables as dependency cleanup.
Do not treat a production-mode compile or synthetic acceptance as native
Production evidence. Keep release approval fail-closed, retain the live provider
and MFA for rollback, and report exact remaining blockers rather than claiming
DONE or SAFE TO REPUBLISH prematurely.

**Why:** The user explicitly requested project-owned authentication rather than independent ownership of another Clerk application.

**How to apply:** Treat future authentication work as a migration to authentication operated in the project's infrastructure, not as another Clerk ownership or branding exercise. Preserve existing business identities, permanent owner authorization and tenant assignments. Existing external-migration Production safety boundaries still apply until explicitly superseded.

Staging login, 2FA, and session persistence have been manually verified by the user.

**Why:** The user explicitly confirmed these flows before requesting a read-only Development/Staging identity and configuration audit.

**How to apply:** Preserve the verified Staging account and authentication flows; do not recreate an owner or repeat owner authentication through impersonation to establish environment parity.

The user confirmed that the migrated Development Owner account successfully signs in, has enabled and verified 2FA, and opens the VYNOX LAYER Super Admin dashboard.

The user subsequently confirmed the Super Admin login issue is resolved through
Development and requested continuing unfinished security/audit/migration work,
not restarting the completed login investigation.

**Why:** The user explicitly confirmed the private native flows and requested read-only checks of the existing migration before continuing Development work.

**How to apply:** Treat that migrated Development account as official, not disposable QA. Never reset its authenticator, invalidate its sessions, replace its identity link or re-enroll it as a test. Keep owner verification read-only unless a subsequent user request explicitly authorizes an account mutation.

An added legitimate Owner session is not evidence that historical sessions were
lost. Preserve the original baseline; require exact historical digest/subject
fingerprint evidence before accepting an additional same-Owner row.

**Why:** A user-confirmed fresh sign-in can legitimately add a session, while an
aggregate count/hash comparison alone cannot distinguish additions from loss.

**How to apply:** Keep strict verification as the default. An explicit addition
allowance must still prove every original session is unchanged and reject
substitutions, wrong-subject additions or ambiguous growth. Never delete sessions
or overwrite a historical baseline just to make a preservation check pass.

The user authorizes migrating Replit Development from Better Auth to Supabase Auth using a new isolated Development Supabase project and separate Development configuration. Keep verified Staging completely unchanged, retain Clerk, preserve existing Super Admin business IDs, roles, permissions and data, and verify ownership before linking. Never assign Super Admin from email or create duplicate owners. Do not modify or deploy Production or Staging.

**Why:** The user explicitly approved Development-only implementation and requested login, 2FA, logout, session-persistence and Admin-access testing.

**How to apply:** This extends the prior Staging-only implementation approval to isolated Development, not to a shared provider project or a Production cutover. Do not bypass existing guards by labelling Development as Staging, reuse Staging credentials, or activate an unconfigured provider.

For new Development Supabase provisioning, separate organization-level project-creation authorization from Development-project-only setup authorization. The creation token must have no existing project-level permissions; runtime authentication uses an independent Development server key and session secret.

**Why:** Creating a new project requires organization-level capability, but that must not authorize changing verified Staging, Production or other projects.

**How to apply:** Restrict subsequent Auth Config and Project Settings writes to the newly created Development project. A verified Free plan permits the approved free-project creation attempt, not a paid upgrade or an additional billable instance.

Development owner enrollment transfers verified identity from a fresh native Clerk proof, rather than enabling automatic email confirmation for all registrations. The proof must match the existing active Development Super Admin business ID before a new provider identity is created.

**Why:** Existing owner custody must be proved independently of email similarity; lack of a Development mail service does not authorize reusing protected Staging mail credentials or bypassing verification for new accounts.

**How to apply:** Keep standalone signup/recovery fail-closed until independent Development mail delivery is configured. Require real owner participation for migration and final Admin-access acceptance; disposable-account tests and mocked proof tests are not owner migration evidence.

The user designates their newly verified VYNOX LAYER Staging account as official. Link it through fresh proof of the existing Staging owner account without changing or removing existing owner permissions; configure MFA afterward.

**Why:** The user explicitly identified the account as official and requested this order of operations.

**How to apply:** Do not treat an owner-created official account as a disposable QA fixture. The owner's active private sign-in selects the account to link; do not infer it from the newest registration or email similarity. Keep Production and other projects isolated, and preserve the current deployment approval hold.

Automate technical implementation and verification for Staging owner linking; ask the user only for authentication or approval when necessary.

**Why:** The user explicitly requested this workflow while prohibiting duplicate Owner records, authentication bypasses and deployment.

**How to apply:** Select the explicitly designated verified account for bounded checks, but require the approved native ownership proof before linking. Do not impersonate the owner, assign a second Owner permission, or modify Production, DNS or unrelated projects.

The user selected “Build and integrate in Staging first (recommended).”

**Why:** The user approved an isolated Staging implementation, not a Production authentication cutover.

**How to apply:** Verify in Development and Staging before proposing any Production change. Keep Production authentication/data, DNS, paid plans and the suspended Worker untouched.

The user now explicitly requests their own Supabase Auth, reusing compatible custom authentication work. Keep existing account IDs and business data intact. Do not modify Production, remove Clerk, or change existing accounts and permissions until the new system passes all tests and the user approves the final switch.

**Why:** The user specified Supabase Auth and an explicit final-switch approval boundary.

**How to apply:** A custom Better Auth implementation is not completion of the Supabase request. Reuse compatible UI and identity-preservation mechanisms, test the Supabase path separately in Staging, and retain the current Clerk path until approved.

Use `notification@quicklychan.xyz` as VYNOX Staging's authentication email sender, with a separate domain-restricted send-only Resend key. This supersedes the earlier `notification@vynoxlayer.com` sender.

**Why:** The user explicitly confirmed the new sender after identifying `quicklychan.xyz` as the Resend domain. The restriction against full support mailbox access remains in force; an alias is not a separately scoped credential.

**How to apply:** Do not request or use support mailbox passwords, broadly scoped Private Email app passwords, or support IMAP access. Use a genuinely send-only relay credential and preserve Namecheap receiving/MX. Request any required credentials through secure Secrets or the existing integration's secure configuration, never chat. Implement and test actual verification/recovery email delivery in Staging only; keep Production, Clerk, existing accounts, permissions and shared DNS unchanged without separate approval. Diagnose, fix and verify autonomously within these boundaries.

QuickXchange and VYNOX LAYER are independent projects. Preserve QuickXchange's Resend integration, API keys, email delivery and configuration completely; VYNOX must use a separate domain-restricted send-only SMTP key.

**Why:** The user explicitly prohibited changes to QuickXchange. Replit documents account-level reusable connections, so repairing a shared connection in place may affect another project.

**How to apply:** Never update, revoke, rotate or replace the existing account-level Resend credential for this repair. Do not copy QuickXchange credentials. Use separate VYNOX authorization to inspect its domain and provision its SMTP key; privileged setup authorization must not become the SMTP credential. Request new keys or explicit authorization through secure Secrets only. During this repair do not change Production, Clerk, DNS or databases, and never access the Namecheap support mailbox.

Keep Supabase setup authorization scoped to the pinned Staging project. Do not substitute a classic/Legacy account-wide token to work around denied SMTP configuration writes.

**Why:** Auth configuration writes require both Auth Config and Project Settings Read-write in Supabase's scoped-token UI; the latter grants broader project capabilities. A Legacy token would unnecessarily widen access to Production and other projects.

**How to apply:** Request a separate Staging-only setup token through secure Secrets. Use the dashboard permission names, not only the API's `auth_config_write` and `project_admin_write` identifiers. The issuing account must already have the corresponding rights; token scopes cannot elevate its role. Use the token only for the approved Staging email configuration.

Treat Supabase SMTP secret readback as opaque. Saved configuration and a successful direct SMTP message do not prove that Supabase-generated authentication emails work.

**Why:** The management API's SMTP secret readback differed from the submitted credential without a recognizable masking marker. A direct SMTP test bypasses Supabase Auth and cannot establish signup, recovery or MFA notification behavior.

**How to apply:** Never log or retransmit the opaque readback as a credential, and do not rewrite a password merely because plaintext equality fails. Keep integrated authentication mail readiness unconfirmed until approved Supabase-generated flows pass. Distinguish simulated Resend delivery from real inbox receipt, and do not create test Auth identities under a no-database-change restriction.

The user confirmed native Development verification-email receipt and successful verification, followed by recovery-email receipt, password reset and sign-in through a disposable non-admin account.

**Why:** Inbox receipt and private link completion require recipient participation; SMTP configuration and provider request acceptance alone cannot establish those outcomes.

**How to apply:** Treat the integrated Development email flows as user-accepted, not merely SMTP-tested. Preserve the independent Development mail setup and the separate Staging/Production approval boundary.

During Production Auth preparation, identify the live release, active provider
and database binding through agent-led read-only configuration/log inspection,
not repeated requests for the user to obtain technical details.

**Why:** The user stated they do not have access to those technical details and
explicitly requested read-only agent inspection with no Production changes.

**How to apply:** Exhaust available read-only metadata and logs. If the interfaces
do not expose a proof, report the exact limitation without substituting workspace
settings, configured Clerk, a healthy endpoint or a matching database snapshot.
Do not unlock access protection or alter Production to add diagnostics.

For the Production migration, continue the entire safe preparation workflow
autonomously, reusing completed work, reports, checkpoints and verified
configurations without repeating audits. Preserve the original Super Admin, MFA,
all business data and existing settings; do not modify Live, migrate accounts,
perform cutover or Republish without explicit final approval. Do not upgrade paid
plans or incur additional charges without approval.

**Why:** The user superseded the step-by-step workflow with an autonomous request,
while retaining explicit Production, account-migration and spending boundaries.

**How to apply:** Ask only for genuinely unavoidable credentials, billing
decisions or Production authorization. Do not repeatedly seek permission for
safe Development work. Keep preparation distinct from activation and migration.

The user declined additional spending for this migration and requested a safe
$0/month isolated Production solution under the existing Supabase account.
Do not mix Production data with Development or Staging, downgrade security,
purchase, modify Live or Republish without approval.

**Why:** The user declined the paid infrastructure proposal and asked for
supported free alternatives, or a brief minimum-cost explanation if none fits.

**How to apply:** Treat paid resources as unapproved. Do not silently pause a
working environment or change organization ownership/roles to obtain free
capacity. Explain any availability tradeoff before seeking a separate approval.

The user subsequently approved temporarily pausing the VYNOX Staging Supabase
project (never deleting it) to create an independent Production project using
the freed Free slot. Keep Development fully operational. Verify preservation
and pause/resume conditions first; preserve original Super Admin, MFA,
permissions and all business data. Live changes, live-account migration and
Republish still require separate final approval.

**Why:** The user explicitly approved this zero-cost availability tradeoff.

**How to apply:** The user's later secrets-preparation instructions withhold
Staging-pause approval again. Continue safe preparation, but require renewed
explicit approval before pausing or running the dependent project-creation flow;
stored credentials do not renew an earlier approval. Prepare required inputs
before any approved outage. Keep paid resources unapproved. Do not assume Staging
can resume while Development and Production occupy both active Free slots.
