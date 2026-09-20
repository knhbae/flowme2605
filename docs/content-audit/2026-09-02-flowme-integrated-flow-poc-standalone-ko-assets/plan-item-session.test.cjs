'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const S = require('./plan-item-session.js');

function plan(overrides) {
  return Object.assign({ flowId: 'flow-1', title: '내 계획', items: [
    { id: 'same-title-a', title: '같은 제목', memo: 'A 원래 메모', planDate: null },
    { id: 'same-title-b', title: '같은 제목', memo: 'B 원래 메모', planDate: '2026-09-05' }
  ] }, overrides);
}
function quick(overrides) {
  return Object.assign({ mode: 'quick', id: 'quick-1', flowId: null, title: '빠른 할 일', memo: '', date: null, folderId: null }, overrides);
}
function session(kind = 'plan', draft = kind === 'quick' ? quick() : plan(), id = 'session-1') {
  return S.createSession({ sessionId: id, kind, scopeId: kind === 'quick' ? draft.id : draft.flowId, draft, returnPoint: { selector: '#owner' } });
}
function dirty(current = session()) {
  return S.updateDraft(current, Object.assign({}, current.draft, { title: current.draft.title + ' 수정' })).session;
}
const candidate = { version: 1, state: { title: '저장 후보', source: '[x] unchanged' }, undo: { title: '저장 전' } };
const validateEnvelope = value => value && value.version === 1 && value.state && value.state.title === '저장 후보' && Boolean(value.undo);
function begin(current = dirty(), expectedRaw = 'old bytes', nextCandidate = candidate) {
  const result = S.beginSave(current, { attemptId: 'attempt-1', expectedRaw, candidate: nextCandidate, validateEnvelope });
  assert.equal(result.ok, true);
  return result;
}
function storage(initial = 'old bytes', hooks = {}) {
  const map = new Map([['flow:operating:sentinel', '  source\r\n bytes  ']]);
  if (initial !== null) map.set(S.STORAGE_KEY, initial);
  const calls = [];
  let reads = 0;
  let writes = 0;
  let removes = 0;
  return {
    calls, map,
    getItem(key) {
      calls.push(['getItem', key]);
      reads += 1;
      const value = map.has(key) ? map.get(key) : null;
      return hooks.read ? hooks.read({ key, number: reads, value, map }) : value;
    },
    setItem(key, value) {
      calls.push(['setItem', key, value]);
      writes += 1;
      if (hooks.beforeWrite) hooks.beforeWrite({ key, value, number: writes, map });
      map.set(key, value);
      if (hooks.afterWrite) hooks.afterWrite({ key, value, number: writes, map });
    },
    removeItem(key) {
      calls.push(['removeItem', key]);
      removes += 1;
      if (hooks.beforeRemove) hooks.beforeRemove({ key, number: removes, map });
      map.delete(key);
      if (hooks.afterRemove) hooks.afterRemove({ key, number: removes, map });
    },
    clear() { calls.push(['clear']); throw new Error('forbidden-clear'); }
  };
}
function mutations(store) { return store.calls.filter(call => call[0] !== 'getItem'); }
function run(store, submission = begin()) {
  const outcome = S.writeAttempt(store, submission.session, submission.attempt);
  const result = S.finishSave(submission.session, submission.attempt, outcome);
  return { submission, outcome, result };
}
function confirm(current) { return S.requestClose(current, { reason: 'cancel', editingPoint: { selector: '#input', selectionStart: 2 } }).session; }

test('UMD and CommonJS export the same versioned API without a model/global storage dependency', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('./plan-item-session.js'), 'utf8'), context);
  assert.equal(context.FlowPocPlanItemSession.VERSION, S.VERSION);
  assert.deepEqual(Object.keys(context.FlowPocPlanItemSession), Object.keys(S));
  assert.equal(S.STORAGE_KEY, 'flow:poc:personal-workspace:v1:standalone-integrated');
});

test('baseline and draft are independent immutable data; UI return point is opaque and not frozen', () => {
  const draft = plan();
  const opaque = { node: { focus() {} } };
  opaque.self = opaque;
  const current = S.createSession({ sessionId: 'opaque', kind: 'plan', scopeId: draft.flowId, draft, returnPoint: opaque });
  draft.items[0].memo = '외부 수정';
  assert.equal(current.baseline.items[0].memo, 'A 원래 메모');
  assert.notEqual(current.baseline, current.draft);
  assert.notEqual(current.baseline.items, current.draft.items);
  assert.equal(Object.isFrozen(current.draft.items[0]), true);
  assert.equal(Object.isFrozen(opaque), false);
  assert.equal(S.requestClose(current, { reason: 'cancel' }).returnPoint, opaque);
});

for (const kind of ['plan', 'quick']) {
  for (const reason of S.CLOSE_REASONS) {
    test(`${kind} clean ${reason} closes without confirmation or persistence`, () => {
      const current = session(kind);
      const result = S.requestClose(current, { reason });
      assert.equal(result.effect, 'close');
      assert.equal(result.session, null);
      assert.equal(current.status, 'clean');
      assert.equal(result.returnPoint, current.returnPoint);
    });
  }
}

test('exact dirty comparison handles reordered object keys, whitespace, invalid values and ABA revision', () => {
  const baseline = session();
  const reordered = { items: baseline.draft.items, title: baseline.draft.title, flowId: baseline.draft.flowId };
  assert.equal(S.updateDraft(baseline, reordered).session, baseline);
  let current = S.updateDraft(baseline, Object.assign({}, baseline.draft, { title: ' 내 계획' })).session;
  assert.equal(current.status, 'dirty-valid');
  current = S.updateDraft(current, Object.assign({}, current.draft, { title: '' })).session;
  assert.equal(current.status, 'dirty-invalid');
  assert.equal(S.requestClose(current, { reason: 'escape' }).effect, 'confirm');
  current = S.updateDraft(current, baseline.draft).session;
  assert.equal(current.status, 'clean');
  assert.equal(current.revision, 3);
  assert.equal(S.updateDraft(current, current.draft, { revision: 0 }).error, 'stale-editor-session');
});

test('Quick date/folder/memo changes are dirty and full exact restoration is clean', () => {
  const baseline = session('quick');
  let current = S.updateDraft(baseline, quick({ memo: '\n메모\r\n', date: '2026-09-08', folderId: 'folder-a' })).session;
  assert.equal(current.status, 'dirty-valid');
  current = S.updateDraft(current, quick({ date: '2026-02-30' })).session;
  assert.equal(current.status, 'dirty-invalid');
  assert.equal(S.updateDraft(current, baseline.draft).session.status, 'clean');
});

test('dirty confirmation preserves invalid input and safe dismissal affects only pending confirmation', () => {
  const current = dirty();
  const editingPoint = { focus() {}, selectionStart: 4 };
  const asked = S.requestClose(current, { reason: 'browser-back', editingPoint });
  assert.equal(asked.effect, 'confirm');
  assert.equal(asked.rearmHistory, true);
  assert.equal(asked.session.draft, current.draft);
  const continued = S.requestClose(asked.session, { reason: 'escape' });
  assert.equal(continued.effect, 'continue');
  assert.equal(continued.editingPoint, editingPoint);
  assert.equal(continued.session.draft, current.draft);
  assert.equal(continued.session.pendingClose, null);
  const secondBack = S.requestClose(asked.session, { reason: 'browser-back' });
  assert.equal(secondBack.rearmHistory, true);
  assert.equal(secondBack.effect, 'continue');
  assert.equal(S.discardChanges(current).ok, false);
  assert.equal(S.discardChanges(asked.session).session, null);
});

test('identity changes and duplicate/missing Item ids are blocked instead of rebound by title', () => {
  const current = session();
  assert.equal(S.updateDraft(current, plan({ flowId: 'other' })).error, 'editor-identity-changed');
  assert.equal(S.updateDraft(current, plan({ items: [current.draft.items[0], current.draft.items[0]] })).ok, false);
  const child = S.createChildSession(current, { sessionId: 'child-a', itemId: 'same-title-a' });
  assert.equal(S.updateDraft(child, Object.assign({}, child.draft, { id: 'same-title-b' })).ok, false);
  assert.throws(() => S.createChildSession(current, { sessionId: 'bad', itemId: 'missing' }), /ambiguous-parent-item/);
});

test('child discard retains dirty parent and previously applied same-Item changes', () => {
  let parent = dirty();
  const originalParent = parent;
  let child = S.createChildSession(parent, { sessionId: 'child-a', itemId: 'same-title-a', returnPoint: '#same-title-a' });
  child = S.updateDraft(child, Object.assign({}, child.draft, { title: ' 첫 반영 ', memo: '첫 메모' })).session;
  const applied = S.applyChild(parent, child);
  assert.equal(applied.ok, true);
  parent = applied.parent;
  assert.equal(parent.draft.items[0].title, '첫 반영');
  assert.equal(originalParent.draft.items[0].title, '같은 제목');
  assert.equal(parent.draft.items[1].title, '같은 제목');
  assert.equal(parent.draft.title, originalParent.draft.title);
  assert.equal(applied.returnPoint, '#same-title-a');
  child = S.createChildSession(parent, { sessionId: 'child-again', itemId: 'same-title-a' });
  assert.equal(child.baseline.title, '첫 반영');
  child = S.updateDraft(child, Object.assign({}, child.draft, { title: '버릴 두 번째 수정' })).session;
  assert.equal(S.discardChanges(confirm(child)).session, null);
  assert.equal(parent.draft.items[0].title, '첫 반영');
  assert.equal(S.discardChanges(confirm(parent)).session, null);
});

test('clean child closes immediately while its parent remains dirty', () => {
  const parent = dirty();
  const child = S.createChildSession(parent, { sessionId: 'child-a', itemId: 'same-title-a' });
  assert.equal(S.requestClose(child, { reason: 'back' }).effect, 'close');
  assert.equal(parent.status, 'dirty-valid');
});

test('child applies only title/memo/planDate; mode and Flow owner do not leak into parent items', () => {
  const parent = session();
  let child = S.createChildSession(parent, { sessionId: 'child-b', itemId: 'same-title-b', draft: {
    mode: 'plan', flowId: 'flow-1', id: 'same-title-b', title: '같은 제목', memo: 'B 원래 메모', planDate: '2026-09-05'
  } });
  child = S.updateDraft(child, Object.assign({}, child.draft, { memo: '새 메모', planDate: '2026-09-09', harmlessExtra: 'not copied' })).session;
  const result = S.applyChild(parent, child);
  assert.equal(result.ok, true);
  assert.deepEqual(result.parent.draft.items[1], { id: 'same-title-b', title: '같은 제목', memo: '새 메모', planDate: '2026-09-09' });
  assert.deepEqual(result.parent.draft.items[0], parent.draft.items[0]);
});

test('parent revision, ABA and other parent session make child tickets stale', () => {
  const parent = session();
  const child = S.createChildSession(parent, { sessionId: 'child-a', itemId: 'same-title-a' });
  const changed = dirty(parent);
  assert.equal(S.applyChild(changed, child).error, 'stale-parent-editor');
  const restored = S.updateDraft(changed, parent.draft).session;
  assert.equal(restored.status, 'clean');
  assert.equal(S.applyChild(restored, child).error, 'stale-parent-editor');
  assert.equal(S.applyChild(session('plan', plan(), 'different-session'), child).error, 'stale-parent-editor');
  assert.throws(() => S.createChildSession(session('quick'), { sessionId: 'child', itemId: 'quick-1' }), /parent-editor-unavailable/);
});

