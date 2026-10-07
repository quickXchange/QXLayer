export const diagnosticCategories = ["render_type", "missing_reference", "script_syntax", "asset_load", "unknown"] as const;
export interface SafeWebsiteDiagnostic { errorId: string; category: typeof diagnosticCategories[number]; buildId: string }
export function parseWebsiteDiagnostic(input: unknown): SafeWebsiteDiagnostic | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (Object.keys(record).length !== 3 || Object.keys(record).some(k => !["errorId", "category", "buildId"].includes(k))) return null;
  if (typeof record.errorId !== "string" || record.errorId.length !== 36 || !/^QXS-[a-f0-9]{32}$/.test(record.errorId)) return null;
  if (typeof record.buildId !== "string" || record.buildId.length !== 21 || !/^site-[a-f0-9]{16}$/.test(record.buildId)) return null;
  if (!diagnosticCategories.includes(record.category as SafeWebsiteDiagnostic["category"])) return null;
  return { errorId: record.errorId, category: record.category as SafeWebsiteDiagnostic["category"], buildId: record.buildId };
}

export function diagnosticLimiter(now = Date.now) {
  const buckets = new Map<string, { until: number; count: number }>();
  let global = { until: 0, count: 0 };
  return (key: string) => {
    const time = now();
    for (const [ip, entry] of buckets) if (entry.until <= time) buckets.delete(ip);
    if (global.until <= time) global = { until: time + 60_000, count: 0 };
    if (global.count >= 100) return false;
    const entry = buckets.get(key) ?? { until: time + 60_000, count: 0 };
    if (entry.count >= 10 || (!buckets.has(key) && buckets.size >= 1000)) return false;
    entry.count++; global.count++; buckets.set(key, entry);
    return true;
  };
}
