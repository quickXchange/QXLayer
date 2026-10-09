# QXLayer: Supabase / Vercel migration and deployment plan

> **CANCELLED — historical reference only.**
> The user cancelled Supabase, Vercel and Render migration plans.
> Keep QXLayer entirely on Replit with its existing Production PostgreSQL.
> Do not execute this plan or its generated SQL. Preparation commands below
> are historical and have been removed. No external cutover occurred.

## 1. Decision and execution boundary

The user authorizes preparing an external Supabase PostgreSQL migration, Vercel
frontend hosting and a compatible API/worker backend. **No Production database
cutover, DNS change, authentication replacement or destructive source operation
is authorized by this preparation.** The existing Replit Production database and
deployment remain available. No application code, keys or hosting configuration
have been switched.

Recommended backend: **Render**, with an always-on Node API web service and one
background health-monitor worker, in a region close to Supabase. Render is a
recommendation, not a newly provisioned service or billing commitment.

Financial execution remains Sandbox. This move does not enable real wallets,
payments, trades or providers.

## 2. Verified current state and prepared artifacts

Read-only Production inspection found PostgreSQL 16.15, 40 public application
tables, 139 constraints, one request-number sequence and 278 rows at capture.
These counts are a point-in-time inventory, not a backup or preservation proof.
The read-only Production inspection uses Replit's replica. Final export and
preservation acceptance must use the frozen primary's consistent snapshot, not
assume the replica inventory is fully current.
The current application defines 42 tables, adding integrations and Telegram receipts.
The managed native publishing preview omits RLS predicates and grants; it is
not used as an external migration source.

Prepared, without connecting to a target:

- `reports/supabase-migration/source-inventory.json`: actual Production
  table/column/default/constraint/sequence metadata and table counts.
- `generated-artifacts/supabase/schema-bootstrap.sql`: guarded, transactional
  full schema, keys, constraints, indexes and complete RLS predicates. The raw
  Drizzle SQL under `bootstrap/` is review input, not the execution entrypoint.
- `generated-artifacts/supabase/security-bootstrap.sql`: Supabase-only guarded
  role/grant/policy bootstrap; 84 explicit policies for 42 tables.
- `reports/supabase-migration/security-manifest.json`: exact predicate/column scope
  and security SQL digest.
- `reports/supabase-migration/preparation-validation.json`: machine-checked table
  and column coverage, predicate/grant presence, credential/destruction guards and
  generated SQL hashes.

Generated SQL is ignored by Git and Replit deployment packaging. Regenerate it
from reviewed source; the checked digests identify the reviewed output.
This is **static preparation validation**, not PostgreSQL execution, data import,
Supabase compatibility acceptance or Live verification.

Regeneration from the repository root:

```sh
pnpm --filter @workspace/api-server exec tsx ../../lib/db/src/prepare-supabase-security.ts
pnpm --filter @workspace/db exec drizzle-kit generate --dialect=postgresql \
  --schema=./src/schema/index.ts --out=../../generated-artifacts/supabase/bootstrap \
  --name=qxlayer-bootstrap
node scripts/external-postgres/validate-preparation.mjs
```

## 3. Exact Supabase setup

1. Create an organization/project you control in the Supabase Dashboard.
2. Create an isolated rehearsal project, such as `qxlayer-migration-staging`.
   Use a separate empty Production project for the final approved import, not
   a shared project holding another application's public tables.
3. Choose a region matching the backend where possible. Record its **project
   reference, region and PostgreSQL major version**. Target version must be at
   least 16; pin dump/restore client versions compatible with source and target.
4. Choose a strong administrator password and store it only in your password
   manager/secret store. Do not put passwords or connection strings into chat,
   the repository, generated SQL or reports.
5. In project **Connect**, copy the **Direct connection** and **Session pooler**
   details. Do not construct the pooler hostname from the region.
6. Download the database SSL root certificate from the database connection/SSL
   settings. Use verified TLS; do not disable certificate verification.
7. In **Project Settings → Data API**, disable the Data API for this backend-only
   database design. QXLayer continues to access PostgreSQL through its API, not
   browser-to-table REST calls. If the dashboard version differs, locate the
   Data API settings and keep it disabled before any import.
