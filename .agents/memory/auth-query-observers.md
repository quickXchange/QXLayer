---
name: Auth query observer lifecycle
description: Why authentication cache clearing can leave protected pages loading indefinitely.
---

Do not evict active TanStack Query observers during an authentication transition, especially the session query that determines the current identity.

**Why:** A reproduced pending QueryObserver remained loading with no error after QueryClient.clear() cancelled and removed its query. An empty cache did not cause that observer to attach to a newly created query. This can strand a protected page on its skeleton.

**How to apply:** Drop prior-account data by resetting queries in place, preserve the session observer, and refetch mounted account queries with the new identity. A transient session-request failure is not a confirmed logout or identity change. Test a pending principal request during login, not only settled query states.
