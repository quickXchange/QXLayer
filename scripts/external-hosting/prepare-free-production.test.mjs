import test from "node:test";
import assert from "node:assert/strict";
import { prepareFreeProduction, STAGING, DEVELOPMENT, PRODUCTION_NAME } from "./prepare-free-production.mjs";

function fixture({ failure = false, ambiguous = false, paid = false } = {}) {
  const ref = "prod0123456789abcdef", org = "organizationabcdefgh";
  const env = { QXLAYER_FREE_PRODUCTION_SETUP_APPROVED: "true",
    QXLAYER_STAGING_PAUSE_APPROVED: "true",
    QXLAYER_PRODUCTION_PROJECT_CREATION_APPROVED: "true",
    QXLAYER_PRODUCTION_SUPABASE_PROVISIONING_DB_PASSWORD: "synthetic-only-password".repeat(2),
    QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET: "synthetic-independent-session-key".repeat(2),
    QXLAYER_DEVELOPMENT_SUPABASE_ORGANIZATION_SLUG: org };
  const preservation = { ref: STAGING, environment: "staging", snapshotVerified: true,
    tlsVerified: true, protectedAdministrator: { protected_admin_links_with_verified_totp: 1 },
    businessBaselineComparison: { changed: [], missing: [] }, capturedAt: new Date().toISOString() };
  let paused = false, created = false;
  const calls = [], states = [];
  const request = async (scope, method, path, body) => {
    calls.push({ scope, method, path, body });
    if (path === `/organizations/${org}`) return { id: org, plan: paid ? "pro" : "free" };
    if (path.includes("/projects?")) {
      const projects = [{ ref: STAGING, status: paused ? "INACTIVE" : "ACTIVE_HEALTHY" },
        { ref: DEVELOPMENT, status: "ACTIVE_HEALTHY" }];
      if (created) projects.push({ ref, name: PRODUCTION_NAME, status: "ACTIVE_HEALTHY" });
      return { projects, pagination: { count: projects.length, offset: 0 } };
    }
    if (path.endsWith("/pause")) { paused = true; return {}; }
    if (path.endsWith("/restore")) { paused = false; return {}; }
    if (path === `/projects/${STAGING}`) return { ref: STAGING, status: paused ? "INACTIVE" : "ACTIVE_HEALTHY" };
    if (path === "/projects") { created = ambiguous || !failure; if (failure) throw Error("synthetic create failure"); return { ref }; }
    throw Error("Unexpected operation");
  };
  return { env, preservation, request, save: async s => states.push(structuredClone(s)),
    sleep: async () => {}, calls, states };
}
test("missing independent password or missing approval stops before provider calls or pause", async () => {
  for (const patch of [{ QXLAYER_PRODUCTION_SUPABASE_PROVISIONING_DB_PASSWORD: undefined },
    { QXLAYER_FREE_PRODUCTION_SETUP_APPROVED: undefined },
    { QXLAYER_DEVELOPMENT_SUPABASE_PROVISIONING_DB_PASSWORD: "synthetic-only-password".repeat(2) }]) {
    const f = fixture(); Object.assign(f.env, patch);
    await assert.rejects(prepareFreeProduction(f)); assert.equal(f.calls.length, 0);
  }
});
test("unverified preservation and paid plans refuse resource changes", async () => {
  const unsafe = fixture(); unsafe.preservation.snapshotVerified = false;
  await assert.rejects(prepareFreeProduction(unsafe)); assert.equal(unsafe.calls.length, 0);
  const paid = fixture({ paid: true }); await assert.rejects(prepareFreeProduction(paid));
  assert(paid.calls.every(c => c.method === "GET"));
});
test("general preparation approval and saved secrets do not authorize pause or creation", async () => {
  for (const key of ["QXLAYER_STAGING_PAUSE_APPROVED", "QXLAYER_PRODUCTION_PROJECT_CREATION_APPROVED"]) {
    for (const value of [undefined, "false"]) {
      const f = fixture(); f.env[key] = value;
      await assert.rejects(prepareFreeProduction(f));
      assert.equal(f.calls.length, 0); assert.equal(f.states.length, 0);
    }
  }
});
test("missing or reused session keys stop before provider calls", async () => {
  for (const patch of [
    { QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET: undefined },
    { QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET: "too-short" },
    { QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET: "synthetic-only-password".repeat(2) },
    ...["SESSION_SECRET", "QXLAYER_SUPABASE_AUTH_SESSION_SECRET",
      "QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SESSION_SECRET"].map(key => ({
      [key]: "synthetic-independent-session-key".repeat(2),
    })),
  ]) {
    const f = fixture(); Object.assign(f.env, patch);
    await assert.rejects(prepareFreeProduction(f));
    assert.equal(f.calls.length, 0); assert.equal(f.states.length, 0);
  }
});
test("stale/future preservation and malformed credential metadata fail closed without leaking input", async () => {
  for (const offset of [-86400001, 60000]) {
    const f = fixture(); f.preservation.capturedAt = new Date(Date.now() + offset).toISOString();
    await assert.rejects(prepareFreeProduction(f)); assert.equal(f.calls.length, 0);
  }
  const f = fixture(); f.env.QXLAYER_SUPABASE_DATABASE_URL = "malformed-sensitive-input";
  await assert.rejects(prepareFreeProduction(f), e => !JSON.stringify(e).includes("malformed-sensitive-input") &&
    !e.message.includes("malformed-sensitive-input"));
  assert.equal(f.calls.length, 0);
});
test("approved flow pauses only Staging and creates one empty Free independent project", async () => {
  const f = fixture(); const state = await prepareFreeProduction(f);
  assert.equal(state.phase, "FREE_PROJECT_CREATED_AUTH_NOT_ACTIVATED");
  const writes = f.calls.filter(c => c.method !== "GET");
  assert.deepEqual(writes.map(c => c.path), [`/projects/${STAGING}/pause`, "/projects"]);
  assert.equal(writes[1].body.plan, "free");
  assert.equal(state.liveChangesApproved, false); assert.equal(state.migrateAccountsApproved, false);
  assert.equal(state.republishApproved, false);
  assert(!JSON.stringify(f.states).includes(f.env.QXLAYER_PRODUCTION_SUPABASE_PROVISIONING_DB_PASSWORD));
  assert(!JSON.stringify(f.states).includes(f.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET));
});
test("confirmed failed creation requests Staging resume, never deletes or changes Development", async () => {
  const f = fixture({ failure: true }); await assert.rejects(prepareFreeProduction(f));
  assert(f.calls.some(c => c.path === `/projects/${STAGING}/restore`));
  assert(!f.calls.some(c => c.method === "DELETE" || c.path.includes(DEVELOPMENT)));
});
test("ambiguous creation discovers the existing candidate instead of resuming a third project", async () => {
  const f = fixture({ failure: true, ambiguous: true }); await assert.rejects(prepareFreeProduction(f));
  assert.equal(f.states.at(-1).phase, "CANDIDATE_EXISTS_REVIEW_REQUIRED");
  assert(!f.calls.some(c => c.path.endsWith("/restore")));
});
test("ambiguous pause retains intent and never proceeds to project creation", async () => {
  const f = fixture(), request = f.request;
  f.request = async (...args) => {
    const result = await request(...args);
    if (args[2].endsWith("/pause")) throw Error("synthetic ambiguous pause");
    return result;
  };
  await assert.rejects(prepareFreeProduction(f));
  assert.equal(f.states.at(-1).phase, "STAGING_PAUSE_INTENT");
  assert(!f.calls.some(c => c.path === "/projects" && c.method === "POST"));
});
