---
name: Vite dependency cache after runtime upgrades
description: Diagnose React/ReactDOM mismatch errors when installed package versions already match.
---

Check Vite's optimized dependency metadata before changing package versions again when a React/ReactDOM mismatch conflicts with Node package resolution.

**Why:** Both installed packages resolved to the same version, but Vite's prebundle still pointed to an older renderer. Restarting alone reused that cache; forced dependency optimization corrected the runtime mismatch.

**How to apply:** Compare the optimized dependency sources with the app's actual package resolution. Rebuild stale optimized dependencies instead of upgrading unrelated workspace packages or disabling the runtime error overlay.

## React Query peer variants

Deduplicating React does not by itself deduplicate React Query's provider
context. pnpm can install multiple React Query copies for different React peer
versions, even with identical React Query versions.

**Why:** The client website's production bundle contained two QueryClient
contexts while shared generated hooks resolved a different peer variant from
the website provider. The resulting render failure happened before its site
request, so a healthy API and passing typecheck did not catch it.

**How to apply:** Resolve both the artifact and shared-hook dependency paths
when diagnosing provider errors. Deduplicate the directly imported context
package in Vite. Do not blindly deduplicate transitive packages: Vite then
resolves them from the artifact root, where they may not be declared.