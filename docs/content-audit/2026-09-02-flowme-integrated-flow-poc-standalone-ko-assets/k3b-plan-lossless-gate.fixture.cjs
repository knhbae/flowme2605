'use strict';

// Test fixtures only. This is not the proposed B1 adapter or a product decoder.
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const E0 = require('./plan-item-session.js');
const E = E0.createForWorkspace('checkpoint-v2');
const NOW = '2026-09-05T09:00:00.000Z';
const META = 'personalPlanContextV1'; // Candidate reserved name, not an active product contract.
const clone = value => JSON.parse(JSON.stringify(value));
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function legacyFixture() {
  const state = M.seedState();
  state.legacyUnknown = { text: '  기존 값\r\n\t유지  ', values: [null, false, 0, { b: 2, a: 1 }] };
  const absent = state.tasks.find(task => task.id === 'quote');
  delete absent.sourceTitle;
  absent.legacyUnknown = { titleOwner: 'unknown', order: ['b', 'a'] };
  const fixed = state.tasks.find(task => task.id === 'contract');
  fixed.planDate = fixed.sourceDate;
  const undated = state.tasks.find(task => task.id === 'photo-check');
  undated.planDate = null;
  delete state.flows.find(flow => flow.id === 'moving').sourceTitle;
  state.orders.today = M.viewTaskIds(state, 'today').slice().reverse();
  const undo = clone(state);
  undo.legacyUnknown.text = '이전 성공 상태\r\n';
  undo.tasks.find(task => task.id === 'contract').planDate = null;
  const raw = ' \r\n' + JSON.stringify({ version: 1, state, undo }, null, 2) + '\r\n ';
  const result = C.fromLegacy(raw);
  if (!result.ok) throw new Error('invalid-test-fixture:' + result.reason);
  return { raw, state, undo, checkpoint: result.checkpoint };
}

function currentPlanDraft(state, flowId = 'moving') {
  const flow = state.flows.find(entry => entry.id === flowId);
  return { flowId, title: flow.title, items: flow.steps.flatMap(step => step.itemIds).map(id => {
    const task = state.tasks.find(entry => entry.id === id);
    const planDate = own(task, 'planDate') ? task.planDate : task.sourceDate === undefined ? task.date : task.sourceDate;
    return { id, title: task.title, memo: typeof task.memo === 'string' ? task.memo : '', planDate: planDate || null };
  }) };
}

function planCandidate(checkpoint, draft) {
  const result = C.transitionCheckpoint(checkpoint, { type: 'commit-personal-plan', ...draft, now: NOW });
  if (!result.ok || !result.changed) throw new Error('invalid-test-plan-candidate:' + (result.reason || result.message));
  return result.checkpoint;
}

function submission(checkpoint, suffix = 'fixture') {
  const draft = currentPlanDraft(checkpoint.state);
  let session = E.createSession({ sessionId: 'b1-session-' + suffix, kind: 'plan', scopeId: draft.flowId, draft });
  const changed = { ...draft, title: draft.title + ' 개인 변경' };
  session = E.updateDraft(session, changed).session;
  const candidate = planCandidate(checkpoint, changed);
  const result = E.beginSave(session, { attemptId: 'b1-attempt-' + suffix, expectedRaw: JSON.stringify(checkpoint), candidate });
  if (!result.ok) throw new Error('invalid-test-submission:' + result.error);
  return result;
}

function memoryStore(checkpoint, hooks = {}) {
  const map = new Map([
    [M.STORAGE_KEY, checkpoint.legacyBaseRaw],
    [C.STORAGE_KEY, JSON.stringify(checkpoint)],
    ['flow:operating:sentinel', '  immutable\r\n한글  '],
  ]);
  const calls = [];
  return { map, calls,
    getItem(key) { calls.push(['getItem', key]); return map.has(key) ? map.get(key) : null; },
    setItem(key, raw) {
      calls.push(['setItem', key, raw]);
      if (hooks.beforeSet) hooks.beforeSet(key, raw, map);
      map.set(key, raw);
      if (hooks.afterSet) hooks.afterSet(key, raw, map);
    },
    removeItem(key) { calls.push(['removeItem', key]); map.delete(key); },
    clear() { calls.push(['clear']); throw new Error('forbidden-clear'); },
  };
}

function sourceUpdateFixture() {
  const rawText = '# 원문 제목\n## 준비\n- [ ] 접수\n  - 날짜: 2026-09-05\n  - 설명: 원문 설명';
  const handoff = M.makeHandoff(rawText, { draftId: 'b1-draft', handoffId: 'b1-handoff', sourceConfirmed: true, folderId: null });
  const result = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  if (!result.changed) throw new Error('invalid-authored-test-fixture:' + result.error);
  const state = result.state;
  const flow = state.flows.find(entry => entry.handoffId === handoff.handoffId);
  const task = state.tasks.find(entry => entry.flowId === flow.id);
  task.title = '내 접수 제목';
  task.memo = '내 메모\r\n';
  task.planDate = '2026-09-08';
  task.date = '2026-09-07';
  const before = JSON.stringify(state);
  const prepared = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), state, flow.id, {
    now: NOW, createdAt: NOW, incomingRawText: rawText.replace('원문 제목', '새 원문 제목').replace('접수', '새 접수').replace('2026-09-05', '2026-09-10'),
  });
  if (!prepared.ok) throw new Error('invalid-source-update-fixture:' + prepared.reason);
  let store = prepared.store;
  for (const change of prepared.candidate.changes) {
    const resolved = M.resolveLocalSourceCandidateChange(store, { candidateId: prepared.candidate.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW });
    if (!resolved.changed) throw new Error('invalid-source-resolution:' + resolved.code);
    store = resolved.store;
  }
  const applied = M.applyLocalSourceCandidate(store, state, flow.id, prepared.candidate.candidateId, NOW);
  if (!applied.changed) throw new Error('invalid-source-apply:' + applied.code);
  return { state, flow, task, before, store: applied.store };
}

module.exports = { M, C, E0, E, NOW, META, clone, own, legacyFixture, currentPlanDraft, planCandidate, submission, memoryStore, sourceUpdateFixture };
