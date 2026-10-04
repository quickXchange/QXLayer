import { withDatabase } from "@workspace/db";
import { audit } from "../../lib/audit";
import { HttpError } from "../../lib/errors";
import { contextFor, type Principal } from "../authentication/service";
import { lockTenant, requireFeature, resolveEntitlements } from "../entitlements/resolver";
import { readRegistry } from "./service";
import { pluginFor } from "./plugins";
import { exchangeConfiguration } from "../../products/exchange/service";
import { SaveExchangeConfigurationBody } from "@workspace/api-zod";

export function productConfiguration(principal: Principal, tenantId: string, moduleKey: string, configuration?: Record<string, unknown>) {
  if (moduleKey === "crypto_exchange" && configuration !== undefined) {
    return exchangeConfiguration(principal, tenantId, SaveExchangeConfigurationBody.parse(configuration)).then(r => ({ configuration: r.configuration }));
  }
  if (configuration && Buffer.byteLength(JSON.stringify(configuration)) > 32768) throw new HttpError(400, "Product configuration must be at most 32 KiB.");
  const check = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (/(secret|password|private.?key|api.?key|access.?token|credential)/i.test(key)) throw new HttpError(400, "Store secret references through a credential provider, not raw secrets in product settings.");
      check(child);
    }
  };
  check(configuration);
  return withDatabase(contextFor(principal, tenantId, configuration !== undefined, "configuration.manage"), async (client) => {
    if (configuration !== undefined) await lockTenant(client, tenantId);
    if (!(await readRegistry(client)).some((m) => m.key === moduleKey)) throw new HttpError(404, "Unknown product module.");
    const effective = await resolveEntitlements(client, tenantId);
    requireFeature(effective, moduleKey);
    if (configuration !== undefined) configuration = pluginFor(moduleKey)?.validateConfiguration(configuration, effective) ?? configuration;
    if (configuration !== undefined) {
      await client.query("INSERT INTO tenant_product_configuration (tenant_id,module_key,configuration) VALUES ($1,$2,$3) ON CONFLICT (tenant_id,module_key) DO UPDATE SET configuration=EXCLUDED.configuration,updated_at=now()", [tenantId, moduleKey, JSON.stringify(configuration)]);
      // Configuration may contain future sensitive fields: never audit the body.
      await audit(client, principal, tenantId, "product.configuration.saved", "Saved inert product configuration", { moduleKey });
    }
    const r = await client.query("SELECT configuration FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key=$2", [tenantId, moduleKey]);
    return { configuration: r.rows[0]?.configuration ?? {} };
  });
}