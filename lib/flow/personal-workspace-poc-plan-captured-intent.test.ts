import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERSONAL_WORKSPACE_POC_STATE_KEY, PERSONAL_WORKSPACE_POC_STORAGE_PREFIX,
  PERSONAL_WORKSPACE_POC_VERSION, getPersonalWorkspacePocFlowItemFieldOwnership,
  toPersonalWorkspacePocFlowItemRef, toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocFlow, type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';
import { summarizePersonalWorkspacePocPlanDraftChanges } from './personal-workspace-poc-editor-receipt';
import {
  createPersonalWorkspacePocPlanEditorHandlers, normalizePersonalWorkspacePocPlanOverlay,
  openPersonalWorkspacePocPlanEditor, preflightPersonalWorkspacePocPlanCommit,
  type PersonalWorkspacePocPlanDraft,
} from './personal-workspace-poc-plan-editor';
import { applyPersonalWorkspacePocTransition, createPersonalWorkspacePocState, isPersonalWorkspacePocState } from './personal-workspace-poc-state';
import { preparePersonalWorkspacePocStorageCommit } from './personal-workspace-poc-storage-transaction';

const T0 = '2026-09-03T00:00:00.000Z';
const T1 = '2026-09-03T01:00:00.000Z';
const T2 = '2026-09-03T02:00:00.000Z';
const T3 = '2026-09-03T03:00:00.000Z';
const savedCopyId = 'captured-copy'; const flowId = 'captured-flow';
const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
const itemRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'first');
const sectionId = 'section-first';
const SENTINEL = '{ "original": "keep\\r\\n" }';

function source(letter: string, memo: string): PersonalWorkspacePocFlow {
  const item = { ref: itemRef, savedCopyId, flowId, itemId: 'first', title: `Item ${letter}`, description: '불변 원본 설명', sourceOrder: 0, sourceDate: '2026-09-03', sectionId, sectionTitle: `구간 ${letter}` };
  const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, 'personal-draft');
  const personal = { value: memo, owner: 'existing-personal' as const, provenance: 'my-flow-item-draft' as const };
  return {
    ref: flowRef, savedCopyId, flowId, sourceSlug: 'captured-source', origin: 'personal-draft', title: `Flow ${letter}`,
    sections: [{ sectionId, title: `구간 ${letter}`, sourceOrder: 0, titleOwner: 'existing-personal', editCapability: 'poc-shadow' }],
    items: [{ ...item, description: memo, fieldOwnership: { ...ownership, description: { source: ownership.description.source, existingPersonal: personal, effective: personal } } }],
  };
}

function fixture(memo = '메모 B') {
  const original = source('A', '기존 메모 A');
  const firstModel: PersonalWorkspacePocReadModel = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [original] };
  const empty = createPersonalWorkspacePocState(T0);
  empty.placements[itemRef] = { itemRef, scheduleMode: 'fixed_date', date: '2026-09-20', time: '11:00', timelinePolicy: 'auto' };
  empty.completions[itemRef] = { status: 'completed', completedAt: T0 };
  const first = openPersonalWorkspacePocPlanEditor({ baseModel: firstModel, state: empty, stateRaw: JSON.stringify(empty), flowRef });
  assert.ok(first.ok);
  const initialDraft: PersonalWorkspacePocPlanDraft = {
    ...first.draft, title: { mode: 'override', value: 'Flow B' },
    sectionTitles: { [sectionId]: { mode: 'override', value: '구간 B' } },
    items: { [itemRef]: { ...first.draft.items[itemRef], title: { mode: 'override', value: 'Item B' }, memo: { mode: 'override', value: memo } } },
  };
  const initial = preflightPersonalWorkspacePocPlanCommit({ draft: initialDraft, guard: first.guard, currentBaseModel: firstModel, currentState: empty, currentStateRaw: JSON.stringify(empty), now: T1 });
  assert.ok(initial.ok);
  const state = initial.state;
  const flow = source('B', memo);
  const model: PersonalWorkspacePocReadModel = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [flow] };
  const raw = JSON.stringify(state);
  const sourceRaw = JSON.stringify(model);
  const opened = openPersonalWorkspacePocPlanEditor({ baseModel: model, state, stateRaw: raw, flowRef });
  assert.ok(opened.ok);
  return { flow, model, state, raw, sourceRaw, opened };
}

