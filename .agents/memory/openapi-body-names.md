---
name: OpenAPI request body names
description: Avoid duplicate Orval Zod exports for inline operation bodies.
---
Use named component schemas via `$ref` for operation request bodies rather than inline object schemas.

**Why:** With this project's Orval Zod API/types barrel, inline request objects can generate the same operation-body export in both output trees and break the root TypeScript build.

**How to apply:** When adding endpoints, name the input schemas separately from operation-generated `...Body` identifiers, regenerate clients and run the root typecheck.