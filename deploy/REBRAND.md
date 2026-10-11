# VYNOX LAYER rebrand

The official public name is **VYNOX LAYER**. Use the supplied master logo for
platform-owned surfaces. Tenant websites keep their own customer branding.

## Compatibility identifiers retained intentionally

These are not the public brand and must not be globally search-and-replaced:

- `QXLAYER_*` / `VITE_QXLAYER_*` environment variables and GitHub configuration.
- `qxlayer_auth`, existing tables, columns, database roles, IDs and identity links.
- Auth cookies, signing/encryption contexts, storage namespaces and backup formats.
- API endpoints, domain-routing proofs, health headers and access-gate paths.
- GitHub repository `quickXchange/QXLayer`, branch/environment `qxlayer-staging`.
- Vercel project `qxlayer-staging` and all project/team/deployment IDs.
- Render service names and existing `qxlayer-api.onrender.com` origin.
- Supabase project references, database hosts, bucket names and credentials.

Infrastructure names above require a coordinated approval before renaming.
Repository renaming requires updating every clone/deploy reference; Vercel and
Render renaming can alter generated URLs and origin allowlists. No resources
should be replaced simply to change a display name.

## Scope

Development and the existing isolated Staging deployment may be rebranded.
Do not deploy to Production, change DNS/domains, rotate credentials, change
roles/tenant assignments, activate the Worker or change paid plans.
Existing authentication provider selection is retained during the brand release;
the project-owned authentication rollout is a separate operational change.

Email templates and sender display names use VYNOX LAYER without changing the
configured sender mailbox. Real verification/recovery delivery remains disabled
until an authorized provider and sender are configured.

Historical database records are preserved. New platform notifications use the
new brand; system-generated historical status messages may be rebranded only
at presentation, without rewriting audit records or customer-written content.

Previously enrolled authenticator entries can retain their original issuer label
inside the user's authenticator app. Their secrets and backup codes remain valid;
new enrollment uses VYNOX LAYER. Do not force MFA re-enrollment for a label change.

## Verification and remaining boundaries

The Staging application release is READY at
https://qxlayer-staging-318zjh6u6-vynox3.vercel.app.
Render serves the approved release and `/api/healthz` returns `{"status":"ok"}`.
Read-only Supabase verification confirmed 42 public tables, 84 policies,
FORCE RLS, least-privilege grants and the exact installed migration ledger.
Per-table record counts and deterministic content fingerprints were unchanged
between the final release baseline and readback. No Staging migration was run.
The inactive project-owned authentication migration remains unapplied while
Staging uses Clerk; readback permits only this explicitly bounded case.

Development verification covered the root build/typechecks, release and external
integration suites, isolated PostgreSQL/RLS rehearsal, project-owned auth flows,
and a real password-confirmed MFA setup followed by read-only Super Admin access
to orders, clients, tenants and plans. Desktop and mobile branding were checked.
Logout returned `/api/me` to 401; anonymous Admin navigation retains its existing
homepage redirect. The exact disposable administrator/auth fixture was removed.

Authenticated Staging browser verification is **not complete**: the existing
Vercel team SSO protection redirects visitors to `vercel.com` (HTTP 302), and
there is no existing automation-bypass credential. Direct Backend form attempts
cannot substitute for the same-origin Vercel private-access form. Do not disable
protection, fabricate identity claims, or change live authentication to test it.
An authorized Vercel session or separately approved protected automation path is
needed for the remaining check.

GitHub's description is rebranded. Repository/branch/environment names, Vercel
project `qxlayer-staging`, Render `qxlayer-api` / `qxlayer-health-worker` and its
existing API URL remain unchanged. Supabase project reference, schemas, roles,
storage identifiers and all compatibility keys are retained. External provider
application/email branding and real delivery have not been verified; the
application-owned email templates/display sender are rebranded. Production
publishing, DNS changes and an authentication-provider cutover were not performed.
