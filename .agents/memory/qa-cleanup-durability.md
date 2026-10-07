---
name: QA cleanup durability
description: Disposable verification cleanup manifests must survive workspace restarts.
---

Keep the exact cleanup scope for disposable database fixtures in a temporary
workspace file until cleanup completes, not only in /tmp or browser memory.

**Why:** A workspace restart removed /tmp while the disposable database rows
remained, requiring bounded reconstruction of their cleanup scope.

**How to apply:** Persist only fictional QA identifiers, keep the file out of
source control, and remove it after cleanup. Never infer cleanup scope from
customer-like names or broad patterns; preserve the retained Asterlane fixture.