function prepare(value: ReturnType<typeof fixture>, draft: PersonalWorkspacePocPlanDraft) {
  const result = preflightPersonalWorkspacePocPlanCommit({ draft, guard: value.opened.guard, currentBaseModel: value.model, currentState: value.state, currentStateRaw: value.raw, now: T2 });
  if (!result.ok) assert.fail(result.failure.code);
  assert.equal(JSON.stringify(value.state), value.raw);
  assert.equal(JSON.stringify(value.model), value.sourceRaw);
  assert.deepEqual(result.state.placements, value.state.placements);
  assert.deepEqual(result.state.completions, value.state.completions);
  const summary = summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow: value.flow, baseline: value.opened.draft, draft });
  return { result, summary };
}

function memory(raw: string | null) {
  const values = new Map<string, string>([['flow:captured-sentinel', SENTINEL]]);
  if (raw !== null) values.set(PERSONAL_WORKSPACE_POC_STATE_KEY, raw);
  const calls: { method: string; key: string }[] = [];
  const record = (method: string, key: string) => {
    assert.ok(key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX)); calls.push({ method, key });
  };
  return {
    calls, get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { record('setItem', key); values.set(key, value); },
    removeItem: (key: string) => { record('removeItem', key); values.delete(key); },
    clear: () => assert.fail('clear is forbidden'),
  };
}

async function commit(value: ReturnType<typeof fixture>, draft: PersonalWorkspacePocPlanDraft) {
  const storage = memory(value.raw);
  const handler = createPersonalWorkspacePocPlanEditorHandlers({ storage, guard: value.opened.guard, readCurrentState: () => value.state, readCurrentBaseModel: () => value.model, now: () => T2 });
  const prepared = await handler.preparePersonalOverlay({ transactionId: 'captured-commit', requestId: 'request', revision: 1, draft });
  assert.equal(storage.calls.length, 0);
  await prepared.commit();
  assert.equal(storage.getItem('flow:captured-sentinel'), SENTINEL);
  return storage;
}

test('B3-CI01 all four captured source-equal text intents remain a zero-write no-op', async (t) => {
  const value = fixture();
  const { result, summary } = prepare(value, value.opened.draft);
  assert.equal(result.kind, 'no-op');
  assert.deepEqual(result.overlay, value.state.personalPlanOverlays?.[flowRef]);
  assert.deepEqual(summary, { changes: [], affectedRefs: [] });
  const storage = await commit(value, value.opened.draft);
  assert.equal(storage.calls.length, 0); assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), value.raw);
  t.diagnostic(JSON.stringify({ id: 'B3-CI01', storageCalls: 0, fourIntentsPreserved: true }));
});

