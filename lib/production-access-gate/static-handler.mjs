import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
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
          const bytes = await readFile(file);
          res.setHeader("Cache-Control", "no-store, private");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Content-Type", types[path.extname(file)] ?? "application/octet-stream");
          res.end(req.method === "HEAD" ? undefined : bytes);
        } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
      });
    } catch { if (!res.headersSent) res.writeHead(500); res.end(); }
  };
}
