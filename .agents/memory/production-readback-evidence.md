---
name: Production readback evidence
description: Why schema-diff and SQL success envelopes are insufficient proof of Production state.
---

Check the exact named CHECK definition and validation state independently of
the publishing schema diff. A reported empty diff does not prove CHECK parity.

**Why:** The managed read-only diff ignored changed expressions under the same
CHECK name while direct metadata showed different semantics. A name-only
Development probe made the native diff emit the required drop/add replacement.

**How to apply:** Compare exact metadata to the intended predicate before
claiming schema readiness; never add a startup/build migration to compensate.
An empty native publishing plan can persist even when same-named CHECK
expressions have different semantics. For approved semantic changes, use a
distinct descriptive CHECK name in the schema source, apply through the supported
Development flow, and verify that the native diff replaces the old rule without
data-bearing structural changes. Do not claim publishing readiness without that
readback. Managed schema repair must use the supported publishing flow, not a
standalone Production DDL script or credential workaround.

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

Preservation snapshots must record the exact fingerprint algorithm and original
column set. Compare original columns across additive schema changes, and verify
the new columns' intended defaults separately.

**Why:** Changing JSON serialization or aggregation separators produced different
hashes for unchanged records. A new false-default pricing guard also changed the
full-row hash although every pre-existing column remained identical.

**How to apply:** Never weaken a preservation guard or rewrite business data to
force a match. Reproduce the original serialization, digest ordering and separator;
prove original-column equality and the expected additive defaults independently.
