import { programSame } from './controller';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

/** Preserve unrelated document/progress writes; never guess through a same-owner conflict. */
export function mergeProgramTextWorkspace(base: TextWorkspaceState, proposed: TextWorkspaceState, current: TextWorkspaceState): TextWorkspaceState | null {
  if (![base, proposed, current].every(M.validate)) return null;
  function value<T>(before: T, next: T, actual: T): T {
    if (programSame(before, next)) return actual;
    if (programSame(before, actual) || programSame(next, actual)) return next;
    throw new Error('conflict');
  }
  function catalog<T>(before: T[], next: T[], actual: T[], key: (row: T) => string): T[] {
    const old = new Map(before.map(row => [key(row), row])), wanted = new Map(next.map(row => [key(row), row])), saved = new Map(actual.map(row => [key(row), row]));
    const ids = [...saved.keys(), ...[...wanted.keys()].filter(id => !saved.has(id))];
    return ids.flatMap(id => { const merged = value(old.get(id), wanted.get(id), saved.get(id)); return merged === undefined ? [] : [merged]; });
  }
  function record(before: Record<string, string>, next: Record<string, string>, actual: Record<string, string>): Record<string, string> {
    const result = { ...actual };
    for (const key of new Set([...Object.keys(before), ...Object.keys(next)])) {
      const merged = value(before[key], next[key], actual[key]);
      if (merged === undefined) delete result[key]; else result[key] = merged;
    }
    return result;
  }
  try {
    const merged: TextWorkspaceState = {
      version: 11,
      documents: catalog(base.documents, proposed.documents, current.documents, row => row.id),
      flows: catalog(base.flows, proposed.flows, current.flows, row => row.id),
      folders: catalog(base.folders, proposed.folders, current.folders, row => row.id),
      bindings: catalog(base.bindings, proposed.bindings, current.bindings, row => JSON.stringify([row.docId, row.lineId])),
      taskScopes: record(base.taskScopes, proposed.taskScopes, current.taskScopes),
      itemScopes: record(base.itemScopes, proposed.itemScopes, current.itemScopes),
      progressRecords: catalog(base.progressRecords, proposed.progressRecords, current.progressRecords, row => JSON.stringify([row.taskId, row.date])),
    };
    return M.validate(merged) ? merged : null;
  } catch { return null; }
}
