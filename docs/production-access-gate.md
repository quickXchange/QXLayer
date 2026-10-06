# Temporary Production access gate

This gate is separate from Clerk. Passing it permits the browser to load the site;
it never signs a user in, creates an account, or grants tenant/admin rights.

## Production setup (do not publish until explicitly approved)

- Create the **Production secret `PRODUCTION_ACCESS_CODE`** with a long, random,
  non-reused access code. It must be available to all three services (main website,
  tenant websites, API). Do not prefix it with `VITE_`.
- The gate is enabled automatically under `NODE_ENV=production`.
- Missing code fails closed with a private-access-unavailable screen / HTTP 503.
- No code or code hash is included in browser bundles, HTML, or API responses.
- The two websites now run a small Node file server rather than ungated static
  hosting. Their existing builds, SPA routes, assets and design are preserved.
- Only exact GET/HEAD liveness responses are exempt: `/api/healthz`,
  `/__qx_access/healthz`, and `/private-label-website/__qx_access/healthz`.
  They return `{"status":"ok"}`, no application data. All website routes, static
  files and application APIs require the access cookie; Clerk still applies
  afterward where appropriate.

## Session and security

- Successful form POST issues a `__Host-qxlayer-access` cookie with `Secure`,
  `HttpOnly`, `SameSite=Strict`, `Path=/`, and no Domain/Expires/Max-Age.
- The cookie contains only a signed, random, expiring authorization token, not
  the access code. All services validate it with a domain-separated signing key.
- Browser session lifetime is bounded by a 12-hour server-side validity period.
  Browsers that restore session cookies may restore access within that period.
- Changing the code invalidates existing sessions when services receive the new
  secret (restart/republication is required for environment changes).
- POSTs require a signed anti-CSRF form token and its matching HttpOnly cookie.
  Non-opaque Origin headers must match the public request host. Sandboxed
  Development previews may send `Origin: null`; they still require the same
  signed cookie/token proof. Redirect destinations are local paths only. All
  protected responses use no-store.
- Ten validation submissions per connected peer per 15 minutes, plus an aggregate
  cap of 100 per process per 15 minutes. No trust is placed in client-controlled
  forwarded IP headers. With a shared reverse proxy, peers may share the lower
  limit. Counters are process-local, reset on restart, and are not a distributed
  abuse-control system. No database or external storage was added.

## Development and verification

Development remains ungated by default. To explicitly test the complete gate in
the workspace, set the non-secret Development variable
`PRODUCTION_ACCESS_GATE_ENABLED=true` and create a Development-only
`PRODUCTION_ACCESS_CODE` secret, then restart the API and both web workflows.
Use the HTTPS Development URL. Remove the Development toggle after testing.

The Development-only `/__qx_access/preview` page previews the branded, fail-closed
screen without a configured code. It does not grant access and is not registered
in Production.

Automated checks use randomly generated disposable test values, no real secrets,
no accounts and no database:

```sh
node --test lib/production-access-gate/gate.test.mjs
```

After public launch, explicitly setting the non-secret Production variable
`PRODUCTION_ACCESS_GATE_ENABLED=false` disables this temporary gate. Do not
remove the code secret alone: that would fail closed, not reopen the website.
