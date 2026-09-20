import {
  programClone, programFailure, programResult,
  type ProgramData, type ProgramPrivateSpace, type ProgramTransition,
} from './contract';
import { programIdentifier, validateProgramData } from './program-data';
import { textWorkspaceModel as M, type TextDocument, type TextLine } from './text-workspace';
import {
  getPersonalWorkspacePocFlowItemFieldOwnership,
  toPersonalWorkspacePocQuickItemRef,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocState,
} from '../personal-workspace-poc-contract';
import { isPersonalWorkspacePocMemberInactive } from '../personal-workspace-poc-state';
import {
  readPersonalWorkspacePocTaskSourceContext,
} from '../personal-workspace-poc-source-attributes';
import { buildPersonalWorkspacePocTasks, type PersonalWorkspacePocTask } from '../personal-workspace-poc-view-model';
import { parsePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import type { PersonalWorkspacePocSourceCandidateStore } from '../personal-workspace-poc-source-candidates';
import { inspectProgramLegacySnapshotPayload } from './legacy-snapshot';
import { partitionProgramLegacyCapabilities } from './legacy-capabilities';
import { sourceCanonical, programLegacyKeepsReviewedMapBlocks } from './legacy-source-lifecycle-contract';
import { programLegacyPlanExecutionDate } from './program-legacy-plan-contract';

export type ProgramLegacyOptions = { sourceCandidateStore?: PersonalWorkspacePocSourceCandidateStore; sourceLifecycle?: import('./legacy-source-lifecycle-contract').ProgramLegacySourceLifecycleStore; mapReview?: import('./legacy-map-review').ProgramLegacyMapReviewStore; planSelections?: import('./program-legacy-plan-contract').ProgramLegacyPlanSelections; mapMembership?: import('./legacy-map-membership-state').ProgramLegacyMapMembershipStore };

export type ProgramLegacyIssue = {
  code: 'invalid-source' | 'invalid-source-candidates' | 'invalid-state' | 'invalid-map-group' | 'map-review-required' | 'recurrence-window-required'
    | 'unsupported-schedule' | 'unrepresentable-text' | 'snapshot-limit';
  ref: string | null;
};
export type ProgramLegacyInspection =
  | { ok: true; flowCount: number; quickItemCount: number; mapGroupCount: number }
  | { ok: false; issues: ProgramLegacyIssue[] };

/** Stable tuple-derived name, never title/order-derived. Every generated ID is
 * also collision-checked against all existing and newly generated entities. */
export function programLegacyIdentity(kind: string, ...parts: string[]): string {
  const input = JSON.stringify([kind, ...parts]);
  const hashes = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35].map(seed => {
    let hash = seed;
    for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 0x01000193);
    return (hash >>> 0).toString(16).padStart(8, '0');
  });
  return `legacy-${kind}-${hashes.join('')}`;
}

function singleLine(value: string): boolean {
  return !/[\r\n]/u.test(value) && value.trim() === value && value.length > 0;
}

