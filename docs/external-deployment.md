# QXLayer external deployment preparation

## Scope and current boundary

Prepare permanent GitHub-based releases with:

- **Source:** `quickXchange/QXLayer`, already configured as this checkout's GitHub
  origin. The existing GitHub connection is installed; do not reinstall it.
- **Development:** Replit, with its existing database/storage/auth defaults.
- **Frontend candidate:** one Vercel project serving the console at `/` and the
  shared customer site at `/private-label-website/`.
- **API/background candidate:** Render native Node 24 API and one health worker.
- **External database candidate:** a dedicated Supabase PostgreSQL project.
- **External files:** a private Supabase Storage bucket, accessed by the API.

This is preparation, **not cutover**. No Production rows/files/users have been
transferred, no target has been provisioned, no changes have been pushed by this
work, and no live domain has been attached to an external host. The existing
Replit Production website/database remain unchanged. QuickXchange stays untouched.
Financial operations remain Sandbox. The existing native Replit release guard
remains in place; external SQL is never fed into native publishing or app startup.

## Architecture and compatibility

The application is a pnpm monorepo with Express 5, PostgreSQL/Drizzle and two
React/Vite frontends. Use Node 24 and the pinned pnpm version in package.json.
There is no application WebSocket server or socket.io journey in the inspected
API source. The only scheduled runtime job is opt-in provider health monitoring:
it can update health/audit metadata but does not execute financial transactions.

Plain Vercel static hosting is **not sufficient**: it would bypass Private Access.
The prepared Build Output API package includes a Node frontend handler running
the existing gate before serving either SPA. There is no separately public
index.html bypass. Missing assets return 404; deep links select the correct SPA.
Function-served assets are checked against a conservative 4-MiB response budget.
The existing gate fonts/logos/design are packaged unchanged.

Vercel routing sends `/api/*` directly to the configured Render HTTPS origin.
This keeps browser requests/cookies same-origin and keeps 8-MB uploads out of a
Vercel Node function. Access-code POSTs go to the single Render API's existing
bounded limiter; both gates must have the same access code. Origin checking in
external API mode uses the approved platform origin, not visitor-forwarded hosts.
Clerk uses a fixed approved proxy URL and authorized-party allowlist.

API instances do not run the monitor in external mode. The separate worker is
disabled by default; enabling it requires explicit authorization. An enabled
worker holds a session advisory lock, exits if its lease is lost, and drains its
current cycle before releasing the lock on shutdown. Keep API and worker at one
instance for the initial candidate. Scaling the API requires a reviewed shared
rate limiter; this preparation does not claim distributed rate limiting.

**Cloud compatibility is not yet proven.** Required candidate checks include
rewrite Host/forwarded-host behavior, cookies/Set-Cookie, Clerk proxy/login, real
8-MB uploads, function startup, verified tenant domains and file ownership.
If the candidate cannot preserve these behaviors, do not cut over.

## Database, RLS and migrations

`deploy/migrations/` contains schema-only, versioned source:

1. `0001_application_schema.sql`: actual current Development schema, including
   columns, defaults, keys, checks, indexes, sequence and complete policy bodies.
2. `0002_runtime_security.sql`: restricted external roles and explicit grants;
   all application tables ENABLE/FORCE RLS.
3. `manifest.json`: ordered immutable migration checksums.
4. `rls-reference.json` and `schema-reference.json`: exact readback expectations,
   with no customer records, credentials or Production data.

The schema currently contains 42 application tables and 84 policies. This is a
Development schema baseline, **not a Production backup**. Earlier Production
inspection is historical reference; final transfer must capture the actual
Production primary and review source/target schema differences.

External requests connect as **qxlayer_app** (NOINHERIT, not superuser, no
BYPASSRLS) and SET LOCAL ROLE **qxlayer_runtime** inside each transaction. The
transaction role does not own tables, cannot create public objects, and has only
table SELECT/INSERT/UPDATE/DELETE and sequence USAGE/SELECT. Both roles are
initially NOLOGIN in bootstrap. An operator later activates only qxlayer_app,
sets its password securely, and supplies that restricted URL to Render.
On the approved target, use a verified TLS `psql` session and `\password qxlayer_app`
so the password is not embedded in SQL files/history; then execute
`ALTER ROLE qxlayer_app LOGIN;`. Never activate qxlayer_runtime or use a generated
Development password.

The application retains all Clerk principal/membership/ownership checks and
transaction-local RLS settings. External mode requires a pinned direct/session
Supabase endpoint, verified CA TLS, and bounded pools. Unknown providers, missing
security configuration and elevated login memberships fail closed. Migration
credentials are never app credentials. Neither the browser nor Supabase's Data
API receives application-table privileges.

