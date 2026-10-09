---
name: Provider foundation safety
description: User-approved boundary between provider administration metadata and future verified external execution.
---
Provider availability, saved configuration and verified connectivity are separate
concepts. An enabled/Available record must never be represented as Connected.

**Why:** The user explicitly requires successful verification by a real implemented
adapter before claiming a connection. The user subsequently authorized source-based
read-only 1Forge, WhiteBIT, Quickex and supported RPC wiring plus tenant Telegram channels.

**How to apply:** Do not seed companies to make lists look populated, fake health
metrics, fabricate successful adapter/webhook calls, or enable real execution from
a metadata toggle. Independent tenant credentials and successful external checks
are still required; implementation does not itself prove remote readiness.

Keep future provider policy configuration independent of the approved sandbox's
financial behavior and order snapshots. Selecting a planned provider must not
activate financial execution. Authorized read-only pricing may change Sandbox
quotes, but their signed pricing snapshot must remain consistent at order creation.

**Why:** The user requires the verified White Label flow to continue unchanged
while permitting approved provider-backed indicative Sandbox pricing. Real funds,
deposits, trades and withdrawals require separate explicit activation.

**How to apply:** Validate tenant/resource/capability/environment/entitlement
compatibility, but require a separately approved adapter and idempotent operation
ledger before external execution or automatic failover.

An encryption helper is not a provisioned credential vault. Do not accept real
provider secrets until reviewed key provisioning, authenticated environment-bound
encryption, storage and lifecycle handling exist.

**Why:** The user explicitly forbids weak invented encryption and real API keys in
the foundation phase.

**How to apply:** Expose schema descriptors and masked/missing state only. Never
return or audit secret values; tenant views must not expose global schemas or
other tenants' configuration. Future webhooks require verified signatures,
verified account-to-tenant binding and atomic idempotent domain processing.

A missing vault key must block credential operations, not authentication,
administration, customer websites or the existing sandbox Exchange. Provider
credentials are not a prerequisite for a code-only republish with no connected
provider.

**Why:** The user intentionally dismissed the Development key request and
explicitly requires republishing without provider credentials or weakened vault
security.

**How to apply:** Keep vault availability lazy and isolated from application
startup. Do not resume vault implementation or key requests during pre-publish
verification; review provider connectivity separately.

The user has now approved reuse and adaptation of QuickXchange's 1Forge, WhiteBIT,
RPC/monitoring, provider selection, integration settings, connection tests, health
and Manual fallback into QXLayer. This supersedes the earlier metadata-only scope
for those components, not the prohibitions on fake connectivity or unsafe secrets.

**Why:** The user selected these existing integrations explicitly and requires
independent projects with protected credentials and data.

**How to apply:** Use the current working Replit source, not its outdated GitHub
copy. Keep copied code tenant-scoped and credentials independently configured.
Do not infer authorization for deposits, trades, withdrawals, automatic financial
execution or Heleket from approval of provider configuration and monitoring.
