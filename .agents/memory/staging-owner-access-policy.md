---
name: Staging owner access policy
description: Owner credential delivery, persistence and real-form acceptance for the private Staging gate
---

Provide owner access instructions through authenticated Staging provider settings,
not by printing codes in chat, logs, source, URLs or downloadable credential files.
Preserve the owner's dedicated Staging credential across redeployments; never use
Production access credentials as a fallback. The private gate remains mandatory.

**Why:** The owner encountered an invalid-code gate despite earlier tests passing
with temporary test access, and requested secure, persistent Staging-only access
without Production, DNS or existing Clerk permission changes.

**How to apply:** Give a direct authenticated link to the existing Render Staging
API's Environment settings, not generic navigation instructions. Verify the
connected account's active workspace membership and secret-viewing role.
Keep server-side frontend/API configuration synchronized; never alter Production
or Clerk permissions to solve gate access.

Maintain an owner-visible copy on the Staging API service while retaining the
linked group as the canonical credential. Rotation must synchronize the group,
API service override and Vercel Preview secret.

**Why:** The owner could not find the group-only code on the service's variable
list. Render lists inherited and direct variables separately, and direct service
values override group values. Unsynchronized copies would break future rotation.

Verify the actual browser form from a fresh context and then reload and open the
website/owner console. A bridge that injects a pre-unlocked gate cookie is not
owner-access acceptance.

**Why:** Injected cookies can conceal invalid form credentials, CSRF failures or
missing browser persistence even while protected routes return HTTP 200.

The test transport must preserve redirects for the real HTTPS browser rather than
following them itself over HTTP loopback. Retrieve test credentials in the
automation's Node-side request context, not with a network call from the gate page.

**Why:** The gate deliberately disallows browser connections via CSP. A redirect-
following loopback transport drops Secure-cookie continuity and can report a
locked GET 200 as the valid POST response, even when the actual server returns 303.

Provider secret list metadata is not reliable plaintext readback. Use an authorized
individual decrypted-value readback and compare in memory without logging values.

**Why:** Vercel's individual response uses a boolean decryption-status field
separate from its secret value; metadata/list comparisons can falsely imply drift.
