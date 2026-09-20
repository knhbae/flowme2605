import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createProgramData, validateProgramData } from './program-data';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { textWorkspaceModel as M } from './text-workspace';
import {
  hydrateProgramLegacy, inspectProgramLegacy, programLegacyIdentity,
  readProgramLegacyMapGroups, readProgramLegacyTimelineOrders,
} from './legacy-projection';
import {
  toPersonalWorkspacePocFlowItemRef, toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocMapGroupRef,
  toPersonalWorkspacePocQuickItemRef,
  type PersonalWorkspacePocFlow, type PersonalWorkspacePocOrigin, type PersonalWorkspacePocReadModel,
} from '../personal-workspace-poc-contract';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState, isPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import {
  createPersonalWorkspacePocLocalFixtureEnvelope, createPersonalWorkspacePocSourceCandidateStore,
  stagePersonalWorkspacePocSourceCandidate, resolvePersonalWorkspacePocSourceCandidateChange,
  applyPersonalWorkspacePocSourceCandidate, deferPersonalWorkspacePocSourceCandidate,
  isPersonalWorkspacePocSourceCandidateStore,
} from '../personal-workspace-poc-source-candidates';

const NOW = '2026-09-12T00:00:00.000Z', ACTOR = 'local-user';
type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
function flow(id: string, origin: PersonalWorkspacePocOrigin = 'legacy-saved-plan'): Mutable<PersonalWorkspacePocFlow> {
  const savedCopyId = `saved-${id}`, flowId = 'same-flow', itemId = 'same-item';
  return { ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId), savedCopyId, flowId,
    title: '같은 Flow 제목', origin, sourceSlug: `slug-${id}`,
    items: [{ ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, itemId), savedCopyId, flowId, itemId,
      title: '같은 할 일', description: '원문 설명', completionCriterion: '원문 완료 기준', sourceOrder: 0, sourceDate: '2026-09-10' }] };
}
function authored(rawText = '# 직접 쓴 문서\n- [x] 작성한 일\n  - 날짜: 2026-09-13\n  - 시간: 09:30\n') {
  const result = materializePersonalWorkspacePocAuthoring({ handoffId: 'handoff-one', documentId: 'doc-one', revisionId: 'revision-one', rawText, committedAt: NOW });
  assert.ok(result.ok); return result.flow;
}
function fixture() {
  const data = createProgramData(), state = createPersonalWorkspacePocState(NOW);
  const model: Mutable<PersonalWorkspacePocReadModel> = { version: 1, flows: [flow('first')] };
  return { data, model, state };
}
function accept(result: ProgramTransition<string>): ProgramData {
  assert.ok(result.ok, result.ok ? undefined : result.reason);
  assert.equal(validateProgramData(result.data), true); return result.data;
}
function frozen<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); }
  return value;
}

test('L01 five origins create private bound canonical tasks without any public copies', () => {
  const { data, state } = fixture();
  const model: PersonalWorkspacePocReadModel = { version: 1, flows: [flow('map', 'source-backed-map'), flow('draft', 'personal-draft'), flow('canonical', 'canonical-personal-copy'), flow('old')] };
  const handoff = authored(); state.authoredFlows = [handoff];
  state.authoringReceipts = [{ handoffId: handoff.authoring.handoffId, flowRef: handoff.ref, committedAt: NOW }];
  const result = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR })), space = result.spaces[ACTOR];
  assert.equal(space.savedBindings.length, 5); assert.equal(space.text.flows.length, 5);
  assert.equal(M.tasks(space.text).length, 5); assert.equal(new Set(M.tasks(space.text).map(task => task.id)).size, 5);
  for (const entry of [...model.flows, handoff]) {
    const binding = space.savedBindings.find(binding => binding.flowRef === entry.ref)!;
    assert.equal(binding.savedCopyId, entry.savedCopyId); assert.equal(binding.flowId, entry.flowId);
    assert.ok(binding.itemLines[entry.items[0].ref]); assert.equal(binding.itemLines[entry.items[0].itemId], undefined);
  }
  assert.deepEqual(result.public, data.public); assert.deepEqual(space.copies, []);
  assert.deepEqual(result.spaces['participant-jihun'], data.spaces['participant-jihun']);
  assert.equal(M.tasks(space.text).find(task => task.title === '작성한 일')?.done, false, 'source checked is not an execution record');
  assert.equal(M.tasks(space.text).find(task => task.title === '작성한 일')?.time, '09:30');
  assert.equal(space.legacySnapshot?.raw, JSON.stringify({ model, state }));
});

