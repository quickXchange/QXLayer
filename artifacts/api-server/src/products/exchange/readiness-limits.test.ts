import assert from "node:assert/strict";
import test from "node:test";
import type { ExchangeSettings } from "@workspace/api-zod";
import { networkCapacityBlockers } from "./readiness-limits";

const networks: ExchangeSettings["networks"] = ["eth-sepolia", "usdc-sepolia"].map(assetNetworkId => ({
  assetNetworkId, enabled: true, available: true, minimum: "0.01", maximum: "100", fee: "0", information: "",
}));
const routes: ExchangeSettings["routes"] = [{
  id: "eth-usdc", action: "swap", source: "eth-sepolia", destination: "usdc-sepolia",
  enabled: true, rate: "1", minimum: "0.01", maximum: "100", feeBps: 0,
  fixedFee: "0", spreadBps: 0, paymentMethodIds: [],
}];

test("zero source or destination network capacity blocks release, without assigning limits", () => {
  const missing = networks.map(network => ({ ...network, minimum: "0", maximum: "0" }));
  const before = structuredClone(missing);
  assert.equal(networkCapacityBlockers(missing, routes).length, 2);
  assert.deepEqual(missing, before);
});
test("explicit capacity works; a zero minimum is valid and unused draft networks do not block", () => {
  assert.deepEqual(networkCapacityBlockers(networks.map(network => ({ ...network, minimum: "0" })), routes), []);
  assert.deepEqual(networkCapacityBlockers([...networks, { ...networks[0], assetNetworkId: "unused", maximum: "0", minimum: "0" }], routes), []);
});
test("source network and route ranges must overlap, using exact decimal comparisons", () => {
  const tooSmall = [{ ...networks[0], maximum: "0.009999999999999999" }, networks[1]];
  assert.equal(networkCapacityBlockers(tooSmall, routes).length, 1);
  assert.deepEqual(networkCapacityBlockers([{ ...networks[0], maximum: "0.01" }, networks[1]], routes), []);
});
test("fiat endpoints have no invented network capacity requirements", () => {
  const buy: ExchangeSettings["routes"] = [{ ...routes[0], action: "buy", source: "fiat:USD" }];
  assert.deepEqual(networkCapacityBlockers(networks, buy), []);
});
