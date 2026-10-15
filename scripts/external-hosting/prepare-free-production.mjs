import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const STAGING = "muvedavhbpgpdrrnjrih";
export const DEVELOPMENT = "nktstksmfpcsjnjbeqsk";
export const PRODUCTION_NAME = "VYNOX-LAYER-PRODUCTION";
const STATE_PATH = ".local/free-production-provisioning.json";

// Resource preparation only. Never activates the application, migrates users,
// edits existing settings, deletes projects, upgrades billing or publishes.
export async function prepareFreeProduction({ env, preservation, request, save, dryRun = false, sleep = ms => new Promise(r => setTimeout(r, ms)) }) {
  assert(env.QXLAYER_FREE_PRODUCTION_SETUP_APPROVED === "true", "Explicit Free resource preparation approval required.");
  assert(env.QXLAYER_STAGING_PAUSE_APPROVED === "true", "Separate current Staging pause approval required; saved secrets do not authorize downtime.");
  assert(env.QXLAYER_PRODUCTION_PROJECT_CREATION_APPROVED === "true", "Separate empty Production project creation approval required.");
  const password = env.QXLAYER_PRODUCTION_SUPABASE_PROVISIONING_DB_PASSWORD;
  assert(typeof password === "string" && password.length >= 32, "Independent Production database password required in Secrets BEFORE pausing Staging.");
  const sessionKey = env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET;
  assert(typeof sessionKey === "string" && sessionKey.length >= 32,
    "Independent Production session key required BEFORE pausing Staging.");
  assert(sessionKey !== password &&
    ![env.SESSION_SECRET, env.QXLAYER_SUPABASE_AUTH_SESSION_SECRET,
      env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SESSION_SECRET].includes(sessionKey),
    "Production session key must differ from the database password and existing session keys.");
  assert(password !== env.QXLAYER_DEVELOPMENT_SUPABASE_PROVISIONING_DB_PASSWORD,
    "Development password reuse is forbidden.");
  if (env.QXLAYER_SUPABASE_DATABASE_URL) {
    let stagingPassword;
    try { stagingPassword = decodeURIComponent(new URL(env.QXLAYER_SUPABASE_DATABASE_URL).password); }
    catch { throw Error("Staging credential metadata invalid; details suppressed."); }
    assert(password !== stagingPassword, "Staging password reuse is forbidden.");
  }
  const org = env.QXLAYER_DEVELOPMENT_SUPABASE_ORGANIZATION_SLUG;
  assert(/^[a-z0-9]{20}$/.test(org ?? ""), "Pinned VYNOX organization required.");
  assert(preservation?.ref === STAGING && preservation.environment === "staging" &&
    preservation.snapshotVerified === true && preservation.tlsVerified === true &&
    preservation.protectedAdministrator?.protected_admin_links_with_verified_totp === 1 &&
    preservation.businessBaselineComparison.changed.length === 0 &&
    preservation.businessBaselineComparison.missing.length === 0 &&
    Date.now() - Date.parse(preservation.capturedAt) >= 0 &&
    Date.now() - Date.parse(preservation.capturedAt) < 86400000,
  "Recent verified Staging data/Owner/MFA preservation evidence required.");

  const organization = await request("organization", "GET", `/organizations/${org}`);
  assert(organization.id === org && organization.plan === "free", "Organization must remain Free; no upgrade is authorized.");
  const list = async () => {
    const page = await request("organization", "GET", `/organizations/${org}/projects?limit=100&offset=0`);
    assert(Array.isArray(page.projects) && page.pagination?.count === page.projects.length &&
      page.pagination.offset === 0, "Complete organization inventory required.");
    assert(page.projects.some(p => p.ref === DEVELOPMENT && p.status === "ACTIVE_HEALTHY"), "Development must remain healthy.");
    return page.projects;
  };
  const initial = await list();
  assert(!initial.some(p => p.name === PRODUCTION_NAME), "A Production candidate already exists; reuse its saved state, never create a duplicate.");
  assert(initial.length === 2 && initial.every(p => [STAGING, DEVELOPMENT].includes(p.ref)) &&
    initial.find(p => p.ref === STAGING)?.status === "ACTIVE_HEALTHY", "Only the two approved existing projects may occupy this organization.");
  if (dryRun) return { phase: "READ_ONLY_PRECHECKS_PASSED", productionProjectRef: null };
  const state = { mode: "FREE_RESOURCE_PREPARATION", organization: org, staging: STAGING,
    development: DEVELOPMENT, pauseApproved: true, createEmptyFreeProjectApproved: true,
    liveChangesApproved: false, migrateAccountsApproved: false, republishApproved: false,
    phase: "PRECHECKS_PASSED", productionProjectRef: null, dataPreservationEvidence: "generated-artifacts/auth-security/staging-pre-pause-data-preservation.json" };
  await save(state);
  state.phase = "STAGING_PAUSE_INTENT"; await save(state);
  await request("staging", "POST", `/projects/${STAGING}/pause`);
  state.phase = "STAGING_PAUSE_REQUESTED"; state.pauseRequestedAt = new Date().toISOString(); await save(state);
  let paused = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const project = await request("staging", "GET", `/projects/${STAGING}`);
    assert((project.ref ?? project.id) === STAGING, "Staging status scope mismatch.");
    if (project.status === "INACTIVE") { paused = true; break; }
    await sleep(5000);
  }
  assert(paused, "Pause not confirmed; Production creation withheld. Do not repeat the pause request blindly.");
  state.phase = "STAGING_PAUSED"; await save(state);
  await list(); // Confirms Development is still healthy before allocating the slot.
  try {
    state.phase = "PRODUCTION_CREATE_INTENT"; await save(state);
    const created = await request("organization", "POST", "/projects", {
      organization_slug: org, name: PRODUCTION_NAME, db_pass: password,
      plan: "free", region: "eu-west-1",
    });
    const ref = created.ref ?? created.id;
    assert(/^[a-z0-9]{20}$/.test(ref ?? "") && ![STAGING, DEVELOPMENT].includes(ref), "Independent created project reference required.");
    state.productionProjectRef = ref; state.phase = "PRODUCTION_CREATED"; await save(state);
    const projects = await list();
    assert(projects.some(p => p.ref === ref && p.name === PRODUCTION_NAME), "Created project must appear in the approved organization.");
    assert(projects.find(p => p.ref === STAGING)?.status === "INACTIVE", "Staging must remain paused, never repurposed.");
    assert((await request("organization", "GET", `/organizations/${org}`)).plan === "free", "Billing plan changed unexpectedly; stop.");
    state.phase = "FREE_PROJECT_CREATED_AUTH_NOT_ACTIVATED"; await save(state);
    return state;
  } catch (error) {
    // Resolve an ambiguous create outcome before considering compensation.
    // Never delete an empty candidate or risk resuming a third active project.
    let projects;
    try { projects = await list(); } catch { state.phase = "CREATE_OUTCOME_UNKNOWN"; await save(state); throw error; }
    const candidates = projects.filter(p => p.name === PRODUCTION_NAME);
    if (candidates.length === 1) {
      state.productionProjectRef = candidates[0].ref;
      state.phase = "CANDIDATE_EXISTS_REVIEW_REQUIRED";
    } else if (candidates.length === 0 && projects.length === 2) {
      await request("staging", "POST", `/projects/${STAGING}/restore`);
      state.phase = "STAGING_RESUME_REQUESTED_AFTER_FAILED_CREATE";
    } else state.phase = "CREATE_OUTCOME_REVIEW_REQUIRED";
    await save(state);
    throw error;
  }
}

