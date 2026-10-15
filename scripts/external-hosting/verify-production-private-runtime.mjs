import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { readHiddenSecret } from "./prepare-free-production-interactive.mjs";
import { PRODUCTION_REF } from "./supabase-production-auth-preparation.mjs";

export function validatePrivateInputs({ serverKey, sessionKey, otherServerKeys = [], otherSessionKeys = [] }) {
  const otherKeys = [...otherServerKeys, ...otherSessionKeys].filter(Boolean);
  assert(typeof serverKey === "string" && serverKey.length >= 30 &&
    (serverKey.startsWith("sb_secret_") || serverKey.startsWith("eyJ")) &&
    !otherKeys.includes(serverKey), "INDEPENDENT_SERVER_KEY_REQUIRED");
  assert(typeof sessionKey === "string" && sessionKey.length >= 32 &&
    sessionKey !== serverKey && !otherKeys.includes(sessionKey), "INDEPENDENT_SESSION_KEY_REQUIRED");
}

export async function verifyPrivateRuntime(input, request) {
  validatePrivateInputs(input);
  const settings = await request("/auth/v1/settings", input.serverKey);
  assert(settings.ok, "NATIVE_AUTH_SETTINGS_DENIED");
  const users = await request("/auth/v1/admin/users?page=1&per_page=1", input.serverKey);
  assert(users.ok, "NATIVE_ADMIN_PERMISSION_DENIED");
  const data = await users.json();
  assert(Array.isArray(data.users), "NATIVE_ADMIN_RESPONSE_INVALID");
  return { projectRef: PRODUCTION_REF, serverCredentialAccepted: true,
    independentSessionKeyValidated: true, nativeAdminReadAccepted: true,
    publishingStoredValuesIndependentlyVerified: false, liveDatabaseBindingVerified: false,
    ownerMigratedOrAccepted: false, accountWritesExecuted: false, liveModified: false,
    note: "Supplied private inputs validated; this does not attest the Publishing secret store or migrate an Owner." };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assert(process.argv[2] === "--private-readonly-check" && process.stdin.isTTY && process.stdout.isTTY,
      "PRIVATE_TERMINAL_REQUIRED");
    assert(process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0", "VERIFIED_TLS_REQUIRED");
    const input = { serverKey: await readHiddenSecret("New Production Supabase server key: ",
      { input: process.stdin, output: process.stdout }),
    sessionKey: await readHiddenSecret("Saved Production session secret: ",
      { input: process.stdin, output: process.stdout }),
    otherServerKeys: [process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SERVER_KEY, process.env.QXLAYER_SUPABASE_AUTH_SERVER_KEY],
    otherSessionKeys: [process.env.SESSION_SECRET, process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SESSION_SECRET,
      process.env.QXLAYER_SUPABASE_AUTH_SESSION_SECRET] };
    const result = await verifyPrivateRuntime(input, (path, key) => {
      assert(["/auth/v1/settings", "/auth/v1/admin/users?page=1&per_page=1"].includes(path), "READONLY_PATH_REQUIRED");
      return fetch(`https://${PRODUCTION_REF}.supabase.co${path}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }, method: "GET",
        redirect: "error", signal: AbortSignal.timeout(20000),
      });
    });
    input.serverKey = undefined; input.sessionKey = undefined;
    await mkdir("generated-artifacts/auth-security", { recursive: true });
    await writeFile("generated-artifacts/auth-security/production-private-runtime-readback.json",
      JSON.stringify({ ...result, capturedAt: new Date().toISOString() }, null, 2) + "\n");
    console.log(JSON.stringify(result));
  } catch {
    console.error("PRIVATE_PRODUCTION_READBACK_BLOCKED; private errors and inputs suppressed. No writes executed.");
    process.exitCode = 1;
  }
}