test('invalid child cannot apply, child cannot save and pending confirmation cannot edit or submit', () => {
  const parent = session();
  let child = S.createChildSession(parent, { sessionId: 'child-a', itemId: 'same-title-a' });
  child = S.updateDraft(child, Object.assign({}, child.draft, { title: '' })).session;
  assert.equal(S.applyChild(parent, child).error, 'invalid-child-draft');
  assert.equal(S.beginSave(child, {}).error, 'invalid-save-owner');
  const current = confirm(dirty());
  assert.equal(S.updateDraft(current, current.draft).error, 'editor-locked');
  assert.equal(S.beginSave(current, {}).error, 'editor-locked');
});

test('save validates envelope before writes and fixes candidate bytes independently of caller mutation', () => {
  const current = dirty();
  assert.equal(S.beginSave(current, { attemptId: 'x', expectedRaw: null, candidate, validateEnvelope: () => false }).error, 'invalid-envelope');
  assert.equal(S.beginSave(current, { attemptId: 'x', expectedRaw: null, candidate, validateEnvelope: () => { throw new Error('bad'); } }).ok, false);
  assert.equal(S.beginSave(current, { attemptId: 'x', expectedRaw: null, candidate }).ok, false);
  const mutable = JSON.parse(JSON.stringify(candidate));
  const submission = begin(current, null, mutable);
  mutable.state.title = '나중 변경';
  assert.equal(submission.attempt.candidate.state.title, '저장 후보');
  assert.equal(submission.attempt.serialized, JSON.stringify(candidate));
  assert.equal(submission.attempt.candidateRaw, submission.attempt.serialized);
});

test('clean draft cannot submit a changed candidate or create a persistent no-op', () => {
  const result = S.beginSave(session(), { attemptId: 'noop', expectedRaw: 'old bytes', candidate, validateEnvelope });
  assert.equal(result.effect, 'unchanged');
  assert.equal(result.ok, false);
  assert.equal(result.error, 'unchanged-editor-draft');
  const store = storage();
  assert.equal(S.writeAttempt(store, result.session, null).writeCount, 0);
  assert.equal(mutations(store).length, 0);
});

test('Plan success commits only one exact key/readback and emits one owned close outcome', () => {
  const store = storage();
  const { submission, outcome, result } = run(store);
  assert.equal(outcome.status, 'committed');
  assert.equal(outcome.writeCount, 1);
  assert.equal(outcome.rollbackWriteCount, 0);
  assert.equal(result.effect, 'close');
  assert.equal(result.changed, true);
  assert.equal(store.map.get(S.STORAGE_KEY), submission.attempt.serialized);
  assert.equal(store.map.get('flow:operating:sentinel'), '  source\r\n bytes  ');
  assert.deepEqual(mutations(store).map(call => call.slice(0, 2)), [['setItem', S.STORAGE_KEY]]);
  assert.equal(S.finishSave(submission.session, submission.attempt, outcome).error, 'stale-save-outcome');
});

test('Quick root uses same verified writer without a fake Plan', () => {
  const { submission, result } = run(storage(), begin(dirty(session('quick'))));
  assert.equal(submission.attempt.kind, 'quick');
  assert.equal(submission.session.parent, null);
  assert.equal(result.effect, 'close');
});

test('same exact bytes and stale expectedRaw write zero; no trim or JSON normalization is used', () => {
  const raw = JSON.stringify(candidate);
  const same = storage(raw);
  const noop = run(same, begin(dirty(), raw));
  assert.equal(noop.outcome.status, 'unchanged');
  assert.equal(noop.result.changed, false);
  assert.equal(mutations(same).length, 0);
  const stale = storage(' ' + raw);
  const rejected = run(stale, begin(dirty(), raw));
  assert.equal(rejected.outcome.error, 'stale-expected-raw');
  assert.equal(mutations(stale).length, 0);
  assert.equal(S.retrySave(rejected.result.session, 'attempt-1').ok, false);
});

test('initial read failure is preflight-only with no rollback/write', () => {
  const store = storage('old bytes', { read() { throw new Error('read failure'); } });
  const { outcome, result } = run(store);
  assert.equal(outcome.error, 'initial-read-failed');
  assert.equal(outcome.status, 'preflight-failed');
  assert.equal(result.session.status, 'recoverable-error');
  assert.equal(mutations(store).length, 0);
});

test('setItem throw before write proves unchanged bytes and keeps editable retry draft', () => {
  const store = storage('old bytes', { beforeWrite() { throw new Error('QuotaExceededError'); } });
  const { outcome, result, submission } = run(store);
  assert.equal(outcome.status, 'failed');
  assert.equal(outcome.rollback, 'not-needed');
  assert.equal(outcome.writeCount, 1);
  assert.equal(outcome.rollbackWriteCount, 0);
  assert.equal(result.session.draft, submission.session.draft);
  assert.equal(store.map.get(S.STORAGE_KEY), 'old bytes');
});

for (const before of [null, 'old bytes']) {
  test(`setItem throw after write restores exact ${before === null ? 'absent key' : 'prior bytes'} and verifies rollback`, () => {
    const store = storage(before, { afterWrite({ number }) { if (number === 1) throw new Error('after write'); } });
    const { outcome } = run(store, begin(dirty(), before));
    assert.equal(outcome.status, 'failed');
    assert.equal(outcome.rollback, 'complete');
    assert.equal(outcome.rollbackWriteCount, 1);
    assert.equal(store.map.has(S.STORAGE_KEY) ? store.map.get(S.STORAGE_KEY) : null, before);
    assert.equal(mutations(store)[1][0], before === null ? 'removeItem' : 'setItem');
  });
}

test('wrong transient readback rolls back only when exact candidate ownership is subsequently verified', () => {
  const store = storage('old bytes', { read({ number, value }) { return number === 2 ? 'wrong response' : value; } });
  const { outcome } = run(store);
  assert.equal(outcome.status, 'failed');
  assert.equal(outcome.rollback, 'complete');
  assert.equal(store.map.get(S.STORAGE_KEY), 'old bytes');
});

test('external newer bytes at readback are preserved and recovery locks instead of blind rollback', () => {
  const store = storage('old bytes', { afterWrite({ number, map }) { if (number === 1) map.set(S.STORAGE_KEY, 'newer external bytes'); } });
  const { outcome, result } = run(store);
  assert.equal(outcome.error, 'external-storage-drift');
  assert.equal(outcome.rollbackWriteCount, 0);
  assert.equal(store.map.get(S.STORAGE_KEY), 'newer external bytes');
  assert.equal(result.session.status, 'recovery-required');
});

test('unreadable state after write cannot be called restored and performs no speculative rollback', () => {
  const store = storage('old bytes', { read({ number, value }) { if (number > 1) throw new Error('unreadable'); return value; } });
  const { outcome } = run(store);
  assert.equal(outcome.status, 'recovery-required');
  assert.equal(outcome.error, 'rollback-read-failed');
  assert.equal(outcome.rollbackWriteCount, 0);
});

test('rollback write failure with candidate left behind is recovery-required', () => {
  const store = storage('old bytes', {
    beforeWrite({ number }) { if (number === 2) throw new Error('rollback blocked'); },
    afterWrite({ number }) { if (number === 1) throw new Error('save after-write failure'); }
  });
  const { outcome } = run(store);
  assert.equal(outcome.error, 'rollback-verification-failed');
  assert.equal(outcome.status, 'recovery-required');
});

test('rollback throw after restoring bytes is classified by exact readback, not the exception alone', () => {
  const store = storage('old bytes', { afterWrite() { throw new Error('after both writes'); } });
  const { outcome } = run(store);
  assert.equal(outcome.status, 'failed');
  assert.equal(outcome.rollback, 'complete');
  assert.equal(store.map.get(S.STORAGE_KEY), 'old bytes');
});

test('rollback wrong readback or failed readback remains recovery-required even if snapshot looks old', () => {
  for (const throwRead of [false, true]) {
    const store = storage('old bytes', {
      afterWrite({ number }) { if (number === 1) throw new Error('after write'); },
      read({ number, value }) { if (number === 3) { if (throwRead) throw new Error('readback blocked'); return 'unverified'; } return value; }
    });
    const { outcome } = run(store);
    assert.equal(outcome.status, 'recovery-required');
    assert.equal(store.map.get(S.STORAGE_KEY), 'old bytes');
  }
});

test('failed null-baseline rollback remove is verified and cannot use clear', () => {
  const store = storage(null, {
    afterWrite() { throw new Error('after write'); },
    beforeRemove() { throw new Error('remove blocked'); }
  });
  const { outcome } = run(store, begin(dirty(), null));
  assert.equal(outcome.status, 'recovery-required');
  assert.equal(store.calls.some(call => call[0] === 'clear'), false);
  assert.equal(mutations(store).every(call => call[1] === S.STORAGE_KEY), true);
});

test('submitting and recovery prevent input, close, child creation, new submit and retries', () => {
  const submission = begin();
  const store = storage('old bytes', { afterWrite({ map }) { map.set(S.STORAGE_KEY, 'external'); } });
  const { result } = run(store, submission);
  for (const current of [submission.session, result.session]) {
    assert.equal(S.locked(current), true);
    for (const reason of S.CLOSE_REASONS) {
      const closed = S.requestClose(current, { reason });
      assert.equal(closed.effect, 'blocked');
      assert.equal(closed.session, current);
      assert.equal(closed.rearmHistory, reason === 'browser-back');
    }
    assert.equal(S.updateDraft(current, current.draft).ok, false);
    assert.equal(S.beginSave(current, {}).ok, false);
    assert.equal(S.retrySave(current, 'attempt-1').ok, false);
    assert.throws(() => S.createChildSession(current, { sessionId: 'new-child', itemId: 'same-title-a' }), /parent-editor-unavailable/);
  }
});

test('same immutable intent retries after verified failure; successful retry closes exactly once', () => {
  let fail = true;
  const store = storage('old bytes', { beforeWrite() { if (fail) throw new Error('quota'); } });
  const first = run(store);
  assert.equal(first.result.session.status, 'recoverable-error');
  const retry = S.retrySave(first.result.session, 'attempt-1');
  assert.equal(retry.ok, true);
  assert.equal(retry.attempt, first.submission.attempt);
  assert.equal(retry.session.submission, 2);
  fail = false;
  const next = run(store, retry);
  assert.equal(next.outcome.status, 'committed');
  assert.equal(next.result.effect, 'close');
  assert.equal(S.finishSave(retry.session, retry.attempt, next.outcome).ok, false);
});

test('editing after failure invalidates old retry; discard/new-session cannot revive the old attempt', () => {
  const store = storage('old bytes', { beforeWrite() { throw new Error('quota'); } });
  const failed = run(store);
  const changed = dirty(failed.result.session);
  assert.equal(changed.attempt, null);
  assert.equal(S.retrySave(changed, 'attempt-1').ok, false);
  const closed = S.discardChanges(confirm(failed.result.session));
  const oldWrites = mutations(store).length;
  for (const current of [closed.session, session('plan', plan(), 'new-session'), changed]) {
    assert.equal(S.writeAttempt(store, current, failed.submission.attempt).error, 'stale-save-attempt');
  }
  assert.equal(mutations(store).length, oldWrites);
});

