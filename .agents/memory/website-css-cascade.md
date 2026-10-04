---
name: Website responsive CSS cascade
description: Tailwind v4 utility visibility can lose to unlayered custom component display declarations.
---
Responsive visibility for custom customer-website components must use the same cascade layer as their display rules, with sufficient specificity or ordering to override later base-component declarations.

**Why:** Tailwind v4 utilities are layered. Unlayered custom button display declarations overrode responsive hiding, showing desktop menu controls and squeezing mobile tenant branding.

**How to apply:** When combining custom component classes and responsive visibility utilities, check computed display at mobile and desktop sizes. Use consistently layered styles or explicit component breakpoint rules.