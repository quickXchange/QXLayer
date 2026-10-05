import { randomUUID } from "node:crypto";
import type { Principal } from "../authentication/service";
import { decimal, decimalString } from "../entitlements/decimal";
import { exchangeConfiguration } from "../../products/exchange/service";
import { demoEnabled, demoIdentity } from "./session";

// Configure only the dedicated development demo, never a similarly branded customer.
export async function completeDemoRoutes(operator: Principal, tenantId: string) {
  if (!demoEnabled() || tenantId !== (await demoIdentity()).memberships[0].tenantId) throw new Error("Dedicated development demo required.");
  const { configuration: s, catalog } = await exchangeConfiguration(operator, tenantId);
  const rates = new Map(s.assets.map(a => [a.assetId, a.sandboxPlanRate]));
  const crypto = catalog.filter(c => s.networks.some(n => n.assetNetworkId === c.assetNetworkId && n.enabled && n.available))
    .map(c => ({ id: c.assetNetworkId, symbol: c.symbol, rate: rates.get(c.assetId)! }));
  const fiat = { id: `fiat:${s.fiatCurrency}`, symbol: s.fiatCurrency, rate: s.fiatPlanRate };
  const existing = new Set(s.routes.map(r => `${r.action}:${r.source}:${r.destination}`));
  type Endpoint = { id: string; symbol: string; rate: string };
  const add = (action: "swap" | "convert" | "buy" | "sell", source: Endpoint, destination: Endpoint) => {
    const key = `${action}:${source.id}:${destination.id}`;
    if (existing.has(key)) return;
    s.routes.push({ id: randomUUID(), action, source: source.id, destination: destination.id, enabled: true,
      rate: decimalString(decimal(source.rate) * 10n ** 18n / decimal(destination.rate)),
      minimum: source.symbol === "BTC" ? "0.0001" : source.symbol === "ETH" ? "0.01" : "20",
      maximum: source.symbol === "BTC" ? "2" : source.symbol === "ETH" ? "25" : "10000",
      feeBps: 35, spreadBps: 50, fixedFee: "0",
      paymentMethodIds: action === "buy" || action === "sell" ? s.paymentMethods.filter(m => m.enabled && m[action]).map(m => m.id) : [] });
    existing.add(key);
  };
  const before = s.routes.length;
  for (const source of crypto) {
    for (const destination of crypto) if (source.id !== destination.id) {
      add("swap", source, destination); add("convert", source, destination);
    }
    add("buy", fiat, source); add("sell", source, fiat);
  }
  if (s.routes.length !== before) await exchangeConfiguration(operator, tenantId, s);
}
