import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// Source export only: no application imports, secret lookup, DB access, installation or deployment.
const root = process.cwd();
const exportDir = path.join(root, "exports");
const name = "project2-white-label-migration";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "qxlayer-migration-package-"));
const staged = path.join(temp, name);
fs.mkdirSync(staged);
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const sourceRoots = ["artifacts/api-server", "artifacts/private-label-console",
  "artifacts/private-label-website", "lib", "scripts"];
const rootFiles = ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml",
  "tsconfig.json", "tsconfig.base.json", "replit.md"];
const excludedDirs = new Set(["node_modules", "dist", "build", ".git", ".agents", ".local",
  ".replit-artifact", ".cache", ".vite", "coverage", "test-results", "playwright-report"]);
const allowedExtensions = /\.(?:ts|tsx|js|mjs|cjs|json|yaml|yml|css|html|md|sql|sh|py|txt|svg|png|jpg|jpeg|webp|avif|gif|ico|woff2?|ttf)$/i;
const prohibitedNames = /^(?:\.env(?:\..*)?|\.npmrc|\.yarnrc.*|credentials(?:\..*)?|service-account(?:\..*)?|profile\.md)$/i;
const records = [];
function write(relative, bytes, category) {
  assert.ok(!path.isAbsolute(relative) && !relative.split("/").includes(".."), "Unsafe export path");
  const target = path.join(staged, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  records.push({ path: relative, bytes: bytes.length, sha256: sha(bytes), category });
}
function rejectCredentialMaterial(file, bytes) {
  if (!/\.(?:ts|tsx|js|mjs|cjs|json|yaml|yml|md|html|css|sh|py|txt)$/i.test(file)) return;
  const text = bytes.toString("utf8");
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text) ||
      /\b(?:sk_live_|sk_test_|ghp_|github_pat_)[A-Za-z0-9_]{32,}/.test(text)) {
    throw new Error(`Potential credential material: ${file}. Export stopped; no value is printed.`);
  }
}
function copyTree(relative, category = "source") {
  const directory = path.join(root, relative);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (excludedDirs.has(entry.name) || prohibitedNames.test(entry.name) || entry.name.endsWith(".tsbuildinfo")) continue;
    const child = `${relative}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Unexpected source symlink: ${child}`);
    if (entry.isDirectory()) { copyTree(child, category); continue; }
    if (!allowedExtensions.test(entry.name)) continue;
    const bytes = fs.readFileSync(path.join(root, child));
    rejectCredentialMaterial(child, bytes);
    write(`project2-source/${child}`, bytes, category);
  }
}
const readme = `# Project 2 white-label source migration package

## What this package is

An unmodified source snapshot of the current white-label API, console, tenant renderer,
shared libraries, source verification tools and Development setup utilities, together
with the migration audit/map and all approved original catalog artwork.

This is NOT an integrated QuickXchange build. Project 1 remains reference-only.
Source routes/table/package names are intentionally preserved; follow the migration
map before merging them into a destination. Do not extract over an existing project.

## Included

- project2-source/artifacts: API server, white-label console and tenant website.
- project2-source/lib: database declarations and generated/shared API packages.
- project2-source/scripts: source setup/verification/export tooling.
- project2-source/docs/migration: all nine prerequisite outputs and CSV/JSON maps.
- reports: self-contained readable migration audit.
- artwork/qxlayer-development-visuals: 241 hash-verified original blob files,
  associated with 424 catalog visual identities. Ten unavailable identities remain
  declared unavailable; no substitute artwork is generated.
- PACKAGE_MANIFEST.json and VERIFY_PACKAGE.mjs: per-file sizes and SHA-256 checks.
- runtime-requirements.json: service requirements and environment NAMES ONLY.

## Verify before use

Extract into a new empty directory, then run:

    node VERIFY_PACKAGE.mjs

No dependencies, credentials, database connection or application startup is required
for this check. The companion .sha256 file verifies the ZIP itself.

## Destination setup boundaries

1. Choose an authorized destination and make a Development snapshot first.
2. Read project2-source/docs/migration/README.md and the staged implementation plan.
3. Keep QuickXchange's engine, global Owner/TOTP permissions, original financial
   tables, customer ownership, workers, API contracts and build pipeline intact.
4. Adapt source SQL/API/types/workspace exports into the planned white_label schema
   and /api/white-label subtree before integration. This archive has NOT performed
   that adaptation or destination migration.
5. Configure destination database/Clerk/storage through its approved configuration
   tools. This package supplies no credentials and no customer/tenant database rows.
6. Upload the artwork files to destination-controlled storage at the relative
   qxlayer-development-visuals prefix expected by the current source visual service
   beneath the destination's PRIVATE_OBJECT_DIR. That variable's value is not in
   this package. Preserve manifest filenames and byte hashes.
7. Register/configure the three destination services explicitly. Workspace-specific
   artifact IDs, workflow metadata, compiled bundles and design-canvas code were
   deliberately excluded.

For an entirely separate fresh Source Project 2 review, install the locked source
workspace dependencies only in that separate workspace. Its backend is sandbox-only
and needs an explicitly configured empty Development database and deliberate
operator/plan/catalog setup. Do not use its schema-push, seed, backfill, RLS-cleanup
or upgrade scripts against an existing QuickXchange or Production database.
No source setup helper is an automatic startup/deployment instruction.

## Excluded

Secrets/.env/auth configuration, Git history, customer records/database dumps,
private customer attachments, user profiles/agent memory, recordings/screenshots,
node_modules, caches, compiled bundles and source workspace artifact registration.
No QuickXchange application checkout or executable engine is copied.
The Project 1 JSON inventory contains schema/reference documentation only.
Public synthetic demo/test definitions in source code are not live customer records;
never seed those fixtures into a destination as part of a migration.

## Readiness and rights

The source Exchange is simulated. Advertising/configuration/contracts do not create
live quotes, payments, wallets, blockchain/KYC/mobile/webhook/notification execution.
DNS TXT verification is not hosting/TLS. Source plan prices are metadata, not billing.
Original third-party logos retain their respective owners' rights; unchanged artwork
does not grant a new trademark/license right.

No customer-data transfer, destination integration or publishing has occurred.
`;
try {
  for (const relative of rootFiles) {
    if (!fs.existsSync(path.join(root, relative))) continue;
    const bytes = fs.readFileSync(path.join(root, relative));
    rejectCredentialMaterial(relative, bytes);
    write(`project2-source/${relative}`, bytes, "source-workspace-config");
  }
  for (const relative of sourceRoots) copyTree(relative);
  copyTree("docs/migration", "migration-documentation");
  const report = path.join(root, "exports/project2-white-label-migration-handoff.html");
  assert.ok(fs.existsSync(report), "Validate the migration handoff before exporting");
  write("reports/migration-audit.html", fs.readFileSync(report), "migration-documentation");
  write("README.md", Buffer.from(readme), "package-instructions");
  write("VERIFY_PACKAGE.mjs", fs.readFileSync(path.join(root, "scripts/migration/verify-package.mjs")), "package-verifier");
  const catalogPath = "artifacts/api-server/src/products/exchange/visual-catalog.json";
  const catalogBytes = fs.readFileSync(path.join(root, catalogPath));
  const catalog = JSON.parse(catalogBytes);
  assert.equal(catalog.blobs.length, 241);
  assert.equal(catalog.assets.length, 424);
  write("artwork/visual-catalog.json", catalogBytes, "catalog-manifest");

  // Only compiled, public, hash-addressed art is fetched. Never fetch arbitrary URLs or private attachments.
  let next = 0, completed = 0, stop = false;
  const errors = [];
  async function worker() {
    while (!stop) {
      const index = next++;
      if (index >= catalog.blobs.length) return;
      const blob = catalog.blobs[index];
      try {
        assert.match(blob.filename, /^[a-f0-9]{64}\.(?:svg|png|webp|jpg|jpeg)$/);
        const response = await fetch(`http://localhost:80/api/exchange/visual-assets/${blob.filename}`,
          { signal: AbortSignal.timeout(45000), redirect: "error" });
        if (!response.ok) throw new Error(`Artwork ${blob.filename}: HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(sha(bytes), blob.filename.split(".")[0], `Original artwork mismatch: ${blob.filename}`);
        write(`artwork/qxlayer-development-visuals/${blob.filename}`, bytes, "catalog-artwork");
        completed++;
        if (completed % 40 === 0 || completed === catalog.blobs.length) console.log(`Verified original artwork: ${completed}/${catalog.blobs.length}`);
      } catch (error) { errors.push(error); stop = true; }
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));
  if (errors.length) throw errors[0];
  assert.equal(completed, catalog.blobs.length, "Incomplete artwork; archive not created");

  const env = JSON.parse(fs.readFileSync(path.join(root, "docs/migration/inventory/project2.json"))).environment;
  const requirements = { version: 1, status: "source snapshot; integration and provisioning not performed",
    services: [
      { directory: "artifacts/api-server", purpose: "sandbox API", devCommand: "pnpm --filter @workspace/api-server run dev", routePrefix: "/api", portBinding: "PORT" },
      { directory: "artifacts/private-label-console", purpose: "platform/customer/tenant console", devCommand: "pnpm --filter @workspace/private-label-console run dev", basePath: "/", portBinding: "PORT" },
      { directory: "artifacts/private-label-website", purpose: "shared tenant renderer", devCommand: "pnpm --filter @workspace/private-label-website run dev", basePath: "/private-label-website", portBinding: "PORT" },
    ], environmentNames: env.map(e => ({ name: e.name, category: e.category, exposure: e.exposure })),
    artworkStorageRelativePrefix: "qxlayer-development-visuals",
    customerDataOrPrivateAttachments: "excluded; separate authorized transfer would be required",
    destinationProviders: "not activated", destinationArtifactMetadata: "must be registered/configured explicitly" };
  write("runtime-requirements.json", Buffer.from(JSON.stringify(requirements, null, 2) + "\n"), "runtime-requirements");
  const audit = JSON.parse(fs.readFileSync(path.join(root, "docs/migration/inventory/summary.json")));
  const manifest = { version: 1, kind: "source-migration-handoff", createdAt: new Date().toISOString(),
    sourceProject: "Project 2 white-label", referenceProject: "Project 1 QuickXchange, read-only",
    referenceCommit: audit.referenceCommit,
    sourceGitRevision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    status: { sourcePackagePrepared: true, destinationIntegrated: false, productionChanged: false,
      customerDataIncluded: false, privateAttachmentsIncluded: false, secretsIncluded: false },
    artwork: { originalBlobCount: completed, visualIdentityCount: catalog.assets.length,
      unavailableIdentityCount: catalog.unavailable.length, originalBytesHashVerified: true },
    exclusions: ["Secrets and .env", "customer records/database dumps", "private attachments",
      "Git and workspace registration metadata", "profiles and agent memory",
      "recordings/screenshots/uploads", "dependencies/caches/compiled outputs", "QuickXchange executable source"],
    files: records.sort((a, b) => a.path.localeCompare(b.path)) };
  fs.writeFileSync(path.join(staged, "PACKAGE_MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n");
  execFileSync(process.execPath, [path.join(staged, "VERIFY_PACKAGE.mjs")], { stdio: "inherit" });
  fs.mkdirSync(exportDir, { recursive: true });
  const archive = path.join(exportDir, `${name}.zip`);
  const pendingArchive = path.join(temp, `${name}.zip`);
  execFileSync("zip", ["-q", "-r", pendingArchive, name], { cwd: temp });
  execFileSync("unzip", ["-tq", pendingArchive], { stdio: "inherit" });
  const archiveBytes = fs.readFileSync(pendingArchive);
  const archiveHash = sha(archiveBytes);
  fs.copyFileSync(pendingArchive, archive);
  fs.writeFileSync(path.join(exportDir, `${name}.sha256`), `${archiveHash}  ${name}.zip\n`);
  fs.writeFileSync(path.join(exportDir, `${name}-manifest.json`), JSON.stringify(manifest, null, 2) + "\n");
  const receipt = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Project 2 White-label Migration Package</title><style>body{font:16px/1.6 system-ui,sans-serif;background:#f5f7fb;color:#14213d;max-width:900px;margin:40px auto;padding:24px}
main{background:white;border:1px solid #dce3ee;border-radius:12px;padding:30px}h1{line-height:1.2}code{overflow-wrap:anywhere;font-size:13px}
a{display:inline-block;background:#244faf;color:white;padding:12px 18px;border-radius:6px;text-decoration:none;margin:8px 10px 8px 0}
.secondary{background:#e8edf7;color:#244faf}li{margin:8px 0}.notice{padding:15px;background:#edf2f9;border-left:4px solid #244faf}</style></head>
<body><main><h1>Project 2 White-label Migration Package</h1><p class="notice">Package prepared here. QuickXchange and Production remain unchanged. This is a source handoff, not a completed integration.</p>
<p><strong>${manifest.files.length} files</strong> including the three white-label applications, shared libraries, migration documents and <strong>241 original artwork files</strong> for 424 visual identities.</p>
<a download="${name}.zip" href="data:application/zip;base64,${archiveBytes.toString("base64")}">Download migration ZIP</a>
<a class="secondary" download="${name}-manifest.json" href="data:application/json;base64,${Buffer.from(JSON.stringify(manifest, null, 2)).toString("base64")}">Download file manifest</a>
<h2>Verified</h2><ul><li>Every packaged file has a recorded SHA-256 hash and size.</li><li>All 241 original artwork bytes match their catalog hashes.</li>
<li>ZIP CRC and standalone package-verifier checks passed.</li><li>No secrets, customer database records, private attachments, workspace memory or QuickXchange application source are included.</li></ul>
<h2>Before use</h2><p>Extract into a new empty folder. Read README.md and run <code>node VERIFY_PACKAGE.mjs</code>.
Do not extract over an existing project or run source setup/migration helpers against QuickXchange or Production.</p>
<p>The archive preserves the current source paths and schemas. Follow the included migration map before any destination integration.
Destination database/auth/storage/services require deliberate setup; no live financial/provider services are enabled.</p>
<h2>Archive checksum</h2><p><code>${archiveHash}</code></p><p>ZIP size: ${(archiveBytes.length / 1024 / 1024).toFixed(2)} MiB.</p>
</main></body></html>`;
  fs.writeFileSync(path.join(exportDir, `${name}-download.html`), receipt);
  console.log(`Package created: exports/${name}.zip (${archiveBytes.length} bytes, ${manifest.files.length} verified files).`);
  console.log(`SHA-256: ${archiveHash}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
