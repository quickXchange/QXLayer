# QXLayer provisioning constraint investigation

**Status: implemented in Development; exact native Production migration detected.
Production application requires the user's Publish action.**

The corrected schema has been applied in Development using the project's
`pnpm --filter @workspace/db run push` command. No Production writes, Republish,
NovaX design changes or live provider connections were performed by the agent.
Disposable Development identities/records are used for browser verification;
existing owner/customer records and the retained Asterlane fixture stay protected.

## Exact incompatibility

Table: `public.white_label_requests`

Legacy Production constraint: `white_label_request_delivery`.
Corrected constraint: `white_label_request_delivery_requires_tenant`.

Production currently has a validated, non-deferrable CHECK:

```sql
CHECK ((status = 'delivered') = (tenant_id IS NOT NULL))
```

The required predicate, already present in Development and its Drizzle schema:

```sql
CHECK (status <> 'delivered' OR tenant_id IS NOT NULL)
```

These are not equivalent. The first prohibits tenant linkage at all
pre-delivery statuses. The second still prohibits delivered orders without a
tenant, but permits preparing and retaining a tenant during the existing
approval/setup workflow. No table, column, key, record, account or permission
needs to be replaced.

## Affected existing application flow

- `artifacts/api-server/src/modules/customer/service.ts`, `reviewRequest`:
  Super Admin review locks the order, checks its transition and pricing,
  prepares a draft tenant, assigns the reviewed plan/add-ons, applies branding,
  then sets `tenant_id` and `in_setup` or `customization` in the same transaction.
  The last update fails under Production's current CHECK. The transaction
  rolls back tenant preparation, branding, assignments and order changes.
- `artifacts/api-server/src/modules/tenants/service.ts`, `activateTenant`:
  existing readiness/entitlement checks activate the configured sandbox and
  invoke the existing guarded delivery service.
- `deliverLinkedRequest`: validates active/configured Exchange, pricing,
  reviewed plan/add-ons, ownership and actions before assigning the existing
  customer's membership and marking the order delivered. Custom designs still
  require an explicit Ready review.
- Existing customer membership resolution, Admin Panel access and public
  website guards deny pre-delivery access. Private preview remains Super Admin
  only. None of these guards are changed by the proposed CHECK correction.

## Supported migration — prepared for native Publish

The migration replaces only the legacy CHECK with the corrected, validated
CHECK under a distinct descriptive name. A Development-only rename probe
proved that the native publishing detector recognizes changed CHECK names but
does not recognize changed expressions under the same name. The Drizzle source
now uses the distinct name and the supported Development push has applied it.

`publish-plan.json` and `native-publish-review.json` contain the actual native
publishing diff. It consists of exactly two statements: drop the legacy CHECK
and add the corrected CHECK. There is no table/column removal, truncation or
structural data loss. The platform marks it potentially non-backwards-compatible;
review that warning and allow for a brief migration window.

Production must use Replit's supported managed publishing process, not a custom
Production DDL script, startup repair, deployment-build hook, credential
workaround or bootstrap endpoint. Saved statements are evidence, not a separate
SQL runner. Do not copy or overwrite Development data.

Deployment acceptance conditions:

1. Fresh read-only metadata confirms the exact old definition, or confirms the
   correct definition is already installed and no migration is needed.
2. The native publishing plan explicitly includes this CHECK replacement and
   no unrelated changes, table/column deletion, truncation or data overwrite.
3. The replacement and validation are transactional. A lock timeout or failed
   validation must abort rather than leave a missing/unvalidated CHECK.
4. Preserve all existing rows; compare protected record fingerprints and
   counts, including Super Admin and memberships. Keep FK, UNIQUE, status CHECK,
   roles, authorization and tenant isolation unchanged.
5. After application, inspect the actual named definition and validation flag,
   verify the owner account/access and test the authorized Live lifecycle
   before declaring the platform fixed.

The isolated rehearsal now replays the exact native replacement statements
inside its guarded transaction, with lock timeout, validation, definition
guards, data fingerprints and automatic rollback. It is hard-guarded to a
disposable private Unix-socket database and cannot run against Development or
Production. This validates the SQL and application semantics; it does not
independently prove the platform publisher's transaction implementation.

