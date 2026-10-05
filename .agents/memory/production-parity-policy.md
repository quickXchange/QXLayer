---
name: Development-to-production parity policy
description: User constraints for diagnosing and synchronizing published content and configuration.
---

Use CURRENT Development as the source of truth when comparing or synchronizing this project's published state. Do not restore old deleted data or old configuration. Diagnose source/build, current data, environment settings and media separately, read-only first; do not blindly republish, redesign, delete or recreate data.

**Why:** The user explicitly required this approach after reporting that a republished live site did not match current Development.

**How to apply:** Report confirmed differences and the exact synchronization scope before making changes. Preserve the current Development design and tenant/authentication boundaries. Do not treat a historical seed or checkpoint as the authoritative configuration.

Production synchronization requires explicit approval of a row-level inclusion/exclusion plan. Exclude disposable users, temporary tenants, simulated orders, test history, sessions, fixtures and credentials. Do not enable Production Live Demo authentication or connect the homepage's presentation-only widget as part of synchronization.

**Why:** The user explicitly separated legitimate configuration transfer from demonstration data and deferred both Live Demo and homepage-widget behavior.

**How to apply:** A delivered status alone does not establish Production legitimacy; inspect the current request's stated purpose. Leave excluded Development records intact. Verify existing access references against the target Clerk user store before promising usable ownership; managed Development and Production identities are isolated.
