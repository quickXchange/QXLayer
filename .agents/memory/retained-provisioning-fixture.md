---
name: Retained provisioning-review fixture
description: Retention and scope rules for the fictional Asterlane Development customer order.
---

Keep the fictional Asterlane Development provisioning-review customer, order,
its isolated temporary test plan, branding uploads, and any tenant the user subsequently provisions until the
user explicitly asks for removal. Do not automatically advance its lifecycle
or clean it up as a disposable browser-test fixture.

**Why:** The user explicitly requested a retained Development-only order so
they can personally review, approve, provision, configure, preview and deliver
it, and inspect same-account customer access afterwards.

**How to apply:** Treat Asterlane as an intentional manual-inspection fixture,
not legitimate Production customer data. Never publish or transfer it to
Production, alter real customers, or create a frontend copy. Preserve the
existing shared Master Exchange and leave lifecycle decisions to the user.
Do not modify existing shared or real plans to satisfy this fixture's requested
actions; its test entitlements must remain isolated in its own Development plan.
