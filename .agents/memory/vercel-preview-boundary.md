---
name: Vercel Preview deployment boundary
description: Unexpected first-upload Production targeting and the strict Preview-only authorization boundary.
---

On the isolated, unlinked Staging project with no deployments, the Vercel
integration returned Production-target deployments both when target was omitted
and when Preview was explicitly requested. The documented default and a unique
generated URL therefore do not prove Preview classification. Both unintended
uploads and their generated managed alias were removed; no compliant Preview
was delivered. Do not repeat the upload until the target override is understood.

**Why:** The user approved only Vercel Preview and explicitly prohibited
Production changes. Provider readback contradicted the requested target.

**How to apply:** Persist the created deployment identity before checking its
target, then validate provider metadata. Treat Production classification as a
failed release even within the separate Staging project. Clean up only newly
created, scope-verified resources; never leave or present them as Preview.
Keep bootstrap handlers fail-closed outside the provider's Preview runtime.

Preview-only approval with “Keep Production, DNS, and Render unchanged” does not
authorize saving the newly discovered origin into Render, resuming services,
connecting to Production data, or using Production credentials.

**Why:** The user repeated these restrictions when approving the deployment.

**How to apply:** Use the existing Development authentication configuration and
a database-disconnected, API-disabled bootstrap. Return the exact verified
Preview URL only after successful provider-target readback. Obtain separate
approval for backend configuration or activation.
