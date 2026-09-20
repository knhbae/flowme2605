import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_STATE_KEY, PERSONAL_WORKSPACE_POC_STORAGE_PREFIX,
  PERSONAL_WORKSPACE_POC_VERSION, toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef, type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import { summarizePersonalWorkspacePocPlanDraftChanges } from './personal-workspace-poc-editor-receipt';
import {
  createPersonalWorkspacePocPlanEditorHandlers, openPersonalWorkspacePocPlanEditor,
  preflightPersonalWorkspacePocPlanCommit, type PersonalWorkspacePocPlanDraft,
} from './personal-workspace-poc-plan-editor';
import { createPersonalWorkspacePocReceipt } from './personal-workspace-poc-receipt';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';

const T0 = '2026-09-03T00:00:00.000Z';
const T1 = '2026-09-03T01:00:00.000Z';
const SENTINEL = ['flow:operating:order-display', '{ "keep": "원문\\r\\n" }'] as const;

class MemoryStorage {
  readonly values: Map<string, string>;
  readonly calls: Array<{ method: string; key: string }> = [];
  constructor(raw: string) { this.values = new Map([[PERSONAL_WORKSPACE_POC_STATE_KEY, raw], SENTINEL]); }
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, raw: string) {
    assert.ok(key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX));
    this.calls.push({ method: 'setItem', key }); this.values.set(key, raw);
  }
  removeItem(key: string) {
    assert.ok(key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX));
    this.calls.push({ method: 'removeItem', key }); this.values.delete(key);
  }
  clear() { assert.fail('clear is forbidden'); }
}

function fixture(titles: string[], capturedTitle?: string) {
  // Deliberately short genuine refs used to leak through the <=160 display path.
  const savedCopyId = 'c', flowId = 'f';
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const flow: PersonalWorkspacePocFlow = {
    ref: flowRef, savedCopyId, flowId, title: '계획', origin: 'legacy-saved-plan', sourceSlug: 'source',
    items: titles.map((title, index) => ({
      ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, String(index)),
      savedCopyId, flowId, itemId: String(index), title, sourceOrder: index,
      description: '원문은 표시용 요약 때문에 바뀌지 않음', sourceDate: '2026-09-03',
    })),
  };
  const model: PersonalWorkspacePocReadModel = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [flow] };
  const state = createPersonalWorkspacePocState(T0);
  if (capturedTitle !== undefined) {
    const ref = flow.items[0].ref;
    state.personalPlanOverlays = { [flowRef]: { flowRef, savedCopyId, flowId, items: { [ref]: { itemRef: ref, title: capturedTitle } } } };
  }
  const raw = JSON.stringify(state), sourceRaw = JSON.stringify(model);
  const opened = openPersonalWorkspacePocPlanEditor({ baseModel: model, state, stateRaw: raw, flowRef });
  if (!opened.ok) assert.fail(opened.failure.code);
  return { flow, model, state, raw, sourceRaw, opened, storage: new MemoryStorage(raw) };
}

async function savedOrder(t: TestContext, id: string, value: ReturnType<typeof fixture>, draft: PersonalWorkspacePocPlanDraft) {
  const inputRaw = JSON.stringify(draft);
  const summary = summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow: value.flow, baseline: value.opened.draft, draft });
  const check = (currentBaseModel = value.model, currentStateRaw = value.raw) => preflightPersonalWorkspacePocPlanCommit({
    draft, guard: value.opened.guard, currentBaseModel, currentState: value.state, currentStateRaw, now: T1,
  });
  const preflight = check();
  if (!preflight.ok) assert.fail(preflight.failure.code);
  assert.equal(preflight.kind, 'change');
  assert.deepEqual(preflight.overlay.orderedItemRefs, draft.orderedItemRefs);
  assert.equal(check(value.model, `${value.raw} `).ok, false, 'summary cannot bypass exact raw preflight');
  assert.equal(check({ ...value.model, flows: [{ ...value.flow, title: '다른 원문' }] }).ok, false, 'summary cannot bypass source preflight');
  let currentBaseModel = value.model;
  const handlers = createPersonalWorkspacePocPlanEditorHandlers({
    storage: value.storage, guard: value.opened.guard, readCurrentState: () => value.state,
    readCurrentBaseModel: () => currentBaseModel, now: () => T1,
  });
  // Fixture-only drift, not a product write. The actual prepare handler must
  // still read and reject the exact raw/source mismatch before any mutation.
  value.storage.values.set(PERSONAL_WORKSPACE_POC_STATE_KEY, `${value.raw} `);
  await assert.rejects(async () => handlers.preparePersonalOverlay({ transactionId: id, requestId: 'raw-stale', revision: 1, draft }));
  assert.equal(value.storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), `${value.raw} `);
  value.storage.values.set(PERSONAL_WORKSPACE_POC_STATE_KEY, value.raw);
  currentBaseModel = { ...value.model, flows: [{ ...value.flow, title: '다른 원문' }] };
  await assert.rejects(async () => handlers.preparePersonalOverlay({ transactionId: id, requestId: 'source-stale', revision: 1, draft }));
  assert.equal(value.storage.calls.length, 0);
  currentBaseModel = value.model;
  const prepared = await handlers.preparePersonalOverlay({ transactionId: id, requestId: `${id}-request`, revision: 1, draft });
  assert.equal(value.storage.calls.length, 0);
  await prepared.commit();
  const targetWrites = value.storage.calls.filter(call => call.key === PERSONAL_WORKSPACE_POC_STATE_KEY).length;
  const supportWrites = value.storage.calls.length - targetWrites;
  assert.equal(targetWrites, 1); assert.equal(supportWrites, 4);
  assert.equal(value.storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), JSON.stringify(preflight.state));
  assert.equal(JSON.stringify(value.model), value.sourceRaw);
  assert.equal(JSON.stringify(value.state), value.raw);
  assert.equal(JSON.stringify(draft), inputRaw);
  assert.equal(value.storage.getItem(SENTINEL[0]), SENTINEL[1]);
  const order = summary.changes.find(change => change.field === 'flow.item-order');
  assert.ok(order); assert.equal(order.owner, 'poc-personal-plan'); assert.equal(order.label, 'Item 순서');
  assert.ok(summary.affectedRefs.includes(value.flow.ref));
  const receipt = createPersonalWorkspacePocReceipt({
    receiptId: `${id}-receipt`, intentId: id, operation: 'commit-personal-plan', status: 'success', createdAt: T1,
    scopeRef: value.flow.ref, affectedRefs: summary.affectedRefs, affectedCount: summary.affectedRefs.length,
    stateRevisionBefore: value.state.revision, stateRevisionAfter: preflight.state.revision,
    changes: summary.changes, targetWriteCount: targetWrites, supportWriteCount: supportWrites,
    rollback: 'not-needed', undoLabel: '이 변경 되돌리기',
  });
  assert.equal(receipt.ok, true);
  t.diagnostic(JSON.stringify({ id, targetWrites, supportWrites, receiptValid: receipt.ok, sourceExact: true,
    operatingSentinelExact: true, outsidePrefixCalls: 0, clearCalls: 0, rawAndSourcePreflightRejected: true,
    actualHandlerRawAndSourceRejectedBeforePrepare: true,
    before: order.before, after: order.after }));
  return { summary, order, preflight };
}

