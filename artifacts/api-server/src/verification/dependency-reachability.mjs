import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
// The retired proxy no longer pulls its parser dependencies into the API.
for (const path of ["../../package.json", "../../../private-label-console/package.json"]) {
  const pkg = JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }))
    assert.ok(!name.startsWith("@clerk/") && name !== "better-auth", `Retired dependency remains: ${name}`);
}
const storageRequire = createRequire(require.resolve("@google-cloud/storage"));
const authRequire = createRequire(storageRequire.resolve("google-auth-library"));
const entries = [storageRequire, authRequire, createRequire(authRequire.resolve("gcp-metadata"))]
  .map(r => r.resolve("gaxios"));
assert.equal(new Set(entries).size, 1, "Reassess additional storage HTTP client versions.");
const lock = await readFile(new URL("../../../../pnpm-lock.yaml", import.meta.url), "utf8");
assert(!/^\s{2}(?:uuid@9\.|braces@3\.0\.3|postcss-selector-parser@6\.)/m.test(lock),
  "A previously vulnerable dependency re-entered the workspace.");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage({ projectId: "synthetic-contract-only" });
const file = storage.bucket("synthetic-contract-only").file("synthetic-contract-only");
for (const method of ["getMetadata", "download", "delete", "getSignedUrl", "createReadStream", "createWriteStream"])
  assert.equal(typeof file[method], "function", `Storage API contract changed: ${method}`);
console.log("PASS: retired auth and vulnerable dependency versions absent; supported storage API contracts preserved.");