test('L02 frozen caller objects and the operating storage boundary are untouched', () => {
  const { data, state, model } = fixture(), before = JSON.stringify({ data, state, model });
  accept(hydrateProgramLegacy(frozen(data), frozen(model), frozen(state), { actorId: ACTOR }));
  assert.equal(JSON.stringify({ data, state, model }), before);
  const source = readFileSync(new URL('./legacy-projection.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|fetch|buildPersonalWorkspacePocReadModel|persistPersonalWorkspace)\s*[.(]/u);
  assert.doesNotMatch(source, /from ['"].*(?:read-model|storage|store|controller)['"]/u);
});

test('L03 personal overlay, placement, memo and completion remain separate from source defaults', () => {
  const { data, state, model } = fixture(), entry = model.flows[0], item = entry.items[0];
  state.personalPlanOverlays = { [entry.ref]: { flowRef: entry.ref, savedCopyId: entry.savedCopyId, flowId: entry.flowId,
    title: '개인 이름', items: { [item.ref]: { itemRef: item.ref, title: '개인 할 일', memo: '개인 메모\n두 줄', schedule: { mode: 'fixed_date', date: '2026-09-15' } } } } };
  state.placements[item.ref] = { itemRef: item.ref, scheduleMode: 'fixed_date', date: '2026-09-20', time: '14:30', timelinePolicy: 'excluded' };
  state.completions[item.ref] = { status: 'completed', completedAt: '2026-09-11T16:15:00.000Z' };
  const space = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR })).spaces[ACTOR];
  const task = M.tasks(space.text)[0], raw = M.raw(space.text.flows[0]);
  assert.equal(task.title, '개인 할 일'); assert.equal(task.date, '2026-09-20'); assert.equal(task.time, '14:30'); assert.equal(task.done, true);
  assert.equal(task.note, '개인 메모\n두 줄'); assert.equal(space.text.flows[0].title, '개인 이름');
  assert.match(raw, /원문 설명: 원문 설명/u); assert.match(raw, /원문 날짜: 2026-09-10/u);
  assert.match(raw, /기존 완료 시각: 2026-09-11T16:15:00.000Z/u);
  assert.equal(space.legacyTimelinePolicies[task.id], 'excluded'); assert.deepEqual(space.text.progressRecords, []);
});

test('L04 unscheduled placement does not revive source date or invent relative schedule anchors', () => {
  const { data, state, model } = fixture(), item = model.flows[0].items[0];
  state.placements[item.ref] = { itemRef: item.ref, scheduleMode: 'unscheduled', timelinePolicy: 'included' };
  const result = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR }));
  assert.equal(M.tasks(result.spaces[ACTOR].text)[0].date, null);
  assert.match(M.raw(result.spaces[ACTOR].text.flows[0]), /원문 날짜: 2026-09-10/u);
});

test('L05 folder hierarchy, QuickItem identity, completion and private memo survive', () => {
  const { data, state, model } = fixture();
  state.folders = [{ folderId: 'parent', title: '내 폴더', orderKey: 2 }, { folderId: 'child', title: '하위', parentFolderId: 'parent', orderKey: 1 }];
  const quickRef = toPersonalWorkspacePocQuickItemRef('quick-one');
  state.quickItems = [{ quickItemId: 'quick-one', title: '전화', memo: '내 번호 메모', status: 'completed', completedAt: NOW, createdAt: NOW }];
  state.placements[quickRef] = { itemRef: quickRef, scheduleMode: 'fixed_date', date: '2026-09-14', timelinePolicy: 'included' };
  state.memberships = [{ member: 'saved_flow', memberRef: model.flows[0].ref, folderId: 'parent', orderKey: 1 }, { member: 'quick_item', memberRef: quickRef, folderId: 'child', orderKey: 0 }];
  const space = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR })).spaces[ACTOR];
  const child = space.text.folders.find(folder => folder.title === '하위')!, parent = space.text.folders.find(folder => folder.title === '내 폴더')!;
  assert.equal(child.parentId, parent.id); assert.equal(space.text.flows[0].folderId, parent.id);
  const quick = M.tasks(space.text).find(task => task.id === space.legacyQuickItemLines[quickRef])!;
  assert.equal(quick.docId, space.text.documents[0].id); assert.equal(quick.scopeId, child.id);
  assert.equal(quick.note, '내 번호 메모'); assert.equal(quick.done, true); assert.equal(quick.date, '2026-09-14');
  assert.deepEqual(space.text.progressRecords, []);
});

