import assert from 'node:assert/strict';
import test, { after, type TestContext } from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_STATE_KEY,
  PERSONAL_WORKSPACE_POC_STORAGE_PREFIX,
  PERSONAL_WORKSPACE_POC_VERSION,
  getPersonalWorkspacePocFlowItemFieldOwnership,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import { summarizePersonalWorkspacePocPlanDraftChanges } from './personal-workspace-poc-editor-receipt';
import {
  createPersonalWorkspacePocPlanEditorHandlers,
  openPersonalWorkspacePocPlanEditor,
  preflightPersonalWorkspacePocPlanCommit,
  type PersonalWorkspacePocPlanDraft,
} from './personal-workspace-poc-plan-editor';
import { createPersonalWorkspacePocReceipt } from './personal-workspace-poc-receipt';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';

// B3-A independent RED gate. These tests call the existing Plan preflight,
// real prepared storage handler, summary, and receipt validator. Only this
// fixture's in-memory Map is writable; there is no browser or operating I/O.
const T0 = '2026-09-03T00:00:00.000Z';
const T1 = '2026-09-03T01:00:00.000Z';
const SENTINEL_KEY = 'flow:operating:b3-summary-sentinel';
const SENTINEL_RAW = '{ "fixture": "운영 영역 보존\\r\\n", "version": 17 }';
const observations: Record<string, unknown>[] = [];

class FixtureStorage {
  private readonly values: Map<string, string>;
  readonly calls: Array<{ method: 'setItem' | 'removeItem'; key: string }> = [];
  outsidePrefixCalls = 0;
  clearCalls = 0;

  constructor(raw: string) {
    this.values = new Map([[PERSONAL_WORKSPACE_POC_STATE_KEY, raw], [SENTINEL_KEY, SENTINEL_RAW]]);
  }
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  private record(method: 'setItem' | 'removeItem', key: string) {
    if (!key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX)) this.outsidePrefixCalls += 1;
    assert.ok(key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX), 'fixture write escaped PoC prefix');
    this.calls.push({ method, key });
  }
  setItem(key: string, raw: string) { this.record('setItem', key); this.values.set(key, raw); }
  removeItem(key: string) { this.record('removeItem', key); this.values.delete(key); }
  clear() { this.clearCalls += 1; assert.fail('clear is forbidden even in this fixture'); }
}

function fixture(options: {
  count?: number; firstTitle?: string; firstMemo?: string; longRefs?: boolean;
  importedMemo?: string; editableSectionTitle?: string;
} = {}) {
  const savedCopyId = options.longRefs ? `copy-${'c'.repeat(40)}` : 'b3-summary-copy';
  const flowId = options.longRefs ? `flow-${'f'.repeat(40)}` : 'b3-summary-flow';
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  let flow: PersonalWorkspacePocFlow = {
    ref: flowRef, savedCopyId, flowId, sourceSlug: 'b3-summary-source',
    title: '원본 Flow', origin: 'legacy-saved-plan',
    items: Array.from({ length: options.count ?? 2 }, (_, index) => ({
      ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, `item-${index}`),
      savedCopyId, flowId, itemId: `item-${index}`,
      title: index === 0 ? options.firstTitle ?? '첫 할 일' : `할 일 ${index}`,
      description: '원본 설명이며 개인 메모가 아님',
      sourceOrder: index, sourceDate: '2026-09-03',
    })),
  };
  if (options.editableSectionTitle !== undefined) {
    flow = {
      ...flow, origin: 'personal-draft',
      sections: [{ sectionId: 'section-b3', title: options.editableSectionTitle, sourceOrder: 0, titleOwner: 'existing-personal', editCapability: 'poc-shadow' }],
      items: flow.items.map(item => ({ ...item, sectionId: 'section-b3', sectionTitle: options.editableSectionTitle })),
    };
  }
  if (options.importedMemo !== undefined) {
    const item = flow.items[0];
    const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
    const personal = { value: options.importedMemo, owner: 'existing-personal' as const, provenance: 'my-flow-item-draft' as const };
    flow = { ...flow, items: [{
      ...item, description: options.importedMemo,
      fieldOwnership: { ...ownership, description: { source: ownership.description.source, existingPersonal: personal, effective: personal } },
    }, ...flow.items.slice(1)] };
  }
  const model: PersonalWorkspacePocReadModel = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [flow] };
  const state = createPersonalWorkspacePocState(T0);
  if (options.firstMemo !== undefined) {
    const itemRef = flow.items[0].ref;
    state.personalPlanOverlays = {
      [flowRef]: { flowRef, savedCopyId, flowId, items: { [itemRef]: { itemRef, memo: options.firstMemo } } },
    };
  }
  const raw = JSON.stringify(state);
  const sourceRaw = JSON.stringify(model);
  const opened = openPersonalWorkspacePocPlanEditor({ baseModel: model, state, stateRaw: raw, flowRef });
  if (!opened.ok) assert.fail(`the existing real Plan opener must accept the fixture: ${opened.failure.code}`);
  return { flow, model, state, raw, sourceRaw, opened, storage: new FixtureStorage(raw) };
}

