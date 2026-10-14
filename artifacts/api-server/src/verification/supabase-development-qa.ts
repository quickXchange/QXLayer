import http from "node:http";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { pool } from "@workspace/db";
import { developmentSupabaseAuth, supabaseAuthConfiguration } from "../modules/supabase-auth/config";

if (process.env.QXLAYER_DEVELOPMENT_AUTH_QA_APPROVED !== "true" || !developmentSupabaseAuth())
  throw new Error("Explicit Development-only disposable QA approval is required.");
const cfg = supabaseAuthConfiguration();
const path = new URL("../../../../.local/development-auth-qa-scope.json", import.meta.url);
type Scope = { email: string; subject?: string; name?: string; startedAt?: string };
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
    const used = await pool.query(`SELECT
      EXISTS(SELECT 1 FROM public.platform_admins WHERE clerk_user_id=$1) OR
      EXISTS(SELECT 1 FROM public.tenant_memberships WHERE clerk_user_id=$1) OR
      EXISTS(SELECT 1 FROM public.white_label_requests WHERE customer_user_id=$1) OR
      EXISTS(SELECT 1 FROM vynox_supabase_auth.identity_links WHERE subject=$2) AS used`,
      [`supabase:${scope.subject}`, scope.subject]);
    if (used.rows[0].used) throw Error("Disposable cleanup refused: business records or an identity link exist.");
    await provider(`/${scope.subject}`, "DELETE");
    await pool.query("DELETE FROM vynox_supabase_auth.sessions WHERE subject=$1", [scope.subject]);
    await pool.query("DELETE FROM vynox_supabase_auth.recovery_codes WHERE subject=$1", [scope.subject]);
    await pool.query("DELETE FROM vynox_supabase_auth.recovery_events WHERE subject=$1", [scope.subject]);
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
  const requested = process.env.QXLAYER_DEVELOPMENT_AUTH_QA_EMAIL?.trim().toLowerCase();
  if (requested) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requested)) throw Error("Invalid controlled QA recipient.");
    for (let page = 1; page <= 100; page++) {
      const list = await provider<{ users: { email?: string }[] }>(`?page=${page}&per_page=100`);
      if (list.users.some(u => u.email?.toLowerCase() === requested)) throw Error("QA recipient already exists.");
      if (list.users.length < 100) break;
      if (page === 100) throw Error("Account scan exceeded bounded limit.");
    }
  }
  const scope: Scope = { email: requested ?? `dev-auth-${randomUUID().slice(0, 12)}@example.test`,
    name: `Disposable Development QA ${randomUUID()}`, startedAt: new Date().toISOString() };
  await writeFile(path, JSON.stringify(scope), { flag: "wx", mode: 0o600 });
  const password = process.env.QXLAYER_DEVELOPMENT_AUTH_QA_PASSWORD_LENGTH === "10"
    ? `Aa1${randomBytes(8).toString("base64url").slice(0, 7)}` : randomBytes(32).toString("base64url");
  if (!requested || process.argv.includes("--confirmed-fixture")) {
    const user = await provider<{ id: string }>("", "POST", { email: scope.email, password, email_confirm: true,
      user_metadata: { name: scope.name }, app_metadata: { qa: "development-auth-verification" } });
    scope.subject = user.id;
  }
  await writeFile(path, JSON.stringify(scope), { mode: 0o600 });
  let stopping = false;
  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    try {
      if (req.method === "GET" && req.url === "/fixture") {
        res.end(JSON.stringify({ email: scope.email, password, name: scope.name, subject: scope.subject }));
      } else if (req.method === "POST" && ["/adopt", "/verification-link", "/recovery-link", "/native-email-otp-check"].includes(req.url ?? "")) {
        const list = await provider<{ users: { id: string; email?: string; created_at: string; user_metadata?: { name?: string } }[] }>("?page=1&per_page=100");
        const matches = list.users.filter(u => u.email === scope.email && u.user_metadata?.name === scope.name &&
          Date.parse(u.created_at) >= Date.parse(scope.startedAt!) - 5000);
        if (matches.length !== 1 || (scope.subject && scope.subject !== matches[0].id)) throw Error("Disposable custody check failed.");
        scope.subject = matches[0].id;
        await writeFile(path, JSON.stringify(scope), { mode: 0o600 });
        if (req.url === "/adopt") { res.end(JSON.stringify({ adopted: true })); return; }
        if (req.url === "/native-email-otp-check") {
          const sent = await fetch(`${cfg.providerOrigin}/auth/v1/otp`, {
            method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
            headers: { apikey: cfg.apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ email: scope.email, create_user: false }),
          });
          if (!sent.ok) throw Error("Disposable native OTP mail request failed.");
        }
        // Token issuance is for bounded browser testing, not proof of inbox delivery.
        // The actual signup/recover forms still exercise the native mail requests.
        const r = await fetch(`${cfg.providerOrigin}/auth/v1/admin/generate_link`, {
          method: "POST", headers: { apikey: cfg.apiKey, "Content-Type": "application/json" },
          redirect: "error", signal: AbortSignal.timeout(15000),
          body: JSON.stringify({ type: req.url === "/native-email-otp-check" ? "magiclink" : req.url === "/verification-link" ? "signup" : "recovery",
            email: scope.email, ...(req.url === "/verification-link" ? { password } : {}) }),
        });
        if (!r.ok) throw Error("Disposable link issuance failed.");
        const result = await r.json() as { hashed_token?: string; email_otp?: string; properties?: { hashed_token?: string; email_otp?: string } };
        if (req.url === "/native-email-otp-check") {
          const code = result.email_otp ?? result.properties?.email_otp;
          if (!code || !/^[0-9]{6}$/.test(code)) throw Error("Unexpected disposable OTP length.");
          const verify = () => fetch(`${cfg.providerOrigin}/auth/v1/verify`, {
            method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
            headers: { apikey: cfg.apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ email: scope.email, token: code, type: "email" }),
          });
          const first = await verify();
          if (!first.ok) throw Error("Disposable native email OTP verification failed.");
          const tokens = await first.json() as { access_token: string; user: { id: string } };
          const claims = JSON.parse(Buffer.from(tokens.access_token.split(".")[1], "base64url").toString());
          if (tokens.user?.id !== scope.subject || claims.aal !== "aal1") throw Error("Disposable OTP assurance differs.");
          const replay = await verify();
          if (replay.ok || ![400, 403].includes(replay.status)) throw Error("Disposable OTP replay not rejected.");
          const logout = await fetch(`${cfg.providerOrigin}/auth/v1/logout?scope=local`, {
            method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
            headers: { apikey: cfg.apiKey, Authorization: `Bearer ${tokens.access_token}` },
          });
          if (!logout.ok) throw Error("Disposable native OTP session cleanup failed.");
          res.end(JSON.stringify({ nativeOtpMailRequestAccepted: true, nativeOtpLengthSix: true,
            nativeOtpSingleUse: true, nativeOtpAssuranceAal1: true }));
          return;
        }
        const token = result.hashed_token ?? result.properties?.hashed_token;
        if (!token) throw Error("Disposable test token missing.");
        res.end(JSON.stringify({ url: `${cfg.origin}/${req.url === "/verification-link" ? "verify-email" : "reset-password"}?token_hash=${encodeURIComponent(token)}&type=${req.url === "/verification-link" ? "signup" : "recovery"}` }));
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
