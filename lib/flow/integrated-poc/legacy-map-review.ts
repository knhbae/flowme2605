import type { PersonalWorkspacePocFlow } from '../personal-workspace-poc-contract';
import { getPersonalWorkspacePocFlowItemFieldOwnership } from '../personal-workspace-poc-contract';
import { getSourceBackedFlowMapQualityDecision } from '../source-backed-my-flow';
import { sourceCanonical, projectProgramLegacySource, programLegacyArchivedSourceItem, programLegacyStructuredItemEvidence, type ProgramLegacySourceLifecycleStore } from './legacy-source-lifecycle-contract';
import type { ProgramPrivateSpace } from './contract';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

/** Personal execution review, never a creator/public quality approval. */
export type ProgramLegacyMapReviewRecord = {
  requestId: string; sourceToken: string; reviewedAt: string;
  acknowledgedReasons: string[]; sourceByItemRef: Record<string, string>;
};
export type ProgramLegacyMapReviewStore = { version: 1; groups: Record<string, ProgramLegacyMapReviewRecord> };
export type ProgramLegacyMapReviewAction = {
  groupRef: string; requestId: string; expectedSourceToken: string; now: string;
  acknowledgedReasons: string[]; sourceByItemRef: Record<string, string>;
};
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const id = (x: unknown): x is string => typeof x === 'string' && !!x.trim() && x.length <= 1200 && !['__proto__', 'constructor', 'prototype'].includes(x);
const stamp = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/u.test(x) && Number.isFinite(Date.parse(x));
/** Explicit curated safety hold only. Unknown old fixture owners are NOT
 * inferred unsafe from a missing catalog/quality decision. */
export function programLegacyMapQualityHold(ownerId: string): string | null {
  const quality = getSourceBackedFlowMapQualityDecision(ownerId);
  return quality.publicExecutionEnabled === false || quality.executionHoldReason || quality.status === 'reject'
    ? `원문 품질 검토가 필요해 새 실행을 보류합니다: ${quality.reason}` : null;
}
/** Also protects already-saved Program checkbox documents without rewriting or
 * deleting their old execution history. Caller owns the Program transaction. */
type QualitySpace = Pick<ProgramPrivateSpace, 'legacySnapshot' | 'savedBindings'> & { text?: TextWorkspaceState };
const qualityCaches = new WeakMap<object, { raw: string | undefined; text: TextWorkspaceState | undefined; bindings: ProgramPrivateSpace['savedBindings']; reasons: Map<string, string> }>();
function taskQualityReasons(space: QualitySpace) {
  const prior = qualityCaches.get(space), raw = space.legacySnapshot?.raw;
  if (prior && prior.raw === raw && prior.text === space.text && prior.bindings === space.savedBindings) return prior.reasons;
  const reasons = new Map<string, string>();
  if (raw) try {
    const payload = JSON.parse(raw), originals: PersonalWorkspacePocFlow[] = [...payload.model.flows, ...(payload.state.authoredFlows ?? [])];
    const effective = projectProgramLegacyMapReviews(programLegacyStructuredMapSourceFlows(originals, payload.sourceLifecycle), payload.mapReview, payload.sourceLifecycle);
    const flows = new Map<string, PersonalWorkspacePocFlow>(effective.map(flow => [flow.ref, flow]));
    for (const binding of space.savedBindings) {
      const group = flows.get(binding.flowRef)?.presentation?.mapGroup, reason = group && (programLegacyMapQualityHold(group.ownerId)
        ?? (group.executionState === 'review-hold' ? '원문 Map 검토가 필요해 새 실행을 보류합니다. 기존 개인 내용과 기록은 유지합니다.' : null));
      if (reason) for (const id of Object.values(binding.itemLines)) reasons.set(id, reason);
      for (const [ref, id] of Object.entries(binding.itemLines)) if (programLegacyArchivedSourceItem(payload.sourceLifecycle?.owners[binding.flowRef], ref)) reasons.set(id, '원문 연결 검토에서 실행 보관한 항목입니다. 개인 내용과 기록은 유지합니다.');
    }
  } catch { for (const binding of space.savedBindings) for (const id of Object.values(binding.itemLines)) reasons.set(id, '원본 연결을 확인할 수 없어 새 실행을 보류합니다.'); }
  if (reasons.size && space.text) for (const doc of [...space.text.documents, ...space.text.flows]) for (const row of M.rowMeta(space.text, doc.id)) {
    const parent = (row.ancestorItemIds ?? []).find(id => reasons.has(id)) ?? (row.progressTargetId && reasons.has(row.progressTargetId) ? row.progressTargetId : null);
    if (parent) reasons.set(row.id, reasons.get(parent)!);
  }
  qualityCaches.set(space, { raw, text: space.text, bindings: space.savedBindings, reasons }); return reasons;
}
export function programLegacyTaskQualityHold(space: QualitySpace, taskId: string): string | null {
  return taskQualityReasons(space).get(taskId) ?? null;
}