test('rapid duplicate dispatch and foreign/copied outcomes cannot produce writes or second completion', () => {
  const store = storage();
  const submission = begin();
  const outcome = S.writeAttempt(store, submission.session, submission.attempt);
  const duplicate = S.writeAttempt(store, submission.session, submission.attempt);
  assert.equal(duplicate.error, 'stale-save-attempt');
  assert.equal(duplicate.writeCount, 0);
  assert.equal(S.finishSave(submission.session, submission.attempt, duplicate).ok, false);
  assert.equal(S.finishSave(submission.session, submission.attempt, Object.assign({}, outcome)).ok, false);
  assert.equal(S.finishSave(submission.session, submission.attempt, outcome).effect, 'close');
  assert.equal(mutations(store).length, 1);
});

test('real standalone model validation/Plan transition/reload/Undo preserve unrelated facts', () => {
  const M = require('./model.js');
  assert.equal(S.STORAGE_KEY, M.STORAGE_KEY);
  const envelope = M.initialEnvelope();
  const before = JSON.stringify(envelope);
  const flow = envelope.state.flows[0];
  const tasks = envelope.state.tasks.filter(item => item.flowId === flow.id);
  const draft = { flowId: flow.id, title: flow.title, items: tasks.map(item => ({ id: item.id, title: item.title, memo: item.memo || '', planDate: item.planDate || item.date || null })) };
  const current = dirty(session('plan', draft, 'model-session'));
  const transition = M.transitionEnvelope(envelope, { type: 'commit-personal-plan', flowId: flow.id, title: current.draft.title, items: current.draft.items });
  assert.equal(transition.changed, true);
  const submission = S.beginSave(current, { attemptId: 'model-attempt', expectedRaw: before, candidate: transition.envelope,
    validateEnvelope: value => M.loadEnvelope({ getItem: () => JSON.stringify(value) }).status === 'restored' });
  assert.equal(submission.ok, true);
  const store = storage(before);
  const saved = run(store, submission);
  assert.equal(saved.result.effect, 'close');
  const loaded = M.loadEnvelope(store);
  assert.equal(loaded.status, 'restored');
  assert.equal(loaded.envelope.state.flows[0].title, current.draft.title);
  assert.equal(JSON.stringify(envelope), before);
  assert.deepEqual(loaded.envelope.undo, envelope.state);
  const undone = M.undoEnvelope(loaded.envelope);
  assert.equal(undone.changed, true);
  assert.equal(undone.envelope.state.flows[0].title, flow.title);
  assert.equal(store.map.get('flow:operating:sentinel'), '  source\r\n bytes  ');
});

for (const origin of ['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan', 'authoring-handoff']) {
  test(`${origin}: staged child is memory-only and scoped final commit preserves source/execution/other copies`, () => {
    const M = require('./model.js');
    let envelope = M.initialEnvelope();
    if (origin === 'authoring-handoff') {
      const handoff = M.makeHandoff('# 원문 보존\n\n## 단계\n- [x] 원문 체크\n  - 날짜: 2026-09-05', {
        draftId: 'k1b-draft', handoffId: 'k1b-handoff', sourceConfirmed: true, folderId: null
      });
      envelope = M.transitionEnvelope(envelope, { type: 'commit-authoring', handoff }).envelope;
    }
    const flow = envelope.state.flows.find(entry => entry.origin === origin);
    const tasks = envelope.state.tasks.filter(entry => entry.flowId === flow.id);
    const draft = { flowId: flow.id, title: flow.title, items: tasks.map(item => ({ id: item.id, title: item.title, memo: item.memo || '', planDate: item.planDate || null })) };
    let parent = session('plan', draft, 'k1b-' + origin);
    let child = S.createChildSession(parent, { sessionId: 'k1b-item-' + origin, itemId: tasks[0].id });
    child = S.updateDraft(child, Object.assign({}, child.draft, { title: '개인 제목', memo: '개인 메모', planDate: '2026-09-10' })).session;
    const raw = JSON.stringify(envelope);
    const store = storage(raw);
    parent = S.applyChild(parent, child).parent;
    assert.equal(mutations(store).length, 0);
    assert.equal(store.map.get(S.STORAGE_KEY), raw);
    const transition = M.transitionEnvelope(envelope, { type: 'commit-personal-plan', flowId: flow.id, title: parent.draft.title, items: parent.draft.items });
    assert.equal(transition.changed, true);
    const started = S.beginSave(parent, { attemptId: 'save-' + origin, expectedRaw: raw, candidate: transition.envelope,
      validateEnvelope: value => M.loadEnvelope({ getItem: () => JSON.stringify(value) }).status === 'restored' });
    assert.equal(started.ok, true);
    const result = run(store, started);
    assert.equal(result.outcome.status, 'committed');
    const reloaded = M.loadEnvelope(store).envelope.state;
    const changedTask = reloaded.tasks.find(task => task.id === tasks[0].id);
    assert.equal(changedTask.title, '개인 제목');
    assert.equal(changedTask.planDate, '2026-09-10');
    for (const key of ['id', 'ref', 'flowId', 'date', 'sourceDate', 'done', 'completedAt', 'sourceSubchecks', 'sourceLine']) {
      assert.deepEqual(changedTask[key], tasks[0][key], key);
    }
    const changedFlow = reloaded.flows.find(item => item.id === flow.id);
    for (const key of ['id', 'ref', 'origin', 'rawText', 'sourceFingerprint']) assert.deepEqual(changedFlow[key], flow[key], key);
    assert.deepEqual(reloaded.tasks.filter(task => task.flowId !== flow.id), envelope.state.tasks.filter(task => task.flowId !== flow.id));
    assert.equal(JSON.stringify(envelope), raw);
    assert.equal(mutations(store).length, 1);
  });
}

test('real Quick commit changes only selected editable fields and preserves execution status', () => {
  const M = require('./model.js');
  const envelope = M.initialEnvelope();
  const item = envelope.state.tasks.find(task => !task.flowId);
  const draft = { mode: 'quick', id: item.id, flowId: null, title: item.title, memo: item.memo, date: item.date, folderId: item.folderId };
  let current = session('quick', draft, 'real-quick');
  current = S.updateDraft(current, Object.assign({}, draft, { title: '바뀐 빠른 할 일', date: '2026-09-15' })).session;
  const transition = M.transitionEnvelope(envelope, Object.assign({ type: 'update-quick' }, current.draft));
  assert.equal(transition.changed, true);
  const before = JSON.stringify(envelope);
  const started = S.beginSave(current, { attemptId: 'real-quick-save', expectedRaw: before, candidate: transition.envelope,
    validateEnvelope: value => M.loadEnvelope({ getItem: () => JSON.stringify(value) }).status === 'restored' });
  const store = storage(before);
  assert.equal(run(store, started).result.effect, 'close');
  const saved = M.loadEnvelope(store).envelope.state;
  const updated = saved.tasks.find(task => task.id === item.id);
  assert.equal(updated.title, '바뀐 빠른 할 일');
  assert.equal(updated.date, '2026-09-15');
  assert.equal(updated.flowId, null);
  assert.equal(updated.done, item.done);
  assert.equal(updated.completedAt, item.completedAt);
  assert.deepEqual(saved.flows, envelope.state.flows);
  assert.deepEqual(saved.tasks.filter(task => task.id !== item.id), envelope.state.tasks.filter(task => task.id !== item.id));
});

const durableBefore = JSON.stringify({ version: 1, state: { title: '이전 저장 상태' }, undo: null });
const durableValidator = value => Boolean(value && value.version === 1 && value.state && typeof value.state.title === 'string');
function durableBegin(expectedRaw = durableBefore, current = dirty(), next = candidate, attemptId = 'durable-1') {
  const started = S.beginSave(current, { attemptId, expectedRaw, candidate: next, validateEnvelope: durableValidator });
  assert.equal(started.ok, true);
  return started;
}
function durableRun(store = storage(durableBefore), started = durableBegin()) {
  const outcome = S.writeDurableAttempt(store, started.session, started.attempt);
  return { started, outcome, result: S.finishSave(started.session, started.attempt, outcome), store };
}
function snapshotStorage(map, hooks) {
  const store = storage(null, hooks);
  store.map.clear();
  for (const [key, value] of map) store.map.set(key, value);
  return store;
}
function freshSessionRuntime() {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('./plan-item-session.js'), 'utf8'), context);
  return context.FlowPocPlanItemSession;
}
function preparedFixture(targetCandidate = true) {
  const store = storage(durableBefore, {
    beforeWrite({ key, value }) {
      if (key === S.RECOVERY_KEY && JSON.parse(value).phase === 'confirmed') throw new Error('stop before confirmed');
    }
  });
  const result = durableRun(store);
  if (!targetCandidate) store.map.set(S.STORAGE_KEY, durableBefore);
  const journalRaw = store.map.get(S.RECOVERY_KEY);
  assert.equal(JSON.parse(journalRaw).phase, 'prepared');
  return { ...result, journalRaw };
}

test('durable success writes prepared before target and retains confirmed commit evidence', () => {
  const store = storage(durableBefore);
  const { outcome, result } = durableRun(store);
  assert.equal(outcome.status, 'committed');
  assert.equal(outcome.phase, 'confirmed');
  assert.equal(outcome.writeCount, 1);
  assert.equal(outcome.journalWriteCount, 2);
  assert.equal(result.changed, true);
  const writes = mutations(store);
  assert.deepEqual(writes.map(call => call[1]), [S.RECOVERY_KEY, S.STORAGE_KEY, S.RECOVERY_KEY]);
  assert.equal(JSON.parse(writes[0][2]).phase, 'prepared');
  const journal = JSON.parse(writes[2][2]);
  assert.equal(journal.phase, 'confirmed');
  assert.equal(journal.beforeRaw, durableBefore);
  assert.equal(journal.candidateRaw, JSON.stringify(candidate));
  assert.deepEqual(journal.baseline, plan());
  assert.equal(journal.draft.title, '내 계획 수정');
  assert.equal('returnPoint' in journal, false);
  assert.equal(store.map.get('flow:operating:sentinel'), '  source\r\n bytes  ');
  assert.equal(writes.every(call => [S.RECOVERY_KEY, S.STORAGE_KEY].includes(call[1])), true);
});

test('fresh startup inspects all crash phases without writes or optimistic success', () => {
  const snapshots = [];
  const store = storage(durableBefore, { afterWrite({ key, value, map }) {
    snapshots.push({ label: key === S.RECOVERY_KEY ? JSON.parse(value).phase : 'target', map: new Map(map) });
  } });
  durableRun(store);
  assert.deepEqual(snapshots.map(row => row.label), ['prepared', 'target', 'confirmed']);
  const Fresh = freshSessionRuntime();
  for (const phase of snapshots) {
    const reloaded = snapshotStorage(phase.map);
    const result = Fresh.loadRecovery(reloaded, durableValidator);
    assert.equal(result.status, phase.label === 'confirmed' ? 'confirmed' : 'prepared');
    assert.equal(result.canRecover, phase.label !== 'confirmed');
    assert.equal(result.targetOwnership, phase.label === 'prepared' ? 'before' : 'candidate');
    assert.equal(mutations(reloaded).length, 0);
  }
});

