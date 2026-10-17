/** Display-only mirror of the server's exact half-up recurring-price rounding.
 * Billing still validates and computes all amounts independently on the server. */
export function recurringDisplayPrice(value: string, discount = "0"): string {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || !/^\d{1,3}(?:\.\d{1,2})?$/.test(discount))
    throw new Error("Invalid published recurring price.");
  const [whole, fraction = ""] = value.split(".");
  const [percent, fractionalPercent = ""] = discount.split(".");
  const points = BigInt(percent) * 100n + BigInt(fractionalPercent.padEnd(2, "0"));
  if (points > 10000n) throw new Error("Invalid published discount.");
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  const net = (amount * (10000n - points) + 5000n) / 10000n;
  return `${net / 100n}.${String(net % 100n).padStart(2, "0")}`;
}
