---
name: Development-to-production parity policy
description: User constraints for diagnosing and synchronizing published content and configuration.
---

Use CURRENT Development as the source of truth when comparing or synchronizing this project's published state. Do not restore old deleted data or old configuration. Diagnose source/build, current data, environment settings and media separately, read-only first; do not blindly republish, redesign, delete or recreate data.

**Why:** The user explicitly required this approach after reporting that a republished live site did not match current Development.

**How to apply:** Report confirmed differences and the exact synchronization scope before making changes. Preserve the current Development design and tenant/authentication boundaries. Do not treat a historical seed or checkpoint as the authoritative configuration.
