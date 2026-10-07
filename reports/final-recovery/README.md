# FINAL recovery package — prepared, not executed

No Production connection or SQL execution was performed while preparing this
package. No Production data, owner access, DNS or Admin Demo was changed.
All SQL files are future operator drafts, not migrations or startup hooks.

## 1. Delivery constraint: the only proposed schema change

| Item | Exact value |
|---|---|
| Table | `public.white_label_requests` |
| Constraint | `white_label_request_delivery` |
| Captured Production definition | `CHECK (((status = 'delivered'::text) = (tenant_id IS NOT NULL)))` |
| Current Development definition | `CHECK (((status <> 'delivered'::text) OR (tenant_id IS NOT NULL)))` |

Production equates delivery with the existence of a tenant link. Development
requires a tenant link when delivered, but permits that link earlier.
This is a difference in business invariants, not missing columns or indexes.
The capture does not establish who introduced the old invariant or when.

The current service prepares the tenant and sets `tenant_id` while status becomes
`in_setup` or `customization`. Production evaluates `false = true` and rejects
that update. It would also reject a linked project in `ready`.

Smallest replacement:

```sql
ALTER TABLE public.white_label_requests
  DROP CONSTRAINT white_label_request_delivery,
  ADD CONSTRAINT white_label_request_delivery
    CHECK (status <> 'delivered' OR tenant_id IS NOT NULL);
```

Use the guarded complete script, not this abbreviated statement. No table is
recreated. No data, foreign key, other CHECK, index or permission is changed.
The link does not deliver the order or grant customer Admin Panel access:
existing application delivery/authorization checks remain in force.

### Existing-data validity: proof and execution gate

Every row accepted by the old validated constraint is accepted by the new one:

| Status | Tenant link | Old | New |
|---|---|---|---|
| Not delivered | Absent | Accept | Accept |
| Not delivered | Present | Reject | Accept |
| Delivered | Absent | Reject | Reject |
| Delivered | Present | Accept | Accept |

Therefore no formerly valid row needs rewriting. An exhaustive offline test
covered all 11 allowed statuses and both link states.

The previous schema snapshot did **not** capture `convalidated`. Actual current
validation status and schema drift remain unverified because Production reads
are forbidden in this turn. The future preflight checks validation/nullability.
The forward script refuses a missing/unvalidated/unexpected constraint or active
DDL event triggers, takes an exclusive lock, replaces only this CHECK, and lets
PostgreSQL validate all existing rows again before commit.

`lock_timeout=5s` and `statement_timeout=30s` bound lock waits and execution.
Schedule a short quiet window: ALTER/validation may block access to this table.
On any timeout/error issue `ROLLBACK` in the **same SQL session**. Do not run
statements independently or continue through errors. The database must not be
left in an open/aborted transaction.

### Forward and rollback files

- `01-delivery-preflight.sql`: metadata only; no order/customer records.
- `02-delivery-forward.sql`: atomic guarded replacement; compatible retries no-op.
- `03-delivery-rollback.sql`: guarded restoration of the exact old predicate.

Before COMMIT, transaction rollback retains the old schema without data changes.
After COMMIT, the reverse script is safe only while every row still satisfies
the old predicate. Once setup creates a pre-delivery link, reversal must stop.
The script checks that condition without exporting order records and aborts if
it is false. Never delete/unlink a tenant or change order status to force rollback.
Restoring the old predicate would intentionally restore the lifecycle blocker.
If reversal is blocked, keep the safe new constraint and separately review a
forward correction/code rollback; do not assume code rollback also requires
reinstating the old CHECK.

## 2. Exactly 15 platform-global catalog products

`approved-catalog.json` contains the reviewed manifest; its fingerprint is in
`package-readiness.json`. It has no Kolo. New values are exactly the approved
copy, visible=true, NULL prices, USD, on_request, Learn More, orders 10–150,
Exchange available/sandbox-only and the other 14 coming_soon.

Production catalog state remains **not inspected**, not "empty".
No actual Production classification or write script has been fabricated.

