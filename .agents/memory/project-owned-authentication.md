---
name: Project-owned authentication
description: User requests Supabase Auth with Staging-first verification and an approval-gated Clerk cutover.
---

The user wants a full authentication system from their side, integrated with this project, instead of Clerk.

**Why:** The user explicitly requested project-owned authentication rather than independent ownership of another Clerk application.

**How to apply:** Treat future authentication work as a migration to authentication operated in the project's infrastructure, not as another Clerk ownership or branding exercise. Preserve existing business identities, permanent owner authorization and tenant assignments. Existing external-migration Production safety boundaries still apply until explicitly superseded.

The user designates their newly verified VYNOX LAYER Staging account as official. Link it through fresh proof of the existing Staging owner account without changing or removing existing owner permissions; configure MFA afterward.

**Why:** The user explicitly identified the account as official and requested this order of operations.

**How to apply:** Do not treat an owner-created official account as a disposable QA fixture. The owner's active private sign-in selects the account to link; do not infer it from the newest registration or email similarity. Keep Production and other projects isolated, and preserve the current deployment approval hold.

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
