---
name: White Label Exchange-only development
description: Current product development boundary after the approved visual phase.
---

Develop only White Label Exchange as a multi-tenant sandbox, followed by its tenant-specific Client Admin Panel. After completing both, stop and show the full result before starting any other product.

**Why:** The user explicitly corrected the scope. Crypto Payment Gateway, Crypto Card, Crypto Engine, Staking API, Earn API, DEX, Telegram Bot, Telegram Mini App, WhatsApp Bot, iOS App, Android App, RPC/Nodes, Cloud Mining, Articles/Content and Kolo remain visual product previews/planned services.

**How to apply:** Keep all other products exactly as they appear on Products & Services: do not remove, redesign, or build their backend functionality. Preserve the approved Landing Page and Exchange Widget design. Reuse tenant architecture, plans, entitlements, branding, assets/networks and application authorization. Exchange supports Swap, Convert, Buy and Sell only as sandbox configuration, quotes, simulated orders and tracking. No real crypto, wallets, deposit addresses, blockchain monitoring, providers, payments, production execution, publishing or deployment.

Exchange Buy/Sell simulation and sandbox payment-method labels must use Exchange action entitlements, not the Crypto Payment Gateway entitlement or its guest-checkout control.

**Why:** The existing foundation groups gateway checkout separately. Reusing that gate for Exchange would incorrectly require developing/enabling a different product, contrary to the user's Exchange-only scope.

**How to apply:** Keep gateway configuration and its existing resource APIs unchanged. Admit simulated Exchange actions through their dedicated sandbox surface and action rights. Complete exchange provisioning without changing gateway checkout flags.