function prepare(baseModel: PersonalWorkspacePocReadModel, state: PersonalWorkspacePocState, options: ProgramLegacyOptions = {}, partial = false) {
  const fail = (code: ProgramLegacyIssue['code'], ref: string | null = null) => ({ ok: false as const, issues: [{ code, ref }] });
  try {
    const store = options.sourceCandidateStore;
    const checked = inspectProgramLegacySnapshotPayload({ model: baseModel, state, ...(store === undefined ? {} : { sourceCandidateStore: store }), ...(options.sourceLifecycle === undefined ? {} : { sourceLifecycle: options.sourceLifecycle }), ...(options.mapReview === undefined ? {} : { mapReview: options.mapReview }), ...(options.planSelections === undefined ? {} : { planSelections: options.planSelections }), ...(options.mapMembership === undefined ? {} : { mapMembership: options.mapMembership }) });
    if (!checked.ok) return checked;
    const { raw, model, sourceIndex } = checked;
    const issues: ProgramLegacyIssue[] = model.flows.flatMap(flow => flow.presentation?.mapGroup?.executionState === 'review-hold'
      ? [{ code: 'map-review-required' as const, ref: flow.ref }] : []);
    // K3's validated effective projection intentionally has no typed item map.
    // Reuse its exact raw parser ONLY as a conservative recurrence guard, never
    // to guess Item identities, source times or a mixed-resolution typed map.
    for (const effective of Object.values(store?.effectiveVersions ?? {})) {
      const envelope = store!.envelopes[effective.candidateId];
      const sourceTexts = [effective.sourceRevision.rawText, envelope.mine.rawText];
      for (const text of sourceTexts) {
        const parsed = parsePersonalWorkspacePocAuthoring(text);
        if (parsed.blockingIssues.length) return fail('invalid-source-candidates', effective.targetFlowRef);
        if (parsed.items.some(item => item.recurrence)) {
          issues.push({ code: 'recurrence-window-required', ref: effective.targetFlowRef }); break;
        }
      }
    }
    for (const flow of model.flows) {
      if (!programIdentifier(flow.ref) || !programIdentifier(flow.savedCopyId) || !programIdentifier(flow.flowId)
        || !singleLine(flow.title) || flow.title.length > 1000) issues.push({ code: 'unrepresentable-text', ref: flow.ref });
      const typed = checked.sourceContextByFlow.get(flow.ref);
      const context = typed ? { ok: true as const, itemContextByRef: typed } : readPersonalWorkspacePocTaskSourceContext(sourceIndex, flow);
      if (!context.ok) return fail('invalid-source', flow.ref);
      for (const item of flow.items) {
        if (!programIdentifier(item.ref) || !singleLine(item.title)) issues.push({ code: 'unrepresentable-text', ref: item.ref });
        const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
        if (ownership.dateDerivation.strategy === 'unsupported-source-schedule') issues.push({ code: 'unsupported-schedule', ref: item.ref });
        const attrs = context.itemContextByRef.get(item.ref)?.attributes;
        if (attrs?.recurrence) issues.push({ code: 'recurrence-window-required', ref: item.ref });
      }
    }
    // Occurrences must never collapse into their series' ordinary checkbox.
    if (Object.keys(state.occurrencePlacements ?? {}).length || Object.keys(state.occurrenceCompletions ?? {}).length) {
      if (!issues.some(issue => issue.code === 'recurrence-window-required')) issues.push({ code: 'recurrence-window-required', ref: null });
    }
    if (state.quickItems.some(item => !singleLine(item.title))) issues.push({ code: 'unrepresentable-text', ref: null });
    if (issues.length && !partial) return { ok: false as const, issues };
    const partition = partitionProgramLegacyCapabilities(checked.payload);
    if (!partition.ok) return partition;
    const capabilities = new Map(partition.items.map(item => [item.itemRef, item]));
    const tasks = buildPersonalWorkspacePocTasks(model, state).map(task => {
      const typed = task.flowRef ? checked.sourceContextByFlow.get(task.flowRef) : undefined;
      const flow = task.flowRef ? model.flows.find(flow => flow.ref === task.flowRef) : undefined;
      const ordinaryContext = !typed && flow ? readPersonalWorkspacePocTaskSourceContext(sourceIndex, flow) : null;
      const time = state.placements[task.ref]?.time ?? (typed ?? (ordinaryContext?.ok ? ordinaryContext.itemContextByRef : undefined))?.get(task.ref)?.attributes.time;
      const date = programLegacyPlanExecutionDate(task.flowRef ? options.planSelections?.flows[task.flowRef] : undefined, state, task.ref, task.date ?? null);
      return { ...task, date: date ?? undefined, ...(time ? { time } : {}) };
    });
    return { ok: true as const, raw, model, sourceIndex, sourceContextByFlow: checked.sourceContextByFlow,
      capabilities, issues, tasks: tasks.filter(task =>
        task.kind === 'quick_item' ? singleLine(task.title) : capabilities.get(task.ref)?.capability === 'ordinary' || capabilities.get(task.ref)?.reason === 'source-item-execution-archived'
          || capabilities.get(task.ref)?.reason === 'map-review-required' && !!task.flowRef && model.flows.some(flow => flow.ref === task.flowRef && programLegacyKeepsReviewedMapBlocks(flow, options))) };
  } catch { return fail('invalid-source'); }
}

