---
name: Dependency security review policy
description: Handling unpatched advisories without forcing unsupported private-file or authentication dependency upgrades.
---

Do not force transitive major versions outside the supported storage/authentication parent ranges just to clear a scanner. Distinguish a proven non-reachable code path from a patched dependency.

**Why:** The user explicitly prohibited risky overrides, behavioral changes and major upgrades that might break private files. Upstream compatible parents can remain unpatched even when the vulnerable methods are unused.

**How to apply:** Inspect the exact installed chain and untrusted-input reachability first. Prefer a supported compatible update. Otherwise document bounded non-exploitability, keep the raw scanner findings visible, and withhold unconditional publishing sign-off rather than presenting an unpatched package as resolved.
