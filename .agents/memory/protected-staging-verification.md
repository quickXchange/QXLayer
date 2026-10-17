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

A user-confirmed, signed-in Preview health response is valid manual connectivity
evidence, but not proof that an agent's temporary share-access handshake worked.

**Why:** The owner loaded frontend API health JSON through genuine Vercel SSO
while automated deployment-scoped access probes returned HTTP 401.

**How to apply:** Label manual and automated evidence separately. Do not widen
project access to replace a failed scoped probe, and revoke all temporary grants
even when verification finishes through the owner's existing session.

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

An application-gate JSON 403 is not a Vercel protection failure.

**Why:** An automated browser helper stopped after an origin-scoped provider
handshake returned `Production access required.` The request had passed Vercel
and reached the application's own gate; its default non-HTML Accept header
selected JSON instead of the native gate document.

**How to apply:** Identify the responding layer from its body and redirects.
After provider access succeeds, navigate a real browser page with its normal
HTML Accept header and submit the native app gate. Never weaken provider
protection because an API-style probe receives the expected app-gate 403.

When temporary access creation is authorized for routing checks, prefer
short-lived, deployment-scoped access over a persistent project-wide automation
credential. Revoke it in cleanup and confirm the deployment's access entry was
removed while project protection remains unchanged.

**Why:** Routing-only verification does not justify enduring access to every
protected Preview. Deployment-scoped access was sufficient to verify genuine
same-origin API proxy responses without changing application authentication.

**How to apply:** Follow the native same-origin cookie/redirect handshake. Do not
restart every request with the share parameter: its cleanup redirect can repeat
indefinitely rather than reaching the API. Keep credentials/cookies in memory.

## Immutable Preview origin rollover

An older protected Staging Preview can still render and accept its genuine
Private Access form while its shared API accepts only the newly approved
Preview's exact authentication origin.

**Why:** A previous Preview reproduced “Same-origin authentication request
required” after successful Private Access, while native mobile Chromium login
on the current Preview succeeded. Valid cookies do not authorize a different
document origin.

**How to apply:** Obtain the actual failing address-bar URL before changing
origin validation. Compare it with the API's pinned origin and the approved
deployment receipt. Do not allow all Preview subdomains, trust arbitrary
forwarded hosts, or remove CSRF checks to make old bookmarks work. Mobile
emulation is not proof of behavior on a physical Android device.

## Private review codes and Owner continuity

The acceptance site's Private Access code is independent of the Owner's account
password and authenticator. Reissues are candidate-only and delivered to the
already approved, verified Owner email; never put the code in chat, evidence
files or review URLs, or rotate the independent Public Live/Shared credential.

**Why:** The user requested a fresh review code while explicitly preserving
Super Admin access, protection, Public Live and DNS.

**How to apply:** Synchronize only the candidate runtime and Sensitive Preview
secret, redeploy the protected candidate, and preserve account/MFA settings.
Use the served form's actual action for HTTP diagnostics rather than assuming
the frontend and API entry paths match. A successful running-handler form POST
and cookie-authenticated catalog check are backend evidence, not proof that
automated Vercel SSO or a full frontend browser journey succeeded.

## Native form attribution and repeat submissions

Browser verification must observe the browser's own Origin and redirect chain,
including repeat submissions with an existing review session. Do not substitute
a manually supplied Origin for that evidence.

**Why:** A fresh-cookie HTTP probe with a supplied Origin accepted the review
code, but Android reported an origin error. The access page's `no-referrer`
policy could produce `Origin: null`, and an already-authorized entry POST could
fall through to unrelated account authentication. Credential validity alone
did not establish a working browser flow.

**How to apply:** Keep the protected form same-origin, retain signed CSRF and
exact-origin validation, and make entry POSTs terminate at the gate. Distinguish
build-time approval flags from function-runtime configuration; verify the
runtime inputs before relying on a flag to select security behavior.
