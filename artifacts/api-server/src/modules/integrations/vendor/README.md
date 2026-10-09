# Verified QuickXchange reuse

Source: https://github.com/quickXchange/QuickXchange-
Branch: `qxlayer-source-sync-1fabca8e`
Commit: `aef093f1ed73357d741e497a2928624944ff7140`

The blockchain monitoring implementation is copied unchanged from
`artifacts/api-server/src/lib/blockchain-monitoring`.
Its transport, parsing, confirmation, canonicality and token identity checks
remain intact. QXLayer injects independently scoped credentials and configuration.

1Forge, WhiteBIT and Quickex diagnostic transport/signing in the tenant bridge
is extracted from the source's manual desk rates, WhiteBIT route and Quickex
library. WhiteBIT's global database nonce is replaced with a durable tenant
integration nonce. Quickex's rejected negative authentication control is retained.
These diagnostics never create trades, wallets, deposit addresses or withdrawals.

The Mini App utility/component code, amount formatting, payment logos and
language implementation are retained in their workspace libraries. The rendering
tests now wrap the components in their actual I18nProvider rather than mocking it.
Source-wide account tables, credentials, environment files and customer records
are deliberately not imported: they are global in the source and unsafe to share.
