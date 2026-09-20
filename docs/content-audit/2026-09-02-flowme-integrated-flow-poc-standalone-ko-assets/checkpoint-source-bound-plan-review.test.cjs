'use strict';
// Independent pure review. No storage/browser APIs; product C/P are not patched.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const P = require('./personal-plan-context.js');
const { M, C, NOW, clone, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const bytes = value => JSON.stringify(value);
const reverseKeys = value => Object.fromEntries(Object.entries(value).reverse());

function fixture({ withUndo = false, secondCopy = false } = {}) {
  const original = sourceUpdateFixture();
  let state = original.state;
  let otherFlow;
  if (secondCopy) {
    const handoff = M.makeHandoff(original.flow.rawText, { draftId: 'cs-review-copy-draft',
      handoffId: 'cs-review-second-copy', sourceConfirmed: true, folderId: null });
    const result = M.apply(state, { type: 'commit-authoring', handoff, now: NOW });
    assert.equal(result.changed, true, result.error);
    state = result.state;
    otherFlow = state.flows.find(flow => flow.handoffId === handoff.handoffId);
    assert.equal(otherFlow.title, original.flow.title);
    assert.notEqual(otherFlow.ref, original.flow.ref);
  }
  const raw = ' \r\n' + bytes({ version: 1, state, undo: null }) + '\r\n ';
  const converted = C.fromLegacy(raw);
  assert.equal(converted.ok, true, converted.reason);
  const checkpoint = converted.checkpoint;
  if (withUndo) checkpoint.undo = clone(checkpoint.state);
  assert.equal(C.validateCheckpoint(checkpoint).ok, true);
  return { ...original, state, checkpoint, otherFlow,
    observation: { flowRef: original.flow.ref, sourceRead: { ok: true, raw: bytes(original.store) }, sourceEpoch: 31 } };
}
function open(f, options, flowRef = f.flow.ref) {
  const result = C.inspectSourceBoundPersonalPlanContext(f.checkpoint, { ...f.observation, flowRef }, options);
  assert.equal(result.ok, true, result.reason);
  return result;
}
function request(f, opened) {
  const draft = clone(opened.draft);
  draft.title = { mode: 'override', value: '독립 검토 개인 제목' };
  return { type: 'commit-source-bound-personal-plan-context', context: opened.context, draft,
    sourceRead: f.observation.sourceRead, sourceEpoch: f.observation.sourceEpoch, now: NOW };
}
function run(f, action, options) {
  const before = bytes(f.checkpoint);
  const sourceBefore = bytes(f.store);
  const result = C.transitionCheckpoint(f.checkpoint, action, options);
  assert.equal(bytes(f.checkpoint), before);
  assert.equal(bytes(f.store), sourceBefore);
  if (!result.changed) assert.equal(result.checkpoint, f.checkpoint);
  return result;
}
function rejects(f, action, reason, options) {
  const result = run(f, action, options);
  assert.equal(result.ok, false, 'must reject before producing a candidate');
  assert.equal(result.changed, false);
  if (reason) assert.equal(result.reason, reason);
  return result;
}

test('B1CSR01 genuine other-copy C tokens cannot authorize a foreign Plan draft despite identical source titles', () => {
  const f = fixture({ secondCopy: true });
  const first = open(f); const second = open(f, undefined, f.otherFlow.ref);
  const firstRequest = request(f, first); const secondRequest = request(f, second);
  rejects(f, { ...firstRequest, context: second.context });
  rejects(f, { ...secondRequest, context: first.context });
  assert.equal(run(f, firstRequest).changed, true);
  const secondResult = run(f, secondRequest);
  assert.equal(secondResult.changed, true);
  assert.equal(Object.hasOwn(secondResult.checkpoint.state[P.METADATA_KEY].entries, f.flow.ref), false);
});

test('B1CSR02 nested getters, symbol and hidden own fields cannot enter the new inspector/action', () => {
  const f = fixture(); const opened = open(f); const action = request(f, opened);
  let invoked = 0;
  const sourceRead = { ok: true };
  Object.defineProperty(sourceRead, 'raw', { enumerable: true, get() { invoked += 1; return f.observation.sourceRead.raw; } });
  assert.equal(C.inspectSourceBoundPersonalPlanContext(f.checkpoint, { ...f.observation, sourceRead }).ok, false);
  rejects(f, { ...action, sourceRead });
  const draft = clone(action.draft);
  Object.defineProperty(draft.items[f.task.ref].memo, 'mode', { enumerable: true, get() { invoked += 1; return 'inherit'; } });
  rejects(f, { ...action, draft });
  for (const decorate of [
    value => Object.defineProperty(value, 'hiddenAuthority', { value: true, enumerable: false }),
    value => { value[Symbol('foreignAuthority')] = true; return value; },
  ]) {
    assert.equal(C.inspectSourceBoundPersonalPlanContext(f.checkpoint, decorate({ ...f.observation })).ok, false);
    rejects(f, decorate({ ...action }));
  }
  assert.equal(invoked, 0);
});

test('B1CSR03 C rejects real-P candidates with injected revision, Undo, timeline or Plan binding corruption', () => {
  for (const mutate of [
    result => { result.state.revision += 1; },
    result => { result.undo.tasks[0].memo = '다른 before'; },
    result => { result.state.timelineContextV1.resolvedContexts.push({ context: 'undated', contextKey: 'undated' }); },
    (result, f) => { result.state[P.METADATA_KEY].entries[f.flow.ref].binding.items[0].itemRef = 'flow-item:foreign:foreign:foreign'; },
  ]) {
    const f = fixture(); let issued = 0;
    const adapter = { ...P, planPersonalPlanSourceState(input) {
      const actual = P.planPersonalPlanSourceState(input);
      assert.equal(actual.ok, true, actual.reason); assert.equal(actual.changed, true);
      issued += 1;
      const candidate = clone(actual); mutate(candidate, f); return candidate;
    } };
    const options = { personalPlan: adapter };
    // The token is issued through this actual C inspector, not forged for the fault test.
    const opened = open(f, options);
    rejects(f, request(f, opened), undefined, options);
    assert.equal(issued, 1);
  }
});

test('B1CSR04 a valid Undo-only drift is rejected even when current raw state and source bytes are identical', () => {
  const f = fixture(); const opened = open(f); const action = request(f, opened);
  const drifted = { ...f, checkpoint: clone(f.checkpoint) };
  drifted.checkpoint.undo = clone(drifted.checkpoint.state);
  drifted.checkpoint.undo.tasks[0].memo = '유효하지만 다른 이전 상태';
  assert.equal(C.validateCheckpoint(drifted.checkpoint).ok, true);
  assert.equal(bytes(drifted.checkpoint.state), bytes(f.checkpoint.state));
  rejects(drifted, action, 'stale-source-bound-checkpoint');
});

test('B1CSR05 harmless legacy JSON whitespace still changes exact legacy provenance and invalidates the opened token', () => {
  const f = fixture(); const opened = open(f); const action = request(f, opened);
  const drifted = { ...f, checkpoint: clone(f.checkpoint) };
  drifted.checkpoint.legacyBaseRaw += '\n ';
  assert.deepEqual(JSON.parse(drifted.checkpoint.legacyBaseRaw), JSON.parse(f.checkpoint.legacyBaseRaw));
  assert.equal(C.validateCheckpoint(drifted.checkpoint).ok, true);
  rejects(drifted, action, 'stale-source-bound-checkpoint');
});

test('B1CSR06 a genuine P-only editor token must be reopened through C before a checkpoint action', () => {
  const f = fixture();
  const source = P.readPersonalPlanSourceContext({ rawState: f.checkpoint.state,
    legacyBaseRaw: f.checkpoint.legacyBaseRaw, undo: f.checkpoint.undo,
    sourceRead: f.observation.sourceRead, sourceEpoch: f.observation.sourceEpoch });
  assert.equal(source.ok, true, source.reason);
  const direct = P.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: f.flow.ref });
  assert.equal(direct.ok, true, direct.reason);
  rejects(f, request(f, direct), 'invalid-source-bound-checkpoint-context');
  assert.equal(run(f, request(f, open(f))).changed, true);
});

