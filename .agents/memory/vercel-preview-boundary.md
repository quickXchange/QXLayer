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

Preview-only approval with “Keep Production, DNS, and Render unchanged” does not
authorize saving the newly discovered origin into Render, resuming services,
connecting to Production data, or using Production credentials.

**Why:** The user repeated these restrictions when approving the deployment.

**How to apply:** Use the existing Development authentication configuration and
a database-disconnected, API-disabled bootstrap. Return the exact verified
Preview URL only after successful provider-target readback. Obtain separate
approval for backend configuration or activation.
