---
name: Production Owner continuity
description: Original Production Owner migration authority, separate Development identities, and user approval boundaries.
---

For Production authentication completion, the user requested reuse of completed
work and approval only for an irreversible identity migration or a necessary
manual MFA verification. Continue safe preparation, configuration and checks
without asking for general permission.

**Why:** The user explicitly requested this execution policy.

**How to apply:** Keep public Live unchanged until acceptance; stop at the actual
identity binding or user-held MFA step, not at routine technical preparation.

The original active Production administrator and the verified Development Owner
have different canonical identities. A verified Development Gmail is suitable
for a clearly labelled delivery diagnostic, not automatic proof of ownership of
the Production administrator.

**Why:** Fresh read-only Production role evidence and the existing Development
identity links did not match. Development Clerk credentials cannot independently
read the managed Production directory.

**How to apply:** Preserve the original Production business ID and exact role
record. Require explicit confirmation of the intended Gmail binding before
creating a target identity. Never silently promote the Development account,
infer roles from email, or claim original Production native MFA was inspected.
Leave source accounts and authenticators intact. New isolated-provider MFA
enrollment is not permission to reset or disable the source factors.

The user has explicitly approved linking the original Production Super Admin
to the Gmail already verified on their Development Owner account. That explicit
operator approval authorizes this binding; email similarity does not.

**Why:** The user selected “Approve the identity migration and Gmail binding.”

**How to apply:** Do not ask for the same binding approval again or create another
Owner. Reconcile the existing approved target before proceeding. Original source
accounts and factors, public Live and DNS remain outside this approval.

A non-empty native password hash is not proof that the Owner chose or knows a
password.

**Why:** Supabase returned a password hash after an administrator-created identity
without a supplied password.

**How to apply:** Distinguish hash presence from accepted password setup. Require
the real email recovery/setup flow and user-held MFA; never authenticate as the
Owner using generated credentials or mark initial setup complete from hash presence.
