import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createDevelopmentPreviewToken, developmentPreview, previewBrandingUrl } from "./development-preview";

test("Development proofs are tenant-scoped, tamper-proof, expiring and rejected in Production", () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, SESSION_SECRET: process.env.SESSION_SECRET, REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT };
  const realNow = Date.now;
  try {
    process.env.NODE_ENV = "development";
    delete process.env.REPLIT_DEPLOYMENT;
    process.env.SESSION_SECRET = randomBytes(32).toString("hex");
    const slug = "isolated-test";
    const id = "00000000-0000-4000-8000-000000000001";
    const { token } = createDevelopmentPreviewToken(id, slug);
    assert.equal(developmentPreview(slug, token)?.tenantId, id);
    assert.equal(developmentPreview("other-tenant", token), null);
    assert.equal(developmentPreview(slug, `${token}.extra`), null);
    assert.equal(developmentPreview(slug, `x${token}`), null);
    assert.equal(developmentPreview(slug), null);
    assert.match(previewBrandingUrl(`/api/public/sites/${slug}/branding/logo`, slug, token)!, /\?preview=/);
    assert.equal(previewBrandingUrl("https://example.com/logo.png", slug, token), "https://example.com/logo.png");
    const now = realNow();
    Date.now = () => now + 25 * 60 * 60 * 1000;
    assert.equal(developmentPreview(slug, token), null);
    Date.now = realNow;
    process.env.NODE_ENV = "production";
    assert.equal(developmentPreview(slug, token), null);
    assert.throws(() => createDevelopmentPreviewToken(id, slug));
    process.env.NODE_ENV = "development";
    process.env.REPLIT_DEPLOYMENT = "1";
    assert.equal(developmentPreview(slug, token), null);
  } finally {
    Date.now = realNow;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
