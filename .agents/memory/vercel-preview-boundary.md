---
name: Vercel Preview deployment boundary
description: Unexpected first-upload Production targeting and the strict Preview-only authorization boundary.
---

Vercel's first-deployment rule overrides the ordinary Preview default: a new
project's first deployment is always Production, including non-production Git
branches and CLI commands without --prod. The isolated Staging project returned
Production targets even when Preview was explicitly requested. After removal of
the attempts, readback showed hasDeployments=false and no targets, so retrying
would again encounter first-deployment initialization.

**Why:** The user approved only Vercel Preview and explicitly prohibited
Production changes. Official documentation confirmed this exception after
provider readback contradicted the general REST API Preview-default wording:
https://vercel.com/docs/deployments/environments#first-deployment

**How to apply:** Persist the created deployment identity before checking its
target, then validate provider metadata. Treat Production classification as a
failed release even within the separate Staging project. Clean up only newly
created, scope-verified resources; never leave or present them as Preview.
Keep bootstrap handlers fail-closed outside the provider's Preview runtime.
Disabling auto-assignment of custom domains does not select Preview.

A safe proposal is a separately approved inert initializer in the isolated
Staging project's Production environment, with no application data, credentials,
backend routes or custom-domain changes; retain it while creating the subsequent
real Preview. This is not authorized by Preview-only approval. If all
Production-target deployments are forbidden, use an already-initialized isolated
Staging project instead. Do not treat custom environments as equivalent to Preview.

An approved inert initializer must contain only static placeholder files: no
application code, secrets, Clerk, database or backend connections. Stop and report
after initialization; its approval does not authorize the actual Preview.

**Why:** The user explicitly approved one initializer with those boundaries and
required a report before the real Preview.

**How to apply:** Verify the exact isolated project and absence of
Production-scoped variables before uploading. Leave live Production, Render,
custom domains, DNS and existing Vercel protection unchanged.

## Provider verification semantics

Vercel deployment `lambdas` can contain build groups even for a purely static
deployment. Count runtime resources in each group's `output`, not build groups.
The project can have `hasDeployments=true` and a READY initializer without a
`targets.production` pointer when domain assignment is disabled.

**Why:** These metadata shapes were observed for a two-file static initializer;
requiring an alias pointer or interpreting a build group as a function produced
false verification failures.

**How to apply:** Verify deployment project/target, READY state, project
initialization, source-file inventory and runtime outputs separately. The source
file-content API returns base64 in `data` without an explicit encoding field;
decode it before digest comparison. Existing Vercel sign-in protection may block
anonymous page capture; verify source through the scoped API without weakening
protection.

Preview-only approval with “Keep Production, DNS, and Render unchanged” does not
authorize saving the newly discovered origin into Render, resuming services,
connecting to Production data, or using Production credentials.

**Why:** The user repeated these restrictions when approving the deployment.

**How to apply:** Use the existing Development authentication configuration and
a database-disconnected, API-disabled bootstrap. Return the exact verified
Preview URL only after successful provider-target readback. Obtain separate
approval for backend configuration or activation unless the current migration
request explicitly authorizes save-only Staging preparation.

## Continuing migration authorization

The user authorized automatic safe Staging build, configuration and deployment
fixes, frontend Preview verification, and Render/Supabase Staging preparation.
Do not ask repeatedly for approval for these safe Staging fixes. Never modify
the live Production website, database, credentials or DNS. Paid Render service
activation still requires explicit approval.

**Why:** The user expanded the scope after initializer verification but explicitly
kept the live-Production and paid-activation boundaries.

**How to apply:** Follow the later [API-only activation authorization](external-migration-authorization.md)
for the approved API; the earlier bootstrap-only hold is not a ban on that
approved integration. Preserve all remaining startup/deployment holds. Use only
Staging variables and Clerk Development credentials. Distinguish a rendered
sign-in form from authenticated account/tenant acceptance.
