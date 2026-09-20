import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';
import { composePersonalWorkspacePocReadModel } from './personal-workspace-poc-composition';
import {
  getPersonalWorkspacePocFlowItemFieldOwnership, PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef, toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocFlow, type PersonalWorkspacePocReadModel, type PersonalWorkspacePocState,
} from './personal-workspace-poc-contract';
import { summarizePersonalWorkspacePocPlanDraftChanges } from './personal-workspace-poc-editor-receipt';
import { getPersonalWorkspacePocItemDetails } from './personal-workspace-poc-item-details';
import { getPersonalWorkspacePocInheritedMemo } from './personal-workspace-poc-plan-memo-baseline';
import {
  openPersonalWorkspacePocPlanEditor, preflightPersonalWorkspacePocPlanCommit,
  type PersonalWorkspacePocPlanDraft, type PersonalWorkspacePocPlanTextDraft,
} from './personal-workspace-poc-plan-editor';
import { createPersonalWorkspacePocState, isPersonalWorkspacePocState } from './personal-workspace-poc-state';

// K3-B B0-M: requirement assertions are deliberately not skipped/xfail while RED.
// Source-only text and an existing-personal memo are different inheritance baselines.
// These pure calls have no Storage/DOM adapter; persistence/browser QA is separate.
const T0 = '2026-09-05T01:00:00.000Z';
const T1 = '2026-09-05T02:00:00.000Z';
const SOURCE_DESCRIPTION = '안내문을 읽고 접수한다';
const IMPORTED_MEMO = '기존 개인 메모: 예약 번호를 확인';
const PERSONAL_MEMO = '이번 사본에만 적은 메모';
type Fixture = { flow: PersonalWorkspacePocFlow; model: PersonalWorkspacePocReadModel; state: PersonalWorkspacePocState; itemRef: string };

function addOverlay(value: Fixture, memo: string) {
  value.state.personalPlanOverlays = { [value.flow.ref]: {
    flowRef: value.flow.ref, savedCopyId: value.flow.savedCopyId, flowId: value.flow.flowId,
    items: { [value.itemRef]: { itemRef: value.itemRef, memo } },
  } };
  return value;
}

function authored(): Fixture {
  const materialized = materializePersonalWorkspacePocAuthoring({
    rawText: '# 개인 메모 검증\r\n- [ ] 접수\r\n  - 설명: ' + SOURCE_DESCRIPTION + '\r\n  - 날짜: 2026-09-05\r\n  - 완료 기준: 접수 번호를 받았다',
    documentId: 'k3b-memo-document', revisionId: 'k3b-memo-revision', handoffId: 'k3b-memo-handoff', committedAt: T0,
  });
  assert.ok(materialized.ok, 'authored fixture must materialize before testing memo behavior');
  const flow = materialized.flow;
  const state = createPersonalWorkspacePocState(T0);
  state.authoredFlows = [flow];
  state.authoringReceipts = [{ handoffId: flow.authoring.handoffId, flowRef: flow.ref, committedAt: T0 }];
  const itemRef = flow.items[0].ref;
  state.placements[itemRef] = { itemRef, scheduleMode: 'fixed_date', date: '2026-09-07', time: '11:00', timelinePolicy: 'auto' };
  state.completions[itemRef] = { status: 'completed', completedAt: T0 };
  assert.ok(isPersonalWorkspacePocState(state));
  assert.equal(flow.items[0].description, SOURCE_DESCRIPTION);
  return { flow, state, model: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [] }, itemRef };
}

function imported(): Fixture {
  const savedCopyId = 'k3b-existing-copy'; const flowId = 'k3b-existing-flow';
  const ref = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const itemRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'first');
  const base = { ref: itemRef, savedCopyId, flowId, itemId: 'first', title: '접수', description: SOURCE_DESCRIPTION, sourceOrder: 0, sourceDate: '2026-09-05' };
  const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(base, 'canonical-personal-copy');
  const personal = { value: IMPORTED_MEMO, owner: 'existing-personal' as const, provenance: 'my-flow-item-draft' as const };
  const flow: PersonalWorkspacePocFlow = { ref, savedCopyId, flowId, sourceSlug: 'k3b-existing-source', origin: 'canonical-personal-copy', title: '기존 개인 사본',
    items: [{ ...base, description: IMPORTED_MEMO, fieldOwnership: { ...ownership, description: { source: ownership.description.source, existingPersonal: personal, effective: personal } } }],
  };
  return { flow, itemRef, model: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [flow] }, state: createPersonalWorkspacePocState(T0) };
}

