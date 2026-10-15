import assert from "node:assert/strict";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";
import { runFreeProductionCli } from "./prepare-free-production.mjs";

const DATABASE_KEY = "QXLAYER_PRODUCTION_SUPABASE_PROVISIONING_DB_PASSWORD";
const SESSION_KEY = "QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET";

// Input is never echoed, added to readline history, logged, persisted, or placed
// in shell command-line arguments. This is NOT a Replit Secrets store operation.
export async function readHiddenSecret(label, { input, output }) {
  assert(input.isTTY && output.isTTY, "A private interactive terminal is required.");
  const muted = new Writable({ write(_chunk, _encoding, done) { done(); } });
  muted.isTTY = true;
  muted.columns = output.columns ?? 80;
  const controller = new AbortController();
  const reader = createInterface({ input, output: muted, terminal: true, historySize: 0 });
  reader.on("SIGINT", () => controller.abort());
  reader.on("close", () => controller.abort());
  output.write(`${label}: `);
  try {
    return await reader.question("", { signal: controller.signal });
  } finally {
    reader.close();
    muted.destroy();
    output.write("\n");
  }
}

export async function runInteractiveProductionSetup({
  env = process.env, input = process.stdin, output = process.stdout,
  prompt = readHiddenSecret, run = runFreeProductionCli,
} = {}) {
  assert(input.isTTY && output.isTTY, "Use the workspace Shell, not a workflow, pipe, or agent command.");
  output.write("This approved command pauses ONLY Staging and creates one independent Free Production project.\n");
  output.write("Live, accounts and publishing remain unchanged. Input is hidden; use your saved vault values.\n");
  // A private object, not process.env: never installs Shared secrets or changes
  // the environment of any application workflow.
  const scopedEnv = { ...env,
    QXLAYER_FREE_PRODUCTION_SETUP_APPROVED: "true",
    QXLAYER_STAGING_PAUSE_APPROVED: "true",
    QXLAYER_PRODUCTION_PROJECT_CREATION_APPROVED: "true",
  };
  try {
    scopedEnv[DATABASE_KEY] = await prompt("Saved Production database password", { input, output });
    scopedEnv[SESSION_KEY] = await prompt("Saved Production session-encryption key", { input, output });
    return await run(scopedEnv);
  } finally {
    // Releases references; JavaScript cannot guarantee erasure of immutable strings.
    delete scopedEnv[DATABASE_KEY];
    delete scopedEnv[SESSION_KEY];
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await runInteractiveProductionSetup(); }
  catch {
    // Never print the thrown object: libraries/provider errors can carry inputs.
    console.error("Preparation stopped. Credential details suppressed. Ask Agent to inspect readiness/saved state before retrying.");
    process.exitCode = 1;
  }
}