The operator runner requires explicit approval, project/host pinning and a
separate migration credential. It refuses Replit, unknown projects, transaction
pooling and altered checksums; uses a migration lock and transaction; and records
versions in a private migration schema. Bootstrap requires an empty application
schema. Future migrations are reviewed additive SQL versions, not bootstrap reruns.
No migration, seed, login activation or data import runs at API/frontend startup.

Readback compares actual columns/defaults, constraints/CHECKs, indexes,
RLS/FORCE, all policy predicates/commands/role targets, ownership and privileges.
A checksum ledger or an empty schema diff alone is not acceptance.

## Exact accounts and connections needed

### 1. GitHub — existing account/connection

Use `quickXchange/QXLayer`. Push the prepared source only when authorized.
Enable Actions and branch protection, require **External preparation checks**,
and create protected environments `qxlayer-staging` and `qxlayer-production`.
Require approval/reviewers for Production and restrict its release branch.
Keep the repository variable `QXLAYER_EXTERNAL_RELEASES_ENABLED` absent/false
until an isolated external target has been approved. Automatic cloud deploys
must be disabled so that migration/readback failure cannot release new code.

### 2. Supabase — organization and isolated staging project

Create an empty dedicated staging project first, in a region compatible with
Render. Record its project reference, PostgreSQL major version (16 or newer),
region, exact direct or **session-mode** pooler host and verified root certificate.
Use Supabase's displayed Connect details; do not guess the pooler hostname.
Migration/runtime mode starts on port 5432, not transaction pooling on 6543.

Required secure connections:

| Use | Role and destination |
|---|---|
| Approved schema job | `postgres`, direct host or session pooler, database `postgres` |
| Render API/worker | `qxlayer_app`, same pinned project, direct/session connection |
| Storage API only | Project URL and server-only Storage service-role credential |

Connection templates, **not real credentials**:

```text
postgresql://postgres:<encoded-password>@db.<project-ref>.supabase.co:5432/postgres
postgresql://postgres.<project-ref>:<encoded-password>@<exact-session-pooler-host>:5432/postgres
postgresql://qxlayer_app.<project-ref>:<encoded-password>@<exact-session-pooler-host>:5432/postgres
```

Disable the **Data API** before application data is imported. Keep Supabase Auth
out of the application's sign-in flow. Do not modify managed auth/storage/
realtime schemas. Create a **private**, not public, bucket via Storage's supported
API/dashboard. Preserve object keys, including branding/order documents and the
allowlisted visual artwork namespace. The storage adapter uses object APIs only,
never managed storage-table SQL. Its service credential stays backend-only.
Database and Storage must be the same pinned Supabase project.
Preserve the database's **logical object key** exactly: source objects physically
live under the Replit private-directory prefix; the Supabase adapter uses the
logical key inside its private bucket. Record/verify this prefix mapping during
the separately approved file-copy rehearsal, without rewriting database IDs/URLs.

After a successful empty-target rehearsal, create a separately approved
Production project with suitable backups/PITR. Do not reuse another app's project.

### 3. Render — account/team and GitHub repository connection

Connect the existing GitHub repository to your Render team. Review
`deploy/render.yaml`; choose a region near the selected Supabase project.
Importing a Blueprint may start a candidate build and incur hosting charges.
It does **not** migrate data. Startup remains disabled/fails closed until its
external configuration is approved.

Create the API web service and worker from the **repository root**, using the
Blueprint path `deploy/render.yaml`. Both build the existing API package.
Keep automatic deploys off and use the protected GitHub workflow.

Populate the `qxlayer-external` environment group securely using
`deploy/env/api.env.example`. Create `supabase-ca.crt` as a Render secret file on
**both** services at `/etc/secrets/supabase-ca.crt`. Secrets are not generated from
Development, printed, or committed. Preserve the original Production vault key
if copied encrypted provider envelopes need it; do not replace it.

Record the actual API `.onrender.com` origin and both Render service IDs. Create
a Render API credential for the protected release job, not for either browser.
Keep `QXLAYER_EXTERNAL_STARTUP_APPROVED=false` and health monitoring disabled
until target schema, identity, storage and configuration checks have passed.
Set startup approval true only on the explicitly approved candidate target.

### 4. Vercel — account/team and a new frontend project

Create a separate candidate frontend project; record its organization/project
IDs. Use Node 24. Do not attach `quicklychan.xyz`, `www.quicklychan.xyz` or existing
customer domains during preparation. Use a controlled candidate hostname.
Disable native Git auto-deployment; GitHub releases use the prepared package.

Build public settings and runtime secret names are separated in
`deploy/env/frontend.env.example`. Configure the gate code securely in Vercel,
matching Render. Configure the candidate platform URL/hosts, matching fixed
Clerk proxy URL and authorized parties. The frontend only gets the publishable
Clerk key; never DATABASE_URL, Clerk secret, vault key or Storage service key.

