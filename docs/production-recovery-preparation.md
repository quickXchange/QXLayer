# Production recovery preparation — approval boundaries

No Production writes, migrations, data import, publishing, DNS, owner changes or
Production demo authentication are authorized by this preparation.

## Catalog initializer

Reviewed source: the 15 currently published platform marketing definitions,
verified against the existing canonical definitions. `kolo` is excluded.
Exact field manifest: `reports/qxlayer-approved-landing-catalog.csv`.
Empty price cells mean SQL NULL, not zero or an invented commercial quote.

Development commands:

```
pnpm --filter @workspace/scripts run catalog:initialize:dev
pnpm --filter @workspace/scripts run catalog:initialize:dev -- --apply
pnpm --filter @workspace/scripts run catalog:initialize:dev -- --apply --restore-visibility
```

Default is a read-only dry-run. Apply always runs a dry-run first, then uses one
transaction. Inserts are allowlisted and conflict-safe; existing copy and prices
survive. Hidden approved rows remain hidden unless visibility restoration is
explicitly selected. Unknown records survive. Missing module dependencies abort
instead of creating modules or any other configuration. There is no DDL.

The CLI refuses non-Development mode and Replit published deployments, including
a published deployment whose NODE_ENV was manually set to development. It accepts
no target URL or Production option. Do not remove these guards to perform recovery.
No apply was run against either real database during preparation; apply behavior
was tested with isolated in-memory fixtures.

An actual Production catalog repair needs separately approved row-level actions
and an authorized Production writer. The Agent's managed Production SQL channel
is read-only. No bootstrap endpoint or deployment-time data hook was added.

## Safe shared website diagnostics

Only `errorId`, `category`, and a deterministic source `buildId` are transmitted.
No route, tenant slug/ID, customer data, exception text, stack, response body,
credentials or secrets are transmitted. The public fallback is generic.
The API validates exact fields/formats, rejects extra fields and malformed JSON,
requires the existing same-origin and outer access-gate checks, and rate-limits
reports in bounded memory. Accepted reports emit a structured
`shared_website_error` log; no database writes or authenticated identities are
created. Diagnostic claims are untrusted observations, not authorization.

Production-safe builds of both the shared website and API must eventually be
published together to use this observability live. No Republish is authorized
by this document. A synthetic Development crash/privacy test is not proof of
the live NovaX exception.

## Production public sandbox demo — design only

The existing `/api/demo/session` remains strictly Development-only and unchanged.
Production would use exactly one explicitly designated sandbox tenant and the
existing shared Master website. No copied customer associations, orders, QA
history, temporary identities, shared editable Clerk account or provider secrets.

A separately reviewed `/api/public-demo/*` boundary would bind all requests to
the server-designated tenant; callers cannot choose tenant IDs. Admin presentation
would reuse current Exchange components through a read-only adapter.
If required, signed host-only Secure/HttpOnly/SameSite visitor cookies would
expire after 15 minutes, carry a distinct audience and policy version, and grant
no Clerk account or database membership. Support explicit disable/revocation,
same-origin checks and bounded rate limiting.

All domain operations are GET-only and allowlisted. Deny Super Admin, normal
customer/account APIs, other tenants, writes, order creation, memberships,
credentials, private customer/order information and provider/financial execution.
No public Production username/password login is proposed. Demo links must reflect
actual availability. Implementation and activation need separate approval.

## Owner access

The existing owner tests Private Access -> existing Production Clerk sign-in ->
`/api/me` -> `super_admin` -> `/admin`. No new owner or permission change.

## Schema inspection scope

Production inspection is schema-metadata SELECT only: tables, columns, indexes,
constraints, relationships and RLS policy definitions. No application records,
credentials, identities or secret values were selected.

The material discovered mismatch is `white_label_request_delivery`:

- Current code/Development: delivered implies a non-null tenant ID.
- Production: delivered if and only if the tenant ID is non-null.

Production therefore forbids the current preparation flow linking a tenant while
status is `in_setup` or `customization`. This mismatch needs a separately approved
schema recovery plan; no constraint or record was changed. Publishing must not be
assumed to repair it automatically.
