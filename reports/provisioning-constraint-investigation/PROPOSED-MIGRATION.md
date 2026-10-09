# QXLayer provisioning constraint investigation

**Status: correction tested; Production execution BLOCKED. No approval requested.**

No Production writes, Development database changes, Republish, UI changes,
account changes or live provider connections were performed. Only an isolated
rehearsal and investigation files were added.

## Exact incompatibility

Table: `public.white_label_requests`

Constraint: `white_label_request_delivery`

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

## Prepared migration specification — NOT an executable Production script

The intended schema migration replaces only the named CHECK's predicate,
retaining its name and validated state. It must use Replit's supported managed
schema-publishing process, not a custom Production DDL script, startup repair,
deployment-build hook, credential workaround or bootstrap endpoint.

Required acceptance conditions before requesting execution approval:

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

The isolated rehearsal uses a bounded lock timeout, one transaction, replacement
plus validation, exact-definition guards, data fingerprints and automatic
rollback. It is hard-guarded to a disposable private Unix-socket database and
cannot run against Development or Production.

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

**13 checks passed:**

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

API TypeScript check: `pnpm --filter @workspace/api-server exec tsc --noEmit` passed.

Evidence: `verification-results.json`, `production-readback.json`, and
`artifacts/api-server/src/verification/provisioning-constraint-isolated.ts`.
These are database/service tests, not real Clerk-session/browser or Live tests.
The disposable PostgreSQL server was stopped after testing.

## Unresolved execution blocker

Fresh direct metadata confirms different CHECK semantics in Development and
Production, but `explainSchemaDiff()` returned:

- `success: true`
- `hasDiff: false`
- `statementsToExecute: []`

Therefore **Republish is not currently a verified correction path**. Development's
predicate is already correct; rewriting it unchanged is not a migration.
Do not request approval to execute an empty publishing plan or invent a
standalone Production schema migration. A supported constraint-aware publishing
reconciliation must be established and reviewed first.

Read-only inspection found one active Production administrator and no orders,
tenants or memberships at inspection time. This is not permission to reset the
database or omit preservation checks.
