/** Exact disposable QA cleanup only. Never connects to Production. */
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
if (process.env.QXLAYER_STAGING_WORKFLOW_QA_APPROVED !== "true") throw Error("Staging QA approval required.");
const file = "generated-artifacts/qxlayer-staging-setup/workflow-fixture.json";
const f = JSON.parse(await readFile(file, "utf8"));
if (f.scope !== "disposable-staging-workflow-qa" || !f.customerUserId) throw Error("Exact disposable manifest required.");
const groupId = "evg-db5ate8473hc73agdon0", apiId = "srv-db5b47qjnfac739s374g";
async function api(path, method = "GET", body) {
  const r = await fetch(`https://api.render.com/v1/${path}`, { method,
    headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) throw Error(`Staging cleanup HTTP ${r.status}`);
  const text = await r.text(); return text ? JSON.parse(text) : null;
}
const group = await api(`env-groups/${groupId}`);
const env = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
const bindings = JSON.parse(env.QXLAYER_STAGING_IDENTITY_BINDINGS);
if (env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" || bindings[f.customerUserId] !== f.customerUserId ||
    !env.CLERK_SECRET_KEY.startsWith("sk_test_") ||
    (await api("services/srv-db5b48o473hc73ah56d0")).suspended !== "suspended")
  throw Error("Staging cleanup boundaries changed.");
const owner = Object.entries(bindings).find(([key]) => key !== f.customerUserId)?.[1];
const backendRequire = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
const { createClerkClient } = createRequire(backendRequire.resolve("@clerk/express"))("@clerk/backend");
const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY, publishableKey: env.CLERK_PUBLISHABLE_KEY });
const customer = await clerk.users.getUser(f.customerUserId);
if (!customer.emailAddresses.some(x => x.emailAddress === `qxlayer-qa-${f.id}+clerk_test@example.com`))
  throw Error("Not the exact disposable QA identity.");
