export type CalendarFlowScope = 'all' | 'routine' | `flow:${string}`;

export type CalendarFlowScopeRow = {
  flowSlug: string;
  isRoutine: boolean;
};

export type CalendarFlowScopePresentation = 'hidden' | 'compact' | 'picker';

export function getCalendarFlowScopePresentation(flowCount: number): CalendarFlowScopePresentation {
  const count = Math.max(0, Math.floor(flowCount));
  if (count <= 1) return 'hidden';
  if (count <= 5) return 'compact';
  return 'picker';
}

export function normalizeCalendarFlowSelection(
  selectedFlowSlugs: string[],
  knownFlowSlugs: string[],
): string[] {
  const known = new Set(knownFlowSlugs.filter(Boolean));
  return Array.from(new Set(selectedFlowSlugs.map((slug) => slug.trim()).filter((slug) => known.has(slug))));
}

export function isCalendarFlowRowInSelection(
  row: CalendarFlowScopeRow,
  selectedFlowSlugs: string[],
): boolean {
  return selectedFlowSlugs.length === 0 || selectedFlowSlugs.includes(row.flowSlug);
}

export function getCalendarFlowScopeForFlow(flowSlug: string): CalendarFlowScope {
  return `flow:${flowSlug.trim()}`;
}

export function getCalendarFlowSlugFromScope(scope: CalendarFlowScope): string | undefined {
  if (!scope.startsWith('flow:')) return undefined;
  const flowSlug = scope.slice('flow:'.length).trim();
  return flowSlug || undefined;
}

export function isCalendarFlowRowInScope(
  row: CalendarFlowScopeRow,
  scope: CalendarFlowScope,
): boolean {
  if (scope === 'all') return true;
  if (scope === 'routine') return row.isRoutine;
  return row.flowSlug === getCalendarFlowSlugFromScope(scope);
}

export function normalizeCalendarFlowScope(
  scope: CalendarFlowScope,
  knownFlowSlugs: string[],
  hasRoutineRows: boolean,
): CalendarFlowScope {
  if (scope === 'all') return scope;
  if (scope === 'routine') return hasRoutineRows ? scope : 'all';
  const flowSlug = getCalendarFlowSlugFromScope(scope);
  return flowSlug && knownFlowSlugs.includes(flowSlug) ? scope : 'all';
}
