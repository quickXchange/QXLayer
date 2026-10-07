import { withDatabase } from "@workspace/db";
import { CreateProviderDefinitionBody } from "@workspace/api-zod";
import { contextFor, requireSuperAdmin, type Principal } from "../authentication/service";
import { definitions } from "../entitlements/catalog";
import { audit } from "../../lib/audit";
import { HttpError } from "../../lib/errors";
import { rejectSecrets } from "./security";
import { validateDefinition } from "./validation";
import { readProvider } from "./read";

export function saveProviderDefinition(principal: Principal, input: unknown, providerId?: string) {
  const editing = !!providerId;
  requireSuperAdmin(principal);
  rejectSecrets(input, true);
  const definition = CreateProviderDefinitionBody.parse(input);
  definition.name = definition.name.trim();
  definition.categories = [...new Set(definition.categories.map(c => c.trim()))];
  definition.capabilities = [...new Set(definition.capabilities)];
  definition.services = [...new Set(definition.services)];
  return withDatabase(contextFor(principal, undefined, true), async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('provider-catalog',0))");
    validateDefinition(definition, (await definitions(client)).filter(d => d.kind === "feature").map(d => d.key));
    if (providerId) {
      const previous = await readProvider(client, providerId);
      const refs = await client.query("SELECT capability,environment FROM provider_assignments WHERE provider_id=$1", [providerId]);
      if (refs.rows.some(r => !definition.capabilities.includes(r.capability) || !definition.environments.includes(r.environment))) {
        throw new HttpError(409, "Remove incompatible tenant assignments before changing supported capabilities/environments.");
      }
      await client.query("UPDATE provider_catalog SET definition=$2,updated_at=now() WHERE id=$1", [providerId, JSON.stringify(definition)]);
      if (previous.status !== definition.status) {
        await audit(client, principal, null, definition.status === "disabled" ? "provider.catalog.disabled" : "provider.catalog.enabled",
          `Provider availability changed (${providerId}); no connection activated`, { providerId, availability: definition.status });
      }
    } else {
      const result = await client.query("INSERT INTO provider_catalog(definition) VALUES($1) RETURNING id", [JSON.stringify(definition)]);
      providerId = result.rows[0].id;
    }
    await audit(client, principal, null, editing ? "provider.catalog.edited" : "provider.catalog.created", `Provider metadata saved (${providerId}); no adapter or connection enabled`, {
      providerId, availability: definition.status,
    });
    return readProvider(client, providerId!);
  });
}
