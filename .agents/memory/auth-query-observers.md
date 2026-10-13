---
name: Auth query observer lifecycle
description: Why authentication cache clearing can leave protected pages loading indefinitely.
---

Do not evict active TanStack Query observers during an authentication transition, especially the session query that determines the current identity.

**Why:** A reproduced pending QueryObserver remained loading with no error after QueryClient.clear() cancelled and removed its query. An empty cache did not cause that observer to attach to a newly created query. This can strand a protected page on its skeleton.

**How to apply:** Drop prior-account data by resetting queries in place, preserve the session observer, and refetch mounted account queries with the new identity. A transient session-request failure is not a confirmed logout or identity change. Test a pending principal request during login, not only settled query states.

The same lifecycle defect can strand an already-settled anonymous observer on
signed-out data while a replacement cache query contains a successful login.

**Why:** The hosted Staging public bundle was independently found to cancel all
queries and clear the cache before fetching a replacement session. Backend
success logs alone therefore do not establish that mounted auth UI received
the new session.

**How to apply:** Also check that a mounted anonymous observer receives the
fresh session. Inspect the actual deployed public bundle when diagnosing
Staging; a fixed workspace does not mean the hosted release contains the fix.

History navigation can display a sign-in form even when the server session is
still authenticated. Treat form visibility as UI state, not logout evidence.

**Why:** Native mobile Chromium checks retained the session cookie and a valid
server session across Back, Forward and Refresh, while direct navigation to the
deployed sign-in route still rendered an anonymous form. Automatic role
redirects could also add history entries and bounce Back to the account page.

**How to apply:** Session-gate Staging sign-in, replace automatic authentication
and role redirects, and revalidate on persisted pageshow without evicting
observers. Distinguish first-entry validation from routine polling so background
checks do not remount the form and erase typed credentials. Keep MFA, recovery
and account-link continuations intact.
