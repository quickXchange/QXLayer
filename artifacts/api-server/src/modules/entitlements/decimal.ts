import { HttpError } from "../../lib/errors";

const SCALE = 10n ** 18n;
// Match PostgreSQL numeric(36,18). Never compare monetary values as JS floats.
export function decimal(value: string): bigint {
  if (!/^\d{1,18}(?:\.\d{1,18})?$/.test(value)) throw new HttpError(400, "Limits must be nonnegative decimals with at most 18 integer and 18 fractional digits.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(18, "0"));
}
export function decimalString(value: bigint): string {
  const fraction = (value % SCALE).toString().padStart(18, "0").replace(/0+$/, "");
  return `${value / SCALE}${fraction ? `.${fraction}` : ""}`;
}
export function normalizeDecimal(value: string) { return decimalString(decimal(value)); }
export function isInteger(value: string) { return decimal(value) % SCALE === 0n; }