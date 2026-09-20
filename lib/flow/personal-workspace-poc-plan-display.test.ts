import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERSONAL_WORKSPACE_POC_VERSION, toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef,
  type PersonalWorkspacePocFlow,
} from './personal-workspace-poc-contract';
import { openPersonalWorkspacePocPlanEditor, type PersonalWorkspacePocPlanDraft } from './personal-workspace-poc-plan-editor';
import { summarizePersonalWorkspacePocPlanDraftChanges } from './personal-workspace-poc-editor-receipt';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';
import { createPersonalWorkspacePocReceipt, type PersonalWorkspacePocReceiptInput } from './personal-workspace-poc-receipt';
import {
  createPersonalWorkspacePocPlanDisplay, selectPersonalWorkspacePocPlanDisplayPage,
  PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_PAGE_SIZE,
  type PersonalWorkspacePocPlanDisplayInput, type PersonalWorkspacePocPlanDisplay,
} from './personal-workspace-poc-plan-display';

const T0 = '2026-09-03T00:00:00.000Z', T1 = '2026-09-03T01:00:00.000Z';
function fixture(size = 2, twoFields = false) {
  const savedCopyId = 'display-copy', flowId = 'display-flow';
  const flow: PersonalWorkspacePocFlow = {
    ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId), savedCopyId, flowId,
    origin: 'personal-draft', sourceSlug: 'display-source', title: '같은 제목',
    sections: [
      { sectionId: 'step.1', title: '같은 구간', sourceOrder: 0, titleOwner: 'existing-personal', editCapability: 'poc-shadow' },
      { sectionId: 'readonly', title: '원문 구간', sourceOrder: 1, titleOwner: 'source', editCapability: 'read-only' },
    ],
    items: Array.from({ length: size }, (_, index) => ({
      ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, `item.${index}`),
      savedCopyId, flowId, itemId: `item.${index}`, title: '같은 할 일',
      sourceOrder: index, sourceDate: '2026-09-03', sectionId: 'step.1', sectionTitle: '같은 구간',
    })),
  };
  const state = createPersonalWorkspacePocState(T0);
  const model = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [flow] };
  const opened = openPersonalWorkspacePocPlanEditor({ baseModel: model, state, stateRaw: JSON.stringify(state), flowRef: flow.ref });
  if (!opened.ok) assert.fail(opened.failure.code);
  const draft = flow.items.reduce<PersonalWorkspacePocPlanDraft>((current, item) => ({
    ...current, items: { ...current.items, [item.ref]: { ...current.items[item.ref],
      memo: { mode: 'override', value: `개인 메모 ${item.itemId}` },
      ...(twoFields ? { schedule: { mode: 'fixed_date' as const, date: '2026-09-05' } } : {}),
    } },
  }), opened.draft);
  const summary = summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow: flow, baseline: opened.draft, draft });
  const input: PersonalWorkspacePocPlanDisplayInput = {
    receiptId: 'display-result-1', intentId: 'display-intent-1', operation: 'commit-personal-plan', status: 'success',
    createdAt: T1, scopeRef: flow.ref, affectedRefs: summary.affectedRefs, affectedCount: summary.affectedRefs.length,
    changes: summary.changes, stateRevisionBefore: 0, stateRevisionAfter: 1,
    targetWriteCount: 1, supportWriteCount: 4, rollback: 'not-needed', undoLabel: '이 변경 되돌리기',
  };
  return { flow, model, state, opened, draft, input };
}
function requireDisplay(input: PersonalWorkspacePocPlanDisplayInput, source: PersonalWorkspacePocFlow) {
  const result = createPersonalWorkspacePocPlanDisplay(input, source);
  if (!result.ok) assert.fail(result.error);
  return result.display;
}
function failure(input: unknown, flow: PersonalWorkspacePocFlow, error?: string) {
  const result = createPersonalWorkspacePocPlanDisplay(input as PersonalWorkspacePocPlanDisplayInput, flow);
  assert.equal(result.ok, false);
  if (!result.ok && error) assert.equal(result.error, error);
}
function statusInput(input: PersonalWorkspacePocPlanDisplayInput, status: PersonalWorkspacePocPlanDisplayInput['status']) {
  const { undoLabel: _label, ...base } = input;
  return { ...base, status, stateRevisionAfter: 0, targetWriteCount: 0, supportWriteCount: 0 };
}

