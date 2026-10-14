import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { pool } from "@workspace/db";
import { updateSession, type AuthSession } from "./session";

test("Development cannot acknowledge MFA when its browser session disappeared during verification", async () => {
  const before = { ...process.env };
  Object.assign(process.env, { QXLAYER_EXTERNAL_ENVIRONMENT: "development", QXLAYER_AUTH_PROVIDER: "supabase",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SESSION_SECRET: "synthetic-independent-development-session-update-key" });
  const subject = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const user = { id: subject, email: "synthetic@example.test" };
  const s: AuthSession = { digest: "synthetic-digest", user, aal2: false,
    payload: { subject, accessToken: "synthetic-old-access", refreshToken: "synthetic-old-refresh",
      tokenExpires: Date.now() + 3600000, created: Date.now(), recovery: false } };
  mock.method(pool, "query", async () => ({ rowCount: 0, rows: [] }));
  try {
    await assert.rejects(updateSession(s, { user, access_token: "synthetic-new-access",
      refresh_token: "synthetic-new-refresh", expires_in: 3600 }),
    { status: 401, message: /pending sign-in session is no longer available/ });
  } finally {
    mock.restoreAll();
    for (const k of Object.keys(process.env)) if (!(k in before)) delete process.env[k];
    Object.assign(process.env, before);
  }
});