test('L06 exact rerun and changed source do not overwrite personal text or execution records', () => {
  const { data, state, model } = fixture();
  const first = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR }));
  const space = first.spaces[ACTOR], task = M.tasks(space.text)[0];
  space.text = M.updateTask(space.text, task.id, { title: '내가 고친 제목', date: '2026-10-01' });
  space.text = M.recordProgress(space.text, task.id, '2026-09-12', 45);
  const changedSource = programClone(model); changedSource.flows[0].items[0].title = '새 원문 제목';
  state.revision = 1;
  const result = hydrateProgramLegacy(first, changedSource, state, { actorId: ACTOR });
  assert.ok(result.ok); assert.equal(result.changed, false); assert.equal(result.data, first);
  assert.equal(M.tasks(result.data.spaces[ACTOR].text)[0].title, '내가 고친 제목');
  assert.equal(M.latestProgress(result.data.spaces[ACTOR].text, task.id)?.percent, 45);
  assert.equal(result.data.spaces[ACTOR].legacySnapshot?.revision, 0);
});

test('L07 stable tuple IDs ignore flow/item titles and array order', () => {
  const { data, state } = fixture(); const a = flow('a'), b = flow('b');
  const first = accept(hydrateProgramLegacy(data, { version: 1, flows: [a, b] }, state, { actorId: ACTOR }));
  const secondA = programClone(a); secondA.title = '바뀐 제목'; secondA.items[0].title = '바뀐 일';
  const second = accept(hydrateProgramLegacy(data, { version: 1, flows: [b, secondA] }, state, { actorId: ACTOR }));
  const binding = (value: ProgramData) => value.spaces[ACTOR].savedBindings.find(row => row.flowRef === a.ref)!;
  assert.equal(binding(first).documentId, binding(second).documentId); assert.deepEqual(binding(first).itemLines, binding(second).itemLines);
});

test('L08 actual Map child order remains inspectable apart from personal folders', () => {
  const { data, state } = fixture(), a = flow('a', 'source-backed-map'), b = flow('b', 'source-backed-map');
  const map = { groupRef: toPersonalWorkspacePocMapGroupRef('map-one'), ownerId: 'map-one', title: '이사 Map', childCount: 2, executionState: 'executable' as const, reviewReasons: [] };
  a.presentation = { mapGroup: { ...map, childOrder: 1 } }; b.presentation = { mapGroup: { ...map, childOrder: 0 } };
  const space = accept(hydrateProgramLegacy(data, { version: 1, flows: [a, b] }, state, { actorId: ACTOR })).spaces[ACTOR];
  const groups = readProgramLegacyMapGroups(space); assert.equal(groups.length, 1);
  assert.equal(groups[0].executionState, 'executable'); assert.deepEqual(groups[0].reviewReasons, []);
  assert.deepEqual(groups[0].children.map(child => child.flowRef), [b.ref, a.ref]);
  assert.ok(groups[0].children.every(child => child.documentId));
  assert.match(M.raw(space.text.flows[0]), /Map: 이사 Map · 1\/2/u);
});

test('L09 missing or inconsistent Map child aborts all projection', () => {
  const { data, model, state } = fixture();
  model.flows[0].presentation = { mapGroup: { groupRef: toPersonalWorkspacePocMapGroupRef('map'), ownerId: 'map', title: '묶음', childOrder: 0, childCount: 2, executionState: 'executable', reviewReasons: [] } };
  const result = hydrateProgramLegacy(data, model, state, { actorId: ACTOR });
  assert.equal(result.ok, false); assert.equal(result.data, data); assert.equal(data.spaces[ACTOR].text.flows.length, 0);
  assert.deepEqual(inspectProgramLegacy(model, state), { ok: false, issues: [{ code: 'invalid-map-group', ref: toPersonalWorkspacePocMapGroupRef('map') }] });
});

