---
name: White Label Exchange-only development
description: Current product development boundary after the approved visual phase.
---

Current exception: the user explicitly approved tenant-isolated Exchange integrations adapted from the verified QuickXchange source, including read-only 1Forge/WhiteBIT/Quickex diagnostics, RPC health, and the Exchange Telegram Bot/Mini App. The earlier prohibition below applies to the previous phase and remains applicable to unrelated standalone products, not these approved Exchange channels.

**Why:** The expanded request authorizes these scoped integrations but keeps financial execution Sandbox, forbids sharing QuickXchange data/credentials, and forbids Production writes or publishing.

**How to apply:** Do not expand other products. Distinguish configuration, locally tested adapters, externally verified connectivity and financial execution. Preserve the approved shared master and existing customer settings.

Develop only White Label Exchange as a multi-tenant sandbox, followed by its tenant-specific Client Admin Panel. After completing both, stop and show the full result before starting any other product.

**Why:** The user explicitly corrected the scope. Crypto Payment Gateway, Crypto Card, Crypto Engine, Staking API, Earn API, DEX, Telegram Bot, Telegram Mini App, WhatsApp Bot, iOS App, Android App, RPC/Nodes, Cloud Mining, Articles/Content and Kolo remain visual product previews/planned services.

**How to apply:** Keep all other products exactly as they appear on Products & Services: do not remove, redesign, or build their backend functionality. Preserve the approved Landing Page and Exchange Widget design. Reuse tenant architecture, plans, entitlements, branding, assets/networks and application authorization. Exchange supports Swap, Convert, Buy and Sell only as sandbox configuration, quotes, simulated orders and tracking. No real crypto, wallets, deposit addresses, blockchain monitoring, providers, payments, production execution, publishing or deployment.

Exchange Buy/Sell simulation and sandbox payment-method labels must use Exchange action entitlements, not the Crypto Payment Gateway entitlement or its guest-checkout control.

**Why:** The existing foundation groups gateway checkout separately. Reusing that gate for Exchange would incorrectly require developing/enabling a different product, contrary to the user's Exchange-only scope.

**How to apply:** Keep gateway configuration and its existing resource APIs unchanged. Admit simulated Exchange actions through their dedicated sandbox surface and action rights. Complete exchange provisioning without changing gateway checkout flags.

Provider catalog and assignment controls are preparation for future integrations, not permission to connect providers or execute real transactions. Clearly distinguish functional manual sandbox behavior from Configuration Only, Not Connected and Coming Soon entries.

**Why:** The user requested provider organization while explicitly prohibiting unverified connectivity claims and real execution; selecting a provider must never silently create a real transaction.

**How to apply:** Preserve sandbox behavior regardless of future provider selection. Do not accept provider credentials until a verified integration and secure secret handling are implemented. Do not invent revenue or customer identities to fill administration views.

Customers may fill in optional API, webhook and RPC sandbox preview settings or leave them off. These previews start off and must never block release of a correctly configured Exchange or create errors simply because they are unconfigured.

**Why:** The user explicitly selected optional sandbox settings rather than live integrations, and wants released customer Exchanges to work without unconfigured-module errors.

**How to apply:** Keep preview metadata private, non-secret and independent of operational Exchange settings, quote validity and provisioning readiness. Switches do not grant live entitlements or connect endpoints. Preserve required Exchange validation and actual-error reporting.