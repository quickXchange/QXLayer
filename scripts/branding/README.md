# VYNOX LAYER theme maintenance

The platform palette lives in `artifacts/private-label-website/src/lib/theme.ts`.
`PLATFORM_SITE` consumes it; the console derives semantic HSL tokens from it.
Platform public pages, Customer, Super Admin, Client Admin and auth screens reuse
these tokens. Body-portaled controls inherit document tokens. Theme preferences
are synchronized by tenant-slug-scoped events, not database writes.

Keep customer public website configuration and genuine third-party branding
separate. Preserve meaningful success/warning/error colors. Do not replace
business configuration, permissions, authentication providers or layouts to
apply a color change.

## Logo

The original `public/vynox-logo.png` is retained intact.
`node scripts/branding/build-logo-variants.mjs` deterministically trims unused
alpha bounds and produces transparent Dark/Light derivatives and compatibility
aliases. The light derivative adjusts neutral lettering and glow, never shape
or typography. The shared `BrandLogo` follows the nearest declared theme;
fixed dark illustrated device screens can explicitly request `dark`.

## Checks

```
node --experimental-strip-types --test scripts/branding/theme-colors.test.mjs
pnpm --filter @workspace/private-label-console run typecheck
pnpm --filter @workspace/private-label-website run typecheck
```

Tests cover AA contrast for normal text, muted text, links and primary controls
across the shared surfaces in both modes, plus customer color isolation.
Also visually check alpha/content: an entirely transparent image can load
successfully with valid intrinsic dimensions.

## Release safety

Do not use the existing Staging rebrand release blindly for a frontend-only
request: even its frontend-only mode updates Render authentication origins and
restarts the Staging API. It also changes repository metadata. Resolve explicit
live-service restrictions before running it. Never deploy Production, change
DNS, migrate databases, change authentication providers or activate the Worker
for this color update.
