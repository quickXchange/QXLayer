import { withDatabase, type DatabaseClient } from "@workspace/db";
import { definitions, readPlan, readAddon } from "../entitlements/catalog";
import type { Principal } from "../authentication/service";
import { HttpError } from "../../lib/errors";
import { requestContext } from "./order-model";

export async function catalogSelection(c: DatabaseClient, planId: string | null, addonIds: string[]) {
  const plan = planId ? await readPlan(c, planId) : null;
  if (plan && (plan.status !== "enabled" || !["website", "crypto_exchange"].every(k => plan.entitlements.some(e => e.key === k && e.value === true)))) {
    throw new HttpError(400, "Choose an enabled White Label Exchange plan.");
  }
  const addons = [];
  for (const id of new Set(addonIds)) addons.push(await readAddon(c, id));
  if (addons.some(a => !a.enabled)) throw new HttpError(400, "One of the requested add-ons is no longer available.");
  if (addons.length && !plan) throw new HttpError(400, "Select a plan before choosing add-ons.");
  if (addons.some(a => a.currency !== plan?.currency)) throw new HttpError(400, "Requested add-ons must use the plan's currency. No automatic currency conversion is performed.");
  return { plan, addons };
}
export function whiteLabelCatalog(p: Principal) {
  return withDatabase(requestContext(p), async c => {
    const ids = await c.query("SELECT id FROM plans WHERE status='enabled' ORDER BY display_order,name,id");
    const candidates = [];
    for (const r of ids.rows) candidates.push(await readPlan(c, r.id));
    const plans = candidates.filter(p => ["website", "crypto_exchange"].every(k => p.entitlements.some(e => e.key === k && e.value === true)));
    const ai = await c.query("SELECT id FROM addons WHERE enabled ORDER BY name,id");
    const addons = [];
    for (const r of ai.rows) addons.push(await readAddon(c, r.id));
    return { plans, addons, definitions: await definitions(c) };
  });
}