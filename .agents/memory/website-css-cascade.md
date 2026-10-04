---
name: Website responsive CSS cascade
description: Tailwind v4 utility visibility can lose to unlayered custom component display declarations.
---
Responsive visibility for custom website components must use the same cascade layer as their display rules, with sufficient specificity or ordering to override later base-component declarations. Container CSS should use padding-inline, not a full padding shorthand, when Tailwind utilities control vertical spacing.

**Why:** Tailwind v4 utilities are layered. Unlayered custom button display declarations overrode responsive hiding, showing desktop menu controls and squeezing mobile branding. A marketing-page container's unlayered padding shorthand also erased section and header spacing.

**How to apply:** When combining custom component classes and responsive visibility utilities, check computed display at mobile and desktop sizes. Use consistently layered styles or explicit component breakpoint rules.