test('L10 date/undated order is mapped while overdue retains its own context', () => {
  const { data, state } = fixture(), a = flow('a'), b = flow('b');
  state.revision = 1;
  const refs = [b.items[0].ref, a.items[0].ref];
  state.timelineOrders = [{ context: 'date', contextKey: '2026-09-10', orderedRefKeys: refs, revision: 1 },
    { context: 'overdue', contextKey: '2026-09-12', orderedRefKeys: [...refs].reverse(), revision: 1 }];
  const space = accept(hydrateProgramLegacy(data, { version: 1, flows: [a, b] }, state, { actorId: ACTOR })).spaces[ACTOR];
  const lookup = (ref: string) => space.savedBindings.flatMap(row => Object.entries(row.itemLines)).find(([key]) => key === ref)![1];
  assert.deepEqual(space.timelineOrders['2026-09-10'], refs.map(lookup));
  assert.equal(space.timelineOrders['2026-09-12'], undefined);
  assert.deepEqual(readProgramLegacyTimelineOrders(space)[1], { context: 'overdue', contextKey: '2026-09-12', revision: 1, lineIds: [...refs].reverse().map(lookup) });
});

test('L11 inactive saved content stays suppressed rather than being resurrected', () => {
  const { data, state, model } = fixture();
  state.deletedMembers = [{ member: 'saved_flow', memberRef: model.flows[0].ref, deletedAt: NOW }];
  const space = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR })).spaces[ACTOR];
  assert.deepEqual(M.tasks(space.text), []); assert.equal(space.savedBindings.length, 0);
  assert.match(space.legacySnapshot!.raw, /deletedMembers/u);
});

test('L12 corrupt identities/state and duplicate sources fail closed with zero partial projection', () => {
  for (const corrupt of ['ref', 'state', 'duplicate', 'version'] as const) {
    const { data, state, model } = fixture();
    if (corrupt === 'ref') model.flows[0].items[0].ref = 'foreign-ref';
    if (corrupt === 'state') state.placements.foreign = { itemRef: 'foreign', scheduleMode: 'unscheduled', timelinePolicy: 'auto' };
    if (corrupt === 'duplicate') model.flows = [...model.flows, model.flows[0]];
    if (corrupt === 'version') model.version = 10 as 1;
    const result = hydrateProgramLegacy(data, model, state, { actorId: ACTOR });
    assert.equal(result.ok, false, corrupt); assert.equal(result.data, data, corrupt); assert.equal(validateProgramData(data), true);
  }
});

test('L13 unknown actor and generated-ID collisions cannot overwrite another private document', () => {
  const { data, state, model } = fixture(), entry = model.flows[0];
  assert.equal(hydrateProgramLegacy(data, model, state, { actorId: 'unknown' }).ok, false);
  const collision = programLegacyIdentity('flow', state.workspaceId, entry.savedCopyId, entry.flowId, entry.ref);
  data.spaces[ACTOR].text.documents.push({ id: collision, title: '내 문서', folderId: 'folder-unfiled', folder: '미분류', lines: [] });
  assert.equal(validateProgramData(data), true);
  const result = hydrateProgramLegacy(data, model, state, { actorId: ACTOR });
  assert.equal(result.ok, false); assert.equal(result.data, data);
});

test('L14 recurrence requires a visible occurrence window, never becomes a single task', () => {
  const { data, state, model } = fixture();
  const repeating = authored('# 반복\n- [ ] 운동\n  - 날짜: 2026-09-13\n  - 반복: 매일\n  - 반복 종료: 5회\n');
  state.authoredFlows = [repeating]; state.authoringReceipts = [{ handoffId: repeating.authoring.handoffId, flowRef: repeating.ref, committedAt: NOW }];
  assert.equal(isPersonalWorkspacePocState(state), true);
  const inspection = inspectProgramLegacy(model, state); assert.equal(inspection.ok, false);
  if (!inspection.ok) assert.ok(inspection.issues.some(issue => issue.code === 'recurrence-window-required'));
  const result = hydrateProgramLegacy(data, model, state, { actorId: ACTOR });
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.reason, 'unresolved');
  assert.equal(result.data, data); assert.equal(data.spaces[ACTOR].legacySnapshot, null);
});

test('L15 snapshot ceiling and unrepresentable source text abort transaction', () => {
  const { data, state, model } = fixture(); model.flows[0].items[0].description = 'x'.repeat(10_000_001);
  const huge = hydrateProgramLegacy(data, model, state, { actorId: ACTOR });
  assert.equal(huge.ok, false); if (!huge.ok) assert.equal(huge.reason, 'limit'); assert.equal(huge.data, data);
  model.flows[0].items[0].description = '보통 설명'; model.flows[0].items[0].title = '한 줄\n- [x] 주입';
  const multiline = hydrateProgramLegacy(data, model, state, { actorId: ACTOR });
  assert.equal(multiline.ok, false); assert.equal(multiline.data, data);
});

