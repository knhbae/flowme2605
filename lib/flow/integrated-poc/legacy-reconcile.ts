import { programClone, type ProgramData, type ProgramPrivateSpace } from './contract';
import { programSame } from './controller';
import { createProgramPrivateSpace, validateProgramData } from './program-data';
import { hydrateProgramLegacy, inspectProgramLegacy, programLegacyIdentity, type ProgramLegacyIssue } from './legacy-projection';
import { moveProgramPersonalTaskText } from './task-document-move';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { partitionProgramLegacyCapabilities } from './legacy-capabilities';
import { transitionProgramLegacySourcePayload, type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { alignProgramLegacySourceRetention, prepareProgramLegacySourceKindMerge } from './legacy-source-execution';
import { programLegacyRevisionRefs, projectProgramLegacySource, programLegacyKeepsReviewedMapBlocks } from './legacy-source-lifecycle-contract';
import { transitionProgramLegacyMapReview, type ProgramLegacyMapReviewAction } from './legacy-map-review';
import { readProgramSelectedMapRecurrences } from './legacy-map-recurrence';
import { textWorkspaceModel as M, type TextDocument, type TextLine, type TextTask } from './text-workspace';

export type ProgramLegacyConflict = {
  ref: string; field: string; base: unknown; program: unknown; legacy: unknown;
  code: 'field-conflict' | 'deletion-review-required' | 'structure-review-required' | 'source-review-required';
};
/** A proposal only. No legacy writer, clock, storage or source mutation is called. */
export type ProgramLegacyShadowPatch = {
  ref: string; kind: 'item' | 'flow' | 'folder' | 'timeline'; field: string;
  expected: unknown; value: unknown;
};
export type ProgramLegacyShadowPlan = {
  expectedSnapshotRaw: string; patches: ProgramLegacyShadowPatch[];
  issues: { ref: string; field: string; code: 'structure-review-required' | 'unmapped-folder' }[];
};
export type ProgramLegacyReconcileResult =
  | { ok: true; data: ProgramData; changed: boolean; shadowPlan: ProgramLegacyShadowPlan }
  | { ok: false; data: ProgramData; reason: 'invalid' | 'missing' | 'forbidden' | 'conflict' | 'unresolved';
      conflicts: ProgramLegacyConflict[]; issues: (ProgramLegacyIssue | { code: string; ref: string | null })[] };

type Unit = { id: string; lines: TextLine[]; value: unknown };
const taskFields = ['title', 'done', 'date', 'time', 'note'] as const;
const property = /^\s+- (날짜|시간|메모):(?:\s|$)/u;
const docs = (space: ProgramPrivateSpace) => [...space.text.documents, ...space.text.flows];
const tasks = (space: ProgramPrivateSpace) => new Map(M.tasks(space.text).filter(task => task.isCanonical).map(task => [task.id, task]));

/** Canonical personal QuickItem location is an owner, not an old source edit.
 * Only exact legacyQuickItemLines IDs may follow a folder-owned plain document;
 * source Flow tuples, scopes, private content and old payload remain untouched. */
export function alignProgramLegacyQuickLocations(projected: ProgramPrivateSpace, current: ProgramPrivateSpace): ProgramPrivateSpace | null {
  const targetTasks = tasks(current), beforeTasks = tasks(projected);
  let next: ProgramPrivateSpace | null = null;
  for (const [ref, id] of Object.entries(projected.legacyQuickItemLines)) {
    const before = beforeTasks.get(id), target = targetTasks.get(id);
    if (!before || !target || before.docId === target.docId) continue;
    if (current.legacyQuickItemLines[ref] !== id || before.scopeKind !== 'folder' || target.scopeKind !== 'folder'
      || projected.text.taskScopes[id] !== current.text.taskScopes[id] || projected.text.itemScopes[id] !== current.text.itemScopes[id]
      || current.savedBindings.some(binding => Object.values(binding.itemLines).includes(id)) || !current.text.documents.some(doc => doc.id === target.docId)) return null;
    next ??= programClone(projected);
    next.text.folders = programClone(current.text.folders);
    if (!M.getDocument(next.text, target.docId)) {
      const doc = current.text.documents.find(row => row.id === target.docId)!;
      next.text.documents.push({ id: doc.id, title: doc.title, folderId: doc.folderId, folder: doc.folder, lines: [] });
    }
    const known = new Set([...next.text.documents, ...next.text.flows].flatMap(doc => doc.lines.map(line => line.id)));
    const moved = moveProgramPersonalTaskText(next.text, id, target.docId); if (!moved) return null;
    // The shared helper allocates separators/date pins. Read projection needs
    // deterministic identities across base/incoming, never random new owners.
    let index = 0;
    for (const line of M.getDocument(moved, target.docId)!.lines) if (!known.has(line.id)) line.id = programLegacyIdentity('quick-location', ref, target.docId, String(index++));
    if (!M.validate(moved)) return null;
    next.text = moved;
  }
  return next ?? projected;
}
const refs = (space: ProgramPrivateSpace) => new Map([
  ...space.savedBindings.flatMap(binding => Object.entries(binding.itemLines)), ...Object.entries(space.legacyQuickItemLines),
]);

/** Collapse one semantic property into one merge unit. Random editor-generated
 * property-line IDs never create two dates or duplicate a multi-line memo. */
function units(doc: TextDocument, space: ProgramPrivateSpace): Unit[] {
  const rows = M.rowMeta(space.text, doc.id), taskById = tasks(space), result: Unit[] = [], groups = new Map<string, Unit>();
  for (const line of doc.lines) {
    const row = rows.find(entry => entry.id === line.id);
    // The parser owns property scope. Free prose between a task and its time,
    // date or memo does not detach that property. A running "last task" cursor
    // lost this identity and could insert the same line ID twice during merge.
    // References and another document's task must never become local owners.
    const candidate = row?.kind === 'property' && row.taskId && !row.isReference ? taskById.get(row.taskId) : undefined;
    const owner = candidate?.docId === doc.id ? candidate : undefined;
    const match = row?.kind === 'property' && owner ? property.exec(line.text) : null;
    if (match && owner) {
      const field = ({ 날짜: 'date', 시간: 'time', 메모: 'note' } as const)[match[1] as '날짜' | '시간' | '메모'];
      const id = `property:${owner.id}:${field}`, existing = groups.get(id);
      if (existing) existing.lines.push(line);
      else { const unit = { id, lines: [line], value: owner[field] }; groups.set(id, unit); result.push(unit); }
    } else if (taskById.has(line.id)) {
      const task = taskById.get(line.id)!;
      result.push({ id: line.id, lines: [line], value: { title: task.title, done: task.done } });
    } else result.push({ id: line.id, lines: [line], value: line.text });
  }
  return result;
}

/** Reverse projection is intentionally a compare-and-apply PLAN, not a second
 * persistence path. The adapter must apply supported patches to its in-envelope
 * legacy shadow together with text/bindings/snapshot in ONE Program transaction.
 * New private text, subchecks, progress and unsupported structures stay private. */
export function planProgramLegacyShadow(latest: ProgramPrivateSpace, merged: ProgramPrivateSpace, options: { canonicalFolders?: boolean; onlyFlowRef?: string; onlyFlowRefs?: readonly string[]; allowPrivateSubchecks?: boolean; privateSubcheckRefs?: readonly string[]; allowRetainedMapRecords?: boolean } = {}): ProgramLegacyShadowPlan {
  const plan: ProgramLegacyShadowPlan = { expectedSnapshotRaw: latest.legacySnapshot?.raw ?? '', patches: [], issues: [] };
  const beforeTasks = tasks(latest), afterTasks = tasks(merged), mapped = refs(latest);
  const payload = latest.legacySnapshot ? JSON.parse(latest.legacySnapshot.raw) as ProgramLegacySnapshotPayload : null;
  const capabilities = payload ? partitionProgramLegacyCapabilities(payload) : null;
  const keptMapBlocks = new Set(capabilities?.ok && payload ? capabilities.items.filter(item => item.reason === 'map-review-required'
    && payload.model.flows.some(flow => flow.ref === item.flowRef && programLegacyKeepsReviewedMapBlocks(flow, payload))).map(item => item.itemRef) : []);
  const nonordinary = new Set(capabilities?.ok ? capabilities.items.filter(item => item.capability !== 'ordinary' && item.reason !== 'source-item-execution-archived' && !keptMapBlocks.has(item.itemRef)).map(item => item.itemRef) : []);
  // A historical private task may predate the structured recurrence handoff.
  // Only an explicit source review may read it without projecting its fields
  // into source metadata. Ordinary execution and foreign/moved tuples stay shut.
  const retainedMapRefs = new Set<string>();
  if (options.allowRetainedMapRecords && options.onlyFlowRef && payload) {
    const original = payload.model.flows.find(flow => flow.ref === options.onlyFlowRef);
    const owner = payload.sourceLifecycle?.owners[options.onlyFlowRef];
    const originalBinding = latest.savedBindings.find(row => row.flowRef === options.onlyFlowRef);
    const currentBinding = merged.savedBindings.find(row => row.flowRef === options.onlyFlowRef);
    if (original && owner?.structured && originalBinding && currentBinding
      && originalBinding.documentId === currentBinding.documentId) {
      const selected = readProgramSelectedMapRecurrences(owner, original);
      const activeSource = projectProgramLegacySource(owner);
      for (const [ref, id] of Object.entries(originalBinding.itemLines)) {
        const task = afterTasks.get(id), prior = beforeTasks.get(id);
        if ((!prior || programSame(prior, task)) && task?.isCanonical && task.docId === originalBinding.documentId
          && task.scopeId === originalBinding.documentId && currentBinding.itemLines[ref] === id
          && !activeSource?.contexts.get(ref)?.attributes.recurrence
          && (selected.ok && selected.contexts.has(ref) || owner.mapExecution?.items[ref])
          && task.subchecks.every(child => ![...mapped.values()].includes(child.id))) retainedMapRefs.add(ref);
      }
    }
  }
  const metadata = (space: ProgramPrivateSpace, id: string) => {
    const doc = docs(space).find(entry => entry.lines.some(line => line.id === id));
    if (!doc) return null;
    const start = doc.lines.findIndex(line => line.id === id);
    const end = doc.lines[start + 1]?.text.startsWith('원문 속성: ') ? start + 2 : start + 1;
    return { docId: doc.id, lines: doc.lines.slice(start, end) };
  };
  const push = (kind: ProgramLegacyShadowPatch['kind'], ref: string, field: string, expected: unknown, value: unknown) => {
    if (!programSame(expected, value)) plan.patches.push({ kind, ref, field, expected, value });
  };
  for (const [ref, id] of mapped) {
    const before = beforeTasks.get(id), after = afterTasks.get(id);
    if (nonordinary.has(ref)) {
      if (retainedMapRefs.has(ref)) continue;
      if (before || after || !metadata(latest, id) || !programSame(metadata(latest, id), metadata(merged, id))) plan.issues.push({ ref, field: 'series-metadata', code: 'structure-review-required' });
      continue;
    }
    if (!before || !after) { plan.issues.push({ ref, field: 'presence', code: 'structure-review-required' }); continue; }
    if (keptMapBlocks.has(ref)) {
      if (taskFields.some(field => !programSame(before[field], after[field])) || latest.legacyTimelinePolicies[id] !== merged.legacyTimelinePolicies[id])
        plan.issues.push({ ref, field: 'held-map-execution', code: 'structure-review-required' });
      continue;
    }
    for (const field of taskFields) push('item', ref, field, before[field], after[field]);
    push('item', ref, 'timelinePolicy', latest.legacyTimelinePolicies[id], merged.legacyTimelinePolicies[id]);
    if (!options.canonicalFolders && Object.hasOwn(latest.legacyQuickItemLines, ref) && before.folderId !== after.folderId) {
      if (!latest.text.folders.some(folder => folder.id === after.folderId)) plan.issues.push({ ref, field: 'folderId', code: 'unmapped-folder' });
      else push('item', ref, 'folderId', before.folderId, after.folderId);
    }
    // New private subchecks are not represented in the old source writer. They
    // remain canonical and are checked by the text validator/three-way merge.
    const privateChildrenOnly = (options.allowPrivateSubchecks || options.privateSubcheckRefs?.includes(ref)) && !before.subchecks.length && after.subchecks.every(child => ![...mapped.values()].includes(child.id));
    if (before.docId !== after.docId || before.depth !== after.depth || (!privateChildrenOnly && !programSame(before.subchecks, after.subchecks))) {
      plan.issues.push({ ref, field: 'structure', code: 'structure-review-required' });
    }
  }
  for (const binding of latest.savedBindings) {
    const before = M.getDocument(latest.text, binding.documentId), after = M.getDocument(merged.text, binding.documentId);
    if (!before || !after) { plan.issues.push({ ref: binding.flowRef, field: 'presence', code: 'structure-review-required' }); continue; }
    push('flow', binding.flowRef, 'title', before.title, after.title);
    if (!options.canonicalFolders && before.folderId !== after.folderId) {
      if (!latest.text.folders.some(folder => folder.id === after.folderId)) plan.issues.push({ ref: binding.flowRef, field: 'folderId', code: 'unmapped-folder' });
      else push('flow', binding.flowRef, 'folderId', before.folderId, after.folderId);
    }
  }
  for (const folder of options.canonicalFolders ? [] : latest.text.folders) {
    const after = merged.text.folders.find(entry => entry.id === folder.id);
    if (!after) { plan.issues.push({ ref: folder.id, field: 'presence', code: 'structure-review-required' }); continue; }
    if (folder.id === 'folder-unfiled' && (folder.title !== after.title || folder.parentId !== after.parentId)) {
      plan.issues.push({ ref: folder.id, field: 'folder', code: 'unmapped-folder' }); continue;
    }
    push('folder', folder.id, 'title', folder.title, after.title);
    push('folder', folder.id, 'parentId', folder.parentId, after.parentId);
  }
  for (const key of new Set([...Object.keys(latest.timelineOrders), ...Object.keys(merged.timelineOrders)])) {
    const retainedIds = new Set(Object.values(latest.retentionDocuments ?? {}).flatMap(id => M.getDocument(latest.text, id)?.lines.map(line => line.id) ?? []));
    const mappedIds = new Set([...mapped.values(), ...retainedIds]), after = merged.timelineOrders[key];
    // A dormant ordinary target's personal order remains in Program. It cannot
    // be reinterpreted as an order of the new series' source Item or occurrences.
    if (after?.some(id => retainedIds.has(id))) continue;
    if (after?.some(id => !mappedIds.has(id))) plan.issues.push({ ref: key, field: 'order', code: 'structure-review-required' });
    else push('timeline', key, 'order', latest.timelineOrders[key], after);
  }
  if (options.onlyFlowRef || options.onlyFlowRefs) {
    const flowRefs = new Set(options.onlyFlowRefs ?? [options.onlyFlowRef!]);
    const allowed = new Set([...flowRefs, ...latest.savedBindings.filter(row => flowRefs.has(row.flowRef)).flatMap(row => Object.keys(row.itemLines))]);
    plan.patches = plan.patches.filter(patch => allowed.has(patch.ref));
    plan.issues = plan.issues.filter(issue => allowed.has(issue.ref));
  }
  return plan;
}

/** Explicit three-way read reconciliation. A source refresh, deletion, or
 * unresolved schedule never quietly advances the baseline. Failure is atomic. */
export function reconcileProgramLegacy(data: ProgramData, latest: ProgramLegacySnapshotPayload,
  input: { actorId: string; expectedSnapshotRaw?: string; canonicalFolders?: boolean; onlyFlowRef?: string; onlyFlowRefs?: readonly string[]; sourceAction?: ProgramLegacySourceAction; mapAction?: ProgramLegacyMapReviewAction }): ProgramLegacyReconcileResult {
  const conflicts: ProgramLegacyConflict[] = [];
  const fail = (reason: 'invalid' | 'missing' | 'forbidden' | 'conflict' | 'unresolved', issues: (ProgramLegacyIssue | { code: string; ref: string | null })[] = []): ProgramLegacyReconcileResult => ({ ok: false, data, reason, conflicts, issues });
  if (!validateProgramData(data)) return fail('invalid');
  if (!data.actors.some(actor => actor.id === input.actorId)) return fail('forbidden');
  let current = data.spaces[input.actorId]; const snapshot = current.legacySnapshot;
  if (!snapshot) return fail('missing');
  if (input.expectedSnapshotRaw !== undefined && input.expectedSnapshotRaw !== snapshot.raw) return fail('conflict', [{ code: 'stale-snapshot', ref: null }]);
  try {
    const baseline = inspectProgramLegacySnapshotPayload(JSON.parse(snapshot.raw)), incoming = inspectProgramLegacySnapshotPayload(latest);
    if (!baseline.ok || !incoming.ok) return fail('invalid', !baseline.ok ? baseline.issues : !incoming.ok ? incoming.issues : []);
    if (latest.state.workspaceId !== snapshot.workspaceId || latest.state.revision < snapshot.revision) return fail('conflict', [{ code: 'stale-workspace', ref: null }]);
    const sourceConflict = (ref: string, before: unknown, after: unknown) => conflicts.push({ code: 'source-review-required', ref, field: 'source', base: before, program: before, legacy: after });
    for (const flow of baseline.payload.model.flows) {
      const after = latest.model.flows.find(entry => entry.ref === flow.ref);
      if (after && !programSame(flow, after)) sourceConflict(flow.ref, flow, after);
    }
    for (const flow of baseline.payload.state.authoredFlows ?? []) {
      const after = latest.state.authoredFlows?.find(entry => entry.ref === flow.ref);
      if (after && !programSame(flow, after)) sourceConflict(flow.ref, flow, after);
    }
    if (!programSame(baseline.payload.sourceCandidateStore?.effectiveVersions ?? {}, latest.sourceCandidateStore?.effectiveVersions ?? {})) {
      sourceConflict('source-candidates', baseline.payload.sourceCandidateStore?.effectiveVersions ?? {}, latest.sourceCandidateStore?.effectiveVersions ?? {});
    }
    // Membership has its own source-only Program transaction. Ordinary source,
    // plan and hydration paths must preserve its explicit acceptance receipts.
    if (!programSame(baseline.payload.mapMembership, latest.mapMembership)) {
      sourceConflict('program-map-membership', baseline.payload.mapMembership, latest.mapMembership);
    }
    if (!programSame(baseline.payload.sourceLifecycle, latest.sourceLifecycle)) {
      // An explicit, reproducible source-owner action is the sole permission to
      // change effective source. A caller boolean cannot bypass this check.
      const authorized = input.sourceAction && transitionProgramLegacySourcePayload(baseline.payload, input.sourceAction);
      if (!authorized || !authorized.ok || !programSame(authorized.payload.sourceLifecycle, latest.sourceLifecycle)) sourceConflict('program-source-lifecycle', baseline.payload.sourceLifecycle, latest.sourceLifecycle);
    }
    if (!programSame(baseline.payload.mapReview, latest.mapReview)) {
      const authorized = input.mapAction && transitionProgramLegacyMapReview(baseline.mapSourceFlows, baseline.payload.mapReview, input.mapAction, baseline.payload.sourceLifecycle);
      if (!authorized || !authorized.ok || !programSame(authorized.store, latest.mapReview)) sourceConflict('program-map-review', baseline.payload.mapReview, latest.mapReview);
    }
    if (conflicts.length) return fail('conflict');
    const project = (payload: ProgramLegacySnapshotPayload) => {
      const isolated = programClone(data); isolated.spaces[input.actorId] = createProgramPrivateSpace();
      const result = hydrateProgramLegacy(isolated, payload.model, payload.state, { actorId: input.actorId, sourceCandidateStore: payload.sourceCandidateStore, sourceLifecycle: payload.sourceLifecycle, mapReview: payload.mapReview, planSelections: payload.planSelections, mapMembership: payload.mapMembership, preserveUnsupported: true });
      const quick = result.ok ? alignProgramLegacyQuickLocations(result.data.spaces[input.actorId], current) : null;
      return quick ? alignProgramLegacySourceRetention(quick, current) : null;
    };
    let base = project(baseline.payload), remote = project(latest);
    if (!base || !remote) return fail('unresolved', [{ code: 'projection-failed', ref: null }]);
    const kindMerge = prepareProgramLegacySourceKindMerge(base, remote, current, input.sourceAction);
    if (!kindMerge.ok) return fail('unresolved', [{ code: kindMerge.reason, ref: input.sourceAction?.flowRef ?? null }]);
    base = kindMerge.base; remote = kindMerge.remote; current = kindMerge.current;
    if (input.onlyFlowRef || input.onlyFlowRefs) {
      const flowRefs = new Set(input.onlyFlowRefs ?? [input.onlyFlowRef!]);
      const bindings = base.savedBindings.filter(row => flowRefs.has(row.flowRef));
      if (bindings.length !== flowRefs.size) return fail('missing');
      const docIds = new Set(bindings.map(row => row.documentId));
      const ids = new Set([...bindings, ...remote.savedBindings.filter(row => flowRefs.has(row.flowRef))].flatMap(row => Object.values(row.itemLines)));
      for (const docId of [...docIds]) {
        for (const line of M.getDocument(current.text, docId)?.lines ?? []) ids.add(line.id);
        const retainedId = current.retentionDocuments?.[docId]; if (!retainedId) continue;
        docIds.add(retainedId);
        for (const line of M.getDocument(current.text, retainedId)?.lines ?? []) ids.add(line.id);
      }
      for (const projected of [base, remote]) {
        projected.text.flows = projected.text.flows.filter(doc => docIds.has(doc.id));
        projected.text.documents = projected.text.documents.filter(doc => docIds.has(doc.id));
        projected.savedBindings = projected.savedBindings.filter(row => flowRefs.has(row.flowRef));
        projected.legacyQuickItemLines = {};
        for (const key of ['taskScopes', 'itemScopes'] as const) projected.text[key] = Object.fromEntries(Object.entries(projected.text[key]).filter(([id]) => ids.has(id)));
        projected.legacyTimelinePolicies = Object.fromEntries(Object.entries(projected.legacyTimelinePolicies).filter(([id]) => ids.has(id)));
        projected.timelineOrders = {};
      }
    }
    const conflict = (ref: string, field: string, before: unknown, local: unknown, incoming: unknown, code: ProgramLegacyConflict['code'] = 'field-conflict') => {
      conflicts.push({ ref, field, base: before, program: local, legacy: incoming, code });
    };
    function value<T>(ref: string, field: string, before: T, local: T, incoming: T): T {
      if (programSame(before, incoming) || programSame(local, incoming)) return local;
      if (programSame(before, local)) return incoming;
      conflict(ref, field, before, local, incoming); return local;
    }
    // Compare complete semantic fields before individual source rows. Two memo
    // edits on different lines still compete for the SAME memo field.
    const baseTasks = tasks(base), remoteTasks = tasks(remote), localTasks = tasks(current);
    const expectedTasks = new Map<string, Pick<TextTask, typeof taskFields[number]>>();
    for (const [id, before] of baseTasks) {
      const local = localTasks.get(id), incomingTask = remoteTasks.get(id);
      if (!local || !incomingTask) { conflict(id, 'presence', before, local, incomingTask, 'deletion-review-required'); continue; }
      const expected = { title: before.title, done: before.done, date: before.date, time: before.time, note: before.note };
      for (const field of taskFields) Object.assign(expected, { [field]: value(id, field, before[field], local[field], incomingTask[field]) });
      expectedTasks.set(id, expected);
      const progress = M.latestProgress(current.text, id);
      if (progress && expected.done !== (progress.percent === 100)) conflict(id, 'done-vs-progress', before.done, progress, incomingTask.done);
      if (local.docId !== before.docId || incomingTask.docId !== before.docId || local.depth !== before.depth || incomingTask.depth !== before.depth) {
        conflict(id, 'location', { docId: before.docId, depth: before.depth }, { docId: local.docId, depth: local.depth }, { docId: incomingTask.docId, depth: incomingTask.depth }, 'structure-review-required');
      }
    }
    function record<T>(name: string, before: Record<string, T>, local: Record<string, T>, incomingRecord: Record<string, T>): Record<string, T> {
      const result = { ...local };
      for (const key of new Set([...Object.keys(before), ...Object.keys(incomingRecord)])) {
        const selected = value(key, name, before[key], local[key], incomingRecord[key]);
        if (selected === undefined) delete result[key]; else result[key] = selected;
      }
      return result;
    }
    function ordered<T extends { id: string }>(ref: string, before: T[], local: T[], incomingRows: T[], merge: (id: string, b: T, l: T, r: T) => T, same: (a: T, b: T) => boolean = programSame): T[] {
      const b = new Map(before.map(row => [row.id, row])), l = new Map(local.map(row => [row.id, row])), r = new Map(incomingRows.map(row => [row.id, row]));
      const common = before.map(row => row.id).filter(id => l.has(id) && r.has(id));
      const order = value(ref, 'order', common, local.map(row => row.id).filter(id => common.includes(id)), incomingRows.map(row => row.id).filter(id => common.includes(id)));
      const result = [...local];
      // Reordering around private additions can change their parent/date context;
      // leave that policy open instead of moving an unowned block implicitly.
      if (!programSame(order, local.map(row => row.id).filter(id => common.includes(id)))) {
        if (local.some(row => !b.has(row.id))) conflict(ref, 'order-with-private-additions', common, local.map(row => row.id), order, 'structure-review-required');
        else result.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
      }
      for (const row of incomingRows) if (!l.has(row.id) && !b.has(row.id)) {
        const index = incomingRows.indexOf(row), anchor = incomingRows.slice(index + 1).find(next => result.some(saved => saved.id === next.id));
        const at = anchor ? result.findIndex(saved => saved.id === anchor.id) : result.length;
        result.splice(at, 0, row);
      }
      for (const row of before) {
        if (!r.has(row.id) || !l.has(row.id)) {
          if (!r.has(row.id) && !l.has(row.id)) continue;
          // Property removals are ordinary edits; task/doc deletions are reviewed
          // by the semantic preflight / collection checks below.
          const selected = value(row.id, 'presence', row, l.get(row.id), r.get(row.id));
          const at = result.findIndex(entry => entry.id === row.id);
          if (selected === undefined && at >= 0) result.splice(at, 1);
        }
      }
      return result.map(row => {
        const old = b.get(row.id), actual = l.get(row.id), wanted = r.get(row.id);
        if (old && actual && wanted) return merge(row.id, old, actual, wanted);
        if (!old && actual && wanted && !same(actual, wanted)) conflict(row.id, 'identity-collision', undefined, actual, wanted);
        return row;
      });
    }
    function mergeDocument(id: string, before: TextDocument, local: TextDocument, incomingDoc: TextDocument): TextDocument {
      const merged = { ...local, title: value(id, 'title', before.title, local.title, incomingDoc.title),
        folderId: value(id, 'folderId', before.folderId, local.folderId, incomingDoc.folderId) };
      const beforeUnits = units(before, base!), localUnits = units(local, current), incomingUnits = units(incomingDoc, remote!);
      // An absent property is still a semantic value (undated/empty), not a
      // newly allocated entity. This matters after rebasing an explicit 미정
      // line against a legacy shadow that represents undated by omission.
      for (const task of baseTasks.values()) if (task.docId === id && localTasks.has(task.id) && remoteTasks.has(task.id)) {
        for (const field of ['date', 'time', 'note'] as const) {
          const key = `property:${task.id}:${field}`;
          if (![beforeUnits, localUnits, incomingUnits].some(rows => rows.some(unit => unit.id === key))) continue;
          for (const [rows, semantic] of [[beforeUnits, task], [localUnits, localTasks.get(task.id)!], [incomingUnits, remoteTasks.get(task.id)!]] as const) {
            if (rows.some(unit => unit.id === key)) continue;
            const reference = [incomingUnits, localUnits, beforeUnits].find(entries => entries.some(unit => unit.id === key))!;
            const at = reference.findIndex(unit => unit.id === key), following = reference.slice(at + 1).find(unit => rows.some(existing => existing.id === unit.id));
            const insertAt = following ? rows.findIndex(unit => unit.id === following.id) : rows.findIndex(unit => unit.id === task.id) + 1;
            rows.splice(insertAt, 0, { id: key, value: semantic[field], lines: [] });
          }
        }
      }
      merged.lines = ordered(id, beforeUnits, localUnits, incomingUnits, (key, b, l, r) => {
        if (baseTasks.has(key) && localTasks.has(key) && remoteTasks.has(key)) {
          const expected = expectedTasks.get(key)!;
          if (!expected) return l;
          const text = l.lines[0].text.replace(/^(\s*- \[)[ xX](\]\s+).*$/u, `$1${expected.done ? 'x' : ' '}$2${expected.title.replace(/\$/g, '$$$$')}`);
          return { ...l, value: { title: expected.title, done: expected.done }, lines: [{ ...l.lines[0], text }] };
        }
        const selected = value(key, 'text', b.value, l.value, r.value);
        return programSame(selected, l.value) ? l : r;
      }, (a, b) => programSame(a.value, b.value)).flatMap(unit => unit.lines);
      return merged;
    }
    const next = programClone(data), target = next.spaces[input.actorId];
    if (kindMerge.current !== data.spaces[input.actorId]) {
      target.retentionDocuments = programClone(current.retentionDocuments);
      target.archivedDocumentIds = programClone(current.archivedDocumentIds);
    }
    for (const kind of ['documents', 'flows'] as const) {
      for (const doc of base.text[kind]) if (!remote.text[kind].some(row => row.id === doc.id) || !current.text[kind].some(row => row.id === doc.id)) {
        conflict(doc.id, 'document-presence', doc, M.getDocument(current.text, doc.id), M.getDocument(remote.text, doc.id), 'deletion-review-required');
      }
      const merged = ordered(kind, base.text[kind], current.text[kind], remote.text[kind], mergeDocument);
      if (kind === 'documents') target.text.documents = programClone(merged);
      else target.text.flows = programClone(merged).map(doc => ({ ...doc, private: true,
        sourceVersion: remote.text.flows.find(row => row.id === doc.id)?.sourceVersion
          ?? current.text.flows.find(row => row.id === doc.id)!.sourceVersion }));
    }
    if (!input.canonicalFolders) target.text.folders = ordered('folders', base.text.folders, current.text.folders, remote.text.folders, (id, b, l, r) => ({ ...l,
      title: value(id, 'title', b.title, l.title, r.title), parentId: value(id, 'parentId', b.parentId, l.parentId, r.parentId) }));
    for (const doc of docs(target)) doc.folder = target.text.folders.find(folder => folder.id === doc.folderId)?.title ?? doc.folder;
    target.text.taskScopes = record('taskScope', base.text.taskScopes, current.text.taskScopes, remote.text.taskScopes);
    target.text.itemScopes = record('itemScope', base.text.itemScopes, current.text.itemScopes, remote.text.itemScopes);
    target.legacyTimelinePolicies = record('timelinePolicy', base.legacyTimelinePolicies, current.legacyTimelinePolicies, remote.legacyTimelinePolicies);
    target.timelineOrders = record('timelineOrder', base.timelineOrders, current.timelineOrders, remote.timelineOrders);
    target.legacyQuickItemLines = record('quickBinding', base.legacyQuickItemLines, current.legacyQuickItemLines, remote.legacyQuickItemLines);
    target.savedBindings = ordered('savedBindings', base.savedBindings.map(row => ({ ...row, id: row.documentId })), current.savedBindings.map(row => ({ ...row, id: row.documentId })), remote.savedBindings.map(row => ({ ...row, id: row.documentId })), (id, b, l, r) => ({ ...l,
      sourceRevision: r.sourceRevision, itemLines: record(`itemLines:${id}`, b.itemLines, l.itemLines, r.itemLines) })).map(({ id: _id, ...binding }) => binding);
    target.legacySnapshot = remote.legacySnapshot;
    if (conflicts.length) return fail('conflict');
    if (!validateProgramData(next)) return fail('unresolved', [{ code: 'unrepresentable-merge', ref: null }]);
    const actualTasks = tasks(target);
    for (const [id, expected] of expectedTasks) {
      const actual = actualTasks.get(id);
      if (!actual || taskFields.some(field => !programSame(expected[field], actual[field]))) return fail('unresolved', [{ code: 'unrepresentable-merge', ref: id }]);
    }
    // New personal rows are not ours to reinterpret when a remote date/property
    // or order changes the surrounding grammar. Likewise verify new legacy rows.
    for (const [id, before] of [...localTasks, ...remoteTasks]) if (!baseTasks.has(id)) {
      const actual = actualTasks.get(id);
      if (!actual || taskFields.some(field => !programSame(before[field], actual[field]))
        || before.docId !== actual.docId || before.depth !== actual.depth || before.parentTaskId !== actual.parentTaskId) {
        return fail('unresolved', [{ code: 'new-row-context-changed', ref: id }]);
      }
    }
    const changed = !programSame(data, next);
    const sourceOwner = latest.sourceLifecycle?.owners[input.sourceAction?.flowRef ?? ''];
    const reviewId = input.sourceAction?.type === 'stage' ? input.sourceAction.requestId : input.sourceAction && 'reviewId' in input.sourceAction ? input.sourceAction.reviewId : sourceOwner?.undo?.reviewId;
    const kindReview = sourceOwner?.reviews.find(review => review.id === reviewId);
    const privateSubcheckRefs = input.sourceAction && kindReview ? Object.keys(sourceOwner!.effective.itemRevisions).filter(ref => {
      const a = projectProgramLegacySource(sourceOwner!, JSON.parse(kindReview.expectedSelection))?.contexts.get(ref);
      const incomingSelection = { flowRevisionId: kindReview.incomingRevisionId, itemRevisions: Object.fromEntries(programLegacyRevisionRefs(sourceOwner!, kindReview.incomingRevisionId).map(ref => [ref, kindReview.incomingRevisionId])), retainedItemRefs: [] };
      const b = projectProgramLegacySource(sourceOwner!, incomingSelection)?.contexts.get(ref);
      return !!a && !!b && !!a.attributes.recurrence !== !!b.attributes.recurrence;
    }) : [];
    return { ok: true, data: changed ? next : data, changed, shadowPlan: planProgramLegacyShadow(remote, target, {
      ...input, privateSubcheckRefs, allowRetainedMapRecords: !!input.sourceAction,
    }) };
  } catch { return fail('invalid'); }
}