test('B3-OD01 short real refs stay identity-only while order display uses captured and normalized titles', async (t) => {
  const value = fixture(['첫 일', '둘째 일'], '내 첫 일');
  const first = value.flow.items[0].ref;
  const draft: PersonalWorkspacePocPlanDraft = {
    ...value.opened.draft, orderedItemRefs: [...value.opened.draft.orderedItemRefs].reverse(),
    items: { ...value.opened.draft.items, [first]: { ...value.opened.draft.items[first], title: { mode: 'override', value: '첫 일' } } },
  };
  const { summary, order, preflight } = await savedOrder(t, 'B3-OD01', value, draft);
  assert.deepEqual(summary.affectedRefs, [value.flow.ref, first]);
  assert.equal(preflight.overlay.items[first], undefined, 'new source-equal title uses the existing normalizer');
  assert.equal(order.before, '1. 내 첫 일 → 2. 둘째 일');
  assert.equal(order.after, '1. 둘째 일 → 2. 첫 일');
  for (const item of value.flow.items) {
    assert.ok(!String(order.before).includes(item.ref)); assert.ok(!String(order.after).includes(item.ref));
  }
});

test('B3-OD02 duplicate titles do not hide a real exact-ref permutation or expose refs to disambiguate it', async (t) => {
  const value = fixture(['같은 일', '같은 일']);
  const draft = { ...value.opened.draft, orderedItemRefs: [...value.opened.draft.orderedItemRefs].reverse() };
  const { summary, order } = await savedOrder(t, 'B3-OD02', value, draft);
  assert.deepEqual(summary.affectedRefs, [value.flow.ref]); assert.equal(summary.changes.length, 1);
  assert.equal(order.before, '기존 순서 · 2개'); assert.equal(order.after, '변경된 순서 · 2개');
  assert.deepEqual(summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow: value.flow,
    baseline: value.opened.draft, draft: value.opened.draft }), { changes: [], affectedRefs: [] });
});

test('B3-OD03 long order is count-bounded and control-character titles are sanitized only in the display', async (t) => {
  // Two bounded fixture variants inside one registered test, not two new scenarios.
  for (const [label, titles] of [['long', ['😀'.repeat(100), '나'.repeat(170)]], ['control', ['첫\r\n일\u0000', '둘째\t일']]] as const) {
    const value = fixture([...titles]);
    const draft = { ...value.opened.draft, orderedItemRefs: [...value.opened.draft.orderedItemRefs].reverse() };
    const { order, summary } = await savedOrder(t, `B3-OD03-${label}`, value, draft);
    assert.equal(summary.changes.length, 1); assert.deepEqual(summary.affectedRefs, [value.flow.ref]);
    for (const display of [String(order.before), String(order.after)]) {
      assert.ok(display.length <= 160); assert.doesNotMatch(display, /[\r\n\u0000-\u001f\u007f]/u);
      assert.equal(new TextDecoder().decode(new TextEncoder().encode(display)), display);
      for (const item of value.flow.items) assert.ok(!display.includes(item.ref));
    }
    if (label === 'long') {
      assert.equal(order.before, '기존 순서 · 2개'); assert.equal(order.after, '변경된 순서 · 2개');
    } else {
      assert.equal(order.before, '1. 첫  일 → 2. 둘째 일'); assert.equal(order.after, '1. 둘째 일 → 2. 첫  일');
    }
  }
});
