# Permanent White Label Core

The administration layer stores real tenant configuration and access rights in one shared database. The customer website is one configuration-driven renderer. There are no client-specific codebases. Product execution remains deliberately separate and non-live.

This is the current handoff; the initial audit is in `white-label-core-audit.md`. The previous foundation and plans/website reports describe earlier phases.

## 1. Architecture map

```text
Clerk verified identity
  -> authentication/service: explicit operator/membership lookup
  -> scoped Principal -> transaction-local restricted runtime context
  -> shared API modules
       tenants / administrators / staff grants
       plans / add-ons / subscriptions / overrides
       product registry / dependency graph / product settings
       branding / website settings / navigation
       domain ownership / verified public-domain lookup
       resources / monthly meters / quota admission / audit
  -> PostgreSQL tenant rows + application-authorized scoped queries

One administration console -> the same typed OpenAPI API
One public website renderer -> allowlisted public tenant projection

products/exchange -> compatibility adapter + trusted settings validator
Future products  -> reviewed adapters + their own implementations
                     consuming the same tenant identity/rights/configuration
```

Authoritative core boundaries are under `artifacts/api-server/src/modules/`; product-specific code is under `src/products/`. The original tenant, pricing, order, payment, wallet/provider, credential, webhook and audit tables were retained. Existing plans, assignments, tenant IDs and module keys were not replaced.

The old exchange/payment configuration flags remain compatibility projections: they cannot grant an entitlement. Exchange's compatibility adapter is now in the product folder. Remaining payment compatibility fields and existing sandbox product skeletons are intentionally preserved rather than rewritten.

The manifest registry describes capabilities; trusted code adapters validate implemented settings. Registering metadata does not load code, mount endpoints, create a provider, or activate an engine. The current plugin interface is a configuration-validation extension point—not a financial engine SDK.

## 2. Generic registry

Each manifest has:

- An immutable unique module key, name, category and description.
- Lifecycle: `core_ready`, `sandbox_only`, or `deferred`.
- Sandbox availability and whether asset/network configuration is required.
- Features with dependency keys.
- Optional integer/decimal limit definitions.

Built-ins:

| Module key | Product | Boundary |
|---|---|---|
| `website` | Tenant website | Shared renderer and core configuration |
| `crypto_exchange` | Exchange, Swap, Convert, Buy/Sell | First non-executing sandbox product |
| `merchant_api` | API credentials / webhooks | Sandbox resource foundation; no merchant authentication or deliveries |
| `crypto_payments` | Crypto Payments | Deferred execution; legacy sandbox configuration retained |
| `crypto_card` | Crypto Card | Deferred |
| `staking` | Staking | Deferred |
| `earn` | Earn | Deferred |
| `dex` | DEX | Deferred |
| `telegram_bot` | Telegram Bot | Deferred |
| `telegram_mini_app` | Telegram Mini App | Deferred |
| `whatsapp_bot` | WhatsApp Bot | Deferred |
| `ios_app` | iOS App | Deferred |
| `android_app` | Android App | Deferred |
| `crypto_engine` | Crypto Engine | Deferred |
| `rpc_nodes` | RPC / Nodes | Deferred |
| `cloud_mining` | Cloud Mining | Deferred |
| `kolo` | Kolo | Deferred |
| `articles` | Articles / Content | Deferred |

Only Super Admins can register manifests through `/modules`. New entries must be deferred with sandbox execution unavailable. All entitlement keys must be globally unique; unknown dependencies, cycles and subfeatures without their parent module are rejected. Registration atomically creates the manifest, feature/limit definitions and audit event. Existing keys cannot be redefined through this API.

Plans/add-ons/overrides discover definitions from the database, so a future module does not require a new tenant schema or hard-coded module enum. A later implementation adds reviewed product code and integration-specific operations; catalog registration alone never makes it functional.

## 3. Client provisioning

The console reuses existing plan, subscription, branding, website and resource components.