### 5. Clerk — retain the existing Production identity store

Management status was checked: **Replit-managed, dashboard access authorized**.
Replit documentation does not establish an approved off-platform retention/
transfer procedure for this existing tenant. This is a hard cutover prerequisite.

Obtain authorized access/configuration for the **same Production Clerk instance**
and test existing Owner/customer subjects on the candidate origin. Do not use
workspace Development keys as Production keys, create fresh replacement accounts,
infer Super Admin from email/signup order, or substitute Supabase Auth. If the
instance cannot be retained, stop before cutover and seek a separately approved
identity-preserving migration design. Unchanged passwords/sessions are not promised.

### Protected GitHub release settings

Set these only in the relevant approved environment; never paste values in chat:

| Kind | Names |
|---|---|
| Secure secrets | `MIGRATION_DATABASE_URL`, `DB_TLS_CA_PEM`, `RENDER_API_KEY`, `VERCEL_TOKEN` |
| Non-secret variables | `SUPABASE_PROJECT_REF`, `MIGRATION_EXPECTED_HOST`, `RENDER_API_SERVICE_ID`, `RENDER_WORKER_SERVICE_ID`, `QXLAYER_API_ORIGIN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `CLERK_PUBLISHABLE_KEY`, `CLERK_PROXY_PUBLIC_URL` |
| Repository-level enablement | `QXLAYER_EXTERNAL_RELEASES_ENABLED`, default false |

The manual workflow runs disposable checks, optionally applies approved schema
versions, requires exact database readback, deploys/awaits the exact Render commit,
then deploys the Vercel prebuilt package. It does not transfer records/files/users,
enable the worker, attach domains, alter DNS or retire the old environment.
Use separate Vercel/Render projects for staging and eventual Production.

## Preparation commands

From the repository root:

```sh
pnpm run typecheck
pnpm run external:test
pnpm --filter @workspace/api-server run build
pnpm run external:build:frontend   # requires public build settings
```

Disposable database rehearsal requires an isolated local PostgreSQL instance,
database `postgres`, and these explicit **test-only** settings:

```text
NODE_ENV=test
QXLAYER_MIGRATION_TEST=true
QXLAYER_EXTERNAL_MIGRATIONS_APPROVED=true
MIGRATION_DATABASE_URL=<disposable-local-connection>
```

Then run `pnpm run external:test:database`. Never use a shared local database:
the rehearsal creates only synthetic fixtures and expects an empty target.
GitHub CI supplies its own disposable instance and synthetic credentials.

For an explicitly approved external target only:

```sh
pnpm run external:migrate
node scripts/external-postgres/readback.mjs
```

These commands fail without approval/pinned external settings. Do not run them
against Replit or treat this document as permission for Production transfer.
Future releases append reviewed SQL plus checksums, update expected schema/RLS
readback, and rerun the isolated rehearsal. Never alter an applied migration.

## Preservation and final acceptance — separate later approval

Before any cutover, require:

1. Authorized consistent **Production-primary** snapshot, not Development fixtures
   or an assumed-current replica. Keep an encrypted independent backup.
2. Exact existing IDs, memberships, permanent Super Admin, customers, tenant
   configuration, history, timestamps, constraints and sequence state preserved.
   New fields use approved defaults, not guessed commercial prices/statuses.
3. Original-column row counts/fingerprints and every constraint validated after
   an approved import; no deletes/resets/ON CONFLICT silent skips to make it pass.
4. Actual private file bytes/keys/content types/checksums verified separately from
   database records. Public delivered branding remains distinct from private files.
5. Existing Production Clerk Owner/customer login proof, cross-tenant denial,
   provisioning/delivery/suspension/reactivation and private upload/download proof.
6. Same-origin frontend/API cookies, deep links, 8-MB uploads, Clerk proxy, verified
   customer hosts/TLS and signed Telegram callbacks exercised on real hosts.
7. Announced source write freeze, exactly one writer/worker, final approved snapshot
   and explicit user approval **before** Production routing or DNS changes.

Do not disable the current site or overwrite either database. After target
business writes, the old database is stale: switching back requires separately
approved reconciliation, not a blind DNS rollback.

## Evidence boundaries

Local tests validate the prepared SQL and restricted-role behavior on PostgreSQL,
not Supabase's cloud privileges/SSL/pooler or Vercel/Render transport. Real target
acceptance remains blocked on the accounts/connections above. Neither schema-only
capture nor successful builds prove customer-data preservation or existing login.

Provider references:
- https://render.com/docs/blueprint-spec
- https://api-docs.render.com/reference/create-deploy
- https://vercel.com/docs/build-output-api/v3/configuration
- https://vercel.com/docs/build-output-api/v3/primitives
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/database/postgres/roles
