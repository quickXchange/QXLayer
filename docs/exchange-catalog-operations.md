# Exchange reference catalog

Only **Swap (Crypto ↔ Fiat)** and **Convert (Crypto ↔ Crypto)** are offered.
Legacy Buy/Sell records remain historical data; no history is deleted.

## Operator controls

Super Admin → **Exchange Catalog** manages fiat, payment methods, assets and
networks. Search/filter, scoped select-all, enable/disable, safe deletion and
JSON import/export share the same permission-checked transactional API.
Edits include the current revision; a stale editor must reload before retrying.
Linked or customer-selected entries must be disabled rather than deleted.

Payment-method/fiat and asset/network links are explicit. An enabled link needs
verified evidence and enabled parents. Native assets and token deployments are
different: token contracts/mints, chain-specific precision, address format and
memo requirements belong to the deployment, not just its ticker.

Binance-Peg BSC-USD is retained as an explicitly labelled disabled reference;
it is not presented as issuer-native USDt. Unsupported references remain
catalog-only. Global availability does not imply connectivity, liquidity,
account approval or financial execution.

## Customer controls

Select permitted assets/networks, then configure Exchange fiat, payment
methods, required account fields, instructions, pricing routes/rules, wallets
and independent Swap/Convert widget defaults. Swap requires a compatible
payment method. Convert does not use fiat payment methods. Exact selectors
outrank typed Any Crypto/Any Fiat selectors, then numeric priority resolves
equally specific rules; equal-ranked overlapping rules are rejected.

Bank/account data is never published in the anonymous payment-method
directory. Accepted orders freeze the admitted instructions and account fields
so later configuration changes cannot rewrite existing orders.

## Reference maintenance

`scripts/catalog/build-reference.mjs --quickx=/path/to/verified-source-only.json`
reads approved reference exports plus SIX ISO 4217, Unicode CLDR and the chain
registry. Provenance, source hashes and totals are recorded in
`docs/exchange-catalog-provenance.json`. Rebuilding JSON never connects to an
application database and never generates active routes.

The additive versioned migration is `0007_global_exchange_catalog.sql`.
Reference imports are explicit operator operations, not startup hooks.
They preserve existing entries on conflict and verify unchanged business-row
fingerprints. Do not run generic schema reset or drop existing migration
ledgers. New reference imports do not activate tenants, providers, workers,
payments, RPC credentials, public Live or DNS.
