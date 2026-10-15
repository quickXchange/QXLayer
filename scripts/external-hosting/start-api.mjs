import assert from "node:assert/strict";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function startupMode(env) {
  const mode = env.QXLAYER_EXTERNAL_ENVIRONMENT;
  assert(["staging", "production"].includes(mode), "Explicit external environment required");
  if (mode === "staging" && env.QXLAYER_EXTERNAL_STARTUP_APPROVED === "false") return "held";
  assert.equal(env.QXLAYER_EXTERNAL_STARTUP_APPROVED, "true", "External startup remains unapproved");
  assert.equal(env.QXLAYER_DATABASE_PROVIDER, "supabase", "External database provider must be explicit");
  return "approved";
}

// No application/database/Auth imports in held mode. Health means only that the
// hold process is running, never that schema, Auth or business routes are ready.
export function createHeldCandidateServer() {
  const server = createServer((req, res) => {
    const health = ["GET", "HEAD"].includes(req.method) &&
      (req.url ?? "").split("?")[0] === "/api/healthz";
    req.resume();
    res.writeHead(health ? 200 : 503, {
      "Content-Type": "application/json", "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff", ...(health ? {} : { "Retry-After": "300" }),
    });
    res.end(req.method === "HEAD" ? undefined : JSON.stringify({
      status: "held", ready: false, environment: "staging",
      startupApproved: false, businessRoutesEnabled: false, databaseConnected: false,
    }));
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 32;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (startupMode(process.env) === "held") {
    const port = Number(process.env.PORT);
    assert(Number.isInteger(port) && port > 0 && port <= 65535, "Valid PORT required");
    const server = createHeldCandidateServer().listen(port, "0.0.0.0", () =>
      console.info("Candidate process held; business routes and database connections disabled."));
    const close = () => {
      server.close(() => process.exit(0));
      setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 2000).unref();
    };
    process.once("SIGTERM", close);
    process.once("SIGINT", close);
  } else {
    // Keep every existing approved startup/schema/Auth/runtime guard.
    await import("../../artifacts/api-server/dist/index.mjs");
  }
}
