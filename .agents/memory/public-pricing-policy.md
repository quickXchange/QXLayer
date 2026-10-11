---
name: Public pricing policy
description: Approved public-read scope for pricing rules, without public writes or broader access changes.
---

Pricing rules should be readable by everyone, including logged-out visitors,
read-only.

**Why:** The user explicitly requested this product policy.

**How to apply:** Preserve authorized administrative writes and deny anonymous
insert/update/delete. This permission applies to pricing rules, not other
tenant-owned data or private pricing information elsewhere.