/** Detailed read-only diagnostics for keeping the original surface available. */
export function inspectProgramLegacy(baseModel: PersonalWorkspacePocReadModel, state: PersonalWorkspacePocState, options: ProgramLegacyOptions = {}): ProgramLegacyInspection {
  const result = prepare(baseModel, state, options);
  return result.ok ? { ok: true, flowCount: result.model.flows.filter(flow => !isPersonalWorkspacePocMemberInactive(state, flow.ref)).length,
    quickItemCount: result.tasks.filter(task => task.kind === 'quick_item').length,
    mapGroupCount: new Set(result.model.flows.flatMap(flow => flow.presentation?.mapGroup ? [flow.presentation.mapGroup.groupRef] : [])).size }
    : result;
}

/**
 * One-time private projection from already-decoded inputs. No storage access,
 * operating readers/writers, publication or clock calls. Snapshot and bindings
 * are the provenance; future source changes are NOT an implicit refresh.
 * The old surface still owns its namespace, so edits there are not live-synced.
 */
export function hydrateProgramLegacy(data: ProgramData, baseModel: PersonalWorkspacePocReadModel,
  state: PersonalWorkspacePocState, input: ProgramLegacyOptions & { actorId: string; preserveUnsupported?: boolean }): ProgramTransition<string> {
  if (!validateProgramData(data)) return programFailure(data, 'invalid');
  if (!data.actors.some(actor => actor.id === input.actorId)) return programFailure(data, 'forbidden');
  const prepared = prepare(baseModel, state, input, input.preserveUnsupported === true);
  if (!prepared.ok) return programFailure(data, prepared.issues.some(issue => issue.code === 'snapshot-limit') ? 'limit'
    : prepared.issues.some(issue => ['invalid-source', 'invalid-source-candidates', 'invalid-state', 'invalid-map-group'].includes(issue.code)) ? 'invalid' : 'unresolved');
  const previous = data.spaces[input.actorId];
  if (previous.legacySnapshot) {
    if (previous.legacySnapshot.workspaceId !== state.workspaceId) return programFailure(data, 'conflict');
    const imported = JSON.parse(previous.legacySnapshot.raw) as ProgramLegacyOptions;
    // A changed/omitted applied source requires an explicit reconciliation path;
    // never label an old private projection as up-to-date or reset its edits.
    if (JSON.stringify(imported.sourceCandidateStore?.effectiveVersions ?? {})
      !== JSON.stringify(input.sourceCandidateStore?.effectiveVersions ?? {})) return programFailure(data, 'conflict');
    if (sourceCanonical(imported.sourceLifecycle ?? null) !== sourceCanonical(input.sourceLifecycle ?? null)) return programFailure(data, 'conflict');
    if (sourceCanonical(imported.mapReview ?? null) !== sourceCanonical(input.mapReview ?? null)) return programFailure(data, 'conflict');
    if (sourceCanonical(imported.planSelections ?? null) !== sourceCanonical(input.planSelections ?? null)) return programFailure(data, 'conflict');
    if (sourceCanonical(imported.mapMembership ?? null) !== sourceCanonical(input.mapMembership ?? null)) return programFailure(data, 'conflict');
    return programResult(data, data, 'legacy-projection-existing');
  }
  if (previous.savedBindings.length || Object.keys(previous.legacyQuickItemLines).length) return programFailure(data, 'conflict');
  const next = programClone(data), space = next.spaces[input.actorId];
  const ids = new Set([...space.text.folders.map(folder => folder.id),
    ...[...space.text.documents, ...space.text.flows].flatMap(doc => [doc.id, ...doc.lines.map(line => line.id)])]);
  const allocate = (kind: string, ...identity: string[]) => {
    const id = programLegacyIdentity(kind, state.workspaceId, ...identity);
    if (ids.has(id)) throw new Error('identity-collision');
    ids.add(id); return id;
  };
  try {
    const folderIds = new Map(state.folders.map(folder => [folder.folderId, allocate('folder', folder.folderId)]));
    for (const folder of [...state.folders].sort((a, b) => a.orderKey - b.orderKey || a.folderId.localeCompare(b.folderId))) {
      space.text.folders.push({ id: folderIds.get(folder.folderId)!, title: folder.title,
        parentId: folder.parentFolderId ? folderIds.get(folder.parentFolderId)! : null });
    }
    const folderFor = (ref: string) => {
      const original = state.memberships.find(member => member.memberRef === ref)?.folderId;
      return original ? folderIds.get(original)! : 'folder-unfiled';
    };
    const lineByRef = new Map<string, string>();
    const taskByRef = new Map(prepared.tasks.map(task => [task.ref, task]));
    const append = (doc: TextDocument, ref: string, label: string, value: string | undefined) => {
      if (value === undefined || value === '') return;
      value.split(/\r?\n/u).forEach((part, index) => doc.lines.push({ id: allocate('detail', ref, label, String(index)), text: `  - ${label}: ${part}` }));
    };
    const taskLines = (doc: TextDocument, task: PersonalWorkspacePocTask, tuple: string[]) => {
      const id = allocate('item', ...tuple), line: TextLine = { id, text: `- [${task.completed ? 'x' : ' '}] ${task.title}` };
      doc.lines.push(line); lineByRef.set(task.ref, id);
      space.text.taskScopes[id] = doc.id; space.text.itemScopes[id] = doc.id;
      space.legacyTimelinePolicies[id] = task.timelinePolicy;
      append(doc, task.ref, '날짜', task.date); append(doc, task.ref, '시간', task.time);
      append(doc, task.ref, '메모', task.memo);
      append(doc, task.ref, '원문 설명', task.description);
      append(doc, task.ref, '완료 기준', task.completionCriterion);
      const completion = task.kind === 'quick_item' ? state.quickItems.find(item => task.ref === toPersonalWorkspacePocQuickItemRef(item.quickItemId)) : state.completions[task.ref];
      append(doc, task.ref, '기존 완료 시각', completion?.completedAt);
      return id;
    };
    const membershipOrder = (ref: string) => state.memberships.find(member => member.memberRef === ref)?.orderKey ?? Number.MAX_SAFE_INTEGER;
    const flows = [...prepared.model.flows].sort((a, b) => membershipOrder(a.ref) - membershipOrder(b.ref)
      || (a.presentation?.mapGroup?.childOrder ?? 0) - (b.presentation?.mapGroup?.childOrder ?? 0) || a.ref.localeCompare(b.ref));
    for (const flow of flows) {
      if (isPersonalWorkspacePocMemberInactive(state, flow.ref)) continue;
      const documentId = allocate('flow', flow.savedCopyId, flow.flowId, flow.ref), folderId = folderFor(flow.ref);
      // This is a local exact-snapshot identifier, not an asserted publication version.
      const sourceRevision = `legacy-snapshot:${programLegacyIdentity('revision', JSON.stringify(flow))}`;
      const doc = { id: documentId, title: flow.title.replace(/[\r\n]+/gu, ' '), folderId,
        folder: space.text.folders.find(folder => folder.id === folderId)!.title,
        private: true as const, sourceVersion: sourceRevision, lines: [] as TextLine[] };
      space.text.flows.push(doc);
      const binding = { savedCopyId: flow.savedCopyId, flowId: flow.flowId, flowRef: flow.ref, documentId,
        itemLines: {} as Record<string, string>, sourceRevision };
      space.savedBindings.push(binding);
      const group = flow.presentation?.mapGroup;
      if (group) doc.lines.push({ id: allocate('map-label', flow.ref), text: `Map: ${group.title} · ${group.childOrder + 1}/${group.childCount}${group.executionState === 'review-hold' ? ' · 원문 검토 필요' : ''}` });
      const typed = prepared.sourceContextByFlow.get(flow.ref);
      const context = typed ? { ok: true as const, itemContextByRef: typed } : readPersonalWorkspacePocTaskSourceContext(prepared.sourceIndex, flow);
      if (!context.ok) throw new Error('source-context');
      for (const item of [...flow.items].sort((a, b) => a.sourceOrder - b.sourceOrder)) {
        const capability = prepared.capabilities.get(item.ref)!;
        const keptMapBlock = capability.reason === 'map-review-required' && programLegacyKeepsReviewedMapBlocks(flow, input);
        if (capability.capability !== 'ordinary' && capability.reason !== 'source-item-execution-archived' && !keptMapBlock) {
          const handedOff = input.sourceLifecycle?.owners[flow.ref]?.executionHandoffs?.itemRefs.includes(item.ref);
          const id = allocate(capability.capability === 'series' && handedOff ? 'series-item' : 'item', flow.savedCopyId, flow.flowId, item.itemId, item.ref);
          const label = { series: '반복 규칙 · 회차별 실행', held: 'Map 검토 보류', unsupported: '원문 매핑 확인 필요' }[capability.capability];
          // Plain metadata, NEVER a checkbox: binding retains canonical source Item identity.
          doc.lines.push({ id, text: `${label}: ${JSON.stringify(item.title)}` }); binding.itemLines[item.ref] = id;
          const attrs = context.itemContextByRef.get(item.ref)?.attributes;
          if (attrs) doc.lines.push({ id: allocate('source-metadata', item.ref), text: `원문 속성: ${JSON.stringify(attrs)}` });
          continue;
        }
        const task = taskByRef.get(item.ref);
        if (!task) throw new Error('missing-ordinary-task');
        binding.itemLines[item.ref] = taskLines(doc, task, [flow.savedCopyId, flow.flowId, item.itemId, item.ref]);
        const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
        append(doc, item.ref, '원문 날짜', ownership.date.source.value);
        append(doc, item.ref, '원문 일정', item.sourceTimingLabel);
        append(doc, item.ref, '원문 구역', item.sectionTitle);
        const attrs = context.itemContextByRef.get(item.ref)?.attributes;
        // These are source instructions, not personal execution state. Keep the
        // entire typed payload in the private snapshot and label it in the text.
        if (attrs) for (const [key, value] of Object.entries(attrs)) {
          if (['description', 'time', 'completionCriteria'].includes(key)) continue;
          append(doc, item.ref, `원문 ${key}`, typeof value === 'string' ? value : JSON.stringify(value));
        }
      }
    }
    // QuickItems remain plain documents in their actual folder, not public or
    // creator-owned Flow copies. A document per folder retains folder ownership.
    const quickDocs = new Map<string, TextDocument>();
    for (const task of prepared.tasks.filter(task => task.kind === 'quick_item').sort((a, b) => membershipOrder(a.ref) - membershipOrder(b.ref))) {
      const folderId = folderFor(task.ref);
      let doc = quickDocs.get(folderId);
      if (!doc) {
        doc = { id: allocate('quick-document', folderId), title: '기존 빠른 할 일', folderId,
          folder: space.text.folders.find(folder => folder.id === folderId)!.title, lines: [] };
        quickDocs.set(folderId, doc); space.text.documents.push(doc);
      }
      const lineId = taskLines(doc, task, [task.ref]);
      // Canonical QuickItem scope is its folder; a plain document is not a Flow.
      space.text.taskScopes[lineId] = folderId; space.text.itemScopes[lineId] = folderId;
      space.legacyQuickItemLines[task.ref] = lineId;
    }
    for (const order of state.timelineOrders) {
      const key = order.context === 'undated' ? 'undated' : order.context === 'date' ? order.contextKey : null;
      if (key === null) continue; // distinct overdue order remains in the exact snapshot/read API
      if (!Object.hasOwn(space.timelineOrders, key)) space.timelineOrders[key] = order.orderedRefKeys.flatMap(ref => lineByRef.get(ref) ? [lineByRef.get(ref)!] : []);
    }
    space.legacySnapshot = { workspaceId: state.workspaceId, revision: state.revision, raw: prepared.raw };
    if (!M.validate(space.text) || !validateProgramData(next)) return programFailure(data, 'limit');
    // Refuse grammar collisions instead of silently converting source titles.
    const projectedTasks = new Map(M.tasks(space.text).map(task => [task.id, task]));
    for (const task of prepared.tasks) {
      const projected = projectedTasks.get(lineByRef.get(task.ref)!);
      if (!projected || projected.title !== task.title || projected.done !== task.completed
        || projected.date !== (task.date ?? null) || projected.time !== (task.time ?? null)
        || projected.note !== (task.memo ?? '')) return programFailure(data, 'unresolved');
    }
    return programResult(data, next, 'legacy-projection');
  } catch { return programFailure(data, 'conflict'); }
}

