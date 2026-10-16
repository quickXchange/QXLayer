import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { createHash } from "node:crypto";
import { ReplitConnectors } from "@replit/connectors-sdk";
assert.equal(process.env.VYNOX_PRODUCTION_ACCEPTANCE_APPROVED, "true");
const groupId = "evg-db936g3bc2fs73cmm5dg";
const rh = { Authorization: `Bearer ${process.env.RENDER_API_KEY}`, "Content-Type": "application/json" };
const get = await fetch(`https://api.render.com/v1/env-groups/${groupId}`, { headers: rh });
assert(get.ok); const group = await get.json();
const env = Object.fromEntries(group.envVars.map(x => [x.key, x.value]));
assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF, "qcgvhlphalxqzzsxqjhi");
assert.equal(new URL(env.DATABASE_URL).username, "qxlayer_app.qcgvhlphalxqzzsxqjhi");
assert.equal(new URL(env.QXLAYER_PRODUCTION_AUTH_DATABASE_URL).username, "qxlayer_auth_app.qcgvhlphalxqzzsxqjhi");
const proof = JSON.parse(await readFile("generated-artifacts/external-finalization/production-initialization.json", "utf8"));
assert(proof.exactSchemaAndPoliciesVerified && proof.permissions.realRestrictedLogins && proof.nativeExistingDataPreserved);
const supabase = "https://qcgvhlphalxqzzsxqjhi.supabase.co";
const sh = { apikey: env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY,
  Authorization: `Bearer ${env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY}`, "Content-Type": "application/json" };
for (const name of ["vynox-production-private", "vynox-migration-backups"]) {
  const r = await fetch(`${supabase}/storage/v1/bucket/${name}`, { headers: sh });
  if (r.status === 404 || r.status === 400) {
    const created = await fetch(`${supabase}/storage/v1/bucket`, { method: "POST", headers: sh,
      body: JSON.stringify({ id: name, name, public: false }) });
    assert(created.ok, `Private bucket creation HTTP ${created.status}`);
  } else { assert(r.ok); assert.equal((await r.json()).public, false); }
}
const backup = JSON.parse(await readFile("generated-artifacts/external-finalization/production-initialization-backup.json", "utf8"));
const bytes = await readFile(backup.snapshotFile);
const object = `before-initialization/${basename(backup.snapshotFile)}`;
if (!backup.remoteCiphertextReadbackVerified) {
  const uploaded = await fetch(`${supabase}/storage/v1/object/vynox-migration-backups/${object}`,
    { method: "POST", headers: { ...sh, "Content-Type": "application/octet-stream", "x-upsert": "false" }, body: bytes });
  assert(uploaded.ok || uploaded.status === 409, "Encrypted backup storage failed");
}
const recovered = await fetch(`${supabase}/storage/v1/object/authenticated/vynox-migration-backups/${object}`, { headers: sh });
assert(recovered.ok);
assert.equal(createHash("sha256").update(Buffer.from(await recovered.arrayBuffer())).digest("hex"),
  createHash("sha256").update(bytes).digest("hex"), "Independent encrypted backup readback must match");
await writeFile("generated-artifacts/external-finalization/production-initialization-backup.json",
  JSON.stringify({ ...backup, independentDurableCopy: true, privateBucket: "vynox-migration-backups",
    object, remoteCiphertextReadbackVerified: true }, null, 2));
const origin = "https://qxlayer-acceptance-vynox3.vercel.app";
const settings = { QXLAYER_EXTERNAL_ACCEPTANCE_APPROVED: "true", QXLAYER_EXTERNAL_STARTUP_APPROVED: "true",
  QXLAYER_PRODUCTION_SCHEMA_VERIFIED: "true", QXLAYER_PLATFORM_URL: origin,
  QXLAYER_PRODUCTION_SUPABASE_AUTH_URL: origin, QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED: "false",
  QXLAYER_STORAGE_PROVIDER: "supabase", SUPABASE_STORAGE_URL: supabase,
  SUPABASE_STORAGE_BUCKET: "vynox-production-private", SUPABASE_STORAGE_SERVICE_KEY: env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY };
for (const [key, value] of Object.entries(settings)) {
  const r = await fetch(`https://api.render.com/v1/env-groups/${groupId}/env-vars/${key}`,
    { method: "PUT", headers: rh, body: JSON.stringify({ value }) });
  assert(r.ok, "Acceptance backend configuration failed");
}
// Only server-side Preview gate controls; no database/Auth/storage credentials in Vercel.
const sdk = new ReplitConnectors(), project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx", team = "team_eoJE6FCcm9esuqnRTUsmopzy";
const existing = await sdk.proxy("vercel", `/v10/projects/${project}/env?teamId=${team}`);
assert(existing.ok); const vars = (await existing.json()).envs;
for (const [key, value] of Object.entries({ QXLAYER_EXTERNAL_ENVIRONMENT: "production",
  PRODUCTION_ACCESS_GATE_ENABLED: "true", PRODUCTION_ACCESS_CODE: env.PRODUCTION_ACCESS_CODE,
  QXLAYER_PLATFORM_URL: origin })) {
  const previous = vars.find(x => x.key === key && x.target?.includes("preview") && !x.gitBranch);
  let update = previous;
  if (previous?.target.length > 1) {
    const preserve = await sdk.proxy("vercel", `/v9/projects/${project}/env/${previous.id}?teamId=${team}`,
      { method: "PATCH", body: { target: previous.target.filter(t => t !== "preview") } });
    assert(preserve.ok, "Preserve unrelated environment values before splitting Preview");
    update = undefined;
  }
  const path = `/${update ? "v9" : "v10"}/projects/${project}/env${update ? `/${update.id}` : ""}?teamId=${team}`;
  const r = await sdk.proxy("vercel", path, { method: update ? "PATCH" : "POST",
    body: update ? { value, target: ["preview"] } :
      { key, value, type: key === "PRODUCTION_ACCESS_CODE" ? "sensitive" : "encrypted", target: ["preview"] } });
  if (!r.ok) {
    const error = await r.json();
    let safe = JSON.stringify(error.error ?? {});
    for (const secret of Object.values({ ...env, ...settings }).filter(v => typeof v === "string" && v.length > 6))
      safe = safe.split(secret).join("[redacted]");
    console.error(JSON.stringify({ key, providerError: safe.slice(0, 450) }));
  }
  assert(r.ok, `Preview gate configuration HTTP ${r.status}`);
}
console.log(JSON.stringify({ isolatedProtectedAcceptanceConfigured: true, privateStorageConfigured: true,
  encryptedBackupRemoteReadbackVerified: true, authCutoverApproved: false, liveChanged: false, customDnsChanged: false }));