function withMemo(draft: PersonalWorkspacePocPlanDraft, itemRef: string, value: string): PersonalWorkspacePocPlanDraft {
  return {
    ...draft,
    items: { ...draft.items, [itemRef]: { ...draft.items[itemRef], memo: { mode: 'override', value } } },
  };
}

async function actualCommitAndReceipt(
  t: TestContext,
  id: string,
  value: ReturnType<typeof fixture>,
  draft: PersonalWorkspacePocPlanDraft,
  expectedKind: 'change' | 'no-op',
) {
  const beforeDraft = JSON.stringify(draft);
  const summary = summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow: value.flow, baseline: value.opened.draft, draft });
  const preflight = preflightPersonalWorkspacePocPlanCommit({
    draft, guard: value.opened.guard, currentBaseModel: value.model,
    currentState: value.state, currentStateRaw: value.raw, now: T1,
  });
  if (!preflight.ok) assert.fail(`summary fixtures must also pass actual domain validation: ${preflight.failure.code}`);
  assert.equal(preflight.kind, expectedKind);
  const handlers = createPersonalWorkspacePocPlanEditorHandlers({
    storage: value.storage, guard: value.opened.guard,
    readCurrentState: () => value.state, readCurrentBaseModel: () => value.model, now: () => T1,
  });
  const prepared = await handlers.preparePersonalOverlay({ transactionId: id, requestId: `${id}-request`, revision: 1, draft });
  assert.equal(value.storage.calls.length, 0, 'prepare performs no writes');
  await prepared.commit();
  const targetWrites = value.storage.calls.filter((call) => call.key === PERSONAL_WORKSPACE_POC_STATE_KEY).length;
  const supportWrites = value.storage.calls.length - targetWrites;
  assert.equal(targetWrites, expectedKind === 'change' ? 1 : 0);
  assert.equal(value.storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), JSON.stringify(preflight.state));
  assert.equal(preflight.state.revision, value.state.revision + (expectedKind === 'change' ? 1 : 0));
  assert.equal(JSON.stringify(value.model), value.sourceRaw, 'all source fields remain exact');
  assert.equal(JSON.stringify(value.state), value.raw, 'the opened state is not mutated');
  assert.equal(JSON.stringify(draft), beforeDraft, 'receipt processing does not mutate input');
  assert.equal(value.storage.getItem(SENTINEL_KEY), SENTINEL_RAW);
  assert.equal(value.storage.outsidePrefixCalls, 0);
  assert.equal(value.storage.clearCalls, 0);

  const receipt = createPersonalWorkspacePocReceipt({
    receiptId: `${id}-receipt`, intentId: id, operation: 'commit-personal-plan',
    status: expectedKind === 'change' ? 'success' : 'noop', createdAt: T1,
    scopeRef: value.flow.ref, affectedRefs: summary.affectedRefs, affectedCount: summary.affectedRefs.length,
    stateRevisionBefore: value.state.revision, stateRevisionAfter: preflight.state.revision,
    changes: summary.changes, targetWriteCount: targetWrites, supportWriteCount: supportWrites,
    rollback: 'not-needed', ...(expectedKind === 'change' ? { undoLabel: '이 변경 되돌리기' } : {}),
  });
  const observation = {
    id, preflight: preflight.kind, targetWrites, supportWrites,
    summaryCount: summary.changes.length, affectedCount: summary.affectedRefs.length,
    receipt: receipt.ok ? receipt.receipt.status : receipt.error,
    values: summary.changes.length <= 2 ? summary.changes.map(({ field, before, after }) => ({ field, before, after })) : undefined,
    outsidePrefixCalls: value.storage.outsidePrefixCalls, clearCalls: value.storage.clearCalls,
    operatingSentinelExact: true, sourceExact: true, openedStateExact: true,
  };
  observations.push(observation);
  t.diagnostic(JSON.stringify(observation));
  return { summary, preflight, receipt };
}

after(() => {
  console.log(`B3_SUMMARY_BOUNDARY_AUDIT ${JSON.stringify(observations)}`);
});

test('B3-R01 source-equal Flow title override has zero normalized changes and a valid no-op receipt', async (t) => {
  const value = fixture();
  const draft: PersonalWorkspacePocPlanDraft = { ...value.opened.draft, title: { mode: 'override', value: value.flow.title } };
  const result = await actualCommitAndReceipt(t, 'B3-R01', value, draft, 'no-op');
  assert.deepEqual(result.summary, { changes: [], affectedRefs: [] });
  assert.equal(result.receipt.ok, true);
});

