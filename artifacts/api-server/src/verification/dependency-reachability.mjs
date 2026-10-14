import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
// The retired proxy no longer pulls its parser dependencies into the API.
for (const path of ["../../package.json", "../../../private-label-console/package.json"]) {
  const pkg = JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }))
    assert.ok(!name.startsWith("@clerk/") && name !== "better-auth", `Retired dependency remains: ${name}`);
}
const storageRequire = createRequire(require.resolve("@google-cloud/storage"));
const authRequire = createRequire(storageRequire.resolve("google-auth-library"));
const chain = [storageRequire, authRequire, createRequire(authRequire.resolve("gcp-metadata")),
  createRequire(authRequire.resolve("gtoken"))];
const entries = chain.map(r => r.resolve("gaxios"));
assert.equal(new Set(entries).size, 1, "Reassess additional storage HTTP client versions.");
const source = await readFile(new URL("./gaxios.js", pathToFileURL(entries[0])), "utf8");
assert.deepEqual([...source.matchAll(/\buuid_1\.(v\d+)\b/g)].map(m => m[1]), ["v4"],
  "Reassess use of affected UUID methods.");
console.log("PASS: retired authentication dependencies absent; storage HTTP clients use the reviewed UUID v4 path.");