test('PD01 actual opener/summary 100 and 101 fields retain all identities; original v1 cap stays strict', () => {
  for (const size of [100, 101]) {
    const value = fixture(size);
    const display = requireDisplay(value.input, value.flow);
    assert.equal(display.contract, 'flowme-personal-workspace-plan-display-v1'); assert.equal(display.version, 1);
    assert.equal(display.changedFieldCount, size); assert.equal(display.affectedCount, size);
    assert.equal(display.flowCount, 0); assert.equal(display.itemCount, size);
    assert.deepEqual(display.changes, value.input.changes); assert.deepEqual(display.affectedRefs, value.input.affectedRefs);
    const old = createPersonalWorkspacePocReceipt(value.input as PersonalWorkspacePocReceiptInput);
    assert.equal(old.ok, size === 100);
    if (!old.ok) assert.equal(old.error, 'invalid-affected-refs');
  }
});

test('PD02 102 fields on 51 Items remain 102 changes and 51 owners, not a fabricated Flow aggregate', () => {
  const value = fixture(51, true);
  const display = requireDisplay(value.input, value.flow);
  assert.equal(display.changedFieldCount, 102); assert.equal(display.affectedCount, 51);
  assert.equal(display.flowCount, 0); assert.equal(display.itemCount, 51);
  assert.equal(createPersonalWorkspacePocReceipt(value.input as PersonalWorkspacePocReceiptInput).ok, false);
});

test('PD03 Flow title/section/order and Item memo/date use their exact direct owners once', () => {
  const value = fixture(2);
  const first = value.flow.items[0].ref;
  const draft: PersonalWorkspacePocPlanDraft = {
    ...value.opened.draft, title: { mode: 'override', value: '내 계획' },
    sectionTitles: { 'step.1': { mode: 'override', value: '내 구간' } },
    orderedItemRefs: [...value.opened.draft.orderedItemRefs].reverse(),
    items: { ...value.opened.draft.items, [first]: { ...value.opened.draft.items[first],
      memo: { mode: 'override', value: '메모' }, schedule: { mode: 'fixed_date', date: '2026-09-05' },
    } },
  };
  const summary = summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow: value.flow, baseline: value.opened.draft, draft });
  const display = requireDisplay({ ...value.input, ...summary, affectedCount: summary.affectedRefs.length }, value.flow);
  assert.equal(display.changedFieldCount, 5); assert.equal(display.affectedCount, 2);
  assert.equal(display.flowCount, 1); assert.equal(display.itemCount, 1);
  assert.deepEqual(display.affectedRefs, [value.flow.ref, first]);
});

test('PD04 preview/saving/noop/failure/canceled/success/undone validate separate status facts', () => {
  const value = fixture();
  for (const status of ['preview', 'saving', 'canceled', 'failure', 'undone', 'noop', 'success'] as const) {
    const input: PersonalWorkspacePocPlanDisplayInput = status === 'success' ? value.input : status === 'undone'
      ? { ...value.input, status, receiptId: 'undo-result', undoOfReceiptId: value.input.receiptId }
      : { ...statusInput(value.input, status),
        ...(status === 'canceled' ? { returnContext: 'flow-detail' as const } : {}),
        ...(status === 'failure' ? { errorCode: 'quota-error' } : {}),
        ...(status === 'noop' ? { affectedRefs: [], affectedCount: 0, changes: [] } : {}),
      };
    assert.equal(requireDisplay(input, value.flow).status, status);
  }
});

test('PD05 invalid status revisions/write/rollback/extras and fake noop fail closed', () => {
  const value = fixture();
  for (const patch of [{ targetWriteCount: 0 }, { targetWriteCount: 2 }, { stateRevisionAfter: 2 },
    { stateRevisionBefore: -1 }, { rollback: 'complete' }, { errorCode: 'bad-extra' }, { retryIntent: {} },
    { status: 'foreign' }, { status: 'noop' }, { undoOfReceiptId: 'other' }]) failure({ ...value.input, ...patch }, value.flow);
  failure({ ...statusInput(value.input, 'preview'), targetWriteCount: 1 }, value.flow);
  failure({ ...statusInput(value.input, 'canceled'), returnContext: 'unknown' }, value.flow);
  failure({ ...value.input, status: 'undone', undoOfReceiptId: value.input.receiptId }, value.flow, 'self-undo-receipt');
});

