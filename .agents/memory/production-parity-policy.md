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

Check the available Production write capability before declaring a synchronization executable or asking the user to resolve owner identity. An approved scope and confirmed owner are not sufficient execution readiness.

**Why:** The readiness discussion proceeded despite the Agent's managed Production SQL channel being read-only. User approval does not lift that platform restriction.

**How to apply:** Distinguish data readiness, identity evidence, execution capability and permission to execute. Do not bypass read-only access with credentials, a bootstrap endpoint, startup imports or publishing. Report blocked Production work separately from verified Development-only fixes.

The Production access-code gate is temporary pre-launch hiding only, not a replacement for account authentication or customer delivery. Gate work must not change Clerk accounts, Exchange logic, the database, DNS, the landing page, customer sites, or prepared Production migration SQL. The user approved redesigning ONLY the Private Access page to use the existing QXLayer identity and light/dark behavior.

**Why:** The user explicitly required a separate Production Domain Access Gate and later authorized fixing its Production runtime and redesigning only its Private Access screen, while preserving the other product surfaces and database.

**How to apply:** Keep the gate separate from tenant/account permissions. A gate-only Production request does not authorize publishing unrelated Development changes or running the prepared database migration. Verify the active runtime configuration before promising live access. Removing the gate for public launch requires an explicit request.
