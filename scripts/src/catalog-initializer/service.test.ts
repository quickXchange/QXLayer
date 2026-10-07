import assert from "node:assert/strict";
import test from "node:test";
import { approvedKeys } from "./approved";
import { initializeCatalog, type CatalogClient } from "./service";

class Fixture implements CatalogClient {
  statements: string[] = [];
  modules = [...approvedKeys] as string[];
  products = new Map<string, Record<string, unknown>>([["unknown", { key: "unknown", visible: false, price: "123" }]]);
  async query(sql: string, values: unknown[] = []) {
    this.statements.push(sql);
    if (sql.startsWith("SELECT key FROM module")) return { rows: this.modules.map(key => ({ key })) };
    if (sql.startsWith("SELECT key,visible")) return { rows: [...this.products.values()].filter(r => approvedKeys.includes(r.key as typeof approvedKeys[number])) };
    if (sql.startsWith("INSERT")) {
      const key = values[0] as string;
      if (!this.products.has(key)) this.products.set(key, { key, visible: true });
    }
    if (sql.startsWith("UPDATE")) this.products.get(values[0] as string)!.visible = true;
    return { rows: [] };
  }
}
test("exact 15-product allowlist, dry-run has no writes or Kolo", async () => {
  const c = new Fixture();
  const plan = await initializeCatalog(c, { nodeEnv: "development" });
  assert.equal(plan.length, 15);
  assert(plan.every(p => p.action === "insert"));
  assert(!approvedKeys.some(k => (k as string) === "kolo"));
  assert(!c.statements.some(s => /INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER/i.test(s)));
  assert.equal(c.products.size, 1);
});
test("apply is idempotent and preserves unknown records", async () => {
  const c = new Fixture();
  await initializeCatalog(c, { nodeEnv: "development", apply: true });
  const again = await initializeCatalog(c, { nodeEnv: "development", apply: true });
  assert(again.every(p => p.action === "unchanged"));
  assert.equal(c.products.size, 16);
  assert.deepEqual(c.products.get("unknown"), { key: "unknown", visible: false, price: "123" });
});
test("hidden and edited products preserved unless visibility explicitly approved", async () => {
  const c = new Fixture();
  c.products.set("crypto_exchange", { key: "crypto_exchange", visible: false, price: "999", name: "Production edit" });
  await initializeCatalog(c, { nodeEnv: "development", apply: true });
  assert.equal(c.products.get("crypto_exchange")!.visible, false);
  await initializeCatalog(c, { nodeEnv: "development", apply: true, restoreVisibility: true });
  assert.deepEqual(c.products.get("crypto_exchange"), { key: "crypto_exchange", visible: true, price: "999", name: "Production edit" });
});
test("missing dependencies rollback without writes", async () => {
  const c = new Fixture(); c.modules = [];
  await assert.rejects(initializeCatalog(c, { nodeEnv: "development", apply: true }), /Missing approved module/);
  assert.equal(c.statements.at(-1), "ROLLBACK");
  assert(!c.statements.some(s => s.startsWith("INSERT") || s.startsWith("UPDATE")));
});
test("Production or unspecified execution refused before connection queries", async () => {
  for (const nodeEnv of ["production", undefined]) {
    const c = new Fixture();
    await assert.rejects(initializeCatalog(c, { nodeEnv, apply: true }), /Development-only/);
    assert.equal(c.statements.length, 0);
  }
});
test("published deployment is refused even if NODE_ENV is forced to development", async () => {
  const c = new Fixture();
  await assert.rejects(initializeCatalog(c, { nodeEnv: "development", deployment: "1", apply: true }), /Development-only/);
  assert.equal(c.statements.length, 0);
});
