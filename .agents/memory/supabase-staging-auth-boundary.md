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
