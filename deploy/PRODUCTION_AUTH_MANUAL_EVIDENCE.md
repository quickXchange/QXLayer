# Production administration-only Auth preparation: manual evidence

## Current boundary

Reuse the completed Production schema inventory and Development 42-account
audit; do not rerun them. The user clarified that there are no real customers;
all existing customer accounts are tests. Prepare continuity only for the
original Super Admin and any other required platform administrators. Do not
migrate unneeded test users or build a general customer-migration bridge.
Preparation is not approval for execution. Production/Staging data, configurations,
accounts, credentials and sessions remain unchanged. Do not create a project,
rotate/revoke Clerk keys, enable Supabase, change DNS, run an import or Republish.

The three missing proofs below must be collected independently. They are not
interchangeable: a Users page identifies a directory, not the app's running
provider; a Database page identifies a database, not the app's effective target.

## A. Identify the protected Production administrators

**Completed by the user:** 2 Production users observed, followed on 2026-10-15 by
confirmation that one Production user-details record has the exact stored
original Super Admin ID. No further count or Owner-ID proof is needed now.
This is user-confirmed directory identification, not native MFA/custody or
Supabase acceptance. The reference steps below must not become a repeat request.

1. Open this VYNOX LAYER project in Replit, then open **Auth**.
2. Select **Production** in its environment selector. Do not use Development
   or create/connect a new Clerk application.
3. Open **Users**, then the original Super Admin's existing record. Copy its
   native **User ID**, without editing the record or revealing credentials.
4. If the pane lacks the required details, use Replit's authorized managed
   **Production Clerk dashboard** access. Verify Production in that dashboard,
   then open **Users**. Replit management readback currently allows this route.
   Do not sign up for an unrelated external Clerk application.
5. Send only the protected administrator's native ID and the non-secret
   Production application/instance identifier if visible. Identify any other
   account needed for platform administration. Do not infer this from an email
   or give a test user an administrative role.
6. If the route is unavailable, report the exact unavailable control/error.
   Do not change permissions, keys, pricing, provider settings or access controls
   to make it work.

This establishes identification evidence only. Match protected administrators
exactly to existing business IDs and roles, and record their actual MFA and
locked state in protected evidence. Customer/test-user migration records and
all-test-account acceptance are not prerequisites. Do not delete or disable an
excluded test account; cleanup requires verified backup and separate approval.
The 42 Development identities remain separate regardless of Production count.

### Export safety — do not upload a raw CSV

Replit's Auth pane documentation does not promise a CSV export. Do not look for
an invented Export button there.

Clerk's upstream **instance Settings → User exports → Export users → Download**
workflow can include **hashed passwords**. This is not the next step: do not
generate a raw export for this preparation or upload one into chat/workspace.
Export creation is also a provider operation, not simply viewing Users.

If a full export is later needed, separately approve its custody/scope first.
Use a protected owner-controlled process to retain only reviewed fields:
native user ID, instance/environment, email-verified boolean (not email address),
password-enabled boolean (not digest), supported provider names, MFA-enabled
booleans (no factor seeds/recovery codes), and banned/locked flags. Count and
complete pagination must reconcile. Do not include arbitrary metadata, OAuth
tokens, phone/email/name/profile data, credentials or session contents.
No new production API key or broader permission is requested now.

## B. Running authentication provider and immutable release

1. Open **Publishing** for this project. Inspect the currently successful
   deployed release, not the Run/Preview environment and not a new publish.
2. Record the published hostname, deployment/release identifier and date;
   include the source commit only if actually displayed. If absent, report
   “not shown” rather than substituting the current workspace commit.
3. Open **Adjust settings → Production app secrets** only to inspect existing
   names and non-secret selector values. Do not add, edit, reveal/copy managed
   keys or click Save/Republish. Note whether `QXLAYER_AUTH_PROVIDER` and
   `QXLAYER_EXTERNAL_ENVIRONMENT` are present or absent. Do not assume absent
   selectors imply a provider without the actual deployed source/defaults.
4. If an already authorized Production browser tab is available, inspect
   **Developer Tools → Network** without changing account/profile/security
   settings. Note only authentication request **host, pathname, status and
   visible non-secret provider/instance identifier** from successful existing
   requests. Strip query strings; never copy headers, cookies, tokens, bodies,
   HAR files or “Copy as cURL”.
5. If the tab is unavailable, requests are only 403, or the UI requires a new
   login/gate unlock, report “runtime provider evidence blocked”. Do not create
   a user, reset a password/factor, unlock protection, inject cookies, add a
   diagnostic endpoint or Republish just to obtain evidence.

