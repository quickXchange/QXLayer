/** Pure selection logic (unit-testable). */
export interface SelectionView { ids: string[]; visibleSelected: number; hidden: number; all: boolean; some: boolean }

export function computeSelection(selected: Iterable<string>, visible: string[], universe?: string[]): SelectionView {
  const vis = new Set(visible);
  const uni = universe ? new Set(universe) : vis;
  const ids = [...selected].filter((i) => uni.has(i));
  const visibleSelected = ids.filter((i) => vis.has(i)).length;
  return { ids, visibleSelected, hidden: ids.length - visibleSelected, all: visible.length > 0 && visibleSelected === visible.length, some: visibleSelected > 0 && visibleSelected < visible.length };
}

export const selectVisible = (cur: Set<string>, visible: string[], persist: boolean) => (persist ? new Set([...cur, ...visible]) : new Set(visible));
export const deselectVisible = (cur: Set<string>, visible: string[]) => { const n = new Set(cur); visible.forEach((i) => n.delete(i)); return n; };
