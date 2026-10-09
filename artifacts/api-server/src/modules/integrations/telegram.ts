import { createHash, timingSafeEqual } from "node:crypto";
import { withDatabase } from "@workspace/db";
import { z } from "zod/v4";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import type { Principal } from "../authentication/service";
import { getPublicSite, publicTenantId } from "../website/service";
import { accessible } from "./service";
import { mayManageSecrets } from "./input";
import { open, webhookProof } from "./vault";
import { readTenant } from "../tenants/service";
import { flattenDictionary, isSupportedLocale, loadDictionary } from "@workspace/i18n/runtime";

export async function miniLanguages(slug: string, code?: string) {
  await publicMiniConfig(slug);
  const tenantId = await publicTenantId(slug);
  const tenant = await withDatabase({ actorId: "telegram-languages", tenantId }, c => readTenant(c, tenantId));
  const enabledLanguages = tenant.supportedLanguages.filter(isSupportedLocale);
  if (!enabledLanguages.length) enabledLanguages.push("en");
  const fallbackLanguage = isSupportedLocale(tenant.defaultLanguage) && enabledLanguages.includes(tenant.defaultLanguage)
    ? tenant.defaultLanguage : enabledLanguages[0];
  if (code !== undefined) {
    if (!isSupportedLocale(code) || !enabledLanguages.includes(code)) throw new HttpError(404, "Language is not available for this tenant.");
    return { translations: flattenDictionary(await loadDictionary(code)) };
  }
  return { enabledLanguages, fallbackLanguage, revision: "tenant" };
}