Needed proof is a successful Production authentication/session readback pinned
to the actual provider/issuer and immutable deployed release. Merely loading
Clerk JavaScript, seeing a cookie name, viewing a directory or finding stored
credentials is not sufficient. Editable pending deployment settings are
configuration evidence, not an attestation of an already-running release.

## C. Actual deployed business database binding

1. Open Replit's **Database** tool and select **Production**. View its
   **Connection details** without running a query, edit, import or restore.
2. Note only the non-secret database identifier/hostname and database name if
   the UI exposes them separately. Never copy a connection string/password.
3. In Publishing's existing Production configuration, note the non-secret
   `QXLAYER_DATABASE_PROVIDER` selector if present. Do not edit it.
4. If the actual deployed `DATABASE_URL` binding can be inspected privately,
   compare only its hostname/database with the Production database identity.
   Do not transmit the URL, username, password or query parameters. Report
   “binding matches managed Production”, “different target”, or “cannot inspect”.
   A secret-name existence check alone does not establish the binding.
5. Record which deployed release the binding applies to. If the UI shows only
   pending settings or cannot attest the live binding, keep this evidence
   unresolved. Do not modify runtime configuration or switch database providers.

The completed read-only inventory is the managed Production database baseline.
Do not rerun it or assume an external database is identical. A different target
requires a separate read-only inventory of that target, never a silent database
relocation.

## Isolated Supabase draft — no settings to paste or apply

`deploy/production-auth-preparation.json` is a passive plan, not an environment
file, provisioning input or activation command. Proposed Production secret names
are **not supported by the current runtime**. Existing code deliberately refuses
Production Supabase activation; the release hold remains intact.

Prepared boundaries:

- New Production-only Auth project reference remains **unset**. It must differ
  from Development `nktstksmfpcsjnjbeqsk` and Staging `muvedavhbpgpdrrnjrih`.
  No project is created or inspected by this draft.
- Keep the verified existing business database; confirm runtime binding first.
  Do not bundle business-data migration with authentication.
- Use the inventoried canonical HTTPS origin `https://www.quicklychan.xyz`.
  No preview, wildcard, localhost or Staging redirects. Exact future
  verification/recovery callbacks and alternate-host policy need a separate
  reviewed implementation; they are not configured now.
- Separate Production server key, session encryption key and scoped SMTP
  credential/custody. No copied Development/Staging/Clerk keys or browser tokens.
- Password/MFA/abuse rules, real mail delivery, secure HttpOnly cookies, origin/
  CSRF checks and trusted native MFA assurance require reviewed Production
  implementation and acceptance. No setting is inferred from a Development
  workaround or changed during this preparation.
- Preserve every canonical business ID and authorization record. Supabase's
  native UUID is an explicitly linked subject, not a replacement business ID.
  Never link by email, grant a substitute Owner or change locked/banned state.
- Keep the original Clerk credentials, MFA and previous release for rollback.
  Plan protected-administrator reauthentication in a bounded cutover, not a
  general customer-session bridge. Native sessions require native proof;
  recovery/pending-MFA sessions stay denied Admin/business access.
- A protected-administrator manifest, atomic/replay-safe exact-proof linking,
  supported additive schema diff, authenticated backup/isolated restore,
  rollback retaining new users/orders, native protected-administrator acceptance and
  security sign-off remain required before separate release approval.

## Offline checks and limits

Run only the local, read-only checklist:

    node scripts/release/check-production-auth-preparation.mjs

It reads the passive JSON only—no network, database, environment/secret reads,
provider operations or file writes. Exit 2 means evidence is still missing;
exit 1 means the draft violates a safety boundary. Even exit 0 means only
“references listed, not verified”; it never authorizes any action.

The checker rejects Development/Staging project reuse, non-Production directory
labels, mutation permissions, email matching, weakened preservation, invalid
counts and recognized credential/JWT values. Passing local validation does not
prove an artifact exists or that its native evidence is valid.

## Send this first

**The Owner-ID match is already confirmed. The next evidence is the actual
deployed release/provider and business-database binding (sections B/C), followed
by independent backup-copy/key-recovery custody. Do not send secret values,
connection URLs, session material or test-account exports.**

If that managed route is unavailable, send the exact access error instead.
This is the next evidence step, not approval for account migration, configuration
changes, provider provisioning or publishing.

Sources consulted:

- Replit Clerk Auth: https://docs.replit.com/features/auth-and-identity/clerk-auth
- Replit Publishing: https://docs.replit.com/features/publishing/overview
- Replit connection details: https://docs.replit.com/features/data-and-storage/connection-details
- Clerk migration/export documentation:
  https://clerk.com/docs/guides/development/migrating/overview