8. Do not enable Supabase Auth as a replacement for Clerk. Do not import into or
   modify Supabase-managed `auth`, `storage`, `realtime` or extension schemas.
9. Select appropriate Production backups/PITR for the chosen plan before final
   import; independently retain an encrypted source backup outside the repository.

### Required connection details

| Purpose | Details to record | Where |
|---|---|---|
| Source export | Verified Replit **Production**, never Development, PostgreSQL host/port/database/user, TLS CA and authorized read/export credential | Current Production database connection settings; provide only through secure secrets |
| Supabase migration | Direct host `db.<PROJECT_REF>.supabase.co`, port 5432, database `postgres`, administrator `postgres`, password and CA | Supabase Connect → Direct connection |
| IPv4 migration alternative | Exact session-pooler host, port 5432, database `postgres`, user `postgres.<PROJECT_REF>` | Supabase Connect → Session pooler |
| Backend runtime | Same supported host/port, database `postgres`, restricted user `qxlayer_app` direct or `qxlayer_app.<PROJECT_REF>` through the shared pooler | Created after role bootstrap; password set securely |
| Destination identity | Staging and Production project references, region and version, recorded separately | Supabase project settings |

Connection **shapes only**, not runnable credentials:

```text
postgresql://postgres:<ENCODED_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres
postgresql://postgres.<PROJECT_REF>:<ENCODED_PASSWORD>@<EXACT_POOLER_HOST>:5432/postgres
postgresql://qxlayer_app.<PROJECT_REF>:<ENCODED_PASSWORD>@<EXACT_POOLER_HOST>:5432/postgres
```

Use direct connections for migrations when reachable; direct commonly requires
IPv6 or the IPv4 add-on. Session mode on 5432 is the documented IPv4 alternative.
**Do not use transaction pooling on 6543 for the initial dump/restore or migration
runner.** Runtime starts with direct/session mode and a deliberately sized Node
pool. Transaction-mode compatibility is a later separately tested optimization.
The TLS connection options/CA path are deployment-specific and must be verified
by a real connection before acceptance; the shapes above are not TLS configuration.

## 4. Roles, policies and permissions

- `postgres`: separate Supabase migration administrator; never the API credential.
- `qxlayer_app`: non-superuser, non-BYPASSRLS, non-creating, NOINHERIT connection
  role, initially **NOLOGIN** and without a password in generated SQL.
- `qxlayer_runtime`: non-login, non-superuser, non-BYPASSRLS transaction role,
  with only schema USAGE, application-table SELECT/INSERT/UPDATE/DELETE and
  application-sequence USAGE/SELECT.
- `qxlayer_app` can SET ROLE to `qxlayer_runtime`, but does not inherit it and
  must not be a member of `postgres`, database-owner or all-data privileged roles.
- Application tables remain owned by the migration administrator, not either
  runtime role. Both read and write predicates are copied from `rowPolicies`;
  every write policy contains both USING and WITH CHECK. Enable and FORCE RLS.
- Revoke imported application-table access from PUBLIC and the Supabase API
  roles `anon`, `authenticated`, `service_role`. Do not put service-role keys
  in the frontend or use them for PostgreSQL application access.
- Do not broadly grant TRUNCATE, CREATE, ownership, BYPASSRLS, all-schema or
  all-data roles. Grants are limited to the application manifest.

The bootstrap checks for Supabase's managed role and database, demands an explicit
authorization setting and rejects pre-existing QXLayer roles. It cannot be used
as a future upgrade script without a separately reviewed versioned migration.
The migration runner must additionally pin the target project/host; SQL metadata
checks alone cannot distinguish two different Supabase projects.

After plan approval, a migration operator uses a secure TLS `psql` session or
Supabase **SQL Editor**, selects the approved rehearsal project and verifies
database/role/project identity before executing approved SQL. No SQL is to be
run on Replit Production. This SQL Editor authorization statement is required
before the security bootstrap, inside the same session:

```sql
SET qxlayer.external_migration_authorized = 'yes';
```

