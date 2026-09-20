import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import { summarizePersonalWorkspacePocPlanDraftChanges } from './personal-workspace-poc-editor-receipt';
import {
  openPersonalWorkspacePocPlanEditor,
  preflightPersonalWorkspacePocPlanCommit,
  type PersonalWorkspacePocPlanDraft,
} from './personal-workspace-poc-plan-editor';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';

// Independent characterization of a remaining React planner gap. These tests
// intentionally do not change planner behavior or hide its result in summary.
// All calls are pure: no storage API, browser, operating profile, or P writer.
const T0 = '2026-09-03T00:00:00.000Z';
const T1 = '2026-09-03T01:00:00.000Z';
const T2 = '2026-09-03T02:00:00.000Z';

function actualPreviouslyDifferentTitleFixture() {
  const savedCopyId = 'b3-persisted-copy';
  const flowId = 'b3-persisted-flow';
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const itemRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'first');
  const sourceA: PersonalWorkspacePocFlow = {
    ref: flowRef, savedCopyId, flowId, sourceSlug: 'b3-persisted-source',
    origin: 'legacy-saved-plan', title: '원문 Flow A',
    items: [{ ref: itemRef, savedCopyId, flowId, itemId: 'first', title: '원문 Item A', sourceOrder: 0 }],
  };
  const firstModel: PersonalWorkspacePocReadModel = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [sourceA] };
  const empty = createPersonalWorkspacePocState(T0);
  const first = openPersonalWorkspacePocPlanEditor({ baseModel: firstModel, state: empty, stateRaw: JSON.stringify(empty), flowRef });
  assert.ok(first.ok);
  const firstDraft: PersonalWorkspacePocPlanDraft = {
    ...first.draft, title: { mode: 'override', value: '개인 Flow B' },
    items: { ...first.draft.items, [itemRef]: { ...first.draft.items[itemRef], title: { mode: 'override', value: '개인 Item B' } } },
  };
  const initial = preflightPersonalWorkspacePocPlanCommit({
    draft: firstDraft, guard: first.guard, currentBaseModel: firstModel,
    currentState: empty, currentStateRaw: JSON.stringify(empty), now: T1,
  });
  assert.ok(initial.ok);
  assert.equal(initial.kind, 'change');
  assert.equal(initial.overlay.title, '개인 Flow B');
  assert.equal(initial.overlay.items[itemRef].title, '개인 Item B');

  // A fresh, valid opening after source replacement, not an obsolete open guard.
  const sourceB = { ...sourceA, title: '개인 Flow B', items: [{ ...sourceA.items[0], title: '개인 Item B' }] };
  const model: PersonalWorkspacePocReadModel = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [sourceB] };
  const state = initial.state;
  const raw = JSON.stringify(state);
  const sourceRaw = JSON.stringify(model);
  const opened = openPersonalWorkspacePocPlanEditor({ baseModel: model, state, stateRaw: raw, flowRef });
  assert.ok(opened.ok);
  assert.deepEqual(opened.draft.title, { mode: 'override', value: '개인 Flow B' });
  assert.deepEqual(opened.draft.items[itemRef].title, { mode: 'override', value: '개인 Item B' });
  return { sourceB, model, state, raw, sourceRaw, opened, flowRef, itemRef };
}

function inspect(value: ReturnType<typeof actualPreviouslyDifferentTitleFixture>, draft: PersonalWorkspacePocPlanDraft) {
  const result = preflightPersonalWorkspacePocPlanCommit({
    draft, guard: value.opened.guard, currentBaseModel: value.model,
    currentState: value.state, currentStateRaw: value.raw, now: T2,
  });
  assert.ok(result.ok, 'the actual planner must accept the fresh source context');
  assert.equal(JSON.stringify(value.state), value.raw);
  assert.equal(JSON.stringify(value.model), value.sourceRaw);
  const summary = summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow: value.sourceB, baseline: value.opened.draft, draft });
  // The summary must report the actual current planner removals, not silently
  // pretend that unchanged intent was preserved by a different implementation.
  assert.equal(summary.changes.some(change => change.field === 'flow.title'), result.overlay.title === undefined);
  assert.equal(summary.changes.some(change => change.field === 'item.first.title'), result.overlay.items[value.itemRef]?.title === undefined);
  return { result, summary };
}

test('B3-I01 an untouched stored title intent should survive source becoming equal', (t) => {
  const value = actualPreviouslyDifferentTitleFixture();
  const { result, summary } = inspect(value, value.opened.draft);
  t.diagnostic(JSON.stringify({ id: 'B3-I01', actualKind: result.kind, flowTitle: result.overlay.title ?? null, itemTitle: result.overlay.items[value.itemRef]?.title ?? null, summary, storageCalls: 0 }));
  assert.equal(result.kind, 'no-op', 'remaining planner gap: an unchanged personal intent must not be silently normalized away');
  assert.equal(result.overlay.title, '개인 Flow B');
  assert.equal(result.overlay.items[value.itemRef].title, '개인 Item B');
});

test('B3-I02 an unrelated memo edit should not erase stored source-equal title intents', (t) => {
  const value = actualPreviouslyDifferentTitleFixture();
  const draft: PersonalWorkspacePocPlanDraft = {
    ...value.opened.draft,
    items: { ...value.opened.draft.items, [value.itemRef]: { ...value.opened.draft.items[value.itemRef], memo: { mode: 'override', value: '새 메모' } } },
  };
  const { result, summary } = inspect(value, draft);
  assert.equal(result.kind, 'change');
  assert.equal(result.overlay.items[value.itemRef].memo, '새 메모');
  t.diagnostic(JSON.stringify({ id: 'B3-I02', actualKind: result.kind, flowTitle: result.overlay.title ?? null, itemTitle: result.overlay.items[value.itemRef]?.title ?? null, summary, storageCalls: 0 }));
  assert.equal(result.overlay.title, '개인 Flow B', 'remaining planner gap: another field does not authorize removal of the title intent');
  assert.equal(result.overlay.items[value.itemRef].title, '개인 Item B');
});

test('B3-I03 explicit inherit still removes only the requested personal title intents', (t) => {
  const value = actualPreviouslyDifferentTitleFixture();
  const draft: PersonalWorkspacePocPlanDraft = {
    ...value.opened.draft, title: { mode: 'inherit' },
    items: { ...value.opened.draft.items, [value.itemRef]: { ...value.opened.draft.items[value.itemRef], title: { mode: 'inherit' } } },
  };
  const { result, summary } = inspect(value, draft);
  t.diagnostic(JSON.stringify({ id: 'B3-I03', actualKind: result.kind, flowTitle: result.overlay.title ?? null, itemTitle: result.overlay.items[value.itemRef]?.title ?? null, summary, storageCalls: 0 }));
  assert.equal(result.kind, 'change');
  assert.equal(result.overlay.title, undefined);
  assert.equal(result.overlay.items[value.itemRef], undefined);
  assert.equal(summary.changes.length, 2);
  assert.deepEqual(result.state.placements, value.state.placements);
  assert.deepEqual(result.state.completions, value.state.completions);
});