1. Super Admin creates a draft client with unique name/slug and an enabled plan.
2. Review plan, products, add-ons, tenant overrides, limits and usage. Product selection is entitlement-driven, not a second independent grant list.
3. Set brand name/logo/colors/theme/languages.
4. Set favicon/fonts, public copy, support/social/legal content and website navigation.
5. Save an optional domain. Obtain its random DNS TXT challenge and check ownership when DNS is ready.
6. Select asset/network pairs required by entitled configurable financial modules, within limits.
7. Save legacy sandbox configuration and enabled products' non-secret metadata.
8. Assign a Client Admin using the account ID shared by a signed-in user. Only Super Admin may assign/activate/revoke Client Admins. Grant staff only the required scopes.
9. Review completeness and activate sandbox configuration if desired. This does not publish anything or enable real execution.

Each wizard save is a tenant-scoped transaction. Drafts and saved sections persist, and can be resumed from the client detail page. Tenant creation itself atomically creates branding/configuration/subscription rows. There is no per-client build or copied frontend.

Role assignment accepts an explicit Clerk account ID, not a first-signup assumption. It validates ID format and stores the grant; it does not query a remote identity directory to prove that the ID exists. The operator must use the intended user's displayed account ID.

Navigation supports ordering, renamed labels and visibility for existing renderer links. It cannot expose an unentitled capability. The Telegram navigation key is reserved but has no current public route, so configuring that key does not implement a Telegram channel.

## 4. Entitlement resolution

For each request:

1. Missing features start denied; missing limits start at zero.
2. Load the assigned database plan.
3. Merge enabled tenant add-ons additively: feature grants are OR-ed and limit increments are added with exact decimals.
4. Apply replacing tenant overrides, with operator reasons.
5. Resolve manifest dependency denials transitively. An enabled subfeature cannot bypass a denied parent.
6. Apply tenant/subscription suspension: deny capabilities and configuration mutations.
7. Derive enabled modules from the registry and effective feature map.
8. Calculate actual resource usage and current-month meters; compare limits before admitting operations.

Disabling/archiving a plan or add-on prevents new assignment without silently removing existing client assignments. Plan pricing remains commercial metadata—not automated billing.

Resource admission locks the tenant within the write transaction, preventing concurrent requests from oversubscribing staff/keys/webhooks/assets/network limits. Existing transaction count/volume meters and `recordMonthlyUsage` for future trusted modules use the same resolution/admission path. Future product code must record metered usage in the same transaction as its admitted write. No public endpoint lets clients self-report counters. Monthly periods use UTC.

## 5. Security verification

Automated development verification:

```sh
pnpm run typecheck
pnpm --filter @workspace/api-server run verify:foundation
```

The expanded suite verifies:

- Distinct plans and tenant-specific rights; missing-feature denial; additive add-ons and replacing overrides.
- All eight existing quota boundaries, exact decimals, monthly meters and concurrent admission.
- Application cross-tenant denial, unassigned-user denial, composite foreign keys and sandbox constraints.
- No database RLS or custom-role dependency; read-only transactions reject mutations.
- New registry/configuration tables' restrictions, deferred-only registration, uniqueness and dependency validation.
- Product settings persistence, cross-tenant denial, secret-field rejection and parent-feature denial.
- Staff grant/revocation, own-tenant branding edits, forbidden domain edits and forbidden membership escalation.
- Super Admin-only Client Admin assignment and revocation.
- DNS challenge matching, unverified-domain denial, changed-domain challenge reset, and suspension hiding a formerly verified domain.
- Dynamic module monthly meter admission and transaction rollback on rejection.

DNS ownership tests inject an isolated fake TXT lookup; they do not claim a real customer domain was verified.

The signed-in browser pass verified registry registration/reload, the provisioning wizard, branding/navigation persistence, domain challenge/error handling, entitled product-settings persistence, Client Admin assignment/revocation, staff-grant persistence, sandbox activation and entitlement-filtered public navigation. Only disposable fixtures were used; existing clients/plans/users were not modified.

The tester flagged an unsupported `?tenant=` URL supplied in the test instructions. The actual website contract is `/private-label-website/<slug>`; manual slug entry navigated there correctly, and a separate screenshot of that canonical URL confirmed the branded page and saved navigation without application changes. Counts animate from zero only after entering the viewport; their target values derive from actual configured assets/networks/capabilities, not simulated activity.

Runtime queries use the configured PostgreSQL login and verified transaction-local context. Server-side checks validate roles, memberships, customer ownership and write permissions; queries explicitly filter by the authorized tenant/customer. Staff may receive `branding.manage`, `domains.manage`, `configuration.manage`, `resources.manage`; none permits staff to manage memberships.