test('B3-CI02 another-field save preserves four intents through real handler, reload, and existing Undo', async (t) => {
  const value = fixture();
  const draft: PersonalWorkspacePocPlanDraft = { ...value.opened.draft, items: { [itemRef]: { ...value.opened.draft.items[itemRef], schedule: { mode: 'fixed_date', date: '2026-09-03' } } } };
  const { result, summary } = prepare(value, draft);
  assert.equal(result.kind, 'change'); assert.deepEqual(summary.changes.map(change => change.field), ['item.first.schedule']);
  const storage = await commit(value, draft);
  assert.equal(storage.calls.length, 5);
  assert.equal(storage.calls.filter(call => call.key === PERSONAL_WORKSPACE_POC_STATE_KEY).length, 1);
  const savedRaw = storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY)!;
  assert.equal(savedRaw, JSON.stringify(result.state));
  const reloaded = JSON.parse(savedRaw); assert.ok(isPersonalWorkspacePocState(reloaded));
  const reopened = openPersonalWorkspacePocPlanEditor({ baseModel: value.model, state: reloaded, stateRaw: savedRaw, flowRef });
  assert.ok(reopened.ok); assert.deepEqual(reopened.draft.title, value.opened.draft.title);
  assert.deepEqual(reopened.draft.sectionTitles, value.opened.draft.sectionTitles);
  assert.deepEqual(reopened.draft.items[itemRef].memo, value.opened.draft.items[itemRef].memo);
  assert.deepEqual(reopened.draft.items[itemRef].title, value.opened.draft.items[itemRef].title);
  const undone = applyPersonalWorkspacePocTransition(reloaded, { type: 'undo', now: T3 });
  assert.equal(undone.changed, true); assert.equal(undone.error, undefined);
  const undoCommit = preparePersonalWorkspacePocStorageCommit({ storage, state: undone.state, transactionId: 'captured-undo' });
  await undoCommit.commit();
  assert.equal(storage.calls.length, 10);
  const undoReload = JSON.parse(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY)!); assert.ok(isPersonalWorkspacePocState(undoReload));
  assert.deepEqual(undoReload.personalPlanOverlays, value.state.personalPlanOverlays);
  assert.deepEqual(undoReload.placements, value.state.placements); assert.deepEqual(undoReload.completions, value.state.completions);
  assert.equal(JSON.stringify(value.model), value.sourceRaw); assert.equal(storage.getItem('flow:captured-sentinel'), SENTINEL);
  t.diagnostic(JSON.stringify({ id: 'B3-CI02', transactions: 2, targetWrites: 2, supportWrites: 8, sourceExact: true, sentinelExact: true }));
});

test('B3-CI03 explicit inherit removes each captured text intent without touching execution', () => {
  const value = fixture();
  const draft: PersonalWorkspacePocPlanDraft = { ...value.opened.draft, title: { mode: 'inherit' }, sectionTitles: { [sectionId]: { mode: 'inherit' } }, items: { [itemRef]: { ...value.opened.draft.items[itemRef], title: { mode: 'inherit' }, memo: { mode: 'inherit' } } } };
  const { result, summary } = prepare(value, draft);
  assert.equal(result.kind, 'change'); assert.equal(result.overlay.title, undefined); assert.equal(result.overlay.sectionTitles, undefined);
  assert.deepEqual(result.overlay.items, {}); assert.equal(summary.changes.length, 4);
  assert.deepEqual(summary.affectedRefs, [flowRef, itemRef]);
});

test('B3-CI04 newly entered baseline-equal values keep old no-op normalization instead of manufacturing intent', () => {
  const before = fixture(); const flow = source('C', '새 baseline C');
  const model: PersonalWorkspacePocReadModel = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [flow] };
  const opened = openPersonalWorkspacePocPlanEditor({ baseModel: model, state: before.state, stateRaw: before.raw, flowRef }); assert.ok(opened.ok);
  const value = { ...before, flow, model, sourceRaw: JSON.stringify(model), opened };
  const draft: PersonalWorkspacePocPlanDraft = { ...opened.draft, title: { mode: 'override', value: 'Flow C' }, sectionTitles: { [sectionId]: { mode: 'override', value: '구간 C' } }, items: { [itemRef]: { ...opened.draft.items[itemRef], title: { mode: 'override', value: 'Item C' }, memo: { mode: 'override', value: '새 baseline C' } } } };
  const { result, summary } = prepare(value, draft);
  assert.equal(result.overlay.title, undefined); assert.equal(result.overlay.sectionTitles, undefined); assert.deepEqual(result.overlay.items, {});
  assert.equal(summary.changes.length, 4);
});

test('B3-CI05 empty and CRLF captured personal memos retain exact presence until explicit inherit', () => {
  for (const memo of ['', ' 첫 줄\r\n둘째 줄 ']) {
    const value = fixture(memo);
    const untouched = prepare(value, value.opened.draft);
    assert.equal(untouched.result.kind, 'no-op'); assert.equal(untouched.result.overlay.items[itemRef].memo, memo);
    assert.equal(Object.hasOwn(untouched.result.overlay.items[itemRef], 'memo'), true);
    const draft: PersonalWorkspacePocPlanDraft = { ...value.opened.draft, items: { [itemRef]: { ...value.opened.draft.items[itemRef], memo: { mode: 'inherit' } } } };
    const explicit = prepare(value, draft);
    assert.equal(explicit.result.overlay.items[itemRef].memo, undefined);
    assert.equal(explicit.result.overlay.title, 'Flow B'); assert.equal(explicit.result.overlay.sectionTitles?.[sectionId], '구간 B');
    assert.deepEqual(explicit.summary.changes.map(change => change.field), ['item.first.memo']);
  }
});

