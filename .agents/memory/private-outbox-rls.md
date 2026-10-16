---
name: Private commerce RLS
description: Conflict and row-lock clauses can impose unexpected read or update-policy requirements.
---

Do not use `INSERT ... ON CONFLICT DO NOTHING` for customer-originated outbox
inserts when customers intentionally have no outbox SELECT policy.

**Why:** PostgreSQL checked the SELECT policy for the conflict path and rejected
the insertion, rolling back the entire order. A plain insert succeeded with
the same restricted role and actor. Each event already has a fresh server-created
ID and a unique outbox constraint, so conflict suppression was unnecessary.

**How to apply:** Keep the transactional outbox private; do not widen read policies
to repair writes. Verify both insert permission and read denial using the actual
restricted runtime role, not the database administrator.

For customer reads of operator-owned configuration, use the existing paired
advisory-lock pattern instead of `SELECT ... FOR SHARE`.

**Why:** A restricted customer could read an approved method normally but saw
zero rows with `FOR SHARE`, because row locks also required UPDATE-policy
visibility. Granting customers configuration-write visibility is not the fix.

**How to apply:** Configuration writes take the matching exclusive advisory lock;
checkout takes a shared advisory lock and performs a normal policy-scoped SELECT.