test('L16 getter and cyclic input fail without invoking caller code', () => {
  const { data, state, model } = fixture(); let accessed = false;
  Object.defineProperty(model.flows[0], 'title', { enumerable: true, get: () => { accessed = true; return 'wrong'; } });
  assert.equal(hydrateProgramLegacy(data, model, state, { actorId: ACTOR }).ok, false); assert.equal(accessed, false);
  const cyclic = fixture(); (cyclic.model as unknown as Record<string, unknown>).cycle = cyclic.model;
  assert.equal(hydrateProgramLegacy(cyclic.data, cyclic.model, cyclic.state, { actorId: ACTOR }).ok, false);
});

test('L17 review-held Map cannot silently gain executable checkboxes in the new surface', () => {
  const { data, state, model } = fixture();
  model.flows[0].presentation = { mapGroup: { groupRef: toPersonalWorkspacePocMapGroupRef('held'), ownerId: 'held', title: '검토 대기',
    childCount: 1, childOrder: 0, executionState: 'review-hold', reviewReasons: ['출처 확인'] } };
  assert.deepEqual(inspectProgramLegacy(model, state), { ok: false, issues: [{ code: 'map-review-required', ref: model.flows[0].ref }] });
  const result = hydrateProgramLegacy(data, model, state, { actorId: ACTOR });
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.reason, 'unresolved'); assert.equal(result.data, data);
});

test('L18 relative source without an anchor stays undated and retains original timing', () => {
  const { data, state, model } = fixture();
  delete model.flows[0].items[0].sourceDate; model.flows[0].items[0].sourceTimingLabel = 'D-3';
  const space = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR })).spaces[ACTOR];
  assert.equal(M.tasks(space.text)[0].date, null); assert.match(M.raw(space.text.flows[0]), /원문 일정: D-3/u);
  assert.deepEqual(space.text.progressRecords, []);
});

const CANDIDATE_BASE = '# 원본\n- [ ] 이전 이름\n  - 날짜: 2026-09-13\n  - 시간: 09:30\n- [ ] 보존할 일\n';
const CANDIDATE_NEXT = '# 반영 판본\n- [ ] 새 이름\n  - 날짜: 2026-09-19\n  - 시간: 17:00\n- [ ] 보존할 일\n- [ ] 새로 생긴 일\n';
function candidateFixture(raw = CANDIDATE_NEXT, resolution: 'use-incoming' | 'keep-mine' = 'use-incoming') {
  const { data, state, model } = fixture(), original = authored(CANDIDATE_BASE);
  state.authoredFlows = [original]; state.authoringReceipts = [{ handoffId: original.authoring.handoffId, flowRef: original.ref, committedAt: NOW }];
  const candidate = createPersonalWorkspacePocLocalFixtureEnvelope(original, { candidateId: 'accepted-source', fixtureId: 'local-only-source',
    incomingRevisionId: 'next-source-revision', incomingRawText: raw, createdAt: NOW });
  assert.ok(candidate.ok);
  const staged = stagePersonalWorkspacePocSourceCandidate(createPersonalWorkspacePocSourceCandidateStore(NOW), candidate.envelope, candidate.current, NOW).store;
  let resolved = staged;
  for (const change of candidate.envelope.changes) resolved = resolvePersonalWorkspacePocSourceCandidateChange(resolved, {
    candidateId: candidate.envelope.candidateId, changeId: change.changeId, resolution, now: NOW,
  }).store;
  const applied = applyPersonalWorkspacePocSourceCandidate(resolved, { candidateId: candidate.envelope.candidateId, current: candidate.current, now: NOW });
  assert.equal(applied.code, 'applied'); assert.equal(isPersonalWorkspacePocSourceCandidateStore(applied.store), true);
  return { data, model, state, original, staged, store: applied.store, envelope: candidate.envelope };
}

