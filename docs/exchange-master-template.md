# Shared White Label Exchange master

## Scope

The current approved NovaX Exchange presentation is the `standard-exchange`
master. There is one tenant website renderer, not a frontend fork per customer.
Keep its layout, sections, Exchange actions, responsive behavior, animation and
spacing. Tenant names, raster logos/favicons, colors, theme, content and Exchange
operations are configuration, not copied source code.

This work is Development only. It does not publish, connect DNS, confirm real
payments, generate wallets, submit blockchain transactions or connect providers.
NovaX remains an existing demonstration; its demonstration credentials and access
restrictions must not become defaults for customer tenants.

## Order preparation and handoff

The existing operator approval transaction locks the original order, prepares
one draft tenant, applies collected branding/settings, assigns the selected plan
and add-ons, and stores the tenant link on that order. Existing drafts and
delivered customer assignments are not rewritten.

Company/brand identity and website name are distinct. A missing website name
uses the collected brand name. The existing customer form, order review and
tenant Website settings expose the name; the public header and document title
use it. The operator still completes operational configuration. Existing
readiness checks, custom-design review, delivery and permanent owner access
remain required.

Only an order's selected logo/favicon is available at a curated public branding
endpoint after delivery and tenant activation. It must belong to that order and
its original customer, have the matching upload category, and remain selected
in current tenant branding. Requirements, design references, original attachment
download endpoints and object keys remain private. Branding responses are
uncached and use declared raster types with `nosniff`.

## Defaults and integration boundary

Website defaults contain generic sandbox content, never a customer's identity.
Exchange defaults create fresh objects and fresh route/payment-method IDs from
the selected catalog. They contain no customers, orders, staff or history.
Illustrative 1:1 rates, zero fees and bounded example amounts are explicitly
sandbox defaults, disabled until reviewed. Plans/actions/quotas still constrain
saves and activation.

Existing provider controls and optional API/webhook/RPC previews remain
configuration-only. The server-only integration contract defines exchange,
rates, payment, RPC, webhook and deposit adapter scopes and the states
`not_connected`, `connected`, `error`, `disabled`, `configuration_only`.
Credential envelopes use AES-256-GCM authenticated to tenant, integration kind
and provider. A future adapter must obtain versioned server-side keys through
the secrets system and persist only encrypted envelopes in private tenant
storage. The public summary never includes credentials or ciphertext.
No live adapter, credential intake, key-management service or verified
connection is enabled by this preparation.

## Development verification trigger

Run from the workspace root:

```sh
NODE_ENV=development pnpm --filter @workspace/api-server run provision:master:dev -- <test-order-id> <existing-super-admin-user-id>
```

The order must be a standard Exchange request with a selected plan and details
starting with `DEVELOPMENT MASTER TEST:`. The trigger requires an existing
Super Admin and explicit Development mode. It does not impersonate a customer
payment or accept arbitrary production orders. It serializes retries per order,
uses order preparation and tenant-isolated catalog defaults, then runs the
unchanged activation/delivery checks. Delivered retries reuse the tenant.

```sh
NODE_ENV=development pnpm --filter @workspace/api-server run verify:master
```

The verifier creates two disposable orders/tenants with distinct uploaded
logos, names, colors and themes; checks owner access, separate configuration,
empty history, defaults, retry safety and credential scope; and removes its
uploads, orders, tenants, plan, synthetic actors and audit data. Browser fixture
options `--keep` and `--cleanup` are for one controlled verification pass only.
