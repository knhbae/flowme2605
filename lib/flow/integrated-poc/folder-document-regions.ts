import { textWorkspaceModel as M, type TextRow, type TextWorkspaceState } from './text-workspace';
import { programFolderPath } from './folder-link-suggestions';

export interface ProgramFolderRegion {
  key: string;
  startIndex: number;
  endIndex: number;
  lineIds: string[];
  raw: string;
  contextRows: TextRow[];
  depth: number;
  readOnly?: boolean;
}

/** Keep an intentional same-document scope; don't carry an empty old scope to another writing. */
export function programFolderAfterDocumentOpen(state: TextWorkspaceState, previousId: string, nextId: string, folderId: string): string {
  if (!folderId || previousId === nextId) return folderId;
  return readProgramFolderRegions(state, nextId, folderId)?.regions.length ? folderId : '';
}
export interface ProgramFolderDocumentView {
  documentId: string;
  folderId: string;
  folderPath: string;
  fullRaw: string;
  workspace: TextWorkspaceState;
  regions: ProgramFolderRegion[];
  matchingDocumentIds: string[];
}
// A view is a local capability. Serialized, fabricated or modified views cannot
// authorize a write; even in-place workspace mutations invalidate its snapshot.
const snapshots = new WeakMap<ProgramFolderDocumentView, { workspace: string; view: string }>();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const viewToken = (view: ProgramFolderDocumentView) => JSON.stringify({ ...view, workspace: undefined });

function scopeMatches(state: TextWorkspaceState, scopeId: string | undefined, folderId: string): boolean {
  let id: string | null | undefined = state.flows.find(flow => flow.id === scopeId)?.folderId ?? scopeId;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    if (id === folderId) return true;
    seen.add(id); id = state.folders.find(folder => folder.id === id)?.parentId;
  }
  return false;
}

function selection(state: TextWorkspaceState, documentId: string, folderId: string) {
  const rows = M.rowMeta(state, documentId), selected = new Set<number>(), locked = new Set<number>();
  // Empty checkboxes are source scaffolds, absent from Tasks. Keep a dormant
  // owner when one exists; otherwise only a confirmed outline scope selects them.
  const rowScope = (row: TextRow) => row.scopeId ?? (['task', 'subcheck'].includes(row.kind)
    ? state.itemScopes[row.id] ?? state.taskScopes[row.id] ?? row.ancestorScopeId ?? undefined : undefined);
  const roots = rows.filter(row => row.kind === 'scope' && scopeMatches(state, row.scopeId, folderId) ||
    ['task', 'subcheck'].includes(row.kind) && scopeMatches(state, rowScope(row), folderId));
  for (const root of roots) for (let i = root.index; i < root.subtreeEndIndex; i++) selected.add(i);
  for (const row of rows) {
    if (row.isReference || (['task', 'subcheck'].includes(row.kind) && !scopeMatches(state, rowScope(row), folderId))) {
      for (let i = row.index; i < row.subtreeEndIndex; i++) locked.add(i);
    }
  }
  const editable = (row: TextRow) => selected.has(row.index) && !locked.has(row.index) &&
    ['blank', 'note', 'task', 'subcheck', 'property'].includes(row.kind) && !/^ *-\s+날짜:/.test(row.text);
  return { rows, roots, selected, editable };
}