/** Text/linked-row edits cannot become an alternate execution writer for held
 * canonical Items. Original blocks, subchecks, semantics, scopes and progress
 * are retained exactly; editing an unrelated personal document is allowed. */
export function programPreservesLegacyQualityHold(space: Pick<ProgramPrivateSpace, 'legacySnapshot' | 'savedBindings' | 'text'>, nextText: TextWorkspaceState): boolean {
  try {
    const held = space.savedBindings.filter(binding => Object.values(binding.itemLines).some(id => programLegacyTaskQualityHold(space, id)));
    if (!held.length) return true;
    if (!M.validate(space.text) || !M.validate(nextText)) return false;
    const allIds = new Set(space.savedBindings.flatMap(binding => Object.values(binding.itemLines)));
    const protectedIds = new Set<string>(), heldDocuments = new Set(held.filter(binding => Object.values(binding.itemLines).every(id => programLegacyTaskQualityHold(space, id)?.startsWith('원문 품질'))).map(binding => binding.documentId));
    const documents = (text: TextWorkspaceState) => [...text.documents, ...text.flows];
    const block = (text: TextWorkspaceState, id: string) => {
      const doc = documents(text).find(entry => entry.lines.some(line => line.id === id)); if (!doc) return null;
      const start = doc.lines.findIndex(line => line.id === id), selected = M.selectionForMove(text, doc.id, id);
      let end = selected?.kind === 'task' ? selected.endIndex : start + 1;
      if (selected?.kind !== 'task') while (end < doc.lines.length && !allIds.has(doc.lines[end].id) && /^\s|^원문 속성:/u.test(doc.lines[end].text)) end++;
      return { docId: doc.id, lines: doc.lines.slice(start, end) };
    };
    for (const binding of held) for (const id of Object.values(binding.itemLines).filter(id => programLegacyTaskQualityHold(space, id))) {
      const before = block(space.text, id), after = block(nextText, id);
      if (!before || sourceCanonical(before) !== sourceCanonical(after)) return false;
      before.lines.forEach(line => protectedIds.add(line.id));
    }
    const semantics = (text: TextWorkspaceState) => documents(text).flatMap(doc => M.parseDocument(doc, text).items)
      .filter(item => protectedIds.has(item.id) || heldDocuments.has(item.scopeId))
      .map(item => ({ id: item.id, docId: item.docId, title: item.title, date: item.date, time: item.time, done: item.done,
        note: item.note, depth: item.depth, scopeId: item.scopeId, parentItemId: item.parentItemId, parentTaskId: item.parentTaskId, subchecks: item.subchecks.map(child => child.id) }));
    if (sourceCanonical(semantics(space.text)) !== sourceCanonical(semantics(nextText))) return false;
    for (const key of ['taskScopes', 'itemScopes'] as const) for (const id of protectedIds) if (space.text[key][id] !== nextText[key][id]) return false;
    return sourceCanonical(space.text.progressRecords.filter(row => protectedIds.has(row.taskId))) === sourceCanonical(nextText.progressRecords.filter(row => protectedIds.has(row.taskId)));
  } catch { return false; }
}
export function programMapReviewUrl(x: string): boolean {
  try {
    const u = new URL(x), host = u.hostname.toLowerCase();
    return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password && !u.search && !u.hash
      && host.includes('.') && !/^(?:\d|\[)/u.test(host) && !/(?:^|\.)(?:localhost|local|internal)$/u.test(host);
  } catch { return false; }
}

export function programLegacyStructuredMapSourceFlows(flows: readonly PersonalWorkspacePocFlow[], lifecycle?: ProgramLegacySourceLifecycleStore) {
  const projected = flows.map(flow => lifecycle?.owners[flow.ref]?.structured ? projectProgramLegacySource(lifecycle.owners[flow.ref])!.flow : flow);
  const incomingHolds = new Map<string, Set<string>>();
  for (const flow of projected) {
    const owner = lifecycle?.owners[flow.ref]; if (!owner?.structured || !flow.presentation?.mapGroup) continue;
    for (const revisionId of new Set([owner.effective.flowRevisionId, ...Object.values(owner.effective.itemRevisions)])) {
      const revision = owner.structured.revisions[revisionId];
      if (revision.kind !== 'source-backed-map' || revision.persistence.readiness.content !== 'needs_creator_review') continue;
      const reasons = incomingHolds.get(flow.presentation.mapGroup.groupRef) ?? new Set<string>();
      revision.persistence.readiness.reasons.forEach(reason => reasons.add(reason)); incomingHolds.set(flow.presentation.mapGroup.groupRef, reasons);
    }
  }
  return projected.map(flow => {
    const group = flow.presentation?.mapGroup, reasons = group && incomingHolds.get(group.groupRef);
    return group && reasons ? { ...flow, presentation: { ...flow.presentation, mapGroup: { ...group,
      executionState: 'review-hold' as const, reviewReasons: [...new Set([...group.reviewReasons, ...reasons])] } } } : flow;
  });
}

/** Inputs are source-only flows, before personal title/date/order overlays. */
export function readProgramLegacyMapReview(flows: readonly PersonalWorkspacePocFlow[], groupRef: string, lifecycle?: ProgramLegacySourceLifecycleStore) {
  const children = flows.filter(flow => flow.presentation?.mapGroup?.groupRef === groupRef)
    .sort((a, b) => a.presentation!.mapGroup!.childOrder - b.presentation!.mapGroup!.childOrder);
  if (!children.length) return null;
  const group = children[0].presentation!.mapGroup!;
  const blockers: string[] = [];
  if (children.length !== group.childCount || children.some((flow, index) => flow.presentation!.mapGroup!.childOrder !== index)) blockers.push('Map의 연결 Flow가 빠져 있습니다. 원본 묶음을 보완해야 합니다.');
  const quality = getSourceBackedFlowMapQualityDecision(group.ownerId);
  if (!quality.directRouteEnabled || quality.status === 'reject' || quality.publicExecutionEnabled === false || quality.executionHoldReason) {
    blockers.push(`제작·원문 품질 검토가 먼저 필요합니다: ${quality.reason}`);
  }
  const items = children.flatMap(flow => {
    if (!flow.items.length) blockers.push(`${flow.title}: 원문 항목이 없습니다. 먼저 원문 항목을 보완해야 합니다.`);
    return flow.items.map(item => {
      const sourceUrls = (flow.presentation?.discovery?.sourceUrls ?? []).filter(programMapReviewUrl);
      if (!sourceUrls.length) blockers.push(`${item.title}: 확인할 출처 URL이 원본에 없습니다. 원본 출처를 보완해야 합니다.`);
      if (getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow).dateDerivation.strategy === 'unsupported-source-schedule') blockers.push(`${item.title}: 원문 일정을 안전하게 해석할 수 없습니다.`);
      return { itemRef: item.ref, flowRef: flow.ref, title: item.title, sourceUrls, original: item };
    });
  });
  // These blockers denote absent structure, not an acknowledgment task. Missing
  // per-Step URL can be supplemented only by selecting an existing source URL.
  const structureSupplied = children.every(flow => {
    const owner = lifecycle?.owners[flow.ref];
    return !!owner?.structured && !!flow.items.length && flow.items.every(item => {
      const revision = owner.structured!.revisions[owner.effective.itemRevisions[item.ref]];
      return revision?.kind === 'source-backed-map' && revision.flow.items.some(source => source.ref === item.ref);
    });
  });
  if (group.reviewReasons.some(reason => /연결된 Flow를 찾을 수 없음|Step이 없는 Flow/u.test(reason)) && !structureSupplied) blockers.push('빠진 Flow·Step은 확인 표시로 대신할 수 없습니다.');
  const structured = children.flatMap(flow => {
    const owner = lifecycle?.owners[flow.ref]; if (!owner?.structured) return [];
    const metadata = owner.structured.revisions[owner.effective.flowRevisionId];
    const items = Object.entries(owner.effective.itemRevisions).filter(([, revisionId]) => revisionId !== owner.baseRevisionId)
      .map(([ref, revisionId]) => ({ ref, evidence: programLegacyStructuredItemEvidence(owner, revisionId, ref) }));
    if (metadata.kind === 'saved-map-projection' && !items.length) return [];
    return [{ flowRef: flow.ref, ...(metadata.kind === 'source-backed-map' ? { map: metadata.persistence.map } : {}), items }];
  });
  const sourceToken = sourceCanonical(structured.length ? { children, structured } : children);
  return { groupRef, title: group.title, ownerId: group.ownerId, sourceToken, reasons: [...group.reviewReasons],
    held: group.executionState === 'review-hold', children, items, blockers: [...new Set(blockers)] };
}

