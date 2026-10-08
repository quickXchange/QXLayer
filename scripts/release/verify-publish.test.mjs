import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { verifyPublish } from "./verify-publish.mjs";

const root = resolve(import.meta.dirname, "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const replace = (path, transform) => requested =>
  requested === path ? transform(read(requested)) : read(requested);

test("native release configuration passes without connecting to a database", () => {
  assert.doesNotThrow(() => verifyPublish(read));
});
test("rejects publishing that omits the preflight", () => {
  assert.throws(() => verifyPublish(replace(".replit", s => s.replace("release:check", "build"))));
});
test("rejects Production schema and catalog initialization hooks", () => {
  for (const command of ["db:push", "push-force", "drizzle-kit", "pg_restore", "db:seed:dev", "catalog:initialize:dev"]) {
    assert.throws(() => verifyPublish(replace(
      "artifacts/api-server/.replit-artifact/artifact.toml", s => s + `\n# Test command\nrun = "${command}"\n`,
    )), command);
  }
});
test("rejects stale-output frontend builds and wrong API entrypoints", () => {
  assert.throws(() => verifyPublish(replace("artifacts/private-label-console/vite.config.ts",
    s => s.replace("emptyOutDir: true", "emptyOutDir: false"))));
  assert.throws(() => verifyPublish(replace("artifacts/api-server/.replit-artifact/artifact.toml",
    s => s.replace("artifacts/api-server/dist/index.mjs", "artifacts/api-server/src/index.ts"))));
});
