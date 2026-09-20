import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { composePersonalWorkspacePocReadModel } from '../personal-workspace-poc-composition';
import type { PersonalWorkspacePocAuthoredFlow } from '../personal-workspace-poc-contract';
import { programLegacyMapRevisionId, readProgramLegacyCurrentMapSource, validateProgramLegacyMapRevision, type ProgramLegacyMapSourceRevision } from './legacy-map-source';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { readProgramSelectedMapRecurrences } from './legacy-map-recurrence';
import { programLegacyAuthenticSource, programLegacySourceChanges, projectProgramLegacySource, resolveProgramLegacySource, sourceCanonical,
  programLegacyPartialItemRef, type ProgramLegacyPartialMapping, type ProgramLegacySourceOwner, type ProgramLegacySourceLifecycleStore } from './legacy-source-lifecycle-contract';

export type ProgramLegacySourceAction =
  | { type: 'connect-map'; flowRef: string; requestId: string; expectedSourceToken: string; now: string }
  | { type: 'stage-map'; flowRef: string; requestId: string; now: string }
  | { type: 'activate-map-recurrence'; flowRef: string; requestId: string; expectedSelection: string; itemRefs: string[]; now: string }
  | { type: 'map-partial-items'; flowRef: string; requestId: string; expectedSourceToken: string; rowChoices: ProgramLegacyPartialMapping['rowChoices']; unmatchedItems: ProgramLegacyPartialMapping['unmatchedItems']; now: string }
  | { type: 'map-items'; flowRef: string; requestId: string; expectedSourceToken: string; itemRefs: Record<string, string>; now: string }
  | { type: 'stage'; flowRef: string; requestId: string; rawText: string; now: string }
  | { type: 'choice'; flowRef: string; reviewId: string; changeId: string; choice: 'mine' | 'incoming' | null; now: string }
  | { type: 'defer' | 'apply'; flowRef: string; reviewId: string; now: string }
  | { type: 'undo'; flowRef: string; now: string; retainAddedItemRefs?: string[] };
export type ProgramLegacySourceFailure = 'invalid' | 'missing' | 'source-item-mapping-required' | 'source-conflict' | 'missing-choice' | 'section-context-conflict' | 'limit' | 'no-source-change' | 'undo-personal-record-conflict' | 'undo-item-review-required';
export function readProgramLegacySourceLifecycle(payload: ProgramLegacySnapshotPayload, flowRef: string) {
  const checked = inspectProgramLegacySnapshotPayload(payload);
  if (!checked.ok) return { ok: false as const, reason: 'invalid' as const };
  const original = [...payload.model.flows, ...(payload.state.authoredFlows ?? [])].find(flow => flow.ref === flowRef);
  if (!original) return { ok: false as const, reason: 'missing' as const };
  const stored = payload.sourceLifecycle?.owners[flowRef];
  if (stored) return { ok: true as const, owner: stored, projection: projectProgramLegacySource(stored)! };
  const authentic = programLegacyAuthenticSource(original);
  if (!authentic || payload.sourceCandidateStore?.effectiveVersions[flowRef]) return { ok: false as const, reason: 'source-item-mapping-required' as const };
  const revisionId = authentic.flow.authoring.revisionId;
  const owner: ProgramLegacySourceOwner = payload.sourceLifecycle?.owners[flowRef] ?? {
    flowRef, baseRevisionId: revisionId, revisions: { [revisionId]: authentic.flow },
    effective: { flowRevisionId: revisionId, itemRevisions: Object.fromEntries(authentic.flow.items.map(item => [item.ref, revisionId])), retainedItemRefs: [] }, reviews: [],
  };
  return { ok: true as const, owner, projection: projectProgramLegacySource(owner)! };
}

/** Only the exact saved authored/effective raw is eligible. A Map without that
 * evidence is not converted to guessed text. All selections start empty. */
