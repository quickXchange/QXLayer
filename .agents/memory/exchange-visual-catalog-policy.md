---
name: Exchange visual catalog boundaries
description: Identity matching, currency flags and the distinction between order privacy and authorized catalog administration.
---

Use the supplied catalog as the authority for visual identity. Multiple artworks for one payment identifier are variants, not new payment records. Do not interpret generic sandbox card/bank-transfer labels as a particular card network, bank or transfer scheme.

**Why:** The supplied package includes alternate bank logos and generic existing simulation labels; matching by artwork or guessing the institution would misrepresent payment identity.

**How to apply:** Match stable codes and explicit names, retain alternatives, and leave ambiguous labels unbranded until an administrator deliberately selects an identity.

Currency-associated flags describe the catalog's currency visual, not the customer's country. Frozen order payment instructions describe the configured recipient method, not the customer's personal bank details or country. Never substitute current administrator configuration for a historical order snapshot.

**Why:** A currency can map to several countries, and account-level payment configuration is not a historical customer payment snapshot.

**How to apply:** Label currency artwork accurately, show unavailable/not-collected order fields explicitly, and use only authorized order information.

Order presentation must exclude internal configuration reserves and provider details. This does not remove the previously approved reserve field from authorized Admin Payment Methods management.

**Why:** Reserve editing was explicitly requested for administration, whereas the order-presentation request limits what is shown in View Order.

**How to apply:** Verify privacy against the order drawer specifically; preserve legitimate role-authorized configuration controls.

Exchange logos must retain original brand colors and source files in both themes. Use circular presentation, foreground-aware sizing, adaptive neutral surfaces and local edge contrast treatment—not one recoloring filter for all brands. Flags fill fixed square circular containers without stretching.

**Why:** The user explicitly required full, centered circles and readable dark/light artwork while prohibiting permanent recoloring, destructive cropping and changes to the QXLayer theme.

**How to apply:** Apply the existing shared Exchange logo system to new surfaces. Inspect every supplied original and variant; keep wide wordmarks complete and distinguish source contrast/padding from corrected presentation.

Verify imported artwork bytes separately from catalog rows when preparing an
external candidate.

**Why:** Catalog CRUD and relational checks passed while the hash-addressed
artwork existed only in Development storage. The protected candidate showed
fallback initials because its separate private bucket lacked those objects.

**How to apply:** Copy only manifest-allowlisted public artwork with verified
source hashes, immutable no-overwrite writes and authenticated byte readback.
Do not assume restoring database metadata also restores referenced files.