const nativeOwner = Object.keys(bindings).find(key => key !== f.customerUserId);
for (const id of new Set(f.sessions)) {
  try {
    const session = await clerk.sessions.getSession(id);
    if (![nativeOwner, f.customerUserId].includes(session.userId) ||
        new Date(session.createdAt).getTime() < new Date(customer.createdAt).getTime() - 5000)
      throw Error("Do not revoke a foreign or pre-existing session.");
  } catch (error) { if (error.status !== 404) throw error; }
}
const ca = group.secretFiles.find(x => x.name === "supabase-ca.crt")?.content;
if (!ca?.includes("BEGIN CERTIFICATE")) throw Error("Verified Staging TLS CA unavailable.");
const url = new URL(env.DATABASE_URL);
if (!/\.supabase\.co$|\.pooler\.supabase\.com$/.test(url.hostname)) throw Error("Staging database target changed.");
for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) url.searchParams.delete(key);
const require = createRequire(new URL("../../lib/db/package.json", import.meta.url));
const { Client } = require("pg");
const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ca }, enableChannelBinding: true });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("SET LOCAL ROLE qxlayer_runtime");
  await client.query("SELECT set_config('app.actor_id',$1,true),set_config('app.is_super_admin','true',true),set_config('app.can_write','true',true)", [owner]);
  const orders = await client.query("SELECT id,tenant_id FROM white_label_requests WHERE customer_user_id=$1", [f.customerUserId]);
  const tenants = [...new Set([...orders.rows.map(x => x.tenant_id), ...f.resources.filter(x => x.type === "tenant").map(x => x.id)].filter(Boolean))];
  const scoped = await client.query("SELECT id,name,created_at FROM tenants WHERE id=ANY($1::uuid[])", [tenants]);
  const createdAfter = new Date(customer.createdAt);
  if (scoped.rows.some(x => !/QA/i.test(x.name) || new Date(x.created_at) < createdAfter))
    throw Error("Cleanup cannot touch a pre-existing or non-QA tenant.");
  const otherOrders = await client.query("SELECT id FROM white_label_requests WHERE tenant_id=ANY($1::uuid[]) AND customer_user_id<>$2", [tenants, f.customerUserId]);
  if (otherOrders.rowCount) throw Error("Another customer references a cleanup tenant.");
  const requestIds = orders.rows.map(x => x.id);
  await client.query("DELETE FROM customer_notification_reads WHERE event_id IN (SELECT id FROM white_label_events WHERE request_id=ANY($1::uuid[]))", [requestIds]);
  await client.query("DELETE FROM audit_events WHERE metadata->>'requestId'=ANY($1::text[])", [requestIds]);
  await client.query("DELETE FROM white_label_requests WHERE customer_user_id=$1", [f.customerUserId]);
  const columns = await client.query("SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='tenant_id'");
  const edges = await client.query(`SELECT child.relname AS child,parent.relname AS parent
    FROM pg_constraint k JOIN pg_class child ON child.oid=k.conrelid JOIN pg_class parent ON parent.oid=k.confrelid
    JOIN pg_namespace n ON n.oid=child.relnamespace WHERE k.contype='f' AND n.nspname='public'`);
  const names = new Set(columns.rows.map(x => x.table_name)); names.delete("white_label_requests");
  const sorted = [], visiting = new Set();
  function visit(name) {
    if (!names.has(name)) return;
    if (visiting.has(name)) throw Error("Cleanup foreign-key cycle requires review.");
    visiting.add(name);
    for (const e of edges.rows.filter(x => x.parent === name)) visit(e.child);
    visiting.delete(name); names.delete(name); sorted.push(name);
  }
  for (const name of [...names]) visit(name);
  for (const name of sorted) {
    if (!/^[a-z_]+$/.test(name)) throw Error("Invalid cleanup table.");
    await client.query(`DELETE FROM public."${name}" WHERE tenant_id=ANY($1::uuid[])`, [tenants]);
  }
  await client.query("DELETE FROM tenants WHERE id=ANY($1::uuid[])", [tenants]);
  for (const plan of f.resources.filter(x => x.type === "plan")) {
    const foreignAssignments = await client.query("SELECT tenant_id FROM tenant_subscriptions WHERE plan_id=$1 AND NOT(tenant_id=ANY($2::uuid[]))", [plan.id, tenants]);
    if (foreignAssignments.rowCount) throw Error("Another tenant references the disposable plan; preserve it.");
    const p = await client.query("SELECT name FROM plans WHERE id=$1", [plan.id]);
    if (p.rows.length && !/QA/i.test(p.rows[0].name)) throw Error("Disposable plan label required.");
    await client.query("DELETE FROM plan_entitlements WHERE plan_id=$1", [plan.id]);
    await client.query("DELETE FROM plans WHERE id=$1", [plan.id]);
  }
  await client.query("COMMIT");
} catch (e) { await client.query("ROLLBACK"); throw e; } finally { await client.end(); }
for (const session of new Set(f.sessions)) {
  try {
    await clerk.sessions.revokeSession(session);
    if ((await clerk.sessions.getSession(session)).status === "active")
      throw Error("Temporary session is still active.");
  } catch (error) { if (error.status !== 404) throw error; }
}
for (const ticket of f.tickets) await clerk.signInTokens.revokeSignInToken(ticket).catch(() => {});
await clerk.users.deleteUser(f.customerUserId);
delete bindings[f.customerUserId];
if (Object.keys(bindings).length !== f.originalBindingCount) throw Error("Original binding count changed.");
for (const target of [`env-groups/${groupId}`, `services/${apiId}`])
  await api(`${target}/env-vars/QXLAYER_STAGING_IDENTITY_BINDINGS`, "PUT", { value: JSON.stringify(bindings) });
const deployments = await api(`services/${apiId}/deploys?limit=20`);
const commit = deployments.find(x => x.deploy.status === "live")?.deploy.commit.id;
if (!/^[a-f0-9]{40}$/.test(commit ?? "")) throw Error("Live source commit unavailable.");
const deployment = await api(`services/${apiId}/deploys`, "POST", { commitId: commit, clearCache: "do_not_clear" });
f.cleaned = true; f.cleanupDeploymentId = deployment.id;
await writeFile(file, JSON.stringify(f, null, 2));
console.info("Exact disposable QA records and identity removed; original bindings restored. API cleanup deployment created.");