The existing read-only release preflight now validates the source-bound native
review snapshot. It rejects stale source evidence, the old empty-diff mismatch,
unexpected/duplicate/unvalidated CHECKs, wrong predicate/order, extra SQL and
destructive native diff fields. It never connects to or mutates a database.
This snapshot guard is not a live Production readback; the Publish UI's fresh
plan must still be reviewed at release time.

## Rollback protection

- **Before commit:** any failure rolls back both the CHECK replacement and
  validation. Existing records and the original CHECK remain intact. This was
  tested with an injected failure after validation and with lock contention.
- **After commit, before newly allowed links exist:** a guarded reversal can
  restore the original CHECK without changing data. This was tested locally.
- **After valid setup/customization links exist:** restoring the old CHECK would
  reject those valid records. The guarded reversal must refuse. Never delete
  orders, clear tenant links, revoke customer access or force delivery to make
  rollback possible. Preserve the corrected rule and use a forward correction.
- Any eventual schema reversal also requires its own supported migration plan
  and approval. A code rollback alone does not safely undo this schema change.

## Isolated verification

PostgreSQL 16, private Unix socket, synthetic owner/customer/order/tenant records;
all 39 table definitions reproduced from reviewed Production types/constraints.
The frozen global configuration supplied the existing catalog dependencies.
Column defaults were checked against Production; four numeric/array syntax
differences were verified semantically equivalent with read-only SELECTs.

**15 isolated checks passed:**

1. Original CHECK reproduces failure in the actual approval service and rolls
   back every preparation write.
2. Concurrent write lock produces a bounded timeout with no change.
3. Injected late failure restores the old CHECK and all data.
4. Successful correction preserves all 39 tables' existing data, owner access,
   customer membership and all other constraints.
5. Corrected rerun is a no-op.
6. Guarded reversal works before any newly permitted links exist.
7. All 22 status/link combinations behave as intended; delivery without a
   tenant remains forbidden.
8. FK and one-order-per-tenant uniqueness protections remain effective.
9. Actual approval links a draft while premature customer/public access,
   delivery and incomplete activation remain blocked; operator preview is
   restricted.
10. Guarded reversal refuses to remove a valid pre-delivery tenant link.
11. Actual setup/activation/delivery services grant only the correct customer
    access; cross-tenant access remains denied.
12. Already-delivered retry is idempotent.
13. Custom-design activation does not deliver early; explicit Ready review
    remains required.
14. Tenant/catalog reads do not issue concurrent queries on one transaction
    client; customer tenant listings exclude other customers' tenants.
15. Zero network capacity blocks activation/delivery without changing limits or
    granting membership. Explicit valid settings allow the normal lifecycle.

Release guard regression suite: 11 checks passed; Exchange regressions: 11 passed.
The browser lifecycle and unrelated-customer denials passed in Development.
Testing found a missing-capacity readiness gap; the application now blocks
release when a used network's maximum is zero or its source range cannot overlap
the route. Draft configuration saves remain allowed. Existing client-detail
blocker messages and the disabled Activate button expose the problem before
handoff, without arbitrary default limits or visual changes.

After delivery, the public Sandbox website is intentionally accessible.
That is not Production publishing, live domain activation or real financial
execution. Draft and undelivered sites—including active custom-design tenants
awaiting Ready—remain private. Operator previews stay authenticated/read-only.

Full workspace type checking,
release preflight and console/website builds were checked; final browser results
and build status are recorded in the implementation report.

Evidence: `verification-results.json`, `production-readback.json`, and
`artifacts/api-server/src/verification/provisioning-constraint-isolated.ts`.
These are database/service tests, not real Clerk-session/browser or Live tests.
The disposable PostgreSQL server was stopped after testing.

## Exact final Production action

Open Publishing and review the fresh schema migration. It must remove
`white_label_request_delivery` and add
`white_label_request_delivery_requires_tenant` with
`status <> 'delivered' OR tenant_id IS NOT NULL`, without other database changes.
Keep Development-data copy/overwrite OFF. A warning about CHECK replacement is
expected, not permission to remove tables or records. Click Publish/Republish
to apply the managed migration and deploy current-source builds.

Stop if the actual plan is empty while the legacy CHECK remains, includes other
changes, proposes resetting/copying data, or asks to remove tables/columns.
After Publish, fresh Production metadata and an authorized Live lifecycle test
are required before declaring the Production workflow verified.

Read-only inspection found one active Production administrator and no orders,
tenants or memberships at inspection time. This is not permission to reset the
database or omit preservation checks.
