---
name: Supabase scoped inventory
description: Fine-grained organization credentials can inventory an approved organization despite account-wide listing denial.
---

An account-wide Supabase project or organization listing returning 403 does not
prove that an existing organization-scoped token cannot perform inventory.

**Why:** The retained provisioning credential denied global listings but allowed
the approved organization's details and paginated project inventory. This
resolved capacity inspection without requesting a broader credential.

**How to apply:** Reuse the known non-secret organization slug and documented
organization-specific GET endpoints. Read their pagination, plan and project
status; retain only sanitized metadata. Do not grant existing-project writes,
request a Legacy/account-wide token, or confuse read capability with permission
to provision, upgrade billing, pause an environment or activate authentication.
Organization-only inventory also does not prove unused account-wide free quota.
