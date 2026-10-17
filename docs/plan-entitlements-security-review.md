# Plan-entitlement release security review

The release adds service-specific grants, customer-safe projections and a
Super-Admin-owned public pricing snapshot. It does not authorize financial
execution, worker activation, DNS changes or public cutover.

## Static scanner triage

The managed static scan reports ten critical SQL-injection findings in
`scripts/external-postgres/verify-target.mjs`. Each flagged query uses literal SQL
with positional parameters. The module is an operator-only, read-only schema and
permission verifier; it is not an Express handler and accepts no HTTP SQL input.
The configurable policy role is constrained to a fixed allowlist. These are
reviewed false positives, not ten confirmed exploitable application endpoints.
The scan findings remain visible rather than being hidden with suppressions.

The five medium findings are separately bounded:

- Tenant redirect: the destination is an application-owned artifact route and
  the tenant slug is URI-encoded; there is no user-controlled origin.
- Two QA HMAC-SHA1 uses implement RFC-compatible TOTP, not password hashing or
  general-purpose collision-resistant signatures.
- Vercel SHA1 is the provider's required content-address upload identity, not
  credential encryption or an authorization mechanism.
- The temporary access-gate cookie is generated server-side from a keyed proof
  and expiration. A supplied request cookie is not adopted as an account session.
  The gate remains separate from native authentication, MFA and tenant delivery.

## Required acceptance evidence

- Fresh dependency, static and privacy scans; report raw findings and triage.
- Encrypted pre-DDL target snapshot; additive migration checksum and rollback rehearsal.
- Existing account, catalog, tenant and RLS/grant fingerprints unchanged.
- Non-bypass runtime role denies customer pricing-publication writes and allows
  authenticated Super Admin publication through server-established context.
- Native candidate browser tests with disposable accounts only; remove those
  accounts, factors, sessions and any temporary provider-protection access.
- Public Live/DNS, candidate protection, vault custody and held workers preserved.