test('PD06 failure keeps rollback facts without serializable retry authority', () => {
  const value = fixture();
  for (const rollback of ['not-needed', 'complete', 'recovery-required'] as const) {
    const input = { ...statusInput(value.input, 'failure'), rollback, supportWriteCount: rollback === 'not-needed' ? 0 : 2, errorCode: 'storage-failed' };
    const display = requireDisplay(input, value.flow);
    assert.equal(display.status, 'failure'); assert.equal(display.rollback, rollback);
    assert.equal(Object.hasOwn(display, 'retryIntent'), false);
    failure({ ...input, retryIntent: { kind: 'commit-personal-plan', parameters: {} } }, value.flow);
  }
  failure({ ...statusInput(value.input, 'failure'), rollback: 'recovery-required', errorCode: 'failure' }, value.flow);
  failure({ ...statusInput(value.input, 'failure'), rollback: 'not-needed', supportWriteCount: 1, errorCode: 'failure' }, value.flow);
});

test('PD07 duplicate field/ref and wrong count/full owner set are rejected, not silently deduplicated', () => {
  const value = fixture();
  failure({ ...value.input, changes: [value.input.changes[0], value.input.changes[0]] }, value.flow, 'duplicate-change-field');
  failure({ ...value.input, affectedRefs: [value.input.affectedRefs[0], value.input.affectedRefs[0]] }, value.flow, 'duplicate-affected-ref');
  failure({ ...value.input, affectedCount: 1 }, value.flow, 'affected-count-mismatch');
  failure({ ...value.input, affectedRefs: [value.flow.ref], affectedCount: 1 }, value.flow, 'affected-owner-mismatch');
});

test('PD08 same-title other copy, source tuple drift, duplicate Items and foreign scopes are rejected', () => {
  const value = fixture();
  const otherRef = toPersonalWorkspacePocFlowRef('other-copy', value.flow.flowId);
  failure({ ...value.input, scopeRef: otherRef }, value.flow, 'foreign-scope');
  failure(value.input, { ...value.flow, savedCopyId: 'other-copy' }, 'source-flow-identity-mismatch');
  failure(value.input, { ...value.flow, items: [value.flow.items[0], value.flow.items[0]] }, 'duplicate-source-item');
  failure(value.input, { ...value.flow, items: [{ ...value.flow.items[0], savedCopyId: 'other-copy' }, value.flow.items[1]] }, 'source-item-identity-mismatch');
});

test('PD09 only exact current Plan fields and editable sections are allowed', () => {
  const value = fixture();
  for (const field of ['rawText', 'flow.title.extra', 'item.item.9.memo', 'section.readonly.title', 'flow.folder', 'item.item.0.completed']) {
    failure({ ...value.input, changes: [{ ...value.input.changes[0], field }] }, value.flow, 'foreign-change-field');
  }
  failure({ ...value.input, changes: [{ ...value.input.changes[0], owner: 'execution' }] }, value.flow, 'invalid-change-owner');
  failure(value.input, { ...value.flow, sections: [value.flow.sections![0], value.flow.sections![0]] }, 'duplicate-source-section');
});

test('PD10 child preview/cancel/failure remain one Item and cannot claim root writes or sibling fields', () => {
  const value = fixture();
  const ref = value.flow.items[0].ref;
  const base = { ...statusInput(value.input, 'preview'), operation: 'apply-item-to-parent-personal-draft' as const,
    scopeRef: ref, changes: [value.input.changes[0]], affectedRefs: [ref], affectedCount: 1 };
  assert.equal(requireDisplay(base, value.flow).itemCount, 1);
  assert.equal(requireDisplay({ ...base, status: 'canceled', returnContext: 'parent-plan' }, value.flow).status, 'canceled');
  assert.equal(requireDisplay({ ...base, status: 'failure', errorCode: 'invalid-item' }, value.flow).status, 'failure');
  failure({ ...base, changes: value.input.changes }, value.flow, 'foreign-change-field');
  failure({ ...base, status: 'saving' }, value.flow, 'invalid-child-storage-status');
  failure({ ...base, status: 'success', stateRevisionAfter: 1, targetWriteCount: 1, undoLabel: 'Undo' }, value.flow, 'invalid-child-storage-status');
});