export function readProgramLegacySourceMapping(payload: ProgramLegacySnapshotPayload, flowRef: string, options?: { partial: true }) {
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (!inspectProgramLegacySnapshotPayload(payload).ok) return fail('invalid');
  const composed = composePersonalWorkspacePocReadModel(payload.model, { ...payload.state, personalPlanOverlays: {} }, payload.sourceCandidateStore);
  const original = [...payload.model.flows, ...(payload.state.authoredFlows ?? [])].find(flow => flow.ref === flowRef);
  const target = composed.ok ? composed.model.flows.find(flow => flow.ref === flowRef) : undefined;
  if (!original || !target || !('authoring' in original) || !('authoring' in target)) return fail('missing-saved-authoring-raw');
  const author = (original as PersonalWorkspacePocAuthoredFlow).authoring, raw = (target as PersonalWorkspacePocAuthoredFlow).authoring.rawText;
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: author.handoffId, documentId: author.documentId,
    revisionId: 'program-source:mapped-base', rawText: raw, committedAt: author.committedAt,
    ...(author.templateId ? { templateId: author.templateId as NonNullable<Parameters<typeof materializePersonalWorkspacePocAuthoring>[0]['templateId']> } : {}) });
  if (!made.ok || !programLegacyAuthenticSource(made.flow)) return fail('invalid-saved-authoring-raw');
  if (!options?.partial && made.flow.items.length !== target.items.length) return fail('mapping-cardinality-review-required');
  return { ok: true as const, target, materialized: made.flow, contexts: programLegacyAuthenticSource(made.flow)!.contexts, sourceToken: sourceCanonical(target) };
}

export function readProgramLegacyMapSourceConnection(payload: ProgramLegacySnapshotPayload, flowRef: string) {
  if (!inspectProgramLegacySnapshotPayload(payload).ok || payload.sourceCandidateStore?.effectiveVersions[flowRef]) return null;
  const flow = payload.model.flows.find(flow => flow.ref === flowRef);
  if (!flow || 'authoring' in flow) return null;
  const revision: ProgramLegacyMapSourceRevision = { kind: 'saved-map-projection', flow };
  if (!validateProgramLegacyMapRevision(revision, flow)) return null;
  return { revision, sourceToken: sourceCanonical(flow), revisionId: programLegacyMapRevisionId(revision) };
}

/** Pure candidate owner transition. It cannot call a writer. The Program
 * adapter reconciles the resulting source + private documents in one commit. */