function open(value: Fixture) {
  const result = openPersonalWorkspacePocPlanEditor({ baseModel: value.model, state: value.state, stateRaw: JSON.stringify(value.state), flowRef: value.flow.ref });
  assert.ok(result.ok, 'fixture must pass the real Plan open guard');
  return result;
}

function withMemo(draft: PersonalWorkspacePocPlanDraft, itemRef: string, memo: PersonalWorkspacePocPlanTextDraft): PersonalWorkspacePocPlanDraft {
  return { ...draft, items: { ...draft.items, [itemRef]: { ...draft.items[itemRef], memo } } };
}

function details(value: Fixture, state = value.state) {
  const result = composePersonalWorkspacePocReadModel(value.model, state);
  assert.ok(result.ok, 'candidate composition must use the real owner projection');
  const flow = result.model.flows.find(entry => entry.ref === value.flow.ref)!;
  const item = flow.items.find(entry => entry.ref === value.itemRef)!;
  return { ...getPersonalWorkspacePocItemDetails(flow, item), memoOwner: getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow).description.effective.owner };
}

function prepare(value: Fixture, draft: PersonalWorkspacePocPlanDraft, opened = open(value)) {
  const original = JSON.stringify(value);
  const result = preflightPersonalWorkspacePocPlanCommit({ draft, guard: opened.guard,
    currentBaseModel: value.model, currentState: value.state, currentStateRaw: JSON.stringify(value.state), now: T1 });
  assert.equal(JSON.stringify(value), original, 'source, state and imported baseline inputs are not mutated');
  assert.ok(result.ok, 'valid memo intent must pass preflight rather than fail fixture validation');
  assert.deepEqual(result.state.placements, value.state.placements, 'Plan memo cannot change execution date/time');
  assert.deepEqual(result.state.completions, value.state.completions, 'Plan memo cannot change completion');
  assert.deepEqual(result.state.authoredFlows, value.state.authoredFlows, 'authoring raw/lineage is immutable');
  return result;
}

function memoChange(value: Fixture, baseline: PersonalWorkspacePocPlanDraft, draft: PersonalWorkspacePocPlanDraft) {
  return summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow: value.flow, baseline, draft }).changes.find(change => change.field.endsWith('.memo'));
}

test('M01 source-only description is not a personal memo before any edit', () => {
  const value = authored(); const shown = details(value);
  assert.equal(shown.description, SOURCE_DESCRIPTION); assert.equal(shown.memo, undefined);
  assert.equal(shown.memoOwner, 'authoring');
});

test('M02 explicit personal memo equal to source description keeps its personal owner', (context) => {
  const value = authored(); const opened = open(value);
  const result = prepare(value, withMemo(opened.draft, value.itemRef, { mode: 'override', value: SOURCE_DESCRIPTION }), opened);
  const shown = details(value, result.state);
  context.diagnostic(JSON.stringify({ case: 'M02', kind: result.kind, candidateMemo: result.overlay.items[value.itemRef]?.memo ?? null, shown }));
  assert.equal(result.overlay.items[value.itemRef]?.memo, SOURCE_DESCRIPTION, 'equal text does not make a source fact into a personal memo');
  assert.equal(shown.memo, SOURCE_DESCRIPTION); assert.equal(shown.memoOwner, 'poc-personal');
  assert.equal(shown.description, SOURCE_DESCRIPTION);
});

