---
name: RLS policy materialization
description: Why policy definitions and a successful schema push are not proof that PostgreSQL predicates exist.
---

Verify live PostgreSQL policy predicates and exercise access under a non-bypass role, not merely policy names or RLS flags.

**Why:** In this environment, drizzle-kit push created the expected policy names and target roles but left USING/WITH CHECK expressions null. Identity lookup then denied all rows despite correctly assigned access. Check constraints did materialize correctly.

**How to apply:** After development schema changes, use the explicit development access setup and the tenant-isolation verification. Inspect pg_policies predicates when authorization unexpectedly returns empty data. A successful schema push alone is insufficient evidence of working RLS.