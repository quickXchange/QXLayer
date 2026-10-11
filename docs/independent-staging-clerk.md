# Independent Staging Clerk, with Production unchanged

The current management readback is `managed`, dashboard access `authorized`.
Replit's documentation lookup does not offer an in-place ownership transfer.
Deleting the managed application is not an acceptable migration method.

## Implemented preparation boundary

Use a separate Clerk account/application owned and recoverable by the operator,
with a Development instance for Staging only. This does not replace Production
users, rotate Production keys, change live login methods, or mutate Production
authentication. It is not a claim that Production authentication is independent.

The owner must establish the independent account, MFA/recovery and candidate
Development credentials. Existing managed API keys do not authorize creating
an independently owned account. No paid plan is required by this preparation.

Provision one candidate owner identity in that independent Development instance.
Prepare an explicit one-to-one binding to the existing Staging business owner
subject; never grant Super Admin from email, sign-up order or fresh account status.
Do not copy Development identity changes to Production.

`prepare-independent-clerk.mjs` checks Development-only keys, a different frontend
host, confirmed owner custody, unchanged business authorization, and that the
candidate identity exists. It performs only provider reads and writes a sanitized
local receipt. Candidate keys stay in secure secrets; no source or receipt stores
them. Tests reject Production, live keys, managed reuse and changed permissions.

## Separate Staging-only activation after candidate acceptance

1. Retain existing Staging auth configuration securely for rollback.
2. Test candidate login and mapped owner authorization on an isolated Preview.
3. Configure matching candidate keys/host and only the explicit owner binding on
   the pinned Staging Render group/service and frontend build.
4. Rebuild/release Staging only; verify gate, login, logout, sessions, customer
   tenancy and denied unauthorized access using the real hosted origin.
5. Update protected Staging CI public Clerk settings only after acceptance.
6. Roll back Staging auth/build if verification fails. Do not touch Production.

No activation is performed by the preparation command. Production ownership
requires a separate supported identity-preservation design; this candidate alone
does not transfer Production users or passwords.