test('M03 changing only a Flow title preserves an already saved source-equal personal memo', (context) => {
  const value = addOverlay(authored(), SOURCE_DESCRIPTION); const opened = open(value);
  assert.equal(details(value).memoOwner, 'poc-personal');
  const result = prepare(value, { ...opened.draft, title: { mode: 'override', value: '내 접수 계획' } }, opened);
  context.diagnostic(JSON.stringify({ case: 'M03', kind: result.kind, before: details(value), after: details(value, result.state) }));
  assert.equal(result.overlay.items[value.itemRef]?.memo, SOURCE_DESCRIPTION, 'an unrelated field edit must not erase a saved memo');
  assert.equal(details(value, result.state).memo, SOURCE_DESCRIPTION);
});

test('M04 explicit empty memo clears a previous personal memo without erasing source text', () => {
  const value = addOverlay(authored(), PERSONAL_MEMO); const opened = open(value);
  const result = prepare(value, withMemo(opened.draft, value.itemRef, { mode: 'override', value: '' }), opened);
  assert.equal(result.overlay.items[value.itemRef]?.memo, '');
  assert.equal(details(value, result.state).memo, undefined);
  assert.equal(details(value, result.state).description, SOURCE_DESCRIPTION);
});

test('M05 inherit removes only a PoC memo and never exposes source description as a personal memo', () => {
  const value = addOverlay(authored(), PERSONAL_MEMO); const opened = open(value);
  const result = prepare(value, withMemo(opened.draft, value.itemRef, { mode: 'inherit' }), opened);
  assert.equal(result.overlay.items[value.itemRef]?.memo, undefined);
  assert.equal(details(value, result.state).memo, undefined);
  assert.equal(details(value, result.state).description, SOURCE_DESCRIPTION);
});

test('M06 receipt before a first personal memo represents no personal memo, not source instructions', (context) => {
  const value = authored(); const opened = open(value);
  const change = memoChange(value, opened.draft, withMemo(opened.draft, value.itemRef, { mode: 'override', value: PERSONAL_MEMO }));
  assert.ok(change); assert.equal(details(value).memo, undefined);
  context.diagnostic(JSON.stringify({ case: 'M06', beforeMemo: details(value).memo ?? null, change }));
  assert.ok(!String(change.before).includes(SOURCE_DESCRIPTION), 'receipt must not report source text as the former personal memo');
  assert.match(String(change.before), /없음/u);
  assert.equal(change.before, '개인 메모 없음');
  assert.ok(String(change.after).includes(PERSONAL_MEMO));
});

test('M07 receipt after inherit agrees with the actual absence of a source-only personal memo', (context) => {
  const value = addOverlay(authored(), PERSONAL_MEMO); const opened = open(value);
  const draft = withMemo(opened.draft, value.itemRef, { mode: 'inherit' });
  const result = prepare(value, draft, opened); const change = memoChange(value, opened.draft, draft);
  assert.ok(change); assert.equal(details(value, result.state).memo, undefined);
  context.diagnostic(JSON.stringify({ case: 'M07', afterMemo: details(value, result.state).memo ?? null, change }));
  assert.ok(!String(change.after).includes(SOURCE_DESCRIPTION), 'receipt must not claim the source description became the personal memo');
  assert.match(String(change.after), /없음/u);
  assert.equal(change.after, '개인 메모 없음');
});

test('M08 imported-personal baseline keeps its memo distinct from the source description', () => {
  const shown = details(imported());
  assert.equal(shown.description, SOURCE_DESCRIPTION); assert.equal(shown.memo, IMPORTED_MEMO);
  assert.equal(shown.memoOwner, 'existing-personal');
});

test('M09 inherit restores the imported-personal baseline after removing only a PoC override', () => {
  const value = addOverlay(imported(), PERSONAL_MEMO); const opened = open(value);
  const result = prepare(value, withMemo(opened.draft, value.itemRef, { mode: 'inherit' }), opened);
  assert.equal(details(value, result.state).memo, IMPORTED_MEMO);
  assert.equal(details(value, result.state).memoOwner, 'existing-personal');
  assert.equal(details(value, result.state).description, SOURCE_DESCRIPTION);
});

