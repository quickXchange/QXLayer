# Catalog SQL verification

## Status

The SQL comparison fix and isolated rollback tests passed. An actual rollback-only write test on Production has **not** run. Agent's Production database access is a read-only replica. Do not treat the COMMIT candidate as Production-verified until the user-run Production rehearsal passes.

## Exact scope

The approved data payload is unchanged: 16 required `module_catalog` rows and 16 `landing_products` rows. Approved snapshot SHA-256:

`110ee5ac12820106c5b8ea437416f48add578994c2087728511b43353257b85e`

Successful execution must insert exactly 32 new rows. Any existing approved key aborts the transaction. There are no updates, deletes, schema/authentication/design changes, endpoints or startup hooks.

## Comparison correction

Expected rows are cast with `jsonb_populate_recordset` through each actual PostgreSQL table composite type. Null-safe, field-by-field SQL row comparisons use `IS DISTINCT FROM`. Price fields therefore compare as `numeric(12,2)`, not source JSON strings. Full joins detect missing or unexpected approved keys. All six module columns, the full definition JSON, and all twelve product columns are compared.

Pre-existing records and administrator snapshots still compare database-generated JSONB against database-generated JSONB from the same table, not against external source JSON.

## Read-only Production inspection

- Actual price columns: `numeric(12,2)`.
- All 16 approved products have NULL starting prices and setup fees.
- Approved data casts through the actual Production table types: 16 modules, 16 products, 15 visible.
- Column types/defaults, primary keys, foreign key and CHECK definitions were read from Production.
- All three relevant tables are ordinary tables without RLS. No non-internal triggers or catalog rewrite rules were found.
- Actual indexes are the three primary-key indexes; the isolated schema reproduces these.
- Production catalog counts: 0 module rows, 0 product rows, 1 active platform administrator.
- PostgreSQL JSONB considers numeric `1` and `1.00` equal; a JSON string `"1.00"` is not a JSON number. Typed casts address the latter distinction.

These inspections used SELECT only. Production records were not changed.

## Isolated PostgreSQL 16.10 rollback tests

The test cluster used a private local Unix socket, no TCP listener, and table definitions reproduced from the read-only Production metadata. It did not connect to the project's Development or Production databases.

1. **Exact approved payload:** all 32 insertions and every pre-commit check passed. Rollback left zero test rows.
2. **Preservation:** synthetic pre-existing catalog rows, including numeric prices, and a synthetic administrator remained identical during validation. Rollback removed every synthetic fixture and insertion.
3. **Duplicate:** a pre-existing approved key caused the expected pre-insert exception. No partial test data persisted.
4. **Numeric comparisons:** equivalent numeric scales and numeric source strings compared correctly after casting; NULLs matched; changed prices were detected.

Only empty local test-table definitions were created outside the rollback transactions. No application test data was committed. The isolated server was stopped after testing.

## Files and manual Production rehearsal

- `production-catalog-rollback-test.sql`: complete rehearsal; the validated transaction ends with ROLLBACK, never COMMIT.
- `production-catalog-insert.sql`: corrected COMMIT candidate; do not run it until the actual Production rehearsal passes.

In Replit, open Database → Production → My Data → SQL runner. Open the rollback-test file in Files, copy its entire contents and run it as one batch. Do not split statements across connections.

Required rehearsal evidence:

- No errors.
- Validation notice reports 16 module inserts and 16 product inserts.
- Inside-transaction result: 16 modules, 16 products, 15 visible products, Kolo hidden.
- First and last baseline result rows match exactly. At the inspected Production baseline, totals remain 0 modules, 0 products and 1 active administrator, with an unchanged owner fingerprint.

If any error occurs, do not remove safeguards or try the COMMIT candidate. If the console leaves an aborted transaction, issue ROLLBACK in the same connection and report the error. A read-only/permission error is not solved by changing database roles or adding a startup endpoint.