The generated guard intentionally rejects both known Replit databases.
Runtime login activation is a later gated setup step: use TLS `psql`'s
`\password qxlayer_app` to avoid passwords in SQL files/history, then activate
LOGIN only on the approved target after the credential is securely stored.
Do not enable the API before all migration validations pass.

## 5. Preservation-first transfer sequence

### Rehearsal

1. Verify source Production identity, destination Supabase project identity,
   server/client versions, administrative capabilities and an empty QXLayer target.
   Capture source schema and constraints; refuse unreviewed types, defaults,
   extensions, collisions or objects outside the approved manifest.
2. Export a consistent, read-only **Production** backup/data archive. Never use
   Development fixtures, demo accounts, Development catalogs or Development keys
   as Production data. Store archives encrypted and outside Git/deployment output.
3. Create the reviewed current schema on the empty target. Schema bootstrap
   contains RLS enablement; check that the importing administrator can safely
   restore data before FORCE RLS is applied. If not, revise the reviewed import
   procedure on the isolated target rather than bypass runtime protections.
4. Import the original columns of all 40 tables, with original IDs, relationships,
   timestamps, memberships, Super Admin flags, configuration, orders, invoices,
   attachments and encrypted bytes. The two new tables start empty.
   Preserve sequence state (`last_value` and `is_called`), not just MAX(order_number).
5. Use an allowlisted PostgreSQL data archive with no ownership/ACL restoration.
   Review restore contents to exclude managed schemas and other applications.
   No `--clean`, blanket DROP, TRUNCATE, ON CONFLICT ignore or silent row skipping.
   The target must remain empty until its first approved import.
6. New fields take reviewed defaults only. Compare old columns using the same
   canonical JSON/multiset fingerprint algorithm on both databases; verify new
   defaults separately. Do not accept full-row hash differences as proof of
   deletion, or rewrite business data to force a match.
   The preservation digest is `md5(coalesce(string_agg(row_hash, '' ORDER BY
   row_hash), ''))`, where each `row_hash` is `md5(to_jsonb(projected_original_row)
   ::text)` using the original column set/types on both databases. Record that
   column projection and algorithm with each snapshot. Compare row counts,
   identifiers, types and sequence state separately; a digest alone is not
   complete acceptance.
7. Validate every target PK, FK, unique and CHECK constraint against imported
   records. The newer delivery CHECK must allow legitimate pre-delivery tenant
   links. A migration must not delete records or alter statuses to satisfy it.
8. Apply the complete Supabase role/grant/RLS bootstrap and inspect exact
   `pg_get_expr` predicates, targets, commands, FORCE flags, ownership, role
   memberships and each CRUD privilege separately. Verify sequence privileges.
9. Transfer files and preserve/verify authentication identities as below.
10. Run isolated API, browser and actual-runtime SQL tests; clean only manifest-
    recorded disposable fixtures. Preserve the source and encrypted backups.

### Final import / controlled cutover

1. After rehearsal and explicit user approval, establish an announced write
   freeze on the old API and workers. Block mutations, new requests/orders,
   configuration edits and signup-related provisioning. Return retryable errors
   for Telegram callbacks; do not acknowledge and discard updates.
2. Stop old background mutations and verify there is no alternate writable entry
   through the old `.replit.app` hostname or direct API. A frontend banner alone
   is not a freeze.
3. Take the final consistent Production snapshot, import to the approved clean
   Production Supabase project and repeat schema/data/identity/file checks.
4. Start the candidate backend and frontend in controlled read-only/maintenance
   mode. Verify Owner and existing customer access without customer mutations.
5. Only after all gates pass and the user approves, change Production routing/DNS.
   Keep the old environment available but **not writable**. Ensure exactly one
   Production writer and one worker owner.
6. Confirm custom tenant domains, TLS, www/apex handling, cookies, Clerk callbacks,
   public delivered-site paths, private Admin routes and signed Telegram callbacks.
   Then enable target writes and workers in a controlled sequence.

## 6. Authentication and uploaded files

**Authentication:** Clerk management status is Replit-managed with authorized
dashboard access. PostgreSQL stores Clerk identity references, not the Clerk user
store or passwords. A database copy cannot preserve sign-in by itself.

