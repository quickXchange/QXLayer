---
name: Exchange visual catalog boundaries
description: Identity matching, currency flags and the distinction between order privacy and authorized catalog administration.
---

Use the supplied catalog as the authority for visual identity. Multiple artworks for one payment identifier are variants, not new payment records. Do not interpret generic sandbox card/bank-transfer labels as a particular card network, bank or transfer scheme.

**Why:** The supplied package includes alternate bank logos and generic existing simulation labels; matching by artwork or guessing the institution would misrepresent payment identity.

**How to apply:** Match stable codes and explicit names, retain alternatives, and leave ambiguous labels unbranded until an administrator deliberately selects an identity.

Currency-associated flags describe the catalog's currency visual, not the customer's country. Sandbox orders currently do not collect bank/payment details or customer country; do not substitute administrator configuration for missing order data.

**Why:** A currency can map to several countries, and account-level payment configuration is not a historical customer payment snapshot.

**How to apply:** Label currency artwork accurately, show unavailable/not-collected order fields explicitly, and use only authorized order information.

Order presentation must exclude internal configuration reserves and provider details. This does not remove the previously approved reserve field from authorized Admin Payment Methods management.

**Why:** Reserve editing was explicitly requested for administration, whereas the order-presentation request limits what is shown in View Order.

**How to apply:** Verify privacy against the order drawer specifically; preserve legitimate role-authorized configuration controls.