test('B3-CI06 supplied captured state, changed source, and edited guard cannot grant preservation authority', () => {
  const value = fixture(); const input = { draft: value.opened.draft, guard: value.opened.guard, sourceFlow: value.flow, capturedState: value.state };
  const differentState = structuredClone(value.state);
  differentState.personalPlanOverlays![flowRef] = { ...differentState.personalPlanOverlays![flowRef], title: '권한 없는 값' };
  assert.throws(() => normalizePersonalWorkspacePocPlanOverlay({ ...input, capturedState: differentState }));
  assert.throws(() => normalizePersonalWorkspacePocPlanOverlay({ ...input, sourceFlow: source('C', 'C') }));
  assert.throws(() => normalizePersonalWorkspacePocPlanOverlay({ ...input, guard: { ...input.guard, openedStateCanonicalBytes: '{}' } }));
  assert.throws(() => normalizePersonalWorkspacePocPlanOverlay({ ...input, guard: { ...input.guard, openedStateRaw: '{}' } }));
  assert.equal(JSON.stringify(value.state), value.raw); assert.equal(JSON.stringify(value.model), value.sourceRaw);
});

test('B3-CI07 authored raw-null preflight preserves exact lineage object order and commits only through the real handler', async (t) => {
  const materialized = materializePersonalWorkspacePocAuthoring({ rawText: '# 원문\r\n## 구간\r\n- [ ] 할 일\r\n  - 설명: 원문 설명', documentId: 'captured-doc', revisionId: 'captured-rev', handoffId: 'captured-handoff', committedAt: T0 });
  assert.ok(materialized.ok);
  const flow = materialized.flow; const state = createPersonalWorkspacePocState(T0);
  state.authoredFlows = [flow]; state.authoringReceipts = [{ handoffId: flow.authoring.handoffId, flowRef: flow.ref, committedAt: T0 }];
  const before = JSON.stringify(state); const model: PersonalWorkspacePocReadModel = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [] };
  const opened = openPersonalWorkspacePocPlanEditor({ baseModel: model, state, stateRaw: null, flowRef: flow.ref }); assert.ok(opened.ok);
  const draft: PersonalWorkspacePocPlanDraft = { ...opened.draft, title: { mode: 'override', value: '개인 제목' } };
  const result = preflightPersonalWorkspacePocPlanCommit({ draft, guard: opened.guard, currentBaseModel: model, currentState: state, currentStateRaw: null, now: T1 });
  assert.ok(result.ok);
  assert.equal(result.overlay.title, '개인 제목');
  assert.equal(JSON.stringify(result.state.authoredFlows), JSON.stringify(state.authoredFlows));
  const storage = memory(null);
  const handlers = createPersonalWorkspacePocPlanEditorHandlers({ storage, guard: opened.guard, readCurrentState: () => state, readCurrentBaseModel: () => model, now: () => T1 });
  const prepared = await handlers.preparePersonalOverlay({ transactionId: 'captured-null', requestId: 'request', revision: 1, draft });
  assert.equal(storage.calls.length, 0); await prepared.commit(); assert.equal(storage.calls.length, 5);
  const saved = JSON.parse(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY)!); assert.ok(isPersonalWorkspacePocState(saved));
  assert.equal(JSON.stringify(saved.authoredFlows), JSON.stringify(state.authoredFlows)); assert.equal(JSON.stringify(state), before);
  assert.equal(storage.getItem('flow:captured-sentinel'), SENTINEL);
  t.diagnostic(JSON.stringify({ id: 'B3-CI07', targetWrites: 1, supportWrites: 4, sourceExact: true, originalRawAbsent: true }));
});