test('B3-R02 source-equal Item title override has zero normalized changes and a valid no-op receipt', async (t) => {
  const value = fixture();
  const item = value.flow.items[0];
  const draft: PersonalWorkspacePocPlanDraft = {
    ...value.opened.draft,
    items: { ...value.opened.draft.items, [item.ref]: { ...value.opened.draft.items[item.ref], title: { mode: 'override', value: item.title } } },
  };
  const result = await actualCommitAndReceipt(t, 'B3-R02', value, draft, 'no-op');
  assert.deepEqual(result.summary, { changes: [], affectedRefs: [] });
  assert.equal(result.receipt.ok, true);
});

test('B3-R03 same visible fixed date is a real personal pin, one save, and a valid success receipt', async (t) => {
  const value = fixture();
  const item = value.flow.items[0];
  const draft: PersonalWorkspacePocPlanDraft = {
    ...value.opened.draft,
    items: { ...value.opened.draft.items, [item.ref]: { ...value.opened.draft.items[item.ref], schedule: { mode: 'fixed_date', date: item.sourceDate! } } },
  };
  const result = await actualCommitAndReceipt(t, 'B3-R03', value, draft, 'change');
  assert.deepEqual(result.preflight.overlay.items[item.ref].schedule, { mode: 'fixed_date', date: item.sourceDate });
  assert.equal(result.summary.changes.length, 1);
  assert.equal(result.receipt.ok, true);
});

test('B3-R04 two distinct equal-length long personal memos remain a visible change after the real save', async (t) => {
  const before = '가'.repeat(200);
  const afterMemo = '나'.repeat(200);
  const value = fixture({ firstMemo: before });
  const item = value.flow.items[0];
  const result = await actualCommitAndReceipt(t, 'B3-R04', value, withMemo(value.opened.draft, item.ref, afterMemo), 'change');
  assert.equal(result.preflight.overlay.items[item.ref].memo, afterMemo);
  assert.equal(result.summary.changes.length, 1, 'different memo bytes must not collapse to summary zero');
  assert.equal(result.receipt.ok, true);
  assert.notEqual(result.summary.changes[0].before, result.summary.changes[0].after);
});

test('B3-R05 long order-only permutation has a valid success receipt, not equal compact before/after', async (t) => {
  const value = fixture({ longRefs: true });
  assert.ok(value.opened.draft.orderedItemRefs.join(' → ').length > 160);
  const draft = { ...value.opened.draft, orderedItemRefs: [...value.opened.draft.orderedItemRefs].reverse() };
  const result = await actualCommitAndReceipt(t, 'B3-R05', value, draft, 'change');
  assert.deepEqual(result.preflight.overlay.orderedItemRefs, draft.orderedItemRefs);
  assert.equal(result.summary.changes.length, 1);
  assert.equal(result.receipt.ok, true, 'a verified saved permutation must be representable by the summary');
  assert.notEqual(result.summary.changes[0].before, result.summary.changes[0].after);
});

test('B3-R06 source title containing CRLF stays exact while its receipt label is display-safe', async (t) => {
  const value = fixture({ firstTitle: '첫 줄\r\n다음 줄' });
  const item = value.flow.items[0];
  const result = await actualCommitAndReceipt(t, 'B3-R06', value, withMemo(value.opened.draft, item.ref, '개인 메모'), 'change');
  assert.equal(result.receipt.ok, true, 'receipt label safety must not depend on rewriting the source title');
  assert.doesNotMatch(result.summary.changes[0].label, /[\r\n\u0000-\u001f\u007f]/u);
});

test('B3-R07 source title longer than display capacity stays exact while its receipt label is bounded', async (t) => {
  const value = fixture({ firstTitle: '가'.repeat(161) });
  const item = value.flow.items[0];
  const result = await actualCommitAndReceipt(t, 'B3-R07', value, withMemo(value.opened.draft, item.ref, '개인 메모'), 'change');
  assert.equal(result.receipt.ok, true, 'valid source title length must not break a verified save receipt');
  assert.ok(result.summary.changes[0].label.length <= 160);
});

test('B3-R08 characterize the existing 100-entry receipt cap without treating it as a Plan save limit', async (t) => {
  for (const count of [100, 101]) {
    const value = fixture({ count });
    const draft = value.flow.items.reduce((current, item) => withMemo(current, item.ref, `메모 ${item.itemId}`), value.opened.draft);
    const result = await actualCommitAndReceipt(t, `B3-R08-${count}`, value, draft, 'change');
    assert.equal(Object.keys(result.preflight.overlay.items).length, count);
    assert.equal(result.summary.changes.length, count);
    assert.equal(result.summary.affectedRefs.length, count);
    assert.equal(new Set(result.summary.affectedRefs).size, count);
    // The guard is intentionally preserved. B3 needs a separate bounded
    // presenter/full-count contract, not weakened receipt validation or refs.
    if (count === 100) assert.equal(result.receipt.ok, true);
    else assert.deepEqual(result.receipt, { ok: false, error: 'invalid-affected-refs' });
  }
});