test('B1CSR07 C accepts envelope/Undo key-order equivalence and native cross-realm JSON without weakening P raw freshness', () => {
  const f = fixture({ withUndo: true }); const opened = open(f);
  const reordered = { ...f, checkpoint: reverseKeys({ ...f.checkpoint, undo: reverseKeys(f.checkpoint.undo) }) };
  assert.notEqual(bytes(reordered.checkpoint), bytes(f.checkpoint));
  assert.equal(bytes(reordered.checkpoint.state), bytes(f.checkpoint.state));
  assert.equal(C.validateCheckpoint(reordered.checkpoint).ok, true);
  assert.equal(run(reordered, request(f, opened)).changed, true);

  const realm = vm.createContext({ serialized: bytes(f.checkpoint) });
  const foreign = { ...f, checkpoint: vm.runInContext('JSON.parse(serialized)', realm) };
  assert.equal(C.validateCheckpoint(foreign.checkpoint).ok, true);
  const nativeOpened = open(foreign);
  assert.equal(run(foreign, request(foreign, nativeOpened)).changed, true);

  const rawReordered = { ...f, checkpoint: { ...f.checkpoint, state: reverseKeys(f.checkpoint.state) } };
  assert.equal(C.validateCheckpoint(rawReordered.checkpoint).ok, true);
  rejects(rawReordered, request(f, opened), 'stale-plan-source-raw');
});
