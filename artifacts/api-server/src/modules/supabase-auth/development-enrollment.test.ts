import assert from "node:assert/strict";
import { test, mock } from "node:test";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";
import { enrollDevelopmentIdentity } from "./development-enrollment";

const subject = "00000000-0000-4000-8000-000000000001";
const proof = { businessId: "user_existingOwner", subject: "user_existingOwner",
  email: "fictional-owner@example.test", name: "Fictional verified proof" };

async function scenario(owner: boolean, linked: boolean, failLogin = false) {
  const previous = { ...process.env };
  Object.assign(process.env, {
    NODE_ENV: "test", QXLAYER_EXTERNAL_ENVIRONMENT: "development", QXLAYER_AUTH_PROVIDER: "supabase",
    QXLAYER_DATABASE_PROVIDER: "replit", REPLIT_DEV_DOMAIN: "auth-test.replit.dev",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_URL: "https://auth-test.replit.dev",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_PROJECT_REF: "nktstksmfpcsjnjbeqsk",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SERVER_KEY: "sb_secret_synthetic_only",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SESSION_SECRET: "independent-synthetic-development-encryption",
  });
  const queries: { sql: string; values?: unknown[] }[] = [];
  const requests: { url: string; method?: string; body?: string }[] = [];
  const client = { query: async (sql: string, values?: unknown[]) => {
    queries.push({ sql, values });
    return { rows: [], rowCount: sql.includes("FROM public.platform_admins") ? Number(owner) :
      sql.includes("SELECT subject") ? Number(linked) : 0 };
  }, release() {} };
  mock.method(pool, "connect", async () => client);
  mock.method(pool, "query", async () => ({ rows: [{ hits: 1 }], rowCount: 1 }));
  mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    requests.push({ url: String(url), method: options.method, body: options.body as string | undefined });
    if (String(url).includes("grant_type=password")) {
      if (failLogin) return new globalThis.Response(JSON.stringify({ error_code: "invalid_credentials" }), { status: 400 });
      return new globalThis.Response(JSON.stringify({ access_token: "synthetic-only", refresh_token: "synthetic-only",
        user: { id: subject, email_confirmed_at: "2026-01-01" } }));
    }
    return new globalThis.Response(JSON.stringify({ id: subject }));
  });
  let error: unknown;
  try {
    await enrollDevelopmentIdentity({ headers: {}, socket: { remoteAddress: "127.0.0.1" } } as Request,
      { clearCookie() {} } as unknown as Response, proof, "fictional-chosen-password");
  } catch (e) { error = e; }
  finally {
    mock.restoreAll();
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
  return { queries, requests, error };
}

test("a verified but non-owner proof cannot create or link an owner identity", async () => {
  const result = await scenario(false, false);
  assert.equal((result.error as { status: number }).status, 403);
  assert.equal(result.requests.length, 0);
  assert(!result.queries.some(q => q.sql.startsWith("INSERT")));
});
test("an existing owner link is immutable and prevents duplicate enrollment", async () => {
  const result = await scenario(true, true);
  assert.equal((result.error as { status: number }).status, 409);
  assert.equal(result.requests.length, 0);
});
test("proved owner enrollment preserves the original business ID and performs no role writes", async () => {
  const result = await scenario(true, false);
  assert.equal(result.error, undefined);
  const insert = result.queries.find(q => q.sql.startsWith("INSERT"));
  assert.deepEqual(insert?.values, [subject, proof.businessId, proof.subject]);
  assert(result.queries.every(q => !/^(?:INSERT|UPDATE|DELETE).*public\./i.test(q.sql)));
  assert(result.requests.every(r => r.url.startsWith("https://nktstksmfpcsjnjbeqsk.supabase.co/")));
  assert(result.requests.some(r => r.url.includes("grant_type=password")));
  assert(result.requests.some(r => r.url.includes("logout?scope=local")));
});
test("failed password proof rolls back and removes only the identity created by that attempt", async () => {
  const result = await scenario(true, false, true);
  assert(result.error);
  assert(!result.queries.some(q => q.sql.startsWith("INSERT")));
  assert(result.queries.some(q => q.sql === "ROLLBACK"));
  assert(result.requests.some(r => r.method === "DELETE" && r.url.endsWith(`/admin/users/${subject}`)));
});