const actions = ["swap", "buy", "sell", "convert", "tracking"];
export async function publicMiniConfig(slug: string) {
  const tenantId = await publicTenantId(slug);
  const row = await withDatabase({ actorId: "telegram-mini", tenantId }, async c =>
    (await c.query("SELECT enabled,settings FROM tenant_integrations WHERE tenant_id=$1 AND provider_key='telegram_mini_app'", [tenantId])).rows[0]);
  if (!row?.enabled) throw new HttpError(404, "Telegram Mini App is not available.");
  const site = await getPublicSite(slug), s = row.settings;
  if (!("brandName" in site)) throw new HttpError(503, "Tenant website configuration is unavailable.");
  return { enabled: true, sandboxOnly: true, tenantSlug: slug,
    brandName: site.brandName, logoUrl: s.logoUrl || site.logoUrl || "",
    primaryColor: s.primaryColor || site.primaryColor, backgroundColor: s.backgroundColor || "#0d1018",
    menu: (s.menu ?? actions).filter((a: string) => a === "tracking" || site.features?.[a]),
    botUsername: s.botUsername || "", miniAppPath: `/private-label-website/${slug}/telegram` };
}
export async function assertMiniAction(slug: string, action?: string) {
  const cfg = await publicMiniConfig(slug);
  if (action && !cfg.menu.includes(action)) throw new HttpError(403, "This Telegram feature is disabled.");
}
export async function telegramCall(token: string, method: string, body: Record<string, unknown>) {
  // Source Telegram request/error contract with an explicitly scoped token instead of its global environment.
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    redirect: "error", signal: AbortSignal.timeout(12000),
  });
  const data = await r.json() as { ok?: boolean; result?: unknown };
  if (!r.ok || !data.ok) throw new HttpError(502, "Telegram rejected the request or is unavailable.");
  return data.result;
}
export async function registerWebhook(p: Principal, tenantId: string, raw: unknown) {
  z.object({ reason: z.string().trim().min(2).max(500) }).strict().parse(raw);
  const ctx = await accessible(p, tenantId, true);
  const snapshot = await withDatabase(ctx, async c => {
    const r = await c.query(`SELECT i.*,t.slug FROM tenant_integrations i JOIN tenants t ON t.id=i.tenant_id
      WHERE i.tenant_id=$1 AND i.provider_key='telegram_bot'`, [tenantId]);
    return r.rows[0];
  });
  if (!snapshot?.enabled || !snapshot.encrypted_credentials || !snapshot.settings.webhookUrl || !snapshot.settings.miniAppUrl) {
    throw new HttpError(409, "Enable the Bot and configure its independent credentials, public webhook URL and Mini App URL first.");
  }
  const role = p.role === "super_admin" ? p.role : p.memberships.find(m => m.tenantId === tenantId)?.role;
  if (!mayManageSecrets(role ?? "", snapshot.credential_management)) throw new HttpError(403, "Your tenant credential policy does not permit Bot registration.");
  const url = new URL(snapshot.settings.webhookUrl), mini = new URL(snapshot.settings.miniAppUrl);
  if (url.hostname !== mini.hostname || url.pathname !== `/api/public/sites/${snapshot.slug}/telegram/webhook` ||
      mini.pathname !== `/private-label-website/${snapshot.slug}/telegram`) throw new HttpError(400, "Channel URLs must use this tenant's exact webhook and Mini App paths on the same public host.");
  const secret = open({ tenantId, providerKey: "telegram_bot", environment: "sandbox" }, snapshot.encrypted_credentials);
  if (!secret.botToken || !/^[A-Za-z0-9_-]{16,256}$/.test(secret.webhookSecret ?? "")) throw new HttpError(409, "Bot token and a 16–256 character webhook secret are required.");
  await telegramCall(secret.botToken, "setWebhook", { url: url.toString(), secret_token: webhookProof({ tenantId, providerKey: "telegram_bot", environment: "sandbox" }, secret),
    allowed_updates: ["message"], drop_pending_updates: false });
  await telegramCall(secret.botToken, "setChatMenuButton", { menu_button: { type: "web_app", text: "Open Exchange", web_app: { url: mini.toString() } } });
  const info = await telegramCall(secret.botToken, "getWebhookInfo", {}) as { url?: string };
  if (info?.url !== url.toString()) throw new HttpError(502, "Telegram did not confirm this tenant's webhook URL.");
  await withDatabase(ctx, async c => {
    const r = await c.query(`UPDATE tenant_integrations SET health=health || $3::jsonb,updated_at=now()
      WHERE tenant_id=$1 AND provider_key='telegram_bot' AND revision=$2 RETURNING id`,
    [tenantId, snapshot.revision, JSON.stringify({ webhookState: "registered", webhookCheckedAt: new Date().toISOString() })]);
    if (!r.rowCount) throw new HttpError(409, "Settings changed during registration; apply the latest webhook configuration.");
    await audit(c, p, tenantId, "telegram.webhook_registered", "Tenant Bot webhook and Mini App menu registered; no financial execution");
  });
  return { registered: true, sandboxOnly: true };
}
export async function receiveTelegramUpdate(slug: string, suppliedSecret: string, body: unknown) {
  if (typeof suppliedSecret !== "string" || !/^[a-f0-9]{64}$/.test(suppliedSecret))
    throw new HttpError(403, "Telegram webhook authentication required.");
  const tenantId = await publicTenantId(slug);
  const row = await withDatabase({ actorId: "telegram-webhook", tenantId }, async c =>
    (await c.query("SELECT * FROM tenant_integrations WHERE tenant_id=$1 AND provider_key='telegram_bot'", [tenantId])).rows[0]);
  if (!row?.enabled || !row.encrypted_credentials) throw new HttpError(404, "Telegram Bot is not available.");
  const secret = open({ tenantId, providerKey: "telegram_bot", environment: "sandbox" }, row.encrypted_credentials);
  const expected = Buffer.from(webhookProof({ tenantId, providerKey: "telegram_bot", environment: "sandbox" }, secret)), actual = Buffer.from(suppliedSecret);
  if (expected.length < 16 || expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new HttpError(403, "Webhook authentication failed.");
  const data = z.object({ update_id: z.number().int().nonnegative().safe(),
    message: z.object({ chat: z.object({ id: z.number().int().safe(), type: z.string() }),
      text: z.string().max(4096).optional() }).passthrough().optional() }).passthrough().parse(body);
  const digest = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const claimed = await withDatabase({ actorId: "telegram-webhook", tenantId, canWrite: true }, async c => {
    const t = await c.query("SELECT status FROM tenants WHERE id=$1 FOR UPDATE", [tenantId]);
    if (t.rows[0]?.status !== "active") throw new HttpError(404, "Channel is not available.");
    const r = await c.query(`INSERT INTO tenant_telegram_receipts(tenant_id,integration_id,update_id,payload_hash)
      VALUES($1,$2,$3,$4) ON CONFLICT(integration_id,update_id) DO NOTHING RETURNING id`, [tenantId, row.id, data.update_id, digest]);
    if (!r.rowCount) {
      const old = await c.query("SELECT payload_hash FROM tenant_telegram_receipts WHERE integration_id=$1 AND update_id=$2", [row.id, data.update_id]);
      if (old.rows[0]?.payload_hash !== digest) throw new HttpError(409, "Webhook update identity mismatch.");
    }
    return r.rows[0]?.id as string | undefined;
  });
  if (!claimed) return { accepted: true, duplicate: true };
  let state = "ignored";
  try {
    if (data.message?.chat.type === "private" && data.message.text && row.settings.miniAppUrl) {
      const command = data.message.text.trim().split(/\s/, 1)[0].replace(/^\//, "").split("@")[0].toLowerCase();
      const requested = command === "track" ? "tracking" : command;
      const menu = row.settings.menu ?? actions;
      const chosen = actions.includes(requested) ? menu.filter((a: string) => a === requested) : menu;
      const site = await getPublicSite(slug);
      if (!("features" in site)) throw new HttpError(503, "Tenant website configuration is unavailable.");
      const mini = await publicMiniConfig(slug);
      const buttons = chosen.filter((a: string) => mini.menu.includes(a) && (a === "tracking" || site.features?.[a])).map((a: string) =>
        [{ text: a === "tracking" ? "Track order" : a[0].toUpperCase() + a.slice(1),
          web_app: { url: `${row.settings.miniAppUrl}#${a}` } }]);
      await telegramCall(secret.botToken, "sendMessage", { chat_id: data.message.chat.id,
        text: buttons.length ? `${site.brandName} — Sandbox Exchange. No real funds are accepted. Open a feature below. Private tracking requires your order tracking token.`
          : "This feature is disabled for this tenant.", reply_markup: { inline_keyboard: buttons } });
      state = "sent";
    }
  } catch { state = "delivery_failed"; } // Never return/log Telegram tokens, raw messages or private tracking inputs.
  await withDatabase({ actorId: "telegram-webhook", tenantId, canWrite: true }, c =>
    c.query("UPDATE tenant_telegram_receipts SET state=$2,completed_at=now() WHERE id=$1", [claimed, state]));
  return { accepted: true, duplicate: false };
}
