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

The owner-visible Staging API service setting is the canonical existing
credential. Preserve it when synchronizing the linked group and Vercel Preview
secret; never silently replace it with an older group value.

**Why:** The owner could not find the group-only code on the service's variable
list. Later, the service's overriding code differed from the group/frontend:
frontend-signed CSRF tokens were rejected by the API with a misleading origin/
CSRF message. Render's direct setting takes precedence and is the value the owner
retrieves. Unsynchronized copies break authentication even before code comparison.

Staging gate form GET and POST must terminate on the same Vercel function and
trusted HTTPS Preview origin. Do not send Staging entry through an external
Render rewrite. Production retains its separate existing route and behavior.
Still require exact HTTPS Origin, signed double-submit CSRF and secure host cookies.

**Why:** Cross-provider entry unnecessarily couples the browser's form/cookie
issuer to Render's separately configured origin and overriding secret.

**How to apply:** Keep authenticated API requests routed to the existing Render
API with matching Staging signing credentials. Reuse valid bounded CSRF cookies
across tabs; do not replace another tab's live form token or extend its lifetime.

Use `same-origin` Referrer-Policy on the Staging gate while retaining strict
HTTPS Origin validation. Do not combine a required non-null Origin with
`no-referrer` on a native HTML form.

**Why:** Chrome navigation-mode form POSTs can emit `Origin: null` under
`no-referrer`, even for same-origin submissions. Manual HTTP and ordinary fetch
tests do not reproduce that behavior, so they can pass while real mobile login
is rejected. Production's existing policy and opaque-origin handling stay unchanged.

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
