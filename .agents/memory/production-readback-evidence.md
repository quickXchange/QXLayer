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
Any exceptional manual repair remains approval-dependent.

Require the expected result header and parseable rows from SQL readbacks, not
only a successful tool envelope.

**Why:** A read-only query referencing a nonexistent table returned a successful
envelope containing only transaction wrapper output, without result rows.

**How to apply:** Treat missing result sets as unverified, correct the query, and
never interpret missing output as zero records.
