import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTEXTUAL_RESULT_VERSION, createResultOwnerSession, beginAttempt, settleAttempt,
  interruptOwner, selectResult, beginContextualUndo, settleUndo, dismissResult,
  type ResultFacts, type ResultIntent, type ResultOwnerState, type ResultOutcome,
} from './personal-workspace-poc-contextual-result';

const BEFORE = '  {"revision":7,"undo":{"secret":"before-raw-do-not-export"}}\r\n';
const AFTER = '{"revision":8,"undo":{"secret":"after-raw-do-not-export"}}';
function facts(extra: Partial<ResultFacts> = {}): ResultFacts {
  return { lane: 'workspace', exactTargetRaw: AFTER, hasUndo: true, authorityReady: true,
    pending: false, editorOwner: false, recoveryOwner: false, receiptOwnerId: null, ...extra };
}
function intent(extra: Partial<ResultIntent> = {}): ResultIntent {
  return { operation: 'move-date', refs: ['item:copy-A:flow-1:item-1'], summary: '9월 6일로 옮겼어요.',
    changes: [{ label: '실행 날짜', before: '2026-09-05', after: '2026-09-06' }],
    context: { kind: 'date', key: '2026-09-06' }, returnPointKey: 'today-list-anchor', ...extra };
}
function started(state = createResultOwnerSession('runtime-1'), nextIntent = intent(), current = facts({ exactTargetRaw: BEFORE })) {
  const begun = beginAttempt(state, nextIntent, current);
  assert.equal(begun.ok, true);
  if (!begun.ok) throw Error('begin-attempt-failed');
  return begun;
}
function saved(nextIntent = intent()) {
  const begun = started(undefined, nextIntent);
  const result = settleAttempt(begun.state, begun.ticket, { kind: 'success', exactTargetRaw: AFTER, hasUndo: true, authorityReady: true });
  assert.equal(result.accepted, true);
  return result.state;
}
function ownerId(state: ResultOwnerState) {
  const selected = selectResult(state, facts());
  assert.ok(selected.result);
  return selected.result.ownerId;
}

