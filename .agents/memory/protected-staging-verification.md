---
name: Protected Staging verification
description: Authorized browser access is separate from deployment API access; preserve protection and role boundaries.
---

A working Vercel API connection does not itself establish a browser SSO session
for a protected Preview. Do not treat uploaded asset verification as signed-in
visual verification.

**Why:** Vercel's documented automated testing route requires an automation
credential. Its CLI may generate one automatically if none exists, which is a
security-credential write rather than a read-only access check.

**How to apply:** Reuse existing authorized access when available. Under a
no-permission-change restriction, ask before creating an automation credential.
Never disable protection, add public domain exceptions, alter app roles or
create test memberships to make visual testing pass.

Use direct HTTPS browser requests for protected form navigation, with the
approved automation header attached only to the exact Staging origin.

**Why:** Intercepting a loopback response produced Chromium `form-action 'self'`
refusals even when the actual Staging POST returned a valid same-origin 303.
Direct requests completed the existing password gate and owner sign-in without
changing CSP.

**How to apply:** Keep credentials in Node memory, use exact-origin
`route.continue` rather than loopback `route.fulfill`, and preserve native
cookies/redirects. Do not weaken CSP or inject an unlocked gate cookie.

Fresh automation access can initially redirect to Vercel SSO before being
accepted at the deployment edge. A bounded HTTP diagnostic observed initial
302 SSO responses followed by a same-origin 307 establishing `_vercel_jwt`
and then the normal Private Access form.

**Why:** An initial rejected automation probe can move a browser off the
Staging origin into provider SSO; that is not the application's auth loop.

**How to apply:** Establish the provider's normal bypass-cookie handshake using
the approved exact-origin automation header and `x-vercel-set-bypass-cookie`.
Keep credentials in memory, wait for a bounded successful access probe, then
let the browser follow genuine same-origin redirects. Revocation and existing
protection readback remain required. This does not verify Clerk login.
