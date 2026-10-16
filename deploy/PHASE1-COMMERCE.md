# Phase 1 commerce operations

Platform White Label billing is separate from Exchange Sandbox payment invoices.
Nothing here enables crypto execution or changes Public Live/DNS.

## Reviewed initialization

Run from the workspace containing the pinned existing database/provider settings:

```
node scripts/external-hosting/migrate-phase1.mjs
node scripts/external-hosting/migrate-phase1.mjs --apply-approved-phase1
node scripts/external-hosting/migrate-phase1.mjs --protected-production
node scripts/external-hosting/migrate-phase1.mjs --protected-production --apply-approved-phase1
```

Without the apply switch, the complete migration is rolled back. The protected
target requires its original Supabase project, verified TLS, existing Render
configuration and the unchanged public-cutover hold.

The private commerce schema has its own checksum ledger, separate from the
existing public application-schema migration manifest. Applied SQL/configuration
files must not be edited; subsequent changes require new reviewed migrations.
Initialization never overwrites existing offer edits or resets an Owner account.
An entirely empty protected marketing catalog is initialized from the approved
current Development **public marketing records only**, not customer/tenant data.

## Before accepting purchases

In Super Admin → Plans:

1. Review or replace the proposed EUR plans/add-ons. Approving a proposal confirms
   its exact displayed amounts; concurrent price changes invalidate confirmation.
2. Configure the applicable monthly/yearly prices, discounts, feature entitlements
   and enabled billing periods. Both periods disabled blocks new orders/purchases.
3. Supply actual payment instructions, then explicitly approve and enable a
   payment method in the matching currency.

Seeded commercial amounts are **unapproved proposals**, not launched offers.
The seeded bank-transfer method has no instructions and remains disabled.
Blank/unconfirmed prices are not free prices. Landing Exchange prices derive
from enabled, approved EUR plans, not an independent marketing price.

## Payment and delivery

- Checkout freezes the chosen method, instructions, amount, currency and selected
  offer. The amount covers the first chosen recurring period plus one-time fees.
- Complete, operator-approved custom quotations may include customization fees.
- A customer report is **unverified**. Only Super Admin can confirm exact settled
  amount/currency with an actual reference and evidence. Reusing a settled
  reference for another invoice on the same method is rejected.
- Approval/setup/delivery require verified payment and a matching final quotation.
  Approval prepares a draft; it does not grant customer membership or activate it.
- Referenced payment methods must be disabled, not deleted. Paid invoices cannot
  be edited. Historical delivered orders remain readable without retroactive
  invoice fabrication.

## Order email

Customer-visible order events and the durable outbox are written in the same
transaction. Internal notes and settlement evidence are never emailed.
Configure the existing Resend sending credential and verified From address:
`QXLAYER_ORDER_EMAIL_API_KEY` and `QXLAYER_ORDER_EMAIL_FROM`. Development can reuse
its existing Development mail credential; credentials must not cross environments.

`configure-phase1-mail.mjs` configures only the protected Production sender using
its existing approved Production credential; it preserves unrelated settings.
Native signup/verification/recovery email remains managed by existing Supabase
Auth SMTP configuration.

Super Admin can inspect pending/sent/failed order emails and retry failed items.
**Sent means the provider accepted the request, not confirmed inbox delivery.**
End-to-end SMTP/inbox checks require an authorized, controlled real mailbox;
invalid QA addresses intentionally do not receive mail.

## Read-only protected checks

`node scripts/external-hosting/verify-phase1.mjs` checks the pinned protected
target's immutable migration checksums, private RLS policy parity, restricted
runtime grants and payment-guard parity. Both database transactions are read-only.
It also requires the public-cutover hold to remain in place. This is configuration
evidence, not a replacement for customer browser testing or inbox delivery proof.

Financial arithmetic and settlement tests are included in `release:test`.
Disposable lifecycle-test plans must explicitly grant the quotas needed by their
selected actions, including a payment-method allowance for Buy/Sell.