export function transitionProgramLegacySourcePayload(before: ProgramLegacySnapshotPayload, action: ProgramLegacySourceAction) {
  const fail = (reason: ProgramLegacySourceFailure) => ({ ok: false as const, reason, payload: before });
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/u.test(action.now) || !Number.isFinite(Date.parse(action.now))) return fail('invalid');
  if (action.type === 'connect-map') {
    const prepared = readProgramLegacyMapSourceConnection(before, action.flowRef);
    if (!prepared || !action.requestId.trim() || action.requestId.length > 1100) return fail('invalid');
    if (prepared.sourceToken !== action.expectedSourceToken) return fail('source-conflict');
    const existing = before.sourceLifecycle?.owners[action.flowRef];
    if (existing) return existing.structured?.requestId === action.requestId && existing.structured.sourceToken === action.expectedSourceToken
      ? { ok: true as const, changed: false, payload: before, reviewId: action.requestId } : fail('source-conflict');
    const { revisionId, revision } = prepared;
    const owner: ProgramLegacySourceOwner = { flowRef: action.flowRef, baseRevisionId: revisionId, revisions: {},
      structured: { version: 1, requestId: action.requestId, confirmedAt: action.now, sourceToken: prepared.sourceToken, revisions: { [revisionId]: revision } },
      effective: { flowRevisionId: revisionId, itemRevisions: Object.fromEntries(revision.flow.items.map(item => [item.ref, revisionId])), retainedItemRefs: [] }, reviews: [] };
    const payload = { ...before, sourceLifecycle: { version: 1 as const, owners: { ...before.sourceLifecycle?.owners, [action.flowRef]: owner } } };
    if (!inspectProgramLegacySnapshotPayload(payload).ok) return fail('invalid');
    return { ok: true as const, changed: true, payload, reviewId: action.requestId };
  }
  if (action.type === 'map-partial-items') {
    if (!action.rowChoices || !action.unmatchedItems || typeof action.rowChoices !== 'object' || Array.isArray(action.rowChoices)
      || typeof action.unmatchedItems !== 'object' || Array.isArray(action.unmatchedItems)
      || Object.values(action.rowChoices).some(choice => !choice || typeof choice !== 'object' || !['existing', 'new', 'source-only'].includes(choice.kind))) return fail('invalid');
    const existing = before.sourceLifecycle?.owners[action.flowRef];
    const partialMapping: ProgramLegacyPartialMapping = { version: 1, requestId: action.requestId, confirmedAt: action.now, sourceToken: action.expectedSourceToken, rowChoices: action.rowChoices, unmatchedItems: action.unmatchedItems };
    if (existing) return existing.partialMapping && sourceCanonical({ ...existing.partialMapping, confirmedAt: action.now }) === sourceCanonical(partialMapping)
      ? { ok: true as const, changed: false, payload: before, reviewId: action.requestId } : fail('source-conflict');
    const prior = readProgramLegacySourceLifecycle(before, action.flowRef);
    if (prior.ok || prior.reason !== 'source-item-mapping-required') return fail('invalid');
    const mapping = readProgramLegacySourceMapping(before, action.flowRef, { partial: true });
    if (!mapping.ok) return fail('source-item-mapping-required');
    if (mapping.sourceToken !== action.expectedSourceToken) return fail('source-conflict');
    const revisionId = mapping.materialized.authoring.revisionId;
    const refs = Object.entries(action.rowChoices).flatMap(([nativeRef, choice]) => choice.kind === 'source-only' ? [] : [choice.kind === 'existing' ? choice.itemRef : programLegacyPartialItemRef(mapping.target, nativeRef)]);
    const owner: ProgramLegacySourceOwner = { flowRef: action.flowRef, baseRevisionId: revisionId, revisions: { [revisionId]: mapping.materialized }, partialMapping,
      effective: { flowRevisionId: revisionId, itemRevisions: Object.fromEntries([...refs, ...Object.keys(action.unmatchedItems)].map(ref => [ref, revisionId])), retainedItemRefs: Object.keys(action.unmatchedItems) }, reviews: [] };
    const payload = { ...before, sourceLifecycle: { version: 1 as const, owners: { ...before.sourceLifecycle?.owners, [action.flowRef]: owner } } };
    if (!inspectProgramLegacySnapshotPayload(payload).ok) return fail('invalid');
    return { ok: true as const, changed: true, payload, reviewId: action.requestId };
  }
  if (action.type === 'map-items') {
    const existing = before.sourceLifecycle?.owners[action.flowRef];
    if (existing) return existing.mapping?.requestId === action.requestId && existing.mapping.sourceToken === action.expectedSourceToken
      && sourceCanonical(existing.mapping.itemRefs) === sourceCanonical(action.itemRefs)
      ? { ok: true as const, changed: false, payload: before, reviewId: action.requestId } : fail('source-conflict');
    const prior = readProgramLegacySourceLifecycle(before, action.flowRef);
    if (prior.ok || prior.reason !== 'source-item-mapping-required') return fail('invalid');
    const mapping = readProgramLegacySourceMapping(before, action.flowRef);
    if (!mapping.ok) return fail('source-item-mapping-required');
    if (mapping.sourceToken !== action.expectedSourceToken) return fail('source-conflict');
    if (!action.requestId.trim() || action.requestId.length > 1100) return fail('invalid');
    const flow = mapping.materialized, revisionId = flow.authoring.revisionId;
    const owner: ProgramLegacySourceOwner = { flowRef: action.flowRef, baseRevisionId: revisionId, revisions: { [revisionId]: flow },
      effective: { flowRevisionId: revisionId, itemRevisions: Object.fromEntries(Object.values(action.itemRefs).map(ref => [ref, revisionId])), retainedItemRefs: [] }, reviews: [],
      mapping: { requestId: action.requestId, confirmedAt: action.now, sourceToken: mapping.sourceToken, itemRefs: action.itemRefs } };
    const payload = { ...before, sourceLifecycle: { version: 1 as const, owners: { ...before.sourceLifecycle?.owners, [action.flowRef]: owner } } };
    if (!inspectProgramLegacySnapshotPayload(payload).ok) return fail('invalid');
    return { ok: true as const, changed: true, payload, reviewId: action.requestId };
  }
  const read = readProgramLegacySourceLifecycle(before, action.flowRef);
  if (!read.ok) return fail(read.reason);
  const payload: ProgramLegacySnapshotPayload = JSON.parse(JSON.stringify(before));
  const store: ProgramLegacySourceLifecycleStore = payload.sourceLifecycle ?? { version: 1, owners: {} };
  const owner: ProgramLegacySourceOwner = JSON.parse(JSON.stringify(read.owner));
  store.owners[action.flowRef] = owner;
  if (action.type === 'activate-map-recurrence') {
    if (!owner.structured || !action.requestId.trim() || action.requestId.length > 1100
      || !Array.isArray(action.itemRefs) || !action.itemRefs.length || new Set(action.itemRefs).size !== action.itemRefs.length) return fail('invalid');
    if (action.expectedSelection !== sourceCanonical(owner.effective)) return fail('source-conflict');
    const selected = readProgramSelectedMapRecurrences(owner, owner.structured.revisions[owner.baseRevisionId].flow);
    if (!selected.ok || action.itemRefs.some(ref => !selected.contexts.has(ref))) return fail('source-item-mapping-required');
    owner.mapExecution ??= { version: 1, items: {} };
    for (const ref of action.itemRefs) {
      // Already activated targets retain their first explicit receipt; retries
      // never manufacture a second handoff or alter private record ownership.
      if (!owner.mapExecution.items[ref]) owner.mapExecution.items[ref] = { revisionId: owner.effective.itemRevisions[ref], requestId: action.requestId, confirmedAt: action.now };
    }
    owner.executionHandoffs = { version: 1, itemRefs: [...new Set([...(owner.executionHandoffs?.itemRefs ?? []), ...action.itemRefs])] };
  } else if (action.type === 'stage-map') {
    if (!owner.structured || !action.requestId.trim() || action.requestId.length > 1100) return fail('invalid');
    const existing = owner.reviews.find(review => review.id === action.requestId);
    const original = owner.structured.revisions[owner.baseRevisionId].flow;
    const incoming = readProgramLegacyCurrentMapSource(original, existing?.createdAt ?? action.now);
    if (!incoming) return fail('source-item-mapping-required');
    const revisionId = programLegacyMapRevisionId(incoming);
    if (existing) return existing.incomingRevisionId === revisionId && sourceCanonical(owner.structured.revisions[revisionId]) === sourceCanonical(incoming)
      ? { ok: true as const, changed: false, payload: before, reviewId: existing.id } : fail('source-conflict');
    if (owner.reviews.length >= 80 || Object.keys(owner.structured.revisions).length >= 81) return fail('limit');
    if (owner.structured.revisions[revisionId] && sourceCanonical(owner.structured.revisions[revisionId]) !== sourceCanonical(incoming)) return fail('source-conflict');
    owner.structured.revisions[revisionId] = incoming;
    if (!programLegacySourceChanges(owner, revisionId).length) return fail('no-source-change');
    owner.reviews.push({ id: action.requestId, incomingRevisionId: revisionId, expectedSelection: sourceCanonical(owner.effective), choices: {}, status: 'pending', createdAt: action.now });
  } else if (action.type === 'stage') {
    if (owner.structured) return fail('invalid');
    if (!action.requestId.trim() || action.requestId.length > 1100 || action.rawText.length > 300_000) return fail('invalid');
    const existing = owner.reviews.find(review => review.id === action.requestId);
    if (existing) return owner.revisions[existing.incomingRevisionId].authoring.rawText === action.rawText
      ? { ok: true as const, changed: false, payload: before, reviewId: existing.id } : fail('source-conflict');
    if (owner.reviews.length >= 80 || Object.keys(owner.revisions).length >= 81) return fail('limit');
    const original = owner.revisions[owner.baseRevisionId].authoring, revisionId = `program-source:${action.requestId}`;
    if (owner.revisions[revisionId]) return fail('source-conflict');
    const made = materializePersonalWorkspacePocAuthoring({ handoffId: original.handoffId, documentId: original.documentId,
      revisionId, rawText: action.rawText, committedAt: action.now, ...(original.templateId ? { templateId: original.templateId as NonNullable<Parameters<typeof materializePersonalWorkspacePocAuthoring>[0]['templateId']> } : {}) });
    if (!made.ok || !programLegacyAuthenticSource(made.flow)) return fail('invalid');
    owner.revisions[revisionId] = made.flow;
    if (!programLegacySourceChanges(owner, revisionId).length) return fail('no-source-change');
    owner.reviews.push({ id: action.requestId, incomingRevisionId: revisionId, expectedSelection: sourceCanonical(owner.effective), choices: {}, status: 'pending', createdAt: action.now });
  } else if (action.type === 'undo') {
    if (!owner.undo) return fail('missing');
    const selection = owner.undo.selection;
    // Source undo cannot orphan new-item private execution or memo records.
    const removed = Object.keys(owner.effective.itemRevisions).filter(ref => !Object.hasOwn(selection.itemRevisions, ref));
    const hasRecords = removed.some(ref => before.state.placements[ref] || before.state.completions[ref]
      || before.state.personalPlanOverlays?.[action.flowRef]?.items[ref]
      || Object.values(before.state.occurrencePlacements ?? {}).some(row => row.sourceItemRef === ref)
      || Object.values(before.state.occurrenceCompletions ?? {}).some(row => row.sourceItemRef === ref));
    if (removed.length && action.retainAddedItemRefs === undefined) return fail(hasRecords ? 'undo-personal-record-conflict' : 'undo-item-review-required');
    if (action.retainAddedItemRefs !== undefined && (new Set(action.retainAddedItemRefs).size !== action.retainAddedItemRefs.length
      || sourceCanonical([...action.retainAddedItemRefs].sort()) !== sourceCanonical([...removed].sort()))) return fail('source-conflict');
    // Explicit resolution: roll back the earlier source choices while keeping
    // every added item with its authentic source context and private records.
    for (const ref of removed) {
      selection.itemRevisions[ref] = owner.effective.itemRevisions[ref];
      if (!selection.retainedItemRefs.includes(ref)) selection.retainedItemRefs.push(ref);
    }
    const review = owner.reviews.find(row => row.id === owner.undo!.reviewId)!;
    review.status = 'pending'; owner.effective = selection; delete owner.undo;
  } else {
    const review = owner.reviews.find(row => row.id === action.reviewId);
    if (!review) return fail('missing');
    if (review.status === 'applied' || review.expectedSelection !== sourceCanonical(owner.effective)) return fail('source-conflict');
    if (action.type === 'choice') {
      if (!programLegacySourceChanges(owner, review.incomingRevisionId).some(change => change.id === action.changeId)
        || (action.choice !== null && !['mine', 'incoming'].includes(action.choice))) return fail('invalid');
      if (action.choice === null) delete review.choices[action.changeId]; else review.choices[action.changeId] = action.choice;
      review.status = 'pending';
    } else if (action.type === 'defer') review.status = 'deferred';
    else {
      const changes = programLegacySourceChanges(owner, review.incomingRevisionId);
      if (!changes.length) return fail('no-source-change');
      if (changes.some(change => !review.choices[change.id])) return fail('missing-choice');
      const resolved = resolveProgramLegacySource(owner, review);
      if (!resolved) return fail('section-context-conflict');
      owner.undo = { reviewId: review.id, selection: owner.effective };
      owner.effective = resolved; review.status = 'applied';
    }
  }
  payload.sourceLifecycle = store;
  if (action.type === 'apply' || action.type === 'undo') {
    const after = projectProgramLegacySource(owner)!;
    const refs = new Set([...read.projection.flow.items, ...after.flow.items].map(item => item.ref));
    const changedKinds = [...refs].filter(ref => read.projection.flow.items.some(item => item.ref === ref) && after.flow.items.some(item => item.ref === ref)
      && !!read.projection.contexts.get(ref)?.attributes.recurrence !== !!after.contexts.get(ref)?.attributes.recurrence);
    if (changedKinds.length) owner.executionHandoffs = { version: 1, itemRefs: [...new Set([...(owner.executionHandoffs?.itemRefs ?? []), ...changedKinds])] };
  }
  if (sourceCanonical(payload) === sourceCanonical(before)) return { ok: true as const, changed: false, payload: before, reviewId: action.type === 'stage' || action.type === 'stage-map' ? action.requestId : 'reviewId' in action ? action.reviewId : '' };
  if (!inspectProgramLegacySnapshotPayload(payload).ok) return fail('invalid');
  return { ok: true as const, changed: true, payload, reviewId: action.type === 'stage' || action.type === 'stage-map' ? action.requestId : 'reviewId' in action ? action.reviewId : '' };
}