function validReview(entry: unknown, view: NonNullable<ReturnType<typeof readProgramLegacyMapReview>>): entry is ProgramLegacyMapReviewRecord {
  if (!record(entry) || Object.keys(entry).some(key => !['requestId', 'sourceToken', 'reviewedAt', 'acknowledgedReasons', 'sourceByItemRef'].includes(key))
    || !id(entry.requestId) || !stamp(entry.reviewedAt) || typeof entry.sourceToken !== 'string' || entry.sourceToken.length > 5_000_000
    || !Array.isArray(entry.acknowledgedReasons) || !entry.acknowledgedReasons.every(x => typeof x === 'string') || !record(entry.sourceByItemRef)) return false;
  if (!view.held || view.blockers.length || entry.sourceToken !== view.sourceToken
    || sourceCanonical(entry.acknowledgedReasons) !== sourceCanonical(view.reasons)) return false;
  const supplied = entry.sourceByItemRef;
  return Object.keys(supplied).length === view.items.length && view.items.every(item => typeof supplied[item.itemRef] === 'string' && item.sourceUrls.includes(supplied[item.itemRef] as string));
}

/** Stale reviews remain readable evidence but cannot unlock a changed source. */
export function validateProgramLegacyMapReviews(value: unknown): value is ProgramLegacyMapReviewStore {
  if (!record(value) || value.version !== 1 || Object.keys(value).some(key => !['version', 'groups'].includes(key)) || !record(value.groups) || Object.keys(value.groups).length > 500) return false;
  return Object.entries(value.groups).every(([key, entry]) => id(key) && record(entry)
    && Object.keys(entry).every(k => ['requestId', 'sourceToken', 'reviewedAt', 'acknowledgedReasons', 'sourceByItemRef'].includes(k))
    && id(entry.requestId) && stamp(entry.reviewedAt) && typeof entry.sourceToken === 'string' && entry.sourceToken.length <= 5_000_000
    && Array.isArray(entry.acknowledgedReasons) && entry.acknowledgedReasons.length <= 1200 && entry.acknowledgedReasons.every(reason => typeof reason === 'string' && reason.length <= 10000)
    && record(entry.sourceByItemRef) && Object.keys(entry.sourceByItemRef).length <= 1200 && Object.entries(entry.sourceByItemRef).every(([ref, url]) => id(ref) && typeof url === 'string' && url.length <= 10000 && programMapReviewUrl(url)));
}
export function projectProgramLegacyMapReviews(flows: readonly PersonalWorkspacePocFlow[], store?: ProgramLegacyMapReviewStore, lifecycle?: ProgramLegacySourceLifecycleStore) {
  return flows.map(flow => {
    const group = flow.presentation?.mapGroup, entry = group && store?.groups[group.groupRef];
    const qualityHold = group && programLegacyMapQualityHold(group.ownerId);
    if (group && qualityHold) return { ...flow, presentation: { ...flow.presentation, mapGroup: { ...group,
      executionState: 'review-hold' as const, reviewReasons: [...new Set([...group.reviewReasons, qualityHold])] } } };
    if (!group || !entry) return flow;
    const view = readProgramLegacyMapReview(flows, group.groupRef, lifecycle);
    return view && validReview(entry, view) ? { ...flow, presentation: { ...flow.presentation, mapGroup: { ...group, executionState: 'executable' as const } } } : flow;
  });
}
export function transitionProgramLegacyMapReview(flows: readonly PersonalWorkspacePocFlow[], before: ProgramLegacyMapReviewStore | undefined, action: ProgramLegacyMapReviewAction, lifecycle?: ProgramLegacySourceLifecycleStore) {
  const fail = (reason: 'invalid' | 'missing' | 'conflict' | 'unresolved') => ({ ok: false as const, reason });
  const view = readProgramLegacyMapReview(flows, action.groupRef, lifecycle);
  if (!view) return fail('missing');
  if (view.sourceToken !== action.expectedSourceToken) return fail('conflict');
  const next: ProgramLegacyMapReviewRecord = { requestId: action.requestId, sourceToken: action.expectedSourceToken, reviewedAt: action.now,
    acknowledgedReasons: action.acknowledgedReasons, sourceByItemRef: action.sourceByItemRef };
  if (!validReview(next, view)) return fail(view.blockers.length ? 'unresolved' : 'invalid');
  const existing = before?.groups[action.groupRef];
  if (existing?.requestId === action.requestId) return sourceCanonical(existing) === sourceCanonical(next)
    ? { ok: true as const, changed: false, store: before! } : fail('conflict');
  const store: ProgramLegacyMapReviewStore = { version: 1, groups: { ...before?.groups, [action.groupRef]: next } };
  return validateProgramLegacyMapReviews(store) ? { ok: true as const, changed: true, store } : fail('invalid');
}