test('M10 explicitly repeating the imported memo may normalize to the same personal baseline without loss', () => {
  const value = imported(); const opened = open(value);
  const result = prepare(value, withMemo(opened.draft, value.itemRef, { mode: 'override', value: IMPORTED_MEMO }), opened);
  assert.equal(result.kind, 'no-op');
  assert.equal(details(value, result.state).memo, IMPORTED_MEMO);
  assert.equal(details(value, result.state).description, SOURCE_DESCRIPTION);
});

test('M11 empty PoC memo explicitly clears imported memo but not original instructions', () => {
  const value = imported(); const opened = open(value);
  const result = prepare(value, withMemo(opened.draft, value.itemRef, { mode: 'override', value: '' }), opened);
  assert.equal(result.overlay.items[value.itemRef]?.memo, '');
  assert.equal(details(value, result.state).memo, undefined);
  assert.equal(details(value, result.state).description, SOURCE_DESCRIPTION);
});

test('M12 source-equal text is still a new personal memo when the imported baseline differs', () => {
  const value = imported(); const opened = open(value);
  const result = prepare(value, withMemo(opened.draft, value.itemRef, { mode: 'override', value: SOURCE_DESCRIPTION }), opened);
  assert.equal(result.overlay.items[value.itemRef]?.memo, SOURCE_DESCRIPTION);
  assert.equal(details(value, result.state).memo, SOURCE_DESCRIPTION);
  assert.equal(details(value, result.state).memoOwner, 'poc-personal');
});

test('M13 receipt inherit uses actual imported personal memo, not the immutable source description', () => {
  const value = addOverlay(imported(), PERSONAL_MEMO); const opened = open(value);
  const change = memoChange(value, opened.draft, withMemo(opened.draft, value.itemRef, { mode: 'inherit' }));
  assert.ok(change); assert.ok(String(change.after).includes(IMPORTED_MEMO));
  assert.ok(!String(change.after).includes(SOURCE_DESCRIPTION));
  assert.equal(change.after, `기존 개인 메모 · ${IMPORTED_MEMO}`);
});

test('M14 inherited memo resolver preserves exact personal strings, including empty, whitespace and CRLF', () => {
  const item = imported().flow.items[0];
  const ownership = item.fieldOwnership!;
  for (const raw of ['', '  ', '\r\n', ' 첫 줄\r\n둘째 줄 ', SOURCE_DESCRIPTION]) {
    const candidate = { ...item, fieldOwnership: { ...ownership, description: {
      ...ownership.description, existingPersonal: { ...ownership.description.existingPersonal, value: raw },
    } } };
    const before = JSON.stringify(candidate);
    assert.equal(getPersonalWorkspacePocInheritedMemo(candidate), raw);
    assert.equal(JSON.stringify(candidate), before);
  }
});

test('M15 memo resolver never infers a personal baseline from missing, source-only or valueless ownership', () => {
  const source = authored().flow.items[0];
  assert.equal(getPersonalWorkspacePocInheritedMemo(source), undefined);
  const item = imported().flow.items[0];
  const { fieldOwnership: _ownership, ...legacy } = item;
  assert.equal(getPersonalWorkspacePocInheritedMemo(legacy), undefined);
  const ownership = item.fieldOwnership!;
  const valueless = { ...item, fieldOwnership: { ...ownership, description: {
    ...ownership.description, existingPersonal: { owner: 'existing-personal' as const, provenance: 'my-flow-item-draft' as const },
  } } };
  assert.equal(getPersonalWorkspacePocInheritedMemo(valueless), undefined);
});

test('M16 memo resolver keeps the original imported baseline when a PoC effective memo is already composed', () => {
  const value = addOverlay(imported(), PERSONAL_MEMO);
  const result = composePersonalWorkspacePocReadModel(value.model, value.state);
  assert.ok(result.ok);
  const item = result.model.flows[0].items[0];
  assert.equal(item.fieldOwnership?.description.effective.owner, 'poc-personal');
  assert.equal(item.description, PERSONAL_MEMO);
  assert.equal(getPersonalWorkspacePocInheritedMemo(item), IMPORTED_MEMO);
});
