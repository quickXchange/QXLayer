---
name: Restored schema equivalence
description: Preserve restored data and raw metadata when PostgreSQL renders equivalent constant defaults differently.
---

Do not alter a restored Staging database merely to match the text spelling of a
semantically identical PostgreSQL constant default. Keep raw schema captures
intact and accept only explicitly reviewed, typed, column-bounded equivalences
in comparison. Never normalize arbitrary expressions, function calls, changed
values, types, nullability, constraints or indexes.

**Why:** A read-only Staging check reported drift after restore solely because
PostgreSQL rendered numeric zero and the single-English-language array with
different constant syntax. The schemas and security configuration otherwise
matched. Rewriting defaults would introduce unnecessary target mutations and
obscure preservation evidence.

**How to apply:** Inspect the precise catalog delta before treating it as a
migration failure. Add positive and negative comparison tests for any approved
equivalence, and rerun the strict schema/RLS/grant readback without data changes.
