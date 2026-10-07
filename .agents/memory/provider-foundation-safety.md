---
name: Provider foundation safety
description: User-approved boundary between provider administration metadata and future verified external execution.
---
Provider availability, saved configuration and verified connectivity are separate
concepts. An enabled/Available record must never be represented as Connected.

**Why:** The user explicitly requires successful verification by a real implemented
adapter before claiming a connection; this foundation is architecture and Admin
configuration only.

**How to apply:** Do not seed companies to make lists look populated, fake health
metrics, fabricate successful adapter/webhook calls, or enable real execution from
a metadata toggle. The first real provider will be chosen separately after review.

Keep future provider policy configuration independent of the approved sandbox's
financial behavior and order snapshots. Selecting a planned provider must not
activate it or alter the existing quote arithmetic.

**Why:** The user requires the verified White Label flow to continue unchanged
while preparing capability-based routing, network infrastructure and fallback.

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
