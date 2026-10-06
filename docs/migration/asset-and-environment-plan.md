# Assets, integrations and environment requirements

## Environment inventory

`inventory/project2-environment.csv` and `project1-environment.csv` contain **names and code locations only**, never values. Names discovered from source are not proof they are populated or active.

| Requirement | Treatment |
|---|---|
| `DATABASE_URL` | Use the existing destination PostgreSQL connection. No database replacement, dump import, secret copying or direct connection from this audit. |
| Clerk publishable/server keys | Preserve destination's existing Clerk tenant, verified sessions and proxy setup. Browser publishable configuration is not a server secret. |
| `PRIVATE_OBJECT_DIR` | Destination-controlled private storage for migrated blobs/attachments; configured through approved environment tools, never copied from source values. |
| Platform bucket/search-path configuration | May be supplied by storage provisioning. Only static consumer requirements are inventoried; available workspace secret names do not establish runtime use. |
| `PORT`, `BASE_PATH`, Vite `BASE_URL` | Preserve destination artifact/proxy routing. Vite built-ins are not requested Secrets; bind the provided service port and use path-aware URLs. |
| `NODE_ENV`, log/build/CI flags | Preserve destination startup/production identity and Development guards. |
| Test identity/base variables | Development fixtures only; do not provision into Production or expose as application authority. |
| Target provider/mail/Telegram/RPC keys | Existing target responsibilities. Do not request/copy source credentials or turn on providers because metadata was migrated. |

No runtime environment variables were viewed, changed or requested. No integrations were installed/reconnected. Existing GitHub integration was unnecessary because public reference access succeeded.

## Original artwork

- Source compiled manifest: `artifacts/api-server/src/products/exchange/visual-catalog.json`.
- 241 original blob files map to 424 catalog identities. Identity count and blob count intentionally differ.
- Ten identities explicitly have no downloadable/standalone original art. Preserve text/generic unavailable handling; do not invent substitutes or silently assign another coin/network's art.
- Source public art route accepts only hash-addressed filenames in the manifest. Adapt both route and matchers when moving under the target API prefix.
- Source original files are object-storage data, **not included in a Git source checkout or this audit handoff**. Destination implementation must perform an explicit approved original-byte transfer and verify filename/content hashes.
- Copying source metadata alone does not create a standalone migration. Object references must point at destination storage, and the destination must work while Project 2 is offline.
- Do not reimport/create duplicate business asset/network/payment rows just to reproduce visual variants.

## Private customer attachments

Ownership is stored in the database and checked before streaming. Request documents are not public platform art. A destination file transfer must preserve owner/request mappings, MIME/size, original bytes, non-public ACL and no-store/sandbox headers.

This audit transfers **no existing customer attachment bytes or customer records**. Migration of such data is a separate scoped operation requiring authorization, destination identity reconciliation, backup and post-transfer privacy checks.

## Integrations by readiness

| Capability | Source readiness | Destination treatment |
|---|---|---|
| Clerk account/login | Implemented | Merge verified existing target identity. |
| Private/public object storage | Implemented for separate upload/art flows | Adapt namespace, storage paths and ACL independently. |
| DNS TXT lookup | Implemented ownership verification | Preserve validation and race-safe update; no hosting/TLS claim. |
| Sandbox exchange | Implemented simulated flow | Preserve simulation and isolated order store. |
| WhiteBIT/ChangeNOW/QuickX/RPC source selection | Configuration metadata, not connectivity | No live requests, credentials or balance proof. |
| Source payment/wallet/blockchain execution | Deferred contracts | Not a supplied implementation; do not activate target execution implicitly. |
| API key lifecycle | Hash-only sandbox keys | Preserve quota/one-time display/revoke; no merchant authentication claim. |
| Webhooks/notifications | Configuration/helpers/contracts | No delivery worker supplied. Future target transport needs tenant-aware design. |
| Telegram/WhatsApp/mobile/KYC | Advertised/deferred or absent | No connector/app/provider is implemented by this audit. |

## Source project independence acceptance

Scan destination bundles, manifests, image URLs, API clients and worker configuration for source origin/storage paths. All required modules, validators, styles, defaults and approved art must be locally available in the destination. No cross-project API/database/file lookup is permitted at runtime.
