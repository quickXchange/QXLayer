---
name: Vite dependency cache after runtime upgrades
description: Diagnose React/ReactDOM mismatch errors when installed package versions already match.
---

Check Vite's optimized dependency metadata before changing package versions again when a React/ReactDOM mismatch conflicts with Node package resolution.

**Why:** Both installed packages resolved to the same version, but Vite's prebundle still pointed to an older renderer. Restarting alone reused that cache; forced dependency optimization corrected the runtime mismatch.

**How to apply:** Compare the optimized dependency sources with the app's actual package resolution. Rebuild stale optimized dependencies instead of upgrading unrelated workspace packages or disabling the runtime error overlay.