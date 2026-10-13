---
name: Supabase Staging authentication boundaries
description: Parallel trial preservation, modern server-key scope verification and disposable Auth verification.
---

Run Supabase authentication as a parallel, explicitly Staging-only trial while retaining Clerk as the default and preserving its existing frontend origin, accounts and keys. Use isolated encrypted server-side sessions and explicit dual-proof identity links; never link by matching email.

**Why:** The user authorized completing and testing Supabase Auth in isolated Staging while expressly retaining Clerk, Production, DNS, QuickXchange, existing IDs, business data and permissions.

**How to apply:** Do not infer auth activation from the database/storage provider or from a production build mode. New Staging auth configuration and disposable fixtures are authorized, not Production activation or identity reassignment. Verify exact pre/post business-data and permission fingerprints and remove only tracked disposable subjects.

Modern Supabase server keys are opaque, not JWTs. A failed JWT decode does not establish that a key belongs to another project. Do not place an opaque server key in a Bearer JWT header.

**Why:** The existing isolated Staging server key was initially rejected by a legacy JWT-ref guard, but the pinned project configuration and a read-only Auth admin capability check established the correct scope.

**How to apply:** Read only approved Staging configuration, validate its exact pinned Supabase origin, and make a bounded read-only request to that origin with the apikey header. Never substitute a root/shared key that has not passed the same scope check or expose server keys to the browser.

Supabase-generated confirmation/recovery email delivery through Resend test recipients proves the actual sending flow, not delivery to a real customer inbox.

**Why:** The user asked for actual Staging Auth flow verification; direct simulated SMTP delivery alone did not prove signup or recovery.

**How to apply:** Verify actual provider-generated email content and delivery, consume its native confirmation/recovery link, and report the test-recipient limitation. Preserve temporary fixture scope and restore any temporary mail-quota adjustment.

Keep disposable test-email local parts within the SMTP limit of 64 characters.

**Why:** A full UUID plus descriptive role made the first sample exceed the limit. Native signup failed with a provider error before creating a user; short planned addresses subsequently passed without any SMTP credential change.

**How to apply:** Use a short random label and persist the exact full planned address before signup. Check recipient validity before treating a sending failure as a broken provider credential or rotating working keys.

Report authorization tests with simulated sandbox readiness separately from real customer provisioning, delivery or commercial readiness.

**Why:** Draft fixtures correctly hit existing delivery guards before tenant reads. Explicitly approved, access-ready disposable fixtures proved tenant isolation, but did not prove product execution or fulfillment.

**How to apply:** Prepare only scoped, approved fixtures to meet the actual authorization prerequisites; never weaken application guards to satisfy a test. Keep execution/providers disabled and subscriptions unassigned when testing authentication alone, then remove the exact fixtures and verify preservation.

For real owner migration checks, the owner completes inbox confirmation, recovery and fresh existing-account proof privately in the native Staging UI. Do not request or expose passwords or other secrets.

**Why:** The user explicitly requires real-inbox checks and preservation of their owner ID and Super Admin permissions, without sharing secrets or replacing Clerk.

**How to apply:** Verify bounded server-side metadata against a pre-action owner/business baseline. Provider delivery events are not inbox receipt, and an administrator-issued impersonation session is not independent owner proof. Ask for nonsensitive outcomes only; do not report incomplete owner participation as a passed end-to-end test.

An unrecognized masked account hint does not establish that the owner lacks access. Identify the exact verified Staging account before requesting its native authentication.

**Why:** The owner recognized their existing account only after the full Staging identifier was provided. Earlier role-based selection established permission continuity, not personal custody.

**How to apply:** Use a bounded, authorized Staging identity lookup when identification is needed. Do not store the email in memory, inspect Production to resolve it, or treat an inbox-ownership statement as fresh authentication proof.

A verified persisted identity link is not evidence that the current browser callback and sign-in journey work.

**Why:** The owner reported a failed linking sign-in after an exact server-side link readback had succeeded. Repeating or replacing that link would risk changing a correctly preserved identity.

**How to apply:** Reconcile the persisted selected-account link first, then independently verify native callback routing, same-origin cookie continuity, deliberate post-link sign-out and the already-linked UI. Keep changed-code harness evidence separate from unchanged hosted Staging acceptance when deployment is prohibited.

The user authorizes protected Staging authentication fixes only after tests pass, including mobile login and account-linking verification.

**Why:** The user requires full mobile-flow verification before Staging deployment, while prohibiting Production deployment, DNS changes and changes to Owner IDs, permissions or existing data.

**How to apply:** Keep Vercel Preview and Private Access protection intact, preserve existing identity links and session keys, and use disposable identities for automated native authentication tests. Do not substitute unit tests or persisted-link readback for mobile browser acceptance. Ask before creating protected-preview automation credentials under the no-permission-change restriction. Never turn this approval into Production permission or impersonate the Owner.
