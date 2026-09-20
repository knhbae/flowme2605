'use strict';

// Preparation/characterization of current contracts. GATE diagnostics explicitly
// identify unimplemented B1 requirements; a green test is not B1 completion.
const test = require('node:test');
const assert = require('node:assert/strict');
const { M, C, E0, E, NOW, META, clone, own, legacyFixture, currentPlanDraft, planCandidate, submission, memoryStore, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const D = require('./workspace-permanent-delete.js');
const task = (state, id) => state.tasks.find(value => value.id === id);
const mutations = store => store.calls.filter(call => call[0] !== 'getItem');

test('G01 real legacy projection preserves exact base bytes and every current/undo archive JSON value', () => {
  const f = legacyFixture();
  assert.equal(C.validateCheckpoint(f.checkpoint).ok, true);
  assert.equal(f.checkpoint.legacyBaseRaw, f.raw);
  assert.deepEqual(f.checkpoint.state.timelineContextV1.legacySnapshot, f.state);
  assert.deepEqual(f.checkpoint.undo.timelineContextV1.legacySnapshot, f.undo);
  assert.deepEqual(f.checkpoint.state.legacyUnknown, f.state.legacyUnknown);
  assert.deepEqual(task(f.checkpoint.state, 'quote').legacyUnknown, task(f.state, 'quote').legacyUnknown);
  assert.equal(own(f.checkpoint.state.orders, 'today'), false);
  assert.deepEqual(f.checkpoint.state.timelineContextV1.legacySnapshot.orders.today, f.state.orders.today);
});

test('G02 reading preserves planDate absence, equal-date presence and null as distinct stored facts', () => {
  const f = legacyFixture();
  const before = JSON.stringify(f.checkpoint);
  for (const view of ['today', 'week', 'month', 'undated']) assert.equal(C.projectGroups(f.checkpoint, view, '2026-09-05').ok, true);
  assert.equal(own(task(f.checkpoint.state, 'quote'), 'planDate'), false);
  assert.equal(task(f.checkpoint.state, 'contract').planDate, '2026-09-03');
  assert.equal(task(f.checkpoint.state, 'photo-check').planDate, null);
  assert.equal(JSON.stringify(f.checkpoint), before);
});

test('G03 old title-only Plan commit materializes untouched dates; a new lossless path must not reuse it blindly', context => {
  const f = legacyFixture();
  const draft = currentPlanDraft(f.checkpoint.state);
  const next = planCandidate(f.checkpoint, { ...draft, title: draft.title + ' 변경' });
  assert.equal(own(task(f.checkpoint.state, 'quote'), 'planDate'), false);
  assert.equal(own(task(next.state, 'quote'), 'planDate'), true);
  assert.equal(task(next.state, 'quote').planDate, null);
  assert.deepEqual(next.undo, f.checkpoint.state);
  context.diagnostic('GATE: old commit-personal-plan materializes untouched nullable fields; B1 delta/overlay path is not implemented.');
});

test('G04 ordinary completion and single Undo retain unknown values and both archived baselines', () => {
  const f = legacyFixture();
  const before = JSON.stringify(f.checkpoint);
  const changed = C.transitionCheckpoint(f.checkpoint, { type: 'complete', id: 'quote', done: true, now: NOW });
  assert.equal(changed.changed, true);
  assert.deepEqual(changed.checkpoint.undo, f.checkpoint.state);
  assert.deepEqual(changed.checkpoint.state.legacyUnknown, f.checkpoint.state.legacyUnknown);
  assert.deepEqual(changed.checkpoint.state.timelineContextV1, f.checkpoint.state.timelineContextV1);
  const undone = C.undoCheckpoint(changed.checkpoint);
  assert.equal(undone.changed, true);
  assert.deepEqual(undone.checkpoint.state, { ...f.checkpoint.state, updatedAt: M.TODAY + 'T12:00:00.000Z' });
  assert.equal(undone.checkpoint.legacyBaseRaw, f.raw);
  assert.equal(undone.checkpoint.undo, null);
  assert.equal(JSON.stringify(f.checkpoint), before);
});

test('G05 equal source/execution dates do not prove inheritance and Plan commit preserves execution bytes', () => {
  const f = legacyFixture();
  const before = clone(task(f.checkpoint.state, 'contract'));
  assert.equal(before.date, before.sourceDate);
  const draft = currentPlanDraft(f.checkpoint.state);
  draft.items.find(item => item.id === 'contract').planDate = '2026-09-09';
  const next = planCandidate(f.checkpoint, draft);
  const after = task(next.state, 'contract');
  assert.equal(after.planDate, '2026-09-09');
  for (const key of ['date', 'sourceDate', 'time', 'done', 'completedAt']) assert.deepEqual(after[key], before[key]);
  assert.equal(own(after, 'scheduleMode'), false);
});

test('G06 old decoder accepts an invalid non-repeating planDate as unknown metadata; new adapter needs strict validation', context => {
  const f = legacyFixture();
  task(f.checkpoint.state, 'quote').planDate = 'not-a-date';
  assert.deepEqual(M.validate(f.checkpoint.state), []);
  assert.equal(C.validateCheckpoint(f.checkpoint).ok, true);
  context.diagnostic('GATE: accepted legacy unknown planDate is not evidence of a valid new schedule contract. Do not guess or silently normalize it.');
});

test('G07 candidate reserved metadata is currently opaque to M/C and cannot be adopted as validated B1 data', context => {
  const f = legacyFixture();
  f.checkpoint.state[META] = { version: 999, overlays: { foreign: { schedule: { mode: 'invented' } } } };
  assert.equal(C.validateCheckpoint(f.checkpoint).ok, true);
  const result = C.transitionCheckpoint(f.checkpoint, { type: 'complete', id: 'quote', done: true, now: NOW });
  assert.equal(result.changed, true);
  assert.deepEqual(result.checkpoint.state[META], f.checkpoint.state[META]);
  context.diagnostic('GATE: reserved collision/version/foreign-ref rejection must be added before opting into the new adapter; unknown preservation alone is not that gate.');
});

test('G08 existing child copy preserves parent neighbors but drops a new child mode extension', context => {
  const draft = currentPlanDraft(legacyFixture().checkpoint.state);
  draft.items[0].schedule = { mode: 'inherit' };
  draft.items[1].neighborUnknown = { exact: '保持\r\n' };
  const parent = E.createSession({ sessionId: 'b1-parent', kind: 'plan', scopeId: draft.flowId, draft });
  const child = E.createChildSession(parent, { sessionId: 'b1-child', itemId: draft.items[0].id });
  const edited = E.updateDraft(child, { ...child.draft, memo: '새 메모', schedule: { mode: 'unscheduled' } });
  assert.equal(edited.session.valid, true);
  const applied = E.applyChild(parent, edited.session);
  assert.equal(applied.ok, true);
  assert.equal(applied.parent.draft.items[0].memo, '새 메모');
  assert.deepEqual(applied.parent.draft.items[0].schedule, { mode: 'inherit' });
  assert.deepEqual(applied.parent.draft.items[1], draft.items[1]);
  context.diagnostic('GATE: new versioned draft requires a matching child copy/validator/journal decoder, not UI-only fields.');
});

test('G09 unknown new mode does not currently make a legacy draft invalid', context => {
  const draft = currentPlanDraft(legacyFixture().checkpoint.state);
  draft.items[0].schedule = { mode: 'invalid-new-mode', date: '2026-02-30' };
  assert.equal(E.validDraft('plan', draft), true);
  context.diagnostic('GATE: keep old draft compatibility separate from strict new draft validation.');
});

test('G10 missing sourceTitle stays absent on read but old commit captures the current title as source', context => {
  const f = legacyFixture();
  const draft = currentPlanDraft(f.checkpoint.state);
  const oldTitle = task(f.checkpoint.state, 'quote').title;
  assert.equal(own(task(f.checkpoint.state, 'quote'), 'sourceTitle'), false);
  draft.items[0].title = '내 제목 수정';
  const next = planCandidate(f.checkpoint, draft);
  assert.equal(task(next.state, 'quote').sourceTitle, oldTitle);
  assert.equal(task(next.state, 'quote').title, '내 제목 수정');
  context.diagnostic('GATE: B1 must call this an existing stored baseline when source authority is unknown, and must not mutate sourceTitle to manufacture provenance.');
});

test('G11 raw checkpoint period projection follows execution date, not changed personal plan date', () => {
  const f = legacyFixture();
  const draft = currentPlanDraft(f.checkpoint.state);
  draft.items.find(item => item.id === 'contract').planDate = '2026-09-09';
  const next = planCandidate(f.checkpoint, draft);
  const groups = C.projectGroups(next, 'month', '2026-09-05');
  assert.equal(groups.ok, true);
  assert.equal(groups.groups.find(group => group.ids.includes('contract')).contextKey, '2026-09-03');
  assert.equal(task(next.state, 'contract').planDate, '2026-09-09');
});

test('G12 real source candidate composition changes source date/title but preserves known personal/execution values', () => {
  const f = sourceUpdateFixture();
  const storeBefore = JSON.stringify(f.store);
  const effective = M.composeSourceCandidateState(f.state, f.store);
  const item = task(effective, f.task.id);
  assert.equal(item.sourceDate, '2026-09-10');
  assert.equal(item.sourceTitle, '새 접수');
  assert.equal(item.title, '내 접수 제목');
  assert.equal(item.memo, '내 메모\r\n');
  assert.equal(item.planDate, '2026-09-08');
  assert.equal(item.date, '2026-09-07');
  assert.equal(JSON.stringify(f.state), f.before);
  assert.equal(JSON.stringify(f.store), storeBefore);
});

test('G13 actual prepared editor journal recovers exact old workspace and original draft before a new explicit submit', () => {
  const f = legacyFixture();
  const request = submission(f.checkpoint, 'prepared');
  const beforeRaw = JSON.stringify(f.checkpoint);
  let armed = true;
  const store = memoryStore(f.checkpoint, {
    beforeSet(key, raw) { if (armed && key === E.STORAGE_KEY && raw === beforeRaw) throw new Error('rollback-fault'); },
    afterSet(key) { if (armed && key === E.STORAGE_KEY) throw new Error('after-target-fault'); },
  });
  const result = E.writeDurableAttempt(store, request.session, request.attempt);
  assert.equal(result.status, 'recovery-required');
  assert.equal(store.map.get(E.STORAGE_KEY), request.attempt.candidateRaw);
  const checkpointCalls = store.calls.length;
  const loaded = E.loadRecovery(store);
  assert.equal(loaded.status, 'prepared');
  assert.equal(store.calls.slice(checkpointCalls).filter(call => call[0] !== 'getItem').length, 0);
  assert.deepEqual(loaded.journal.draft, request.session.draft);
  armed = false;
  const recovered = E.recoverDurableAttempt(store, { expectedJournalRaw: loaded.journalRaw });
  assert.equal(recovered.ok, true);
  assert.equal(store.map.get(E.STORAGE_KEY), beforeRaw);
  assert.equal(store.map.get(M.STORAGE_KEY), f.raw);
  const resumed = E.resumeRecoveredSession(recovered, { sessionId: 'b1-resumed', storage: store });
  assert.deepEqual(resumed.draft, request.session.draft);
  assert.equal(resumed.status, 'dirty-valid');
  assert.equal(resumed.attempt, null);
  assert.equal(store.map.get('flow:operating:sentinel'), '  immutable\r\n한글  ');
  assert.ok(mutations(store).every(call => [E.STORAGE_KEY, E.RECOVERY_KEY].includes(call[1])));
});

test('G14 confirmed cleanup is not target rollback and adds zero target writes', () => {
  const f = legacyFixture();
  const request = submission(f.checkpoint, 'confirmed');
  const store = memoryStore(f.checkpoint);
  const result = E.writeDurableAttempt(store, request.session, request.attempt);
  assert.equal(result.status, 'committed');
  const loaded = E.loadRecovery(store);
  assert.equal(loaded.status, 'confirmed');
  const before = mutations(store).filter(call => call[1] === E.STORAGE_KEY).length;
  const cleared = E.clearConfirmedRecovery(store, { expectedJournalRaw: loaded.journalRaw });
  assert.equal(cleared.ok, true);
  assert.equal(mutations(store).filter(call => call[1] === E.STORAGE_KEY).length, before);
  assert.equal(store.map.get(E.STORAGE_KEY), request.attempt.candidateRaw);
  assert.equal(store.map.has(E.RECOVERY_KEY), false);
});

test('G15 unresolved old editor journal blocks a new v2 editor save with zero mutations', () => {
  const f = legacyFixture();
  const request = submission(f.checkpoint, 'old-owner');
  const store = memoryStore(f.checkpoint);
  store.map.set(E0.RECOVERY_KEY, 'old unresolved bytes');
  const result = E.writeDurableAttempt(store, request.session, request.attempt);
  assert.equal(result.changed, false);
  assert.equal(result.canResume, false);
  assert.equal(mutations(store).length, 0);
  assert.equal(store.map.get(E0.RECOVERY_KEY), 'old unresolved bytes');
});

test('G16 legacy action rejects a mode object rather than silently storing it as a string title', () => {
  const f = legacyFixture();
  const before = JSON.stringify(f.checkpoint);
  const draft = currentPlanDraft(f.checkpoint.state);
  const result = C.transitionCheckpoint(f.checkpoint, { type: 'commit-personal-plan', ...draft, title: { mode: 'inherit' }, now: NOW });
  assert.equal(result.changed, false);
  assert.equal(result.reason, 'invalid-plan-title');
  assert.equal(JSON.stringify(f.checkpoint), before);
});

test('G17 clean legacy session stays unchanged without creating any candidate or attempt', () => {
  const draft = currentPlanDraft(legacyFixture().checkpoint.state);
  const session = E.createSession({ sessionId: 'b1-clean', kind: 'plan', scopeId: draft.flowId, draft });
  const result = E.beginSave(session, {});
  assert.equal(result.error, 'unchanged-editor-draft');
  assert.equal(result.session, session);
  assert.equal(result.session.attempt, null);
});

test('G18 a proposed extra state field currently blocks permanent deletion instead of leaking retained private data', context => {
  const checkpoint = C.fromLegacy(null).checkpoint;
  checkpoint.state[META] = { version: 1, overlays: {} };
  const trashed = C.transitionCheckpoint(checkpoint, { type: 'move-to-trash', kind: 'flow', id: 'moving', now: NOW });
  assert.equal(trashed.changed, true);
  const flow = trashed.checkpoint.state.flows.find(value => value.id === 'moving');
  const result = D.planPermanentDelete({ checkpoint: trashed.checkpoint, target: { kind: 'flow', id: flow.id, savedCopyId: flow.savedCopyId, sourceFlowId: flow.sourceFlowId, ref: flow.ref }, confirmed: true, expectedRevision: trashed.checkpoint.state.revision, sourceCandidateRaw: null, now: NOW });
  assert.equal(result.reason, 'delete-scope-unproven');
  assert.equal(result.changed, false);
  assert.deepEqual(result.writes, []);
  context.diagnostic('GATE: optional Plan metadata requires exact owner-aware deletion planning before UI adoption; keep this fail-closed until then.');
});