Future authorized sequence:

1. Run `04-catalog-preflight.sql` against Production **read-only**, after explicit
   read approval. It projects only the approved landing rows and their module keys.
   The managed read-only SQL channel can supply this snapshot; no manual customer
   database export, credentials or log upload is required.
2. Save its JSON result as the internal `snapshot.json` preparation input.
3. Run the offline classifier:

   ```
   pnpm --filter @workspace/scripts exec tsx src/recovery/prepare-catalog-apply.ts snapshot.json
   ```

4. Review all 15 keys. Classifications:

   - `INSERT`: absent approved key with an existing module dependency.
   - `UNCHANGED`: existing visible row exactly matches the approved definition.
   - `RESTORE VISIBILITY`: existing copy/configuration matches; only visibility is false.
   - `CONFLICT / REVIEW REQUIRED`: any existing copy, icon, price, currency,
     billing, status, CTA or ordering differs, or a module dependency is absent.

   Intentional Production edits are not assumed wrong. Hidden edited rows are
   conflicts, not automatic visibility restorations.

5. Approve INSERT/RESTORE keys individually. Conflicts require explicit
   `PRESERVE` acknowledgement; the compiler cannot overwrite them. Missing module
   dependencies block the entire apply, even if acknowledged. Do not seed modules
   as part of this package. An edited hidden record preserved by review remains
   hidden; do not claim that all 15 public cards have been restored in that case.
6. Fill `approvals-template.json`. Generate, inspect and approve the frozen SQL:

   ```
   pnpm --filter @workspace/scripts exec tsx src/recovery/prepare-catalog-apply.ts snapshot.json approvals.json --emit-sql
   ```

   This tool only reads local files and emits draft SQL. It imports no database,
   opens no connection and cannot execute SQL.

7. An explicitly authorized Production writer may run the reviewed output in one
   SQL session. The Agent's managed Production SQL channel cannot perform writes.
   Replit documents an operator SQL runner in Database → My Data; confirm the
   Production target and operator permissions there. This is a future approved
   operator action, not permission granted by this package.

### Apply guards

The generated transaction expires its preflight after 15 minutes, locks only
the two platform-global catalog tables, rechecks module dependencies, rejects
unexpected RLS/user triggers, and compares every projected existing field with
the reviewed baseline before any write. Drift aborts the whole transaction.
Existing copy is hex-encoded JSON, not interpolated executable SQL.

Only approved missing rows are inserted and explicitly approved matching hidden
rows get `visible=true`. There is no conflict-update upsert, copy/price overwrite,
deletion, truncation, customer/tenant/order query or write, audit/customer-data
import, module activation, financial execution or startup/publish hook.
The exact expected post-state is checked before commit.

On error use same-session ROLLBACK. After commit, preserve the preflight/approval/
result as marketing-only evidence. Do not DELETE newly inserted records as a
rollback. Any later visibility reversal requires separate key-level approval and
a fresh drift check; hiding a new row is non-destructive mitigation, not a return
to the former absent-row state.

## 3. NovaX diagnostics: ready, with no data dependency

Publishing the implemented shared website/API diagnostics requires no NovaX
branding, tenant, configuration, order, membership or provider changes.
No diagnostic schema table is needed: evidence is emitted to server logs.

Public error UI and diagnostic payload contain only:

- safe random QXS error ID;
- allowlisted category;
- source build fingerprint.

Server evidence adds the timestamp and fixed event/component identifiers,
plus separate request acceptance status/timing. Raw exception messages, stacks,
responses, tenant/customer identifiers and secrets remain excluded server-side.
This is correlation evidence, **not a secretly retained full stack trace**.
The endpoint can reject/limit a report; absence of a log is not proof of no crash.
Capture the UI reference/build and correlate it with an accepted server event.
No source change attempts to guess or repair the real NovaX exception.

Publish the API and website together through the normal project release:
the website calls the separately routed `/api/diagnostics/website-errors`.
Keep the Production access gate and Production runtime modes unchanged.

