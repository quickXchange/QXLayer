# Complete Production configuration migration

**Status: all 277 records APPROVED unchanged and synthetically tested; NOT EXECUTED. Live is NOT verified.**

Approval is recorded in `approval.json`. The executable approved copy is
`migration-APPROVED.sql`, with its checksum in `manifest-APPROVED.json`.
The prepared files remain unchanged as the original review evidence.

This is the current full-platform data proposal. It supersedes the earlier
landing-only proposal and historical recovery packages. Do not run those old files.

## Reviewed scope

All 39 public tables were inspected in Development and Production, including
column types, primary keys, foreign keys, CHECK constraints, triggers and row security.
Current configuration is frozen in `source.json`; decimal monetary metadata is
serialized as text to avoid JavaScript number rounding.

| Global table | Source rows | Current Production readback |
|---|---:|---:|
| module_catalog | 18 | 0 |
| entitlement_definitions | 32 | 0 |
| asset_catalog | 33 | 0 |
| network_catalog | 19 | 0 |
| provider_catalog | 0 | 0 |
| plans | 5 | 0 |
| addons | 1 | 0 |
| landing_products | 16 | 0 |
| asset_network_catalog | 37 | 0 |
| plan_entitlements | 112 | 0 |
| addon_entitlements | 4 | 0 |
| **Total** | **277** | **0** |

Parents are inserted before their dependents. Every configuration foreign key
stays within these 11 tables, and every source reference was checked. Module
feature/limit declarations were checked against entitlement definitions.
All 16 landing products are retained: 15 visible, Kolo hidden.

## Approved scope: these remain demo/test offerings

Development contains no clearly identified real commercial plan. All five
plans are currently enabled:

- NovaX Sandbox Demo: USD 300 monthly / USD 3,000 yearly / USD 0 setup.
- White Label Exchange Sandbox Demo: USD 300 monthly / USD 3,000 yearly / USD 0 setup.
- Sample Plan A and Sample Plan B: USD 0 monthly / yearly / setup.
- Temporary Development test plan for Asterlane Exchange: USD 300 monthly /
  USD 3,000 yearly / USD 0 setup.

The enabled Sample developer capacity add-on has pricing configured:
USD 300 monthly / USD 3,000 yearly / USD 200 setup.

The proposed full migration retains their exact names, IDs, prices, enabled
states and entitlement values. It does not relabel them as real commercial
offerings. The user explicitly approved these 122 plan/add-on/entitlement rows
along with the other 155 global configuration rows, unchanged and without
exclusions. Public landing marketing prices remain NULL.

## Preservation

- No UPDATE, DELETE, reset, table recreation, schema migration or blanket upsert.
- Existing identical keys are retained; any conflicting key aborts everything.
- Extra existing global records are preserved. Extra visible landing products
  would fail the exact 15-visible check rather than being hidden or deleted.
- All 28 other tables are excluded, including Super Admin, tenants, memberships,
  tenant settings, subscriptions, assignments, overrides, tenant pricing rules,
  customer requests/uploads/events, orders, invoices, API keys, credentials,
  wallets, provider assignments/policies and webhooks.
- There is no separate global settings table. Existing settings outside the
  global catalogs are tenant-specific, not transferable platform defaults.
- External Clerk accounts, authentication settings, sessions and the pre-launch
  access gate are not modified or copied.
- No Development customers, demo tenants, simulated orders or QA history are copied.
- Importing definitions does not implement engines, connect providers, enable
  Live Demo authentication or assign plans to any customer.

The reviewed Production owner fingerprint and excluded-table counts are checked
before writes. Target drift aborts the operation and requires a refreshed review.
Short-lived table locks prevent concurrent changes; ordinary SELECTs stay available.
Protected table fingerprints are checked before and after; every original global
row and every imported source row is verified inside the transaction.

## Authorized execution — one step

**In Replit's Database tool, select Production → My Data → SQL runner, paste the
entire `reports/production-configuration-migration/migration-APPROVED.sql` file,
and click Run once.**

The prepared file is `migration-PREPARED.sql`. Its approval guard remains
deliberately false; running that old prepared copy aborts without changes.
The approved copy has only its approval guard and explanatory approval header
changed. Frozen source data and all preservation checks are identical.
Do not independently remove guards or edit source values.

The entire file is one PostgreSQL DO statement. This makes all inserts atomic
even if the editor uses pooled connections: any error rolls back the whole
statement. A successful rerun inserts nothing and keeps the same records.

Agent cannot execute this through its managed Production SQL channel, which is
SELECT-only. The SQL runner uses your authorized native Production connection;
no passwords, connection strings, Shell commands or bypass endpoints are needed.

Official reference:
https://docs.replit.com/features/data-and-storage/work-with-your-data

## Verification and Republish

After you report a successful execution, Agent must:

1. Re-read the actual Production database and compare every imported row against
   the frozen source, including composite keys, numeric values, flags and JSON.
   `verification-exact.sql` provides the read-only exact-value comparison.
2. Confirm the original administrator fingerprint, excluded table counts,
   15 visible products and hidden Kolo. Replica lag must not be mistaken for failure.
3. Verify the actual Live website at https://www.quicklychan.xyz behind the
   existing Private Access gate, including products and applicable read-only
   platform catalog views. Do not remove the gate or alter authentication.
4. Prepare code Republish only if a verified Live code/build issue requires it.
   Do not use Development-data overwrite or publishing-time data seeds.

**A successful SQL message is not verified Live completion.** At preparation time,
the inspection browser reaches Private Access and the Live catalog API returns
403 "Production access required." No post-migration Live test has run.

## Schema findings

Configuration column types and primary/foreign keys agree. The landing copy
CHECK has different parentheses but equivalent conditions; the full source
passes the reproduced actual Production constraints.

An unrelated existing difference remains in `white_label_requests`: Production
requires a tenant ID exactly when status is delivered, whereas Development only
requires it for delivered status. This migration neither touches requests nor
changes that constraint. Native publishing currently reports no schema diff.
Do not claim full customer-provisioning lifecycle compatibility from this data import.

## Rehearsal evidence

Six checks passed against a separate PostgreSQL 16 cluster using reproduced
Production definitions and synthetic identities only:

- Unapproved file rejects without writes.
- Wrong target/owner fingerprint rejects without writes.
- All 277 rows import with correct CHECK/FK/column types and visibility; rerun is unchanged.
- An existing matching record remains unchanged.
- A conflicting record aborts the import without overwriting it.
- An injected failure after all inserts rolls everything back and preserves the synthetic owner.

See `rehearsal.json` and `manifest.json`. No Development or Production application
database was modified by the rehearsal.