test('PD11 unknown/raw/authority keys, optional undefined and missing required data fail closed', () => {
  const value = fixture();
  for (const patch of [{ rawText: 'private' }, { trusted: true }, { version: 1 }, { contract: 'pretend' }, { changedFieldCount: 2 }, { returnContext: undefined }]) {
    failure({ ...value.input, ...patch }, value.flow);
  }
  const missing = { ...value.input } as Record<string, unknown>;
  delete missing.affectedRefs;
  failure(missing, value.flow, 'missing-plan-display-field');
});

test('PD12 own getters at input/change/source are rejected without invoking them', () => {
  const value = fixture(); let calls = 0;
  const accessor = () => { calls += 1; throw new Error('must not execute'); };
  const input = { ...value.input };
  Object.defineProperty(input, 'status', { enumerable: true, get: accessor });
  failure(input, value.flow, 'accessor-or-hidden-data');
  const change = { ...value.input.changes[0] };
  Object.defineProperty(change, 'before', { enumerable: true, get: accessor });
  failure({ ...value.input, changes: [change] }, value.flow, 'accessor-or-hidden-data');
  const source = { ...value.flow };
  Object.defineProperty(source, 'items', { enumerable: true, get: accessor });
  failure(value.input, source, 'accessor-or-hidden-data');
  assert.equal(calls, 0);
});

test('PD13 cycles/class instances/array properties/sparse arrays/symbols/toJSON are rejected', () => {
  const value = fixture();
  const cycle: Record<string, unknown> = { ...value.input }; cycle.loop = cycle;
  failure(cycle, value.flow, 'cyclic-data');
  failure(Object.assign(new (class Input {})(), value.input), value.flow, 'non-plain-data');
  const extra = [...value.input.changes]; Object.assign(extra, { hiddenOwner: true });
  failure({ ...value.input, changes: extra }, value.flow, 'invalid-array-key');
  failure({ ...value.input, changes: new Array(2) }, value.flow, 'sparse-array');
  failure({ ...value.input, [Symbol('authority')]: true }, value.flow, 'symbol-key');
  let calls = 0;
  failure({ ...value.input, toJSON: () => { calls += 1; return value.input; } }, value.flow, 'unsafe-data-key');
  assert.equal(calls, 0);
});

test('PD14 display label/value/identifiers keep existing scalar limits without normalizing unsafe input', () => {
  const value = fixture();
  for (const patch of [{ label: '가'.repeat(161) }, { label: ' 첫 일' }, { before: 'A\nB' }, { after: '가'.repeat(161) },
    { before: Number.NaN }, { after: { rawText: 'private' } }, { field: ' rawText' }]) {
    failure({ ...value.input, changes: [{ ...value.input.changes[0], ...patch }] }, value.flow);
  }
  failure({ ...value.input, receiptId: ' bad' }, value.flow);
  failure({ ...value.input, createdAt: '2026-09-03' }, value.flow);
});

test('PD15 all 101/102 rows are exactly recoverable through 10-row paging with full totals', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_PAGE_SIZE, 10);
  for (const value of [fixture(101), fixture(51, true)]) {
    const display = requireDisplay(value.input, value.flow);
    const rows = [];
    for (let index = 0; index < 11; index += 1) {
      const selected = selectPersonalWorkspacePocPlanDisplayPage(display, index);
      if (!selected.ok) assert.fail(selected.error);
      assert.equal(selected.page.pageCount, 11); assert.equal(selected.page.pageIndex, index);
      assert.ok(selected.page.rows.length <= 10); assert.equal(selected.page.startIndex, index * 10);
      assert.equal(selected.page.changedFieldCount, display.changedFieldCount);
      assert.equal(selected.page.affectedCount, display.affectedCount);
      rows.push(...selected.page.rows);
    }
    assert.deepEqual(rows, display.changes);
  }
});

