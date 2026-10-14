# Production progressive Auth migration: manual evidence and inert preparation

## Current boundary

Reuse the completed Production schema inventory and Development 42-account
audit; do not rerun them. The safest progressive strategy is selected for
preparation, not approved for execution. Production/Staging data, configurations,
accounts, credentials and sessions remain unchanged. Do not create a project,
rotate/revoke Clerk keys, enable Supabase, change DNS, run an import or Republish.

The three missing proofs below must be collected independently. They are not
interchangeable: a Users page identifies a directory, not the app's running
provider; a Database page identifies a database, not the app's effective target.

## A. Production Clerk directory — first user action

**Count step completed by the user:** 2 users observed in Replit Cloud →
Users & Auth → Production. Do not ask for the count again. The next input is
the **native user ID from each of those two existing records**, not an email,
new key or raw export. The original count-collection steps below are retained
as reference; proceed directly to existing user details.

1. Open this VYNOX LAYER project in Replit, then open **Auth**.
2. Select **Production** in its environment selector. Do not use Development
   or create/connect a new Clerk application.
3. Open the **Users** view. Record the displayed Production total, including any
   separate filtered/total distinction. Clear only list filters if necessary,
   not account status. If no total is displayed, report “total not displayed”;
   do not infer a total from one page.
4. If the pane lacks the required details, use Replit's authorized managed
   **Production Clerk dashboard** access. Verify Production in that dashboard,
   then open **Users**. Replit management readback currently allows this route.
   Do not sign up for an unrelated external Clerk application.
5. Send only: selected environment, total user count, and the non-secret
   application/instance identifier if visibly available. A cropped screenshot
   is acceptable only after hiding emails, names, avatars and user rows.
6. If the route is unavailable, report the exact unavailable control/error.
   Do not change permissions, keys, pricing, provider settings or access controls
   to make it work.

This establishes environment/count evidence only. Complete directory
reconciliation subsequently requires the full Production native-ID roster,
all pages and blocked/locked/method/MFA status, tied to the same instance and
capture date. IDs are retained in protected evidence, not public reports.
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
- Keep valid Clerk sessions/credentials during the progressive transition.
  Native sessions require native proof; recovery/pending-MFA sessions stay
  denied Admin/business access. No old session replay or bulk logout.
- A complete Production roster, atomic/replay-safe exact-proof linking,
  supported additive schema diff, authenticated backup/isolated restore,
  rollback retaining new users/orders, native Owner/customer acceptance and
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

**The user has already confirmed 2 Production users. Open each of those existing
records in Cloud → Users & Auth → Production and copy only its native User ID.
Send the two IDs, not emails, passwords, keys, tokens, cookie/connection values
or a raw export. Do not edit either record.**

If that managed route is unavailable, send the exact access error instead.
This is the next evidence step, not approval for account migration, configuration
changes, provider provisioning or publishing.

Sources consulted:

- Replit Clerk Auth: https://docs.replit.com/features/auth-and-identity/clerk-auth
- Replit Publishing: https://docs.replit.com/features/publishing/overview
- Replit connection details: https://docs.replit.com/features/data-and-storage/connection-details
- Clerk migration/export documentation:
  https://clerk.com/docs/guides/development/migrating/overview
