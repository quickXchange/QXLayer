---
name: Typed Exchange group selectors
description: Crypto/Fiat wildcard groups must survive every settings transformation and use consistent specificity.
---

Treat typed Crypto/Fiat groups as selectors, not literal asset-network records,
in quote matching, conflict validation, scope reconciliation and save/reload.
An unrelated settings edit must preserve rule IDs, activation and pricing.

**Why:** Browser verification found that saving a Public Note silently removed
typed Crypto rules because scope reconciliation treated the group selector as
an unassigned network. The quote changed despite no intended pricing edit.
Historical order snapshots allowed the original demo rule IDs to be restored
without changing orders.

**How to apply:** Regression-test complete reconciliation of typed groups.
Verify an unrelated save/reload preserves rules and the same quote, not just
the edited field. Keep frontend conflict specificity aligned with the server's
exact-endpoint-over-group-over-Any ranking.
