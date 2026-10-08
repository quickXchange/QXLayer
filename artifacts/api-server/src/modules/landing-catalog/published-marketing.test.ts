import test from "node:test";
import assert from "node:assert/strict";
import { GetPublicProductCatalogResponse } from "@workspace/api-zod";
import { publishedMarketingProducts, selectPublicCatalog } from "./published-marketing";

test("published marketing uses the existing public contract, with no invented prices or execution", () => {
  const products = GetPublicProductCatalogResponse.parse(publishedMarketingProducts);
  assert.equal(products.length, 15);
  assert.equal(new Set(products.map(product => product.key)).size, 15);
  for (const product of products) {
    assert.equal(product.startingPrice, null);
    assert.equal(product.setupFee, null);
    assert.equal(product.billingPeriod, "on_request");
    assert.equal(product.readiness, product.key === "crypto_exchange" ? "sandbox_only" : "planned");
  }
});

test("only an entirely unconfigured Production catalog uses published marketing", () => {
  assert.equal(selectPublicCatalog([], false, true).source, "published-marketing");
  assert.deepEqual(selectPublicCatalog([], false, false), { source: "database", products: [] });
  // Rows exist but all are deliberately hidden.
  assert.deepEqual(selectPublicCatalog([], true, true), { source: "database", products: [] });
  const saved = [{ key: "operator-owned-product", visible: true }];
  assert.deepEqual(selectPublicCatalog(saved, true, true), { source: "database", products: saved });
  assert.deepEqual(selectPublicCatalog(saved, false, true), { source: "database", products: saved });
});