// Additional bounded regressions; these six are separate from the original
// eight RED registrations. The existing expectations above are unchanged.
test('B3-R09 source-equal editable section title is a normalized no-op at Flow scope', async (t) => {
  const value = fixture({ editableSectionTitle: '준비' });
  const draft: PersonalWorkspacePocPlanDraft = {
    ...value.opened.draft, sectionTitles: { 'section-b3': { mode: 'override', value: '준비' } },
  };
  const result = await actualCommitAndReceipt(t, 'B3-R09', value, draft, 'no-op');
  assert.deepEqual(result.summary, { changes: [], affectedRefs: [] });
  assert.equal(result.receipt.ok, true);
});

test('B3-R10 short control-character and empty-label memo collisions compare exact intent first', async (t) => {
  for (const [index, [before, memo]] of [['\r\n', '\n\r'], ['', '없음']].entries()) {
    const value = fixture({ firstMemo: before });
    const item = value.flow.items[0];
    const result = await actualCommitAndReceipt(t, `B3-R10-${index}`, value, withMemo(value.opened.draft, item.ref, memo), 'change');
    assert.equal(result.preflight.overlay.items[item.ref].memo, memo);
    assert.equal(result.summary.changes.length, 1);
    assert.notEqual(result.summary.changes[0].before, result.summary.changes[0].after);
    assert.equal(result.receipt.ok, true);
  }
});

test('B3-R11 exact imported personal memo including empty and CRLF normalizes to no change', async (t) => {
  for (const [index, importedMemo] of ['', ' 첫 줄\r\n둘째 줄 ', '기존 개인 메모'].entries()) {
    const value = fixture({ importedMemo });
    const item = value.flow.items[0];
    const result = await actualCommitAndReceipt(t, `B3-R11-${index}`, value, withMemo(value.opened.draft, item.ref, importedMemo), 'no-op');
    assert.equal(result.preflight.overlay.items[item.ref], undefined);
    assert.deepEqual(result.summary, { changes: [], affectedRefs: [] });
    assert.equal(result.receipt.ok, true);
  }
});

test('B3-R12 absent personal memo does not inherit source description or merge with an empty override', async (t) => {
  for (const [index, memo] of ['', '원본 설명이며 개인 메모가 아님'].entries()) {
    const value = fixture();
    const item = value.flow.items[0];
    const result = await actualCommitAndReceipt(t, `B3-R12-${index}`, value, withMemo(value.opened.draft, item.ref, memo), 'change');
    assert.equal(result.preflight.overlay.items[item.ref].memo, memo);
    assert.equal(result.summary.changes[0].before, '개인 메모 없음');
    assert.equal(result.receipt.ok, true);
  }
});

test('B3-R13 empty memo clears an imported memo; explicit inherit restores its exact CRLF baseline', async (t) => {
  const importedMemo = ' 첫 줄\r\n둘째 줄 ';
  const value = fixture({ importedMemo });
  const item = value.flow.items[0];
  const cleared = await actualCommitAndReceipt(t, 'B3-R13-clear', value, withMemo(value.opened.draft, item.ref, ''), 'change');
  assert.equal(cleared.preflight.overlay.items[item.ref].memo, '');
  assert.equal(cleared.receipt.ok, true);

  const restore = fixture({ importedMemo, firstMemo: '' });
  const draft: PersonalWorkspacePocPlanDraft = {
    ...restore.opened.draft,
    items: { ...restore.opened.draft.items, [item.ref]: { ...restore.opened.draft.items[item.ref], memo: { mode: 'inherit' } } },
  };
  const restored = await actualCommitAndReceipt(t, 'B3-R13-inherit', restore, draft, 'change');
  assert.equal(restored.preflight.overlay.items[item.ref], undefined);
  assert.equal(restored.summary.changes[0].after, `기존 개인 메모 · ${importedMemo.length}자`);
  assert.equal(restored.receipt.ok, true);
});

test('B3-R14 label truncation keeps the field suffix and never splits a surrogate pair', async (t) => {
  const value = fixture({ firstTitle: '😀'.repeat(100) });
  const item = value.flow.items[0];
  const result = await actualCommitAndReceipt(t, 'B3-R14', value, withMemo(value.opened.draft, item.ref, '메모'), 'change');
  const label = result.summary.changes[0].label;
  assert.ok(label.length <= 160);
  assert.ok(label.endsWith('… · 메모'));
  assert.equal(new TextDecoder().decode(new TextEncoder().encode(label)), label);
  assert.equal(result.receipt.ok, true);
});
