# QXLayer Live repair status

## Prepared in the workspace; not published

- Client Website: deduplicate React Query across shared workspace hooks and
  the website provider. The previous production bundle contained two
  QueryClient contexts; the rebuilt bundle contains one.
- Landing Page: publish the 15 current public marketing definitions with the
  API code, only for an entirely empty Production catalog. Existing rows
  remain authoritative, including intentionally hidden products. No database
  error is swallowed; no account, tenant, plan or operational record is
  created. Source is reported in a response header and logged.
- No visual components, Clerk accounts, authentication rules or database
  schemas were changed.

## Live investigation

- Published deployment has a successful build; `/api/healthz` returns 200.
- Production contains zero Platform Admin mappings, zero landing products
  and zero tenants.
- Live logs show public catalog requests succeeding, client website render
  failures, and Clerk client/environment proxy requests returning 200.
- A Clerk sign-in returned 422. Its precise rejection reason and the owner's
  verified Production identity could not be established from those logs.
- Canonical Clerk proxy and provider wiring matches the installed project.
  No managed credentials were read, replaced or rotated.
- Anonymous direct Live requests beyond health are denied by the existing
  Production access gate. The gate has not been removed or bypassed.

## Verification

- Workspace typecheck passed.
- API server, main platform and client website production builds passed.
- Catalog contract and source-selection regression tests passed.
- Existing Production-mode isolated demo tests passed with no database access.
- Correct client demo preview route renders NovaX without a render error.
- Publishing schema diff contains no statements and no destructive changes.

## Still blocked or approval-dependent

1. Publication: the catalog and demo changes will not affect Live until the
   user approves and publishes them.
2. Platform Super Admin restoration: requires independently verifying the
   exact existing Production Clerk identity and restoring its persisted
   Platform Admin mapping through a supported authorized Production writer.
   Agent managed Production SQL is read-only; another approval does not
   unlock it. No identity has been guessed and no role granted.
3. Database-backed operator catalog editing and other missing operational
   configuration are not restored by presentation-only marketing content.
4. Post-publication verification and signed-in owner verification remain
   pending. Preview/build success is not a claim that Live is already repaired.

No database was deleted, overwritten or initialized. No publication occurred,
and the user was not asked to run Shell commands or SQL.
