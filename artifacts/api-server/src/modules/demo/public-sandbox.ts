import { createHash, randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import { withDatabase } from "@workspace/db";
import { DEMO_SLUG, DEMO_SEED_KEYS } from "./identity";
import { demoEnabled } from "./session";
import { sameOriginMutation } from "../../middlewares/authentication";
const visitors = new Map<string, { count: number; expires: number }>();
let nextCleanup = 0;
const seedHashes = DEMO_SEED_KEYS.map(k => createHash("sha256").update(k).digest("hex"));

// Only the new demo tenant is affected. Other public Exchange flows are unchanged.
export const guardPublicDemo: RequestHandler = async (req, res, next) => {
  if (!demoEnabled() || req.params.slug !== DEMO_SLUG) { next(); return; }
  let originAllowed = false;
  sameOriginMutation(req, res, () => { originAllowed = true; });
  if (!originAllowed) return;
  const now = Date.now();
  for (const [key, v] of visitors) if (v.expires < now) visitors.delete(key);
  let visitor = req.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith("qx_novax_visitor="))?.slice("qx_novax_visitor=".length);
  if (!visitor || !/^[a-f0-9]{48}$/.test(visitor)) visitor = randomBytes(24).toString("hex");
  const limit = visitors.get(visitor) ?? { count: 0, expires: now + 60000 };
  if (limit.count >= 30) { res.status(429).json({ error: "Please pause briefly before another sandbox request." }); return; }
  if (!visitors.has(visitor) && visitors.size >= 10000) { res.status(503).json({ error: "The demo is busy. Try again shortly." }); return; }
  limit.count++;
  visitors.set(visitor, limit);
  res.cookie("qx_novax_visitor", visitor, { httpOnly: true, sameSite: "strict", secure: req.secure || req.get("x-forwarded-proto") === "https",
    path: `/api/public/sites/${DEMO_SLUG}/exchange`, maxAge: 3600000 });
  if (now >= nextCleanup) {
    nextCleanup = now + 60000;
    // Disposable visitor orders expire after two hours; four showcase orders are preserved.
    await withDatabase({ actorId: "development-demo-retention", canWrite: true }, async c => {
      await c.query(`DELETE FROM exchange_orders o USING tenants t WHERE o.tenant_id=t.id
        AND t.slug=$1 AND t.name='NovaX Exchange' AND o.request->>'product'='crypto_exchange'
        AND o.created_at<now()-interval '2 hours'
        AND NOT (coalesce(o.request->>'idempotencyHash','')=ANY($2::text[]))`, [DEMO_SLUG, seedHashes]);
    });
  }
  next();
};