test('durable initial read failure, stale bytes and no-op perform no target or journal writes', () => {
  const readFailed = storage(durableBefore, { read() { throw new Error('read'); } });
  assert.equal(durableRun(readFailed).outcome.error, 'initial-read-failed');
  assert.equal(mutations(readFailed).length, 0);
  const stale = storage(' ' + durableBefore);
  assert.equal(durableRun(stale).outcome.error, 'stale-expected-raw');
  assert.equal(mutations(stale).length, 0);
  const raw = JSON.stringify(candidate);
  const noop = storage(raw);
  assert.equal(durableRun(noop, durableBegin(raw)).outcome.status, 'unchanged');
  assert.equal(mutations(noop).length, 0);
});

test('no-op cannot bypass a prepared or foreign recovery journal', () => {
  const { store } = preparedFixture();
  const before = mutations(store).length;
  const outcome = durableRun(store, durableBegin(JSON.stringify(candidate))).outcome;
  assert.equal(outcome.status, 'recovery-required');
  assert.equal(mutations(store).length, before);
  const foreign = storage(JSON.stringify(candidate));
  foreign.map.set(S.RECOVERY_KEY, 'foreign journal');
  assert.equal(durableRun(foreign, durableBegin(JSON.stringify(candidate))).outcome.status, 'recovery-required');
  assert.equal(mutations(foreign).length, 0);
});

test('prepare throw-before-write is retryable with target zero and prepare throw-after gates reload', () => {
  const before = storage(durableBefore, { beforeWrite({ key }) { if (key === S.RECOVERY_KEY) throw new Error('quota'); } });
  const failed = durableRun(before);
  assert.equal(failed.outcome.status, 'preflight-failed');
  assert.equal(failed.outcome.writeCount, 0);
  assert.equal(before.map.has(S.RECOVERY_KEY), false);
  const after = storage(durableBefore, { afterWrite({ key }) { if (key === S.RECOVERY_KEY) throw new Error('after prepare'); } });
  const pending = durableRun(after);
  assert.equal(pending.outcome.status, 'recovery-required');
  assert.equal(pending.outcome.writeCount, 0);
  assert.equal(S.loadRecovery(snapshotStorage(after.map), durableValidator).status, 'prepared');
  assert.equal(after.map.get(S.STORAGE_KEY), durableBefore);
});

test('unverified journal preparation never writes target and preserves unknown journal bytes', () => {
  const store = storage(durableBefore, { afterWrite({ key, map }) { if (key === S.RECOVERY_KEY) map.set(key, 'foreign after prepare'); } });
  const { outcome } = durableRun(store);
  assert.equal(outcome.status, 'recovery-required');
  assert.equal(outcome.writeCount, 0);
  assert.equal(store.map.get(S.RECOVERY_KEY), 'foreign after prepare');
  assert.equal(store.map.get(S.STORAGE_KEY), durableBefore);
});

test('target failure with verified rollback cleans prepared record and retains normal retry', () => {
  const store = storage(durableBefore, { beforeWrite({ key }) { if (key === S.STORAGE_KEY) throw new Error('quota'); } });
  const { outcome, result } = durableRun(store);
  assert.equal(outcome.status, 'failed');
  assert.equal(result.session.status, 'recoverable-error');
  assert.equal(store.map.has(S.RECOVERY_KEY), false);
  assert.equal(store.map.get(S.STORAGE_KEY), durableBefore);
  assert.equal(S.retrySave(result.session, 'durable-1').ok, true);
});

test('target candidate remaining after rollback failure is gated by prepared record on fresh reload', () => {
  const store = storage(durableBefore, {
    beforeWrite({ key, value }) { if (key === S.STORAGE_KEY && value === durableBefore) throw new Error('rollback blocked'); },
    afterWrite({ key }) { if (key === S.STORAGE_KEY) throw new Error('target after-write'); }
  });
  const { outcome, result } = durableRun(store);
  assert.equal(outcome.status, 'recovery-required');
  assert.equal(result.session.status, 'recovery-required');
  assert.equal(store.map.get(S.STORAGE_KEY), JSON.stringify(candidate));
  const Fresh = freshSessionRuntime();
  const startup = Fresh.loadRecovery(snapshotStorage(store.map), durableValidator);
  assert.equal(startup.status, 'prepared');
  assert.equal(startup.canRecover, true);
});

test('confirmed write throw-before leaves prepared, while throw-after exact confirmation is committed', () => {
  const prepared = preparedFixture();
  assert.equal(prepared.outcome.status, 'recovery-required');
  assert.equal(prepared.store.map.get(S.STORAGE_KEY), JSON.stringify(candidate));
  const store = storage(durableBefore, { afterWrite({ key, value }) {
    if (key === S.RECOVERY_KEY && JSON.parse(value).phase === 'confirmed') throw new Error('after confirmed');
  } });
  const { outcome } = durableRun(store);
  assert.equal(outcome.status, 'committed');
  assert.equal(outcome.rollbackWriteCount, 0);
  assert.equal(store.map.get(S.STORAGE_KEY), JSON.stringify(candidate));
  assert.equal(JSON.parse(store.map.get(S.RECOVERY_KEY)).phase, 'confirmed');
});

test('unreadable confirmation is commit-uncertain, never rolls back, and reload resolves durable phase', () => {
  let unreadable = false;
  const store = storage(durableBefore, {
    afterWrite({ key, value }) { if (key === S.RECOVERY_KEY && JSON.parse(value).phase === 'confirmed') unreadable = true; },
    read({ value }) { if (unreadable) throw new Error('lost reads'); return value; }
  });
  const { outcome, result } = durableRun(store);
  assert.equal(outcome.error, 'commit-uncertain');
  assert.equal(outcome.commitUncertain, true);
  assert.equal(outcome.rollbackWriteCount, 0);
  assert.equal(result.session.status, 'recovery-required');
  const reloaded = snapshotStorage(store.map);
  assert.equal(S.loadRecovery(reloaded, durableValidator).status, 'confirmed');
  assert.equal(mutations(reloaded).length, 0);
});

test('next explicit save replaces only an exact confirmed prior target and preserves old commit on prepare failure', () => {
  const first = durableRun();
  const secondCandidate = { version: 1, state: { title: '두 번째 저장' }, undo: candidate.state };
  const newSession = dirty(session('plan', plan(), 'second-session'));
  const next = durableRun(first.store, durableBegin(JSON.stringify(candidate), newSession, secondCandidate, 'second-attempt'));
  assert.equal(next.outcome.status, 'committed');
  const journal = JSON.parse(first.store.map.get(S.RECOVERY_KEY));
  assert.equal(journal.sessionId, 'second-session');
  assert.equal(journal.beforeRaw, JSON.stringify(candidate));
  assert.equal(journal.candidateRaw, JSON.stringify(secondCandidate));
  const saved = durableRun();
  const oldJournal = saved.store.map.get(S.RECOVERY_KEY);
  const failPrepare = snapshotStorage(saved.store.map, { beforeWrite({ key }) { if (key === S.RECOVERY_KEY) throw new Error('quota'); } });
  const failed = durableRun(failPrepare, durableBegin(JSON.stringify(candidate), newSession, secondCandidate, 'second-attempt'));
  assert.equal(failed.outcome.status, 'preflight-failed');
  assert.equal(failPrepare.map.get(S.RECOVERY_KEY), oldJournal);
  assert.equal(failPrepare.map.get(S.STORAGE_KEY), JSON.stringify(candidate));
});

test('startup corrupt, wrong-version, foreign target and unreadable records fail closed with zero writes', () => {
  const fixture = preparedFixture();
  const wrong = JSON.parse(fixture.journalRaw);
  wrong.version = 999;
  for (const raw of ['{ broken', JSON.stringify(wrong)]) {
    const store = storage(durableBefore);
    store.map.set(S.RECOVERY_KEY, raw);
    assert.equal(S.loadRecovery(store, durableValidator).status, 'blocked');
    assert.equal(mutations(store).length, 0);
  }
  const foreign = snapshotStorage(fixture.store.map);
  foreign.map.set(S.STORAGE_KEY, 'foreign target');
  const read = S.loadRecovery(foreign, durableValidator);
  assert.equal(read.status, 'blocked');
  assert.equal(read.canRecover, false);
  assert.equal(mutations(foreign).length, 0);
  const unreadable = storage(durableBefore, { read() { throw new Error('read'); } });
  assert.equal(S.loadRecovery(unreadable, durableValidator).status, 'blocked');
  assert.equal(mutations(unreadable).length, 0);
});

for (const targetCandidate of [false, true]) {
  test(`explicit prepared recovery from ${targetCandidate ? 'candidate' : 'before'} restores baseline and unsaved draft with a new session`, () => {
    const fixture = preparedFixture(targetCandidate);
    const store = snapshotStorage(fixture.store.map);
    const result = S.recoverDurableAttempt(store, { expectedJournalRaw: fixture.journalRaw, validateEnvelope: durableValidator });
    assert.equal(result.ok, true);
    assert.equal(result.writeCount, targetCandidate ? 1 : 0);
    assert.equal(store.map.get(S.STORAGE_KEY), durableBefore);
    assert.equal(store.map.has(S.RECOVERY_KEY), false);
    assert.throws(() => S.resumeRecoveredSession(result, { sessionId: 'session-1' }), /invalid-recovered-session/);
    const point = { focus() {} };
    const resumed = S.resumeRecoveredSession(result, { sessionId: 'resumed-session', returnPoint: point });
    assert.equal(resumed.status, 'dirty-valid');
    assert.equal(resumed.attempt, null);
    assert.equal(resumed.returnPoint, point);
    assert.deepEqual(resumed.baseline, fixture.started.session.baseline);
    assert.deepEqual(resumed.draft, fixture.started.session.draft);
    assert.equal(S.retrySave(resumed, 'durable-1').ok, false);
    assert.throws(() => S.resumeRecoveredSession(result, { sessionId: 'duplicate-resume' }), /invalid-recovered-session/);
  });
}

test('explicit recovery never restores a confirmed commit or overwrites foreign target/journal', () => {
  const saved = durableRun();
  const raw = saved.store.map.get(S.RECOVERY_KEY);
  const beforeCalls = mutations(saved.store).length;
  assert.equal(S.recoverDurableAttempt(saved.store, { expectedJournalRaw: raw, validateEnvelope: durableValidator }).ok, false);
  assert.equal(mutations(saved.store).length, beforeCalls);
  const fixture = preparedFixture();
  for (const key of [S.STORAGE_KEY, S.RECOVERY_KEY]) {
    const foreign = snapshotStorage(fixture.store.map);
    foreign.map.set(key, 'foreign');
    assert.equal(S.recoverDurableAttempt(foreign, { expectedJournalRaw: fixture.journalRaw, validateEnvelope: durableValidator }).ok, false);
    assert.equal(foreign.map.get(key), 'foreign');
    assert.equal(mutations(foreign).length, 0);
  }
});

