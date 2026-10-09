import type { DatabaseClient } from "@workspace/db";
import { HttpError } from "../../lib/errors";
export async function assertTelegramTransaction(c: DatabaseClient, tenantId: string, action: string) {
  const r = await c.query("SELECT enabled,settings FROM tenant_integrations WHERE tenant_id=$1 AND provider_key='telegram_mini_app'", [tenantId]);
  const mini = r.rows[0];
  if (!mini?.enabled || (mini.settings.menu && !mini.settings.menu.includes(action))) {
    throw new HttpError(403, "This Telegram feature is disabled.");
  }
}
