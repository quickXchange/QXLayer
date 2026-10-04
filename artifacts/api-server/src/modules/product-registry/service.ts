import { withDatabase, type DatabaseClient } from "@workspace/db";
import { RegisterProductModuleBody } from "@workspace/api-zod";
import type { z } from "zod";
import { audit } from "../../lib/audit";
import { HttpError } from "../../lib/errors";
import { contextFor, requireSuperAdmin, type Principal } from "../authentication/service";

export type ModuleManifest = z.infer<typeof RegisterProductModuleBody>;
export async function readRegistry(client: DatabaseClient): Promise<ModuleManifest[]> {
  const r = await client.query("SELECT key,name,description,category,sandbox_available,definition FROM module_catalog ORDER BY key");
  return r.rows.map((m) => ({
    key: m.key, name: m.name, description: m.description, category: m.category,
    sandboxAvailable: m.definition.sandboxAvailable ?? m.sandbox_available,
    lifecycle: m.definition.lifecycle ?? "deferred",
    requiresAssetNetworks: m.definition.requiresAssetNetworks ?? false,
    features: m.definition.features ?? [], limits: m.definition.limits ?? [],
  }));
}

/** Dependencies are data, not product-specific conditionals in the tenant engine. */
export function applyDependencies(features: Record<string, boolean>, sources: Record<string, string>, modules: ModuleManifest[]) {
  const edges = modules.flatMap((m) => m.features.map((f) => ({ key: f.key, parents: f.dependsOn })));
  // Registration permits only existing parents: cycles are also checked explicitly.
  for (let n = 0; n <= edges.length; n++) {
    let changed = false;
    for (const { key, parents } of edges) {
      if (features[key] && parents.some((p) => !features[p])) {
        features[key] = false; sources[key] = `dependency denied: ${parents.filter((p) => !features[p]).join(", ")}`; changed = true;
      }
    }
    if (!changed) break;
  }
}
export async function registerProductModule(principal: Principal, input: ModuleManifest) {
  requireSuperAdmin(principal);
  if (input.name.trim().length < 2 || input.category.trim().length < 2 || input.features.some((f) => f.label.trim().length < 2) || input.limits.some((l) => l.label.trim().length < 2)) throw new HttpError(400, "Registry names and labels must contain text.");
  return withDatabase(contextFor(principal, undefined, true), async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('product-registry',0))");
    const modules = await readRegistry(client);
    if (modules.some((m) => m.key === input.key)) throw new HttpError(409, "Module keys are immutable and must be unique.");
    const definitions = (await client.query("SELECT key,kind FROM entitlement_definitions")).rows;
    const existing = new Set(definitions.map((r) => r.key));
    const existingFeatures = new Set(definitions.filter((r) => r.kind === "feature").map((r) => r.key));
    const declared = [input.key, ...input.features.map((f) => f.key), ...input.limits.map((l) => l.key)];
    if (new Set(declared).size !== declared.length || declared.some((k) => existing.has(k))) throw new HttpError(409, "Entitlement keys must be unique across the registry.");
    const graph = new Map(input.features.map((f) => [f.key, f.dependsOn]));
    const visit = (key: string, stack: Set<string>) => {
      if (stack.has(key)) throw new HttpError(400, "Feature dependencies must be acyclic.");
      if (key === input.key || existingFeatures.has(key)) return;
      const parents = graph.get(key);
      if (!parents) throw new HttpError(400, "Unknown dependency feature.");
      for (const parent of parents) visit(parent, new Set([...stack, key]));
    };
    for (const f of input.features) {
      if (!f.dependsOn.includes(input.key)) throw new HttpError(400, "A subfeature must depend on its module.");
      visit(f.key, new Set());
    }
    // A catalog registration cannot claim a runtime implementation exists.
    if (input.lifecycle !== "deferred" || input.sandboxAvailable) throw new HttpError(400, "New registrations are deferred. Runtime implementations require a reviewed code change.");
    await client.query("INSERT INTO module_catalog (key,name,description,category,sandbox_available,definition) VALUES ($1,$2,$3,$4,$5,$6)", [input.key, input.name.trim(), input.description, input.category, false, JSON.stringify(input)]);
    for (const f of [{ key: input.key, label: input.name }, ...input.features]) {
      await client.query("INSERT INTO entitlement_definitions (key,label,kind,value_type) VALUES ($1,$2,'feature','boolean')", [f.key, f.label]);
    }
    for (const l of input.limits) await client.query("INSERT INTO entitlement_definitions (key,label,kind,value_type) VALUES ($1,$2,'limit',$3)", [l.key, l.label, l.valueType]);
    await audit(client, principal, null, "product.registered", `Registered deferred module ${input.key}`, { key: input.key });
    return input;
  });
}