test('recovery restore fault retains prepared journal and cleanup fault can be retried idempotently', () => {
  const fixture = preparedFixture();
  const restoreFailed = snapshotStorage(fixture.store.map, { beforeWrite({ key }) { if (key === S.STORAGE_KEY) throw new Error('restore blocked'); } });
  assert.equal(S.recoverDurableAttempt(restoreFailed, { expectedJournalRaw: fixture.journalRaw, validateEnvelope: durableValidator }).ok, false);
  assert.equal(restoreFailed.map.get(S.RECOVERY_KEY), fixture.journalRaw);
  assert.equal(restoreFailed.map.get(S.STORAGE_KEY), JSON.stringify(candidate));
  const cleanupFailed = snapshotStorage(fixture.store.map, { beforeRemove({ key }) { if (key === S.RECOVERY_KEY) throw new Error('cleanup blocked'); } });
  assert.equal(S.recoverDurableAttempt(cleanupFailed, { expectedJournalRaw: fixture.journalRaw, validateEnvelope: durableValidator }).ok, false);
  assert.equal(cleanupFailed.map.get(S.STORAGE_KEY), durableBefore);
  assert.equal(cleanupFailed.map.get(S.RECOVERY_KEY), fixture.journalRaw);
  const retry = snapshotStorage(cleanupFailed.map);
  const result = S.recoverDurableAttempt(retry, { expectedJournalRaw: fixture.journalRaw, validateEnvelope: durableValidator });
  assert.equal(result.ok, true);
  assert.equal(result.writeCount, 0);
});

test('confirmed cleanup touches only journal, cannot discard a new prepared attempt, and tolerates remove throw-after', () => {
  const saved = durableRun();
  const expectedJournalRaw = saved.store.map.get(S.RECOVERY_KEY);
  const cleanup = snapshotStorage(saved.store.map, { afterRemove({ key }) { if (key === S.RECOVERY_KEY) throw new Error('removed but threw'); } });
  const result = S.clearConfirmedRecovery(cleanup, { expectedJournalRaw, validateEnvelope: durableValidator });
  assert.equal(result.ok, true);
  assert.equal(result.writeCount, 0);
  assert.equal(cleanup.map.get(S.STORAGE_KEY), JSON.stringify(candidate));
  assert.deepEqual(mutations(cleanup).map(call => call.slice(0, 2)), [['removeItem', S.RECOVERY_KEY]]);
  const replaced = snapshotStorage(saved.store.map);
  const prepared = JSON.parse(expectedJournalRaw);
  prepared.phase = 'prepared';
  prepared.attemptId = 'new-attempt';
  replaced.map.set(S.RECOVERY_KEY, JSON.stringify(prepared));
  assert.equal(S.clearConfirmedRecovery(replaced, { expectedJournalRaw, validateEnvelope: durableValidator }).ok, false);
  assert.equal(replaced.map.get(S.RECOVERY_KEY), JSON.stringify(prepared));
  assert.equal(mutations(replaced).length, 0);
});

test('confirmed cleanup failure or unreadable completion never rolls back committed target', () => {
  const saved = durableRun();
  const expectedJournalRaw = saved.store.map.get(S.RECOVERY_KEY);
  const blocked = snapshotStorage(saved.store.map, { beforeRemove() { throw new Error('cleanup blocked'); } });
  assert.equal(S.clearConfirmedRecovery(blocked, { expectedJournalRaw, validateEnvelope: durableValidator }).ok, false);
  assert.equal(S.loadRecovery(blocked, durableValidator).status, 'confirmed');
  let removed = false;
  const unreadable = snapshotStorage(saved.store.map, {
    afterRemove() { removed = true; }, read({ value }) { if (removed) throw new Error('read after remove'); return value; }
  });
  assert.equal(S.clearConfirmedRecovery(unreadable, { expectedJournalRaw, validateEnvelope: durableValidator }).ok, false);
  assert.equal(unreadable.map.get(S.STORAGE_KEY), JSON.stringify(candidate));
  const retry = snapshotStorage(unreadable.map);
  assert.equal(S.clearConfirmedRecovery(retry, { expectedJournalRaw, validateEnvelope: durableValidator }).ok, true);
  assert.equal(mutations(retry).length, 0);
  assert.equal(S.loadRecovery(retry, durableValidator).status, 'none');
});

test('durable dispatch replay, stale outcomes and journal revision ownership preserve legacy single-consumption', () => {
  const started = durableBegin();
  const store = storage(durableBefore);
  const outcome = S.writeDurableAttempt(store, started.session, started.attempt);
  const before = mutations(store).length;
  assert.equal(S.writeDurableAttempt(store, started.session, started.attempt).error, 'stale-save-attempt');
  assert.equal(S.writeAttempt(store, started.session, started.attempt).error, 'stale-save-attempt');
  assert.equal(mutations(store).length, before);
  assert.equal(S.finishSave(started.session, started.attempt, outcome).effect, 'close');
  assert.equal(S.finishSave(started.session, started.attempt, outcome).ok, false);
});

test('prepared cleanup that already removed journal resolves only absent plus exact before bytes', () => {
  const fixture = preparedFixture();
  let removed = false;
  const uncertain = snapshotStorage(fixture.store.map, {
    afterRemove({ key }) { if (key === S.RECOVERY_KEY) removed = true; },
    read({ value }) { if (removed) throw new Error('cleanup read unavailable'); return value; }
  });
  const options = { expectedJournalRaw: fixture.journalRaw, validateEnvelope: durableValidator };
  const first = S.recoverDurableAttempt(uncertain, options);
  assert.equal(first.ok, false);
  assert.equal(uncertain.map.has(S.RECOVERY_KEY), false);
  assert.equal(uncertain.map.get(S.STORAGE_KEY), durableBefore);
  const retry = snapshotStorage(uncertain.map);
  const result = S.recoverDurableAttempt(retry, options);
  assert.equal(result.ok, true);
  assert.equal(result.beforeRaw, durableBefore);
  assert.equal(result.writeCount, 0);
  assert.equal(result.journalWriteCount, 0);
  assert.equal(mutations(retry).length, 0);
  for (const target of [JSON.stringify(candidate), 'foreign']) {
    const unsafe = storage(target);
    assert.equal(S.recoverDurableAttempt(unsafe, options).ok, false);
    assert.equal(mutations(unsafe).length, 0);
  }
});

test('initial journal read failure exposes known attempt for explicit absence-plus-before resolution without writes', () => {
  const store = storage(durableBefore, { read({ key, value }) { if (key === S.RECOVERY_KEY) throw new Error('journal read denied'); return value; } });
  const { outcome, result } = durableRun(store);
  assert.equal(outcome.status, 'recovery-required');
  assert.equal(result.session.status, 'recovery-required');
  assert.equal(mutations(store).length, 0);
  assert.equal(store.map.has(S.RECOVERY_KEY), false);
  assert.equal(JSON.parse(outcome.journalRaw).phase, 'prepared');
  const available = snapshotStorage(store.map);
  assert.equal(S.loadRecovery(available, durableValidator).status, 'none');
  const recovered = S.recoverDurableAttempt(available, { expectedJournalRaw: outcome.journalRaw, validateEnvelope: durableValidator });
  assert.equal(recovered.ok, true);
  assert.equal(mutations(available).length, 0);
  const resumed = S.resumeRecoveredSession(recovered, { sessionId: 'after-read-failure' });
  assert.equal(resumed.status, 'dirty-valid');
  assert.equal(resumed.attempt, null);
});

test('journal ownership drift immediately before prepare/confirm/cleanup preserves newer record', () => {
  let prepareReads = 0;
  const prepare = storage(durableBefore, { read({ key, value, map }) {
    if (key === S.RECOVERY_KEY && ++prepareReads === 2) { map.set(key, 'foreign-before-prepare'); return 'foreign-before-prepare'; }
    return value;
  } });
  const before = durableRun(prepare);
  assert.equal(before.outcome.status, 'recovery-required');
  assert.equal(before.outcome.writeCount, 0);
  assert.equal(prepare.map.get(S.RECOVERY_KEY), 'foreign-before-prepare');
  assert.equal(mutations(prepare).length, 0);
  const confirm = storage(durableBefore, { afterWrite({ key, map }) {
    if (key === S.STORAGE_KEY) map.set(S.RECOVERY_KEY, 'foreign-before-confirm');
  } });
  const after = durableRun(confirm);
  assert.equal(after.outcome.status, 'recovery-required');
  assert.equal(after.outcome.rollbackWriteCount, 0);
  assert.equal(confirm.map.get(S.RECOVERY_KEY), 'foreign-before-confirm');
  assert.equal(confirm.map.get(S.STORAGE_KEY), JSON.stringify(candidate));
  const saved = durableRun();
  const expectedJournalRaw = saved.store.map.get(S.RECOVERY_KEY);
  const cleanup = snapshotStorage(saved.store.map, { read({ key, value, map }) {
    if (key === S.STORAGE_KEY) map.set(S.RECOVERY_KEY, 'foreign-before-remove');
    return value;
  } });
  assert.equal(S.clearConfirmedRecovery(cleanup, { expectedJournalRaw, validateEnvelope: durableValidator }).ok, false);
  assert.equal(cleanup.map.get(S.RECOVERY_KEY), 'foreign-before-remove');
  assert.equal(mutations(cleanup).length, 0);
});

for (const kind of ['plan', 'quick']) {
  test(`real model ${kind} durable save, readonly confirmed reload and explicit cleanup use exactly two PoC keys`, () => {
    const M = require('./model.js');
    const envelope = M.initialEnvelope();
    let draft;
    if (kind === 'plan') {
      const flow = envelope.state.flows[0];
      draft = { flowId: flow.id, title: flow.title, items: envelope.state.tasks.filter(item => item.flowId === flow.id)
        .map(item => ({ id: item.id, title: item.title, memo: item.memo || '', planDate: item.planDate || null })) };
    } else {
      const item = envelope.state.tasks.find(task => !task.flowId);
      draft = { mode: 'quick', flowId: null, id: item.id, title: item.title, memo: item.memo, date: item.date, folderId: item.folderId };
    }
    const current = dirty(session(kind, draft, 'real-durable-' + kind));
    const action = kind === 'plan'
      ? { type: 'commit-personal-plan', flowId: draft.flowId, title: current.draft.title, items: current.draft.items }
      : Object.assign({ type: 'update-quick' }, current.draft);
    const next = M.transitionEnvelope(envelope, action);
    const validator = value => M.loadEnvelope({ getItem: () => JSON.stringify(value) }).status === 'restored';
    const started = S.beginSave(current, { attemptId: 'actual-model', expectedRaw: JSON.stringify(envelope), candidate: next.envelope, validateEnvelope: validator });
    const store = storage(JSON.stringify(envelope));
    const saved = durableRun(store, started);
    assert.equal(saved.outcome.status, 'committed');
    const reload = snapshotStorage(store.map);
    const loaded = S.loadRecovery(reload, validator);
    assert.equal(loaded.status, 'confirmed');
    assert.equal(M.loadEnvelope(reload).status, 'restored');
    assert.equal(mutations(reload).length, 0);
    const cleaned = S.clearConfirmedRecovery(reload, { expectedJournalRaw: loaded.journalRaw, validateEnvelope: validator });
    assert.equal(cleaned.ok, true);
    assert.deepEqual(mutations(reload).map(call => call.slice(0, 2)), [['removeItem', S.RECOVERY_KEY]]);
    assert.equal(store.map.get('flow:operating:sentinel'), '  source\r\n bytes  ');
    assert.equal(mutations(store).every(call => [S.STORAGE_KEY, S.RECOVERY_KEY].includes(call[1])), true);
  });
}

