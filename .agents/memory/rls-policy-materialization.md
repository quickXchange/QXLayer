---
name: RLS policy materialization
description: Why policy definitions and a successful schema push are not proof that PostgreSQL predicates exist.
---

Verify live PostgreSQL policy predicates and exercise access under a non-bypass role, not merely policy names or RLS flags.

**Why:** In this environment, drizzle-kit push created the expected policy names and target roles but left USING/WITH CHECK expressions null. Identity lookup then denied all rows despite correctly assigned access. Check constraints did materialize correctly.

**How to apply:** After development schema changes, use the explicit development access setup and the tenant-isolation verification. Inspect pg_policies predicates when authorization unexpectedly returns empty data. Also compare the read-only publishing schema diff against live policy predicates: the publishing preview has generated role-targeted CREATE POLICY statements without the existing USING/WITH CHECK clauses. A successful schema push or role bootstrap alone is insufficient evidence of working RLS.

For shared read-only catalogs, avoid row-locking SELECTs as the tenant reader.

**Why:** PostgreSQL applies write-related RLS to `SELECT ... FOR SHARE`; a catalog's legitimate read policy can therefore return no rows when its write policy is Super-Admin-only.

**How to apply:** Coordinate catalog-version reads and edits with transaction advisory shared/exclusive locks, while leaving tenant readers under their normal SELECT policy.

Verify custom-role portability before publishing through Replit's managed database restore.

**Why:** Publishing failed during development-data preparation, before application compilation, because restored policies referenced a custom NOLOGIN runtime role absent from the restore environment. The production database also lacked that role. Development-only role setup is not production provisioning.

**How to apply:** Diagnose restore-stage role failures separately from build errors. Require supported provisioning of the restricted role, membership, and grants before policy restoration; consult publishing support when that infrastructure step is unavailable. Do not bypass the problem by disabling RLS, targeting unrestricted roles, using an owner-backed runtime, or adding production migration/build/startup DDL. Documentation about automatic custom-role migration during the development Neon-to-Helium upgrade is not evidence that the publishing restore provisions those roles. Confirm both the intermediate restore environment and the persistent production database; provisioning only the latter is not a confirmed repair for an intermediate restore failure.