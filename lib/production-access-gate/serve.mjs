import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { createAccessGate } from "./index.mjs";

const root = await realpath(path.resolve(process.argv[2] ?? "dist/public"));
const port = Number(process.env.PORT);
const basePath = process.env.BASE_PATH ?? "/";
if (!port) throw new Error("PORT is required.");
const gate = createAccessGate({ basePath, healthPath: `${basePath.replace(/\/$/, "")}/__qx_access/healthz` });
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".txt": "text/plain" };
createServer((req, res) => {
  gate(req, res, async () => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405).end(); return; }
      const pathname = decodeURIComponent(new URL(req.url, "https://local.invalid").pathname);
      if (!pathname.startsWith(basePath)) { res.writeHead(404).end(); return; }
      const relative = pathname.slice(basePath.length).replace(/^\/+/, "");
      let file = path.resolve(root, relative || "index.html");
      if (file !== root && !file.startsWith(`${root}${path.sep}`)) { res.writeHead(404).end(); return; }
      try {
        if (!(await stat(file)).isFile()) throw new Error("Not a file");
      } catch {
        // Only document routes receive the SPA fallback; missing assets stay 404.
        if (path.extname(relative) && !req.headers.accept?.includes("text/html")) { res.writeHead(404).end(); return; }
        file = path.join(root, "index.html");
      }
      file = await realpath(file);
      if (!file.startsWith(`${root}${path.sep}`)) { res.writeHead(404).end(); return; }
      const bytes = await readFile(file);
      res.setHeader("Cache-Control", "no-store, private");
      res.setHeader("Content-Type", types[path.extname(file)] ?? "application/octet-stream");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(req.method === "HEAD" ? undefined : bytes);
    } catch {
      res.writeHead(404).end();
    }
  }).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
}).listen(port, "0.0.0.0");
