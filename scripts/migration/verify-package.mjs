import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";

// Runs from an extracted package without npm dependencies, credentials or database access.
const root = import.meta.dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(root, "PACKAGE_MANIFEST.json"), "utf8"));
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const paths = new Set();
function list(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), "Package must not contain symbolic links");
    return entry.isDirectory() ? list(file) : [path.relative(root, file).split(path.sep).join("/")];
  });
}
for (const file of manifest.files) {
  assert.ok(!paths.has(file.path), "Duplicate manifest entry");
  paths.add(file.path);
  assert.ok(!file.path.startsWith("/") && !file.path.split("/").includes(".."), "Unsafe package path");
  assert.ok(!/(?:^|\/)(?:\.env(?:\.[^/]*)?|\.git|node_modules|dist|\.agents|\.local|attached_assets)(?:\/|$)/.test(file.path), "Forbidden package content");
  const filename = path.resolve(root, file.path);
  assert.ok(filename.startsWith(root + path.sep), "Path escaped package");
  assert.ok(!fs.lstatSync(filename).isSymbolicLink(), "Symlink escaped package");
  const bytes = fs.readFileSync(filename);
  assert.equal(bytes.length, file.bytes, `Size mismatch: ${file.path}`);
  assert.equal(sha(bytes), file.sha256, `Checksum mismatch: ${file.path}`);
}
assert.deepEqual(list(root).filter(p => p !== "PACKAGE_MANIFEST.json").sort(), [...paths].sort(), "Missing or unexpected files");
assert.equal(manifest.status.destinationIntegrated, false);
assert.equal(manifest.status.productionChanged, false);
assert.equal(manifest.status.customerDataIncluded, false);
const artwork = manifest.files.filter(f => f.category === "catalog-artwork");
assert.equal(artwork.length, manifest.artwork.originalBlobCount);
for (const file of artwork) assert.equal(path.basename(file.path).split(".")[0], file.sha256, "Artwork hash changed");
assert.equal(manifest.artwork.originalBlobCount, 241);
assert.equal(manifest.artwork.visualIdentityCount, 424);
console.log(`PASS: ${manifest.files.length} package files, ${artwork.length} original artwork blobs; SHA-256, sizes, paths and content inventory match.`);
console.log("Source handoff only. This verifier does not install, connect to a database, transfer files to storage or run either application.");
