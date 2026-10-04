---
name: QXLayer customer account workflow
description: Customer identity, navigation and operator-controlled White Label handoff.
---

Customers use their existing QXLayer account and session for both their customer workspace and their delivered Exchange administration. Never create a second tenant/admin login.

**Why:** The user explicitly corrected the workflow: Register → Customer Account → Configure White Label → Submit Order → Super Admin receives/prepares/provisions → Admin Panel automatically appears in the existing account.

**How to apply:** Treat authenticated users without tenant assignments as legitimate customers, not blocked accounts. Customer navigation is Dashboard, My Orders, My White Labels, conditional Admin Panel, Profile/Account. Show Admin Panel only after a successfully provisioned, authorized Exchange exists; open one directly or show My Admin Panels for several. A membership alone is not proof of provisioning. Never expose another customer's tenant.

Only Super Admin reviews/approves requests, sets final pricing, provisions, assigns ownership, controls plans/entitlements, suspension/reactivation and global configuration.

**Why:** These are platform/operator responsibilities, not customer onboarding permissions.

**How to apply:** Keep customer requests separate from tenant administration and simulated Exchange trading orders. Suspension or a plan change does not undo the fact that an Exchange was delivered; preserve authorized read-only access, while enforcing current operational entitlements on writes.

White Label Orders are the existing White Label requests, not a separate ordering system. My Orders contains all lifecycle states; My White Labels contains only provisioned/delivered projects.

**Why:** The user explicitly requires pending, reviewing, rejected and cancelled requests to remain in My Orders, and asked to extend—not rebuild—the existing workflow.

**How to apply:** Preserve existing records, authentication, the completed Exchange, the public website and same-account Admin Panel delivery when extending ordering.

Requested plans, add-ons and custom designs express customer intent; they do not automatically grant entitlements, charge money or implement designs. Unconfigured fees must remain “Requires review.”

**Why:** The user requires existing-catalog indicative pricing followed by Super Admin review and final pricing, with no invented prices or automatic custom-design generation.

**How to apply:** Retain the original requested configuration alongside operator-reviewed selections. Internal notes must never reach customer responses; notes and status history are append-only.