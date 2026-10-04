# White Label Core — pre-change audit

The user explicitly reprioritized the permanent platform core over website visual approval.

## Reuse

- Shared Express modular monolith, PostgreSQL/Drizzle, generated OpenAPI clients.
- Clerk identity plus operator-assigned Super Admin and tenant memberships.
- Server-enforced plan → additive add-ons → replacing override resolution, exact decimal arithmetic, quota locking, suspension denial.
- Shared tenant creation/configuration services and persistent provisioning progress.
- Branding and website settings, font/favicon/theme/support/social/legal configuration.
- One shared branded website, non-executing Exchange sandbox.
- Runtime restricted role, transaction-local actor/tenant context, FORCE RLS and audit writes.
- API credential one-time issuance/hash-only storage/revocation, webhook endpoint configuration with delivery explicitly deferred.

## Gaps to strengthen

- Resolver enumerates six products; dependencies enumerate Exchange/merchant features.
- Product catalog does not carry lifecycle, dependencies or configuration requirements.
- Staff have a fixed read-only role; scoped permission grants are absent.
- Domain constraint allows only unverified records; no ownership check exists.
- Website navigation is derived exclusively from fixed capability links.
- Provisioning omits an explicit add-on/override review and website-settings step.

## Boundaries

No replacement of existing working components, no copied tenant codebases, no new crypto execution,
no publication, no QuickXchange changes. Registration/entitlement is not implementation or execution.
Operational production readiness must be reported separately from development verification.