test('fresh session has no invented result or Undo, and invalid session id is rejected', () => {
  const state = createResultOwnerSession('one');
  assert.equal(CONTEXTUAL_RESULT_VERSION, 1);
  assert.equal(state.lastSuccess, null);
  assert.equal(selectResult(state, facts()).canUndo, false);
  assert.throws(() => createResultOwnerSession(' '), /session-id/);
});
test('one verified workspace success carries exact refs and resolved context', () => {
  const state = saved();
  const selected = selectResult(state, facts());
  assert.equal(selected.canUndo, true);
  assert.equal(selected.announcementOwner, 'result');
  assert.deepEqual(selected.result?.refs, ['item:copy-A:flow-1:item-1']);
  assert.deepEqual(selected.result?.changes, intent().changes);
  assert.deepEqual(selected.result?.context, intent().context);
});
test('state, ticket, and renderer projection never serialize exact private raw', () => {
  const begun = started();
  const result = settleAttempt(begun.state, begun.ticket, { kind: 'success', exactTargetRaw: AFTER, hasUndo: true, authorityReady: true });
  for (const value of [begun.state, begun.ticket, result.state, result.state.lastSuccess, selectResult(result.state, facts())]) {
    assert.doesNotMatch(JSON.stringify(value), /before-raw-do-not-export|after-raw-do-not-export|exactTargetRaw/);
  }
  assert.equal(Object.getOwnPropertySymbols(selectResult(result.state, facts()).result!).length, 0);
});
test('caller input mutation cannot rename the captured result', () => {
  const input = intent() as { operation: ResultIntent['operation']; refs: string[]; summary: string; changes: { label: string; before: string | null; after: string | null }[]; context: { kind: 'date'; key: string } };
  const begun = started(undefined, input);
  input.refs[0] = 'other-copy'; input.summary = 'wrong'; input.changes[0].after = '2099-01-01'; input.context.key = 'foreign';
  const result = settleAttempt(begun.state, begun.ticket, { kind: 'success', exactTargetRaw: AFTER, hasUndo: true, authorityReady: true });
  assert.equal(result.state.lastSuccess?.summary, '9월 6일로 옮겼어요.');
  assert.equal(result.state.lastSuccess?.refs[0], 'item:copy-A:flow-1:item-1');
  assert.equal(result.state.lastSuccess?.changes[0].after, '2026-09-06');
});
for (const lane of ['creator-drafts', 'source-update', null] as const) {
  test('new explicit workspace action may start after lane ' + lane, () => {
    const begun = started(undefined, intent(), facts({ exactTargetRaw: BEFORE, lane }));
    const next = settleAttempt(begun.state, begun.ticket, { kind: 'success', exactTargetRaw: AFTER, hasUndo: true, authorityReady: true });
    assert.equal(selectResult(next.state, facts()).canUndo, true);
    assert.equal(selectResult(next.state, facts({ lane })).canUndo, false);
  });
}
test('an explicit action can supersede an old receipt; active receipt still owns announcement', () => {
  const begun = started(undefined, intent(), facts({ exactTargetRaw: BEFORE, receiptOwnerId: 'old-receipt' }));
  const next = settleAttempt(begun.state, begun.ticket, { kind: 'success', exactTargetRaw: AFTER, hasUndo: true, authorityReady: true });
  assert.equal(selectResult(next.state, facts({ receiptOwnerId: 'current-receipt' })).announcementOwner, 'receipt');
  assert.equal(selectResult(next.state, facts({ receiptOwnerId: 'current-receipt' })).result, null);
  assert.equal(selectResult(next.state, facts()).canUndo, true);
});
for (const kind of ['date', 'folder', 'flow', 'undated', 'overdue'] as const) {
  test('resolved context ' + kind + ' is preserved without clock access', () => {
    const state = saved(intent({ context: { kind, key: 'explicit-context' } }));
    assert.deepEqual(selectResult(state, facts()).result?.context, { kind, key: 'explicit-context' });
  });
}
for (const operation of ['move-folder', 'move-order', 'complete', 'reopen'] as const) {
  test('operation ' + operation + ' uses the same owner state machine', () => {
    const state = saved(intent({ operation }));
    assert.equal(selectResult(state, facts()).result?.operation, operation);
  });
}
test('verified success without snapshot can display but cannot offer contextual Undo', () => {
  const begun = started();
  const next = settleAttempt(begun.state, begun.ticket, { kind: 'success', exactTargetRaw: AFTER, hasUndo: false, authorityReady: true });
  assert.ok(selectResult(next.state, facts()).result);
  assert.equal(selectResult(next.state, facts()).canUndo, false);
});
for (const kind of ['failed', 'noop', 'canceled', 'recovery-required'] as const) {
  test(kind + ' does not create or rename a success and leaves the prior snapshot owner untouched', () => {
    const first = saved();
    const begun = started(first, intent({ summary: '새 실패 안내' }), facts());
    const previous = begun.state.lastSuccess;
    const next = settleAttempt(begun.state, begun.ticket, { kind });
    assert.equal(next.accepted, true);
    assert.equal(next.state.lastSuccess, previous);
    assert.equal(previous?.summary, first.lastSuccess?.summary);
    assert.equal(selectResult(next.state, facts()).canUndo, false);
  });
}
test('readiness and current pending/editor/recovery prevent a new attempt', () => {
  for (const extra of [{ authorityReady: false }, { pending: true }, { editorOwner: true }, { recoveryOwner: true }]) {
    const state = createResultOwnerSession('locked');
    const result = beginAttempt(state, intent(), facts(extra));
    assert.equal(result.ok, false);
    assert.equal(result.state, state);
  }
  const begun = started();
  assert.equal(beginAttempt(begun.state, intent(), facts()).ok, false);
});
test('owner precedence is recovery then editor then pending then receipt then result', () => {
  const state = saved();
  assert.equal(selectResult(state, facts({ recoveryOwner: true, editorOwner: true, pending: true, receiptOwnerId: 'r' })).announcementOwner, 'recovery');
  assert.equal(selectResult(state, facts({ editorOwner: true, pending: true, receiptOwnerId: 'r' })).announcementOwner, 'editor');
  assert.equal(selectResult(state, facts({ pending: true, receiptOwnerId: 'r' })).announcementOwner, 'pending');
  assert.equal(selectResult(state, facts({ receiptOwnerId: 'r' })).announcementOwner, 'receipt');
  assert.equal(selectResult(state, facts()).announcementOwner, 'result');
});
test('exact raw is byte sensitive and missing snapshot cannot authorize Undo', () => {
  const state = saved();
  for (const raw of [null, AFTER + '\n', BEFORE, AFTER.replace('8', '9')]) {
    assert.equal(selectResult(state, facts({ exactTargetRaw: raw })).canUndo, false);
    assert.equal(beginContextualUndo(state, ownerId(state), facts({ exactTargetRaw: raw })).ok, false);
  }
  assert.equal(selectResult(state, facts({ hasUndo: false })).canUndo, false);
});
test('external drift observed by adapter interruption remains invalid after raw/revision ABA', () => {
  const state = saved();
  assert.equal(selectResult(state, facts({ exactTargetRaw: BEFORE })).canUndo, false);
  const interrupted = interruptOwner(state, 'external-drift');
  assert.equal(selectResult(interrupted, facts()).canUndo, false);
  assert.equal(interrupted.lastSuccess, state.lastSuccess);
});
test('late callback after editor/recovery interruption cannot resurrect generic success', () => {
  const begun = started();
  for (const reason of ['editor', 'recovery', 'receipt', 'source-update', 'creator-drafts']) {
    const hidden = interruptOwner(begun.state, reason);
    const late = settleAttempt(hidden, begun.ticket, { kind: 'success', exactTargetRaw: AFTER, hasUndo: true, authorityReady: true });
    assert.equal(late.accepted, false);
    assert.equal(late.state, hidden);
    assert.equal(hidden.lastSuccess, null);
  }
});
test('old callback cannot replace a newer failed attempt even at matching raw', () => {
  const old = started();
  const canceled = interruptOwner(old.state, 'new-intent');
  const fresh = started(canceled);
  const failed = settleAttempt(fresh.state, fresh.ticket, { kind: 'failed' });
  const late = settleAttempt(failed.state, old.ticket, { kind: 'success', exactTargetRaw: AFTER, hasUndo: true, authorityReady: true });
  assert.equal(late.accepted, false);
  assert.equal(late.state.presentation, 'failure');
});
test('same user-facing session id does not allow cross-runtime ticket replay', () => {
  const left = started(createResultOwnerSession('same'));
  const right = started(createResultOwnerSession('same'));
  assert.equal(left.ticket.attemptId, right.ticket.attemptId);
  assert.equal(settleAttempt(right.state, left.ticket, { kind: 'success', exactTargetRaw: AFTER, hasUndo: true, authorityReady: true }).accepted, false);
});
test('JSON or spread clones lose private authority and are not accepted as restored sessions', () => {
  const state = saved();
  for (const copied of [JSON.parse(JSON.stringify(state)), { ...state }]) {
    assert.equal(selectResult(copied, facts()).canUndo, false);
    assert.equal(beginAttempt(copied, intent(), facts()).ok, false);
  }
  assert.equal(selectResult(createResultOwnerSession(state.sessionId), facts()).result, null);
});
test('dismissal is UI-only, retains owner data, and does not affect a new owner', () => {
  const state = saved();
  const id = ownerId(state);
  assert.equal(dismissResult(state, 'foreign'), state);
  const dismissed = dismissResult(state, id);
  assert.equal(dismissed.lastSuccess, state.lastSuccess);
  assert.equal(selectResult(dismissed, facts()).result, null);
  const begun = started(state, intent({ summary: '다음 이동' }), facts());
  assert.equal(dismissResult(begun.state, id), begun.state);
});
test('same title with distinct canonical refs stays distinct; duplicate or absent refs are rejected', () => {
  const a = saved(intent({ refs: ['saved-item:copy-a:flow:item'] }));
  const b = saved(intent({ refs: ['saved-item:copy-b:flow:item'] }));
  assert.notDeepEqual(a.lastSuccess?.refs, b.lastSuccess?.refs);
  for (const refs of [[], ['same', 'same'], ['']]) {
    assert.equal(beginAttempt(createResultOwnerSession('bad'), intent({ refs }), facts()).ok, false);
  }
});
test('malformed operation/context/facts are fail-closed without mutating input', () => {
  const state = createResultOwnerSession('bad');
  for (const input of [intent({ operation: 'reset' as never }), intent({ context: { kind: 'unknown' as never, key: 'x' } }), intent({ summary: '' })]) {
    assert.equal(beginAttempt(state, input, facts()).ok, false);
  }
  assert.equal(beginAttempt(state, intent(), facts({ receiptOwnerId: '' })).ok, false);
  assert.equal(selectResult(state, { ...facts(), authorityReady: 'true' } as never).canUndo, false);
});
test('unverified or unchanged raw cannot manufacture a success', () => {
  for (const extra of [{ exactTargetRaw: BEFORE }, { authorityReady: false }, { exactTargetRaw: null }, { hasUndo: undefined }]) {
    const begun = started();
    const outcome = { kind: 'success', exactTargetRaw: AFTER, hasUndo: true, authorityReady: true, ...extra } as ResultOutcome;
    const next = settleAttempt(begun.state, begun.ticket, outcome);
    assert.equal(next.accepted, false);
    assert.equal(next.state.lastSuccess, null);
    assert.equal(next.state.activeAttempt, null);
  }
});
test('contextual Undo is synchronously claimed once and only for the exact owner', () => {
  const state = saved(), id = ownerId(state);
  assert.equal(beginContextualUndo(state, 'other-owner', facts()).ok, false);
  const begun = beginContextualUndo(state, id, facts());
  assert.equal(begun.ok, true);
  if (!begun.ok) return;
  assert.equal(beginContextualUndo(begun.state, id, facts()).ok, false);
  assert.equal(beginAttempt(begun.state, intent(), facts()).ok, false);
  assert.equal(selectResult(begun.state, facts()).announcementOwner, 'pending');
  assert.equal(settleAttempt(begun.state, begun.ticket, { kind: 'success', exactTargetRaw: BEFORE, hasUndo: false, authorityReady: true }).accepted, false);
});
test('Undo success consumes contextual Undo and reverses resolved changes without copying snapshot', () => {
  const state = saved(), id = ownerId(state);
  const begun = beginContextualUndo(state, id, facts());
  assert.equal(begun.ok, true);
  if (!begun.ok) return;
  const done = settleUndo(begun.state, begun.ticket, { kind: 'success', exactTargetRaw: BEFORE, hasUndo: false, authorityReady: true });
  assert.equal(done.accepted, true);
  const selected = selectResult(done.state, facts({ exactTargetRaw: BEFORE, hasUndo: false }));
  assert.equal(selected.result?.status, 'undone');
  assert.equal(selected.canUndo, false);
  assert.deepEqual(selected.result?.changes, [{ label: '실행 날짜', before: '2026-09-06', after: '2026-09-05' }]);
  assert.equal(settleUndo(done.state, begun.ticket, { kind: 'success', exactTargetRaw: BEFORE, hasUndo: false, authorityReady: true }).accepted, false);
});
test('Undo failure preserves prior owner data but does not create success or retry another lane', () => {
  const state = saved(), id = ownerId(state);
  const begun = beginContextualUndo(state, id, facts());
  assert.equal(begun.ok, true);
  if (!begun.ok) return;
  const failed = settleUndo(begun.state, begun.ticket, { kind: 'failed' });
  assert.equal(failed.state.lastSuccess, state.lastSuccess);
  assert.equal(selectResult(failed.state, facts()).canUndo, false);
  assert.equal(beginContextualUndo(state, id, facts({ lane: 'source-update' })).ok, false);
});
test('all owned records and nested public display facts are immutable', () => {
  const begun = started();
  const state = saved();
  const selected = selectResult(state, facts());
  for (const value of [begun.state, begun.ticket, state, state.lastSuccess, selected, selected.result,
    selected.result?.refs, selected.result?.changes, selected.result?.changes[0], selected.result?.context]) {
    assert.equal(Object.isFrozen(value), true);
  }
});
