export type CalendarFlowScope = 'all' | 'routine' | `flow:${string}`;

export type CalendarFlowScopeRow = {
  flowSlug: string;
  isRoutine: boolean;
};

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