function snapshot(space: ProgramPrivateSpace): ({ model: PersonalWorkspacePocReadModel; state: PersonalWorkspacePocState } & ProgramLegacyOptions) | null {
  try {
    if (!space.legacySnapshot) return null;
    const parsed = JSON.parse(space.legacySnapshot.raw);
    return inspectProgramLegacySnapshotPayload(parsed).ok ? parsed : null;
  } catch { return null; }
}

/** Map child grouping remains independent of personal folder placement. */
export function readProgramLegacyMapGroups(space: ProgramPrivateSpace) {
  const original = snapshot(space);
  if (!original) return [];
  const groups = new Map<string, { groupRef: string; ownerId: string; title: string;
    executionState: 'executable' | 'review-hold'; reviewReasons: readonly string[];
    children: { flowRef: string; documentId: string | null; childOrder: number; childCount: number; inactive: boolean }[] }>();
  for (const flow of [...original.model.flows, ...(original.state.authoredFlows ?? [])]) {
    const metadata = flow.presentation?.mapGroup;
    if (!metadata) continue;
    const group = groups.get(metadata.groupRef) ?? { groupRef: metadata.groupRef, ownerId: metadata.ownerId, title: metadata.title,
      executionState: metadata.executionState, reviewReasons: [...metadata.reviewReasons], children: [] };
    group.children.push({ flowRef: flow.ref, documentId: space.savedBindings.find(binding => binding.flowRef === flow.ref)?.documentId ?? null,
      childOrder: metadata.childOrder, childCount: metadata.childCount, inactive: isPersonalWorkspacePocMemberInactive(original.state, flow.ref) });
    groups.set(metadata.groupRef, group);
  }
  return [...groups.values()].map(group => ({ ...group, children: group.children.sort((a, b) => a.childOrder - b.childOrder) }));
}

/** Includes overdue context without merging it into a calendar-date order. */
export function readProgramLegacyTimelineOrders(space: ProgramPrivateSpace) {
  const original = snapshot(space);
  if (!original) return [];
  const lines = new Map([...space.savedBindings.flatMap(binding => Object.entries(binding.itemLines)), ...Object.entries(space.legacyQuickItemLines)]);
  return original.state.timelineOrders.map(order => ({ context: order.context, contextKey: order.contextKey, revision: order.revision,
    lineIds: order.orderedRefKeys.flatMap(ref => lines.get(ref) ? [lines.get(ref)!] : []) }));
}