/** Read an original document; its storage folder alone never selects prose. */
export function readProgramFolderRegions(state: TextWorkspaceState, documentId: string, folderId: string): ProgramFolderDocumentView | null {
  if (!M.validate(state) || !state.folders.some(folder => folder.id === folderId)) return null;
  const doc = M.getDocument(state, documentId);
  if (!doc) return null;
  const { rows, roots, selected, editable } = selection(state, documentId, folderId);
  const context = new Set(rows.filter(row => selected.has(row.index) && !editable(row)).map(row => row.id));
  const byId = new Map(rows.map(row => [row.id, row]));
  for (const row of rows.filter(row => selected.has(row.index))) {
    if (row.dateLineId) context.add(row.dateLineId);
    let parent = row.parentLineId;
    while (parent) { context.add(parent); parent = byId.get(parent)?.parentLineId ?? null; }
  }
  const regions: ProgramFolderRegion[] = [];
  function add(startIndex: number, endIndex: number, depth: number) {
    const before = rows[startIndex - 1]?.id ?? 'start';
    regions.push({ key: `${documentId}:${folderId}:${before}`, startIndex, endIndex,
      lineIds: doc!.lines.slice(startIndex, endIndex).map(line => line.id),
      raw: doc!.lines.slice(startIndex, endIndex).map(line => line.text).join('\n'), depth,
      contextRows: rows.filter(row => context.has(row.id) && (row.index < startIndex || row.index >= endIndex)),
    });
  }
  for (let index = 0; index < rows.length;) {
    if (!editable(rows[index])) { index++; continue; }
    const start = index;
    while (index < rows.length && editable(rows[index])) index++;
    add(start, index, Math.min(...rows.slice(start, index).map(row => row.depth)));
  }
  // An explicitly linked, empty folder has a safe insertion boundary. No
  // synthetic persistent line or implicit task is created just by reading it.
  for (const root of roots) if (root.kind === 'scope' &&
    rows.slice(root.index + 1, root.subtreeEndIndex).every(row => row.kind === 'blank')) {
    add(root.subtreeEndIndex, root.subtreeEndIndex, root.depth + 1);
  }
  if (!regions.length && roots.length) {
    add(roots[0].index, roots[0].index, roots[0].depth);
    regions[0].readOnly = true;
  }
  regions.sort((a, b) => a.startIndex - b.startIndex);
  const matchingDocumentIds = [...state.documents, ...state.flows].filter(entry => selection(state, entry.id, folderId).roots.length > 0).map(entry => entry.id);
  const view: ProgramFolderDocumentView = { documentId, folderId, folderPath: programFolderPath(state, folderId),
    fullRaw: M.raw(doc), workspace: state, regions, matchingDocumentIds };
  snapshots.set(view, { workspace: JSON.stringify(state), view: viewToken(view) });
  return view;
}

export type ProgramRegionEditResult = { ok: true; next: TextWorkspaceState; fullRaw: string } | { ok: false; reason: string };

/** A local view may be handed to another surface only while its original model is current. */
export function isProgramFolderViewCurrent(state: TextWorkspaceState, view: ProgramFolderDocumentView): boolean {
  const token = snapshots.get(view), doc = M.getDocument(state, view.documentId);
  return !!token && token.view === viewToken(view) && token.workspace === JSON.stringify(state)
    && token.workspace === JSON.stringify(view.workspace) && !!doc && M.raw(doc) === view.fullRaw
    && view.regions.every(region => same(doc.lines.slice(region.startIndex, region.endIndex).map(line => line.id), region.lineIds));
}

/** Replace one original contiguous span, then run the existing full-text model.
 * No fragment is ever passed to editTextResult or returned as a save payload. */