## 4. Safest order, based on the actual architecture

All steps below are future, separately authorized actions.

0. **Preconditions:** verify the selected Production target, authorized schema/
   catalog writer, restore capability, captured schema definition and reviewed
   catalog snapshot. Check existing owner access read-only before changing
   anything; no owner creation/role adjustment. Review the publishing schema diff
   for unrelated/destructive changes. No data synchronization/import.
A. **Schema:** run metadata preflight, review it, apply only the guarded CHECK
   replacement, and verify exact new definition plus convalidated=true.
B. **Catalog:** inspect/classify/review all 15 keys; emit a fresh approved SQL plan;
   apply only scoped INSERT/visibility actions and verify exact post-state.
C. **Code publication:** separately approve Republish of current code including
   API/shared-website diagnostics. Confirm build success and no unwanted schema
   or data changes. Publishing alone must not be relied on to seed the catalog
   or silently repair legacy CHECK constraints.
D. **Landing:** test through the existing gate. Verify public catalog content,
   ordering, approved prices/visibility, product status and sandbox/planned labels;
   confirm the presentation-only homepage widget stays presentation-only.
E. **NovaX capture:** visit the actual protected Production NovaX site. If it fails,
   collect the safe reference/category/build and corresponding server event.
   If it does not fail, record that fact; do not fabricate a root cause.
F. **Proven fix only:** reproduce using the captured build/evidence and authorized
   investigation. Implement/test a narrowly approved Development correction,
   then separately approve publishing it. Repeat Landing/owner checks after it.
G. **Owner verification:** repeat existing Production sign-in, /api/me super_admin
   and /admin before any privileged lifecycle test. Stop on failure; do not edit
   identity/permissions to make the test pass.
H. **Lifecycle:** verify order → approval → provision/link during setup →
   configure → preview → ready → delivered, then customer access only after
   delivery. Use only separately authorized legitimate Production activity;
   do not manufacture disposable customers or import Development fixtures.

### Additional code/environment blocker: pre-delivery Preview

Current `/api/tenants/:tenantId/website-preview` uses preview-service.ts, which
returns 404 unless developmentPreviewEnabled() is true. That requires explicit
Development mode and rejects published deployments. Production is configured
with NODE_ENV=production. Therefore this package's schema fix does **not** make
the full current tenant-specific pre-delivery Preview flow work in Production.

No preview guard was changed. An authenticated, read-only Production operator
preview needs a separately approved implementation/security scope; it must not
enable Development tokens, activate tenants early, alter owner privileges or
activate the Production Admin Demo. Until resolved, H cannot honestly pass the
full specified lifecycle. This does not require guessing/fixing NovaX first and
does not prevent a separately approved diagnostic-only publication.

## 5. Final GO / NO-GO at this preparation checkpoint

| Required field | Answer |
|---|---|
| SCHEMA CHANGE READY | YES — guarded draft and compatibility proof prepared |
| CATALOG RECOVERY READY | YES — manifest, preflight, classification and guarded offline compiler prepared |
| DIAGNOSTICS READY | YES — verified existing implementation; no NovaX data changes |
| SAFE TO EXECUTE RECOVERY | NO — no execution approval, fresh Production preflight or verified writer |
| SAFE TO REPUBLISH AFTER RECOVERY | NO — recovery not performed/verified; publish approval/diff review outstanding; full lifecycle Preview remains unsupported |

"Ready" above means package-ready, not proof of current live prerequisites.
After successful A/B and a clean reviewed release plan, a **diagnostic publication**
can be a conditional GO without first fixing an unproven NovaX problem. A
**full-lifecycle release** remains NO-GO until the Production Preview gap is
separately resolved and the applicable checks pass.

Verification performed only during preparation: offline fixture tests, TypeScript
checks, and PostgreSQL PL/pgSQL compilation in a Development READ ONLY transaction
with all recovery bodies inside IF FALSE. No recovery statement/body was executed,
and that transaction was rolled back.
