import http from "node:http";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { pool } from "@workspace/db";
import { developmentSupabaseAuth, supabaseAuthConfiguration } from "../modules/supabase-auth/config";

if (process.env.QXLAYER_DEVELOPMENT_AUTH_QA_APPROVED !== "true" || !developmentSupabaseAuth())
  throw new Error("Explicit Development-only disposable QA approval is required.");
const cfg = supabaseAuthConfiguration();
const path = new URL("../../../../.local/development-auth-qa-scope.json", import.meta.url);
type Scope = { email: string; subject?: string };
async function provider<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const result = await fetch(`${cfg.providerOrigin}/auth/v1/admin/users${path}`, {
    method, headers: { apikey: cfg.apiKey, "Content-Type": "application/json" },
    redirect: "error", signal: AbortSignal.timeout(15000),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!result.ok) throw new Error(`Disposable provider operation failed (${result.status}).`);
  return (result.status === 204 ? {} : await result.json()) as T;
}
async function cleanup(scope: Scope) {
  if (!scope.subject) {
    const users = await provider<{ users: { id: string; email?: string }[] }>("?page=1&per_page=100");
    const found = users.users.filter((u: { email?: string }) => u.email === scope.email);
    if (found.length > 1) throw new Error("Ambiguous disposable cleanup scope.");
    scope.subject = found[0]?.id;
  }
  if (scope.subject) {
    await provider(`/${scope.subject}`, "DELETE");
    await pool.query("DELETE FROM vynox_supabase_auth.sessions WHERE subject=$1", [scope.subject]);
    await pool.query("DELETE FROM vynox_supabase_auth.identity_links WHERE subject=$1 AND business_id=$2",
      [scope.subject, `supabase:${scope.subject}`]);
  }
  await unlink(path);
}
if (process.argv[2] === "cleanup") {
  await cleanup(JSON.parse(await readFile(path, "utf8")));
  await pool.end();
  console.log(JSON.stringify({ disposableCleanupComplete: true }));
} else {
  await mkdir(new URL(".", path), { recursive: true });
  const scope: Scope = { email: `dev-auth-${randomUUID().slice(0, 12)}@example.test` };
  await writeFile(path, JSON.stringify(scope), { flag: "wx", mode: 0o600 });
  const password = randomBytes(32).toString("base64url");
  const user = await provider<{ id: string }>("", "POST", { email: scope.email, password, email_confirm: true,
    user_metadata: { name: "Disposable Development Auth QA" },
    app_metadata: { qa: "development-auth-verification" } });
  scope.subject = user.id;
  await writeFile(path, JSON.stringify(scope), { mode: 0o600 });
  let stopping = false;
  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    try {
      if (req.method === "GET" && req.url === "/fixture") {
        res.end(JSON.stringify({ email: scope.email, password, subject: scope.subject }));
      } else if (req.method === "POST" && req.url === "/totp") {
        let body = "";
        for await (const chunk of req) { body += chunk; if (body.length > 2000) throw new Error("Too much input"); }
        const secret = String(JSON.parse(body).secret ?? "").replaceAll(" ", "").toUpperCase();
        if (!/^[A-Z2-7]{16,128}$/.test(secret)) throw new Error("Invalid disposable TOTP secret");
        let bits = "";
        for (const c of secret) bits += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c).toString(2).padStart(5, "0");
        const key = Buffer.from(bits.match(/.{8}/g)!.map(v => parseInt(v, 2)));
        const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
        const digest = createHmac("sha1", key).update(counter).digest();
        const offset = digest[19] & 15;
        res.end(JSON.stringify({ code: String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0") }));
      } else if (req.method === "POST" && req.url === "/cleanup") {
        if (stopping) throw new Error("Already stopping");
        stopping = true;
        await cleanup(scope);
        res.end(JSON.stringify({ cleanupComplete: true }));
        server.close(); await pool.end();
      } else { res.statusCode = 404; res.end("{}"); }
    } catch { res.statusCode = 500; res.end(JSON.stringify({ error: "Disposable fixture operation failed." })); }
  });
  server.listen(9384, "127.0.0.1", () => console.log(JSON.stringify({ ready: true, brokerPort: 9384, disposableSubjects: 1 })));
}
