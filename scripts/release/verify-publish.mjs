import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyProvisioningPlan } from "./provisioning-schema-contract.mjs";

const forbidden = /\b(?:db:push|push-force|drizzle-kit|pg_restore|pg_dump|db:seed|catalog:initialize|catalog:upgrade|core:upgrade|access:assign|remove-database-rls)\b/i;
const artifacts = [
  { dir: "api-server", workspace: "api-server", path: "/api", server: "artifacts/api-server/dist/index.mjs" },
  { dir: "private-label-console", workspace: "private-label-console", path: "/", server: "lib/production-access-gate/serve.mjs" },
  { dir: "private-label-website", workspace: "private-label-website", path: "/private-label-website/", server: "lib/production-access-gate/serve.mjs" },
];

export function verifyPublish(read) {
  const root = read(".replit").replace(/^\s*#.*$/gm, "");
  assert.match(root, /\[deployment\.build\][\s\S]*?args\s*=\s*\["pnpm",\s*"run",\s*"release:check"\]/,
    "Republish must run the read-only release preflight.");
  assert(!forbidden.test(root), "Database copy, seed, access repair or schema commands must not run through publishing.");

  for (const artifact of artifacts) {
    const manifest = read(`artifacts/${artifact.dir}/.replit-artifact/artifact.toml`)
      .replace(/^\s*#.*$/gm, "");
    const production = manifest.slice(manifest.indexOf("[services.production]"));
    assert(manifest.includes("[services.production]"), `${artifact.dir}: no Production configuration.`);
    assert(!forbidden.test(production), `${artifact.dir}: unsafe Production command.`);
    assert(production.includes(`@workspace/${artifact.workspace}`) && production.includes('"build"'),
      `${artifact.dir}: Production must build the current workspace source.`);
    assert(production.includes(artifact.server), `${artifact.dir}: wrong Production entrypoint.`);
    assert(manifest.includes(`"${artifact.path}"`), `${artifact.dir}: missing native service route.`);
    assert(production.includes("[services.production.health.startup]"),
      `${artifact.dir}: missing native startup health check.`);
    const pkg = JSON.parse(read(`artifacts/${artifact.dir}/package.json`));
    assert(pkg.scripts?.build && !forbidden.test(pkg.scripts.build), `${artifact.dir}: unsafe build script.`);
    if (artifact.dir !== "api-server") {
      assert.match(read(`artifacts/${artifact.dir}/vite.config.ts`), /emptyOutDir:\s*true/,
        `${artifact.dir}: stale frontend output must be cleared on build.`);
    }
  }
  const apiBuild = read("artifacts/api-server/build.mjs");
  assert(!forbidden.test(apiBuild), "API build must not initialize a database.");
  assert.match(apiBuild, /await rm\(distDir,\s*\{\s*recursive:\s*true,\s*force:\s*true\s*\}\)/,
    "API build must clear stale compiled output.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(import.meta.dirname, "../..");
  verifyPublish(path => readFileSync(resolve(root, path), "utf8"));
  const provisioning = verifyProvisioningPlan(
    JSON.parse(readFileSync(resolve(root, "reports/provisioning-constraint-investigation/native-publish-review.json"), "utf8")),
    readFileSync(resolve(root, "lib/db/src/schema/white-label-requests.ts"), "utf8"),
  );
  console.log(`PASS: reviewed native provisioning plan (${provisioning}); no SQL executed.`);
  console.log("This is a source-bound review snapshot, not a fresh Production readback. Review the live Publish plan before applying.");
  console.log("PASS: current-source builds, native routing/health checks, clean output and no database mutation hooks.");
  console.log("Republish deploys code and native schema changes; it does not merge configuration rows.");
  console.log("Keep Development-data copy/overwrite disabled to preserve existing Production records.");
}
