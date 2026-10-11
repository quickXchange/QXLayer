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
