---
name: Exchange Admin filter and selection safety
description: Why Payment Methods selection differs from other Admin tables, and how empty filtered results must behave.
---

Ordinary Exchange Admin tables, including staff and orders, target only the rows shown by the current filter/page. Payment Methods intentionally preserves selection across filters within the full current tenant dataset, with explicit hidden counts and a complete review.

**Why:** The Payment Methods workflow needs separately filtered groups selected together. Applying that behavior to staff or orders could change access or status for hidden rows unintentionally.

**How to apply:** Keep Payment Methods' persistent selection as a deliberate exception, not a default for new tables. Prune removed or out-of-scope IDs; disable selection of previous-page order rows during loading.

No filtered matches is a view state, not missing saved configuration. Keep search, filters and Reset available when the filtered result is empty.

**Why:** A Pricing filter once hid its own filter controls and Reset, making unchanged saved routes appear to be lost.

**How to apply:** Distinguish an empty underlying action scope from an empty filtered result. Only the former should show the configuration-empty state; the latter needs a no-match state with working Reset.