test('L19 accepted current source feeds both source index and composition and persists the exact original plus store', () => {
  const { data, model, state, original, store } = candidateFixture();
  const before = JSON.stringify({ data, model, state, store });
  const result = accept(hydrateProgramLegacy(frozen(data), frozen(model), frozen(state), { actorId: ACTOR, sourceCandidateStore: frozen(store) }));
  const space = result.spaces[ACTOR], binding = space.savedBindings.find(binding => binding.flowRef === original.ref)!;
  const document = M.getDocument(space.text, binding.documentId)!;
  assert.equal(document.title, '반영 판본');
  const changed = M.tasks(space.text).find(task => task.title === '새 이름')!;
  assert.equal(changed.date, '2026-09-19'); assert.equal(changed.time, null, 'never borrow old typed time after K3 mapping becomes unavailable');
  assert.ok(M.tasks(space.text).some(task => task.title === '새로 생긴 일'));
  assert.equal(M.tasks(space.text).some(task => task.title === '이전 이름'), false);
  assert.equal(binding.itemLines[original.items[0].ref], changed.id, 'same stable identity after source revision');
  assert.deepEqual(JSON.parse(space.legacySnapshot!.raw), { model, state, sourceCandidateStore: store });
  assert.equal(JSON.parse(space.legacySnapshot!.raw).state.authoredFlows[0].authoring.rawText, CANDIDATE_BASE);
  assert.equal(JSON.parse(space.legacySnapshot!.raw).sourceCandidateStore.effectiveVersions[original.ref].sourceRevision.rawText, CANDIDATE_NEXT);
  assert.equal(JSON.parse(space.legacySnapshot!.raw).sourceCandidateStore.envelopes['accepted-source'].provenance.kind, 'local-fixture');
  assert.deepEqual(result.public, data.public); assert.equal(JSON.stringify({ data, model, state, store }), before);
  assert.equal(inspectProgramLegacy(model, state, { sourceCandidateStore: store }).ok, true);
});

test('L20 accepted source preserves personal alias/memo/placement/completion and new-item run references', () => {
  const { data, model, state, original, store } = candidateFixture();
  const ref = original.items[0].ref;
  state.personalPlanOverlays = { [original.ref]: { flowRef: original.ref, savedCopyId: original.savedCopyId, flowId: original.flowId,
    title: '내 이름', items: { [ref]: { itemRef: ref, title: '내 할 일', memo: '비공개 메모' } } } };
  state.placements[ref] = { itemRef: ref, scheduleMode: 'fixed_date', date: '2026-10-01', time: '12:00', timelinePolicy: 'excluded' };
  state.completions[ref] = { status: 'completed', completedAt: NOW };
  const current = store.effectiveVersions[original.ref].projectedFlow;
  const newItem = current.items.find(item => !original.items.some(old => old.ref === item.ref));
  assert.ok(newItem);
  state.placements[newItem.ref] = { itemRef: newItem.ref, scheduleMode: 'fixed_date', date: '2026-10-02', timelinePolicy: 'included' };
  const result = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR, sourceCandidateStore: store }));
  const space = result.spaces[ACTOR], task = M.tasks(space.text).find(task => task.title === '내 할 일')!;
  assert.equal(task.date, '2026-10-01'); assert.equal(task.time, '12:00'); assert.equal(task.done, true); assert.equal(task.note, '비공개 메모');
  assert.equal(space.legacyTimelinePolicies[task.id], 'excluded'); assert.deepEqual(space.text.progressRecords, []);
  assert.equal(M.tasks(space.text).find(task => task.id === space.savedBindings.find(binding => binding.flowRef === original.ref)!.itemLines[newItem.ref])?.date, '2026-10-02');
  assert.deepEqual(result.public, data.public);
});

test('L21 staged and deferred candidates are preserved but never applied implicitly', () => {
  const fixture = candidateFixture();
  const deferred = deferPersonalWorkspacePocSourceCandidate(fixture.staged, { candidateId: fixture.envelope.candidateId, now: NOW }).store;
  for (const store of [fixture.staged, deferred]) {
    const result = accept(hydrateProgramLegacy(fixture.data, fixture.model, fixture.state, { actorId: ACTOR, sourceCandidateStore: store }));
    assert.ok(M.tasks(result.spaces[ACTOR].text).some(task => task.title === '이전 이름'));
    assert.equal(M.tasks(result.spaces[ACTOR].text).some(task => task.title === '새로 생긴 일'), false);
    assert.deepEqual(JSON.parse(result.spaces[ACTOR].legacySnapshot!.raw).sourceCandidateStore, store);
  }
});

