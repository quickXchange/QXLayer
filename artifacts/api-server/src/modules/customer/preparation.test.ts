import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareReviewedWebsite } from "./preparation";

const principal = { userId: "synthetic-operator", role: "super_admin", memberships: [] } as any;
test("approval links a draft in setup without activation or customer membership", async () => {
  const queries: { text: string; values: any[] }[] = [];
  const c = { query: async (text: string, values: any[] = []) => {
    queries.push({ text, values });
    return { rows: [{ id: "request", tenantId: "tenant", status: values[2] }] };
  } } as any;
  const messages: any[] = [];
  const services = {
    prepareTenant: async () => ({ id: "tenant", slug: "synthetic" }),
    resolveEntitlements: async () => ({ status: "active", features: { website: true, crypto_exchange: true, swap: true } }),
    applyOrderBranding: async () => {},
    orderView: async (_: any, row: any) => row,
    event: async (...args: any[]) => { messages.push(args); },
    audit: async () => {},
  } as any;
  const row = { id: "request", monthlyPrice: "1.00", setupPrice: "1.00", currency: "USD",
    customDesignDecision: "not_required", configuration: { brandName: "Synthetic", actions: ["swap"] } };
  const result = await prepareReviewedWebsite(c, principal, row, { plan: { id: "plan" }, addons: [] } as any, services);
  assert.equal(result.status, "in_setup");
  assert.equal(result.tenantId, "tenant");
  assert(!queries.some(q => /INSERT INTO tenant_memberships|UPDATE tenants SET status='active'/.test(q.text)));
  assert.equal(messages[0][6], "in_setup");
});
test("repeated preparation preserves an existing linked project without writes", async () => {
  const c = { query: async () => { throw Error("Unexpected write"); } } as any;
  const row = { id: "request", tenantId: "existing", monthlyPrice: "1.00", setupPrice: "1.00", currency: "USD",
    configuration: { actions: [] } };
  const services = { orderView: async (_: any, input: any) => input } as any;
  assert.equal(await prepareReviewedWebsite(c, principal, row, { plan: { id: "plan" } } as any, services), row);
});
