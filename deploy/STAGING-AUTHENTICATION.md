# Existing Clerk Development instance on isolated Staging

This is configuration preparation, not deployment or service-start approval.
Do not create applications, change managed Clerk settings, rotate keys or use
live credentials. Replit and Production retain their existing authentication.

## Saved external configuration

- Render's existing Staging-only environment group has the unchanged workspace
  Development key pair, `QXLAYER_EXTERNAL_ENVIRONMENT=staging`, and a pinned
  `QXLAYER_CLERK_DEVELOPMENT_HOST`.
- Vercel's existing isolated project has Preview-only frontend configuration.
  The secret key is not installed on Vercel or included in frontend packages.
- Development authentication uses its normal Frontend API, without the
  Production proxy. `VITE_CLERK_PROXY_URL` is empty.
- Render services remain suspended, automatic deploys remain disabled, and
  `QXLAYER_EXTERNAL_STARTUP_APPROVED=false`.

## Preserving roles without changing records

The restored business database retains its original identity references.
Development and Production Clerk users are separate; do not copy users or assume
that matching emails prove identity equivalence.

`QXLAYER_STAGING_IDENTITY_BINDINGS` is a server-only JSON map of explicitly
approved existing Development user IDs to preserved application actor IDs.
It starts empty. An unbound authenticated user is denied access rather than
receiving another user's records or roles. Bindings must be one-to-one.

Authentication, private operator previews and the user directory resolve the
same canonical application ID. Existing Super Admin, tenant memberships,
permissions, ownership, audit IDs and RLS actor references stay unchanged.
Outside the explicitly selected external Staging environment, bindings have
no effect. Never populate this map from email matching, browser input or
user-editable metadata.

## Remaining prerequisites

1. Approve the exact Development identity bindings, including the operator.
2. Select an exact Vercel Preview HTTPS origin. Then set Render's
   `CLERK_AUTHORIZED_PARTIES`, `QXLAYER_PLATFORM_URL` and platform host settings
   to that origin; no wildcard or Production URL substitution.
3. Synchronize the tested code to the Staging branch before any approved release.
4. Obtain separate approval before deployment or service activation. Verify
   hosted sign-in and tenant isolation afterward; local tests are not proof of
   hosted acceptance.

## First deployment and the Preview-origin dependency

An undeployed Vercel project does not have a generated Preview URL. Its default
project domain is a Production alias, not evidence of a Preview origin. Do not
invent a deployment hash, substitute the Production alias or allow wildcard
authorized parties.

The safe first release is a separately approved, access-gated Vercel Preview
only. Capture its exact provider-returned URL, then save that origin to the held
Staging API settings. Keep Render suspended and startup approval false throughout
this bootstrap. API activation, paid compute and hosted login testing require
additional approval. No DNS changes are needed.

If the GitHub connection cannot modify workflow files, report that limitation.
Application-source synchronization must not be described as a complete workflow
sync. Do not alter or dispatch existing release automation as a workaround.

The configure script is fail-closed and save-only for the pinned existing
targets. It refuses Git-linked/deployed Vercel projects and Render groups with
additional services, active services, enabled autodeploys or auth overrides.
It verifies no new deployments and does not call deploy/resume endpoints.
Do not change these pins to another environment as a shortcut.
