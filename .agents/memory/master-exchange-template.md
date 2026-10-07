---
name: Approved Exchange master
description: User-approved reuse of the current NovaX Exchange visual design, without per-customer frontend forks.
---
The user approved the CURRENT NovaX Exchange as the official shared MASTER
TEMPLATE for future White Label Exchange customers. Preserve its approved
layout, widget/actions, sections, responsive behavior, animations, themes and
spacing without redesign or per-customer frontend copies.

The complete Master structure must remain visible for Sandbox/Setup, paused,
loading and empty configurations too. Do not replace the exchange form with a
small status-only panel or remove Supported Assets/statistics because counts
are zero. Use honest disabled controls and empty states inside the same layout;
never fill them by copying NovaX demo assets, rates or customer data.

**Why:** The user explicitly approved this design and requested tenant
configuration and provisioning reuse, not another design or app.
The user repeated this requirement after the newly provisioned Asterlane preview
looked like a simplified template because its initial configuration was empty.

**How to apply:** Extend tenant identity, content and isolated operational
configuration around the existing shared renderer and Admin Panel. Do not copy
NovaX customers, demo credentials, orders or history. Demo-specific backend
access restrictions stay specific to the demonstration. This transition is
Development only; do not publish or modify Production without a new explicit
request.
