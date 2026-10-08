---
name: Development-to-production parity policy
description: User constraints for diagnosing and synchronizing published content and configuration.
---

## Current test-project scope

QXLayer is currently a test project. The user states there are no real
customers, orders, or important Production data to preserve. They want the
latest Development version to work correctly on Live, including required
configuration and test data, without changing its design or functionality.

**Why:** The user explicitly clarified the project is a test environment,
superseding the earlier assumption that Production contains important customer
data for this initialization request.

**How to apply:** The test-project clarification does not authorize deleting,
overwriting or initializing either database. For code-only Republish requests,
preserve the existing Production database and limit scope to the latest code
and design. Any future data initialization requires separate explicit approval
after explaining the plan. This does not grant Agent Production write access
or justify bypassing managed database restrictions. Verify Production identity
compatibility separately from database copying.

Use CURRENT Development as the source of truth when comparing or synchronizing this project's published state. Do not restore old deleted data or old configuration. Diagnose source/build, current data, environment settings and media separately, read-only first; do not blindly republish, redesign, delete or recreate data.

Distinguish code-only Republish readiness from database-recovery readiness.
Missing Production configuration may limit live functionality without blocking
deployment of the latest code and visual updates.

**Why:** The user explicitly requested a publishing assessment without mixing
code deployment with database recovery.

**How to apply:** Check builds, publishing configuration and schema-change risk
for code-only requests. State remaining data-dependent limitations separately;
do not claim Republish populates missing records or proves full live parity.

**Why:** The user explicitly required this approach after reporting that a republished live site did not match current Development.

**How to apply:** Report confirmed differences and the exact synchronization scope before making changes. Preserve the current Development design and tenant/authentication boundaries. Do not treat a historical seed or checkpoint as the authoritative configuration.

Build/startup success is not proof of functional Production equivalence or
release readiness. Verify the live configuration dependencies, existing owner
authorization and intentionally environment-restricted features separately.
If access or inspection restrictions prevent verification, mark it unverified,
not passed.

**Why:** A build/startup-based pre-publish verdict was followed by a live empty
catalog and nonfunctional demos; code publication alone did not establish
Production functionality.

**How to apply:** Separate source/build readiness from live functional readiness
in release reports. Identify required global configuration and demo behavior
before recommending publication, without automatically importing Development
data or weakening authentication.

Production synchronization requires explicit approval of a row-level inclusion/exclusion plan. Exclude disposable users, temporary tenants, simulated orders, test history, sessions, fixtures and credentials. Do not enable Production Live Demo authentication or connect the homepage's presentation-only widget as part of synchronization.

**Why:** The user explicitly separated legitimate configuration transfer from demonstration data and deferred both Live Demo and homepage-widget behavior.

**How to apply:** A delivered status alone does not establish Production legitimacy; inspect the current request's stated purpose. Leave excluded Development records intact. Verify existing access references against the target Clerk user store before promising usable ownership; managed Development and Production identities are isolated.

Check the available Production write capability before declaring a synchronization executable or asking the user to resolve owner identity. An approved scope and confirmed owner are not sufficient execution readiness.

**Why:** The readiness discussion proceeded despite the Agent's managed Production SQL channel being read-only. User approval does not lift that platform restriction.

**How to apply:** Distinguish data readiness, identity evidence, execution capability and permission to execute. Do not bypass read-only access with credentials, a bootstrap endpoint, startup imports or publishing. Report blocked Production work separately from verified Development-only fixes.

## Earlier Republish-based request (superseded for data execution)

The user previously stopped the manual recovery process and requested native Republish/database initialization for code/design and configuration, without Shell or manual SQL. The complete approved-configuration request below now permits one clear authorized execution step if Agent cannot execute; it does not permit a return to the earlier complicated recovery process.

**Why:** The user explicitly changed the chosen workflow back to Republish and rejected further manual Shell/SQL recovery.

**How to apply:** Preserve existing Super Admin access, customer accounts, orders and all existing Production data. Never delete/reset the database or select wholesale Development-data overwrite. Prepare a separate safe configuration operation for approval if data synchronization is needed; do not request additional permission for already-requested code/workflow work. Keep native code/schema publishing separate from configuration rows, and do not claim Republish merges records. Do not invent build/startup seeds or bootstrap endpoints to bypass read-only access. Report a missing supported selective execution path honestly instead of asking the user to approve an operation that cannot run.

Read-only inspection or an isolated test using reproduced Production definitions is not proof that an actual Production write or rollback rehearsal ran.

**Why:** The previous recovery discussion repeatedly encountered the Agent's read-only Production replica.

**How to apply:** Distinguish prepared data, user approval, execution capability and verified Production results. Old manual recovery approvals do not authorize a new operation under the changed workflow.

## Earlier landing-only request (superseded)

The earlier restoration request was limited to the existing 16 Development Landing Products and their required modules. Its visibility requirement remains: show all 15 visible products and keep Kolo hidden. Preserve the original design, Super Admin access, customer accounts and all existing Production data. Do not delete or reset anything, and do not Republish unless necessary.

**Why:** The user narrowed the earlier full-configuration parity request to fixing the empty Live landing page.

**How to apply:** Retain the visibility and preservation requirements, but use the broader scope below. A read-only Production comparison or a screenshot of the Private Access gate is not post-fix landing-page verification.

## Complete approved platform configuration

The user broadened the request to landing products, modules, plans, add-ons and all required platform configuration records and dependencies. Do not restrict it to landing products. Preserve existing Super Admin, users, orders and all existing Production records without deleting, resetting or overwriting anything.

**Why:** The user explicitly superseded the narrow landing-only restoration with a complete approved-configuration migration.

**How to apply:** Check all configuration tables and their dependencies. Demo/test offerings are not automatically approved commercial configuration; obtain the exact scope decision before importing them. If Agent cannot execute, the user now requests one clear, simple execution step through an authorized Production connection. A single native Production SQL-runner action is allowed for this request; do not resume a multi-step Shell/credential recovery process or bypass Agent's read-only channel. Verify actual Production records and the actual Live website after execution, then prepare Republish only if needed. Do not claim completion before Live verification.

The Production access-code gate is temporary pre-launch hiding only, not a replacement for account authentication or customer delivery. Gate work must not change Clerk accounts, Exchange logic, the database, DNS, the landing page, customer sites, or prepared Production migration SQL. The user approved redesigning ONLY the Private Access page to use the existing QXLayer identity and light/dark behavior.

**Why:** The user explicitly required a separate Production Domain Access Gate and later authorized fixing its Production runtime and redesigning only its Private Access screen, while preserving the other product surfaces and database.

**How to apply:** Keep the gate separate from tenant/account permissions. A gate-only Production request does not authorize publishing unrelated Development changes or running the prepared database migration. Verify the active runtime configuration before promising live access. Removing the gate for public launch requires an explicit request.

Do not equate matching table/column inventories with lifecycle compatibility.
Compare CHECK-constraint semantics separately from equivalent default-expression
or parenthesis differences. Do not assume publication replaces legacy constraints.

**Why:** A stricter Production predicate could reject valid pre-delivery tenant
preparation even though the table, column, index and relationship inventories matched.

**How to apply:** Evaluate current intermediate workflow states against the actual
Production predicates before declaring schema parity. Report material differences
separately and obtain approval for any repair instead of changing constraints during inspection.
