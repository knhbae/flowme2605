import { programClone, programFailure, programId, programResult, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { createProgramPrivateSpace, programDate, validateProgramData } from './program-data';
import { hydrateProgramLegacy, inspectProgramLegacy } from './legacy-projection';
import { alignProgramLegacyQuickLocations, planProgramLegacyShadow, reconcileProgramLegacy, type ProgramLegacyConflict } from './legacy-reconcile';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { partitionProgramLegacyCapabilities } from './legacy-capabilities';
import { programLegacyPlanItemIncluded } from './program-legacy-plan-contract';
import { programLegacyMapMembershipChildRetained } from './legacy-map-membership-state';
import { transitionProgramLegacySourcePayload, type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { alignProgramLegacySourceRetention } from './legacy-source-execution';
import { transitionProgramLegacyMapReview, type ProgramLegacyMapReviewAction } from './legacy-map-review';
import { textWorkspaceModel as M } from './text-workspace';
import { programLegacyFolders, programFolderIdFromLegacy, setProgramLegacyFlowFolder, type ProgramLegacyFolders } from './legacy-folder-bridge';
import { applyPersonalWorkspacePocTransition } from '../personal-workspace-poc-state';
import { toPersonalWorkspacePocQuickItemRef, type PersonalWorkspacePocPersonalPlanOverlay, type PersonalWorkspacePocTransition } from '../personal-workspace-poc-contract';

export type ProgramLegacyPortIssue = { code: string; ref: string | null; field?: string };
export type ProgramLegacyView = {
  ok: true; token: string; payload: ProgramLegacySnapshotPayload; stateRaw: string;
  /** A projected view is not a durable write, even when it includes newer personal edits. */
  rebased: boolean;
  canonicalFolders: ProgramLegacyFolders;
  onlyFlowRef?: string;
};
export type ProgramLegacyViewResult = ProgramLegacyView | {
  ok: false; reason: 'invalid' | 'missing' | 'forbidden' | 'conflict' | 'unresolved'; issues: ProgramLegacyPortIssue[];
};
export type ProgramLegacyTransactionResult = {
  transition: ProgramTransition<string>; issues: ProgramLegacyPortIssue[]; conflicts: ProgramLegacyConflict[];
};
const stamp = (value: string) => /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/u.test(value) && Number.isFinite(Date.parse(value));
export const PROGRAM_LEGACY_TRANSACTION_ACTIONS: readonly PersonalWorkspacePocTransition['type'][] = Object.freeze([
  'create-folder', 'create-quick-item', 'update-quick-item', 'move-folder', 'move-date', 'restore-execution-date',
  'set-timeline-policy', 'reorder', 'reset-order', 'complete', 'apply-personal-plan', 'cancel',
]);
const supported = new Set(PROGRAM_LEGACY_TRANSACTION_ACTIONS);

function projection(data: ProgramData, actorId: string, payload: ProgramLegacySnapshotPayload): ProgramPrivateSpace | null {
  const isolated = programClone(data); isolated.spaces[actorId] = createProgramPrivateSpace();
  const result = hydrateProgramLegacy(isolated, payload.model, payload.state, { actorId, sourceCandidateStore: payload.sourceCandidateStore, sourceLifecycle: payload.sourceLifecycle, mapReview: payload.mapReview, planSelections: payload.planSelections, mapMembership: payload.mapMembership, preserveUnsupported: true });
  const quick = result.ok ? alignProgramLegacyQuickLocations(result.data.spaces[actorId], data.spaces[actorId]) : null;
  return quick ? alignProgramLegacySourceRetention(quick, data.spaces[actorId]) : null;
}
function failure(reason: 'invalid' | 'missing' | 'forbidden' | 'conflict' | 'unresolved', code: string, ref: string | null = null): ProgramLegacyViewResult {
  return { ok: false, reason, issues: [{ code, ref }] };
}

/** Program -> legacy read view. Only personal shadows are changed; the original
 * model, authored source and source-candidate store remain byte-equivalent.
 * There is no localStorage port or second writer hidden in this function. */
export function prepareProgramLegacyView(data: ProgramData, input: { actorId: string; now: string; onlyFlowRef?: string; onlyFlowRefs?: readonly string[]; sourceReview?: boolean }): ProgramLegacyViewResult {
  if (!validateProgramData(data) || !stamp(input.now)) return failure('invalid', 'invalid-input');
  if (data.activeActorId !== input.actorId || !data.spaces[input.actorId]) return failure('forbidden', 'actor-mismatch');
  const space = data.spaces[input.actorId], snapshot = space.legacySnapshot;
  if (!snapshot) return failure('missing', 'missing-legacy-snapshot');
  try {
    const inspected = inspectProgramLegacySnapshotPayload(JSON.parse(snapshot.raw));
    if (!inspected.ok) return { ok: false, reason: 'invalid', issues: inspected.issues };
    const guard = partitionProgramLegacyCapabilities(inspected.payload);
    if (!guard.ok) return { ok: false, reason: 'unresolved', issues: guard.issues };
    const base = projection(data, input.actorId, inspected.payload);
    if (!base) return failure('unresolved', 'projection-failed');
    const scopedRefs = input.onlyFlowRefs ? new Set(input.onlyFlowRefs) : input.onlyFlowRef ? new Set([input.onlyFlowRef]) : null;
    if (scopedRefs && (!scopedRefs.size || [...scopedRefs].some(ref => !base.savedBindings.some(binding => binding.flowRef === ref)))) return failure('missing', 'missing-flow', input.onlyFlowRef ?? null);
    const options = { canonicalFolders: true, onlyFlowRef: input.onlyFlowRef, onlyFlowRefs: input.onlyFlowRefs,
      allowPrivateSubchecks: input.sourceReview === true && !!input.onlyFlowRef,
      allowRetainedMapRecords: input.sourceReview === true && !!input.onlyFlowRef };
    const retentionIds = new Set(Object.values(space.retentionDocuments ?? {}));
    const importedDocuments = new Set([...base.savedBindings.filter(binding => !scopedRefs || scopedRefs.has(binding.flowRef)).map(binding => binding.documentId), ...(!scopedRefs ? base.text.documents.filter(doc => !retentionIds.has(doc.id)).map(doc => doc.id) : [])]);
    if (space.archivedDocumentIds.some(id => importedDocuments.has(id))) return failure('unresolved', 'archived-document-review-required');
    const plan = planProgramLegacyShadow(base, space, options);
    if (plan.issues.length) return { ok: false, reason: 'unresolved', issues: plan.issues };
    const payload = programClone(inspected.payload), state = payload.state;
    const flowByRef = new Map(inspected.model.flows.map(flow => [flow.ref, flow]));
    const flowForItem = new Map(inspected.model.flows.flatMap(flow => flow.items.map(item => [item.ref, flow] as const)));
    const quickByRef = new Map(state.quickItems.map(item => [toPersonalWorkspacePocQuickItemRef(item.quickItemId), item]));
    const overlay = (flowRef: string): PersonalWorkspacePocPersonalPlanOverlay => {
      const flow = flowByRef.get(flowRef); if (!flow) throw new Error('missing-flow');
      state.personalPlanOverlays ??= {};
      return state.personalPlanOverlays[flowRef] ?? { flowRef, savedCopyId: flow.savedCopyId, flowId: flow.flowId, items: {} };
    };
    const refByLine = new Map([...base.savedBindings.flatMap(binding => Object.entries(binding.itemLines)), ...Object.entries(base.legacyQuickItemLines)].map(([ref, id]) => [id, ref]));
    for (const patch of plan.patches) {
      if (patch.kind === 'item') {
        const quick = quickByRef.get(patch.ref), flow = flowForItem.get(patch.ref);
        if (!quick && !flow) return failure('unresolved', 'missing-item', patch.ref);
        if (patch.field === 'title' || patch.field === 'note') {
          if (quick) { if (patch.field === 'title') quick.title = patch.value as string; else quick.memo = patch.value as string; }
          else {
            const before = overlay(flow!.ref), item = before.items[patch.ref] ?? { itemRef: patch.ref };
            state.personalPlanOverlays![flow!.ref] = { ...before, items: { ...before.items,
              [patch.ref]: { ...item, [patch.field === 'note' ? 'memo' : 'title']: patch.value } } };
          }
        } else if (patch.field === 'done') {
          const completion = patch.value ? { status: 'completed' as const, completedAt: input.now } : { status: 'open' as const };
          if (quick) { quick.status = completion.status; if (completion.completedAt) quick.completedAt = completion.completedAt; else delete quick.completedAt; }
          else state.completions[patch.ref] = completion;
        } else if (['date', 'time', 'timelinePolicy'].includes(patch.field)) {
          const placement = state.placements[patch.ref] ?? { itemRef: patch.ref, scheduleMode: quick ? 'unscheduled' as const : 'inherit' as const, timelinePolicy: 'auto' as const };
          if (patch.field === 'date') {
            placement.scheduleMode = patch.value === null ? 'unscheduled' : 'fixed_date';
            if (patch.value === null) delete placement.date; else placement.date = patch.value as string;
          } else if (patch.field === 'time') {
            if (patch.value === null) delete placement.time; else placement.time = patch.value as string;
          } else placement.timelinePolicy = patch.value as 'auto' | 'included' | 'excluded';
          state.placements[patch.ref] = placement;
        } else return failure('unresolved', `unsupported-item-${patch.field}`, patch.ref);
      } else if (patch.kind === 'flow') {
        if (patch.field === 'title') { const before = overlay(patch.ref); state.personalPlanOverlays![patch.ref] = { ...before, title: patch.value as string }; }
        else return failure('unresolved', `unsupported-flow-${patch.field}`, patch.ref);
      } else if (patch.kind === 'folder') {
        return failure('unresolved', 'canonical-folder-port-required', patch.ref);
      } else {
        const context = patch.ref === 'undated' ? 'undated' as const : 'date' as const;
        const existing = state.timelineOrders.find(order => order.context === context && order.contextKey === patch.ref);
        state.timelineOrders = state.timelineOrders.filter(order => order !== existing);
        if (patch.value !== undefined) {
          const orderedRefKeys = (patch.value as string[]).map(id => { const ref = refByLine.get(id); if (!ref) throw new Error('unmapped-order'); return ref; });
          state.timelineOrders.push({ context, contextKey: patch.ref, orderedRefKeys, revision: state.revision + 1 });
        }
      }
    }
    // Source-row order is an explicit personal overlay, independent of calendar
    // order. Private added rows are not materialized into the old source schema.
    for (const binding of base.savedBindings) {
      if (scopedRefs && !scopedRefs.has(binding.flowRef)) continue;
      const before = M.getDocument(base.text, binding.documentId)!, after = M.getDocument(space.text, binding.documentId);
      if (!after) return failure('unresolved', 'missing-document', binding.flowRef);
      const itemByLine = new Map(Object.entries(binding.itemLines).map(([ref, id]) => [id, ref]));
      const order = (doc: typeof before) => doc.lines.flatMap(line => itemByLine.has(line.id) ? [itemByLine.get(line.id)!] : []);
      if (!programSame(order(before), order(after))) { const prior = overlay(binding.flowRef); state.personalPlanOverlays![binding.flowRef] = { ...prior, orderedItemRefs: order(after) }; }
    }
    const rebased = !programSame(payload, inspected.payload);
    if (rebased) { state.revision++; state.updatedAt = input.now; delete state.undo; }
    const checked = inspectProgramLegacySnapshotPayload(payload);
    if (!checked.ok) return { ok: false, reason: 'unresolved', issues: checked.issues };
    const projected = projection(data, input.actorId, payload);
    if (!projected) return failure('unresolved', 'reverse-projection-failed');
    const remaining = planProgramLegacyShadow(projected, space, options);
    if (remaining.issues.length || remaining.patches.length) return { ok: false, reason: 'unresolved', issues: [
      ...remaining.issues, ...remaining.patches.map(patch => ({ code: 'unrepresentable-shadow-field', ref: patch.ref, field: patch.field })),
    ] };
    return { ok: true, token: JSON.stringify(space), payload, stateRaw: JSON.stringify(state), rebased,
      canonicalFolders: programLegacyFolders(space), ...(input.onlyFlowRef ? { onlyFlowRef: input.onlyFlowRef } : {}) };
  } catch { return failure('unresolved', 'unrepresentable-shadow'); }
}

/** ONE mutation builder: incorporate Program personal changes into the shadow,
 * run the existing pure legacy action, then reconcile that result back into the
 * same Program space. The caller persists this transition once via controller.
 * Legacy undo/companion writes must use Program history, not a second store. */
export function applyProgramLegacyAction(data: ProgramData, input: {
  actorId: string; expectedToken: string; action: PersonalWorkspacePocTransition; now: string; executionDate?: string;
}): ProgramLegacyTransactionResult {
  const bad = (reason: 'invalid' | 'missing' | 'forbidden' | 'conflict' | 'unresolved', issues: ProgramLegacyPortIssue[]): ProgramLegacyTransactionResult => ({ transition: programFailure(data, reason), issues, conflicts: [] });
  if (!validateProgramData(data) || !stamp(input.now)) return bad('invalid', [{ code: 'invalid-input', ref: null }]);
  if (!supported.has(input.action.type)) return bad('unresolved', [{ code: input.action.type === 'undo' ? 'use-program-undo' : 'unsupported-action', ref: input.action.type }]);
  if (input.action.type === 'complete' && !programDate(input.executionDate)) return bad('invalid', [{ code: 'execution-date-required', ref: input.action.itemRef }]);
  // Folder filing belongs to canonical Program, including old-ID callers.
  if (input.action.type === 'move-folder' && input.action.member === 'saved_flow') {
    if (!validateProgramData(data) || !data.spaces[input.actorId]) return bad('invalid', [{ code: 'invalid-input', ref: null }]);
    const folderId = programFolderIdFromLegacy(data.spaces[input.actorId], input.action.folderId);
    if (!folderId) return bad('missing', [{ code: 'unmapped-folder', ref: input.action.folderId ?? null }]);
    return { transition: setProgramLegacyFlowFolder(data, { actorId: input.actorId, expectedToken: input.expectedToken,
      flowRef: input.action.memberRef, folderId, requestId: programId('legacy-folder') }), issues: [], conflicts: [] };
  }
  const itemRef = 'itemRef' in input.action ? input.action.itemRef : undefined;
  const actionFlowRef = 'flowRef' in input.action ? input.action.flowRef
    : itemRef ? data.spaces[input.actorId]?.savedBindings.find(binding => Object.hasOwn(binding.itemLines, itemRef))?.flowRef : undefined;
  const view = prepareProgramLegacyView(data, { ...input, onlyFlowRef: actionFlowRef });
  if (!view.ok) return bad(view.reason, view.issues);
  if (view.token !== input.expectedToken) return bad('conflict', [{ code: 'stale-program-view', ref: null }]);
  if (input.action.type === 'cancel') return { transition: programResult(data, data, 'legacy-cancel'), issues: [], conflicts: [] };
  const capabilities = partitionProgramLegacyCapabilities(view.payload);
  if (!capabilities.ok) return bad('unresolved', capabilities.issues);
  const protectedRefs = new Set(capabilities.items.filter(item => item.capability !== 'ordinary'
    || programLegacyMapMembershipChildRetained(view.payload.mapMembership,item.flowRef)
    || !programLegacyPlanItemIncluded(view.payload.planSelections?.flows[item.flowRef],item.itemRef)).map(item => item.itemRef));
  const candidate = input.action;
  if (candidate.type === 'apply-personal-plan' && candidate.overlay.orderedItemRefs) {
    const checked = inspectProgramLegacySnapshotPayload(view.payload);
    const beforeOrder = checked.ok ? checked.model.flows.find(flow => flow.ref === candidate.flowRef)?.items.map(item => item.ref) ?? [] : [];
    if (beforeOrder.some((ref, index) => protectedRefs.has(ref) && candidate.overlay.orderedItemRefs![index] !== ref)) return bad('unresolved', [{ code: 'nonordinary-item-owner-required', ref: candidate.flowRef }]);
  }
  if (('itemRef' in candidate && protectedRefs.has(candidate.itemRef))
    || (candidate.type === 'apply-personal-plan' && Object.keys(candidate.overlay.items).some(ref => protectedRefs.has(ref)
      && !programSame(candidate.overlay.items[ref], view.payload.state.personalPlanOverlays?.[candidate.flowRef]?.items[ref])))) return bad('unresolved', [{ code: 'nonordinary-item-owner-required', ref: 'itemRef' in candidate ? candidate.itemRef : null }]);
  // Never trust a stale caller timestamp for a state transition or completion.
  const action = { ...input.action, now: input.now };
  const result = applyPersonalWorkspacePocTransition(view.payload.state, action);
  if (result.error) return bad(result.error.includes('stale') ? 'conflict' : 'invalid', [{ code: result.error, ref: null }]);
  if (result.storageCompanion) return bad('unresolved', [{ code: 'unsupported-storage-companion', ref: null }]);
  if (!result.changed && !view.rebased) return { transition: programResult(data, data, 'legacy-noop'), issues: [], conflicts: [] };
  const rebased = programClone(data), space = rebased.spaces[input.actorId];
  // Rebase BEFORE merging the legacy edit: the visible view already included
  // the current personal values, so a deliberate subsequent edit is not a race.
  space.legacySnapshot = { workspaceId: view.payload.state.workspaceId, revision: view.payload.state.revision, raw: JSON.stringify(view.payload) };
  if (action.type === 'complete' && result.changed) {
    const lineId = space.savedBindings.flatMap(binding => Object.entries(binding.itemLines)).find(([ref]) => ref === action.itemRef)?.[1]
      ?? space.legacyQuickItemLines[action.itemRef];
    if (!lineId) return bad('unresolved', [{ code: 'missing-item-binding', ref: action.itemRef }]);
    // Same semantics as completeProgramTask: a dated 100/0 record, retaining
    // earlier dates. The UI supplies the chosen local execution day explicitly.
    space.text = M.recordProgress(space.text, lineId, input.executionDate!, action.completed ? 100 : 0);
  }
  const payload = { ...view.payload, state: programClone(result.state) };
  delete payload.state.undo; // one durable Program history owner
  const merged = reconcileProgramLegacy(rebased, payload, { actorId: input.actorId, expectedSnapshotRaw: space.legacySnapshot.raw,
    canonicalFolders: action.type !== 'create-folder', onlyFlowRef: actionFlowRef });
  if (!merged.ok) return { transition: programFailure(data, merged.reason), issues: merged.issues, conflicts: merged.conflicts };
  if (merged.shadowPlan.issues.length || merged.shadowPlan.patches.length) return bad('unresolved', [{ code: 'incomplete-roundtrip', ref: null }]);
  return { transition: programResult(data, programSame(data, merged.data) ? data : merged.data, `legacy:${input.action.type}`), issues: [], conflicts: [] };
}

/** Stage/choice/apply/undo share the exact Program transaction and source CAS.
 * Original model, authored source and old source-candidate store are unchanged. */
export function applyProgramLegacySourceAction(data: ProgramData, input: { actorId: string; expectedToken: string; action: ProgramLegacySourceAction }): ProgramLegacyTransactionResult {
  const bad = (reason: 'invalid' | 'missing' | 'forbidden' | 'conflict' | 'unresolved', code: string): ProgramLegacyTransactionResult => ({ transition: programFailure(data, reason), issues: [{ code, ref: input.action.flowRef }], conflicts: [] });
  const view = prepareProgramLegacyView(data, { actorId: input.actorId, now: input.action.now, onlyFlowRef: input.action.flowRef, sourceReview: true });
  if (!view.ok) return { transition: programFailure(data, view.reason), issues: view.issues, conflicts: [] };
  if (view.token !== input.expectedToken) return bad('conflict', 'stale-program-view');
  const source = transitionProgramLegacySourcePayload(view.payload, input.action);
  if (!source.ok) return bad(source.reason.includes('conflict') ? 'conflict' : 'unresolved', source.reason);
  if (!source.changed && !view.rebased) return { transition: programResult(data, data, source.reviewId), issues: [], conflicts: [] };
  const rebased = programClone(data), space = rebased.spaces[input.actorId];
  space.legacySnapshot = { workspaceId: view.payload.state.workspaceId, revision: view.payload.state.revision, raw: JSON.stringify(view.payload) };
  const payload = programClone(source.payload); payload.state.revision++; payload.state.updatedAt = input.action.now; delete payload.state.undo;
  const merged = reconcileProgramLegacy(rebased, payload, { actorId: input.actorId, expectedSnapshotRaw: space.legacySnapshot.raw,
    canonicalFolders: true, onlyFlowRef: input.action.flowRef, sourceAction: input.action });
  if (!merged.ok) return { transition: programFailure(data, merged.reason), issues: merged.issues, conflicts: merged.conflicts };
  if (merged.shadowPlan.issues.length || merged.shadowPlan.patches.length) return bad('unresolved', 'incomplete-source-roundtrip');
  return { transition: programResult(data, merged.data, source.reviewId || `source:${input.action.type}`), issues: [], conflicts: [] };
}

/** All Map children become executable together, in one Program transaction. */
export function applyProgramLegacyMapReview(data: ProgramData, input: { actorId: string; expectedToken: string; action: ProgramLegacyMapReviewAction }): ProgramLegacyTransactionResult {
  const bad = (reason: 'invalid' | 'missing' | 'forbidden' | 'conflict' | 'unresolved', code: string): ProgramLegacyTransactionResult => ({ transition: programFailure(data, reason), issues: [{ code, ref: input.action.groupRef }], conflicts: [] });
  if (!validateProgramData(data) || !data.spaces[input.actorId]?.legacySnapshot) return bad('invalid', 'invalid-input');
  const baseline = inspectProgramLegacySnapshotPayload(JSON.parse(data.spaces[input.actorId].legacySnapshot!.raw));
  if (!baseline.ok) return bad('invalid', 'invalid-source');
  const onlyFlowRefs = baseline.mapSourceFlows.filter(flow => flow.presentation?.mapGroup?.groupRef === input.action.groupRef).map(flow => flow.ref);
  const view = prepareProgramLegacyView(data, { actorId: input.actorId, now: input.action.now, onlyFlowRefs });
  if (!view.ok) return { transition: programFailure(data, view.reason), issues: view.issues, conflicts: [] };
  if (view.token !== input.expectedToken) return bad('conflict', 'stale-program-view');
  const checked = inspectProgramLegacySnapshotPayload(view.payload);
  if (!checked.ok) return bad('invalid', 'invalid-source');
  const reviewed = transitionProgramLegacyMapReview(checked.mapSourceFlows, view.payload.mapReview, input.action, view.payload.sourceLifecycle);
  if (!reviewed.ok) return bad(reviewed.reason, 'map-review-not-ready');
  if (!reviewed.changed && !view.rebased) return { transition: programResult(data, data, input.action.requestId), issues: [], conflicts: [] };
  const rebased = programClone(data), space = rebased.spaces[input.actorId];
  space.legacySnapshot = { workspaceId: view.payload.state.workspaceId, revision: view.payload.state.revision, raw: JSON.stringify(view.payload) };
  const payload = programClone(view.payload); payload.mapReview = reviewed.store;
  // Approval belongs exclusively to the Program owner; no legacy state revision
  // or execution record is changed by the act of reviewing a Map.
  const merged = reconcileProgramLegacy(rebased, payload, { actorId: input.actorId, expectedSnapshotRaw: space.legacySnapshot.raw, canonicalFolders: true, onlyFlowRefs, mapAction: input.action });
  if (!merged.ok) return { transition: programFailure(data, merged.reason), issues: merged.issues, conflicts: merged.conflicts };
  if (merged.shadowPlan.issues.length || merged.shadowPlan.patches.length) return bad('unresolved', 'incomplete-map-roundtrip');
  return { transition: programResult(data, merged.data, input.action.requestId), issues: [], conflicts: [] };
}
