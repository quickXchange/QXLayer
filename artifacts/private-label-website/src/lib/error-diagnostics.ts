declare const __QX_SITE_BUILD_ID__: string;
export type ErrorCategory = "render_type" | "missing_reference" | "script_syntax" | "asset_load" | "unknown";
export interface SafeDiagnostic { errorId: string; category: ErrorCategory; buildId: string }

export function errorCategory(error: unknown): ErrorCategory {
  // Only the allowlisted class is inspected; never message, stack, cause, URL or response.
  try {
    const name = error && typeof error === "object" ? (error as { name?: unknown }).name : null;
    if (name === "TypeError") return "render_type";
    if (name === "ReferenceError") return "missing_reference";
    if (name === "SyntaxError") return "script_syntax";
    if (name === "ChunkLoadError") return "asset_load";
  } catch { /* Hostile accessors cannot break the fallback. */ }
  return "unknown";
}

export function createDiagnostic(error: unknown): SafeDiagnostic {
  return {
    errorId: `QXS-${crypto.randomUUID().replace(/-/g, "")}`,
    category: errorCategory(error),
    buildId: typeof __QX_SITE_BUILD_ID__ === "undefined" ? "site-0000000000000000" : __QX_SITE_BUILD_ID__,
  };
}

export function diagnosticBody(diagnostic: SafeDiagnostic): string {
  // Reconstruct the projection even if callers pass extra properties.
  return JSON.stringify({ errorId: diagnostic.errorId, category: diagnostic.category, buildId: diagnostic.buildId });
}

export function reportDiagnostic(diagnostic: SafeDiagnostic): void {
  // API is the separately registered /api artifact, never the tenant website slug.
  void fetch("/api/diagnostics/website-errors", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: diagnosticBody(diagnostic), keepalive: true,
  }).catch(() => { /* Reporting must never crash or disclose raw exception details. */ });
}