test('PD16 empty pages, clamping, invalid indices, cloned and foreign display objects have explicit outcomes', () => {
  const value = fixture();
  const display = requireDisplay({ ...statusInput(value.input, 'noop'), affectedRefs: [], affectedCount: 0, changes: [] }, value.flow);
  const selected = selectPersonalWorkspacePocPlanDisplayPage(display, 999);
  if (!selected.ok) assert.fail(selected.error);
  assert.deepEqual(selected.page, { pageIndex: 0, pageSize: 10, pageCount: 1, startIndex: 0, endIndex: 0,
    rows: [], changedFieldCount: 0, affectedCount: 0, flowCount: 0, itemCount: 0 });
  for (const index of [-1, 0.1, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(selectPersonalWorkspacePocPlanDisplayPage(display, index).ok, false);
  assert.deepEqual(selectPersonalWorkspacePocPlanDisplayPage(structuredClone(display), 0), { ok: false, error: 'display-not-issued' });
  assert.equal(selectPersonalWorkspacePocPlanDisplayPage({} as PersonalWorkspacePocPlanDisplay, 0).ok, false);
});

test('PD17 deep freeze/copy isolate original inputs and pages never mutate full display', () => {
  const value = fixture();
  const before = JSON.stringify(value);
  const display = requireDisplay(value.input, value.flow);
  const displayRaw = JSON.stringify(display);
  assert.equal(JSON.stringify(value), before);
  assert.ok(Object.isFrozen(display)); assert.ok(Object.isFrozen(display.changes));
  assert.ok(Object.isFrozen(display.changes[0])); assert.ok(Object.isFrozen(display.affectedRefs));
  assert.notEqual(display.changes, value.input.changes); assert.notEqual(display.changes[0], value.input.changes[0]);
  const selected = selectPersonalWorkspacePocPlanDisplayPage(display, 0);
  if (!selected.ok) assert.fail(selected.error);
  assert.ok(Object.isFrozen(selected.page)); assert.ok(Object.isFrozen(selected.page.rows));
  assert.throws(() => (display.changes as unknown[]).push('bad'));
  assert.equal(JSON.stringify(display), displayRaw); assert.equal(JSON.stringify(value), before);
});

test('PD18 inverse display preserves exact fields/refs and does not create or consume an Undo snapshot', () => {
  const value = fixture(101);
  const saved = requireDisplay(value.input, value.flow);
  const beforeState = JSON.stringify(value.state);
  const inverse = requireDisplay({ ...value.input, status: 'undone', receiptId: 'undo-large',
    undoOfReceiptId: saved.receiptId, stateRevisionBefore: 1, stateRevisionAfter: 2,
    changes: saved.changes.map(change => ({ ...change, before: change.after, after: change.before })),
  }, value.flow);
  assert.equal(inverse.changedFieldCount, 101); assert.deepEqual(inverse.affectedRefs, saved.affectedRefs);
  assert.deepEqual(inverse.changes.map(row => [row.field, row.after]), saved.changes.map(row => [row.field, row.before]));
  assert.equal(JSON.stringify(value.state), beforeState);
  for (const key of ['state', 'rawText', 'candidate', 'guard', 'undo', 'retryIntent', 'canUndo']) assert.equal(Object.hasOwn(inverse, key), false);
});

test('PD19 missing status-specific own fields cannot invoke inherited accessors or adopt prototype values', () => {
  const value = fixture(); let calls = 0;
  const { undoLabel: _label, ...withoutLabel } = value.input;
  const variants: Array<[string, unknown]> = [
    ['undoLabel', withoutLabel],
    ['returnContext', statusInput(value.input, 'canceled')],
    ['errorCode', statusInput(value.input, 'failure')],
    ['undoOfReceiptId', { ...value.input, status: 'undone' }],
  ];
  for (const [key, input] of variants) {
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, key);
    Object.defineProperty(Object.prototype, key, { configurable: true, get: () => { calls += 1; return 'inherited'; } });
    try { failure(input, value.flow); }
    finally {
      if (previous) Object.defineProperty(Object.prototype, key, previous);
      else Reflect.deleteProperty(Object.prototype, key);
    }
  }
  assert.equal(calls, 0);
});

test('PD20 source identity inventory rejects malformed membership and retains harmless source data without returning it', () => {
  const value = fixture();
  failure(value.input, { ...value.flow, origin: 'unsupported' } as unknown as PersonalWorkspacePocFlow);
  failure(value.input, { ...value.flow, items: [] });
  failure(value.input, { ...value.flow, items: [{ ...value.flow.items[0], sourceOrder: -1 }, value.flow.items[1]] });
  const source = { ...value.flow, optionalSourceFact: undefined, sourceDetails: { rawText: '개인 결과 DTO에 넣지 않는 원문' } };
  const before = JSON.stringify(source);
  const display = requireDisplay(value.input, source);
  assert.equal(JSON.stringify(source), before);
  assert.equal(JSON.stringify(display).includes('개인 결과 DTO에 넣지 않는 원문'), false);
  assert.equal(Object.hasOwn(display, 'sourceDetails'), false);
});
