import { HttpError } from "../../lib/errors";

export function discountBasisPoints(value = "0"): bigint {
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(value)) throw new HttpError(400, "Discount must be a percentage from 0 to 100, with at most two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const points = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (points > 10000n) throw new HttpError(400, "Discount cannot exceed 100%.");
  return points;
}
export function discountedRecurring(value: string, percent = "0") {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new HttpError(400, "Invalid recurring price.");
  const [whole, fraction = ""] = value.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  const net = (cents * (10000n - discountBasisPoints(percent)) + 5000n) / 10000n;
  return `${net / 100n}.${String(net % 100n).padStart(2, "0")}`;
}
export function pricingTriple(values: (string | null | undefined)[]) {
  if (values.every(v => v == null)) return false;
  if (values.some(v => v == null)) throw new HttpError(400, "Set all three prices, or leave all three unconfigured. A blank price is not zero.");
  return true;
}
export function recurringEstimate(items: { monthlyPrice: string | null | undefined; yearlyPrice: string | null | undefined; discountPercent?: string; currency: string }[], period: "monthly" | "yearly", percent: string) {
  if (!items.length || new Set(items.map(i => i.currency)).size !== 1) return null;
  let total = 0n;
  for (const item of items) {
    const amount = period === "monthly" ? item.monthlyPrice : item.yearlyPrice;
    if (amount == null) return null;
    const net = discountedRecurring(amount, item.discountPercent);
    total += BigInt(net.replace(".", ""));
  }
  return discountedRecurring(`${total / 100n}.${String(total % 100n).padStart(2, "0")}`, percent);
}