Preferred path: retain the same **Production Clerk instance and user IDs**, with
authorized external-host/domain/proxy setup and securely supplied Production
keys. Replit documentation does not establish a guaranteed off-platform transfer
procedure, so provider confirmation and staging login proof are required.
Do not assume that workspace test keys are Production keys or that moving the
database transfers the Clerk tenant.

If that instance cannot be retained/transferred, do not cut over. Prepare a
separately approved Clerk-user migration with a verified one-to-one identity
mapping, including users not yet referenced by database records. Never grant
Super Admin by email, first signup or an unverified identity match. Keep existing
record identity references and history intact; transparently map a verified new
subject only if the user approves that design. Password/MFA/SSO/session continuity
must be assessed with the provider; do not promise unchanged passwords or sessions.
Replacing Clerk with Supabase Auth is not authorized.

**Files:** Replit App Storage is not a portable Render credential provider.
Inventory Production objects referenced by branding, requests and attachments,
including their bytes, keys, content types, ACL metadata and checksums. Copy to
Supabase Storage private buckets using its supported file API; do not manipulate
the managed storage tables. Preserve old keys/URLs through the backend adapter
where practical. Validate private download/upload authorization with Clerk and
tenant ownership; public delivered branding is a separate read-only rule.
Database fingerprints do not prove object bytes were copied.

## 7. Hosting and portability implementation

### Vercel

- One frontend project from the monorepo, using the repository's pinned pnpm
  version. Build console at `/` and tenant website at `/private-label-website/`.
- Merge both static outputs into one publish directory, with the website output
  under `private-label-website`. Preserve Vite base paths and shared API helpers.
- Route `/api/*` and existing storage/download routes to the Render backend
  before static/SPA fallbacks; inventory the exact storage route patterns while
  implementing the adapter. Preserve methods, queries, auth headers and cookies.
- Serve real static assets before website/console SPA fallbacks. Deep links must
  load the correct app; missing JS/CSS must not receive index HTML.
- Port the separate pre-launch Production access gate to Vercel routing middleware
  with supported cryptography and server-only secrets. Static hosting alone does
  not execute the current Node `serve.mjs` gate. Preserve delivered-only access,
  custom-host tenant binding and protected platform/Admin routes.
- Verify tenant-owned domains individually in Vercel and recreate their TLS
  routing only after domain-owner validation; a database domain row does not
  configure external hosting automatically.

### Render API and worker

- Native Node 24 build from the same monorepo commit; always-on web service.
  Build current TypeScript/esbuild output, bind Render's PORT on all interfaces,
  and use `/api/healthz` for liveness without private diagnostics.
- Port `withDatabase`: replace the hard-coded `pg_database_owner` selection with
  an allowlisted external mode selecting `qxlayer_runtime`. Keep the Replit
  Development mode unchanged. Validate session and effective role, memberships,
  non-bypass status, policy/grant metadata and transaction-local context.
- Configure verified TLS, a bounded pool and graceful shutdown. Check connection
  limits for API + worker + migration connections before launch.
- Move the health monitor from automatic API startup to an explicit worker
  entrypoint; disable it in API replicas. Use one worker initially, database
  coordination for duplicates, bounded retries and graceful shutdown.
- Keep real provider/network activity off until the environment is verified and
  the customer has supplied/authorized its credentials. This is not financial
  execution, and no new crypto engine is part of migration.
- Replace App Storage's Replit-specific access with the authorized private
  Supabase Storage adapter. Port Clerk proxy/domain setup based on provider proof.
- Validate trusted proxy headers, origin/CSRF rules and authorized parties for
  Vercel, direct backend access and verified tenant hosts.

These portability patches are planned work, not claimed as already deployed.

### Environment and secure configuration checklist

