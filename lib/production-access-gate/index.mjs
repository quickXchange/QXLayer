import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const SESSION_COOKIE = "__Host-qxlayer-access";
const CSRF_COOKIE = "__Host-qxlayer-access-form";
const WINDOW_MS = 15 * 60 * 1000;
const SESSION_MS = 12 * 60 * 60 * 1000;
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const hash = (s) => createHash("sha256").update(s).digest();
const equal = (a, b) => timingSafeEqual(hash(a), hash(b));

function logo() {
  for (const root of [process.cwd(), path.resolve(process.cwd(), "../..")]) {
    try {
      return `data:image/png;base64,${readFileSync(path.join(root, "artifacts/private-label-console/public/qxlayer-logo-light.png")).toString("base64")}`;
    } catch { /* Try the workspace root next. */ }
  }
  return "";
}

export function gateEnabled(env = process.env) {
  return env.PRODUCTION_ACCESS_GATE_ENABLED !== "false" &&
    (env.NODE_ENV === "production" || env.PRODUCTION_ACCESS_GATE_ENABLED === "true");
}

function safeReturn(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") &&
    !/[\u0000-\u0020\\]/.test(value) && !/^\/__qx_access(?:\/|$)/.test(value)
    ? value : "/";
}

/** Shared by both web servers and the API. Never import into browser code. */
export function createAccessGate({ env = process.env, basePath = "/", healthPath, now = Date.now } = {}) {
  const enabled = gateEnabled(env);
  const code = env.PRODUCTION_ACCESS_CODE;
  // Domain-separated signing key: changing the code revokes all existing access.
  const key = code ? createHmac("sha256", code).update("qxlayer-production-access-v1").digest() : null;
  const brandLogo = logo();
  const endpoint = `${basePath.replace(/\/$/, "")}/__qx_access/enter`;
  const attempts = new Map();
  let globalAttempts = { count: 0, until: 0 };
  const sign = (payload) => {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${body}.${createHmac("sha256", key).update(body).digest("base64url")}`;
  };
  const verify = (token, purpose) => {
    if (!key || typeof token !== "string" || token.length > 2048) return null;
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra || !equal(signature, createHmac("sha256", key).update(body).digest("base64url"))) return null;
    try {
      const data = JSON.parse(Buffer.from(body, "base64url").toString());
      return data.purpose === purpose && Number.isFinite(data.exp) && data.exp > now() &&
        data.exp <= now() + (purpose === "access" ? SESSION_MS : WINDOW_MS) ? data : null;
    } catch { return null; }
  };
  const cookies = (req) => Object.fromEntries(
    (req.headers.cookie ?? "").split(";").map((s) => s.trim().split(/=(.*)/s).slice(0, 2)),
  );
  const cookie = (name, value) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict`;
  const headers = (res) => {
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'self'");
  };
  const screen = (req, res, status = 200, message = "", returnTo = req.url) => {
    headers(res);
    res.statusCode = status;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const csrf = key ? sign({ purpose: "form", exp: now() + WINDOW_MS, nonce: randomBytes(24).toString("base64url") }) : "";
    if (csrf) res.setHeader("Set-Cookie", cookie(CSRF_COOKIE, csrf));
    res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Private Access | QXLayer</title><style>
      *{box-sizing:border-box}body{margin:0;background:#f6f3ee;color:#183d39;font-family:Arial,sans-serif;min-height:100svh;display:grid;place-items:center;padding:24px}
      main{width:100%;max-width:420px;padding:36px;border:1px solid #deded3;border-radius:18px;background:#fffdf8;box-shadow:0 16px 50px #183d3909}
      .brand{height:40px;max-width:180px;object-fit:contain;object-position:left;margin-bottom:32px}h1{font:400 34px Georgia,serif;margin:0 0 12px;letter-spacing:-.8px}
      p{font-size:14px;line-height:1.65;color:#6b756c;margin:0 0 28px}label{display:block;font-size:13px;font-weight:600;margin:0 0 9px}
      input{font:inherit;width:100%;padding:13px 14px;border:1px solid #d5dacf;border-radius:9px;background:#fff;outline:none}input:focus{border-color:#12423f;box-shadow:0 0 0 3px #12423f15}
      button{width:100%;margin-top:18px;border:0;border-radius:9px;padding:14px;font:600 14px Arial,sans-serif;background:#12423f;color:#fff;cursor:pointer}button:hover{background:#1b514b}button:focus-visible{outline:3px solid #b4551f;outline-offset:3px}
      .message{color:#a33423;font-size:13px;margin:12px 0 0}.footer{display:block;margin-top:24px;font-size:11px;color:#8b9186}
      @media(max-width:480px){main{padding:28px 24px}h1{font-size:30px}}
      </style></head><body><main>${brandLogo ? `<img class="brand" src="${brandLogo}" alt="QXLayer">` : `<div class="brand">QXLayer</div>`}
      <h1>Private access</h1><p>QXLayer is preparing for launch.<br>Enter your access code to continue.</p>
      <form method="post" action="${escape(endpoint)}"><input type="hidden" name="csrf" value="${escape(csrf)}"><input type="hidden" name="returnTo" value="${escape(safeReturn(returnTo))}">
      <label for="access-code">Access Code</label><input id="access-code" name="accessCode" type="password" autocomplete="off" maxlength="512" required autofocus ${!key ? "disabled" : ""}>
      ${message ? `<p class="message" role="alert">${escape(message)}</p>` : ""}<button type="submit" ${!key ? "disabled" : ""}>Enter</button></form>
      <span class="footer">Temporary pre-launch access</span></main></body></html>`);
  };
  const reject = (req, res, status) => {
    headers(res);
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Production access required." }));
  };
  return async function accessGate(req, res, next) {
    if (!enabled) return next();
    const pathname = new URL(req.url ?? "/", "https://local.invalid").pathname;
    // An exact, minimal liveness response only; never expose application health data.
    if (healthPath && pathname === healthPath && (req.method === "GET" || req.method === "HEAD")) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json");
      res.end('{"status":"ok"}');
      return;
    }
    const jar = cookies(req);
    if (verify(jar[SESSION_COOKIE], "access")) {
      res.setHeader("Cache-Control", "no-store, private");
      return next();
    }
    if (pathname === endpoint && req.method === "POST" && key) {
      // Use the actual peer, not attacker-supplied forwarded IP headers.
      // Limits are intentionally process-local and include an aggregate safety cap.
      for (const [ip, entry] of attempts) if (entry.until <= now()) attempts.delete(ip);
      if (globalAttempts.until <= now()) globalAttempts = { count: 0, until: now() + WINDOW_MS };
      const ip = req.socket.remoteAddress ?? "unknown";
      let entry = attempts.get(ip);
      if (!entry) { entry = { count: 0, until: now() + WINDOW_MS }; attempts.set(ip, entry); }
      if (entry.count >= 10 || globalAttempts.count >= 100 || attempts.size > 10000) {
        res.setHeader("Retry-After", String(Math.ceil((entry.until - now()) / 1000)));
        return screen(req, res, 429, "Too many attempts. Please try again later.", "/");
      }
      entry.count++; globalAttempts.count++;
      const origin = req.headers.origin;
      // A sandboxed Development preview can send an opaque ("null") origin.
      // Such forms still MUST pass the signed double-submit token below.
      if (origin && origin !== "null") {
        try {
          // Replit's ingress uses an internal Host header; the original public
          // domain is forwarded. CSRF is independently enforced by the signed,
          // HttpOnly double-submit token below (not by trusting this header).
          const forwarded = req.headers["x-forwarded-host"];
          const publicHost = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || req.headers.host;
          if (new URL(origin).host !== publicHost) return screen(req, res, 403, "Please try again from this website.");
        } catch { return screen(req, res, 403, "Please try again from this website."); }
      }
      if (!req.headers["content-type"]?.startsWith("application/x-www-form-urlencoded")) return screen(req, res, 400, "Invalid access code");
      let body = "";
      try {
        for await (const chunk of req) {
          body += chunk.toString();
          if (Buffer.byteLength(body) > 8192) { return screen(req, res, 413, "Invalid access code"); }
        }
      } catch { return reject(req, res, 400); }
      const form = new URLSearchParams(body);
      const csrf = form.get("csrf");
      const returnTo = safeReturn(form.get("returnTo"));
      if (!csrf || !jar[CSRF_COOKIE] || !equal(csrf, jar[CSRF_COOKIE]) || !verify(csrf, "form")) {
        return screen(req, res, 403, "Please try again from this website.", returnTo);
      }
      if (!equal(form.get("accessCode") ?? "", code)) return screen(req, res, 401, "Invalid access code", returnTo);
      headers(res);
      res.setHeader("Set-Cookie", [
        cookie(SESSION_COOKIE, sign({ purpose: "access", exp: now() + SESSION_MS, nonce: randomBytes(24).toString("base64url") })),
        `${cookie(CSRF_COOKIE, "")}; Max-Age=0`,
      ]);
      res.statusCode = 303;
      res.setHeader("Location", returnTo);
      res.end();
      return;
    }
    if ((req.method === "GET" || req.method === "HEAD") && req.headers.accept?.includes("text/html")) {
      return screen(req, res, key ? 200 : 503, key ? "" : "Private access is temporarily unavailable.");
    }
    return reject(req, res, key ? 403 : 503);
  };
}

export function accessGateVitePlugin() {
  return {
    name: "qxlayer-server-access-gate",
    configureServer(server) {
      const gate = createAccessGate({ basePath: server.config.base });
      server.middlewares.use((req, res, next) => {
        // Development-only visual preview, with no access-granting endpoint.
        if (!gateEnabled() && req.url === "/__qx_access/preview") {
          const preview = createAccessGate({ env: { NODE_ENV: "production" } });
          req.headers.accept = "text/html";
          return preview(req, res, next);
        }
        return gate(req, res, next);
      });
    },
  };
}