The configured connection is currently owner-backed, as explicitly approved. Database credentials remain server-side; customers never receive them. Database context is trusted server infrastructure, not a client-supplied authorization claim. Transaction settings do not filter rows; RLS and custom-role switching are not used.

Public website responses are allowlisted. Product configuration, private memberships, credential material, internal audit metadata and subscriptions are not published. Same-origin mutation checks remain in force. Generic settings are bounded JSON with secret-looking field-name rejection; this is not a secrets vault or a complete secret-content detector.

## 6. Precise readiness boundaries

**Implemented and persistent**

- Shared tenant provisioning, explicit roles, scoped staff grants and Client Admin management.
- Plans, add-ons, overrides, dependencies, suspension, limits, resource usage and audited administration.
- Configuration-driven branding, favicon/fonts/themes, support/social/legal content, navigation and shared website projection.
- Generic registry extension and entitlement-backed, tenant-scoped non-secret product metadata.
- DNS TXT ownership challenges and verified/active/entitled domain lookup.
- Credential issuance/revocation and webhook endpoint metadata foundations.

**Not implemented / not claimed**

- Production deployment, production migrations, production runtime credentials, hosting/TLS/custom-domain connection.
- Live exchange quotes/order execution, payments/deposits, wallets or blockchain/RPC/card/staking/mining execution.
- Actual Telegram/WhatsApp delivery, mobile app binaries, Crypto Engine, Kolo or editorial CMS behavior.
- Executable third-party plugins, product dispatch, automated billing or real webhook delivery.
- Full credential-provider/vault integration, merchant API authentication, operational backup/restore/incident procedures, or a production security certification.

Product settings for deferred entries are inert metadata. Exchange settings accept optional `defaultAction` (`swap`, `convert`, `buy`, `sell`) and `publicNote`, validate the selected action's entitlement, and persist; these settings do not change the public sandbox widget's runtime behavior in this phase.

DNS verification proves control at verification time. It does not connect hosting, obtain TLS, dispatch a request by its Host header, or continuously revalidate ownership. `hostingConnected` remains false.

## 7. First real-client onboarding blockers

Before production onboarding:

1. Review schema changes before publishing; do not delete/reset data or run production migration DDL from build/startup hooks.
2. Use the configured PostgreSQL login without a custom runtime-role dependency. Keep credentials server-side and verify application authorization on the target environment.
3. Confirm the production identity-provider configuration, intended client account IDs, privilege assignment and revocation procedures.
4. Connect the approved hosting/domain/TLS routing and explicit tenant host dispatch. Add operational DNS monitoring/revalidation before relying on custom domains.
5. Establish backups/restoration, monitoring, abuse/rate controls, audit retention, credential handling and support/incident procedures.
6. Obtain the client's real branding/legal/support assets, commercial entitlement agreement and acceptance of available/non-executing capabilities.
7. If the client expects functional financial/channel products, implement and separately review those products before promising them. A registered or entitled module is not an executing service.

A client can already be provisioned and reviewed in the shared development environment without a code fork. This phase intentionally does not publish, does not connect live services, and does not automatically begin the next crypto product. QuickXchange was not modified or integrated.

## Development installation / additive upgrade

Existing development database:

```sh
pnpm --filter @workspace/scripts run core:upgrade:dev
pnpm --filter @workspace/scripts run db:access:dev
pnpm --filter @workspace/api-server run verify:foundation
```

The additive core upgrade creates generic product configuration, adds membership permissions/domain challenge/manifest fields, backfills only empty built-in definitions, preserves current IDs/assignments, and leaves existing domains unverified. It does not install policies or custom-role grants.

Fresh development setup: push the schema, seed with `db:seed:dev`, run `core:upgrade:dev` if upgrading an older schema, then run the verification suite. For an existing development database with legacy policies, explicitly run `db:access:dev` once. These script names refer to `@workspace/scripts`; all development setup/upgrade helpers refuse production.

Later schema pushes require no policy materialization or custom-role provisioning. Never reintroduce those dependencies through migrations, startup or build hooks. There is no automatic startup production DDL.