| Variable/detail | Destination and handling |
|---|---|
| `DATABASE_URL` | API/worker only: restricted Supabase login, never frontend/admin URL |
| Migration DB credential | Protected migration job only; separate from runtime; never app startup |
| TLS CA / certificate path | Migration executor and Render secret file |
| External runtime mode/role | Explicit allowlisted role selection, implemented/tested before target API runs |
| `CLERK_SECRET_KEY` | Backend only, correct retained/migrated Production instance |
| Clerk publishable key | Frontend and matching backend; environment-specific, not a credential |
| `SESSION_SECRET`, `PRODUCTION_ACCESS_CODE` | Preserve relevant Production values securely, not Development values |
| `PROVIDER_VAULT_KEY_V1` if configured | Preserve original key for copied ciphertext; do not regenerate to make health pass |
| Supabase project URL and private storage bucket | Backend storage adapter |
| Supabase Storage service credential | Backend secret only, storage calls only; never frontend or PostgreSQL runtime |
| Platform URL/hosts, trusted origins | Preserve verified canonical hostname; add controlled staging hosts |
| Monitor enablement and write-freeze flags | Explicit API/worker controls, tested on old and target environments |

Copy secrets directly into the destination host's secret settings or the secure
workspace secrets flow. Neither report nor generated SQL contains secret values.

## 8. Future releases

External PostgreSQL uses a **versioned, explicitly approved migration job**;
Replit's native diff is not the target migration engine.

1. Generate/review ordered schema and security migrations from the same commit.
2. Test them on an isolated clone, including policy semantics and least privilege.
3. Obtain Production environment approval. Use separate admin credentials and a
   pinned Supabase project. Record version/checksum in a private migration ledger
   outside exposed application schemas; reject changed checksums or concurrent runs.
4. Execute once with a migration lock and bounded timeouts. Prefer transactional,
   additive expand/contract changes; deploy-compatible changes before new code.
5. Verify schema, grants, policy predicates and preservation readbacks; deploy API,
   worker and frontends from the reviewed commit only after migration success.
6. Validate Live and record acceptance. Future table/sequence additions must include
   classification, explicit grants and exact RLS predicates in the same migration.

No DDL is added to application startup or frontend build commands. The current
Replit deployment configuration and its unsafe-plan hold remain unchanged.
Do not blindly reuse bootstrap on a populated target.

## 9. Acceptance and rollback

Required evidence before cutover:

- Exact original-column counts/fingerprints, unchanged IDs and Super Admin/
  membership/configuration sets, sequence state and valid target constraints.
- Actual `qxlayer_app` connection → `qxlayer_runtime` transaction: no superuser,
  BYPASSRLS, ownership or elevated role membership.
- Cross-tenant unscoped reads hidden; wrong-tenant inserts denied; updates/deletes
  affect no foreign rows; same-tenant legitimate operations succeed.
- Existing Production Owner and customers sign in with the intended identities.
  A new signup never gains administrator access.
- Disposable request approval provisions an isolated tenant and same-account Admin;
  suspension blocks site/new orders/customer Admin while authorized Super Admin
  can service existing Sandbox orders; reactivation restores access.
- Delivered site/Mini branding, optional disabled-channel unavailable state,
  custom-domain separation, private Admin and private tracking-token rejection.
- Telegram missing/wrong/cross-tenant proofs denied, duplicates handled, suspended
  channels blocked. Synthetic tests precede actual bot registration/readback.
- All referenced files and private/public access rules verified.
- Vercel/Render health, origins, cookies, deep links, worker ownership, TLS,
  certificate validation and bounded DB pools verified.

Before target business writes, rollback means reverting routing and lifting the
old write freeze only after confirming target writes did not occur.
After target business writes, the old DB is **not an up-to-date rollback copy**.
Freeze both sides, preserve the target delta and use a separately approved
reconciliation/forward-repair plan. Never switch back to stale data or overwrite
either database. Keep the old database and backups until explicit retirement.

## 10. Next approval/setup gate

Review this plan and provide the **non-secret** Supabase staging project reference,
region and selected backend. Credentials must use secure secret storage.
Resolve Clerk instance portability and source export access before the rehearsal.
The next stage implements portability and executes a staging rehearsal only;
Production cutover remains disabled until the resulting evidence is reviewed
and the user explicitly authorizes it.

## References

- Supabase migration: https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres
- Supabase connections: https://supabase.com/docs/guides/database/connecting-to-postgres
- Render workers: https://render.com/docs/background-workers
- Vercel monorepos: https://vercel.com/docs/monorepos
- Replit Clerk: https://docs.replit.com/features/auth-and-identity/clerk-auth
- Replit App Storage: https://docs.replit.com/features/data-and-storage/object-storage
