import assert from 'node:assert/strict';
import test from 'node:test';
import * as Plan from './personal-workspace-poc-plan-editor';
import {
  PERSONAL_WORKSPACE_POC_STATE_KEY, PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef,
  type PersonalWorkspacePocFlow,
} from './personal-workspace-poc-contract';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';
import { summarizePersonalWorkspacePocPlanDraftChanges } from './personal-workspace-poc-editor-receipt';

function query(value: unknown): boolean {
  const fn = (Plan as unknown as { isPersonalWorkspacePocPlanNoopPreparedCommit?: (operation: unknown) => boolean }).isPersonalWorkspacePocPlanNoopPreparedCommit;
  assert.equal(typeof fn, 'function', 'actual module must expose the private-provenance query');
  return fn!(value);
}

function fixture() {
  const savedCopyId = 'noop-copy', flowId = 'noop-flow';
  const flow: PersonalWorkspacePocFlow = {
    ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId), savedCopyId, flowId,
    title: '원문과 같은 제목', origin: 'personal-draft', sourceSlug: 'noop-source',
    items: [{ ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'first'), savedCopyId, flowId,
      itemId: 'first', title: '첫 할 일', sourceOrder: 0 }],
  };
  const model = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [flow] };
  const state = createPersonalWorkspacePocState('2026-09-03T00:00:00.000Z');
  const raw = JSON.stringify(state);
  const values = new Map([[PERSONAL_WORKSPACE_POC_STATE_KEY, raw], ['flow:operating-sentinel', 'EXACT\nSENTINEL']]);
  const mutations: string[] = [];
  const storage = {
    get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { mutations.push(`set:${key}`); values.set(key, value); },
    removeItem: (key: string) => { mutations.push(`remove:${key}`); values.delete(key); },
  };
  const opened = Plan.openPersonalWorkspacePocPlanEditor({ baseModel: model, state, stateRaw: raw, flowRef: flow.ref });
  if (!opened.ok) assert.fail(opened.failure.code);
  const handlers = Plan.createPersonalWorkspacePocPlanEditorHandlers({
    storage, guard: opened.guard, readCurrentState: () => state, readCurrentBaseModel: () => model,
    now: () => '2026-09-03T01:00:00.000Z',
  });
  const prepare = (draft: Plan.PersonalWorkspacePocPlanDraft = opened.draft) => handlers.preparePersonalOverlay({
    transactionId: 'noop-plan', requestId: 'noop-request', revision: 0, draft,
  });
  return { flow, state, raw, values, mutations, opened, prepare };
}

test('NP01 actual clean and raw-dirty semantic no-op preparations are genuine and perform zero mutations', async () => {
  const value = fixture();
  const semantic = { ...value.opened.draft, title: { mode: 'override' as const, value: value.flow.title } };
  assert.notDeepEqual(semantic, value.opened.draft);
  assert.equal(summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow: value.flow, baseline: value.opened.draft, draft: semantic }).changes.length, 0);
  const before = [...value.values];
  for (const draft of [value.opened.draft, semantic]) {
    const operation = await value.prepare(draft);
    assert.equal(query(operation), true);
    await operation.commit();
    assert.equal(await operation.rollbackAndVerify(), true);
  }
  assert.deepEqual(value.mutations, []);
  assert.deepEqual([...value.values], before);
});

test('NP02 actual changed preparation and cloned or forged no-op objects never gain no-op provenance', async () => {
  const value = fixture();
  const original = await value.prepare();
  assert.equal(query(original), true);
  const changed = await value.prepare({ ...value.opened.draft, title: { mode: 'override', value: '다른 개인 제목' } });
  assert.equal(query(changed), false);
  let calls = 0;
  const forged = { kind: 'no-op', commit: () => { calls += 1; }, rollbackAndVerify: () => true };
  const accessor = Object.defineProperty({}, 'kind', { enumerable: true, get() { calls += 1; return 'no-op'; } });
  const proxy = new Proxy({}, { get() { calls += 1; return 'no-op'; }, getPrototypeOf() { calls += 1; return Object.prototype; } });
  for (const unknown of [null, undefined, false, 1, 'no-op', {}, { ...original }, Object.create(original), forged, accessor, proxy]) assert.equal(query(unknown), false);
  assert.equal(calls, 0);
  assert.deepEqual(value.mutations, []);
});

test('NP03 actual preparation retains its existing raw freshness check before it can issue a no-op operation', async () => {
  const value = fixture();
  value.values.set(PERSONAL_WORKSPACE_POC_STATE_KEY, JSON.stringify({ ...value.state, revision: value.state.revision + 1 }));
  const before = [...value.values];
  await assert.rejects(async () => value.prepare(), /./u);
  assert.deepEqual(value.mutations, []);
  assert.deepEqual([...value.values], before);
});

test('NP04 provenance query is read-only classification, not refreshed storage authority or a serializable token', async () => {
  const value = fixture();
  const operation = await value.prepare();
  assert.equal(query(operation), true);
  value.values.set(PERSONAL_WORKSPACE_POC_STATE_KEY, 'FOREIGN AFTER PREPARE');
  const before = [...value.values];
  assert.equal(query(operation), true, 'caller must separately enforce fresh bytes/owner before accepting no-op');
  assert.equal(query(JSON.parse(JSON.stringify(operation))), false);
  assert.deepEqual([...value.values], before);
  assert.deepEqual(value.mutations, []);
});

test('NP05 genuine no-op functions cannot be replaced while retaining the issued classification', async () => {
  const value = fixture();
  const operation = await value.prepare();
  const commit = operation.commit, rollbackAndVerify = operation.rollbackAndVerify;
  assert.equal(query(operation), true);
  assert.equal(Object.isFrozen(operation), true);
  let injectedCalls = 0;
  assert.equal(Reflect.set(operation, 'commit', () => { injectedCalls += 1; }), false);
  assert.equal(Reflect.set(operation, 'rollbackAndVerify', () => false), false);
  assert.equal(Reflect.deleteProperty(operation, 'commit'), false);
  assert.equal(Reflect.defineProperty(operation, 'kind', { value: 'anything' }), false);
  assert.equal(operation.commit, commit); assert.equal(operation.rollbackAndVerify, rollbackAndVerify);
  await operation.commit();
  assert.equal(await operation.rollbackAndVerify(), true);
  assert.equal(query(operation), true);
  assert.equal(injectedCalls, 0); assert.deepEqual(value.mutations, []);
});
