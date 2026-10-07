/** Read-only list views. They do not archive records or alter order transitions. */
export function statusesForOrderView(view?: string): string[] | null {
  if (view === "active") return ["pending", "processing"];
  if (view === "archived") return ["completed", "cancelled", "failed"];
  return null;
}