export async function runFreeProductionCli(env = process.env, { dryRun = false } = {}) {
  // No state is overwritten and no credential is read from a file. Resume any
  // prior partial operation through its saved state instead of re-running.
  try { await readFile(STATE_PATH); throw Error("Existing provisioning state requires reconciliation; automatic duplicate execution refused."); }
  catch (e) { if (e.code !== "ENOENT") throw e; }
  const preservation = JSON.parse(await readFile("generated-artifacts/auth-security/staging-pre-pause-data-preservation.json", "utf8"));
  const request = async (scope, method, path, body) => {
    assert(!dryRun || method === "GET", "Read-only diagnostic mode forbids provider mutations.");
    const permitted = scope === "staging"
      ? path === `/projects/${STAGING}` && method === "GET" ||
        [`/projects/${STAGING}/pause`, `/projects/${STAGING}/restore`].includes(path) && method === "POST"
      : method === "GET" && path.startsWith(`/organizations/${env.QXLAYER_DEVELOPMENT_SUPABASE_ORGANIZATION_SLUG}`) ||
        path === "/projects" && method === "POST" && body?.name === PRODUCTION_NAME && body.plan === "free";
    assert(permitted, "Provider operation outside approved preparation scope.");
    const token = scope === "staging" ? env.QXLAYER_STAGING_SUPABASE_AUTH_SETUP_TOKEN : env.QXLAYER_DEVELOPMENT_SUPABASE_PROVISIONING_TOKEN;
    assert(token, "Retained scoped setup authorization unavailable.");
    const response = await fetch(`https://api.supabase.com/v1${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      redirect: "error", signal: AbortSignal.timeout(30000), ...(body ? { body: JSON.stringify(body) } : {}),
    });
    // Provider responses/errors may contain secrets: never log raw bodies.
    assert(response.ok, `Scoped ${scope} operation failed (${response.status}).`);
    // Pause/restore responses need not contain JSON; status polling verifies
    // the outcome. Do not mistake an empty successful response for failure.
    if (scope === "staging" && method === "POST") return {};
    return response.json();
  };
  const save = async state => {
    assert(!dryRun, "Read-only diagnostic mode forbids provisioning state writes.");
    await mkdir(".local", { recursive: true });
    await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
  };
  const state = await prepareFreeProduction({ env, preservation, request, save, dryRun });
  console.log(JSON.stringify({ phase: state.phase, productionProjectRef: state.productionProjectRef,
    stagingPaused: !dryRun, developmentHealthy: true, billingPlan: "free", liveModified: false,
    accountsMigrated: false, authActivated: false, republished: false }));
  return state;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runFreeProductionCli();
}
