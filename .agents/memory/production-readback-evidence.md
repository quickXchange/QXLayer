---
name: Production readback evidence
description: Why schema-diff and SQL success envelopes are insufficient proof of Production state.
---

Check the exact named CHECK definition and validation state independently of
the publishing schema diff. A reported empty diff does not prove CHECK parity.

**Why:** The managed read-only diff reported no changes while direct constraint
metadata still showed the old validated delivery equivalence.

**How to apply:** Compare exact metadata to the intended predicate before
claiming schema readiness; never add a startup/build migration to compensate.
An empty native publishing plan can persist even when same-named CHECK
expressions have different semantics. Do not claim Republish will correct that
drift or request execution approval until a supported constraint-aware
migration plan is visible. Managed schema repair must use the supported
publishing flow, not a standalone Production DDL script or credential workaround.

Restoring a stricter historical CHECK after a correction may be incompatible
with newly valid records. Guard reversals and refuse them when they would
require deleting records, clearing links or changing lifecycle statuses.

**Why:** Isolated lifecycle verification showed that legitimate pre-delivery
tenant links must survive; transaction rollback is safe before commit, but an
unconditional post-commit schema reversal can reject valid new state.

**How to apply:** Distinguish failure rollback from post-commit reversal.
Preserve valid records and use forward correction when the old predicate no
longer fits them.

Require the expected result header and parseable rows from SQL readbacks, not
only a successful tool envelope.

**Why:** A read-only query referencing a nonexistent table returned a successful
envelope containing only transaction wrapper output, without result rows.

**How to apply:** Treat missing result sets as unverified, correct the query, and
never interpret missing output as zero records.