export function planProgramRegionEdit(state: TextWorkspaceState, view: ProgramFolderDocumentView, regionKey: string,
  replacement: string, options?: { progressDate?: string }): ProgramRegionEditResult {
  const fail = (reason: string): ProgramRegionEditResult => ({ ok: false, reason });
  const token = snapshots.get(view);
  if (!token || token.view !== viewToken(view)) return fail('invalid-view');
  if (token.workspace !== JSON.stringify(state)) return fail('stale-workspace');
  if (token.workspace !== JSON.stringify(view.workspace)) return fail('invalid-view');
  const doc = M.getDocument(state, view.documentId), region = view.regions.find(entry => entry.key === regionKey);
  if (!doc || !region || M.raw(doc) !== view.fullRaw || !same(doc.lines.slice(region.startIndex, region.endIndex).map(line => line.id), region.lineIds)) return fail('stale-region');
  if (typeof replacement !== 'string') return fail('invalid-replacement');
  const normalized = replacement.replace(/\r\n?/g, '\n');
  if (normalized === region.raw) return { ok: true, next: state, fullRaw: view.fullRaw };
  if (region.readOnly) return fail('readonly-context');
  const incoming = normalized ? normalized.split('\n') : [];
  if (incoming.some(line => line.trim() && (/\t/.test(line.match(/^\s*/)?.[0] ?? '') || (line.match(/^ */)?.[0].length ?? 0) < region.depth * 2))) return fail('region-boundary');
  const texts = doc.lines.map(line => line.text);
  texts.splice(region.startIndex, region.endIndex - region.startIndex, ...incoming);
  const fullRaw = texts.join('\n');
  const result = M.editTextResult(state, view.documentId, fullRaw, options);
  if (result.reason) return fail(result.reason);
  let next = result.state, after = M.getDocument(next, view.documentId);
  if (!M.validate(next) || !after) return fail('invalid-result');
  if (M.raw(after) !== fullRaw) return fail('model-rewrote-context');
  const beforeRows = M.rowMeta(state, doc.id);
  let materializedBlank: { id: string; context: ReturnType<typeof M.insertionContext> } | null = null;
  // The full reconciler allocates a new ID when a saved empty line becomes
  // prose. Preserve just that source identity when one bounded, unowned blank
  // changes and every other original line is byte/ID-identical. One immediately
  // following blank/note may continue the same context before autosave; multiple
  // changed blanks, pasted paragraphs and new Item/context kinds stay outside.
  const addedCount = after.lines.length - doc.lines.length;
  if (addedCount === 0 || addedCount === 1) {
    const candidateRows = M.rowMeta(next, doc.id);
    const changedIndices = doc.lines.flatMap((line, index) => beforeRows[index]?.kind === 'blank'
      && candidateRows[index]?.kind === 'note' && line.text !== after!.lines[index].text
      && doc.lines.every((entry, offset) => offset === index || same(entry, after!.lines[offset + (offset > index ? addedCount : 0)])) ? [index] : []);
    if (changedIndices.length === 1) {
      const index = changedIndices[0], original = beforeRows[index], changed = candidateRows[index], added = addedCount ? candidateRows[index + 1] : null;
      const hasIdentity = (workspace: TextWorkspaceState, lineId: string) =>
        Object.hasOwn(workspace.itemScopes, lineId) || Object.hasOwn(workspace.taskScopes, lineId)
        || workspace.bindings.some(binding => binding.lineId === lineId || binding.kind === 'task' && binding.taskId === lineId)
        || workspace.progressRecords.some(record => record.taskId === lineId)
        || M.tasks(workspace).some(task => task.id === lineId);
      const context = original && M.insertionContext(state, doc.id, index, original.depth);
      const originalIds = new Set([...state.documents, ...state.flows].flatMap(entry => entry.lines.map(line => line.id)));
      const matchesContext = (row: TextRow, expected: NonNullable<typeof context>) => row.depth === original.depth
        && same(expected.parentLineId, row.parentLineId) && same(expected.parentKind, row.parentKind)
        && same(expected.ancestorScopeIds, row.ancestorScopeIds) && same(expected.scopeId, row.ancestorScopeId)
        && same(expected.scopeKind, row.ancestorScopeKind) && same(expected.date, row.groupDate) && same(expected.dateLineId, row.dateLineId);
      const addedContext = added && M.insertionContext(next, doc.id, index + 1, original.depth);
      const safeContinuation = !added || context?.valid && (!originalIds.has(added.id) || added.id === original.id && !originalIds.has(changed.id))
        && added.id !== changed.id && !hasIdentity(next, added.id)
        && added.depth === original.depth && (added.kind === 'note' && matchesContext(added, context)
          || added.kind === 'blank' && added.text === '  '.repeat(original.depth))
        && addedContext?.valid && same(context, addedContext);
      if (index >= region.startIndex && index < region.endIndex && original?.kind === 'blank' && changed?.kind === 'note'
        && context?.valid && original.depth === changed.depth && !hasIdentity(state, original.id) && !hasIdentity(next, changed.id)
        && (changed.id === original.id || !originalIds.has(changed.id))
        && safeContinuation && matchesContext(changed, context)) {
        // Exact matching may have put the old blank ID on the continuation.
        // Move it back to its materialized source row and reuse only the fresh,
        // unregistered prose ID for that one newly inserted continuation.
        const restored = { ...after, lines: after.lines.map((line, offset) => offset === index ? { ...line, id: original.id }
          : offset === index + 1 && added?.id === original.id ? { ...line, id: changed.id } : line) };
        next = { ...next, documents: next.documents.map(entry => entry.id === doc.id ? restored : entry),
          flows: next.flows.map(entry => entry.id === doc.id ? { ...entry, lines: restored.lines } : entry) };
        after = M.getDocument(next, doc.id);
        if (!M.validate(next) || !after) return fail('invalid-result');
        materializedBlank = { id: original.id, context };
      }
    }
  }
  if (!same(state.folders, next.folders) || !same(state.bindings, next.bindings) || !same(state.progressRecords, next.progressRecords)) return fail('protected-state');
  for (const beforeDoc of [...state.documents, ...state.flows]) if (beforeDoc.id !== doc.id && !same(beforeDoc, M.getDocument(next, beforeDoc.id))) return fail('linked-document-change');
  const hiddenBefore = [...doc.lines.slice(0, region.startIndex), ...doc.lines.slice(region.endIndex)];
  const hiddenAfter = [...after.lines.slice(0, region.startIndex), ...after.lines.slice(region.startIndex + incoming.length)];
  if (!same(hiddenBefore, hiddenAfter)) return fail('hidden-lines-change');
  const editedIds = new Set(region.lineIds), afterRows = M.rowMeta(next, doc.id);
  const newSelection = selection(next, doc.id, view.folderId);
  const afterById = new Map(afterRows.map(row => [row.id, row]));
  // Existing row identity and structural/date context cannot be repurposed by
  // a bounded edit. In particular, ordinary notes cannot become tasks.
  for (const row of beforeRows) {
    const changed = afterById.get(row.id);
    if (!changed) return fail('existing-line-removed');
    const plainScaffold = ['task', 'subcheck'].includes(row.kind) && !row.title
      && beforeRows.slice(row.index + 1, row.subtreeEndIndex).every(child => child.kind === 'blank');
    for (const field of ['kind', 'depth', 'parentLineId', 'ancestorScopeIds', 'scopeId', 'date', 'groupDate', 'dateLineId', 'isReference', 'scopeMismatch'] as const) {
      // Filling an empty source scaffold reveals its already-selected context;
      // it does not authorize a new parent, owner, date or row kind.
      const original = materializedBlank?.id === row.id && field === 'kind' ? 'note'
        : materializedBlank?.id === row.id && field === 'parentLineId' ? materializedBlank.context.parentLineId
        : materializedBlank?.id === row.id && field === 'ancestorScopeIds' ? materializedBlank.context.ancestorScopeIds
        : plainScaffold && field === 'scopeId' ? row.scopeId ?? state.itemScopes[row.id] ?? state.taskScopes[row.id] ?? row.ancestorScopeId ?? undefined
        : plainScaffold && field === 'date' && row.date === undefined ? row.groupDate : row[field];
      const updated = plainScaffold && !changed.title && field === 'scopeId' ? changed.scopeId ?? next.itemScopes[row.id] ?? next.taskScopes[row.id] ?? changed.ancestorScopeId ?? undefined
        : plainScaffold && !changed.title && field === 'date' && changed.date === undefined ? changed.groupDate : changed[field];
      if (!same(original, updated)) return fail('row-context-change');
    }
  }
  const previousIds = new Set(doc.lines.map(line => line.id));
  for (const row of afterRows.slice(region.startIndex, region.startIndex + incoming.length)) {
    if (!newSelection.editable(row)) return fail('readonly-context');
    if (!previousIds.has(row.id) && (!['blank', 'note', 'task', 'subcheck', 'property'].includes(row.kind) || /^ *-\s+날짜:/.test(row.text))) return fail('new-context');
  }
  for (const key of ['taskScopes', 'itemScopes'] as const) {
    for (const [id, scope] of Object.entries(state[key])) if (next[key][id] !== scope) return fail('ownership-change');
    for (const [id, scope] of Object.entries(next[key])) if (!(id in state[key]) && (!afterById.has(id) || !scopeMatches(next, scope, view.folderId))) return fail('ownership-change');
  }
  const tasksAfter = new Map(M.parseDocument(after, next).items.map(task => [task.id, task]));
  for (const task of M.parseDocument(doc, state).items) {
    const updated = tasksAfter.get(task.id);
    if (!updated) return fail('existing-task-removed');
    for (const key of ['date', 'groupDate', 'explicitDate', 'done', 'parentItemId', 'parentTaskId', 'isCanonical', 'inputPercent', 'inputToken'] as const) if (!same(task[key], updated[key])) return fail('task-context-change');
    if (!editedIds.has(task.id)) {
      const propertyEdited = (name: string) => beforeRows.some(row => editedIds.has(row.id) && row.kind === 'property' && row.taskId === task.id && new RegExp(`^ *-\\s+${name}:`).test(row.text));
      if (task.title !== updated.title || task.note !== updated.note && !propertyEdited('메모') || task.time !== updated.time && !propertyEdited('시간')) return fail('hidden-task-change');
    }
  }
  return { ok: true, next, fullRaw };
}