test('L22 accepted keep-mine resolution remains mine instead of reparsing all incoming text as canonical', () => {
  const { data, model, state, store } = candidateFixture(CANDIDATE_NEXT, 'keep-mine');
  const result = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR, sourceCandidateStore: store }));
  assert.ok(M.tasks(result.spaces[ACTOR].text).some(task => task.title === '이전 이름' && task.date === '2026-09-13'));
  assert.equal(M.tasks(result.spaces[ACTOR].text).some(task => task.title === '새 이름'), false);
  assert.equal(M.tasks(result.spaces[ACTOR].text).some(task => task.title === '새로 생긴 일'), false);
});

test('L23 corrupted candidate store and a valid store targeting a missing handoff fail closed', () => {
  const { data, model, state, store } = candidateFixture();
  const corrupt = programClone(store) as Mutable<typeof store>;
  corrupt.effectiveVersions[Object.keys(corrupt.effectiveVersions)[0]].projectedFlow.title = '변조';
  assert.equal(isPersonalWorkspacePocSourceCandidateStore(corrupt), false);
  for (const [targetState, targetStore] of [[state, corrupt], [createPersonalWorkspacePocState(NOW), store]] as const) {
    const result = hydrateProgramLegacy(data, model, targetState, { actorId: ACTOR, sourceCandidateStore: targetStore });
    assert.equal(result.ok, false); assert.equal(result.data, data); assert.equal(data.spaces[ACTOR].legacySnapshot, null);
  }
});

test('L24 repeated import protects edits and requires explicit reconciliation if applied source changes or is omitted', () => {
  const { data, model, state, store } = candidateFixture();
  const first = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR, sourceCandidateStore: store }));
  const task = M.tasks(first.spaces[ACTOR].text).find(task => task.title === '새 이름')!;
  first.spaces[ACTOR].text = M.updateTask(first.spaces[ACTOR].text, task.id, { title: '투영 후 개인 수정' });
  const same = hydrateProgramLegacy(first, model, state, { actorId: ACTOR, sourceCandidateStore: store });
  assert.ok(same.ok); assert.equal(same.changed, false); assert.equal(same.data, first);
  const omitted = hydrateProgramLegacy(first, model, state, { actorId: ACTOR });
  assert.equal(omitted.ok, false); if (!omitted.ok) assert.equal(omitted.reason, 'conflict'); assert.equal(omitted.data, first);
  const old = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR }));
  const upgrade = hydrateProgramLegacy(old, model, state, { actorId: ACTOR, sourceCandidateStore: store });
  assert.equal(upgrade.ok, false); if (!upgrade.ok) assert.equal(upgrade.reason, 'conflict'); assert.equal(upgrade.data, old);
});

test('L25 accepted recurrence with unavailable typed mapping remains explicitly unsupported', () => {
  const { data, model, state, store } = candidateFixture('# 반복 판본\n- [ ] 이전 이름\n  - 날짜: 2026-09-13\n  - 반복: 매일\n  - 반복 종료: 5회\n- [ ] 보존할 일\n');
  const result = hydrateProgramLegacy(data, model, state, { actorId: ACTOR, sourceCandidateStore: store });
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.reason, 'unresolved'); assert.equal(result.data, data);
  const inspection = inspectProgramLegacy(model, state, { sourceCandidateStore: store });
  assert.equal(inspection.ok, false); if (!inspection.ok) assert.ok(inspection.issues.some(issue => issue.code === 'recurrence-window-required'));
});

test('L26 source-deleted Item retained by K3 keeps its original binding and execution completion', () => {
  const { data, model, state, store, original } = candidateFixture('# 반영 판본\n- [ ] 새 이름\n  - 날짜: 2026-09-19\n');
  const retained = original.items[1].ref;
  assert.deepEqual(store.effectiveVersions[original.ref].retainedItemRefs, [retained]);
  state.completions[retained] = { status: 'completed', completedAt: NOW };
  const result = accept(hydrateProgramLegacy(data, model, state, { actorId: ACTOR, sourceCandidateStore: store }));
  const space = result.spaces[ACTOR], lineId = space.savedBindings.find(binding => binding.flowRef === original.ref)!.itemLines[retained];
  assert.ok(lineId); const task = M.tasks(space.text).find(task => task.id === lineId)!;
  assert.equal(task.title, '보존할 일'); assert.equal(task.done, true); assert.deepEqual(space.text.progressRecords, []);
  assert.deepEqual(JSON.parse(space.legacySnapshot!.raw).state, state);
});
