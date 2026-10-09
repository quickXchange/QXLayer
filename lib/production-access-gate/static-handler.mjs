import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createAccessGate } from "./index.mjs";

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".txt": "text/plain" };

/** Vercel Node function, with no public static-index bypass of the existing gate. */
export function createStaticHandler(rootPath, env = process.env) {
  const root = path.resolve(rootPath);
  const gate = createAccessGate({ env, basePath: "/", healthPath: "/__qx_access/healthz" });
  return async (req, res) => {
    try {
      await gate(req, res, async () => {
        try {
          if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405).end(); return; }
          const pathname = decodeURIComponent(new URL(req.url, "https://local.invalid").pathname);
          if (pathname.startsWith("/api/")) { res.writeHead(404).end(); return; }
          const website = pathname === "/private-label-website" || pathname.startsWith("/private-label-website/");
          const appRoot = website ? path.join(root, "private-label-website") : root;
          const relative = pathname.replace(/^\/+/, "");
          let file = path.resolve(root, relative || "index.html");
          if (file !== root && !file.startsWith(`${root}${path.sep}`)) { res.writeHead(404).end(); return; }
          try { if (!(await stat(file)).isFile()) throw new Error("Not a file"); }
          catch {
            // Missing assets never become HTML, including requests with Accept:*/*.
            if (path.extname(relative)) { res.writeHead(404).end(); return; }
            file = path.join(appRoot, "index.html");
          }
          file = await realpath(file);
          if (!file.startsWith(`${root}${path.sep}`)) { res.writeHead(404).end(); return; }
          const extension = path.extname(file);
          const immutable = /[/\\]assets[/\\][^/\\]+-[\w-]{8,}\.(js|css|woff2)$/.test(file);
          const quality = encoding => {
            const values = String(req.headers["accept-encoding"] ?? "").split(",").map(s => s.trim().split(";"));
            const value = values.find(([name]) => name === encoding) ?? values.find(([name]) => name === "*");
            if (!value) return 0;
            const q = value.slice(1).find(p => p.trim().startsWith("q="));
            return q ? Math.max(0, Math.min(1, Number(q.trim().slice(2)) || 0)) : 1;
          };
          let encoding;
          for (const candidate of quality("br") >= quality("gzip") ? ["br","gzip"] : ["gzip","br"]) {
            if (!quality(candidate)) continue;
            try {
              const compressed = await realpath(`${file}.${candidate === "gzip" ? "gz" : "br"}`);
              if (!compressed.startsWith(`${root}${path.sep}`)) continue;
              file = compressed; encoding = candidate; break;
            } catch { /* Original asset remains available. */ }
          }
          const bytes = await readFile(file);
          res.setHeader("Cache-Control", immutable ? "private, max-age=31536000, immutable" : "no-store, private");
          res.setHeader("Vary", "Accept-Encoding");
          if (encoding) res.setHeader("Content-Encoding", encoding);
          if (immutable) {
            const etag = `"${createHash("sha256").update(bytes).digest("hex")}"`;
            res.setHeader("ETag", etag);
            if (String(req.headers["if-none-match"] ?? "").split(",").map(s => s.trim().replace(/^W\//,"")).includes(etag)) {
              res.writeHead(304).end(); return;
            }
          }
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Content-Type", types[extension] ?? "application/octet-stream");
          res.end(req.method === "HEAD" ? undefined : bytes);
        } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
      });
    } catch { if (!res.headersSent) res.writeHead(500); res.end(); }
  };
}
