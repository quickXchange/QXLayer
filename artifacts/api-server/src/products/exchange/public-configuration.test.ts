import { test } from "node:test";
import assert from "node:assert/strict";
import { projectPublicExchangeConfiguration } from "./public-configuration";
import { emptySettings } from "./settings";
import { masterExchangeDefaults, masterWebsiteDefaults } from "./master-template";
import type { ExchangeCatalogAsset } from "@workspace/api-zod";

const catalog = [
  { assetNetworkId: "btc-test", assetId: "btc", symbol: "BTC", name: "Bitcoin", networkId: "bitcoin", networkName: "Bitcoin Testnet", testnet: true },
  { assetNetworkId: "eth-test", assetId: "eth", symbol: "ETH", name: "Ethereum", networkId: "ethereum", networkName: "Ethereum Sepolia", testnet: true },
] as ExchangeCatalogAsset[];
const features = { website: true, crypto_exchange: true, swap: true, convert: true, buy: true, sell: true };

test("provisioned Exchange defaults select the one Master without inheriting NovaX identity or assets", () => {
  const website = masterWebsiteDefaults("Asterlane Exchange");
  assert.equal(website.templateKey, "standard-exchange");
  assert.equal(website.websiteName, "Asterlane Exchange");
  assert.equal(website.heroTitle, "Your next exchange starts here.");
  assert.equal(JSON.stringify(website).includes("NovaX"), false);
  const settings = masterExchangeDefaults([], ["swap", "convert", "buy", "sell"], "USD");
  assert.deepEqual(settings.assets, []);
  assert.deepEqual(settings.networks, []);
  assert.deepEqual(settings.routes, []);
  assert.equal(settings.enabled, false);
  assert.deepEqual(settings.actions, { swap: true, convert: true, buy: true, sell: true });
});

test("paused configuration retains configured action controls, never admits trading, and uses only this tenant's enabled assets/networks", () => {
  const settings = { ...emptySettings(), enabled: false, actions: { swap: true, convert: true, buy: true, sell: true },
    assets: [{ assetId: "btc", symbol: "BTC", enabled: true, decimals: 8, displayOrder: 0, logoUrl: null, sandboxPlanRate: "0" }],
    networks: [{ assetNetworkId: "btc-test", enabled: true, available: true, minimum: "0", maximum: "100", fee: "0", information: "" }] };
  const a = projectPublicExchangeConfiguration(settings, catalog, { features, overLimit: false }, true);
  assert.equal(a.enabled, false);
  assert.deepEqual(a.actions, ["swap", "convert", "buy", "sell"]);
  assert.deepEqual(a.assets.map(x => x.symbol), ["BTC"]);
  const b = projectPublicExchangeConfiguration(emptySettings(), catalog, { features, overLimit: false }, true);
  assert.deepEqual(b.assets, []);
  assert.deepEqual(a.assets.map(x => x.symbol), ["BTC"], "another tenant's projection must not mutate the first");
  const denied = projectPublicExchangeConfiguration(settings, catalog, { features: { ...features, buy: false, sell: false }, overLimit: false }, true);
  assert.deepEqual(denied.actions, ["swap", "convert"]);
  const unavailable = projectPublicExchangeConfiguration({ ...settings, networks: settings.networks.map(n => ({ ...n, available: false })) }, catalog, { features, overLimit: false }, true);
  assert.deepEqual(unavailable.assets, []);
});