// K2B-C2: the two fixed workspace pairs share editor semantics, never raw key remapping.
const V2 = S.createForWorkspace('checkpoint-v2');
function checkpointFixture(kind = 'quick', options = {}) {
  const M = require('./model.js');
  const C = require('./workspace-checkpoint.js');
  const legacyRaw = options.emptyLegacy ? null : JSON.stringify(M.initialEnvelope(), null, 2);
  const projected = C.fromLegacy(legacyRaw);
  assert.equal(projected.ok, true);
  const checkpoint = projected.checkpoint;
  let draft;
  if (kind === 'plan') {
    const flow = checkpoint.state.flows[0];
    draft = { flowId: flow.id, title: flow.title, items: checkpoint.state.tasks.filter(item => item.flowId === flow.id)
      .map(item => ({ id: item.id, title: item.title, memo: item.memo || '', planDate: item.planDate || null })) };
  } else {
    const item = checkpoint.state.tasks.find(task => !task.flowId);
    draft = { mode: 'quick', flowId: null, id: item.id, title: item.title, memo: item.memo, date: item.date, folderId: item.folderId };
  }
  const opened = V2.createSession({ sessionId: 'checkpoint-editor-' + kind, kind, scopeId: kind === 'plan' ? draft.flowId : draft.id, draft });
  const current = V2.updateDraft(opened, { ...draft, title: draft.title + ' 수정' }).session;
  const action = kind === 'plan' ? { type: 'commit-personal-plan', flowId: draft.flowId, title: current.draft.title, items: current.draft.items }
    : { type: 'update-quick', ...current.draft };
  const changed = C.transitionCheckpoint(checkpoint, action);
  assert.equal(changed.changed, true);
  const candidate = options.noop ? checkpoint : changed.checkpoint;
  const expectedRaw = options.newTarget ? null : JSON.stringify(checkpoint);
  const started = V2.beginSave(current, { attemptId: 'checkpoint-attempt', expectedRaw, candidate });
  assert.equal(started.ok, true);
  return { checkpoint, candidate, current, started, legacyRaw, expectedRaw };
}
function checkpointStore(fixture, hooks = {}) {
  const store = storage(fixture.legacyRaw, hooks);
  if (fixture.expectedRaw !== null) store.map.set(V2.STORAGE_KEY, fixture.expectedRaw);
  return store;
}
function checkpointRun(fixture = checkpointFixture(), hooks = {}) {
  const store = checkpointStore(fixture, hooks);
  const outcome = V2.writeDurableAttempt(store, fixture.started.session, fixture.started.attempt);
  return { fixture, store, outcome, result: V2.finishSave(fixture.started.session, fixture.started.attempt, outcome) };
}
function checkpointPrepared(options = {}) {
  const fixture = checkpointFixture('quick', options);
  const result = checkpointRun(fixture, { beforeWrite({ key, value }) {
    if (key === V2.RECOVERY_KEY && JSON.parse(value).phase === 'confirmed') throw new Error('pause-before-confirm');
  } });
  const journalRaw = result.store.map.get(V2.RECOVERY_KEY);
  assert.equal(JSON.parse(journalRaw).phase, 'prepared');
  return { ...result, journalRaw };
}
function assertCheckpointBoundary(store, expectedLegacy) {
  assert.equal(store.map.get(S.STORAGE_KEY) ?? null, expectedLegacy);
  assert.equal(store.map.get('flow:operating:sentinel'), '  source\r\n bytes  ');
  assert.equal(mutations(store).every(call => [V2.STORAGE_KEY, V2.RECOVERY_KEY].includes(call[1])), true);
}

test('fixed workspace factory returns cached pairs and rejects every arbitrary key or option', () => {
  assert.equal(S.createForWorkspace('legacy-v1'), S);
  assert.equal(V2.createForWorkspace('checkpoint-v2'), V2);
  assert.equal(V2.createForWorkspace('legacy-v1'), S);
  assert.equal(V2.WORKSPACE_PAIR, 'checkpoint-v2');
  assert.equal(V2.STORAGE_KEY, 'flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2');
  assert.equal(V2.RECOVERY_KEY, 'flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2');
  for (const name of [undefined, null, '', 'v2', S.STORAGE_KEY, V2.STORAGE_KEY, {}, { target: V2.STORAGE_KEY }]) {
    assert.throws(() => S.createForWorkspace(name), /unsupported-workspace-pair/);
  }
  assert.equal(Object.isFrozen(V2), true);
});

test('checkpoint candidate and before require internal C1 validation even with a permissive caller', () => {
  const fixture = checkpointFixture();
  const beginWith = fields => V2.beginSave(fixture.current, { attemptId: 'bad', candidate: fixture.candidate, expectedRaw: fixture.expectedRaw, validateEnvelope: () => true, ...fields });
  assert.equal(beginWith({ candidate }).ok, false);
  assert.equal(beginWith({ expectedRaw: durableBefore }).ok, false);
  assert.equal(beginWith({ expectedRaw: '{bad' }).ok, false);
  assert.equal(beginWith({ candidate: { ...fixture.candidate, version: 99 } }).ok, false);
  assert.equal(beginWith({ candidate: { ...fixture.candidate, extra: true } }).ok, false);
  assert.equal(beginWith({ validateEnvelope: () => false }).ok, false);
  const C = require('./workspace-checkpoint.js');
  const other = C.fromLegacy(null).checkpoint;
  assert.equal(beginWith({ expectedRaw: JSON.stringify(other) }).ok, false);
});

test('checkpoint direct writer is a zero-write non-consuming durable bypass rejection', () => {
  const fixture = checkpointFixture();
  const store = checkpointStore(fixture);
  const blocked = V2.writeAttempt(store, fixture.started.session, fixture.started.attempt);
  assert.equal(blocked.error, 'durable-required');
  assert.equal(mutations(store).length, 0);
  assert.equal(V2.writeDurableAttempt(store, fixture.started.session, fixture.started.attempt).status, 'committed');
  assertCheckpointBoundary(store, fixture.legacyRaw);
});

test('cross-pair and copied session/attempt/outcome cannot acquire either writer ownership', () => {
  const fixture = checkpointFixture();
  const store = checkpointStore(fixture);
  const legacy = durableBegin();
  assert.equal(S.writeAttempt(store, fixture.started.session, fixture.started.attempt).status, 'preflight-failed');
  assert.equal(V2.writeDurableAttempt(store, legacy.session, legacy.attempt).status, 'preflight-failed');
  assert.equal(V2.writeDurableAttempt(store, { ...fixture.started.session }, fixture.started.attempt).status, 'preflight-failed');
  assert.equal(V2.writeDurableAttempt(store, fixture.started.session, { ...fixture.started.attempt }).status, 'preflight-failed');
  assert.equal(mutations(store).length, 0);
  const saved = V2.writeDurableAttempt(store, fixture.started.session, fixture.started.attempt);
  const count = mutations(store).length;
  assert.equal(S.finishSave(fixture.started.session, fixture.started.attempt, saved).ok, false);
  assert.equal(V2.finishSave(fixture.started.session, fixture.started.attempt, { ...saved }).ok, false);
  assert.equal(V2.finishSave(fixture.started.session, fixture.started.attempt, saved).effect, 'close');
  assert.equal(V2.finishSave(fixture.started.session, fixture.started.attempt, saved).ok, false);
  assert.equal(S.createForWorkspace('checkpoint-v2').writeDurableAttempt(store, fixture.started.session, fixture.started.attempt).status, 'preflight-failed');
  assert.equal(mutations(store).length, count);
});

for (const kind of ['plan', 'quick']) {
  for (const emptyLegacy of [false, true]) {
    test(`checkpoint ${kind} first explicit save with ${emptyLegacy ? 'absent' : 'existing'} legacy preserves source and confirms only the fixed new pair`, () => {
      const fixture = checkpointFixture(kind, { newTarget: true, emptyLegacy });
      const saved = checkpointRun(fixture);
      assert.equal(saved.outcome.status, 'committed');
      assert.equal(saved.outcome.legacyStatus, 'matching');
      assert.equal(saved.result.effect, 'close');
      assert.equal(saved.outcome.writeCount, 1);
      assert.equal(saved.outcome.journalWriteCount, 2);
      const raw = saved.store.map.get(V2.RECOVERY_KEY);
      assert.equal(JSON.parse(raw).targetKey, V2.STORAGE_KEY);
      const reload = snapshotStorage(saved.store.map);
      assert.equal(V2.loadRecovery(reload).status, 'confirmed');
      assert.equal(mutations(reload).length, 0);
      assert.equal(V2.clearConfirmedRecovery(reload, { expectedJournalRaw: raw }).ok, true);
      assert.deepEqual(mutations(reload).map(call => call.slice(0, 2)), [['removeItem', V2.RECOVERY_KEY]]);
      assertCheckpointBoundary(saved.store, fixture.legacyRaw);
    });
  }
}

test('checkpoint no-op and stale target create no journal or target writes', () => {
  const fixture = checkpointFixture('quick', { noop: true });
  const saved = checkpointRun(fixture);
  assert.equal(saved.outcome.status, 'unchanged');
  assert.equal(mutations(saved.store).length, 0);
  const stale = checkpointFixture();
  const store = checkpointStore(stale);
  store.map.set(V2.STORAGE_KEY, 'foreign checkpoint');
  assert.equal(V2.writeDurableAttempt(store, stale.started.session, stale.started.attempt).error, 'stale-expected-raw');
  assert.equal(mutations(store).length, 0);
});

for (const mode of ['drift', 'read-error', 'journal-present', 'journal-read-error']) {
  test(`checkpoint initial legacy ${mode} blocks even no-op with both write counts zero`, () => {
    const fixture = checkpointFixture('quick', { noop: true });
    const store = checkpointStore(fixture, { read({ key, value }) {
      if ((mode === 'read-error' && key === S.STORAGE_KEY) || (mode === 'journal-read-error' && key === S.RECOVERY_KEY)) throw new Error('unreadable');
      return value;
    } });
    if (mode === 'drift') store.map.set(S.STORAGE_KEY, fixture.legacyRaw + ' ');
    if (mode === 'journal-present') store.map.set(S.RECOVERY_KEY, 'old pending or unknown record');
    const outcome = V2.writeDurableAttempt(store, fixture.started.session, fixture.started.attempt);
    assert.equal(outcome.status, 'recovery-required');
    assert.equal(outcome.legacyStatus, mode);
    assert.equal(outcome.canResume, false);
    assert.equal(mutations(store).length, 0);
  });
}

