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

Admin approval triggers automatic preparation of a linked sandbox Exchange; submission alone never releases it. Release to the customer's existing account happens automatically only after required setup and activation are valid. An approved custom design must be marked Ready by the operator before delivery; approval does not generate the design.

**Why:** The user chose after-admin-approval automation while retaining the required setup safeguards.

**How to apply:** Never expose a pending linked tenant through customer membership or its public site. Keep approval, setup and delivery distinct states even when the handoff runs automatically.

General client setup completion is not proof that an Exchange is ready. Check actual Exchange assets, available networks, requested actions, routes and pricing before advertising readiness or offering activation. A metadata-only configuration row is not a provisioned Exchange.

**Why:** A customer Exchange was shown as Ready after only generic setup, while activation rolled back at delivery because no operational Exchange configuration had been saved.

**How to apply:** Use the same operational readiness checks in the client page and activation path. Show actionable missing setup without weakening delivery safeguards or inventing customer routes/rates. Optional integration previews must remain independent.

White Label Orders are the existing White Label requests, not a separate ordering system. My Orders contains all lifecycle states; My White Labels contains only provisioned/delivered projects.

**Why:** The user explicitly requires pending, reviewing, rejected and cancelled requests to remain in My Orders, and asked to extend—not rebuild—the existing workflow.

**How to apply:** Preserve existing records, authentication, the completed Exchange, the public website and same-account Admin Panel delivery when extending ordering.

Requested plans, add-ons and custom designs express customer intent; they do not automatically grant entitlements, charge money or implement designs. Unconfigured fees must remain “Requires review.”

**Why:** The user requires existing-catalog indicative pricing followed by Super Admin review and final pricing, with no invented prices or automatic custom-design generation.

**How to apply:** Retain the original requested configuration alongside operator-reviewed selections. Internal notes must never reach customer responses; notes and status history are append-only.

The platform creator's existing account has permanent Platform Owner/Super Admin access. This is real persisted authorization, not a visual fixture or temporary test grant.

**Why:** The user explicitly requested permanent ownership on their existing account, with no replacement account, password change, role mocks or temporary permissions.

**How to apply:** Never remove the owner's grant during test cleanup. Cleanup may remove only disposable grants introduced by that test. Confirm the exact existing identity before ownership changes; do not guess from recently created accounts or use a generated test identity as the owner.

Owner recovery must not require the user to use Shell or execute SQL manually.
The supported visual Production database editor is an alternative for an
authorized project owner, after matching their successfully authenticated Live
account to the correct Production Clerk user record. A copied user ID alone
does not prove account control.

**Why:** The user explicitly required verified identity before any privilege
grant and a no-Shell/no-manual-SQL recovery process. Agent Production queries
remain read-only; publishing approval does not authorize owner-record writes.

**How to apply:** Separate identity verification, approval of the single
persisted owner mapping, and the authorized visual editor action. Keep all
other Production data unchanged. Do not promise Agent can press Publish or
operate the editor, and do not add a recovery endpoint or startup grant to
bypass the limitation.

The owner-facing Clients section is customer-account management, not a tenant/project directory. White Labels is the separate project-management section.

**Why:** The user requires actual customer-focused Clients and truthful customer metrics; tenant count must not be presented as customer count.

**How to apply:** Keep account and project concepts separate when extending owner management. An account can exist without an order or project, and historical linked identifiers are not proof of a current registered account.