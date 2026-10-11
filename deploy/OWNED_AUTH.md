# VYNOX LAYER project-owned authentication — Development and Staging only

The application name, authenticator issuer and email subjects use VYNOX LAYER.
Existing `QXLAYER_*` keys and `qxlayer_auth` storage remain stable compatibility
identifiers; renaming them would invalidate integrations or existing credentials.

Normal sign-in uses Better Auth and private PostgreSQL storage, not Clerk.
Clerk remains available solely for proving ownership of an existing account
once during migration and for the unchanged Production authentication branch.

## Configuration

- API: `QXLAYER_AUTH_PROVIDER=owned`.
- Console build: `VITE_QXLAYER_AUTH_PROVIDER=owned`.
- `QXLAYER_AUTH_URL`: exact HTTPS console origin, without a path or query.
  Do not use the Production marketing URL for Development sessions.
- Existing strong `SESSION_SECRET` is used with a separate signing context.
  Do not reuse Production credentials in isolated Staging.
- Real mail delivery: `QXLAYER_AUTH_MAIL_FROM` and a sending-only
  `QXLAYER_AUTH_RESEND_KEY`, supplied through secure configuration.
  Without these, registration, verification-email requests and password
  recovery explicitly fail with `MAIL_UNAVAILABLE`. No public test inbox,
  automatic email verification or verification bypass is deployed.

## Storage and identity

The additive third migration creates only the private `qxlayer_auth` schema.
Its activation requires separate approval in the pinned Staging migration
runner, or the guarded Development setup script. Business data and existing
public-schema policies are not changed.

The restricted external application login gets direct private-schema grants,
not additional role memberships. Anonymous database roles have no access.
Identity links cannot be updated or deleted by that application login.

Existing-account enrollment requires a genuine active Clerk session created
within ten minutes and a verified primary email. It creates a new local
credential with a new password and links the unchanged business subject.
It never copies an old password, creates a new Clerk identity or grants roles
by matching an email address. Linking an existing owned account requires both
fresh verified sessions and refuses accounts with existing business records.

Super administrator access requires completed two-factor enrollment. Password
recovery revokes existing sessions and does not remove two-factor protection.
Account deletion and email replacement are deliberately disabled pending a
separately reviewed business-data and privileged-account recovery policy.

## Verification and rollout

Type checks, provider/origin guard tests, restricted-login database rehearsal,
and disposable auth-flow verification must pass before Staging activation.
The guarded auth-flow script uses an in-memory mail capture only in isolated
QA; it is not an API route or deployed verification workaround.

The Staging release builds the owned frontend only when the protected Staging
variable selects `owned`. After verifying that the Vercel deployment is a
READY Preview in the pinned project, origin binding reads back the API
provider and auth origin before the final API restart.

Forwarded IP headers are not trusted. The initial limiter conservatively
shares per-path buckets (five sign-ins per minute). Establish independently
verified ingress/IP handling before increasing concurrency; do not remove
throttling or accept arbitrary client-provided forwarded headers.

No Production authentication activation, data transfer, DNS change, plan
upgrade or Worker activation is authorized by this preparation.