for (const boundary of ['prepare', 'target', 'confirm']) {
  for (const fault of ['drift', 'read-error', 'old-journal']) {
    test(`checkpoint rechecks legacy ${fault} immediately before ${boundary} and preserves owned prepared evidence`, () => {
      const fixture = checkpointFixture();
      let armed = false;
      let ownJournalReads = 0;
      const store = checkpointStore(fixture, { read({ key, value, map }) {
        if (key === V2.RECOVERY_KEY) {
          ownJournalReads += 1;
          if (boundary === 'prepare' && ownJournalReads === 2) armed = true;
          if (boundary === 'confirm' && value !== null && map.get(V2.STORAGE_KEY) === fixture.started.attempt.serialized) armed = true;
        }
        if (boundary === 'target' && key === V2.STORAGE_KEY && map.has(V2.RECOVERY_KEY)) armed = true;
        if (armed && fault === 'old-journal') map.set(S.RECOVERY_KEY, 'foreign old journal');
        if (armed && key === S.STORAGE_KEY) {
          if (fault === 'read-error') throw new Error('legacy read');
          if (fault === 'drift') { map.set(S.STORAGE_KEY, 'foreign old base'); return 'foreign old base'; }
        }
        return key === S.RECOVERY_KEY ? map.get(key) ?? null : value;
      } });
      const outcome = V2.writeDurableAttempt(store, fixture.started.session, fixture.started.attempt);
      assert.equal(outcome.status, 'recovery-required');
      assert.equal(outcome.legacyStatus, fault === 'old-journal' ? 'journal-present' : fault);
      assert.equal(outcome.writeCount, boundary === 'confirm' ? 1 : 0);
      assert.equal(outcome.journalWriteCount, boundary === 'prepare' ? 0 : 1);
      if (boundary !== 'prepare') assert.equal(JSON.parse(store.map.get(V2.RECOVERY_KEY)).phase, 'prepared');
      assert.equal(mutations(store).every(call => [V2.STORAGE_KEY, V2.RECOVERY_KEY].includes(call[1])), true);
      if (fault === 'drift') assert.equal(store.map.get(S.STORAGE_KEY), 'foreign old base');
    });
  }
}

test('checkpoint refuses pending, confirmed and general-action journals instead of replacing them', () => {
  const pending = checkpointPrepared();
  const confirmed = checkpointRun();
  const general = JSON.stringify({ version: 2, contract: 'flowme-workspace-action-journal-v2', phase: 'prepared', targetKey: V2.STORAGE_KEY });
  for (const raw of [pending.journalRaw, confirmed.store.map.get(V2.RECOVERY_KEY), general, '{bad']) {
    const fixture = checkpointFixture('quick', { noop: true });
    const store = checkpointStore(fixture);
    store.map.set(V2.RECOVERY_KEY, raw);
    const outcome = V2.writeDurableAttempt(store, fixture.started.session, fixture.started.attempt);
    assert.equal(outcome.status, 'recovery-required');
    assert.equal(store.map.get(V2.RECOVERY_KEY), raw);
    assert.equal(mutations(store).length, 0);
  }
  const store = checkpointStore(checkpointFixture());
  store.map.set(V2.RECOVERY_KEY, general);
  assert.equal(V2.loadRecovery(store).status, 'blocked');
  assert.equal(V2.recoverDurableAttempt(store, { expectedJournalRaw: general }).ok, false);
  assert.equal(V2.clearConfirmedRecovery(store, { expectedJournalRaw: general }).ok, false);
  assert.equal(mutations(store).length, 0);
});

for (const phase of ['prepared', 'confirmed']) {
  test(`checkpoint ${phase} journal throw-after uses durable phase evidence without legacy writes`, () => {
    const fixture = checkpointFixture();
    const saved = checkpointRun(fixture, { afterWrite({ key, value }) {
      if (key === V2.RECOVERY_KEY && JSON.parse(value).phase === phase) throw new Error('journal wrote then threw');
    } });
    assert.equal(saved.outcome.status, phase === 'prepared' ? 'recovery-required' : 'committed');
    assert.equal(saved.outcome.writeCount, phase === 'prepared' ? 0 : 1);
    assert.equal(V2.loadRecovery(snapshotStorage(saved.store.map)).status, phase);
    assertCheckpointBoundary(saved.store, fixture.legacyRaw);
  });
}

for (const newTarget of [false, true]) {
  test(`checkpoint target throw-after verifies rollback to ${newTarget ? 'absence' : 'exact before'} and preserves retry ownership`, () => {
    const fixture = checkpointFixture('quick', { newTarget });
    let throwOnce = true;
    const saved = checkpointRun(fixture, { afterWrite({ key }) {
      if (key === V2.STORAGE_KEY && throwOnce) { throwOnce = false; throw new Error('target wrote'); }
    } });
    assert.equal(saved.outcome.status, 'failed');
    assert.equal(saved.outcome.rollback, 'complete');
    assert.equal(saved.store.map.get(V2.STORAGE_KEY) ?? null, fixture.expectedRaw);
    assert.equal(saved.store.map.has(V2.RECOVERY_KEY), false);
    const retry = V2.retrySave(saved.result.session, fixture.started.attempt.attemptId);
    assert.equal(retry.ok, true);
    const outcome = V2.writeDurableAttempt(saved.store, retry.session, retry.attempt);
    assert.equal(outcome.status, 'committed');
    assertCheckpointBoundary(saved.store, fixture.legacyRaw);
  });
}

test('checkpoint foreign target at readback is preserved with prepared recovery locked', () => {
  const fixture = checkpointFixture();
  const saved = checkpointRun(fixture, { afterWrite({ key, map }) {
    if (key === V2.STORAGE_KEY) { map.set(key, 'newer foreign target'); throw new Error('drift'); }
  } });
  assert.equal(saved.outcome.status, 'recovery-required');
  assert.equal(saved.outcome.rollbackWriteCount, 0);
  assert.equal(saved.store.map.get(V2.STORAGE_KEY), 'newer foreign target');
  assert.equal(V2.loadRecovery(snapshotStorage(saved.store.map)).status, 'blocked');
  assertCheckpointBoundary(saved.store, fixture.legacyRaw);
});

for (const kind of ['drift', 'read-error']) {
  test(`explicit checkpoint recovery restores only owned v2 bytes but ${kind} cannot unlock or resume`, () => {
    const prepared = checkpointPrepared();
    const store = snapshotStorage(prepared.store.map, { read({ key, value }) {
      if (kind === 'read-error' && key === S.STORAGE_KEY) throw new Error('legacy unavailable');
      return value;
    } });
    if (kind === 'drift') store.map.set(S.STORAGE_KEY, 'changed old base');
    const result = V2.recoverDurableAttempt(store, { expectedJournalRaw: prepared.journalRaw });
    assert.equal(result.ok, true);
    assert.equal(result.canResume, false);
    assert.equal(result.legacyStatus, kind);
    assert.equal(store.map.get(V2.STORAGE_KEY), prepared.fixture.expectedRaw);
    assert.equal(store.map.has(V2.RECOVERY_KEY), false);
    assert.throws(() => V2.resumeRecoveredSession(result, { storage: store, sessionId: 'cannot-resume' }), /legacy-recovery-locked/);
    assert.equal(mutations(store).every(call => [V2.STORAGE_KEY, V2.RECOVERY_KEY].includes(call[1])), true);
  });
}

test('checkpoint recovery requires fresh storage proof at resume and rejects replay after success', () => {
  const prepared = checkpointPrepared();
  const store = snapshotStorage(prepared.store.map);
  const recovery = V2.recoverDurableAttempt(store, { expectedJournalRaw: prepared.journalRaw });
  assert.equal(recovery.canResume, true);
  assert.throws(() => V2.resumeRecoveredSession(recovery, { sessionId: 'missing-storage' }), /legacy-recovery-locked/);
  store.map.set(S.STORAGE_KEY, 'changed after recovery');
  assert.throws(() => V2.resumeRecoveredSession(recovery, { storage: store, sessionId: 'late-drift' }), /legacy-base-drift/);
  store.map.set(S.STORAGE_KEY, prepared.fixture.legacyRaw);
  store.map.set(V2.STORAGE_KEY, 'changed target after recovery');
  assert.throws(() => V2.resumeRecoveredSession(recovery, { storage: store, sessionId: 'late-target' }), /recovered-workspace-unverified/);
  store.map.set(V2.STORAGE_KEY, recovery.beforeRaw);
  const resumed = V2.resumeRecoveredSession(recovery, { storage: store, sessionId: 'resumed-checkpoint' });
  assert.equal(resumed.status, 'dirty-valid');
  assert.deepEqual(resumed.draft, prepared.fixture.current.draft);
  assert.throws(() => V2.resumeRecoveredSession(recovery, { storage: store, sessionId: 'replay' }), /invalid-recovered-session/);
});

test('checkpoint confirmed cleanup after legacy drift deletes only owned journal, never rolls back commit', () => {
  const saved = checkpointRun();
  const journalRaw = saved.store.map.get(V2.RECOVERY_KEY);
  const store = snapshotStorage(saved.store.map, { afterRemove({ key }) { if (key === V2.RECOVERY_KEY) throw new Error('removed then threw'); } });
  store.map.set(S.STORAGE_KEY, 'newer old base');
  const result = V2.clearConfirmedRecovery(store, { expectedJournalRaw: journalRaw });
  assert.equal(result.ok, true);
  assert.equal(result.legacyStatus, 'drift');
  assert.equal(result.canResume, false);
  assert.equal(store.map.get(V2.STORAGE_KEY), saved.fixture.started.attempt.serialized);
  assert.equal(store.map.get(S.STORAGE_KEY), 'newer old base');
  assert.deepEqual(mutations(store).map(call => call.slice(0, 2)), [['removeItem', V2.RECOVERY_KEY]]);
  assert.equal(V2.clearConfirmedRecovery(store, { expectedJournalRaw: journalRaw }).ok, true);
});

test('checkpoint legacy drift during confirmed write preserves committed outcome but blocks editor close', () => {
  const fixture = checkpointFixture();
  const saved = checkpointRun(fixture, { afterWrite({ key, value, map }) {
    if (key === V2.RECOVERY_KEY && JSON.parse(value).phase === 'confirmed') map.set(S.STORAGE_KEY, 'changed during confirmed');
  } });
  assert.equal(saved.outcome.status, 'committed');
  assert.equal(saved.outcome.canResume, false);
  assert.equal(saved.result.session.status, 'recovery-required');
  assert.equal(saved.result.changed, true);
  assert.equal(saved.store.map.get(V2.STORAGE_KEY), fixture.started.attempt.serialized);
  assert.equal(saved.outcome.rollbackWriteCount, 0);
});

test('checkpoint decoder rejects cross-pair target and invalid candidate/before even with caller true', () => {
  const prepared = checkpointPrepared();
  const original = JSON.parse(prepared.journalRaw);
  for (const changed of [{ targetKey: S.STORAGE_KEY }, { candidateRaw: JSON.stringify(candidate) }, { beforeRaw: durableBefore }, { extra: true }, { version: 2 }, { kind: 'item' }]) {
    const store = snapshotStorage(prepared.store.map);
    const raw = JSON.stringify({ ...original, ...changed });
    store.map.set(V2.RECOVERY_KEY, raw);
    assert.equal(V2.loadRecovery(store, () => true).status, 'blocked');
    assert.equal(V2.recoverDurableAttempt(store, { expectedJournalRaw: raw, validateEnvelope: () => true }).ok, false);
    assert.equal(mutations(store).length, 0);
  }
  const legacyStore = snapshotStorage(prepared.store.map);
  legacyStore.map.set(S.RECOVERY_KEY, prepared.journalRaw);
  assert.equal(S.loadRecovery(legacyStore, () => true).status, 'blocked');
  assert.equal(mutations(legacyStore).length, 0);
});

