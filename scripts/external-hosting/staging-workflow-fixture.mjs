/** Temporary customer fixture in approved Staging only. Never logs credentials. */
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
if (process.env.QXLAYER_STAGING_WORKFLOW_QA_APPROVED !== "true") throw Error("Staging QA approval required.");
const file = "generated-artifacts/qxlayer-staging-setup/workflow-fixture.json";
const groupId = "evg-db5ate8473hc73agdon0", serviceId = "srv-db5b47qjnfac739s374g";
async function api(path, method = "GET", body) {
  const r = await fetch(`https://api.render.com/v1/${path}`, { method,
    headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) throw Error(`Scoped Staging QA HTTP ${r.status}`);
  const text = await r.text(); return text ? JSON.parse(text) : null;
}
const group = await api(`env-groups/${groupId}`);
const env = Object.fromEntries(group.envVars.map(x => [x.key, x.value]));
const service = await api(`services/${serviceId}`), worker = await api("services/srv-db5b48o473hc73ah56d0");
if (env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" || !env.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
    service.environmentId !== group.environmentId || service.branch !== "qxlayer-staging" ||
    service.serviceDetails.plan !== "starter" || worker.suspended !== "suspended") throw Error("Staging QA boundaries changed.");
const require = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
const { createClerkClient } = createRequire(require.resolve("@clerk/express"))("@clerk/backend");
const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY, publishableKey: env.CLERK_PUBLISHABLE_KEY });
let fixture;
try { fixture = JSON.parse(await readFile(file, "utf8")); } catch (e) { if (e.code !== "ENOENT") throw e; }
if (fixture) throw Error("Existing QA fixture must be reviewed before creating another.");
fixture = { scope: "disposable-staging-workflow-qa", id: randomUUID(), createdAt: new Date().toISOString(), resources: [], sessions: [], tickets: [], customerUserId: null };
await writeFile(file, JSON.stringify(fixture, null, 2));
const user = await clerk.users.createUser({ firstName: "Staging", lastName: "Workflow QA",
  emailAddress: [`qxlayer-qa-${fixture.id}+clerk_test@example.com`], skipPasswordRequirement: true });
fixture.customerUserId = user.id;
await writeFile(file, JSON.stringify(fixture, null, 2));
const bindings = JSON.parse(env.QXLAYER_STAGING_IDENTITY_BINDINGS);
if (Object.keys(bindings).length !== 1) throw Error("Unexpected existing bindings.");
fixture.originalBindingCount = 1;
bindings[user.id] = user.id;
for (const target of [`env-groups/${groupId}`, `services/${serviceId}`])
  await api(`${target}/env-vars/QXLAYER_STAGING_IDENTITY_BINDINGS`, "PUT", { value: JSON.stringify(bindings) });
const receipt = JSON.parse(await readFile("generated-artifacts/qxlayer-staging-setup/staging-original-password-deployment.json", "utf8"));
if (!/^[a-f0-9]{40}$/.test(receipt.commit)) throw Error("Verified source commit required.");
const deployment = await api(`services/${serviceId}/deploys`, "POST", { commitId: receipt.commit, clearCache: "do_not_clear" });
fixture.bindingDeploymentId = deployment.id;
await writeFile(file, JSON.stringify(fixture, null, 2));
for (let i = 0; i < 100; i++) {
  const state = await api(`services/${serviceId}/deploys/${deployment.id}`);
  if (state.status === "live") {
    if (state.commit?.id !== receipt.commit) throw Error("Different source commit deployed.");
    break;
  }
  if (["build_failed", "update_failed", "pre_deploy_failed", "canceled"].includes(state.status)) throw Error("QA binding deployment failed.");
  if (i === 99) throw Error("QA binding deployment timed out.");
  await new Promise(resolve => setTimeout(resolve, 5000));
}
const ownerUserId = Object.keys(bindings).find(x => x !== user.id);
const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && ["/customer-ticket", "/owner-ticket"].includes(req.url)) {
      const ticket = await clerk.signInTokens.createSignInToken({ userId: req.url === "/customer-ticket" ? user.id : ownerUserId, expiresInSeconds: 600 });
      fixture.tickets.push(ticket.id); await writeFile(file, JSON.stringify(fixture, null, 2));
      res.setHeader("Cache-Control", "no-store"); res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ticket: ticket.token })); return;
    }
    if (req.method === "POST" && req.url === "/track") {
      const chunks = []; for await (const c of req) chunks.push(c);
      const data = JSON.parse(Buffer.concat(chunks));
      if (!data.sessionId && !Array.isArray(data.resources)) throw Error("Explicit sessionId or resource array required.");
      if (data.resources?.some(x => !["order", "tenant", "plan"].includes(x.type) || typeof x.id !== "string"))
        throw Error("Only exact disposable workflow resources may be tracked.");
      if (data.sessionId) {
        const s = await clerk.sessions.getSession(data.sessionId);
        if (![ownerUserId, user.id].includes(s.userId)) throw Error("Foreign session.");
        fixture.sessions.push(s.id);
      }
      if (data.resources) fixture.resources.push(...data.resources);
      await writeFile(file, JSON.stringify(fixture, null, 2));
      res.writeHead(204); res.end(); return;
    }
    res.writeHead(404); res.end();
  } catch { res.writeHead(500); res.end("Scoped QA helper failed."); }
});
server.listen(4556, "127.0.0.1", () => console.info("Disposable customer binding live. Loopback QA ticket helper ready on 4556."));
process.on("SIGTERM", () => server.close(() => process.exit()));
