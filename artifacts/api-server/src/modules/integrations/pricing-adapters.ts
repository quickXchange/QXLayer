import { HttpError } from "../../lib/errors";
import { decimal, decimalString } from "../entitlements/decimal";
import { getQuickexQuote } from "./vendor/quickex/quickex";
import { withQuickexCredentials } from "./vendor/quickex/provider-credentials";

export interface PriceRequest {
  source: string; destination: string; sourceNetwork: string; destinationNetwork: string; amount: string;
}
type ReadJson = (url: string) => Promise<any>;
const readJson: ReadJson = async url => {
  try {
    const response = await fetch(url, { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error();
    return await response.json();
  } catch { throw new HttpError(502, "Read-only provider pricing is unavailable. No financial operation was performed."); }
};
export function positiveRate(value: unknown): string {
  // The verified source accepts provider numeric prices, normalized to fixed-point.
  if (typeof value === "number") value = Number.isFinite(value) ? value.toFixed(18) : "";
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,18})?$/.test(value) || value.length > 70)
    throw new HttpError(502, "Provider returned an invalid rate.");
  const parsed = decimal(value);
  if (parsed <= 0n) throw new HttpError(502, "Provider returned a non-positive rate.");
  return decimalString(parsed);
}
/** Source transport contracts, without source global credentials, caches or order execution. */
export function pricingAdapters(read: ReadJson = readJson) {
  return async (key: string, request: PriceRequest, secrets: Record<string, string>): Promise<string> => {
    if (!secrets.apiKey || (key !== "1forge" && !secrets.secretKey)) throw new HttpError(409, "Independent tenant provider credentials are required.");
    if (!/^[A-Z0-9]{2,20}$/.test(request.source) || !/^[A-Z0-9]{2,20}$/.test(request.destination))
      throw new HttpError(400, "Unsupported provider currency symbols.");
    if (key === "1forge") {
      // Verified QuickXchange manual-desk-rates: slash pairs, api_key, symbol/s and price/p.
      const url = new URL("https://api.1forge.com/quotes");
      url.searchParams.set("pairs", `${request.source}/${request.destination}`);
      url.searchParams.set("api_key", secrets.apiKey);
      const values = await read(url.toString());
      if (!Array.isArray(values)) throw new HttpError(502, "1Forge returned an invalid rates response.");
      const pair = request.source + request.destination;
      const row = values.find(v => String(v?.symbol ?? v?.s).toUpperCase().replace(/[^A-Z0-9]/g, "") === pair);
      if (!row) throw new HttpError(502, "1Forge did not return this exact currency pair.");
      return positiveRate(row.price ?? row.p);
    }
    if (key === "whitebit") {
      // Public market data only; private account permission is verified separately.
      const data = await read("https://whitebit.com/api/v4/public/ticker");
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(502, "WhiteBIT market data is invalid.");
      if (request.source === request.destination) return "1";
      const direct = data[`${request.source}_${request.destination}`]?.last_price;
      if (direct !== undefined) return positiveRate(direct);
      const usd = (symbol: string) => symbol === "USDT" ? "1" : positiveRate(data[`${symbol}_USDT`]?.last_price);
      return decimalString(decimal(usd(request.source)) * 10n ** 18n / decimal(usd(request.destination)));
    }
    if (key === "quickex") {
      // The original instrument/route/amount validators and read-only quote transport.
      return withQuickexCredentials({ publicKey: secrets.apiKey, secretKey: secrets.secretKey }, async () => {
        const quote = await getQuickexQuote({ fromCurrency: request.source, toCurrency: request.destination,
          fromNetwork: request.sourceNetwork, toNetwork: request.destinationNetwork, amount: Number(request.amount) });
        return positiveRate(quote.price);
      });
    }
    throw new HttpError(400, "This provider does not support Sandbox pricing.");
  };
}
export const providerRate = pricingAdapters();
