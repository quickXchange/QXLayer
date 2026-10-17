---
name: Semantic JSONB replay
description: Canonical comparison of customer selections in idempotent order replay.
---

Compare normalized whitelisted customer-detail values in a deterministic key order for idempotent replays. Never compare raw `JSON.stringify()` output from an input object with a PostgreSQL JSONB round trip.

**Why:** A genuine replay of the same accepted quote and identical customer details returned a conflict because JSONB reordered the object keys. Rejecting legitimate replays undermines duplicate-submission protection.

**How to apply:** Derive a canonical comparison key without rewriting stored history. Apply the same value normalization to both sides; test persistence and replay, not only two in-memory objects with the same insertion order.
