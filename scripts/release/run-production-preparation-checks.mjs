import { spawn } from "node:child_process";
import { readdir, mkdir, open, writeFile } from "node:fs/promises";

// This workflow performs tests/builds only. No Production capture, migrations,
// provider writes, account creation, credential prompts or deployment.
const root = "generated-artifacts/auth-security";
await mkdir(root, { recursive: true });
const nodeTests = [];
for (const dir of ["scripts/release", "scripts/external-hosting"])
  for (const file of await readdir(dir))
    if (file.endsWith(".test.mjs")) nodeTests.push(`${dir}/${file}`);
const authTests = (await readdir("artifacts/api-server/src/modules/supabase-auth"))
  .filter(f => f.endsWith(".test.ts")).map(f => `src/modules/supabase-auth/${f}`);
const dbTests = (await readdir("lib/db/src")).filter(f => f.endsWith(".test.ts"))
  .map(f => `../../lib/db/src/${f}`);
const steps = [
  ["source-and-release-regressions", process.execPath, ["--test", ...nodeTests]],
  ["authentication-and-database", "pnpm", ["--filter", "@workspace/api-server", "exec", "tsx", "--test", ...authTests, ...dbTests]],
  ["typecheck", "pnpm", ["run", "typecheck"]],
  ["local-real-postgres-schema-rls", "python3", ["scripts/release/production-candidate-local-rehearsal.py"]],
  ["api-build", "pnpm", ["--filter", "@workspace/api-server", "run", "build"], { PORT: "8080", BASE_PATH: "/api" }],
  ["console-build", "pnpm", ["--filter", "@workspace/private-label-console", "run", "build"], { PORT: "5000", BASE_PATH: "/" }],
  ["website-build", "pnpm", ["--filter", "@workspace/private-label-website", "run", "build"], { PORT: "5001", BASE_PATH: "/private-label-website/" }],
];
const results = [];
for (const [name, binary, args, env] of steps) {
  const log = await open(`${root}/preparation-${name}.log`, "w", 0o600);
  const exitCode = await new Promise(resolve => {
    const child = spawn(binary, args, { env: { ...process.env, ...env }, stdio: ["ignore", log.fd, log.fd] });
    child.on("error", () => resolve(-1));
    child.on("close", code => resolve(code));
  });
  await log.close();
  results.push({ name, passed: exitCode === 0, exitCode });
  console.log(JSON.stringify(results.at(-1)));
}
await writeFile(`${root}/production-preparation-checks.json`, JSON.stringify({
  capturedAt: new Date().toISOString(), results, allPassed: results.every(r => r.passed),
  nativeProductionAcceptanceVerified: false, republishAuthorized: false, liveModified: false,
}, null, 2) + "\n");
process.exitCode = results.every(r => r.passed) ? 0 : 1;
