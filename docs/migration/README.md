# Project 2 white-label migration handoff

## Project roles and execution boundary

- **Project 2:** this QXLayer white-label/private-label workspace.
- **Project 1:** QuickXchange, supplied at `https://github.com/quickXchange/QuickXchange-.git`.
- QuickXchange is **reference-only in this workspace**, as the user requested.
- The uploaded `REPLIT_MIGRATION_PROMPT.md` asks for a staged Project 2 → Project 1 migration. Its audit/map prerequisites have been prepared here. **No destination merge, schema migration, customer-data transfer, financial execution or publishing has been performed.**
- No source application files, source database rows, QuickXchange repository files or Production settings are modified by this audit.

## The nine requested prerequisites

| Requirement | Deliverable |
|---|---|
| Project 2 feature inventory | `project2-feature-inventory.md`, `inventory/project2.json`, `inventory/source-routes.csv` |
| Project 1 architecture inventory | `project1-architecture.md`, `inventory/project1-reference.json` |
| Database comparison | `inventory/database-map.csv`, full column/reference declarations in both JSON inventories |
| API comparison | `inventory/api-map.csv`, `inventory/extra-routes.csv`, `compatibility-and-conflicts.md` |
| Dependency comparison | `inventory/dependency-map.csv` |
| White-label feature map | feature inventory's decision/target columns and `implementation-checklist.md` |
| Conflict list | `compatibility-and-conflicts.md`, `inventory/summary.json` |
| Migration plan | `migration-plan.md`, `asset-and-environment-plan.md` |
| Implementation order | `implementation-checklist.md`, phase gates in `security-and-validation.md` |

The machine-readable audit covers **36 Project 2 tables, 76 OpenAPI operations and 79 Express route declarations**. Project 1 reference contains **92 tables, 293 OpenAPI operations and 294 route declarations**. These are source definitions, not assertions about the live databases.

## Reproduce and validate

Read-only reference checkout, outside this workspace:

```sh
pnpm --filter @workspace/scripts run migration:audit --reference /path/to/QuickXchange
pnpm --filter @workspace/scripts run migration:validate --reference /path/to/QuickXchange
```

No application import, database connection, secret lookup, provider request, dependency installation or startup command occurs in these scripts. Secret files, database dumps and customer records are not inspected.

Generated inventories record the reference commit and source SHA-256 fingerprints. Refresh the comparison if QuickXchange changes; do not treat a previous reference snapshot as current implementation truth.

## Critical findings

1. Both projects define **`exchange_orders`**, with incompatible IDs, columns and status contracts.
2. Project 2's simulated exchange must **not replace** Project 1's operational order/pricing/provider stack.
3. Project 1's global Owner/operator permission and TOTP boundary must survive. A white-label owner is **not** a QuickXchange platform Owner.
4. Source white-label tenant scope is enforced by services and scoped SQL, **not** by PostgreSQL RLS or transaction settings.
5. Branding uploads, private customer attachments, catalog art and provider credentials require different storage/access policies.
6. Existing Project 1 APIs, root frontend routes, generated schema names and workspace package aliases cannot be blindly overwritten.
7. KYC execution, wallets, blockchain execution, payment execution and most advertised products are **not implemented in Project 2**. Preserve explicit deferred status.

The next executable migration stage belongs in an authorized **Project 1 destination workspace/branch**, with its own database snapshot and baseline tests. The current reference-only checkout is not that destination.
