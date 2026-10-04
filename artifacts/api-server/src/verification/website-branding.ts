import assert from "node:assert/strict";
import { pool } from "@workspace/db";
import { randomUUID } from "node:crypto";
import { savePlan } from "../modules/entitlements/catalog";
import { createTenant, saveWebsiteSettings, getTenant } from "../modules/tenants/service";
import { websiteSettings } from "../modules/website/settings";
import { planFixture } from "./plans";
import type { Principal } from "../modules/authentication/service";
if (process.env.NODE_ENV === "production") throw new Error("Development-only website configuration verification.");
const suffix = randomUUID().replaceAll("-", "");
const actor: Principal = { userId: `user_websiteVerify${suffix}`, role: "super_admin", memberships: [] };
let tenantId: string | undefined;
let planId: string | undefined;
try {
  const plan = await savePlan(actor, planFixture("Website configuration verification", { website: true }));
  planId = plan.id;
  const tenant = await createTenant(actor, { name: "Website verification", slug: `web-${suffix}`, planId });
  tenantId = tenant.id;
  const initial = websiteSettings("Website verification", {});
  const settings = { ...initial, glowColor: "#17B7AA", surfaceStyle: "glass" as const, borderRadius: "rounded" as const, faq: [{ question: "Does this execute?", answer: "No, the financial engine is deferred." }] };
  await saveWebsiteSettings(actor, tenantId, settings);
  const { glowColor: _glow, surfaceStyle: _surface, borderRadius: _radius, faq: _faq, ...legacyInput } = settings;
  await saveWebsiteSettings(actor, tenantId, { ...legacyInput, heroTitle: "Saved from existing admin form" });
  const preserved = (await getTenant(actor, tenantId)).websiteSettings;
  assert.equal(preserved.glowColor, settings.glowColor);
  assert.equal(preserved.surfaceStyle, "glass");
  assert.equal(preserved.borderRadius, "rounded");
  assert.deepEqual(preserved.faq, settings.faq);
  await saveWebsiteSettings(actor, tenantId, { ...preserved, faq: [] });
  assert.deepEqual((await getTenant(actor, tenantId)).websiteSettings.faq, []);
  assert.throws(() => websiteSettings("Safe", { glowColor: "red; background:url(https://unsafe.example)" }));
  assert.throws(() => websiteSettings("Safe", { borderRadius: "999px" }));
  assert.throws(() => websiteSettings("Safe", { surfaceStyle: "arbitrary-css" }));
  await assert.rejects(async () => saveWebsiteSettings(actor, tenantId!, { ...preserved, faq: [{ question: "  ", answer: "Not allowed" }] }), (e: unknown) => (e as { status: number }).status === 400);
  process.stdout.write("PASS: validated website tokens/FAQ, compatibility with unchanged admin saves, explicit FAQ clearing, invalid CSS injection rejection.\n");
} finally {
  if (tenantId) {
    for (const table of ["audit_events", "tenant_subscriptions", "tenant_branding", "tenant_configuration"]) await pool.query(`DELETE FROM ${table} WHERE tenant_id=$1`, [tenantId]);
    await pool.query("DELETE FROM tenants WHERE id=$1", [tenantId]);
  }
  await pool.query("DELETE FROM audit_events WHERE actor_id=$1", [actor.userId]);
  if (planId) { await pool.query("DELETE FROM plan_entitlements WHERE plan_id=$1", [planId]); await pool.query("DELETE FROM plans WHERE id=$1", [planId]); }
  await pool.end();
}