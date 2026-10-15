import assert from "node:assert/strict";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { runFreeProductionCli } from "./prepare-free-production.mjs";

const DATABASE_KEY = "QXLAYER_PRODUCTION_SUPABASE_PROVISIONING_DB_PASSWORD";
const SESSION_KEY = "QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET";

// Match only application-owned literal messages. Never return arbitrary error
// messages, stacks, causes, inputs or response bodies.
export function safeFailureCode(error) {
  const messages = {
    "Independent Production database password required in Secrets BEFORE pausing Staging.": "DATABASE_PASSWORD_MISSING_OR_SHORT",
    "Independent Production session key required BEFORE pausing Staging.": "SESSION_KEY_MISSING_OR_SHORT",
    "Production session key must differ from the database password and existing session keys.": "SESSION_KEY_REUSED",
    "Development password reuse is forbidden.": "DEVELOPMENT_PASSWORD_REUSED",
    "Staging password reuse is forbidden.": "STAGING_PASSWORD_REUSED",
    "Staging credential metadata invalid; details suppressed.": "STAGING_CREDENTIAL_METADATA_INVALID",
    "Pinned VYNOX organization required.": "ORGANIZATION_METADATA_MISSING_OR_INVALID",
    "Recent verified Staging data/Owner/MFA preservation evidence required.": "PRESERVATION_EVIDENCE_INVALID_OR_EXPIRED",
    "Organization must remain Free; no upgrade is authorized.": "FREE_PLAN_PRECHECK_FAILED",
    "Complete organization inventory required.": "INVENTORY_INCOMPLETE",
    "Development must remain healthy.": "DEVELOPMENT_HEALTH_PRECHECK_FAILED",
    "Only the two approved existing projects may occupy this organization.": "PROJECT_SCOPE_PRECHECK_FAILED",
    "A Production candidate already exists; reuse its saved state, never create a duplicate.": "EXISTING_PRODUCTION_CANDIDATE",
    "Existing provisioning state requires reconciliation; automatic duplicate execution refused.": "EXISTING_STATE_REQUIRES_RECONCILIATION",
    "Retained scoped setup authorization unavailable.": "SETUP_AUTHORIZATION_MISSING",
    "Use the workspace Shell, not a workflow, pipe, or agent command.": "INTERACTIVE_TERMINAL_REQUIRED",
  };
  if (Object.hasOwn(messages, error?.message)) return messages[error.message];
  const http = /^Scoped (organization|staging) operation failed \(([1-5][0-9]{2})\)\.$/.exec(error?.message ?? "");
  if (http) return `PROVIDER_${http[1].toUpperCase()}_HTTP_${http[2]}`;
  if (error?.name === "AbortError") return "INPUT_OR_REQUEST_CANCELLED";
  if (error?.code === "ENOENT") return "REQUIRED_INPUT_FILE_MISSING";
  return "UNCLASSIFIED_FAILURE_DETAILS_SUPPRESSED";
}

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
  prompt = readHiddenSecret, run = runFreeProductionCli, dryRun = true,
} = {}) {
  assert(input.isTTY && output.isTTY, "Use the workspace Shell, not a workflow, pipe, or agent command.");
  output.write(dryRun
    ? "READ-ONLY CHECK: no pause, creation, restore or publishing operations will run.\n"
    : "This approved command pauses ONLY Staging and creates one independent Free Production project.\n");
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
    return await run(scopedEnv, { dryRun });
  } finally {
    // Releases references; JavaScript cannot guarantee erasure of immutable strings.
    delete scopedEnv[DATABASE_KEY];
    delete scopedEnv[SESSION_KEY];
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const execute = args.length === 1 && args[0] === "--execute-approved";
  const valid = args.length === 0 || args.length === 1 && ["--check", "--execute-approved"].includes(args[0]);
  const dryRun = !execute;
  try {
    assert(valid, "Unsupported arguments; use --check for read-only diagnostics.");
    await runInteractiveProductionSetup({ dryRun });
  } catch (error) {
    // Never print the thrown object: libraries/provider errors can carry inputs.
    const code = safeFailureCode(error);
    try {
      await mkdir(".local", { recursive: true });
      await writeFile(".local/free-production-diagnostic.json",
        JSON.stringify({ mode: dryRun ? "READ_ONLY_CHECK" : "EXPLICIT_EXECUTION",
          code, capturedAt: new Date().toISOString(), credentialDetailsStored: false }) + "\n",
        { mode: 0o600 });
      console.error(`Preparation stopped (${code}). Safe diagnostic saved; do not retry execution without confirmation.`);
    } catch {
      console.error(`Preparation stopped (${code}). Diagnostic could not be saved; credential details suppressed.`);
    }
    process.exitCode = 1;
  }
}