test('checkpoint initial target/journal read errors fail closed without a fallback storage write', () => {
  for (const failedKey of [V2.STORAGE_KEY, V2.RECOVERY_KEY]) {
    const fixture = checkpointFixture();
    const saved = checkpointRun(fixture, { read({ key, value }) { if (key === failedKey) throw new Error('read failure'); return value; } });
    assert.notEqual(saved.outcome.status, 'committed');
    assert.equal(mutations(saved.store).length, 0);
    assertCheckpointBoundary(saved.store, fixture.legacyRaw);
    if (failedKey === V2.RECOVERY_KEY) {
      const available = snapshotStorage(saved.store.map);
      const recovered = V2.recoverDurableAttempt(available, { expectedJournalRaw: saved.outcome.journalRaw });
      assert.equal(recovered.ok, true);
      assert.equal(recovered.canResume, true);
      assert.equal(mutations(available).length, 0);
    }
  }
});

test('checkpoint prepare wrong readback/foreign journal never writes target or erases foreign evidence', () => {
  const fixture = checkpointFixture();
  const saved = checkpointRun(fixture, { afterWrite({ key, map }) { if (key === V2.RECOVERY_KEY) map.set(key, 'foreign recovery'); } });
  assert.equal(saved.outcome.status, 'recovery-required');
  assert.equal(saved.outcome.writeCount, 0);
  assert.equal(saved.store.map.get(V2.RECOVERY_KEY), 'foreign recovery');
  assert.equal(saved.store.map.get(V2.STORAGE_KEY), fixture.expectedRaw);
  assertCheckpointBoundary(saved.store, fixture.legacyRaw);
});

test('checkpoint failed rollback retains prepared and explicit recovery can later restore null before', () => {
  const fixture = checkpointFixture('quick', { newTarget: true });
  const saved = checkpointRun(fixture, {
    afterWrite({ key }) { if (key === V2.STORAGE_KEY) throw new Error('after target'); },
    beforeRemove({ key }) { if (key === V2.STORAGE_KEY) throw new Error('rollback remove failed'); }
  });
  assert.equal(saved.outcome.status, 'recovery-required');
  assert.equal(saved.store.map.get(V2.STORAGE_KEY), fixture.started.attempt.serialized);
  const available = snapshotStorage(saved.store.map);
  const inspected = V2.loadRecovery(available);
  assert.equal(inspected.status, 'prepared');
  const recovered = V2.recoverDurableAttempt(available, { expectedJournalRaw: inspected.journalRaw });
  assert.equal(recovered.ok, true);
  assert.equal(recovered.beforeRaw, null);
  assert.equal(available.map.has(V2.STORAGE_KEY), false);
  assert.equal(V2.resumeRecoveredSession(recovered, { storage: available, sessionId: 'null-before-resume' }).status, 'dirty-valid');
  assertCheckpointBoundary(available, fixture.legacyRaw);
});

test('checkpoint confirmation unreadable after actual commit remains uncertain and reload never rolls target back', () => {
  const fixture = checkpointFixture();
  let confirming = false;
  const saved = checkpointRun(fixture, {
    afterWrite({ key, value }) { if (key === V2.RECOVERY_KEY && JSON.parse(value).phase === 'confirmed') confirming = true; },
    read({ key, value }) { if (confirming && key === V2.RECOVERY_KEY) throw new Error('confirmation unreadable'); return value; }
  });
  assert.equal(saved.outcome.status, 'recovery-required');
  assert.equal(saved.outcome.commitUncertain, true);
  assert.equal(saved.outcome.rollbackWriteCount, 0);
  const available = snapshotStorage(saved.store.map);
  const inspected = V2.loadRecovery(available);
  assert.equal(inspected.status, 'confirmed');
  assert.equal(mutations(available).length, 0);
  assert.equal(V2.recoverDurableAttempt(available, { expectedJournalRaw: inspected.journalRaw }).ok, false);
  assert.equal(mutations(available).length, 0);
  assertCheckpointBoundary(available, fixture.legacyRaw);
});

test('checkpoint cleanup cannot erase a replaced general journal or claim success when removal is unreadable', () => {
  const saved = checkpointRun();
  const raw = saved.store.map.get(V2.RECOVERY_KEY);
  const foreign = snapshotStorage(saved.store.map);
  foreign.map.set(V2.RECOVERY_KEY, 'foreign-general-journal');
  assert.equal(V2.clearConfirmedRecovery(foreign, { expectedJournalRaw: raw }).ok, false);
  assert.equal(mutations(foreign).length, 0);
  let removed = false;
  const uncertain = snapshotStorage(saved.store.map, {
    afterRemove({ key }) { if (key === V2.RECOVERY_KEY) removed = true; },
    read({ key, value }) { if (removed && key === V2.RECOVERY_KEY) throw new Error('cleanup read failed'); return value; }
  });
  assert.equal(V2.clearConfirmedRecovery(uncertain, { expectedJournalRaw: raw }).ok, false);
  assert.equal(uncertain.map.get(V2.STORAGE_KEY), saved.fixture.started.attempt.serialized);
  const available = snapshotStorage(uncertain.map);
  assert.equal(V2.clearConfirmedRecovery(available, { expectedJournalRaw: raw }).ok, true);
  assert.equal(mutations(available).length, 0);
});

test('checkpoint UMD pair requires the actual checkpoint dependency and retains independent legacy API', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('./plan-item-session.js'), 'utf8'), context);
  const blocked = vm.runInContext(`(() => {
    const adapter = FlowPocPlanItemSession.createForWorkspace('checkpoint-v2');
    const draft = { mode: 'quick', id: 'a', flowId: null, title: 'A', memo: '', date: null };
    const opened = adapter.createSession({ sessionId: 'umd', scopeId: 'a', kind: 'quick', draft });
    const dirty = adapter.updateDraft(opened, { ...draft, title: 'B' }).session;
    return adapter.beginSave(dirty, { attemptId: 'a', expectedRaw: null, candidate: { version: 2 }, validateEnvelope: () => true });
  })()`, context);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, 'invalid-envelope');
  assert.equal(context.FlowPocPlanItemSession.WORKSPACE_PAIR, 'legacy-v1');
});

for (const driftKey of [V2.STORAGE_KEY, V2.RECOVERY_KEY]) {
  test(`checkpoint retains foreign ${driftKey === V2.STORAGE_KEY ? 'target' : 'journal'} introduced during legacy guard before a write`, () => {
    const fixture = checkpointFixture();
    let injected = false;
    const store = checkpointStore(fixture, { read({ key, value, map }) {
      if (!injected && key === S.STORAGE_KEY && map.has(V2.RECOVERY_KEY)) {
        map.set(driftKey, 'foreign-between-guards');
        injected = true;
      }
      return value;
    } });
    const outcome = V2.writeDurableAttempt(store, fixture.started.session, fixture.started.attempt);
    assert.equal(outcome.status, 'recovery-required');
    assert.equal(store.map.get(driftKey), 'foreign-between-guards');
    assert.equal(outcome.writeCount, 0);
    assert.equal(outcome.rollbackWriteCount, 0);
    assertCheckpointBoundary(store, fixture.legacyRaw);
  });
}

for (const operation of ['recover', 'cleanup']) {
  for (const fault of ['present', 'read-error']) {
    test(`checkpoint ${operation} preserves both journals and target when old journal is ${fault}`, () => {
      const source = operation === 'recover' ? checkpointPrepared() : checkpointRun();
      const raw = source.store.map.get(V2.RECOVERY_KEY);
      const store = snapshotStorage(source.store.map, { read({ key, value }) {
        if (fault === 'read-error' && key === S.RECOVERY_KEY) throw new Error('old recovery unreadable');
        return value;
      } });
      if (fault === 'present') store.map.set(S.RECOVERY_KEY, 'old journal waiting');
      const before = Array.from(store.map);
      const result = operation === 'recover' ? V2.recoverDurableAttempt(store, { expectedJournalRaw: raw })
        : V2.clearConfirmedRecovery(store, { expectedJournalRaw: raw });
      assert.equal(result.ok, false);
      assert.equal(result.canResume, false);
      assert.equal(mutations(store).length, 0);
      assert.deepEqual(Array.from(store.map), before);
    });
  }
}

for (const fault of ['base', 'old-journal', 'new-journal']) {
  test(`checkpoint automatic rollback preserves candidate after ${fault} ownership drift`, () => {
    const fixture = checkpointFixture();
    const saved = checkpointRun(fixture, { afterWrite({ key, map }) {
      if (key === V2.STORAGE_KEY) {
        map.set(fault === 'base' ? S.STORAGE_KEY : fault === 'old-journal' ? S.RECOVERY_KEY : V2.RECOVERY_KEY, 'foreign rollback owner');
        throw new Error('target threw after ownership drift');
      }
    } });
    assert.equal(saved.outcome.status, 'recovery-required');
    assert.equal(saved.outcome.rollbackWriteCount, 0);
    assert.equal(saved.store.map.get(V2.STORAGE_KEY), fixture.started.attempt.serialized);
    assert.equal(mutations(saved.store).filter(call => call[1] === V2.STORAGE_KEY).length, 1);
  });
}

test('checkpoint confirmation checks target candidate again after the legacy guard', () => {
  const fixture = checkpointFixture();
  let injected = false;
  const saved = checkpointRun(fixture, { read({ key, value, map }) {
    if (!injected && key === S.STORAGE_KEY && map.get(V2.STORAGE_KEY) === fixture.started.attempt.serialized) {
      map.set(V2.STORAGE_KEY, 'foreign before confirmed');
      injected = true;
    }
    return value;
  } });
  assert.equal(saved.outcome.status, 'recovery-required');
  assert.equal(JSON.parse(saved.store.map.get(V2.RECOVERY_KEY)).phase, 'prepared');
  assert.equal(saved.outcome.journalWriteCount, 1);
  assert.equal(saved.store.map.get(V2.STORAGE_KEY), 'foreign before confirmed');
});

test('checkpoint prepared recovery rechecks old journal immediately before target restore', () => {
  const source = checkpointPrepared();
  let targetReads = 0;
  const store = snapshotStorage(source.store.map, { read({ key, value, map }) {
    if (key === V2.STORAGE_KEY && ++targetReads === 2) map.set(S.RECOVERY_KEY, 'arrived before restore');
    return value;
  } });
  const result = V2.recoverDurableAttempt(store, { expectedJournalRaw: source.journalRaw });
  assert.equal(result.ok, false);
  assert.equal(mutations(store).length, 0);
  assert.equal(store.map.get(V2.STORAGE_KEY), source.fixture.started.attempt.serialized);
  assert.equal(store.map.get(V2.RECOVERY_KEY), source.journalRaw);
});

test('checkpoint confirmed cleanup rechecks old journal after owned journal lookup before remove', () => {
  const source = checkpointRun();
  const raw = source.store.map.get(V2.RECOVERY_KEY);
  const store = snapshotStorage(source.store.map, { read({ key, value, map }) {
    if (key === V2.RECOVERY_KEY) map.set(S.RECOVERY_KEY, 'arrived before cleanup');
    return value;
  } });
  const result = V2.clearConfirmedRecovery(store, { expectedJournalRaw: raw });
  assert.equal(result.ok, false);
  assert.equal(mutations(store).length, 0);
  assert.equal(store.map.get(V2.RECOVERY_KEY), raw);
});
