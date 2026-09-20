const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('./model.js');
const singleFile = require('./build-single-file.cjs');
const losslessRuntimeAdapter = require('./lossless-authoring-runtime.cjs');
const losslessRuntime = losslessRuntimeAdapter.loadCommonJs();
const validationExamplesRuntimeAdapter = require('./validation-examples-runtime.cjs');
const validationExamplesRuntime = validationExamplesRuntimeAdapter.loadCommonJs();
const structureTemplateRuntimeAdapter = require('./structure-template-runtime.cjs');
const structureTemplateRuntime = structureTemplateRuntimeAdapter.loadCommonJs();
const sourceUpdateRuntimeAdapter = require('./source-update-runtime.cjs');
const sourceUpdateRuntime = sourceUpdateRuntimeAdapter.loadCommonJs();

const here = __dirname;
const htmlPath = path.join(here, '..', '2026-09-02-flowme-integrated-flow-poc-standalone-ko.html');
const androidHtmlPath = path.join(here, '..', '2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html');
const modelPath = path.join(here, 'model.js');
const appPath = path.join(here, 'app.js');
const stylePath = path.join(here, 'style.css');
const shellPath = path.join(here, 'standalone-shell.html');
const stateTask = (state, id) => state.tasks.find(entry => entry.id === id);
const stateFlow = (state, id) => state.flows.find(entry => entry.id === id);

function k1aCandidateFixture() {
  const storage = M.createMemoryStorage({ 'flow:saved:plans': '  exact operating bytes\n' });
  const before = { draftId: 'k1a-draft', rawText: '# Before\n## Step\n- [ ] Item', templateId: null, folderId: null };
  M.writeAuthoringDraft(storage, before);
  const bytes = storage.getItem(M.DRAFT_STORAGE_KEY);
  storage.calls.length = 0;
  return { storage, bytes, candidate: { ...before, rawText: before.rawText + '\n  - 장소: 서울역' } };
}

test('K1-A helper candidate persists once and verifies exact bytes without operating writes', () => {
  const { storage, bytes, candidate } = k1aCandidateFixture();
  const result = M.writeAuthoringDraftCandidate(storage, candidate, bytes);
  assert.equal(result.status, 'success');
  assert.equal(result.targetWriteCount, 1);
  assert.equal(storage.getItem(M.DRAFT_STORAGE_KEY), result.candidateBytes);
  assert.equal(JSON.parse(result.candidateBytes).rawText, candidate.rawText);
  assert.deepEqual(storage.calls.filter(call => call[0] === 'setItem').map(call => call[1]), [M.DRAFT_STORAGE_KEY]);
  assert.equal(storage.snapshot()['flow:saved:plans'], '  exact operating bytes\n');
});

test('K1-A helper candidate read failure performs zero write', () => {
  const { storage, bytes, candidate } = k1aCandidateFixture();
  const result = M.writeAuthoringDraftCandidate({ ...storage, getItem() { throw new Error('read'); } }, candidate, bytes);
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'draft-read-failed');
  assert.equal(storage.calls.length, 0);
});

test('K1-A helper candidate rejects foreign bytes with zero mutation', () => {
  const { storage, bytes, candidate } = k1aCandidateFixture();
  const result = M.writeAuthoringDraftCandidate(storage, candidate, bytes + ' ');
  assert.equal(result.status, 'stale');
  assert.equal(storage.calls.filter(call => call[0] === 'setItem' || call[0] === 'removeItem').length, 0);
  assert.equal(storage.getItem(M.DRAFT_STORAGE_KEY), bytes);
});

test('K1-A quota failure with unchanged bytes avoids unnecessary rollback writes and retries', () => {
  const { storage, bytes, candidate } = k1aCandidateFixture();
  let attempts = 0;
  const failed = M.writeAuthoringDraftCandidate({ ...storage, setItem() { attempts += 1; throw new Error('quota'); } }, candidate, bytes);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.rollback.rollbackWriteCount, 0);
  assert.equal(attempts, 1);
  assert.equal(storage.getItem(M.DRAFT_STORAGE_KEY), bytes);
  assert.equal(M.writeAuthoringDraftCandidate(storage, candidate, bytes).status, 'success');
});

test('K1-A readback throw restores exact prior bytes and verifies rollback', () => {
  const { storage, bytes, candidate } = k1aCandidateFixture();
  let reads = 0;
  const guarded = { ...storage, getItem(key) { reads += 1; if (reads === 2) throw new Error('readback'); return storage.getItem(key); } };
  const result = M.writeAuthoringDraftCandidate(guarded, candidate, bytes);
  assert.equal(result.status, 'failed');
  assert.equal(result.rollback.status, 'restored');
  assert.equal(result.rollback.rollbackWriteCount, 1);
  assert.equal(storage.getItem(M.DRAFT_STORAGE_KEY), bytes);
});

test('K1-A readback mismatch restores candidate only and never overwrites foreign bytes', () => {
  const { storage, bytes, candidate } = k1aCandidateFixture();
  let reads = 0;
  const result = M.writeAuthoringDraftCandidate({ ...storage, getItem(key) { reads += 1; return reads === 2 ? 'mismatched read' : storage.getItem(key); } }, candidate, bytes);
  assert.equal(result.status, 'failed');
  assert.equal(storage.getItem(M.DRAFT_STORAGE_KEY), bytes);
  const foreign = M.restoreAuthoringDraftCandidate(storage, 'older bytes', 'different candidate');
  assert.equal(foreign.status, 'recovery-required');
  assert.equal(foreign.reason, 'draft-changed');
  assert.equal(storage.getItem(M.DRAFT_STORAGE_KEY), bytes);
});

test('K1-A native failure rollback removes only the exact newly created draft', () => {
  const storage = M.createMemoryStorage({ 'flow:saved:plans': 'untouched' });
  const result = M.writeAuthoringDraftCandidate(storage, { draftId: 'new', rawText: '# New', templateId: null, folderId: null }, null);
  assert.equal(result.status, 'success');
  assert.equal(M.restoreAuthoringDraftCandidate(storage, null, result.candidateBytes).status, 'restored');
  assert.deepEqual(storage.snapshot(), { 'flow:saved:plans': 'untouched' });
  assert.deepEqual(storage.calls.filter(call => call[0] === 'removeItem').map(call => call[1]), [M.DRAFT_STORAGE_KEY]);
});

test('K1-A rollback write failure requires recovery and preserves verifiable candidate', () => {
  const { storage, bytes, candidate } = k1aCandidateFixture();
  const saved = M.writeAuthoringDraftCandidate(storage, candidate, bytes);
  const result = M.restoreAuthoringDraftCandidate({ ...storage, setItem() { throw new Error('rollback'); } }, bytes, saved.candidateBytes);
  assert.equal(result.status, 'recovery-required');
  assert.equal(storage.getItem(M.DRAFT_STORAGE_KEY), saved.candidateBytes);
});

test('K1-A rollback readback mismatch never reports successful recovery', () => {
  const { storage, bytes, candidate } = k1aCandidateFixture();
  const saved = M.writeAuthoringDraftCandidate(storage, candidate, bytes);
  let reads = 0;
  const result = M.restoreAuthoringDraftCandidate({ ...storage, getItem(key) { reads += 1; return reads === 2 ? 'uncertain' : storage.getItem(key); } }, bytes, saved.candidateBytes);
  assert.equal(result.status, 'recovery-required');
  assert.equal(result.reason, 'rollback-readback');
});

test('K1-A repeated identical candidate is a durable no-write success', () => {
  const { storage, bytes, candidate } = k1aCandidateFixture();
  const saved = M.writeAuthoringDraftCandidate(storage, candidate, bytes);
  storage.calls.length = 0;
  const same = M.writeAuthoringDraftCandidate(storage, candidate, saved.candidateBytes);
  assert.equal(same.status, 'success');
  assert.equal(same.targetWriteCount, 0);
  assert.equal(storage.calls.some(call => ['setItem', 'removeItem', 'clear'].includes(call[0])), false);
});

function validSource() {
  return '# 이사 전 준비\n- 기준일: 2026-09-20\n\n일반 메모는 원문에만 남습니다.\n\n## 계약\n- [ ] 견적 비교\n  - 상대 날짜: D-14\n  - 자료: https://example.com/quote\n\n## 입주\n- [ ] 열쇠 받기\n  - 날짜: 2026-09-20\n  - 시간: 10:30\n  - 시간대: Asia/Seoul';
}

function recurringSource(recurrence, recurrenceEnd) {
  return '# 아침 루틴\n\n이 문장은 Item이 아닌 원문 메모입니다.\n\n## 준비\n- [ ] 물 마시기\n  - 설명: 천천히 한 잔을 마십니다\n  - 메모: 250ml\n  - 날짜: 2026-09-02\n  - 시간: 07:30\n  - 시간대: Asia/Seoul\n  - 장소: 주방\n  - 소요 시간: 10\n  - 반복: ' + recurrence + '\n' + (recurrenceEnd ? '  - 반복 종료: ' + recurrenceEnd + '\n' : '') + '  - 실행 조건: 아침 식사 전\n  - 완료 기준: 빈 컵을 씻기\n  - [ ] 컵 씻기\n  - 자료: https://example.com/water\n  - 출처: https://example.com/source\n  - 주의: 너무 빠르게 마시지 않기';
}

function k2aHandoff(rawText, suffix = 'one') {
  return M.makeHandoff(rawText, { draftId: 'k2a-draft-' + suffix, handoffId: 'k2a-handoff-' + suffix, sourceConfirmed: true, folderId: null });
}

function k2aCommit(rawText, suffix = 'one', before = M.initialEnvelope()) {
  const result = M.transitionEnvelope(before, { type: 'commit-authoring', handoff: k2aHandoff(rawText, suffix) });
  assert.equal(result.changed, true, result.error || result.message);
  const flow = stateFlow(result.envelope.state, result.envelope.state.lastReceipt.flowId);
  const tasks = result.envelope.state.tasks.filter(task => task.flowId === flow.id);
  return { envelope: result.envelope, flow, tasks };
}

for (const mark of ['x', 'X', ' ']) {
  test('K2-A new handoff keeps raw ' + JSON.stringify(mark) + ' and source checks but starts personal execution open', () => {
    const rawText = ['# 체크 원문 🙂', '## 준비', '- [' + mark + '] 같은 제목', '  - 날짜: 2026-09-02', '  - [x] 원문 확인 완료', '  - [ ] 원문 확인 미완료', '- [ ] 같은 제목', '## 다음', '- [X] 같은 제목', ''].join('\r\n');
    const handoff = k2aHandoff(rawText, 'raw-' + mark.charCodeAt(0));
    const beforeHandoff = JSON.stringify(handoff);
    const parsed = M.parseSource(rawText);
    const parsedItems = parsed.steps.flatMap(step => step.items);
    assert.equal(parsedItems[0].checkedInSource, mark.toLowerCase() === 'x');
    assert.deepEqual(parsedItems[0].subchecks.map(check => check.sourceChecked), [true, false]);
    const committed = M.transitionEnvelope(M.initialEnvelope(), { type: 'commit-authoring', handoff });
    assert.equal(committed.changed, true);
    const envelope = committed.envelope;
    const flow = stateFlow(envelope.state, envelope.state.lastReceipt.flowId);
    const tasks = envelope.state.tasks.filter(task => task.flowId === flow.id);
    assert.equal(flow.rawText, rawText);
    assert.equal(flow.sourceFingerprint, M.fingerprint(rawText));
    assert.deepEqual(tasks.map(task => task.done), [false, false, false]);
    assert.deepEqual(tasks.map(task => task.completedAt), [null, null, null]);
    assert.deepEqual(tasks.map(task => task.sourceLine), parsedItems.map(item => item.sourceLine));
    assert.deepEqual(tasks[0].sourceSubchecks, parsedItems[0].subchecks);
    assert.equal(new Set(tasks.map(task => task.id)).size, 3);
    assert.equal(new Set(tasks.map(task => task.ref)).size, 3);
    assert.equal(JSON.stringify(handoff), beforeHandoff);
    assert.deepEqual(M.validate(envelope.state), []);
  });
}

function confirmedHandoff(overrides) {
  return M.makeHandoff(validSource(), Object.assign({
    draftId: 'draft-a',
    handoffId: 'handoff-a',
    sourceConfirmed: true,
    folderId: 'move'
  }, overrides));
}

test('K2-A new execution defaults are a versioned PoC constant, not a persisted schema change', () => {
  assert.deepEqual(M.AUTHORING_HANDOFF_EXECUTION_DEFAULTS, { contractVersion: 1, done: false, completedAt: null });
  assert.equal(Object.isFrozen(M.AUTHORING_HANDOFF_EXECUTION_DEFAULTS), true);
  const { envelope, tasks } = k2aCommit('# 확인\n## 준비\n- [x] 원문 확인');
  assert.equal(envelope.version, 1);
  assert.equal(envelope.state.version, 1);
  assert.equal(tasks[0].checkedInSource, undefined);
  assert.equal(tasks[0].executionDefaultsVersion, undefined);
});

test('K2-A authoring preview keeps source checks while personal result slots start open', () => {
  const rawText = '# 체크 분리\n## 준비\n- [x] 주 Item\n  - 날짜: 2026-09-02\n  - [X] 원문 하위 확인\n  - [ ] 원문 하위 미확인';
  const preview = M.authoringResultProjection(rawText);
  assert.equal(preview.items[0].completed, true);
  assert.equal(preview.items[0].completedAt, null);
  const { envelope, flow } = k2aCommit(rawText);
  const before = JSON.stringify(envelope);
  const result = M.resultProjection(envelope.state, flow.id);
  assert.equal(result.workingSource.rawText, rawText);
  assert.equal(result.items[0].completed, false);
  assert.equal(result.items[0].completedAt, null);
  assert.equal(result.sheet[0].statusCode, 'open');
  assert.equal(result.sheet[0].completedAt, null);
  assert.deepEqual(result.items[0].subchecks.map(check => check.sourceChecked), [true, false]);
  for (const slot of ['txt', 'todo', 'calendar', 'sheet']) assert.deepEqual(result.slots[slot].itemRefs, result.itemRefs);
  assert.match(result.txt, /☐ 주 Item/u);
  assert.match(result.txt, /☑ 원문 하위 확인/u);
  assert.equal(JSON.stringify(envelope), before, 'read-only result projection');
});

test('K2-A personal complete reopen Undo and reload preserve checked raw and other identical Items', () => {
  const rawText = '# 완료 소유\n## 준비\n- [x] 같은 제목\n  - 날짜: 2026-09-02\n- [X] 같은 제목';
  const { envelope, flow, tasks } = k2aCommit(rawText);
  const completedAt = '2026-09-05T04:00:00.000Z';
  const complete = M.transitionEnvelope(envelope, { type: 'complete', id: tasks[0].id, done: true, completedAt });
  assert.equal(complete.changed, true);
  assert.equal(stateTask(complete.envelope.state, tasks[0].id).completedAt, completedAt);
  assert.equal(stateTask(complete.envelope.state, tasks[1].id).done, false);
  assert.equal(stateFlow(complete.envelope.state, flow.id).rawText, rawText);
  assert.equal(stateTask(M.undoEnvelope(complete.envelope).envelope.state, tasks[0].id).done, false);
  const reopen = M.transitionEnvelope(complete.envelope, { type: 'complete', id: tasks[0].id, done: false });
  assert.equal(stateTask(reopen.envelope.state, tasks[0].id).done, false);
  assert.equal(stateTask(reopen.envelope.state, tasks[0].id).completedAt, null);
  assert.equal(M.resultProjection(reopen.envelope.state, flow.id).items[0].completed, false);
  const undoReopen = M.undoEnvelope(reopen.envelope);
  assert.equal(stateTask(undoReopen.envelope.state, tasks[0].id).done, true);
  assert.equal(stateTask(undoReopen.envelope.state, tasks[0].id).completedAt, completedAt);
  const storage = M.createMemoryStorage({ 'flow:k2a:sentinel': '  legacy\r\n한글 🙂  ' });
  M.writeEnvelope(storage, undoReopen.envelope);
  const loaded = M.loadEnvelope(storage);
  assert.equal(loaded.status, 'restored');
  assert.equal(stateTask(loaded.envelope.state, tasks[0].id).done, true);
  assert.equal(stateTask(loaded.envelope.state, tasks[0].id).completedAt, completedAt);
  assert.equal(stateFlow(loaded.envelope.state, flow.id).rawText, rawText);
  assert.equal(storage.snapshot()['flow:k2a:sentinel'], '  legacy\r\n한글 🙂  ');
  assert.equal(storage.calls.filter(call => ['setItem', 'removeItem', 'clear'].includes(call[0])).every(call => call[0] !== 'clear' && call[1].startsWith('flow:poc:personal-workspace:v1:')), true);
});

test('K2-A legacy true with null or timestamp and false load without migration or writes', () => {
  for (const [done, completedAt] of [[true, null], [true, '2026-09-01T00:00:00.000Z'], [false, null]]) {
    const envelope = M.initialEnvelope();
    Object.assign(stateTask(envelope.state, 'quote'), { done, completedAt });
    envelope.undo = structuredClone(envelope.state);
    const bytes = JSON.stringify(envelope, null, 2) + '\n';
    const storage = M.createMemoryStorage({ [M.STORAGE_KEY]: bytes, 'flow:k2a:sentinel': 'UNCHANGED' });
    const loaded = M.loadEnvelope(storage);
    assert.equal(loaded.status, 'restored');
    assert.equal(stateTask(loaded.envelope.state, 'quote').done, done);
    assert.equal(stateTask(loaded.envelope.state, 'quote').completedAt, completedAt);
    assert.deepEqual(loaded.envelope.undo, envelope.undo);
    assert.equal(M.resultProjection(loaded.envelope.state, 'moving').items[0].completed, done);
    assert.equal(storage.snapshot()[M.STORAGE_KEY], bytes);
    assert.equal(storage.calls.some(call => ['setItem', 'removeItem', 'clear'].includes(call[0])), false);
  }
});

test('K2-A only new handoff tasks use defaults while existing completed subtree and QuickItem stay exact', () => {
  const prior = M.initialEnvelope();
  Object.assign(stateTask(prior.state, 'quote'), { done: true, completedAt: null });
  Object.assign(stateTask(prior.state, 'contract'), { done: true, completedAt: '2026-09-01T00:00:00.000Z' });
  Object.assign(stateTask(prior.state, 'call'), { done: true, completedAt: '2026-09-02T00:00:00.000Z' });
  const tasksBefore = structuredClone(prior.state.tasks);
  const flowsBefore = structuredClone(prior.state.flows);
  const beforeBytes = JSON.stringify(prior);
  const result = k2aCommit('# 신규\n## 준비\n- [x] 원문 체크', 'new-only', prior);
  assert.deepEqual(result.envelope.state.tasks.filter(task => tasksBefore.some(old => old.id === task.id)), tasksBefore);
  assert.deepEqual(result.envelope.state.flows.filter(flow => flowsBefore.some(old => old.id === flow.id)), flowsBefore);
  assert.equal(result.tasks[0].done, false);
  assert.equal(JSON.stringify(prior), beforeBytes);
  const undone = M.undoEnvelope(result.envelope);
  assert.equal(undone.envelope.state.updatedAt, M.TODAY + 'T12:00:00.000Z');
  assert.deepEqual(undone.envelope.state, { ...prior.state, updatedAt: M.TODAY + 'T12:00:00.000Z' });
});

test('K2-A duplicate handoff is exact no-op even after personal completion', () => {
  const rawText = '# 재요청\n## 준비\n- [x] 원문 확인';
  const { envelope, tasks } = k2aCommit(rawText, 'duplicate');
  const complete = M.transitionEnvelope(envelope, { type: 'complete', id: tasks[0].id, done: true, completedAt: '2026-09-05T03:00:00.000Z' });
  const before = JSON.stringify(complete.envelope);
  const repeated = M.transitionEnvelope(complete.envelope, { type: 'commit-authoring', handoff: k2aHandoff(rawText, 'duplicate') });
  assert.equal(repeated.changed, false);
  assert.equal(repeated.envelope, complete.envelope);
  assert.equal(JSON.stringify(repeated.envelope), before);
});

test('K2-A explicit different handoff copy has independent execution without changing either raw source', () => {
  const rawText = '# 같은 원문\n## 준비\n- [X] 같은 제목\n  - 날짜: 2026-09-02';
  const first = k2aCommit(rawText, 'copy-a');
  const second = k2aCommit(rawText, 'copy-b', first.envelope);
  assert.notEqual(first.tasks[0].ref, second.tasks[0].ref);
  const firstBefore = JSON.stringify(stateTask(second.envelope.state, first.tasks[0].id));
  const complete = M.transitionEnvelope(second.envelope, { type: 'complete', id: second.tasks[0].id, done: true });
  assert.equal(JSON.stringify(stateTask(complete.envelope.state, first.tasks[0].id)), firstBefore);
  assert.equal(stateTask(complete.envelope.state, second.tasks[0].id).done, true);
  for (const flow of [first.flow, second.flow]) assert.equal(stateFlow(complete.envelope.state, flow.id).rawText, rawText);
});

test('K2-A checked finite recurrence starts all occurrences open and isolates complete reopen Undo reload', () => {
  const rawText = recurringSource('매일', '3회').replace('- [ ] 물 마시기', '- [x] 물 마시기').replace('  - [ ] 컵 씻기', '  - [X] 컵 씻기');
  const { envelope, flow, tasks } = k2aCommit(rawText, 'repeat');
  const projection = M.resultProjection(envelope.state, flow.id);
  assert.equal(projection.items.length, 3);
  assert.equal(projection.items.every(item => !item.completed && item.completedAt === null), true);
  const selected = projection.items[1];
  const action = { type: 'complete-occurrence', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate };
  const completed = M.transitionEnvelope(envelope, { ...action, done: true, completedAt: '2026-09-05T00:00:00.000Z' });
  assert.deepEqual(M.resultProjection(completed.envelope.state, flow.id).items.map(item => item.completed), [false, true, false]);
  const reopened = M.transitionEnvelope(completed.envelope, { ...action, done: false });
  assert.deepEqual(M.resultProjection(reopened.envelope.state, flow.id).items.map(item => item.completed), [false, false, false]);
  const undone = M.undoEnvelope(reopened.envelope);
  const storage = M.createMemoryStorage({ 'flow:k2a:repeat-sentinel': 'original' });
  M.writeEnvelope(storage, undone.envelope);
  const loaded = M.loadEnvelope(storage).envelope;
  assert.deepEqual(M.resultProjection(loaded.state, flow.id).items.map(item => item.completed), [false, true, false]);
  assert.equal(M.resultProjection(loaded.state, flow.id).items[1].completedAt, '2026-09-05T00:00:00.000Z');
  assert.equal(stateTask(loaded.state, tasks[0].id).done, false);
  assert.equal(stateTask(loaded.state, tasks[0].id).sourceSubchecks[0].sourceChecked, true);
  assert.equal(stateFlow(loaded.state, flow.id).rawText, rawText);
  assert.equal(storage.snapshot()['flow:k2a:repeat-sentinel'], 'original');
});

test('K2-A checked open-ended recurrence horizon is read-only and never seeds future completions', () => {
  const rawText = recurringSource('매일', '').replace('- [ ] 물 마시기', '- [X] 물 마시기');
  const { envelope, flow } = k2aCommit(rawText, 'open-ended');
  const before = JSON.stringify(envelope);
  const initial = M.resultProjection(envelope.state, flow.id, { baseDate: '2026-09-02', openEndedOccurrenceWeeks: 1 });
  const shifted = M.resultProjection(envelope.state, flow.id, { baseDate: '2026-09-02', openEndedOccurrenceWeeks: 8 });
  assert.ok(initial.items.length > 0);
  assert.ok(shifted.items.length > 0);
  assert.equal(initial.items.every(item => item.completed === false), true);
  assert.equal(shifted.items.every(item => item.completed === false), true);
  assert.notDeepEqual(initial.occurrenceIds, shifted.occurrenceIds);
  assert.equal(Object.keys(envelope.state.occurrenceOverrides).length, 0);
  assert.equal(JSON.stringify(envelope), before);
});

test('K2-A checked handoff commit failure restores state and exact CRLF draft without operating writes', () => {
  const rawText = '# 실패\r\n## 준비\r\n- [X] 원문 체크\r\n';
  const initial = M.initialEnvelope();
  const next = k2aCommit(rawText, 'failure', initial);
  const memory = M.createMemoryStorage({ 'flow:k2a:sentinel': 'exact\r\n before' });
  M.writeEnvelope(memory, initial);
  M.writeAuthoringDraft(memory, { draftId: 'k2a-draft-failure', rawText, templateId: null, folderId: null });
  const before = memory.snapshot();
  let rejectCleanup = true;
  const storage = { ...memory, removeItem(key) { if (key === M.DRAFT_STORAGE_KEY && rejectCleanup) { rejectCleanup = false; throw new Error('cleanup'); } return memory.removeItem(key); } };
  assert.throws(() => M.writeAuthoringCommit(storage, next.envelope), /cleanup/u);
  assert.deepEqual(memory.snapshot(), before);
  assert.equal(M.loadEnvelope(memory).envelope.state.flows.some(flow => flow.id === next.flow.id), false);
  assert.equal(memory.calls.filter(call => ['setItem', 'removeItem', 'clear'].includes(call[0])).every(call => call[0] !== 'clear' && call[1].startsWith('flow:poc:personal-workspace:v1:')), true);
});

function sourceUpdateAuthoredEnvelope() {
  const rawText = '# 테스트 Flow\n\n## 준비\n- [ ] 기존 항목\n  - 날짜: 2026-09-02';
  const handoff = M.makeHandoff(rawText, {
    draftId: 'source-update-draft',
    handoffId: 'source-update-handoff',
    sourceConfirmed: true,
    folderId: null,
  });
  const result = M.transitionEnvelope(M.initialEnvelope(), { type: 'commit-authoring', handoff });
  assert.equal(result.changed, true);
  return result.envelope;
}

test('four versioned standalone storage keys stay inside the exact PoC prefix', () => {
  assert.equal(M.VERSION, 1);
  assert.equal(M.STORAGE_KEY, 'flow:poc:personal-workspace:v1:standalone-integrated');
  assert.equal(M.DRAFT_STORAGE_KEY, 'flow:poc:personal-workspace:v1:standalone-integrated:draft');
  assert.equal(M.CREATOR_DRAFT_LIBRARY_VERSION, 1);
  assert.equal(M.CREATOR_DRAFT_STORAGE_KEY, 'flow:poc:personal-workspace:v1:creator-drafts');
  assert.equal(M.SOURCE_CANDIDATE_STORAGE_KEY, 'flow:poc:personal-workspace:v1:source-candidates');
  assert.equal(M.SOURCE_CANDIDATE_STORAGE_KEY, sourceUpdateRuntime.PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY);
  assert.equal(M.sourceUpdateRuntimeReady(), true);
});

test('Node standalone model exposes the exact canonical 31-example read-only registry', () => {
  assert.equal(M.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION, 1);
  assert.equal(M.validationExampleCatalogVersion, 1);
  assert.equal(
    M.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG,
    validationExamplesRuntime.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG,
  );
  assert.equal(
    M.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS,
    validationExamplesRuntime.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS,
  );
  assert.equal(M.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.length, 31);
  assert.equal(M.validationExampleCatalog, M.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG);
  assert.equal(M.validationExampleGroups, M.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS);
  assert.deepEqual(
    M.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS.map(group => group.expectedCount),
    [1, 8, 11, 6, 5],
  );
  assert.equal(
    new Set(M.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.map(
      entry => entry.exampleId,
    )).size,
    31,
  );
  const filtered = M.filterValidationExamples({
    groupId: 'real-content',
    query: '  ＡＬＬＢＬＡＮＣ   ７일 ',
  });
  assert.deepEqual(filtered.map(entry => entry.caseId), ['content-allblanc-7day']);
  const selected = M.projectValidationExampleSelection({
    catalogVersion: 1,
    exampleId: filtered[0].exampleId,
  });
  assert.equal(selected.status, 'selected');
  assert.equal(selected.previewRawText, filtered[0].rawText);
  assert.deepEqual(
    [selected.sourceMutationCount, selected.workspaceMutationCount, selected.operatingMutationCount],
    [0, 0, 0],
  );
  assert.equal(selected.sourceOwner, null);
  assert.equal(selected.templateId, null);
});

test('standalone example planner fails closed with zero mutation at every boundary', () => {
  const example = M.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG[0];
  const fingerprint = validationExamplesRuntime.fingerprintPersonalWorkspacePocAuthoringSource;
  const emptyFingerprint = fingerprint('');
  const cases = [
    {
      reason: 'catalog mismatch',
      expected: 'version-mismatch',
      input: { catalogVersion: 2, exampleId: example.exampleId, rawText: '', expectedSourceFingerprint: emptyFingerprint, confirmed: true },
    },
    {
      reason: 'unknown example',
      expected: 'unknown-example',
      input: { catalogVersion: 1, exampleId: 'validation-example:missing', rawText: '', expectedSourceFingerprint: emptyFingerprint, confirmed: true },
    },
    {
      reason: 'nonempty source',
      expected: 'nonempty-source',
      input: { catalogVersion: 1, exampleId: example.exampleId, rawText: '내 원문', expectedSourceFingerprint: fingerprint('내 원문'), confirmed: true },
    },
    {
      reason: 'cancel',
      expected: 'cancelled',
      input: { catalogVersion: 1, exampleId: example.exampleId, rawText: '', expectedSourceFingerprint: emptyFingerprint, confirmed: false },
    },
    {
      reason: 'composing',
      expected: 'composing',
      input: { catalogVersion: 1, exampleId: example.exampleId, rawText: '', expectedSourceFingerprint: emptyFingerprint, confirmed: true, composing: true },
    },
    {
      reason: 'stale fingerprint',
      expected: 'stale-source',
      input: { catalogVersion: 1, exampleId: example.exampleId, rawText: '', expectedSourceFingerprint: 'raw-v1:stale', confirmed: true },
    },
    {
      reason: 'same source',
      expected: 'same-source',
      input: { catalogVersion: 1, exampleId: example.exampleId, rawText: example.rawText, expectedSourceFingerprint: fingerprint(example.rawText), confirmed: true },
    },
  ];

  cases.forEach(boundary => {
    const input = Object.freeze(boundary.input);
    const before = Object.assign({}, input);
    const plan = M.planValidationExampleApply(input);
    assert.equal(plan.reason, boundary.expected, boundary.reason);
    assert.equal(plan.nextRawText, input.rawText, boundary.reason);
    assert.equal(plan.replacement, null, boundary.reason);
    assert.deepEqual(
      [plan.sourceMutationCount, plan.workspaceMutationCount, plan.operatingMutationCount],
      [0, 0, 0],
      boundary.reason,
    );
    assert.deepEqual(input, before, boundary.reason);
  });
});

test('standalone blank confirmed apply returns one exact source replacement only', () => {
  const example = M.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.find(
    entry => entry.caseId === 'compat-markdown-table',
  );
  assert.ok(example);
  const plan = M.planValidationExampleApply({
    catalogVersion: 1,
    exampleId: example.exampleId,
    rawText: '',
    expectedSourceFingerprint:
      validationExamplesRuntime.fingerprintPersonalWorkspacePocAuthoringSource(''),
    confirmed: true,
  });
  assert.equal(plan.status, 'applied');
  assert.equal(plan.nextRawText, example.rawText);
  assert.deepEqual(Buffer.from(plan.nextRawText), Buffer.from(example.rawText));
  assert.equal(plan.replacement.afterRawText, example.rawText);
  assert.deepEqual(
    [plan.sourceMutationCount, plan.workspaceMutationCount, plan.operatingMutationCount],
    [1, 0, 0],
  );
});

test('browser UMD receives the validation runtime through the requested window global', () => {
  const browser = vm.createContext({});
  vm.runInContext('this.window = this;', browser);
  vm.runInContext(losslessRuntimeAdapter.buildBrowserText(), browser);
  vm.runInContext(validationExamplesRuntimeAdapter.buildBrowserText(), browser);
  assert.ok(browser.window.FlowMePersonalWorkspacePocValidationExamples);
  assert.equal(browser.window.FlowMePersonalWorkspacePocValidationExamples
    .PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.length, 31);
  vm.runInContext(fs.readFileSync(modelPath, 'utf8'), browser);
  assert.ok(browser.window.FlowMeIntegratedPoc);
  assert.equal(
    browser.window.FlowMeIntegratedPoc.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG,
    browser.window.FlowMePersonalWorkspacePocValidationExamples
      .PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG,
  );
  assert.equal(browser.window.FlowMeIntegratedPoc.validationExampleCatalogVersion, 1);
  assert.equal(browser.window.FlowMeIntegratedPoc.validationExampleCatalog.length, 31);
  const example = browser.window.FlowMeIntegratedPoc.validationExampleCatalog[0];
  const plan = browser.window.FlowMeIntegratedPoc.planValidationExampleApply({
      catalogVersion: 1,
      exampleId: example.exampleId,
      rawText: '',
      expectedSourceFingerprint: browser.window.FlowMePersonalWorkspacePocValidationExamples
        .fingerprintPersonalWorkspacePocAuthoringSource(''),
      confirmed: true,
    });
  assert.equal(plan.status, 'applied');
  assert.equal(plan.nextRawText, example.rawText);
  assert.equal(plan.sourceMutationCount, 1);
  assert.equal(plan.workspaceMutationCount, 0);
  assert.equal(plan.operatingMutationCount, 0);
});

test('browser model fails closed when the validation runtime is absent', () => {
  const browser = vm.createContext({});
  vm.runInContext('this.window = this;', browser);
  vm.runInContext(losslessRuntimeAdapter.buildBrowserText(), browser);
  vm.runInContext(fs.readFileSync(modelPath, 'utf8'), browser);
  const fallback = browser.window.FlowMeIntegratedPoc;
  assert.ok(fallback);
  assert.equal(fallback.validationExampleCatalogVersion, 0);
  assert.equal(fallback.validationExampleCatalog.length, 0);
  assert.equal(fallback.validationExampleGroups.length, 0);
  assert.equal(fallback.filterValidationExamples({ query: '이사' }).length, 0);
  const selection = fallback.projectValidationExampleSelection({
    catalogVersion: 1,
    exampleId: 'validation-example:basic-authoring-syntax',
  });
  assert.equal(selection.status, 'unavailable');
  assert.equal(selection.reason, 'runtime-missing');
  assert.deepEqual(
    [selection.sourceMutationCount, selection.workspaceMutationCount, selection.operatingMutationCount],
    [0, 0, 0],
  );
  const plan = fallback.planValidationExampleApply({
    catalogVersion: 1,
    exampleId: 'validation-example:basic-authoring-syntax',
    rawText: '내 원문',
    expectedSourceFingerprint: 'anything',
    confirmed: true,
  });
  assert.equal(plan.status, 'blocked');
  assert.equal(plan.reason, 'runtime-missing');
  assert.equal(plan.nextRawText, '내 원문');
  assert.deepEqual(
    [plan.sourceMutationCount, plan.workspaceMutationCount, plan.operatingMutationCount],
    [0, 0, 0],
  );
});

test('Node standalone model exposes six compiler-verified StructureDraft previews in pinned order', () => {
  const expectedOrder = [
    'exercise-phased-4w-v1',
    'exercise-weekly-repeat-v1',
    'moving-dday-v1',
    'wedding-dday-v1',
    'travel-itinerary-prep-v1',
    'exam-dday-study-v1',
  ];
  assert.equal(M.structureTemplatePreviewCatalogVersion, '1.1.0-p0');
  assert.equal(M.structureTemplatePreviewContractVersion, 'p0.2');
  assert.equal(Object.isFrozen(M.structureTemplatePreviews), true);
  assert.deepEqual(M.structureTemplatePreviews.map(entry => entry.templateId), expectedOrder);
  assert.equal(M.structureTemplatePreviews.length, 6);
  M.structureTemplatePreviews.forEach(entry => {
    assert.equal(entry.catalogVersion, M.structureTemplatePreviewCatalogVersion);
    assert.equal(entry.contractVersion, M.structureTemplatePreviewContractVersion);
    assert.equal(typeof entry.expectedRawText, 'string');
    assert.ok(entry.expectedRawText.length > 0);
    assert.ok(entry.inputDraft);
    assert.ok(entry.compiled);
    assert.equal(
      M.findStructureTemplatePreview(entry.templateId, {
        catalogVersion: entry.catalogVersion,
        contractVersion: entry.contractVersion,
        templateVersion: entry.templateVersion,
      }),
      entry,
    );
  });
  assert.equal(M.findStructureTemplatePreview('missing-template'), null);
  assert.equal(M.findStructureTemplatePreview(expectedOrder[0], { catalogVersion: 'stale' }), null);
  assert.equal(
    M.structureTemplateSidecarStorageKey,
    'flow:poc:personal-workspace:v1:structure-template-sidecars:p0.2',
  );
  assert.equal(M.structureTemplateSidecarStorageKey.startsWith('flow:poc:personal-workspace:v1:'), true);
});

test('browser UMD supplies the same six StructureDraft previews to the model', () => {
  const browser = vm.createContext({ TextEncoder, URL, structuredClone });
  vm.runInContext('this.window = this;', browser);
  vm.runInContext(losslessRuntimeAdapter.buildBrowserText(), browser);
  vm.runInContext(validationExamplesRuntimeAdapter.buildBrowserText(), browser);
  vm.runInContext(structureTemplateRuntimeAdapter.buildBrowserText(), browser);
  assert.ok(browser.window.FlowMePersonalWorkspaceStructureTemplate);
  vm.runInContext(fs.readFileSync(modelPath, 'utf8'), browser);
  const browserModel = browser.window.FlowMeIntegratedPoc;
  assert.equal(browserModel.structureTemplatePreviewCatalogVersion, '1.1.0-p0');
  assert.equal(browserModel.structureTemplatePreviewContractVersion, 'p0.2');
  assert.equal(browserModel.structureTemplatePreviews.length, 6);
  assert.equal(
    browserModel.structureTemplatePreviews.map(entry => entry.templateId).join('|'),
    browser.window.FlowMePersonalWorkspaceStructureTemplate
      .listPersonalWorkspacePocStructureTemplatePreviews()
      .map(entry => entry.templateId).join('|'),
  );
  assert.equal(
    browserModel.structureTemplateSidecarStorageKey,
    'flow:poc:personal-workspace:v1:structure-template-sidecars:p0.2',
  );
});

test('browser model keeps StructureDraft APIs empty and mutation-free without its runtime', () => {
  const browser = vm.createContext({});
  vm.runInContext('this.window = this;', browser);
  vm.runInContext(losslessRuntimeAdapter.buildBrowserText(), browser);
  vm.runInContext(validationExamplesRuntimeAdapter.buildBrowserText(), browser);
  vm.runInContext(fs.readFileSync(modelPath, 'utf8'), browser);
  const fallback = browser.window.FlowMeIntegratedPoc;
  assert.equal(fallback.structureTemplatePreviewCatalogVersion, null);
  assert.equal(fallback.structureTemplatePreviewContractVersion, null);
  assert.equal(fallback.structureTemplateSidecarStorageKey, null);
  assert.equal(Object.isFrozen(fallback.structureTemplatePreviews), true);
  assert.equal(fallback.structureTemplatePreviews.length, 0);
  assert.equal(fallback.findStructureTemplatePreview('moving-dday-v1'), null);
  const plan = fallback.planStructureTemplatePreviewMaterialization({
    templateId: 'moving-dday-v1',
    catalogVersion: '1.1.0-p0',
    contractVersion: 'p0.2',
    rawText: '',
    confirmed: true,
    composing: false,
  });
  assert.equal(plan.status, 'blocked');
  assert.equal(plan.reason, 'runtime-missing');
  assert.equal(plan.nextRawText, '');
  assert.deepEqual(
    [plan.sourceMutationCount, plan.workspaceMutationCount, plan.operatingMutationCount],
    [0, 0, 0],
  );
});

test('blank confirmed StructureDraft materialization compiles all six previews to exact bytes once', () => {
  M.structureTemplatePreviews.forEach(preview => {
    const plan = M.planStructureTemplatePreviewMaterialization({
      templateId: preview.templateId,
      catalogVersion: M.structureTemplatePreviewCatalogVersion,
      contractVersion: M.structureTemplatePreviewContractVersion,
      rawText: '',
      confirmed: true,
      composing: false,
    });
    assert.equal(plan.status, 'applied', preview.templateId);
    assert.equal(plan.reason, 'applied', preview.templateId);
    assert.equal(plan.nextRawText, preview.expectedRawText, preview.templateId);
    assert.deepEqual(
      Buffer.from(plan.nextRawText, 'utf8'),
      Buffer.from(preview.expectedRawText, 'utf8'),
      preview.templateId,
    );
    assert.equal(plan.replacement.beforeRawText, '', preview.templateId);
    assert.equal(plan.replacement.afterRawText, preview.expectedRawText, preview.templateId);
    assert.deepEqual(
      [plan.sourceMutationCount, plan.workspaceMutationCount, plan.operatingMutationCount],
      [1, 0, 0],
      preview.templateId,
    );
  });
});

test('StructureDraft cancel and every guard preserve source with zero mutations', () => {
  const preview = M.structureTemplatePreviews[0];
  const base = {
    templateId: preview.templateId,
    catalogVersion: M.structureTemplatePreviewCatalogVersion,
    contractVersion: M.structureTemplatePreviewContractVersion,
    rawText: '',
    confirmed: true,
    composing: false,
  };
  const cases = [
    { label: 'cancel', expected: 'cancelled', input: Object.assign({}, base, { confirmed: false }) },
    { label: 'composing', expected: 'composing', input: Object.assign({}, base, { composing: true }) },
    { label: 'catalog mismatch', expected: 'version-mismatch', input: Object.assign({}, base, { catalogVersion: 'stale' }) },
    { label: 'contract mismatch', expected: 'version-mismatch', input: Object.assign({}, base, { contractVersion: 'stale' }) },
    { label: 'unknown', expected: 'unknown-template', input: Object.assign({}, base, { templateId: 'missing-template' }) },
    { label: 'nonempty', expected: 'nonempty-source', input: Object.assign({}, base, { rawText: '내가 쓴 원문' }) },
    { label: 'same source', expected: 'same-source', input: Object.assign({}, base, { rawText: preview.expectedRawText }) },
    { label: 'stale source', expected: 'stale-source', input: Object.assign({}, base, { expectedSourceFingerprint: 'raw-v2:stale' }) },
  ];

  cases.forEach(boundary => {
    const input = Object.freeze(boundary.input);
    const before = Object.assign({}, input);
    const plan = M.planStructureTemplatePreviewMaterialization(input);
    assert.equal(plan.reason, boundary.expected, boundary.label);
    assert.equal(plan.nextRawText, input.rawText, boundary.label);
    assert.equal(plan.replacement, null, boundary.label);
    assert.deepEqual(
      [plan.sourceMutationCount, plan.workspaceMutationCount, plan.operatingMutationCount],
      [0, 0, 0],
      boundary.label,
    );
    assert.deepEqual(input, before, boundary.label);
  });
});

test('StructureDraft wrapper converts thrown core and altered compiler bytes to zero-mutation blocks', () => {
  const modelSource = fs.readFileSync(modelPath, 'utf8');
  const preview = structureTemplateRuntime.listPersonalWorkspacePocStructureTemplatePreviews()[0];
  const request = {
    templateId: preview.templateId,
    catalogVersion: preview.catalogVersion,
    contractVersion: preview.contractVersion,
    rawText: '',
    confirmed: true,
    composing: false,
  };
  const makeBrowserModel = structureRuntime => {
    const browser = vm.createContext({
      FlowMePersonalWorkspaceLosslessAuthoring: losslessRuntime,
      FlowMePersonalWorkspacePocValidationExamples: validationExamplesRuntime,
      FlowMePersonalWorkspaceStructureTemplate: structureRuntime,
    });
    vm.runInContext('this.window = this;', browser);
    vm.runInContext(modelSource, browser);
    return browser.window.FlowMeIntegratedPoc;
  };
  const throwingModel = makeBrowserModel(Object.assign({}, structureTemplateRuntime, {
    planPersonalWorkspacePocStructureTemplatePreviewApply() {
      throw new Error('compiler exploded');
    },
  }));
  const thrown = throwingModel.planStructureTemplatePreviewMaterialization(request);
  assert.equal(thrown.status, 'blocked');
  assert.equal(thrown.reason, 'compiler-error');
  assert.deepEqual(
    [thrown.sourceMutationCount, thrown.workspaceMutationCount, thrown.operatingMutationCount],
    [0, 0, 0],
  );
  assert.equal(thrown.nextRawText, '');

  const alteredModel = makeBrowserModel(Object.assign({}, structureTemplateRuntime, {
    planPersonalWorkspacePocStructureTemplatePreviewApply() {
      return {
        status: 'applied',
        reason: 'applied',
        templateId: preview.templateId,
        catalogVersion: preview.catalogVersion,
        contractVersion: preview.contractVersion,
        currentSourceFingerprint: 'raw-v1:0:0ztntfp',
        currentLegacySourceFingerprint: 'raw-v1:0:0ztntfp',
        nextRawText: '# altered bytes',
        sourceMutationCount: 1,
        workspaceMutationCount: 0,
        operatingMutationCount: 0,
        replacement: {
          kind: 'replace-raw-text',
          beforeRawText: '',
          afterRawText: '# altered bytes',
          afterSourceFingerprint: 'altered',
          afterLegacySourceFingerprint: 'altered',
        },
      };
    },
  }));
  const altered = alteredModel.planStructureTemplatePreviewMaterialization(request);
  assert.equal(altered.status, 'blocked');
  assert.equal(altered.reason, 'bytes-mismatch');
  assert.equal(altered.nextRawText, '');
  assert.equal(altered.replacement, null);
  assert.deepEqual(
    [altered.sourceMutationCount, altered.workspaceMutationCount, altered.operatingMutationCount],
    [0, 0, 0],
  );
});

test('six approved templates match the React authoring contract byte for byte without creating canonical Items', () => {
  const expected = [
    { id: 'exercise-phased-4w-v1', label: '단계별 반복', description: '단계마다 기간과 반복할 일이 달라요.', exampleLabel: '4주 운동 적응', exampleSource: '# 4주 운동 적응\n- 기준일: 2026-09-07\n\n## 1단계\n- [ ] 걷기 20분\n  - 날짜: 2026-09-07\n  - 반복: 매주 월, 수, 금\n  - 반복 종료: 2026-09-20', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: ' },
    { id: 'exercise-weekly-repeat-v1', label: '같은 일정 반복', description: '정한 기간 동안 같은 일정으로 반복해요.', exampleLabel: '주간 운동 루틴', exampleSource: '# 주간 운동 루틴\n- 기준일: 2026-09-07\n\n## 이번 주\n- [ ] 아침 스트레칭\n  - 날짜: 2026-09-07\n  - 반복: 매주 월, 수, 금\n  - 반복 종료: 2026-10-02', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: ' },
    { id: 'moving-dday-v1', label: '기준일 전후 준비', description: '한 날짜를 기준으로 앞뒤 할 일을 적어요.', exampleLabel: '이사 준비', exampleSource: '# 이사 준비\n- 기준일: 2026-10-10\n\n## 계약\n- [ ] 주소 변경 신청\n  - 상대 날짜: D-7', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: ' },
    { id: 'wedding-dday-v1', label: '기준일 전후 준비 + 자료', description: '앞뒤 할 일과 참고 링크를 함께 적어요.', exampleLabel: '결혼 준비', exampleSource: '# 결혼 준비\n- 기준일: 2027-04-17\n\n## 예약\n- [ ] 식장 계약 확인\n  - 상대 날짜: D-180\n  - 자료: https://example.com/venue', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: \n  - 자료: ' },
    { id: 'travel-itinerary-prep-v1', label: '준비 + 날짜별 일정', description: '사전 준비와 날짜별 시간·장소를 함께 적어요.', exampleLabel: '여행 준비와 날짜별 일정', exampleSource: '# 제주 여행\n- 기준일: 2026-10-03\n\n## 출발 전\n- [ ] 온라인 체크인\n  - 상대 날짜: D-1\n\n## 첫째 날\n- [ ] 렌터카 받기\n  - 날짜: 2026-10-03\n  - 시간: 11:00\n  - 시간대: Asia/Seoul\n  - 장소: 제주공항', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: \n\n## \n- [ ] \n  - 날짜: \n  - 시간: \n  - 시간대: \n  - 장소: ' },
    { id: 'exam-dday-study-v1', label: '반복 준비 + 목표일', description: '반복할 일과 마지막 일정을 함께 적어요.', exampleLabel: '시험 준비', exampleSource: '# 자격시험 준비\n- 기준일: 2026-11-14\n\n- [ ] 기출문제 풀기\n  - 날짜: 2026-10-13\n  - 반복: 매주 화, 목\n  - 반복 종료: 2026-11-12\n  - 완료 기준: 오답을 다시 설명할 수 있다\n\n- [ ] 시험 응시\n  - 날짜: 2026-11-14', scaffold: '# \n- 기준일: \n\n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: \n  - 완료 기준: \n\n- [ ] \n  - 날짜: ' }
  ];
  assert.deepEqual(M.TEMPLATE_CATALOG, expected);
  M.TEMPLATE_CATALOG.forEach(template => {
    const parsed = M.parseSource(template.scaffold);
    assert.equal(parsed.itemCount, 0);
    assert.equal(parsed.issues.some(issue => issue.code === 'missing-items'), true);
  });
});

test('template picker explains structure and examples without inserting UI copy', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  assert.doesNotMatch(app, /TEMPLATE_PRESENTATION/u);
  assert.match(app, /renderAuthoringTemplatePreview\(previewTemplate, structurePreview\)/u);
  assert.match(app, /escapeHtml\(preview\.expectedRawText\)/u);
  assert.match(app, /id="template-scaffold-source">' \+ escapeHtml\(template\.scaffold\)/u);
  assert.match(app, /<details id="template-completed-example"><summary>완성 예시 보기<\/summary>/u);
  assert.match(app, /<details id="template-verification-details"><summary>검증 정보<\/summary>/u);
  assert.match(app, /id="template-example-preview"/u);
  assert.match(app, /role="region"[^>]*aria-labelledby="template-example-label"/u);
  assert.match(app, /examplePreview\.removeAttribute\('aria-live'\)/u);
  assert.match(app, /exampleLabel\.setAttribute\('aria-live', 'polite'\)/u);
  assert.match(app, /data-template-preview-id/u);
  assert.match(app, /setAuthoringTemplatePreview/u);
  assert.match(app, /document\.addEventListener\('focusin'/u);
  assert.match(app, /\['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Home', 'End'\]/u);
  assert.match(app, /예시의 내용으로 시작하려면 아래 버튼을 누르세요\. 빈 원문에서만 적용됩니다\./u);
  assert.match(app, />빈 틀 넣기<\/button>/u);
  assert.match(app, />이 예시로 시작<\/button>/u);
  M.TEMPLATE_CATALOG.forEach(template => {
    assert.equal(template.scaffold.includes(template.label), false);
    assert.equal(template.scaffold.includes(template.description), false);
    assert.equal(template.scaffold.includes(template.exampleLabel), false);
    assert.equal(template.scaffold.includes(template.exampleSource), false);
  });
});

test('recognized blank ghosts preserve CRLF and trailing-newline source bytes without becoming source', () => {
  const source = [
    '# ',
    '## ',
    '- [ ] ',
    '  - [ ] ',
    '- 기준일: ',
    '  - 상대 날짜: ',
    '  - 날짜: ',
    '  - 장소: ',
    '  - 자료: ',
    '  - 완료 기준: ',
    '  - 시간: ',
    '  - 반복: ',
    '# 이미 입력함',
    '  - 날짜:  ',
    '',
  ].join('\r\n');
  const lines = M.authoringGhostLines(source);
  assert.equal(lines.map(line => line.rawLine + line.terminator).join(''), source);
  assert.equal(lines.length, 15);
  assert.deepEqual(
    lines.filter(line => line.ghost).map(line => ({
      line: line.line,
      hintId: line.ghost.hintId,
      offset: line.ghost.offset,
      text: line.ghost.text,
    })),
    [
      { line: 1, hintId: 'flow-title', offset: 2, text: '예: 8월 제주 여행 준비' },
      { line: 2, hintId: 'step-title', offset: 3, text: '예: 예약' },
      { line: 3, hintId: 'root-item', offset: 6, text: '예: 항공권 확인' },
      { line: 4, hintId: 'child-check', offset: 8, text: '예: 예약번호 확인' },
      { line: 5, hintId: 'anchor-date', offset: 7, text: '예: 2026-09-02' },
      { line: 6, hintId: 'relative-date', offset: 11, text: '예: D-7' },
      { line: 7, hintId: 'fixed-date', offset: 8, text: '예: 2026-09-02' },
      { line: 8, hintId: 'place', offset: 8, text: '예: 김포공항' },
      { line: 9, hintId: 'resource', offset: 8, text: '예: https://example.com' },
      { line: 10, hintId: 'completion-criteria', offset: 11, text: '예: 예약번호를 메모에 남김' },
    ],
  );
  assert.equal(lines[10].ghost, null);
  assert.equal(lines[11].ghost, null);
  assert.equal(lines[12].ghost, null);
  assert.equal(lines[13].ghost, null);
  assert.equal(lines[14].rawLine, '');
  assert.equal(lines[14].terminator, '');
});

test('inline input examples stay a non-editable aria-hidden overlay owned by one textarea', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /id="authoring-ghost-toggle"/u);
  assert.match(app, /aria-pressed="/u);
  assert.match(app, />빈칸 힌트<\/button>/u);
  assert.match(app, /data-action="apply-template"/u);
  assert.match(app, /id="authoring-ghost-overlay"[^>]*aria-hidden="true"/u);
  assert.match(app, /id="authoring-ghost-scroll"/u);
  assert.equal((app.match(/<textarea id="flow-editor"/gu) || []).length, 1);
  assert.equal((app.match(/contenteditable/gu) || []).length, 0);
  assert.match(style, /\.authoring-ghost-overlay[^}]*pointer-events:\s*none/su);
  assert.match(style, /\.authoring-ghost-overlay[^}]*user-select:\s*none/su);
  assert.match(style, /\.authoring-ghost-overlay[^}]*overflow:\s*hidden/su);
});

test('template browsing is zero-source-write and insertion fails closed on non-empty source', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const pickerStart = app.indexOf('function setTemplatePickerOpen');
  const pickerEnd = app.indexOf('function renderReceipt', pickerStart);
  assert.ok(pickerStart >= 0 && pickerEnd > pickerStart);
  const pickerController = app.slice(pickerStart, pickerEnd);
  assert.doesNotMatch(pickerController, /rawText\s*=/u);
  assert.doesNotMatch(pickerController, /M\.writeEnvelope|localStorage|setItem/u);
  assert.match(app, /authoring\.rawText\.length > 0/u);
  assert.match(app, /editor\.value !== authoring\.rawText/u);
  assert.equal((app.match(/editor\.setRangeText\(/gu) || []).length, 0);
  // Scaffold, validation-example, StructureDraft materialization, and the
  // existing contextual helper each own one browser-native transaction path.
  assert.equal((app.match(/document\.execCommand\('insertText'/gu) || []).length, 4);
  assert.match(app, /nativeSourcePlanInputEventCount > 0/u);
  assert.match(app, /commandAccepted === true && editor\.value === template\.scaffold/u);
  assert.doesNotMatch(app, /templateEditHistory|wantsUndo|wantsRedo/u);
  assert.doesNotMatch(app, /현재 원문을 선택한 구조 틀로 바꿀까요/u);
  assert.match(app, /작성 틀을 닫았어요/u);
});

test('authoring uses compact input and result states with optional review and no manual source checkbox', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.doesNotMatch(app, /id="source-confirmed"/u);
  assert.doesNotMatch(app, />1 작성</u);
  assert.doesNotMatch(app, />2 구조 확인</u);
  assert.doesNotMatch(app, />3 저장</u);
  assert.match(app, /id="authoring-tab-input"/u);
  assert.match(app, /id="authoring-tab-result"/u);
  assert.match(app, /id="authoring-review"/u);
  assert.match(app, /현재 원문을 실행할 Item으로 정리한 결과/u);
  assert.match(style, /\.authoring-mobile-tabs/u);
  assert.match(style, /\.authoring-save-action[^}]*position: sticky/u);
  assert.match(style, /\.template-choice\[data-preview-active="true"\]/u);
  assert.match(style, /@media \(max-width: 1023px\)[\s\S]*\.authoring-pane\.active \{ display: block; \}/u);
});

test('standalone visual layer uses the v4.1 white gray teal flat-list contract', () => {
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(style, /--bg: #ffffff/u);
  assert.match(style, /--surface-soft: #f5f7f8/u);
  assert.match(style, /--blue: #087f73/u);
  assert.match(style, /\.flow-row, \.task-row \{ border: 0; border-bottom: 1px solid var\(--line\); border-radius: 0/u);
  assert.match(style, /\.mobile-header-link \{ min-height: 48px/u);
  assert.match(style, /--standalone-safe-bottom: env\(safe-area-inset-bottom, 0px\)/u);
  assert.match(style, /\.toast \{[^}]*var\(--standalone-safe-bottom\)/u);
  assert.match(style, /dialog \{ width: calc\(100vw - 16px - var\(--standalone-safe-left\) - var\(--standalone-safe-right\)\)/u);
  assert.match(style, /\.app-shell\.app-shell-wide \{ grid-template-columns: minmax\(0, 1fr\); \}/u);
});

test('parser preserves source, ignores prose and resolves explicit dates only', () => {
  const source = validSource();
  const parsed = M.parseSource(source);
  assert.equal(parsed.rawText, source);
  assert.equal(parsed.sourceFingerprint, M.fingerprint(source));
  assert.equal(parsed.title, '이사 전 준비');
  assert.equal(parsed.itemCount, 2);
  assert.equal(parsed.ignoredLineCount, 1);
  assert.equal(parsed.steps[0].items[0].date, '2026-09-06');
  assert.equal(parsed.steps[1].items[0].date, '2026-09-20');
  assert.equal(parsed.steps[1].items[0].time, '10:30');
  assert.deepEqual(parsed.issues, []);
});

test('invalid nonblank date, time, timezone, URL and relative date block handoff', () => {
  const source = '# 잘못된 입력\n- 기준일: 2026-02-30\n## 단계\n- [ ] 확인\n  - 날짜: 2026-13-01\n  - 시간: 25:00\n  - 시간대: Seoul\n  - 자료: javascript:alert(1)\n  - 상대 날짜: 다음주';
  const codes = M.parseSource(source).issues.map(issue => issue.code);
  assert.deepEqual(codes, ['invalid-anchor-date', 'invalid-date', 'invalid-time', 'invalid-timezone', 'invalid-url', 'invalid-relative-date']);
});

test('four saved-plan origins seed once and remain collision-free', () => {
  const state = M.seedState();
  assert.deepEqual(M.validate(state), []);
  assert.deepEqual(state.flows.map(flow => flow.origin), ['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan']);
  assert.equal(state.flows.every(flow => flow.folderId === null), true);
  assert.equal(new Set(state.flows.map(flow => flow.ref)).size, 4);
  const itemRefs = state.tasks.filter(task => task.flowId).map(task => task.ref);
  assert.equal(new Set(itemRefs).size, itemRefs.length);
});

test('explicit authoring handoff commits atomically and preserves raw source', () => {
  const before = M.initialEnvelope();
  const handoff = confirmedHandoff();
  const result = M.transitionEnvelope(before, { type: 'commit-authoring', handoff, now: '2026-09-02T01:00:00.000Z' });
  assert.equal(result.changed, true);
  assert.equal(result.envelope.state.revision, 1);
  assert.equal(result.envelope.state.flows.length, before.state.flows.length + 1);
  assert.equal(result.envelope.state.tasks.length, before.state.tasks.length + 2);
  const receipt = result.envelope.state.lastReceipt;
  const flow = stateFlow(result.envelope.state, receipt.flowId);
  assert.equal(flow.origin, 'authoring-handoff');
  assert.equal(flow.rawText, handoff.rawText);
  assert.equal(flow.sourceFingerprint, M.fingerprint(handoff.rawText));
  assert.equal(flow.folderId, 'move');
  assert.equal(flow.savedCopyId, 'poc-handoff-a');
  assert.equal(flow.sourceFlowId, 'authoring-draft-a');
  assert.equal(flow.ref, 'saved-flow:poc-handoff-a:authoring-draft-a');
  flow.steps.flatMap(step => step.itemIds).forEach(id => {
    const item = stateTask(result.envelope.state, id);
    assert.equal(item.flowId, flow.id);
    assert.equal(item.folderId, null);
    assert.equal(M.effectiveFolder(result.envelope.state, item), 'move');
    assert.match(item.ref, /^flow-item:poc-handoff-a:authoring-draft-a:item-\d+$/u);
  });
  assert.deepEqual(M.validate(result.envelope.state), []);
  assert.deepEqual(result.envelope.undo, before.state);
});

test('same source from different drafts has a stable handoff identity and causes no duplicate state mutation', () => {
  const firstHandoff = confirmedHandoff({ draftId: 'draft-a', handoffId: undefined });
  const secondHandoff = confirmedHandoff({ draftId: 'draft-b', handoffId: undefined });
  assert.equal(firstHandoff.handoffId, secondHandoff.handoffId);
  const first = M.transitionEnvelope(M.initialEnvelope(), { type: 'commit-authoring', handoff: firstHandoff });
  const beforeBytes = JSON.stringify(first.envelope);
  const second = M.transitionEnvelope(first.envelope, { type: 'commit-authoring', handoff: secondHandoff });
  assert.equal(second.changed, false);
  assert.equal(second.error, undefined);
  assert.equal(JSON.stringify(second.envelope), beforeBytes);
  assert.equal(second.envelope.state.flows.filter(flow => flow.handoffId === firstHandoff.handoffId).length, 1);
});

test('unconfirmed or invalid source fails closed with zero mutation', () => {
  const envelope = M.initialEnvelope();
  const before = JSON.stringify(envelope);
  const unconfirmed = confirmedHandoff({ sourceConfirmed: false });
  const rejected = M.transitionEnvelope(envelope, { type: 'commit-authoring', handoff: unconfirmed });
  assert.equal(rejected.changed, false);
  assert.equal(rejected.error, 'source-unconfirmed');
  assert.equal(JSON.stringify(rejected.envelope), before);
  const invalid = M.makeHandoff('# 제목\n그냥 메모', { draftId: 'x', handoffId: 'x', sourceConfirmed: true });
  const invalidResult = M.transitionEnvelope(envelope, { type: 'commit-authoring', handoff: invalid });
  assert.equal(invalidResult.changed, false);
  assert.equal(invalidResult.error, 'invalid-source');
  assert.equal(JSON.stringify(invalidResult.envelope), before);
});

test('quick item supports date, folder, completion, reopen and undo', () => {
  let envelope = M.initialEnvelope();
  envelope = M.transitionEnvelope(envelope, { type: 'add-quick', title: '전입 신고', date: null, folderId: null }).envelope;
  const id = envelope.state.tasks.find(task => task.title === '전입 신고').id;
  envelope = M.transitionEnvelope(envelope, { type: 'schedule', id, date: M.TODAY }).envelope;
  envelope = M.transitionEnvelope(envelope, { type: 'move-folder', kind: 'task', id, folderId: 'admin' }).envelope;
  envelope = M.transitionEnvelope(envelope, { type: 'complete', id, done: true }).envelope;
  assert.equal(stateTask(envelope.state, id).date, M.TODAY);
  assert.equal(stateTask(envelope.state, id).folderId, 'admin');
  assert.equal(stateTask(envelope.state, id).done, true);
  const reopened = M.transitionEnvelope(envelope, { type: 'complete', id, done: false });
  assert.equal(stateTask(reopened.envelope.state, id).done, false);
  const undone = M.undoEnvelope(reopened.envelope);
  assert.equal(undone.changed, true);
  assert.equal(stateTask(undone.envelope.state, id).done, true);
});

test('BP-017 QuickItem conversion keeps the source and atomically creates one open Flow Item with receipt, reload and Undo', () => {
  let envelope = M.initialEnvelope();
  envelope = M.transitionEnvelope(envelope, {
    type: 'update-quick',
    id: 'call',
    title: '관리실 예약 확인',
    memo: '엘리베이터 사용 시간 확인',
    date: '2026-09-04',
    folderId: 'admin',
  }).envelope;
  envelope = M.transitionEnvelope(envelope, { type: 'complete', id: 'call', done: true }).envelope;
  const sourceBefore = structuredClone(stateTask(envelope.state, 'call'));
  const stateBefore = structuredClone(envelope.state);
  const flowCountBefore = envelope.state.flows.length;
  const taskCountBefore = envelope.state.tasks.length;

  const converted = M.transitionEnvelope(envelope, {
    type: 'convert-quick-item-to-flow',
    quickItemId: 'call',
    expectedRevision: envelope.state.revision,
    flowTitle: '관리실 예약 Flow',
    now: '2026-09-05T09:30:00.000Z',
  });

  assert.equal(converted.changed, true);
  assert.equal(converted.envelope.state.revision, envelope.state.revision + 1);
  assert.deepEqual(stateTask(converted.envelope.state, 'call'), sourceBefore);
  assert.equal(converted.envelope.state.flows.length, flowCountBefore + 1);
  assert.equal(converted.envelope.state.tasks.length, taskCountBefore + 1);
  const receipts = M.quickConversionReceipts(converted.envelope.state);
  assert.equal(receipts.length, 1);
  const receipt = receipts[0];
  const flow = stateFlow(converted.envelope.state, receipt.flowId);
  const item = stateTask(converted.envelope.state, receipt.itemId);
  assert.equal(flow.title, '관리실 예약 Flow');
  assert.equal(flow.folderId, 'admin');
  assert.deepEqual(flow.steps.flatMap(step => step.itemIds), [item.id]);
  assert.equal(item.title, sourceBefore.title);
  assert.equal(item.memo, sourceBefore.memo);
  assert.equal(item.date, sourceBefore.date);
  assert.equal(item.done, false);
  assert.equal(item.completedAt, null);
  assert.equal(receipt.sourceFolderId, 'admin');
  assert.equal(receipt.sourceDate, '2026-09-04');
  assert.equal(receipt.completionPolicy, 'source-preserved-new-item-open');
  assert.equal(receipt.handoffId, receipt.conversionId);
  assert.equal(converted.envelope.state.lastReceipt.flowId, flow.id);
  assert.deepEqual(M.validate(converted.envelope.state), []);

  const operating = {
    'flow:saved:plans': '{"spacing":"must stay exact"}',
    'flow:production:opaque': '  exact bytes  ',
  };
  const storage = M.createMemoryStorage(operating);
  const bytes = M.writeEnvelope(storage, converted.envelope);
  const restored = M.loadEnvelope(storage);
  assert.equal(restored.status, 'restored');
  assert.equal(JSON.stringify(restored.envelope), bytes);
  Object.entries(operating).forEach(([key, value]) => assert.equal(storage.snapshot()[key], value));
  assert.equal(storage.calls.filter(call => call[0] === 'setItem').every(call => call[1] === M.STORAGE_KEY), true);
  assert.equal(storage.calls.some(call => call[0] === 'removeItem'), false);

  const undone = M.undoEnvelope(converted.envelope);
  assert.equal(undone.changed, true);
  assert.deepEqual(undone.envelope.state.flows, stateBefore.flows);
  assert.deepEqual(undone.envelope.state.tasks, stateBefore.tasks);
  assert.deepEqual(M.quickConversionReceipts(undone.envelope.state), M.quickConversionReceipts(stateBefore));
});

test('BP-017 stale, duplicate, invalid, collision, cancel and storage failure paths perform zero mutation', () => {
  const envelope = M.initialEnvelope();
  const before = JSON.stringify(envelope);
  const action = {
    type: 'convert-quick-item-to-flow',
    quickItemId: 'call',
    expectedRevision: envelope.state.revision,
    flowTitle: '관리실 연락 Flow',
    now: '2026-09-05T09:31:00.000Z',
  };
  const preview = M.transitionEnvelope(envelope, action);
  assert.equal(preview.changed, true);
  const flowId = M.quickConversionReceipts(preview.envelope.state)[0].flowId;
  const rejected = [
    M.transitionEnvelope(envelope, { ...action, expectedRevision: envelope.state.revision + 1 }),
    M.transitionEnvelope(envelope, { ...action, flowTitle: ' ' }),
    M.transitionEnvelope(envelope, { ...action, flowTitle: '두 줄\nFlow' }),
    M.transitionEnvelope(envelope, { ...action, quickItemId: 'quote' }),
    M.transitionEnvelope(envelope, { ...action, existingFlowIds: [flowId] }),
    M.transitionEnvelope(envelope, { ...action, intent: 'cancel' }),
  ];
  rejected.forEach(result => {
    assert.equal(result.changed, false);
    assert.equal(JSON.stringify(result.envelope), before);
  });
  const duplicateBefore = JSON.stringify(preview.envelope);
  const duplicate = M.transitionEnvelope(preview.envelope, {
    ...action,
    expectedRevision: preview.envelope.state.revision,
    flowTitle: '다른 이름',
  });
  assert.equal(duplicate.changed, false);
  assert.equal(JSON.stringify(duplicate.envelope), duplicateBefore);
  const corruptReceipt = structuredClone(preview.envelope);
  corruptReceipt.state.quickConversionReceipts[0].itemId = 'foreign-item';
  assert.equal(M.validate(corruptReceipt.state).includes('invalid-quick-conversion-binding'), true);
  const corruptStorage = M.createMemoryStorage({ [M.STORAGE_KEY]: JSON.stringify(corruptReceipt) });
  assert.equal(M.loadEnvelope(corruptStorage).status, 'corrupt');
  assert.equal(corruptStorage.calls.some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);

  const operating = new Map([
    [M.STORAGE_KEY, before],
    ['flow:saved:plans', 'OPERATING-BYTES'],
  ]);
  const calls = [];
  const failingStorage = {
    getItem(key) { calls.push(['getItem', key]); return operating.has(key) ? operating.get(key) : null; },
    setItem(key) { calls.push(['setItem', key]); throw new Error('quota'); },
    removeItem(key) { calls.push(['removeItem', key]); throw new Error('rollback blocked'); },
  };
  assert.throws(() => M.writeEnvelope(failingStorage, preview.envelope), /quota/u);
  assert.equal(operating.get(M.STORAGE_KEY), before);
  assert.equal(operating.get('flow:saved:plans'), 'OPERATING-BYTES');
  assert.equal(calls.some(call => call[1] === 'flow:saved:plans' && call[0] !== 'getItem'), false);
});

test('BP-017 standalone move panel has one collapsed confirmation action and opens the saved Flow after success', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /<details class="quick-conversion move-section" data-testid="standalone-quick-conversion"><summary>Flow로 정리<\/summary>/u);
  assert.doesNotMatch(app, /<details class="quick-conversion move-section"[^>]*\sopen(?:\s|>)/u);
  assert.match(app, /새 Flow 이름/u);
  assert.match(app, /원 빠른 할 일은 그대로 유지합니다/u);
  assert.match(app, /현재 폴더·실행 날짜·메모만 새 Flow의 Item에 복사하고 완료 상태는 복사하지 않습니다/u);
  assert.match(app, /data-quick-conversion-form[\s\S]*<button class="button primary" type="submit">새 Flow로 정리<\/button>/u);
  const conversionFormStart = app.indexOf('data-quick-conversion-form');
  const conversionFormEnd = app.indexOf('</form></details>', conversionFormStart);
  const conversionForm = app.slice(conversionFormStart, conversionFormEnd);
  assert.notEqual(conversionFormStart, -1);
  assert.notEqual(conversionFormEnd, -1);
  assert.equal((conversionForm.match(/<button\b/gu) || []).length, 1);
  assert.equal((conversionForm.match(/class="button primary"/gu) || []).length, 1);
  assert.match(app, /expectedRevision: Number\(form\.dataset\.expectedRevision\)/u);
  assert.match(app, /type: 'convert-quick-item-to-flow'/u);
  assert.match(app, /return writeCandidate\(result\.checkpoint, result\.message,[\s\S]*selectedFlowId: receipt\.flowId/u);
  assert.match(app, /action === 'open-converted-flow'/u);
  assert.match(style, /\.quick-conversion summary \{[^}]*min-height: 44px/u);
  assert.match(style, /\.quick-conversion-body \.button\.primary \{ width: 100%; \}/u);
  assert.match(style, /\.quick-conversion summary, \.quick-conversion-body input, \.quick-conversion-body \.button \{ min-height: 48px; \}/u);
});

test('Flow Item date movement keeps source date and Flow membership', () => {
  const envelope = M.initialEnvelope();
  const original = stateTask(envelope.state, 'contract');
  const moved = M.transitionEnvelope(envelope, { type: 'schedule', id: 'contract', date: M.TODAY });
  const item = stateTask(moved.envelope.state, 'contract');
  assert.equal(item.date, M.TODAY);
  assert.equal(item.sourceDate, original.sourceDate);
  assert.equal(item.flowId, original.flowId);
  assert.equal(item.folderId, null);
});

test('P3-J Item detail keeps four-origin source description and criterion apart from personal memo', () => {
  const state = M.seedState();
  for (const id of ['quote', 'memo-outline', 'washer-filter', 'checklist']) {
    const task = stateTask(state, id);
    task.sourceDescription = '이 원문에 적힌 설명\n다음 줄';
    task.completionCriterion = '원문에 적힌 확인 기준';
    task.memo = '내가 실행하며 적은 메모';
    task.sourceMemo = '과거의 개인 메모';
    const before = JSON.stringify(state);
    assert.deepEqual(M.itemDetails(state, id), {
      sourceDescription: '이 원문에 적힌 설명\n다음 줄',
      completionCriterion: '원문에 적힌 확인 기준',
      personalMemo: '내가 실행하며 적은 메모',
    });
    assert.equal(JSON.stringify(state), before);
    delete task.sourceDescription;
    delete task.completionCriterion;
    assert.deepEqual(M.itemDetails(state, id), {
      sourceDescription: '', completionCriterion: '', personalMemo: '내가 실행하며 적은 메모',
    });
  }
  assert.equal(M.itemDetails(state, 'call').sourceDescription, '');
  assert.equal(M.itemDetails(state, 'call').completionCriterion, '');
});

test('P3-J authored details follow the exact saved Item through duplicate titles, reorder, and copy isolation', () => {
  const source = '# 상세 구분\n\n## 준비\n- [ ] 같은 제목\n  - 설명: 첫 항목 원문 설명\n  - 완료 기준: 첫 기준\n- [ ] 같은 제목\n  - 설명: 둘째 항목 원문 설명\n  - 완료 기준: 둘째 기준';
  const handoff = M.makeHandoff(source, { draftId: 'detail-draft', handoffId: 'detail-handoff', sourceConfirmed: true, folderId: null });
  const saved = M.transitionEnvelope(M.initialEnvelope(), { type: 'commit-authoring', handoff });
  assert.equal(saved.changed, true);
  const state = saved.envelope.state;
  const flow = state.flows.find(entry => entry.handoffId === handoff.handoffId);
  const [first, second] = flow.steps[0].itemIds;
  flow.steps[0].itemIds.reverse();
  state.tasks.reverse();
  stateTask(state, first).title = '개인 제목으로 변경';
  assert.equal(M.itemDetails(state, first).sourceDescription, '첫 항목 원문 설명');
  assert.equal(M.itemDetails(state, first).completionCriterion, '첫 기준');
  assert.equal(M.itemDetails(state, second).completionCriterion, '둘째 기준');
  const copied = M.transitionEnvelope(saved.envelope, { type: 'commit-authoring', handoff: M.makeHandoff(source.replace('첫 기준', '사본 기준'), { draftId: 'detail-draft', handoffId: 'detail-copy', sourceConfirmed: true, folderId: null }) });
  assert.equal(copied.changed, true);
  const copy = copied.envelope.state.flows.find(entry => entry.handoffId === 'detail-copy');
  assert.equal(M.itemDetails(copied.envelope.state, copy.steps[0].itemIds[0]).completionCriterion, '사본 기준');
  assert.equal(M.itemDetails(copied.envelope.state, first).completionCriterion, '첫 기준');
});

test('P3-J schedule, completion, memo clear, Undo and reload preserve immutable detail fields and operating bytes', () => {
  const rawText = '# 실행 상세\n\n## 준비\n- [ ] 확인할 일\n  - 설명: 원문 설명을 보존\n  - 완료 기준: 원문 기준을 보존\n  - 날짜: 2026-09-02';
  const handoff = M.makeHandoff(rawText, { draftId: 'detail-flow', handoffId: 'detail-preserve', sourceConfirmed: true, folderId: null });
  let envelope = M.transitionEnvelope(M.initialEnvelope(), { type: 'commit-authoring', handoff }).envelope;
  const flow = envelope.state.flows.find(entry => entry.handoffId === handoff.handoffId);
  const id = flow.steps[0].itemIds[0];
  const original = stateTask(envelope.state, id);
  const immutable = { ref: original.ref, flowId: original.flowId, sourceDate: original.sourceDate, sourceProperties: JSON.stringify(original.sourceProperties) };
  envelope = M.transitionEnvelope(envelope, { type: 'commit-personal-plan', flowId: flow.id, title: flow.title, items: [{ id, title: original.title, memo: '내 메모', planDate: original.sourceDate }] }).envelope;
  envelope = M.transitionEnvelope(envelope, { type: 'schedule', id, date: '2026-09-05' }).envelope;
  envelope = M.transitionEnvelope(envelope, { type: 'complete', id, done: true }).envelope;
  assert.equal(stateTask(envelope.state, id).done, true);
  assert.equal(stateTask(envelope.state, id).date, '2026-09-05');
  const cleared = M.transitionEnvelope(envelope, { type: 'commit-personal-plan', flowId: flow.id, title: flow.title, items: [{ id, title: original.title, memo: '', planDate: original.sourceDate }] });
  assert.equal(cleared.changed, true);
  assert.deepEqual(M.itemDetails(cleared.envelope.state, id), { sourceDescription: '원문 설명을 보존', completionCriterion: '원문 기준을 보존', personalMemo: '' });
  const task = stateTask(cleared.envelope.state, id);
  assert.deepEqual({ ref: task.ref, flowId: task.flowId, sourceDate: task.sourceDate, sourceProperties: JSON.stringify(task.sourceProperties) }, immutable);
  assert.equal(stateFlow(cleared.envelope.state, flow.id).rawText, rawText);
  assert.equal(M.itemDetails(M.undoEnvelope(cleared.envelope).envelope.state, id).personalMemo, '내 메모');
  const operating = { 'flow:saved:plans': '{"kept":"  exact bytes  "}', 'flow:completion:v1': '{"unrelated":true}' };
  const storage = M.createMemoryStorage(operating);
  M.writeEnvelope(storage, cleared.envelope);
  const loaded = M.loadEnvelope(storage);
  assert.equal(loaded.status, 'restored');
  assert.deepEqual(M.itemDetails(loaded.envelope.state, id), M.itemDetails(cleared.envelope.state, id));
  for (const [key, value] of Object.entries(operating)) assert.equal(storage.snapshot()[key], value);
  assert.equal(storage.calls.filter(call => ['setItem', 'removeItem', 'clear'].includes(call[0]) && !String(call[1]).startsWith('flow:poc:personal-workspace:v1:')).length, 0);
});

test('P3-J malformed detail metadata or foreign Item binding fail closed without writes', () => {
  for (const mutate of [
    task => { task.sourceDescription = { text: '잘못된 값' }; },
    task => { task.completionCriterion = 42; },
    task => { task.sourceProperties = { '완료 기준': ['잘못된 값'] }; },
    task => { task.sourceLine = -1; },
    task => { task.ref = 'flow-item:foreign-copy:flow-moving:item-quote'; },
  ]) {
    const envelope = M.initialEnvelope();
    mutate(stateTask(envelope.state, 'quote'));
    const bytes = JSON.stringify(envelope);
    const storage = M.createMemoryStorage({ [M.STORAGE_KEY]: bytes });
    assert.equal(M.loadEnvelope(storage).status, 'corrupt');
    assert.equal(M.transitionEnvelope(envelope, { type: 'schedule', id: 'quote', date: M.TODAY }).changed, false);
    assert.equal(storage.snapshot()[M.STORAGE_KEY], bytes);
    assert.equal(storage.calls.some(call => ['setItem', 'removeItem', 'clear'].includes(call[0])), false);
  }
});

test('one staged personal-plan commit preserves source and drives all four result projections', () => {
  const before = M.initialEnvelope();
  const flow = stateFlow(before.state, 'moving');
  const sourceTitle = flow.sourceTitle;
  const sourceItemTitle = stateTask(before.state, 'quote').sourceTitle;
  const committed = M.transitionEnvelope(before, {
    type: 'commit-personal-plan',
    flowId: 'moving',
    title: '내 이사 준비',
    items: [
      { id: 'quote', title: '내 견적 비교', memo: '세 곳에 같은 조건으로 요청', planDate: '2026-09-08' },
      { id: 'contract', title: '계약 확인', memo: '', planDate: null }
    ]
  });
  assert.equal(committed.changed, true);
  assert.equal(committed.envelope.state.revision, before.state.revision + 1);
  assert.equal(stateFlow(committed.envelope.state, 'moving').sourceTitle, sourceTitle);
  assert.equal(stateTask(committed.envelope.state, 'quote').sourceTitle, sourceItemTitle);
  assert.equal(stateTask(committed.envelope.state, 'quote').sourceDate, null);
  const scheduled = M.transitionEnvelope(committed.envelope, { type: 'schedule', id: 'quote', date: '2026-09-09' });
  const projection = M.resultProjection(scheduled.envelope.state, 'moving');
  assert.deepEqual(projection.itemRefs, projection.todo);
  assert.deepEqual(projection.itemRefs, projection.items.map(item => item.ref));
  assert.equal(projection.items[0].date, '2026-09-08');
  assert.equal(projection.items[0].executionDate, '2026-09-09');
  assert.deepEqual(projection.calendar['2026-09-09'], [projection.itemRefs[0]]);
  assert.equal((projection.calendar['2026-09-08'] || []).includes(projection.itemRefs[0]), false);
  assert.equal(projection.sheet[0].planDate, '2026-09-08');
  assert.equal(projection.sheet[0].executionDate, '2026-09-09');
  assert.match(projection.textLines.join('\n'), /내 이사 준비[\s\S]*내 견적 비교[\s\S]*계획 날짜: 2026-09-08[\s\S]*메모: 세 곳/u);
  assert.match(projection.txt, /1\. ☐ 내 견적 비교/u);
  const undone = M.undoEnvelope(committed.envelope);
  assert.equal(undone.changed, true);
  assert.equal(stateFlow(undone.envelope.state, 'moving').title, '이사 준비 저장본');
  assert.equal(stateTask(undone.envelope.state, 'quote').title, '견적 3곳 비교');
});

test('personal-plan rejects foreign or malformed staged values with zero mutation', () => {
  const envelope = M.initialEnvelope();
  const before = JSON.stringify(envelope);
  const result = M.transitionEnvelope(envelope, {
    type: 'commit-personal-plan',
    flowId: 'moving',
    title: '개인 제목',
    items: [{ id: 'call', title: '빠른 할 일 침범', memo: '', planDate: null }]
  });
  assert.equal(result.changed, false);
  assert.equal(result.error, 'invalid-plan-items');
  assert.equal(JSON.stringify(result.envelope), before);
});

test('QuickItem detail edit uses one dedicated transition and remains undoable', () => {
  const before = M.initialEnvelope();
  const edited = M.transitionEnvelope(before, {
    type: 'update-quick',
    id: 'call',
    title: '관리실 엘리베이터 예약',
    memo: '오전 10시 사용 가능 여부 확인',
    date: '2026-09-04',
    folderId: 'admin',
  });
  assert.equal(edited.changed, true);
  assert.deepEqual(
    (({ title, memo, date, folderId }) => ({ title, memo, date, folderId }))(stateTask(edited.envelope.state, 'call')),
    {
      title: '관리실 엘리베이터 예약',
      memo: '오전 10시 사용 가능 여부 확인',
      date: '2026-09-04',
      folderId: 'admin',
    },
  );
  assert.equal(edited.envelope.state.revision, before.state.revision + 1);
  assert.equal(M.undoEnvelope(edited.envelope).envelope.state.tasks.find(task => task.id === 'call').title, '관리실에 전화');

  const rejected = M.transitionEnvelope(before, {
    type: 'update-quick',
    id: 'quote',
    title: 'Flow Item 침범',
    memo: '',
    date: null,
    folderId: null,
  });
  assert.equal(rejected.changed, false);
  assert.equal(rejected.error, 'invalid-quick-item');
  assert.equal(rejected.envelope, before);
});

test('same position and order are no-op transitions', () => {
  const envelope = M.initialEnvelope();
  const sameDate = M.transitionEnvelope(envelope, { type: 'schedule', id: 'meeting', date: M.TODAY });
  assert.equal(sameDate.changed, false);
  assert.equal(sameDate.envelope, envelope);
  const ids = M.viewTaskIds(envelope.state, 'today');
  const sameOrder = M.transitionEnvelope(envelope, { type: 'reorder', context: 'today', ids });
  assert.equal(sameOrder.changed, false);
  assert.equal(sameOrder.envelope, envelope);
});

test('manual order stays scoped to its exact view', () => {
  const envelope = M.initialEnvelope();
  const today = M.viewTaskIds(envelope.state, 'today');
  const weekBefore = M.viewTaskIds(envelope.state, 'week');
  const reordered = M.transitionEnvelope(envelope, { type: 'reorder', context: 'today', ids: today.slice().reverse() });
  assert.deepEqual(M.viewTaskIds(reordered.envelope.state, 'today'), today.slice().reverse());
  assert.deepEqual(M.viewTaskIds(reordered.envelope.state, 'week'), weekBefore);
  const app = fs.readFileSync(appPath, 'utf8');
  assert.match(app, /function renderMovePanelBody\(target\)[\s\S]*data-action="move-up"[\s\S]*data-action="move-down"/u);
  assert.match(app, /return transition\(\{ type: 'reorder', context, ids: reordered \}\)/u);
  assert.match(app, /event\.altKey[\s\S]*moveOrder/u);
  assert.match(app, /reorderAtPosition\(dragged\.id, row\.dataset\.taskId, row\.dataset\.context, row\.dataset\.dropPosition === 'after' \? 'after' : 'before'\)/u);
  assert.match(app, /class="drag-handle"[\s\S]*draggable="true"/u);
  assert.doesNotMatch(app, /class="task-row[^\n]*draggable="true"/u);
  assert.match(app, /closest\('\.drag-handle\[draggable="true"\]'\)/u);
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(style, /\.drag-handle \{[^}]*width: 48px;[^}]*min-width: 48px;[^}]*height: 48px;/u);
  assert.match(style, /\.task-row \{[^}]*touch-action: pan-y;/u);
});

test('move menu restores top and bottom actions through the same reorder transition', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  assert.match(app, /data-action="move-top"[\s\S]*>맨 위<\/button>[\s\S]*data-action="move-up"[\s\S]*data-action="move-down"[\s\S]*data-action="move-bottom"[\s\S]*>맨 아래<\/button>/u);
  assert.match(app, /function moveOrderToEdge\(id, context, edge\)[\s\S]*edge === 'top' \? 0 : ids\.length - 1[\s\S]*commitPeerOrder\(context, ids, reordered\)/u);
  assert.match(app, /function commitPeerOrder\(context, peerIds, reorderedPeers\)[\s\S]*return transition\(\{ type: 'reorder', context, ids: reordered \}\)/u);
  assert.match(app, /action === 'move-top'[\s\S]*moveOrderToEdge\([^)]*'top'\)[\s\S]*action === 'move-bottom'[\s\S]*moveOrderToEdge\([^)]*'bottom'\)/u);
});

test('month timeline gives every visible date an accessible QuickItem entry point', () => {
  const date = M.addDays(M.TODAY, 6);
  const added = M.transitionEnvelope(M.initialEnvelope(), { type: 'add-quick', title: '날짜별 추가', date, folderId: null });
  const quick = added.envelope.state.tasks.find(task => task.title === '날짜별 추가');
  assert.equal(quick.date, date);
  assert.equal(M.viewTaskIds(added.envelope.state, 'month').includes(quick.id), true);

  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /function renderMonthTaskGroups\(projection\)[\s\S]*showEmptyMonthDates \? projection\.range\.dates : projection\.groups/u);
  assert.match(app, /function renderTimelineGroup\(group, allowAdd\)[\s\S]*class="month-date-add"[\s\S]*data-action="add-quick" data-date=[\s\S]*group\.contextKey/u);
  assert.match(app, /class="period-day"[\s\S]*aria-labelledby=[\s\S]*headingId/u);
  assert.match(app, /dates\.map\(date => renderTimelineGroup\(byDate\.get\(date\) \|\| emptyTimelineGroup\(date\), true\)\)/u);
  assert.match(app, /할 일 없는 날짜 ' \+ emptyDateCount \+ '일 보기/u);
  assert.match(app, /action === 'toggle-empty-month'[\s\S]*showEmptyMonthDates = !showEmptyMonthDates[\s\S]*빈 날짜를 펼쳤어요/u);
  assert.match(style, /\.month-date-add, \.month-empty-toggle \{[^}]*min-height: 44px;/u);
});

test('desktop reorder corridor exposes before and after lines, live position copy, and edge auto-scroll', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /function reorderAtPosition\(sourceId, targetId, context, position\)[\s\S]*position === 'after' \? targetIndex \+ 1 : targetIndex/u);
  assert.match(app, /function dropPosition\(row, clientY\)[\s\S]*bounds\.top \+ bounds\.height \/ 2 \? 'after' : 'before'/u);
  assert.match(app, /function showDropPosition\(row, position\)[\s\S]*position === 'after' \? 'drop-after' : 'drop-before'[\s\S]*아직 저장 안 됨/u);
  assert.match(app, /function updateDragAutoScroll\(clientY\)[\s\S]*prefers-reduced-motion: reduce[\s\S]*if \(reducedMotion\) \{[\s\S]*stopDragAutoScroll\(\);[\s\S]*return;[\s\S]*requestAnimationFrame\(runDragAutoScroll\)/u);
  assert.match(app, /dragged\.list\.classList\.add\('reorder-corridor'\)/u);
  assert.match(app, /if \(dragged\) updateDragAutoScroll\(event\.clientY\)/u);
  assert.match(app, /event\.key === 'Escape' && \(dragged \|\| pointerOrigin \|\| longPressTimer !== null\)[\s\S]*cancelActiveMoveInteraction\('이동을 취소했어요\.'/u);
  assert.match(app, /window\.addEventListener\('blur'[\s\S]*cancelActiveMoveInteraction\('이동을 취소했어요\.'/u);
  assert.match(app, /window\.addEventListener\('resize'[\s\S]*cancelActiveMoveInteraction\('화면 크기가 바뀌어 이동을 취소했어요\.'/u);
  assert.match(app, /document\.addEventListener\('visibilitychange'[\s\S]*document\.hidden[\s\S]*cancelActiveMoveInteraction\('이동을 취소했어요\.'/u);
  assert.match(app, /목록 순서는 오른쪽 손잡이 통로에서 바꿉니다/u);
  assert.match(style, /\.task-list\.reorder-corridor \{[^}]*outline:/u);
  assert.match(style, /\.task-row\.drop-before::before, \.task-row\.drop-after::after \{[^}]*height: 3px;/u);
  assert.match(style, /\.task-row\.drop-before::before \{ top: -2px; \}/u);
  assert.match(style, /\.task-row\.drop-after::after \{ bottom: -2px; \}/u);
});

test('touch order menu starts only on the handle and canceled gestures suppress one follow-up click', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /class="drag-handle"[\s\S]*data-id=[\s\S]*data-context=[\s\S]*aria-describedby=/u);
  assert.match(app, /const handle = event\.target\.closest\('\.drag-handle'\);[\s\S]*openMovePanel\(handle\.dataset\.moveKind, handle\.dataset\.id, handle\.dataset\.context, handle, true\)/u);
  assert.match(app, /class="visually-hidden">손잡이를 짧게 누르거나 Enter 또는 Space/u);
  assert.match(app, /350밀리초 길게 누르거나 마우스로 끌어도 같은 이동 대상을 사용합니다/u);
  assert.match(app, /8픽셀 전에 움직이거나 목록 밖에 놓거나 Escape, pointer cancel, 창 이탈, 화면 크기 변경/u);
  assert.match(app, /const LONG_PRESS_DELAY_MS = 350/u);
  assert.match(app, /const LONG_PRESS_CANCEL_DISTANCE_PX = 8/u);
  assert.match(app, /event\.target\.closest\('\.drag-handle'\)/u);
  assert.doesNotMatch(app, /event\.target\.closest\('\.task-row'\)[\s\S]{0,240}setTimeout/u);
  assert.match(app, /const distance = Math\.hypot\([\s\S]*pointerOrigin\.phase === 'armed' && distance >= LONG_PRESS_CANCEL_DISTANCE_PX/u);
  assert.match(app, /document\.addEventListener\('pointercancel'[\s\S]*event\.pointerType === 'mouse' && event\.isTrusted[\s\S]*suppressNextHandleClick\(handle\)[\s\S]*cancelActiveMoveInteraction\('이동을 취소했어요\.'/u);
  assert.match(app, /document\.addEventListener\('touchcancel'[\s\S]*cancelActiveMoveInteraction\('터치 이동을 취소했어요\.'/u);
  assert.match(app, /document\.addEventListener\('lostpointercapture'[\s\S]*cancelActiveMoveInteraction\('터치 이동을 취소했어요\.'/u);
  assert.match(app, /document\.addEventListener\('scroll'[\s\S]*pointerOrigin\.phase === 'active' \? '스크롤로 이동을 취소했어요\.' : '스크롤로 누르기 취소'[\s\S]*cancelActiveMoveInteraction\(message[\s\S]*\}, true\)/u);
  assert.match(app, /consumeSuppressedHandleClick\(handle\)[\s\S]*event\.stopImmediatePropagation\(\)/u);
  assert.match(app, /suppressedHandleClick = null;[\s\S]*return true;/u);
  assert.match(app, /function finishDrag\(\)[\s\S]*stopDragAutoScroll\(\)[\s\S]*classList\.remove\('dragging', 'drop-target', 'drop-before', 'drop-after', 'reorder-corridor'\)[\s\S]*dragged = null/u);
  assert.match(app, /finally \{[\s\S]*finishDrag\(\)/u);
  assert.match(app, /document\.addEventListener\('dragend', \(\) => \{[\s\S]*이동을 취소했어요[\s\S]*finishDrag\(\)/u);
  assert.match(style, /\.visually-hidden \{[^}]*clip: rect\(0 0 0 0\)/u);
  assert.match(style, /\.drag-handle \{[^}]*touch-action: none;[^}]*user-select: none;/u);
});

test('standalone movement uses one left nonmodal panel for Task and Flow with neutral and zero-write exits', () => {
  const shell = fs.readFileSync(shellPath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(shell, /<aside[\s\S]*id="move-panel"[\s\S]*role="dialog"[\s\S]*aria-modal="false"[\s\S]*hidden/u);
  assert.match(shell, /class="move-panel-kicker">이동할 곳</u);
  assert.match(shell, /id="save-status"[^>]*role="status"[^>]*aria-live="polite"/u);
  assert.match(shell, /id="move-panel-status"[^>]*aria-live="off"/u);
  assert.match(shell, /id="toast"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/u);
  assert.match(shell, /id="toast-retry"[^>]*data-action="retry"/u);
  assert.equal((shell.match(/aria-live="polite"/gu) || []).length, 2);
  assert.match(shell, /<dialog id="dialog"/u);
  assert.match(style, /\.move-panel \{[\s\S]*position: fixed;[\s\S]*left: calc\(var\(--standalone-visual-viewport-left\) \+ var\(--standalone-safe-left\)\);[\s\S]*width: min\(300px, calc\(var\(--standalone-visual-viewport-width\) - 168px[\s\S]*overflow-y: auto;/u);
  assert.match(style, /\.move-panel\[hidden\] \{ display: none; \}/u);
  assert.match(style, /\.move-destination\[aria-current="true"\][^}]*background: var\(--surface-soft\)/u);
  assert.match(style, /\.move-panel-head \.icon-button \{ min-width: 48px; min-height: 48px; \}/u);
  assert.match(style, /\.move-destination \{ min-height: 48px;/u);

  assert.match(app, /data-move-kind="task"[\s\S]*aria-controls="move-panel"[\s\S]*aria-expanded=/u);
  assert.match(app, /data-move-kind="flow"[\s\S]*aria-controls="move-panel"[\s\S]*aria-expanded=/u);
  assert.match(app, /function openMovePanel\(kind, id, context, opener, focusPanel\)/u);
  assert.match(app, /action === 'task-menu'\) openTaskMenu\([^;]*control, true\)/u);
  assert.match(app, /action === 'flow-menu'\) openFlowMenu\([^;]*control, true\)/u);
  assert.match(app, /moveHandle && \(event\.key === 'Enter' \|\| event\.key === ' '\)[\s\S]*openMovePanel\(/u);
  assert.match(app, /document\.addEventListener\('dragstart'[\s\S]*openMovePanel\(kind, id, row\.dataset\.context, handle, false\)/u);
  assert.match(app, /window\.setTimeout\([\s\S]*openMovePanel\(gesture\.kind, gesture\.id, gesture\.context, gesture\.handle, false\)[\s\S]*LONG_PRESS_DELAY_MS/u);

  assert.match(app, /data-move-destination="folder"[\s\S]*data-current="' \+ current/u);
  assert.match(app, /data-move-destination="date"[\s\S]*data-current="' \+ current/u);
  assert.match(app, /const changed = transition\(\{ type: 'move-folder', kind: moveTarget\.kind, id: moveTarget\.id, folderId \}\)/u);
  assert.match(app, /const changed = transition\(\{ type: 'schedule', id: moveTarget\.id, date: control\.dataset\.date \|\| null \}\)/u);
  assert.match(app, /이미 같은 위치입니다\./u);
  assert.match(app, /Flow Item의 폴더는 부모 Flow와 함께 이동합니다\./u);
  assert.match(app, /event\.key === 'Escape' && movePanelOpen\(\)[\s\S]*이동을 취소했어요/u);
  assert.match(app, /document\.addEventListener\('pointercancel'[\s\S]*이동을 취소했어요/u);
  assert.match(app, /window\.addEventListener\('blur'[\s\S]*이동을 취소했어요/u);
  assert.match(app, /window\.addEventListener\('resize'[\s\S]*화면 크기가 바뀌어 이동을 취소했어요/u);
  const cancelSection = app.slice(app.indexOf("if (event.key === 'Escape' && movePanelOpen())"), app.indexOf("document.addEventListener('pointerdown'"));
  assert.doesNotMatch(cancelSection, /transition\(|writeCandidate\(|M\.writeEnvelope/u);
});

test('folder deletion keeps content and moves it to unfiled', () => {
  let envelope = M.initialEnvelope();
  envelope = M.transitionEnvelope(envelope, { type: 'move-folder', kind: 'flow', id: 'moving', folderId: 'move' }).envelope;
  const deleted = M.transitionEnvelope(envelope, { type: 'delete-folder', id: 'move' });
  assert.equal(deleted.changed, true);
  assert.equal(stateFlow(deleted.envelope.state, 'moving').folderId, null);
  assert.equal(deleted.envelope.state.folders.some(folder => folder.id === 'move'), false);
  assert.equal(deleted.envelope.state.folders.find(folder => folder.id === 'admin').parentId, null);
  assert.deepEqual(M.validate(deleted.envelope.state), []);
});

test('write, reload and exact reset preserve seeded operating bytes', () => {
  const operating = {
    'flow:saved:plans': '{"opaque":true,"spacing":"kept"}',
    'flow:canonical:bundle': '00ff\nraw',
    'another:key': 'unchanged'
  };
  const storage = M.createMemoryStorage(operating);
  const before = storage.snapshot();
  const envelope = M.transitionEnvelope(M.initialEnvelope(), { type: 'complete', id: 'meeting', done: true }).envelope;
  M.writeEnvelope(storage, envelope);
  const restored = M.loadEnvelope(storage);
  assert.equal(restored.status, 'restored');
  assert.equal(stateTask(restored.envelope.state, 'meeting').done, true);
  Object.keys(operating).forEach(key => assert.equal(storage.snapshot()[key], before[key]));
  M.writeAuthoringDraft(storage, {
    draftId: 'draft-reset',
    rawText: '# 작성 중',
    templateId: 'moving-dday-v1',
    folderId: 'move'
  });
  const creatorLibrary = M.transitionCreatorDraftLibrary(M.initialCreatorDraftLibrary(), {
    type: 'save', draftId: 'creator-reset', rawText: '# 보관 초안', templateId: null
  }).library;
  M.writeCreatorDraftLibrary(storage, creatorLibrary);
  const mutatingCalls = storage.calls.filter(call => call[0] === 'setItem' || call[0] === 'removeItem');
  assert.equal(mutatingCalls.every(call => call[1] === M.STORAGE_KEY || call[1] === M.DRAFT_STORAGE_KEY || call[1] === M.CREATOR_DRAFT_STORAGE_KEY || call[1] === M.SOURCE_CANDIDATE_STORAGE_KEY), true);
  M.resetPoc(storage);
  assert.equal(storage.snapshot()[M.STORAGE_KEY], undefined);
  assert.equal(storage.snapshot()[M.DRAFT_STORAGE_KEY], undefined);
  assert.equal(storage.snapshot()[M.CREATOR_DRAFT_STORAGE_KEY], undefined);
  assert.equal(storage.snapshot()[M.SOURCE_CANDIDATE_STORAGE_KEY], undefined);
  assert.deepEqual(storage.snapshot(), operating);
});

test('authoring commit writes state and removes its draft as one exact two-key transaction', () => {
  const operating = { 'flow:saved:plans': '  keep exact bytes  ' };
  const storage = M.createMemoryStorage(operating);
  M.writeAuthoringDraft(storage, {
    draftId: 'draft-atomic',
    rawText: validSource(),
    templateId: null,
    folderId: null
  });
  const result = M.transitionEnvelope(M.initialEnvelope(), {
    type: 'commit-authoring',
    handoff: confirmedHandoff({ handoffId: undefined })
  });
  assert.equal(result.changed, true);
  const bytes = M.writeAuthoringCommit(storage, result.envelope);
  assert.equal(storage.snapshot()[M.STORAGE_KEY], bytes);
  assert.equal(storage.snapshot()[M.DRAFT_STORAGE_KEY], undefined);
  assert.equal(storage.snapshot()['flow:saved:plans'], operating['flow:saved:plans']);
  const mutations = storage.calls.filter(call => call[0] === 'setItem' || call[0] === 'removeItem');
  assert.equal(mutations.every(call => call[1] === M.STORAGE_KEY || call[1] === M.DRAFT_STORAGE_KEY || call[1] === M.CREATOR_DRAFT_STORAGE_KEY || call[1] === M.SOURCE_CANDIDATE_STORAGE_KEY), true);
});

test('authoring commit restores both exact bytes when draft cleanup fails', () => {
  const beforeState = JSON.stringify(M.initialEnvelope());
  const beforeDraft = '{"version":1,"draftId":"draft-before","rawText":"# before","templateId":null,"folderId":null}';
  const operatingKey = 'flow:saved:plans';
  const values = new Map([
    [M.STORAGE_KEY, beforeState],
    [M.DRAFT_STORAGE_KEY, beforeDraft],
    [operatingKey, '  operating bytes  ']
  ]);
  let failDraftRemove = true;
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) {
      if (key === M.DRAFT_STORAGE_KEY && failDraftRemove) {
        failDraftRemove = false;
        throw new Error('blocked-draft-cleanup');
      }
      values.delete(key);
    }
  };
  const result = M.transitionEnvelope(M.initialEnvelope(), {
    type: 'commit-authoring',
    handoff: confirmedHandoff({ handoffId: undefined })
  });
  assert.throws(() => M.writeAuthoringCommit(storage, result.envelope), /blocked-draft-cleanup/u);
  assert.equal(values.get(M.STORAGE_KEY), beforeState);
  assert.equal(values.get(M.DRAFT_STORAGE_KEY), beforeDraft);
  assert.equal(values.get(operatingKey), '  operating bytes  ');
});

test('authoring draft restores raw text and template without persisting UI or manual history ownership', () => {
  const storage = M.createMemoryStorage({ 'flow:saved:plans': 'keep-bytes' });
  const draft = {
    draftId: 'draft-reload',
    rawText: '# 작성 중 Flow\n\n## 준비\n- [ ] 확인',
    templateId: 'moving-dday-v1',
    templatePickerOpen: true,
    sourceConfirmed: true,
    folderId: 'move'
  };
  const bytes = M.writeAuthoringDraft(storage, draft);
  assert.equal(storage.snapshot()[M.DRAFT_STORAGE_KEY], bytes);
  const restored = M.loadAuthoringDraft(storage);
  assert.equal(restored.status, 'restored');
  assert.equal(restored.authoring.rawText, draft.rawText);
  assert.equal(restored.authoring.templateId, draft.templateId);
  assert.equal(restored.authoring.folderId, 'move');
  assert.equal(restored.authoring.sourceConfirmed, false);
  assert.equal(restored.authoring.templatePickerOpen, false);
  assert.equal(Object.prototype.hasOwnProperty.call(restored.authoring, 'templateEditHistory'), false);
  assert.equal(bytes.includes('templateEditHistory'), false);
  assert.equal(storage.snapshot()['flow:saved:plans'], 'keep-bytes');
  assert.equal(storage.calls.filter(call => call[0] === 'setItem' || call[0] === 'removeItem').every(call => call[1] === M.DRAFT_STORAGE_KEY), true);
});

test('corrupt authoring draft fails closed without mutation', () => {
  const corrupt = '{broken-draft';
  const storage = M.createMemoryStorage({ [M.DRAFT_STORAGE_KEY]: corrupt, 'flow:saved:plans': 'exact' });
  const result = M.loadAuthoringDraft(storage);
  assert.equal(result.status, 'corrupt');
  assert.equal(result.authoring, null);
  assert.equal(storage.snapshot()[M.DRAFT_STORAGE_KEY], corrupt);
  assert.equal(storage.snapshot()['flow:saved:plans'], 'exact');
  assert.equal(storage.calls.some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);
});

test('CreatorDraft save, reload, search and open pointer stay separate from the working authoring draft', () => {
  const source = '# 여행 준비\r\n\r\n## 예약\r\n- [ ] 숙소 확인\r\n\r\n원문 메모';
  const saved = M.transitionCreatorDraftLibrary(M.initialCreatorDraftLibrary(), {
    type: 'save',
    draftId: 'creator-a',
    rawText: source,
    templateId: 'travel-itinerary-prep-v1',
    now: '2026-09-03T01:02:03.000Z'
  });
  assert.equal(saved.changed, true);
  assert.equal(saved.library.version, 1);
  assert.equal(saved.library.drafts[0].draftId, 'creator-a');
  assert.equal(saved.library.drafts[0].owner, 'creator');
  assert.equal(saved.library.drafts[0].title, '여행 준비');
  assert.equal(saved.library.drafts[0].rawText, source);
  assert.equal(saved.library.drafts[0].sourceFingerprint, M.fingerprint(source));
  assert.equal(saved.library.drafts[0].status, 'active');
  assert.equal(saved.library.drafts[0].recordRevision, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(saved.library.drafts[0], 'folderId'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(saved.library.drafts[0], 'displayName'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(saved.library.drafts[0], 'revision'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(saved.library.drafts[0], 'archivedAt'), false);
  assert.equal(M.validCreatorDraftLibrary(saved.library), true);

  const storage = M.createMemoryStorage({ 'flow:saved:plans': ' exact operating bytes ' });
  const libraryBytes = M.writeCreatorDraftLibrary(storage, saved.library);
  assert.equal(storage.snapshot()[M.CREATOR_DRAFT_STORAGE_KEY], libraryBytes);
  assert.equal(storage.snapshot()[M.DRAFT_STORAGE_KEY], undefined);
  assert.equal(M.loadCreatorDraftLibrary(storage).status, 'restored');
  assert.equal(M.listCreatorDrafts(saved.library, { query: '숙소', archived: false })[0].draftId, 'creator-a');
  assert.equal(M.listCreatorDrafts(saved.library, { query: '여행 준비', archived: false })[0].rawText, source);
  assert.deepEqual(M.listCreatorDrafts(saved.library, { query: '없는 검색', archived: false }), []);

  M.writeAuthoringDraft(storage, {
    draftId: 'working-creator-a',
    rawText: source,
    templateId: 'travel-itinerary-prep-v1',
    folderId: 'move',
    creatorDraftId: 'creator-a',
    creatorDraftRevision: 1
  });
  const opened = M.loadAuthoringDraft(storage);
  assert.equal(opened.status, 'restored');
  assert.equal(opened.authoring.creatorDraftId, 'creator-a');
  assert.equal(opened.authoring.creatorDraftRevision, 1);
  assert.equal(opened.authoring.rawText, source);
  assert.equal(storage.snapshot()['flow:saved:plans'], ' exact operating bytes ');
});

test('CreatorDraft source label projects the first exact http(s) URL without storing source metadata', () => {
  const linkedSource = '# 출처 확인\n- 잘못된 후보: https://\n- 참고: [원문](https://first.example/path?q=한글)\n- 보조: http://second.example/ignored';
  const directSource = '# 직접 작성\n\n- [ ] 확인';
  assert.equal(M.creatorDraftSourceLabel(linkedSource), 'https://first.example/path?q=한글');
  assert.equal(M.creatorDraftSourceLabel(directSource), '직접 작성한 원문');

  let library = M.transitionCreatorDraftLibrary(M.initialCreatorDraftLibrary(), {
    type: 'save', draftId: 'creator-linked', rawText: linkedSource, templateId: null
  }).library;
  library = M.transitionCreatorDraftLibrary(library, {
    type: 'save', draftId: 'creator-direct', rawText: directSource, templateId: null
  }).library;
  assert.equal(M.listCreatorDrafts(library, { query: 'first.example', archived: false })[0].draftId, 'creator-linked');
  assert.equal(M.listCreatorDrafts(library, { query: '직접 작성한 원문', archived: false })[0].draftId, 'creator-direct');
  library.drafts.forEach(draft => assert.equal(Object.prototype.hasOwnProperty.call(draft, 'sourceLabel'), false));
  assert.equal(JSON.stringify(library).includes('sourceLabel'), false);
});

test('CreatorDraft rename, clone, archive, restore and undo preserve raw source bytes', () => {
  const source = '# 원문 제목\n\n## 준비\n- [ ] 확인\n일반 문장';
  let library = M.transitionCreatorDraftLibrary(M.initialCreatorDraftLibrary(), {
    type: 'save', draftId: 'creator-a', rawText: source, templateId: null, now: '2026-09-03T01:00:00.000Z'
  }).library;
  const renamed = M.transitionCreatorDraftLibrary(library, {
    type: 'rename', draftId: 'creator-a', expectedRevision: 1, displayName: '표시 이름', now: '2026-09-03T02:00:00.000Z'
  });
  assert.equal(renamed.changed, true);
  assert.equal(M.creatorDraftById(renamed.library, 'creator-a').title, '표시 이름');
  assert.equal(M.creatorDraftById(renamed.library, 'creator-a').rawText, source);
  assert.equal(M.creatorDraftById(renamed.library, 'creator-a').recordRevision, 2);
  library = renamed.library;

  const cloned = M.transitionCreatorDraftLibrary(library, {
    type: 'clone', draftId: 'creator-a', expectedRevision: 2, newDraftId: 'creator-copy', now: '2026-09-03T03:00:00.000Z'
  });
  assert.equal(cloned.changed, true);
  const copy = M.creatorDraftById(cloned.library, 'creator-copy');
  assert.equal(copy.title, '사본 1 · 표시 이름');
  assert.equal(copy.rawText, source);
  assert.equal(copy.owner, 'creator');
  assert.equal(copy.sourceFingerprint, M.fingerprint(source));
  assert.equal(copy.status, 'active');
  assert.equal(copy.recordRevision, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(copy, 'archivedAt'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(copy, 'folderId'), false);
  assert.deepEqual(copy.clonedFrom, { draftId: 'creator-a', recordRevision: 2 });
  assert.equal(M.validCreatorDraftLibrary(cloned.library), true);
  const secondClone = M.transitionCreatorDraftLibrary(cloned.library, {
    type: 'clone', draftId: 'creator-a', expectedRevision: 2, newDraftId: 'creator-copy-2', now: '2026-09-03T03:30:00.000Z'
  });
  assert.equal(M.creatorDraftById(secondClone.library, 'creator-copy-2').title, '사본 2 · 표시 이름');
  assert.deepEqual(M.creatorDraftById(secondClone.library, 'creator-copy-2').clonedFrom, { draftId: 'creator-a', recordRevision: 2 });
  library = secondClone.library;

  const archived = M.transitionCreatorDraftLibrary(library, {
    type: 'archive', draftId: 'creator-copy', expectedRevision: 1, now: '2026-09-03T04:00:00.000Z'
  });
  assert.equal(archived.changed, true);
  assert.deepEqual(M.listCreatorDrafts(archived.library, { archived: true }).map(draft => draft.draftId), ['creator-copy']);
  assert.equal(M.creatorDraftById(archived.library, 'creator-copy').status, 'archived');
  assert.equal(M.creatorDraftById(archived.library, 'creator-copy').archivedAt, '2026-09-03T04:00:00.000Z');
  const restored = M.transitionCreatorDraftLibrary(archived.library, {
    type: 'restore', draftId: 'creator-copy', expectedRevision: 2, now: '2026-09-03T05:00:00.000Z'
  });
  assert.equal(restored.changed, true);
  assert.equal(M.creatorDraftById(restored.library, 'creator-copy').status, 'active');
  assert.equal(Object.prototype.hasOwnProperty.call(M.creatorDraftById(restored.library, 'creator-copy'), 'archivedAt'), false);
  const undone = M.transitionCreatorDraftLibrary(restored.library, { type: 'undo' });
  assert.equal(undone.changed, true);
  assert.equal(M.creatorDraftById(undone.library, 'creator-copy').status, 'archived');
  assert.equal(M.creatorDraftById(undone.library, 'creator-copy').archivedAt, '2026-09-03T04:00:00.000Z');
  assert.equal(M.creatorDraftById(undone.library, 'creator-copy').rawText, source);
  assert.deepEqual(M.creatorDraftById(undone.library, 'creator-copy').clonedFrom, { draftId: 'creator-a', recordRevision: 2 });
  assert.equal(undone.library.undo, null);
});

test('CreatorDraft same-value, same-state, cancel paths and stale revisions produce zero storage mutation', () => {
  const source = '# 같은 초안\n\n- [ ] 확인';
  let library = M.transitionCreatorDraftLibrary(M.initialCreatorDraftLibrary(), {
    type: 'save', draftId: 'creator-same', rawText: source, templateId: null, now: '2026-09-03T01:00:00.000Z'
  }).library;
  const storage = M.createMemoryStorage({ [M.CREATOR_DRAFT_STORAGE_KEY]: JSON.stringify(library), 'flow:saved:plans': 'keep' });
  const callsBefore = storage.calls.length;
  const sameSave = M.transitionCreatorDraftLibrary(library, {
    type: 'save', draftId: 'creator-same', expectedRevision: 1, rawText: source, templateId: null, folderId: 'personal-folder-is-not-creator-owned', now: '2026-09-03T02:00:00.000Z'
  });
  const sameRename = M.transitionCreatorDraftLibrary(library, {
    type: 'rename', draftId: 'creator-same', expectedRevision: 1, displayName: '같은 초안', now: '2026-09-03T02:00:00.000Z'
  });
  const alreadyActive = M.transitionCreatorDraftLibrary(library, {
    type: 'restore', draftId: 'creator-same', expectedRevision: 1, now: '2026-09-03T02:00:00.000Z'
  });
  const stale = M.transitionCreatorDraftLibrary(library, {
    type: 'rename', draftId: 'creator-same', expectedRevision: 99, displayName: '충돌', now: '2026-09-03T02:00:00.000Z'
  });
  const noUndo = M.transitionCreatorDraftLibrary(M.initialCreatorDraftLibrary(), { type: 'undo' });
  [sameSave, sameRename, alreadyActive, stale, noUndo].forEach(result => assert.equal(result.changed, false));
  assert.equal(stale.error, 'stale-draft');
  assert.equal(storage.calls.slice(callsBefore).some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);
  assert.equal(storage.snapshot()['flow:saved:plans'], 'keep');
});

test('corrupt CreatorDraft payload fails closed without mutation', () => {
  const valid = M.transitionCreatorDraftLibrary(M.initialCreatorDraftLibrary(), {
    type: 'save', draftId: 'creator-valid', rawText: '# 소유권 검증\n- [ ] 확인', templateId: null
  }).library;
  const malformed = { array: { version: 1, revision: 0, drafts: 'not-an-array', undo: null } };
  const wrongOwner = JSON.parse(JSON.stringify(valid));
  wrongOwner.drafts[0].owner = 'personal';
  const wrongFingerprint = JSON.parse(JSON.stringify(valid));
  wrongFingerprint.drafts[0].sourceFingerprint = 'tampered';
  const personalFolder = JSON.parse(JSON.stringify(valid));
  personalFolder.drafts[0].folderId = 'move';
  const wrongStatus = JSON.parse(JSON.stringify(valid));
  wrongStatus.drafts[0].status = 'active';
  wrongStatus.drafts[0].archivedAt = '2026-09-03T01:00:00.000Z';
  const brokenLineage = JSON.parse(JSON.stringify(valid));
  brokenLineage.drafts[0].clonedFrom = { draftId: 'missing-source', recordRevision: 1 };
  const cases = [malformed.array, wrongOwner, wrongFingerprint, personalFolder, wrongStatus, brokenLineage];
  cases.forEach((value, index) => {
    const corrupt = JSON.stringify(value);
    const storage = M.createMemoryStorage({ [M.CREATOR_DRAFT_STORAGE_KEY]: corrupt, 'flow:saved:plans': 'exact-' + index });
    const result = M.loadCreatorDraftLibrary(storage);
    assert.equal(result.status, 'corrupt');
    assert.deepEqual(result.library, M.initialCreatorDraftLibrary());
    assert.equal(storage.snapshot()[M.CREATOR_DRAFT_STORAGE_KEY], corrupt);
    assert.equal(storage.snapshot()['flow:saved:plans'], 'exact-' + index);
    assert.equal(storage.calls.some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);
  });
});

test('CreatorDraft single-key and library-plus-working-draft writes roll back exact prior bytes', () => {
  const source = '# 원자 저장\n\n- [ ] 확인';
  const library = M.transitionCreatorDraftLibrary(M.initialCreatorDraftLibrary(), {
    type: 'save', draftId: 'creator-atomic', rawText: source, templateId: null, now: '2026-09-03T01:00:00.000Z'
  }).library;
  const beforeLibrary = '{"opaque":"creator-before"}';
  const beforeDraft = '{"opaque":"working-before"}';
  const values = new Map([[M.CREATOR_DRAFT_STORAGE_KEY, beforeLibrary], [M.DRAFT_STORAGE_KEY, beforeDraft], ['flow:saved:plans', ' operating ']]);
  let failCreatorOnce = true;
  const singleStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      if (key === M.CREATOR_DRAFT_STORAGE_KEY && failCreatorOnce) { failCreatorOnce = false; throw new Error('creator-quota'); }
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); }
  };
  assert.throws(() => M.writeCreatorDraftLibrary(singleStorage, library), /creator-quota/u);
  assert.equal(values.get(M.CREATOR_DRAFT_STORAGE_KEY), beforeLibrary);

  let failWorkingOnce = true;
  const atomicStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      if (key === M.DRAFT_STORAGE_KEY && failWorkingOnce) { failWorkingOnce = false; throw new Error('working-quota'); }
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); }
  };
  assert.throws(() => M.writeCreatorDraftCommit(atomicStorage, library, {
    draftId: 'working-creator-atomic', rawText: source, templateId: null, folderId: null, creatorDraftId: 'creator-atomic', creatorDraftRevision: 1
  }), /working-quota/u);
  assert.equal(values.get(M.CREATOR_DRAFT_STORAGE_KEY), beforeLibrary);
  assert.equal(values.get(M.DRAFT_STORAGE_KEY), beforeDraft);
  assert.equal(values.get('flow:saved:plans'), ' operating ');
});

test('CreatorDraft UI is a mobile three-tab and desktop-header flat library with explicit reversible actions', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const model = fs.readFileSync(modelPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  const start = app.indexOf('function renderCreatorDraftLibrary');
  const end = app.indexOf('function setAuthoringTemplatePreview', start);
  const creatorUi = app.slice(start, end);
  const ownerPanelStart = app.indexOf('function applyAuthoringOwnerPanel', start);
  const ownerPanelEnd = app.indexOf('function renderAuthoring', ownerPanelStart);
  const ownerPanelUi = app.slice(ownerPanelStart, ownerPanelEnd);
  const saveStart = app.indexOf('function saveCreatorDraft');
  const openStart = app.indexOf('function openCreatorDraft', saveStart);
  const transitionStart = app.indexOf('function transition(action)', openStart);
  const saveCreatorUi = app.slice(saveStart, openStart);
  const openCreatorUi = app.slice(openStart, transitionStart);
  const modelStart = model.indexOf('function validCreatorDraft');
  const modelEnd = model.indexOf('function validAuthoringDraft', modelStart);
  const creatorModel = model.slice(modelStart, modelEnd);
  assert.ok(start >= 0 && end > start);
  assert.match(app, /id="authoring-tab-drafts"/u);
  assert.match(app, /class="button creator-drafts-desktop"/u);
  assert.match(style, /\.authoring-mobile-tabs \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/u);
  assert.match(style, /\.creator-draft-row \{[^}]*border-bottom: 1px solid var\(--line\)[^}]*background: #fff/su);
  assert.match(creatorUi, /id="creator-draft-search"/u);
  assert.match(creatorUi, /placeholder="제목 또는 출처 검색"/u);
  assert.match(creatorUi, /M\.creatorDraftSourceLabel\(draft\.rawText\)/u);
  assert.match(creatorUi, /출처 · /u);
  assert.match(creatorUi, /작성 중 /u);
  assert.match(creatorUi, /보관함 /u);
  assert.match(creatorUi, /이 기기에만 저장/u);
  assert.match(creatorUi, /개인공간이나 공개 화면에는 추가되지 않습니다/u);
  assert.match(creatorUi, />이어서 작성<\/button>/u);
  assert.match(creatorUi, />복제<\/button>/u);
  assert.match(creatorUi, /data-action="open-creator-draft"/u);
  assert.match(creatorUi, /data-action="begin-creator-rename"/u);
  assert.match(creatorUi, /data-action="clone-creator-draft"/u);
  assert.match(creatorUi, /data-action="archive-creator-draft"/u);
  assert.match(creatorUi, /data-action="restore-creator-draft"/u);
  assert.match(creatorUi, /aria-expanded=/u);
  assert.match(creatorUi, /aria-controls="creator-draft-actions-/u);
  assert.match(creatorUi, /원문 제목은 바뀌지 않습니다/u);
  assert.match(app, /event\.key === 'Escape'[\s\S]*creatorDraftRenameId/u);
  assert.match(app, /setSelectionRange\(creatorDraftQuery\.length, creatorDraftQuery\.length\)/u);
  assert.match(app, /M\.writeCreatorDraftCommit\(storage, result\.library, nextAuthoring\)/u);
  assert.match(creatorUi, /draft\.draftId/u);
  assert.match(creatorUi, /draft\.title/u);
  assert.match(creatorUi, /draft\.recordRevision/u);
  assert.doesNotMatch(creatorUi, /draft\.(?:id|displayName|revision|folderId)/u);
  assert.doesNotMatch(saveCreatorUi, /folderId\s*:/u);
  assert.match(openCreatorUi, /folderId: authoring\.folderId \|\| null/u);
  assert.doesNotMatch(openCreatorUi, /draft\.folderId/u);
  assert.match(ownerPanelUi, /제작 초안으로 저장/u);
  assert.match(ownerPanelUi, /제작 초안은 이 기기에만 저장되며 개인공간이나 공개 화면에는 추가되지 않습니다/u);
  assert.match(ownerPanelUi, /제작 초안 결과/u);
  assert.match(ownerPanelUi, /초안 변경 저장/u);
  assert.match(ownerPanelUi, /applyAuthoringOwnerPanel/u);
  assert.doesNotMatch(ownerPanelUi, /authoring-folder|commit-authoring|개인 Flow로 저장/u);
  assert.match(app, /applyAuthoringOwnerPanel\(openedDraft\);/u);
  assert.match(creatorModel, /value\.owner !== 'creator'/u);
  assert.match(creatorModel, /value\.sourceFingerprint !== fingerprint\(value\.rawText\)/u);
  assert.doesNotMatch(creatorModel, /['"]folderId['"]/u);
  assert.doesNotMatch(creatorUi, /role="menu"/u);
  assert.doesNotMatch(creatorUi, /영구 삭제|공개하기|계정/u);
});

test('two-key reset rolls both PoC bytes back when the second removal fails', () => {
  const original = {
    [M.STORAGE_KEY]: JSON.stringify(M.initialEnvelope()),
    [M.DRAFT_STORAGE_KEY]: '{"version":1,"draft":"opaque"}',
    [M.SOURCE_CANDIDATE_STORAGE_KEY]: JSON.stringify(M.initialSourceCandidateStore()),
    'flow:saved:plans': 'operating-exact'
  };
  const memory = M.createMemoryStorage(original);
  let failDraftRemovalOnce = true;
  const storage = {
    getItem(key) { return memory.getItem(key); },
    setItem(key, value) { return memory.setItem(key, value); },
    removeItem(key) {
      if (key === M.DRAFT_STORAGE_KEY && failDraftRemovalOnce) {
        failDraftRemovalOnce = false;
        throw new Error('blocked-second-remove');
      }
      return memory.removeItem(key);
    }
  };
  assert.throws(() => M.resetPoc(storage), /blocked-second-remove/u);
  assert.deepEqual(memory.snapshot(), original);
});

test('corrupt payload fails closed without writing or deleting it', () => {
  const corrupt = '{not-json';
  const storage = M.createMemoryStorage({ [M.STORAGE_KEY]: corrupt, 'flow:saved:plans': 'bytes' });
  const result = M.loadEnvelope(storage);
  assert.equal(result.status, 'corrupt');
  assert.deepEqual(M.validate(result.envelope.state), []);
  assert.equal(storage.snapshot()[M.STORAGE_KEY], corrupt);
  assert.equal(storage.snapshot()['flow:saved:plans'], 'bytes');
  assert.equal(storage.calls.some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);
});

test('storage exception leaves prior bytes unchanged', () => {
  const before = JSON.stringify(M.initialEnvelope());
  const storage = {
    getItem() { return before; },
    setItem() { throw new Error('quota'); },
    removeItem() { throw new Error('rollback blocked'); }
  };
  const candidate = M.transitionEnvelope(M.initialEnvelope(), { type: 'complete', id: 'meeting', done: true }).envelope;
  assert.throws(() => M.writeEnvelope(storage, candidate), /quota/);
  assert.equal(storage.getItem(M.STORAGE_KEY), before);
});

test('standalone sources contain no broad clear or operating writer', () => {
  const model = fs.readFileSync(modelPath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');
  const joined = model + '\n' + app;
  assert.equal((joined.match(/localStorage\.clear\s*\(/gu) || []).length, 0);
  assert.equal((joined.match(/\.clear\s*\(/gu) || []).length, 0);
  assert.doesNotMatch(joined, /setItem\s*\(\s*['"]flow:(?!poc:personal-workspace:v1:standalone-integrated)/u);
  assert.doesNotMatch(joined, /removeItem\s*\(\s*['"]flow:(?!poc:personal-workspace:v1:standalone-integrated)/u);
  assert.match(app, /replace\(\/&\/g, '&amp;'\)/u);
  assert.match(app, /escapeHtml\(flow\.rawText\)/u);
});

test('app separates unavailable storage API from unverified keys and uses the fixed v2 writer', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  assert.match(app, /function acquireStorage\(\)/u);
  assert.match(app, /const candidate = window\.localStorage/u);
  const acquisition = app.slice(app.indexOf('function acquireStorage()'), app.indexOf('function successfulStorageStatus'));
  assert.doesNotMatch(acquisition, /getItem|setItem|removeItem/u);
  assert.match(app, /storage: M\.createMemoryStorage\(\), mode: 'volatile'/u);
  assert.match(app, /workspacePacket = S\.loadWorkspace\(storage\)/u);
  assert.match(app, /S\.prepareWrite\(workspacePacket, candidate, options\)/u);
  assert.match(app, /S\.commitPrepared\(writerStorage\(\), preparation\.prepared\)/u);
  assert.match(app, /S\.cleanupCommitted\(storage, outcome\.receipt\)/u);
  assert.doesNotMatch(app, /M\.(?:writeEnvelope|writeAuthoringCommit|resetPoc|transitionEnvelope|undoEnvelope)\(/u);
  assert.match(app, /M\.writeAuthoringDraft\(storage, authoring\)/u);
  assert.match(app, /S\.prepareReset\(storage, workspacePacket,/u);
  assert.equal((app.match(/window\.localStorage/gu) || []).length, 1);
  assert.match(app, /임시 모드 · 새로고침하면 초기화/u);
  assert.match(app, /elements\.app\.dataset\.storageMode = storageMode/u);
  assert.doesNotMatch(app, /templateEditHistory/u);
  assert.doesNotMatch(app, /wantsUndo|wantsRedo/u);
  assert.match(app, /document\.execCommand\('insertText'/u);
});

test('standalone exposes one Plan and Item grammar across detail, staged edit, QuickItem edit and result views', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const model = fs.readFileSync(modelPath, 'utf8');
  assert.match(model, /case 'commit-personal-plan'/u);
  assert.match(model, /function resultProjection\(state, flowId, options\)/u);
  assert.match(app, /data-editor-field-group="source-read-only"/u);
  ['Flow 제목', 'Item 제목', '메모', '계획 날짜'].forEach(label => assert.match(app, new RegExp(label, 'u')));
  assert.match(app, /Plan 전체 저장/u);
  assert.match(app, /data-product-plan-item-grammar="v1"/u);
  assert.match(app, /data-action="open-item-detail"/u);
  assert.match(app, /data-testid="standalone-item-detail"/u);
  assert.match(app, /data-testid="standalone-item-editor"/u);
  assert.match(app, /action === 'result-open-item'\) openItemDetail/u);
  assert.match(app, /action === 'open-item-detail'\) openItemDetail/u);
  assert.match(app, /itemDraft\.mode === 'plan'[\s\S]*planItemSessions\.applyChild\(planSession, itemSession\)[\s\S]*planDraft = copyScreen\(planSession\.draft\)[\s\S]*finishEditorClose\(itemSession/u);
  const sessionModel = fs.readFileSync(path.join(path.dirname(modelPath), 'plan-item-session.js'), 'utf8');
  assert.match(sessionModel, /function applyChild\(parent, child\)[\s\S]*title: child\.draft\.title\.trim\(\)/u);
  assert.match(app, /type: 'update-quick'/u);
  assert.match(app, /\['txt', 'TXT'\], \['todo', '할 일'\], \['calendar', '캘린더'\], \['sheet', '표'\]/u);
  assert.match(app, /data-result-item-refs/u);
  assert.match(app, /data-item-ref=[\s\S]*data-effective-date=[\s\S]*data-completed=/u);
  assert.match(app, /type: 'commit-personal-plan'/u);
  assert.doesNotMatch(app, /localStorage\.clear\s*\(/u);
});

test('duplicate saved copies get deterministic presentation-only labels in list and detail paths', () => {
  const state = M.seedState();
  const first = stateFlow(state, 'moving');
  const second = Object.assign({}, first, {
    id: 'moving-second-copy',
    ref: 'saved-flow:copy-map-moving-z:flow-moving',
    savedCopyId: 'copy-map-moving-z',
    title: '회사 이사 준비 저장본',
    steps: [],
  });
  state.flows.push(second);
  const sourceBytes = JSON.stringify(state);

  const displays = M.copyDisambiguation(state);
  assert.equal(displays.get('moving').displayTitle, '사본 1 · 이사 준비 저장본');
  assert.equal(displays.get('moving-second-copy').displayTitle, '사본 2 · 회사 이사 준비 저장본');
  assert.equal(M.flowDisplayTitle(state, first), '사본 1 · 이사 준비 저장본');
  assert.equal(JSON.stringify(state), sourceBytes);

  state.trashEntries = [{ kind: 'flow', id: 'moving', deletedAt: '2026-09-03T00:00:00.000Z' }];
  const afterTrash = M.copyDisambiguation(state);
  assert.equal(afterTrash.has('moving'), false);
  assert.equal(afterTrash.get('moving-second-copy').displayTitle, '회사 이사 준비 저장본');

  const app = fs.readFileSync(appPath, 'utf8');
  assert.match(app, /function flowDisplayTitle\(flow\)/u);
  assert.match(app, /escapeHtml\(displayTitle\)/u);
  assert.match(app, /<h1>' \+ escapeHtml\(flowDisplayTitle\(flow\)\)/u);
});

test('result tabs expose a controlled panel and roving Arrow Home End keyboard behavior', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  assert.match(app, /id="standalone-result-tab-' \+ entry\[0\]/u);
  assert.match(app, /aria-controls="standalone-result-panel"/u);
  assert.match(app, /tabindex="' \+ \(resultView === entry\[0\] \? '0' : '-1'\)/u);
  assert.match(app, /id="standalone-result-panel"[\s\S]*role="tabpanel"[\s\S]*aria-labelledby="standalone-result-tab-/u);
  assert.match(app, /const resultTab = event\.target\.closest\('\[role="tab"\]\[data-action="result-tab"\]'\)/u);
  assert.match(app, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/u);
  assert.match(app, /focusAfterRender\('#standalone-result-tab-' \+ resultView\)/u);
});

test('default product shell keeps diagnostics in data attributes and removes implementation copy', () => {
  const shell = fs.readFileSync(shellPath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');
  ['통합 흐름 PoC · 로컬 전용', '성공한 변경 ', '원문 · 읽기 전용', '개인 shadow state', '저장 0건', '변경 0건'].forEach(copy => {
    assert.equal(app.includes(copy), false);
    assert.equal(shell.includes(copy), false);
  });
  assert.match(shell, /id="standalone-diagnostics"[^>]*hidden[^>]*aria-hidden="true"/u);
  assert.match(app, /dataset\.successfulMutations = String\(successfulMutations\)/u);
  assert.match(app, /dataset\.storageKey = S\.STORAGE_KEY/u);
  assert.match(app, /setSaveStatus\('저장 중…', 'saving'\)/u);
  assert.match(app, /setSaveStatus\('저장하지 못했어요\.', 'error'\)/u);
  assert.match(app, /function commitWorkspacePrepared[\s\S]*outcome\.status === 'committed'[\s\S]*S\.cleanupCommitted[\s\S]*routeWorkspaceRecovery/u);
  assert.match(app, /function writeCandidate[\s\S]*if \(!workspaceWritable\(\)\) return false/u);
  assert.match(app, /elements\.saveStatus\.setAttribute\('role', mode === 'error' \? 'alert' : 'status'\)/u);
  assert.match(app, /dialogReturnFocus = document\.activeElement instanceof HTMLElement/u);
  assert.match(app, /focusAfterRender\('\[autofocus\]', '#dialog \[data-action="close-dialog"\]'\)/u);
  const stagedStart = app.indexOf("if (itemDraft.mode === 'plan')");
  const stagedEnd = app.indexOf('saveEditor(false);', stagedStart);
  assert.ok(stagedStart >= 0 && stagedEnd > stagedStart);
  assert.doesNotMatch(app.slice(stagedStart, stagedEnd), /transitionEnvelope|writeCandidate|writeEnvelope|setItem/u);
  assert.match(app.slice(stagedStart, stagedEnd), /planItemSessions\.applyChild\(planSession, itemSession\)/u);
});

test('standalone navigation and authoring review expose explicit names and exact focus-return hooks', () => {
  const shell = fs.readFileSync(shellPath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');
  assert.match(shell, /data-action="go-workspace" aria-label="개인공간으로 이동">개인공간<\/button>/u);
  assert.match(shell, /data-action="go-authoring" aria-label="새 Flow 만들기 화면으로 이동">새 Flow 만들기<\/button>/u);
  assert.match(app, /id="authoring-review-opener"[^>]*aria-label="원문과 실행 항목 검토, 0개"/u);
  assert.match(app, /reviewOpener\.setAttribute\('aria-label', '원문과 실행 항목 검토, ' \+ reviewCount \+ '개'\)/u);
  assert.match(app, /data-action="close-authoring-review" aria-label="원문과 실행 항목 검토 닫기"/u);
  assert.match(app, /data-action="cancel-authoring-property"[^>]*data-line="' \+ item\.sourceLine \+ '" data-key="' \+ escapeHtml\(entry\.key\)/u);
  assert.match(app, /function authoringPropertyOpenerSelector\(line, key\)/u);
  assert.match(app, /focusAfterRender\(authoringPropertyOpenerSelector\(line, key\), '#authoring-property-tray-heading-' \+ line\)/u);
});

test('authoring layout owns viewport height so editor and primary action share the first frame', () => {
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(style, /\.app-shell\.app-shell-wide \{ height: calc\(var\(--standalone-visual-viewport-height\) - 60px/u);
  assert.match(style, /\.authoring-shell \{[^}]*height: 100%;[^}]*grid-template-rows: auto minmax\(0, 1fr\)/u);
  assert.match(style, /\.flow-editor-frame \{[^}]*flex: 1 1 180px;[^}]*min-height: 150px/u);
  assert.match(style, /@media \(max-width: 1023px\)[\s\S]*\.authoring-pane\.active \{ display: flex !important;[\s\S]*\.authoring-input-actions \{ display: grid;/u);
  assert.match(style, /@media \(max-width: 700px\)[\s\S]*\.flow-editor-frame \{[^}]*min-height: 120px/u);
  assert.match(style, /@media \(orientation: landscape\) and \(max-height: 500px\) and \(max-width: 1023px\)[\s\S]*\.flow-editor-frame, \.flow-editor-frame \.flow-editor \{ min-height: 68px;/u);
});

test('standalone visual viewport contract keeps focused controls and overlays above a virtual keyboard', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /const VIRTUAL_KEYBOARD_MIN_INSET_PX = 80/u);
  assert.match(app, /function readVisualViewportMetrics\(\)[\s\S]*window\.visualViewport[\s\S]*rawKeyboardInset[\s\S]*visualViewportInset[\s\S]*isTextEntryControl\(document\.activeElement\)/u);
  assert.match(app, /function syncVisualViewport\(\)[\s\S]*--standalone-visual-viewport-width[\s\S]*--standalone-visual-viewport-height[\s\S]*--standalone-keyboard-inset/u);
  assert.match(app, /document\.body\.dataset\.visualViewport = metrics\.mode/u);
  assert.match(app, /document\.body\.dataset\.virtualKeyboard = metrics\.keyboardOpen \? 'open' : 'closed'/u);
  assert.match(app, /metrics\.keyboardOpen && document\.activeElement instanceof HTMLElement[\s\S]*scheduleFocusedControlVisibility\(document\.activeElement\)/u);
  assert.match(app, /window\.visualViewport\.addEventListener\('resize', handleVisualViewportChange/u);
  assert.match(app, /window\.visualViewport\.addEventListener\('scroll', handleVisualViewportScroll/u);
  assert.match(app, /function handleVisualViewportScroll\(\) \{[\s\S]*scheduleVisualViewportSync\(\);[\s\S]*\}/u);
  assert.match(app, /function ensureControlVisibleInVisualViewport\(control\)[\s\S]*scrollIntoView\(\{ block: 'nearest', inline: 'nearest', behavior: 'auto' \}\)/u);
  assert.match(app, /document\.addEventListener\('focusin'[\s\S]*scheduleFocusedControlVisibility\(event\.target\)/u);
  assert.match(app, /const keyboardResize = isTextEntryControl\(document\.activeElement\)[\s\S]*!canceled && movePanelOpen\(\) && !keyboardResize/u);
  const viewportController = app.slice(app.indexOf('function readVisualViewportMetrics'), app.indexOf('function periodDateHeading'));
  assert.doesNotMatch(viewportController, /transition\(|writeCandidate\(|writeEnvelope|setItem|removeItem|clear\(/u);

  assert.match(style, /--standalone-visual-viewport-height: 100dvh/u);
  assert.match(style, /\.app-shell\.app-shell-wide \{ height: calc\(var\(--standalone-visual-viewport-height\)/u);
  assert.match(style, /\.move-panel \{[\s\S]*top: calc\(var\(--standalone-visual-viewport-top\)[\s\S]*max-height: calc\(var\(--standalone-visual-viewport-height\)/u);
  assert.match(style, /\.validation-example-backdrop \{[\s\S]*width: min\(var\(--standalone-visual-viewport-width\), 100vw\);[\s\S]*height: min\(var\(--standalone-visual-viewport-height\), 100dvh\)/u);
  assert.match(style, /\.source-update-backdrop \{[\s\S]*width: min\(var\(--standalone-visual-viewport-width\), 100vw\);[\s\S]*height: min\(var\(--standalone-visual-viewport-height\), 100dvh\)/u);
  assert.match(style, /body\[data-virtual-keyboard="open"\] \.authoring-head \{ display: none; \}/u);
});

test('all pointer and touch cancellations share one zero-write cleanup and reduced motion stops auto-scroll', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  const cleanup = app.slice(app.indexOf('function cancelActiveMoveInteraction'), app.indexOf("document.addEventListener('click'"));
  assert.match(cleanup, /cancelHandlePress\('', true\)/u);
  assert.match(cleanup, /finishDrag\(\)/u);
  assert.match(cleanup, /settings\.closePanel && movePanelOpen\(\)[\s\S]*closeMovePanel\(\{ restoreFocus: settings\.restoreFocus, announce: false \}\)/u);
  assert.doesNotMatch(cleanup, /transition\(|writeCandidate\(|writeEnvelope|setItem|removeItem|clear\(/u);
  ['pointercancel', 'touchcancel', 'lostpointercapture'].forEach(type => {
    assert.match(app, new RegExp("document\\.addEventListener\\('" + type + "'[\\s\\S]*cancelActiveMoveInteraction", 'u'));
  });
  assert.match(app, /function handleVisualViewportChange\(\)[\s\S]*cancelActiveMoveInteraction\('화면 표시 영역이 바뀌어 이동을 취소했어요\.'/u);
  assert.match(app, /if \(reducedMotion\) \{[\s\S]*stopDragAutoScroll\(\);[\s\S]*return;/u);
  assert.match(style, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none !important;[\s\S]*animation: none !important;/u);
});

test('fixed TXT todo calendar and sheet slots share one ordered Item manifest', () => {
  assert.equal(M.RESULT_PROJECTION_VERSION, 3);
  let envelope = M.initialEnvelope();
  envelope = M.transitionEnvelope(envelope, { type: 'complete', id: 'quote', done: true }).envelope;
  envelope = M.transitionEnvelope(envelope, { type: 'schedule', id: 'quote', date: '2026-09-08' }).envelope;
  const projection = M.resultProjection(envelope.state, 'moving');
  assert.equal(projection.contractVersion, 3);
  assert.deepEqual(Object.keys(projection.slots), ['txt', 'todo', 'calendar', 'sheet']);
  Object.values(projection.slots).forEach(slot => assert.deepEqual(slot.itemRefs, projection.itemRefs));
  assert.deepEqual(projection.sheet.map(row => row.itemRef), projection.itemRefs);
  assert.equal(projection.sheet[0].status, '완료');
  assert.equal(projection.items[0].executionDate, '2026-09-08');
  assert.deepEqual(projection.calendar['2026-09-08'], [projection.itemRefs[0]]);
  assert.equal((projection.calendar.undated || []).includes(projection.itemRefs[0]), false);
  assert.equal(projection.workingSource.editable, false);
  assert.equal(projection.slots.txt.kind, 'copy-only');
  assert.notEqual(projection.workingSource, projection.slots.txt);
  assert.equal(projection.calendar.cells.length, 42);
  assert.equal(projection.calendar.weekCount, 6);
  assert.equal(projection.calendar.weekStartsOn, 'sunday');
  assert.equal(projection.calendar.datePolicy, 'effective-date-execution-first');
  assert.equal(projection.downloads.version, 2);
  assert.equal(projection.downloads.txt.payload, projection.txt);
  assert.equal(projection.downloads.txt.bom, false);
  assert.equal(/\r/u.test(projection.downloads.txt.payload), false);
  assert.equal(projection.downloads.csv.payload.startsWith('\uFEFF'), true);
  assert.equal(projection.downloads.csv.payload.endsWith('\r\n'), true);
  assert.equal(projection.downloads.sourceMutationCount, 0);

  const authored = M.authoringResultProjection(validSource());
  assert.equal(authored.contractVersion, 3);
  assert.deepEqual(Object.keys(authored.slots), ['txt', 'todo', 'calendar', 'sheet']);
  Object.values(authored.slots).forEach(slot => assert.deepEqual(slot.itemRefs, authored.itemRefs));
  assert.deepEqual(authored.sheet.map(row => row.itemRef), authored.itemRefs);
  assert.equal(authored.workingSource.rawText, validSource());
  assert.equal(authored.workingSource.editable, true);
  assert.match(authored.flowRef, /^saved-flow:[^:]+:[^:]+$/u);
  authored.itemRefs.forEach(ref => assert.match(ref, /^flow-item:[^:]+:[^:]+:[^:]+$/u));
  assert.deepEqual(M.authoringResultProjection(validSource()).itemRefs, authored.itemRefs);
});

test('standalone result TXT normalizes CRLF and lone CR to one final LF', () => {
  const state = M.seedState();
  const quote = state.tasks.find(task => task.id === 'quote');
  quote.memo = '첫 줄\r\n둘째 줄\r마지막 줄\n\n';
  const projection = M.resultProjection(state, 'moving');

  assert.equal(projection.txt.includes('\r'), false);
  assert.equal(projection.txt.endsWith('\n'), true);
  assert.equal(projection.txt.endsWith('\n\n'), false);
  assert.equal(projection.downloads.txt.payload, projection.txt);
  assert.match(projection.txt, /메모:\n     첫 줄\n     둘째 줄\n     마지막 줄\n/u);

  const direct = M.buildResultDownloads('정규화', 'copy-01', [], '가\r\n나\r다\n\n', []);
  assert.equal(direct.txt.payload, '가\n나\n다\n');
});

test('standalone Calendar excludes hidden Items and keeps stored context order for the same date', () => {
  const state = M.seedState();
  const quote = state.tasks.find(task => task.id === 'quote');
  const contract = state.tasks.find(task => task.id === 'contract');
  quote.date = M.TODAY;
  contract.date = M.TODAY;
  const todayIds = M.viewTaskIds(state, 'today');
  state.orders.today = ['contract', 'quote'].concat(
    todayIds.filter(id => id !== 'contract' && id !== 'quote'),
  );

  const ordered = M.resultProjection(state, 'moving', {
    baseDate: M.TODAY,
    selectedDate: M.TODAY,
  });
  assert.deepEqual(ordered.calendar[M.TODAY], [contract.ref, quote.ref]);
  assert.deepEqual(ordered.calendar.selectedItemRefs, [contract.ref, quote.ref]);
  assert.deepEqual(
    ordered.calendar.cells.find(cell => cell.date === M.TODAY).itemRefs,
    [contract.ref, quote.ref],
  );
  assert.equal(ordered.items.find(item => item.id === 'contract').contextOrder, 0);
  assert.equal(ordered.items.find(item => item.id === 'quote').contextOrder, 1);

  quote.timelinePolicy = 'excluded';
  const hiddenDated = M.resultProjection(state, 'moving', {
    baseDate: M.TODAY,
    selectedDate: M.TODAY,
  });
  assert.deepEqual(hiddenDated.calendar[M.TODAY], [contract.ref]);
  assert.deepEqual(hiddenDated.calendar.selectedItemRefs, [contract.ref]);
  assert.equal(hiddenDated.calendar.monthItemRefs.includes(quote.ref), false);
  assert.equal(hiddenDated.calendar.itemRefs.includes(quote.ref), true);

  quote.date = null;
  const hiddenUndated = M.resultProjection(state, 'moving', {
    baseDate: M.TODAY,
    selectedDate: M.TODAY,
  });
  assert.equal(hiddenUndated.calendar.undatedItemRefs.includes(quote.ref), false);
  assert.equal((hiddenUndated.calendar.undated || []).includes(quote.ref), false);
});

test('lossless source adapter preserves safe tables and fails closed for risky input', () => {
  assert.equal(M.LOSSLESS_AUTHORING_VERSION, 1);
  assert.deepEqual(M.LOSSLESS_AUTHORING_LIMITS, {
    utf8Bytes: 1024 * 1024,
    physicalLines: 20000,
    logicalCells: 50000,
  });
  const cases = [
    ['tsv', '순서\t주제\t활동\n1\t첫 번째\t강의 듣기\n2\t두 번째\t실습하기'],
    ['csv', '순서,작품,자료\n1,"어린 왕자, 낭독본",https://example.com/1\n2,오만과 편견,https://example.com/2'],
    ['markdown', '| 순서 | 주제 | 활동 |\n| --- | --- | --- |\n| 1 | 왼쪽 \\| 오른쪽 | 실행 |'],
  ];
  for (const [format, rawText] of cases) {
    const analysis = M.analyzeLosslessAuthoring(rawText);
    assert.equal(analysis.status, 'safe-table', format);
    assert.equal(analysis.tables[0].format, format);
    assert.equal(analysis.rawText, rawText);
    assert.equal(analysis.projection.kind, 'sheet-source-rows');
    assert.equal(analysis.projection.generatedItemCount, 0);
    assert.equal(analysis.projection.generatedTodoCount, 0);
    assert.equal(analysis.projection.generatedCalendarCount, 0);
    assert.equal(analysis.sourceMutationCount, 0);
  }
  const unsafe = '열1,열2\r\n1,=SUM(A1)';
  const fallback = M.analyzeLosslessAuthoring(unsafe);
  assert.equal(fallback.status, 'raw-fallback');
  assert.equal(fallback.fallback.active, true);
  assert.equal(fallback.fallback.rawText, unsafe);
  assert.equal(fallback.sourceMutationCount, 0);
});

test('lossless runtime reuses the canonical mixed-block contract with exact row and cell locators', () => {
  const rawText = [
    '장문 원문',
    '',
    '> 이름,상태',
    '> 인용,유지',
    '',
    '```csv',
    '이름,상태',
    '코드,유지',
    '```',
    '',
    '<section>',
    '이름,상태',
    'HTML,유지',
    '</section>',
    '',
    '<!--',
    '이름,상태',
    '주석,유지',
    '-->',
    '',
    '순서\t설명\t빈칸',
    '1\t"왼쪽\t오른쪽"\t',
  ].join('\n');
  const analysis = M.analyzeLosslessAuthoring(rawText);
  const canonical = losslessRuntime.analyzePersonalWorkspacePocLosslessAuthoring(rawText);

  assert.deepEqual(analysis, canonical);
  assert.equal(analysis.status, 'safe-table');
  assert.deepEqual(
    analysis.blocks.map(block => block.kind),
    ['prose', 'blank', 'blockquote', 'blank', 'code-fence', 'blank', 'html', 'blank', 'comment', 'blank', 'table'],
  );
  assert.equal(analysis.tables.length, 1);
  assert.equal(analysis.tables[0].format, 'tsv');
  assert.deepEqual(analysis.tables[0].rows, [['1', '왼쪽\t오른쪽', '']]);
  assert.equal(analysis.blocks.map(block => block.rawText).join(''), rawText);
  const sourceCell = analysis.tables[0].sourceRows[1].cells[1];
  assert.equal(sourceCell.rawText, '"왼쪽\t오른쪽"');
  assert.deepEqual(
    losslessRuntime.locatePersonalWorkspacePocLosslessSource(rawText, sourceCell.locator),
    { valid: true, rawText: sourceCell.rawText },
  );
  assert.equal(analysis.projection.generatedItemCount, 0);
  assert.equal(analysis.projection.generatedTodoCount, 0);
  assert.equal(analysis.projection.generatedCalendarCount, 0);
  assert.equal(analysis.sourceMutationCount, 0);
});

test('mixed Flow prose plus a risky table uses the same exact raw fallback as the canonical adapter', () => {
  const rawText = [
    '# 제목',
    '- [ ] 명시한 실행 항목',
    '',
    '열1,열2',
    '1,=SUM(A1)',
  ].join('\n');
  const analysis = M.analyzeLosslessAuthoring(rawText);
  const canonical = losslessRuntime.analyzePersonalWorkspacePocLosslessAuthoring(rawText);

  assert.deepEqual(analysis, canonical);
  assert.equal(analysis.status, 'raw-fallback');
  assert.equal(analysis.fallback.active, true);
  assert.equal(analysis.fallback.reason, 'formula-like-cell');
  assert.equal(analysis.fallback.rawText, rawText);
  assert.equal(analysis.blocks.map(block => block.rawText).join(''), rawText);
  assert.equal(analysis.projection.kind, 'none');
  assert.equal(analysis.sourceMutationCount, 0);
});

test('Flow and QuickItem trash lifecycle restores and persists while permanent deletion is unrecoverable', () => {
  const initial = M.initialEnvelope();
  const flowTrash = M.transitionEnvelope(initial, { type: 'move-to-trash', kind: 'flow', id: 'moving', now: '2026-09-03T01:00:00.000Z' });
  assert.equal(flowTrash.changed, true);
  assert.deepEqual(M.trashManifest(flowTrash.envelope.state).map(entry => [entry.kind, entry.id]), [['flow', 'moving']]);
  assert.equal(M.viewTaskIds(flowTrash.envelope.state, 'undated').includes('quote'), false);
  assert.equal(M.resultProjection(flowTrash.envelope.state, 'moving'), null);

  const storage = M.createMemoryStorage({ 'flow:operating:fixture': 'UNCHANGED' });
  M.writeEnvelope(storage, flowTrash.envelope);
  const restoredBytes = M.loadEnvelope(storage);
  assert.equal(restoredBytes.status, 'restored');
  assert.equal(M.isTrashedFlow(restoredBytes.envelope.state, 'moving'), true);
  assert.equal(storage.snapshot()['flow:operating:fixture'], 'UNCHANGED');

  const restored = M.transitionEnvelope(flowTrash.envelope, { type: 'restore-from-trash', kind: 'flow', id: 'moving' });
  assert.equal(restored.changed, true);
  assert.equal(M.isTrashedFlow(restored.envelope.state, 'moving'), false);
  const restoredUndo = M.undoEnvelope(restored.envelope);
  assert.equal(M.isTrashedFlow(restoredUndo.envelope.state, 'moving'), true);

  const unconfirmed = M.transitionEnvelope(flowTrash.envelope, { type: 'permanently-delete-from-trash', kind: 'flow', id: 'moving', confirmed: false });
  assert.equal(unconfirmed.changed, false);
  assert.equal(unconfirmed.error, 'confirmation-required');
  assert.equal(JSON.stringify(unconfirmed.envelope), JSON.stringify(flowTrash.envelope));
  const removed = M.transitionEnvelope(flowTrash.envelope, { type: 'permanently-delete-from-trash', kind: 'flow', id: 'moving', confirmed: true });
  assert.equal(removed.changed, true);
  assert.equal(stateFlow(removed.envelope.state, 'moving'), undefined);
  assert.equal(stateTask(removed.envelope.state, 'quote'), undefined);
  assert.equal(removed.envelope.undo, null);
  const removedUndo = M.undoEnvelope(removed.envelope);
  assert.equal(removedUndo.changed, false);
  assert.equal(stateFlow(removedUndo.envelope.state, 'moving'), undefined);
  assert.equal(stateTask(removedUndo.envelope.state, 'quote'), undefined);

  const quickTrash = M.transitionEnvelope(initial, { type: 'move-to-trash', kind: 'quick', id: 'call' });
  assert.equal(quickTrash.changed, true);
  assert.equal(M.isTrashedTask(quickTrash.envelope.state, stateTask(quickTrash.envelope.state, 'call')), true);
  const quickRestore = M.transitionEnvelope(quickTrash.envelope, { type: 'restore-from-trash', kind: 'quick', id: 'call' });
  assert.equal(quickRestore.changed, true);
  assert.equal(M.isTrashedTask(quickRestore.envelope.state, stateTask(quickRestore.envelope.state, 'call')), false);

  const corruptState = M.seedState();
  corruptState.trashEntries = [{ kind: 'flow', id: 'missing', deletedAt: '2026-09-03T00:00:00.000Z' }];
  const corruptStorage = M.createMemoryStorage({ [M.STORAGE_KEY]: JSON.stringify({ version: 1, state: corruptState, undo: null }) });
  const failedClosed = M.loadEnvelope(corruptStorage);
  assert.equal(failedClosed.status, 'corrupt');
  assert.deepEqual(failedClosed.envelope, M.initialEnvelope());
  assert.equal(corruptStorage.snapshot()[M.STORAGE_KEY], JSON.stringify({ version: 1, state: corruptState, undo: null }));
});

test('versioned authoring property catalog exposes four groups and edits all sixteen properties', () => {
  assert.equal(M.AUTHORING_PROPERTY_CATALOG_VERSION, 2);
  assert.deepEqual(M.AUTHORING_PROPERTY_CATALOG.map(entry => entry.key), [
    'date', 'relativeDate', 'time', 'timezone', 'place', 'duration', 'detail', 'completion',
    'condition', 'resource', 'repeat', 'repeatEnd', 'guide', 'caution', 'source', 'subcheck'
  ]);
  assert.deepEqual(M.AUTHORING_PROPERTY_GROUPS.map(group => group.key), [
    'schedule', 'execution', 'content', 'provenance'
  ]);
  assert.deepEqual(Object.fromEntries(M.AUTHORING_PROPERTY_GROUPS.map(group => [
    group.key,
    M.AUTHORING_PROPERTY_CATALOG.filter(entry => entry.group === group.key).map(entry => entry.key),
  ])), {
    schedule: ['date', 'relativeDate', 'time', 'timezone', 'place', 'duration', 'repeat', 'repeatEnd'],
    execution: ['completion', 'condition', 'subcheck'],
    content: ['detail', 'resource', 'guide', 'caution'],
    provenance: ['source'],
  });
  assert.deepEqual(M.AUTHORING_PROPERTY_CATALOG.filter(entry => entry.writeSupport === 'editable').map(entry => entry.key), [
    'date', 'relativeDate', 'time', 'timezone', 'place', 'duration', 'detail', 'completion',
    'condition', 'resource', 'repeat', 'repeatEnd', 'guide', 'caution', 'source', 'subcheck'
  ]);
  const source = '# 여행\n## 준비\n- [ ] 체크인\n  - 날짜: 2026-09-10\n  - 장소: 공항';
  const located = M.locateAuthoringPropertyValue({ rawText: source, expectedSourceFingerprint: M.fingerprint(source), itemSourceLine: 3, key: 'place' });
  assert.equal(located.status, 'located');
  assert.equal(source.slice(located.selection.start, located.selection.end), '공항');

  const edit = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: source, expectedSourceFingerprint: M.fingerprint(source), itemSourceLine: 3, key: 'place', value: '김포공항' });
  assert.equal(edit.status, 'applied');
  assert.equal(edit.mutationCount, 1);
  assert.equal(edit.nextRawText.slice(edit.selection.start, edit.selection.end), '김포공항');
  assert.match(edit.nextRawText, /  - 장소: 김포공항/u);

  let simpleSource = edit.nextRawText;
  for (const [key, value] of [
    ['date', '2026-09-11'],
    ['duration', '30분'],
    ['detail', '탑승 수속 순서를 확인한다'],
    ['completion', '모바일 탑승권이 보이면 완료'],
    ['condition', '출발 2시간 전'],
    ['resource', '[항공권](https://example.com/ticket)'],
    ['source', 'https://example.com/original'],
  ]) {
    const planned = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: simpleSource, expectedSourceFingerprint: M.fingerprint(simpleSource), itemSourceLine: 3, key, value });
    assert.equal(planned.status, 'applied', key);
    assert.equal(planned.mutationCount, 1, key);
    simpleSource = planned.nextRawText;
  }
  assert.deepEqual(M.parseSource(simpleSource).issues, []);

  const pairedTime = M.planAuthoringPropertyBatchEdit({
    intent: 'apply',
    rawText: simpleSource,
    expectedSourceFingerprint: M.fingerprint(simpleSource),
    itemSourceLine: 3,
    updates: [{ key: 'time', value: '09:30' }, { key: 'timezone', value: 'Asia/Seoul' }],
  });
  assert.equal(pairedTime.status, 'applied');
  assert.equal(pairedTime.mutationCount, 1);
  assert.equal(pairedTime.transaction.kind, 'property-batch-edit');
  assert.equal(pairedTime.transaction.changes.length, 1);
  assert.match(pairedTime.nextRawText, /  - 시간: 09:30\n  - 시간대: Asia\/Seoul/u);

  const beforeNearMiss = '# 여행\n## 준비\n- [ ] 체크인\n  - 시간: 09:30\n-[] 공백 빠진 줄';
  const insertBeforeNearMiss = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: beforeNearMiss, expectedSourceFingerprint: M.fingerprint(beforeNearMiss), itemSourceLine: 3, key: 'timezone', value: 'Asia/Seoul' });
  assert.equal(insertBeforeNearMiss.status, 'applied');
  assert.match(insertBeforeNearMiss.nextRawText, /  - 시간: 09:30\n  - 시간대: Asia\/Seoul\n-\[\] 공백 빠진 줄/u);

  const missingTimezoneDependency = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: source, expectedSourceFingerprint: M.fingerprint(source), itemSourceLine: 3, key: 'timezone', value: 'Asia\/Seoul' });
  assert.equal(missingTimezoneDependency.status, 'blocked');
  assert.equal(missingTimezoneDependency.reason, 'missing-dependency');
  assert.equal(missingTimezoneDependency.mutationCount, 0);
  assert.equal(missingTimezoneDependency.rawText, source);

  const stale = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: source, expectedSourceFingerprint: 'stale', itemSourceLine: 3, key: 'place', value: '제주공항' });
  assert.equal(stale.status, 'blocked');
  assert.equal(stale.reason, 'stale-source');
  assert.equal(stale.mutationCount, 0);
  const cancelled = M.planAuthoringPropertyEdit({ intent: 'cancel', rawText: source, expectedSourceFingerprint: M.fingerprint(source), itemSourceLine: 3, key: 'place', value: '제주공항' });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.mutationCount, 0);
  assert.equal(cancelled.rawText, source);

  const relativeBase = '# 준비\n- 기준일: 2026-09-20\n## 단계\n- [ ] 확인';
  const relativeDate = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: relativeBase, expectedSourceFingerprint: M.fingerprint(relativeBase), itemSourceLine: 4, key: 'relativeDate', value: 'D-2' });
  assert.equal(relativeDate.status, 'applied');
  assert.match(relativeDate.nextRawText, /  - 상대 날짜: D-2/u);
  const conflictingDate = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: relativeDate.nextRawText, expectedSourceFingerprint: M.fingerprint(relativeDate.nextRawText), itemSourceLine: 4, key: 'date', value: '2026-09-19' });
  assert.equal(conflictingDate.status, 'blocked');
  assert.equal(conflictingDate.reason, 'conflicting-schedule');
  assert.equal(conflictingDate.mutationCount, 0);

  const recurrenceBase = '# 루틴\n## 실행\n- [ ] 걷기\n  - 날짜: 2026-09-10';
  const pairedRepeat = M.planAuthoringPropertyBatchEdit({
    intent: 'apply',
    rawText: recurrenceBase,
    expectedSourceFingerprint: M.fingerprint(recurrenceBase),
    itemSourceLine: 3,
    updates: [{ key: 'repeat', value: '매주 월, 수' }, { key: 'repeatEnd', value: '2026-09-30' }],
  });
  assert.equal(pairedRepeat.status, 'applied');
  assert.equal(pairedRepeat.mutationCount, 1);
  assert.equal(pairedRepeat.transaction.changes.length, 1);
  assert.match(pairedRepeat.nextRawText, /  - 반복: 매주 월, 수\n  - 반복 종료: 2026-09-30/u);
  assert.deepEqual(M.parseSource(pairedRepeat.nextRawText).issues, []);

  const repeatOnly = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: recurrenceBase, expectedSourceFingerprint: M.fingerprint(recurrenceBase), itemSourceLine: 3, key: 'repeat', value: '매일' });
  assert.equal(repeatOnly.status, 'applied');
  assert.equal(repeatOnly.mutationCount, 1);
  assert.match(repeatOnly.nextRawText, /  - 반복: 매일$/u);

  const staleBatch = M.planAuthoringPropertyBatchEdit({ intent: 'apply', rawText: recurrenceBase, expectedSourceFingerprint: 'stale', itemSourceLine: 3, updates: [{ key: 'repeat', value: '매일' }, { key: 'repeatEnd', value: '10회' }] });
  assert.equal(staleBatch.status, 'blocked');
  assert.equal(staleBatch.reason, 'stale-source');
  assert.equal(staleBatch.mutationCount, 0);
  assert.equal(staleBatch.rawText, recurrenceBase);
  const cancelledBatch = M.planAuthoringPropertyBatchEdit({ intent: 'cancel', rawText: recurrenceBase, expectedSourceFingerprint: M.fingerprint(recurrenceBase), itemSourceLine: 3, updates: [{ key: 'repeat', value: '매일' }, { key: 'repeatEnd', value: '10회' }] });
  assert.equal(cancelledBatch.status, 'cancelled');
  assert.equal(cancelledBatch.mutationCount, 0);
  assert.equal(cancelledBatch.rawText, recurrenceBase);
});

test('guide and caution append distinct instances while subchecks add and re-enter the exact instance', () => {
  const noticeSource = '# 안전\r\n## 준비\r\n- [ ] 출발 점검\r\n  - 안내: 기존 안내\r\n  - 주의: 기존 주의';
  const guide = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: noticeSource, expectedSourceFingerprint: M.fingerprint(noticeSource), itemSourceLine: 3, key: 'guide', value: '새 안내' });
  assert.equal(guide.status, 'applied');
  assert.equal(guide.mutationCount, 1);
  assert.match(guide.nextRawText, /  - 안내: 기존 안내\r\n  - 주의: 기존 주의\r\n  - 안내: 새 안내$/u);
  const caution = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: guide.nextRawText, expectedSourceFingerprint: M.fingerprint(guide.nextRawText), itemSourceLine: 3, key: 'caution', value: '새 주의' });
  assert.equal(caution.status, 'applied');
  assert.equal(M.listAuthoringPropertyInstances({ rawText: caution.nextRawText, itemSourceLine: 3, key: 'guide' }).length, 2);
  assert.equal(M.listAuthoringPropertyInstances({ rawText: caution.nextRawText, itemSourceLine: 3, key: 'caution' }).length, 2);
  const duplicateGuide = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: caution.nextRawText, expectedSourceFingerprint: M.fingerprint(caution.nextRawText), itemSourceLine: 3, key: 'guide', value: '새 안내' });
  assert.equal(duplicateGuide.status, 'no-op');
  assert.equal(duplicateGuide.mutationCount, 0);
  assert.equal(duplicateGuide.rawText, caution.nextRawText);

  const subcheckSource = '# 체크\n## 준비\n- [ ] 예약\n  - [ ] 번호 확인\n  - 설명: 기존 설명';
  const added = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: subcheckSource, expectedSourceFingerprint: M.fingerprint(subcheckSource), itemSourceLine: 3, key: 'subcheck', value: '결제 확인' });
  assert.equal(added.status, 'applied');
  assert.equal(added.mutationCount, 1);
  assert.match(added.nextRawText, /  - \[ \] 번호 확인\n  - \[ \] 결제 확인\n  - 설명: 기존 설명/u);
  assert.equal(M.parseSource(added.nextRawText).itemCount, 1);
  const instances = M.listAuthoringPropertyInstances({ rawText: added.nextRawText, itemSourceLine: 3, key: 'subcheck' });
  assert.deepEqual(instances.map(instance => instance.rawValue), ['번호 확인', '결제 확인']);
  const exact = M.locateAuthoringPropertyValue({ rawText: added.nextRawText, expectedSourceFingerprint: M.fingerprint(added.nextRawText), itemSourceLine: 3, propertySourceLine: instances[1].sourceLine, key: 'subcheck' });
  assert.equal(exact.status, 'located');
  assert.equal(added.nextRawText.slice(exact.selection.start, exact.selection.end), '결제 확인');
  const duplicateSubcheck = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: added.nextRawText, expectedSourceFingerprint: M.fingerprint(added.nextRawText), itemSourceLine: 3, key: 'subcheck', value: '결제 확인' });
  assert.equal(duplicateSubcheck.status, 'no-op');
  assert.equal(duplicateSubcheck.mutationCount, 0);

  const markdownResource = '# 링크\n## 확인\n- [ ] 자료 열기\n  - 자료: [공식 문서](https://example.com/docs)';
  const resourceLocated = M.locateAuthoringPropertyValue({ rawText: markdownResource, expectedSourceFingerprint: M.fingerprint(markdownResource), itemSourceLine: 3, key: 'resource' });
  assert.equal(resourceLocated.status, 'located');
  assert.equal(markdownResource.slice(resourceLocated.selection.start, resourceLocated.selection.end), '[공식 문서](https://example.com/docs)');

  const duplicateSingleton = '# 중복\n## 확인\n- [ ] 장소\n  - 장소: 서울\n  - 장소: 부산';
  const ambiguous = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: duplicateSingleton, expectedSourceFingerprint: M.fingerprint(duplicateSingleton), itemSourceLine: 3, key: 'place', value: '대전' });
  assert.equal(ambiguous.status, 'blocked');
  assert.equal(ambiguous.reason, 'duplicate-property');
  assert.equal(ambiguous.mutationCount, 0);
  assert.equal(ambiguous.rawText, duplicateSingleton);
});

test('near-miss recovery is explicit, exact and cancel-safe', () => {
  const source = '# 체크\n-[] 빠진 공백\n```\n-[] 코드 예시\n```\n- [ ] 정상 항목';
  const targets = M.listAuthoringNearMissTargets(source);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].title, '빠진 공백');
  const cancelled = M.planAuthoringNearMissRepair({ intent: 'cancel', rawText: source, expectedSourceFingerprint: M.fingerprint(source), targetId: targets[0].targetId });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.mutationCount, 0);
  assert.equal(cancelled.rawText, source);
  const repaired = M.planAuthoringNearMissRepair({ intent: 'apply', rawText: source, expectedSourceFingerprint: M.fingerprint(source), targetId: targets[0].targetId });
  assert.equal(repaired.status, 'repaired');
  assert.equal(repaired.mutationCount, 1);
  assert.match(repaired.nextRawText, /# 체크\n- \[ \] 빠진 공백/u);
  assert.equal(repaired.nextRawText.slice(repaired.selection.start, repaired.selection.end), '빠진 공백');
  assert.match(repaired.nextRawText, /```\n-\[\] 코드 예시\n```/u);
  const stale = M.planAuthoringNearMissRepair({ intent: 'apply', rawText: source + '\n', expectedSourceFingerprint: M.fingerprint(source), targetId: targets[0].targetId });
  assert.equal(stale.status, 'blocked');
  assert.equal(stale.reason, 'stale-source');
  assert.equal(stale.mutationCount, 0);
});

test('standalone recurrence grammar matches the versioned contract and bare weekday aliases fail closed', () => {
  assert.equal(M.OCCURRENCE_CONTRACT_VERSION, 1);
  assert.deepEqual(M.parseRecurrence('매일'), {
    ok: true,
    rule: { version: 1, raw: '매일', frequency: 'daily', interval: 1 },
  });
  assert.deepEqual(M.parseRecurrence('2주마다 목, 화, 목', '5회'), {
    ok: true,
    rule: {
      version: 1,
      raw: '2주마다 목, 화, 목',
      frequency: 'weekly',
      interval: 2,
      weekdays: ['TU', 'TH'],
      end: { mode: 'count', count: 5, raw: '5회' },
    },
  });
  assert.equal(M.parseRecurrence('매월 31일', '2026-05-31').ok, true);
  assert.deepEqual(M.parseRecurrence('월, 수', '3회'), { ok: false, reason: 'invalid-recurrence' });
  assert.deepEqual(M.parseRecurrence('매일', '언젠가'), { ok: false, reason: 'invalid-recurrence-end' });
  assert.equal(M.parseSource(recurringSource('월, 수', '3회')).issues.some(issue => issue.code === 'invalid-recurrence'), true);
  assert.equal(M.parseSource(recurringSource('매일', '') .replace('  - 날짜: 2026-09-02\n', '')).issues.some(issue => issue.code === 'missing-recurrence-start'), true);
});

test('count, ISO end and stable occurrence identity include the explicit start exactly once', () => {
  const input = {
    sourceItemRef: 'savedCopyId:copy-a|flowId:flow-a|itemId:item-a',
    startDate: '2026-08-04',
    recurrence: '매주 월요일',
    recurrenceEnd: '3회',
  };
  const result = M.expandOccurrences(input);
  assert.equal(result.ok, true);
  assert.deepEqual(result.manifest.originalDates, ['2026-08-04', '2026-08-10', '2026-08-17']);
  assert.deepEqual(result.manifest.rows.map(row => row.occurrenceIndex), [1, 2, 3]);
  assert.equal(result.manifest.totalCount, 3);
  assert.equal(result.manifest.hasMore, false);
  result.manifest.rows.forEach(row => {
    assert.equal(row.rowId, row.occurrenceId);
    assert.equal(row.sourceItemRef, input.sourceItemRef);
    assert.equal(row.occurrenceId, M.buildOccurrenceId(row.seriesId, row.originalDate));
  });

  const compact = M.parseRecurrence('2주마다 화,목', '5회').rule;
  const spaced = M.parseRecurrence('2 주마다 화 / 목', '5 회').rule;
  assert.equal(M.buildOccurrenceSeriesId(input.sourceItemRef, compact), M.buildOccurrenceSeriesId(input.sourceItemRef, spaced));

  const monthly = M.expandOccurrences({
    sourceItemRef: 'copy/flow/monthly',
    startDate: '2026-01-31',
    recurrence: '매월 31일',
    recurrenceEnd: '2026-05-31',
  });
  assert.equal(monthly.ok, true);
  assert.deepEqual(monthly.manifest.originalDates, ['2026-01-31', '2026-03-31', '2026-05-31']);
});

test('finite 30-row and open-ended four-week bounds extend cumulatively without changing prior IDs', () => {
  const finiteBase = { sourceItemRef: 'copy/flow/finite', startDate: '2026-08-01', recurrence: '매일', recurrenceEnd: '35회' };
  const firstFinite = M.expandOccurrences(finiteBase).manifest;
  const grownFinite = M.expandOccurrences(Object.assign({}, finiteBase, { finiteLimit: 35 })).manifest;
  assert.equal(M.FINITE_RECURRENCE_PAGE_SIZE, 30);
  assert.equal(firstFinite.rows.length, 30);
  assert.equal(firstFinite.hasMore, true);
  assert.deepEqual(grownFinite.occurrenceIds.slice(0, 30), firstFinite.occurrenceIds);

  const openBase = { sourceItemRef: 'copy/flow/open', startDate: '2026-08-03', recurrence: '매일' };
  const firstOpen = M.expandOccurrences(openBase).manifest;
  const grownOpen = M.expandOccurrences(Object.assign({}, openBase, { windowWeeks: 8 })).manifest;
  assert.equal(M.OPEN_ENDED_RECURRENCE_WEEKS, 4);
  assert.deepEqual(firstOpen.window, { start: '2026-08-03', end: '2026-08-30', offsetWeeks: 0, weeks: 4 });
  assert.equal(firstOpen.rows.length, 28);
  assert.equal(firstOpen.hasMore, true);
  assert.deepEqual(grownOpen.occurrenceIds.slice(0, 28), firstOpen.occurrenceIds);
  assert.deepEqual(M.expandOccurrences(Object.assign({}, openBase, { windowWeeks: 0 })), { ok: false, reason: 'invalid-open-ended-window' });
});

test('one occurrence manifest drives TXT Todo Calendar and Sheet with repeat-only occurrence IDs', () => {
  const projection = M.authoringResultProjection(recurringSource('매일', '3회'));
  assert.deepEqual(projection.issues, []);
  assert.equal(projection.sourceItemRefs.length, 1);
  assert.equal(projection.itemRefs.length, 3);
  assert.equal(projection.occurrenceIds.length, 3);
  assert.deepEqual(projection.rowIds, projection.itemRefs);
  assert.deepEqual(projection.occurrenceIds, projection.itemRefs);
  Object.values(projection.slots).forEach(slot => {
    assert.deepEqual(slot.sourceItemRefs, projection.sourceItemRefs);
    assert.deepEqual(slot.itemRefs, projection.itemRefs);
    assert.deepEqual(slot.rowIds, projection.rowIds);
    assert.deepEqual(slot.occurrenceIds, projection.occurrenceIds);
  });
  assert.deepEqual(projection.todo, projection.itemRefs);
  assert.deepEqual(projection.sheet.map(row => row.itemRef), projection.itemRefs);
  assert.deepEqual(projection.sheet.map(row => row.originalDate), ['2026-09-02', '2026-09-03', '2026-09-04']);
  assert.deepEqual(projection.calendar.itemRefs, projection.itemRefs);
  assert.deepEqual(projection.calendar['2026-09-02'], [projection.itemRefs[0]]);
  assert.deepEqual(projection.occurrenceManifest.rows.map(row => row.rowId), projection.itemRefs);
  assert.deepEqual(projection.downloads.occurrenceIds, projection.occurrenceIds);
});

test('complete TXT has one exact UTF-8 LF payload with every approved field in fixed order', () => {
  const txt = M.serializeCompleteResultTxt('아침 루틴', [{
    stepId: 'step-1',
    sectionTitle: '준비',
    title: '물 마시기',
    occurrenceIndex: 1,
    completed: false,
    executionDate: '2026-09-02',
    time: '07:30',
    memo: '',
    recurrenceSummary: '매일 · 3회',
    sourceProperties: {
      '설명': '천천히 한 잔', '메모': '250ml', '완료 기준': '빈 컵 씻기', '시간대': 'Asia/Seoul', '장소': '주방',
      '소요 시간': '10', '실행 조건': '아침 식사 전', '주의': '천천히 마시기',
    },
    subchecks: [{ title: '컵 씻기', sourceChecked: false }],
    resources: ['https://example.com/water'],
    sources: ['https://example.com/source'],
  }], ['일반 문장']);
  assert.equal(txt, '아침 루틴\n=====\n\n[준비]\n1. ☐ 물 마시기 · 1회차\n   설명: 천천히 한 잔\n   메모: 250ml\n   완료 기준: 빈 컵 씻기\n   날짜: 2026-09-02\n   시간: 07:30\n   시간대: Asia/Seoul\n   장소: 주방\n   소요 시간: 10분\n   반복: 매일 · 3회\n   실행 조건: 아침 식사 전\n   체크리스트:\n     ☐ 컵 씻기\n   자료: https://example.com/water\n   출처: https://example.com/source\n   주의: 천천히 마시기\n\n[원문 메모]\n- 일반 문장\n');
  assert.equal(txt.includes('\r'), false);
  assert.equal(txt.endsWith('\n'), true);
  assert.equal(txt.endsWith('\n\n'), false);
  assert.equal(txt.split('\n').some(line => /[ \t]+$/u.test(line)), false);

  const projection = M.authoringResultProjection(recurringSource('매일', '3회'));
  assert.equal(projection.slots.txt.value, projection.txt);
  assert.equal(projection.slots.txt.download.payload, projection.txt);
  assert.equal(projection.downloads.txt.payload, projection.txt);
  assert.match(projection.txt, /\n   메모: 250ml\n/u);
  assert.match(projection.txt, /\n\[원문 메모\]\n- 이 문장은 Item이 아닌 원문 메모입니다\.\n$/u);
});

test('one occurrence date and completion survive reload, reopen and Undo without changing source Item', () => {
  const rawText = recurringSource('매일', '3회');
  const handoff = M.makeHandoff(rawText, { draftId: 'recurrence-draft', handoffId: 'recurrence-handoff', sourceConfirmed: true, folderId: null });
  let envelope = M.transitionEnvelope(M.initialEnvelope(), { type: 'commit-authoring', handoff }).envelope;
  const flowId = envelope.state.lastReceipt.flowId;
  const flow = stateFlow(envelope.state, flowId);
  const sourceTask = stateTask(envelope.state, flow.steps[0].itemIds[0]);
  const sourceBefore = JSON.stringify(sourceTask);
  const initial = M.resultProjection(envelope.state, flowId);
  const selected = initial.items[1];
  const otherRowsBefore = initial.items.filter(item => item.occurrenceId !== selected.occurrenceId).map(item => ({ id: item.occurrenceId, date: item.executionDate, completed: item.completed }));

  const moved = M.transitionEnvelope(envelope, { type: 'move-occurrence-date', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, date: '2026-09-10' });
  assert.equal(moved.changed, true);
  envelope = moved.envelope;
  let projection = M.resultProjection(envelope.state, flowId);
  assert.equal(projection.items.find(item => item.occurrenceId === selected.occurrenceId).executionDate, '2026-09-10');
  assert.deepEqual(projection.items.filter(item => item.occurrenceId !== selected.occurrenceId).map(item => ({ id: item.occurrenceId, date: item.executionDate, completed: item.completed })), otherRowsBefore);
  assert.equal(JSON.stringify(stateTask(envelope.state, sourceTask.id)), sourceBefore);

  const completed = M.transitionEnvelope(envelope, { type: 'complete-occurrence', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, done: true, completedAt: '2026-09-03T00:00:00.000Z' });
  assert.equal(completed.changed, true);
  assert.equal(M.resultProjection(completed.envelope.state, flowId).items.find(item => item.occurrenceId === selected.occurrenceId).completed, true);
  const undone = M.undoEnvelope(completed.envelope);
  assert.equal(undone.changed, true);
  assert.equal(M.resultProjection(undone.envelope.state, flowId).items.find(item => item.occurrenceId === selected.occurrenceId).completed, false);
  assert.equal(M.resultProjection(undone.envelope.state, flowId).items.find(item => item.occurrenceId === selected.occurrenceId).executionDate, '2026-09-10');

  const operating = { 'flow:saved:plans': '{"byte":"exact"}', 'flow:other': 'unchanged' };
  const storage = M.createMemoryStorage(operating);
  M.writeEnvelope(storage, completed.envelope);
  const restored = M.loadEnvelope(storage);
  assert.equal(restored.status, 'restored');
  projection = M.resultProjection(restored.envelope.state, flowId);
  assert.equal(projection.items.find(item => item.occurrenceId === selected.occurrenceId).executionDate, '2026-09-10');
  assert.equal(projection.items.find(item => item.occurrenceId === selected.occurrenceId).completed, true);
  assert.equal(storage.snapshot()['flow:saved:plans'], operating['flow:saved:plans']);
  assert.equal(storage.snapshot()['flow:other'], operating['flow:other']);
  storage.calls.filter(call => call[0] === 'setItem' || call[0] === 'removeItem').forEach(call => assert.equal(call[1], M.STORAGE_KEY));

  const reopened = M.transitionEnvelope(restored.envelope, { type: 'complete-occurrence', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, done: false });
  assert.equal(reopened.changed, true);
  assert.equal(M.resultProjection(reopened.envelope.state, flowId).items.find(item => item.occurrenceId === selected.occurrenceId).completed, false);
  assert.equal(JSON.stringify(stateTask(reopened.envelope.state, sourceTask.id)), sourceBefore);
});

test('same, invalid, corrupt and cancelled occurrence paths perform zero mutation', () => {
  const handoff = M.makeHandoff(recurringSource('매일', '3회'), { draftId: 'no-op-draft', handoffId: 'no-op-handoff', sourceConfirmed: true, folderId: null });
  const envelope = M.transitionEnvelope(M.initialEnvelope(), { type: 'commit-authoring', handoff }).envelope;
  const flowId = envelope.state.lastReceipt.flowId;
  const selected = M.resultProjection(envelope.state, flowId).items[0];
  const before = JSON.stringify(envelope);
  const same = M.transitionEnvelope(envelope, { type: 'move-occurrence-date', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, date: selected.originalDate });
  assert.equal(same.changed, false);
  assert.equal(JSON.stringify(same.envelope), before);
  const invalidDate = M.transitionEnvelope(envelope, { type: 'move-occurrence-date', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, date: '2026-02-30' });
  assert.equal(invalidDate.changed, false);
  assert.equal(JSON.stringify(invalidDate.envelope), before);
  const invalidIdentity = M.transitionEnvelope(envelope, { type: 'complete-occurrence', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId + '-wrong', originalDate: selected.originalDate, done: true });
  assert.equal(invalidIdentity.changed, false);
  assert.equal(JSON.stringify(invalidIdentity.envelope), before);
  const sameCompletion = M.transitionEnvelope(envelope, { type: 'complete-occurrence', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, done: false });
  assert.equal(sameCompletion.changed, false);
  assert.equal(JSON.stringify(sameCompletion.envelope), before);

  const corrupt = JSON.parse(before);
  corrupt.state.occurrenceOverrides['not-an-occurrence'] = { sourceItemRef: selected.sourceItemRef, originalDate: selected.originalDate, completed: true };
  const storage = M.createMemoryStorage({ [M.STORAGE_KEY]: JSON.stringify(corrupt), 'flow:saved:plans': 'exact' });
  const callsBefore = storage.calls.length;
  assert.equal(M.loadEnvelope(storage).status, 'corrupt');
  assert.equal(storage.snapshot()['flow:saved:plans'], 'exact');
  assert.equal(storage.calls.slice(callsBefore).some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);
});

test('standalone occurrence UI exposes source Item, bounded expansion and shadow-only per-occurrence actions', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /data-source-item-ref=/u);
  assert.match(app, /data-row-id=/u);
  assert.match(app, /data-occurrence-id=/u);
  assert.match(app, /data-action="move-result-occurrence-date"/u);
  assert.match(app, /data-action="toggle-result-occurrence-complete"/u);
  assert.match(app, /이 회차 다시 열기/u);
  assert.match(app, /원본 Item은 바뀌지 않습니다/u);
  assert.match(app, /data-dialog-form="occurrence-date"/u);
  assert.match(app, /data-action="close-dialog">취소/u);
  assert.match(app, /resultOccurrencePage < 130/u);
  assert.match(app, /authoringOccurrencePage < 130/u);
  assert.match(app, /horizonAtLimit \? ' disabled'/u);
  assert.match(app, /resultProjectionOptions\(\)/u);
  assert.match(app, /authoringProjectionOptions\(\)/u);
  assert.match(style, /\.result-occurrence-actions/u);
  assert.match(style, /\.result-horizon/u);
});

test('standalone UI exposes fixed result, trash and P2-C property parity controls', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /\['txt', 'TXT'\], \['todo', '할 일'\], \['calendar', '캘린더'\], \['sheet', '표'\]/u);
  assert.match(app, /data-copy-only="true"/u);
  assert.match(app, /data-action="download-result-txt"/u);
  assert.match(app, /data-action="download-result-csv"/u);
  assert.match(app, /data-action="download-authoring-txt"/u);
  assert.match(app, /data-action="download-authoring-csv"/u);
  assert.match(app, /function downloadLocalResult\(file\)/u);
  assert.match(app, /URL\.revokeObjectURL\(objectUrl\)/u);
  assert.match(app, /다운로드를 요청했어요/u);
  assert.doesNotMatch(app, /다운로드를 시작했어요/u);
  assert.match(app, /data-calendar-week-count=/u);
  assert.match(app, /data-testid="standalone-lossless-table"/u);
  assert.match(app, /data-testid="standalone-lossless-raw"/u);
  assert.match(app, /data-working-source/u);
  assert.match(app, /data-action="move-to-trash"/u);
  assert.match(app, /data-action="restore-trash"/u);
  assert.match(app, /data-action="permanent-delete"/u);
  assert.match(app, /영구 삭제할까요/u);
  assert.match(app, /영구 삭제 뒤에는 Undo하거나 복구할 수 없어요/u);
  assert.doesNotMatch(app, /영구 삭제[^.\n]*곧바로 Undo/u);
  assert.match(app, /data-action="open-authoring-properties"/u);
  assert.match(app, /data-authoring-property-tray="true"/u);
  assert.match(app, /data-action="choose-authoring-property-group"/u);
  assert.match(app, /data-action="edit-authoring-property"/u);
  assert.match(app, /data-authoring-inline-form="true"/u);
  assert.match(app, /if \(entry\.editor === 'native-date'\) return 'date';[\s\S]*if \(entry\.editor === 'native-time'\) return 'time';[\s\S]*return 'text';/u);
  assert.doesNotMatch(app, /entry\.valueKind === 'url'\) return 'url'/u);
  assert.match(app, /data-dialog-form="authoring-dependent-property"/u);
  assert.match(app, /data-dependent-kind=/u);
  assert.match(app, /\['relativeDate', 'timezone', 'repeat'\]\.includes\(kind\)/u);
  assert.doesNotMatch(app, /data-dialog-form="authoring-property"/u);
  assert.match(app, /data-action="locate-authoring-property"/u);
  assert.match(app, /data-property-source-line=/u);
  assert.match(app, /data-action="repair-near-miss"/u);
  assert.match(app, /planAuthoringPropertyBatchEdit/u);
  assert.match(app, /시간과 시간대를 한 번에 적용하고 Undo 한 번으로 되돌립니다/u);
  assert.match(app, /종료를 입력하면 반복과 한 번에 적용합니다/u);
  assert.match(app, /kind === 'repeat' && !repeatEndValue/u);
  assert.match(app, /작성 원문 → 결과/u);
  assert.match(app, /적용하면 이 항목의 원문과 결과가 함께 바뀝니다\./u);
  assert.match(app, /A\.selectAuthoringChooser\(authoringChooser\)/u);
  assert.match(app, /view\.stage === 'value' \? \[authoringPropertyTarget\.editorKey\] : view\.propertyKeys/u);
  assert.match(app, /type: 'remember-value', key: authoringChooser\.property, draft: authoringPropertyTarget/u);
  assert.match(app, /이미 같은 값이에요\. 원문은 바뀌지 않았습니다\./u);
  assert.match(app, /취소했어요\. 원문은 바뀌지 않았습니다\./u);
  assert.match(app, /그대로 두기/u);
  assert.match(app, /authoringSourceMutationCount/u);
  assert.match(style, /\.result-sheet-scroll/u);
  assert.match(style, /\.trash-row/u);
  assert.match(style, /\.property-inline-tray \{ position: static/u);
  assert.match(style, /\.property-inline-form \{ position: static/u);
  assert.match(style, /\.property-group-chooser/u);
  assert.match(style, /\.property-dependent-form/u);
});

test('standalone source update stages a deterministic local three-way candidate without durable writes', () => {
  const envelope = sourceUpdateAuthoredEnvelope();
  const flow = envelope.state.flows.find(entry => entry.origin === 'authoring-handoff');
  const storage = M.createMemoryStorage({
    [M.STORAGE_KEY]: JSON.stringify(envelope),
    'flow:saved:plans': '{"operating":"exact"}',
  });
  const before = storage.snapshot();
  const prepared = M.prepareLocalSourceCandidateReview(
    M.initialSourceCandidateStore(),
    envelope.state,
    flow.id,
  );
  assert.equal(prepared.ok, true);
  assert.equal(prepared.code, 'staged');
  assert.equal(prepared.candidate.provenance.kind, 'local-fixture');
  assert.equal(prepared.candidate.provenance.fixtureId, M.SOURCE_UPDATE_FIXTURE_ID);
  assert.deepEqual(prepared.candidate.changes.map(change => [change.scope, change.kind]), [
    ['flow', 'modified'],
    ['item', 'modified'],
  ]);
  assert.equal(prepared.candidate.base.rawText, prepared.candidate.mine.rawText);
  assert.match(prepared.candidate.incoming.rawText, /새 원문 예시/u);
  assert.deepEqual(storage.snapshot(), before);
  assert.equal(storage.calls.some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);

  const unsupported = M.prepareLocalSourceCandidateReview(
    M.initialSourceCandidateStore(),
    envelope.state,
    'moving',
  );
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.reason, 'unsupported-origin');
});

test('standalone source update blocks unresolved choices, treats same choice and later as write-free, then applies atomically', () => {
  const envelope = sourceUpdateAuthoredEnvelope();
  const flow = envelope.state.flows.find(entry => entry.origin === 'authoring-handoff');
  const prepared = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(), envelope.state, flow.id);
  assert.equal(prepared.ok, true);
  const blocked = M.applyLocalSourceCandidate(
    prepared.store,
    envelope.state,
    flow.id,
    prepared.candidate.candidateId,
    '2026-09-04T01:00:00.000Z',
  );
  assert.equal(blocked.changed, false);
  assert.equal(blocked.code, 'unresolved');

  const first = prepared.candidate.changes[0];
  const chosen = M.resolveLocalSourceCandidateChange(prepared.store, {
    candidateId: prepared.candidate.candidateId,
    changeId: first.changeId,
    resolution: 'use-incoming',
    now: '2026-09-04T01:01:00.000Z',
  });
  assert.equal(chosen.changed, true);
  const same = M.resolveLocalSourceCandidateChange(chosen.store, {
    candidateId: prepared.candidate.candidateId,
    changeId: first.changeId,
    resolution: 'use-incoming',
    now: '2026-09-04T01:02:00.000Z',
  });
  assert.equal(same.changed, false);
  assert.equal(same.code, 'no-op');
  const later = M.resolveLocalSourceCandidateChange(chosen.store, {
    candidateId: prepared.candidate.candidateId,
    changeId: first.changeId,
    resolution: 'later',
    now: '2026-09-04T01:03:00.000Z',
  });
  assert.equal(later.changed, true);
  assert.equal(later.code, 'resolution-cleared');

  let working = prepared.store;
  prepared.candidate.changes.forEach((change, index) => {
    working = M.resolveLocalSourceCandidateChange(working, {
      candidateId: prepared.candidate.candidateId,
      changeId: change.changeId,
      resolution: 'use-incoming',
      now: '2026-09-04T01:1' + index + ':00.000Z',
    }).store;
  });
  const applied = M.applyLocalSourceCandidate(
    working,
    envelope.state,
    flow.id,
    prepared.candidate.candidateId,
    '2026-09-04T01:30:00.000Z',
  );
  assert.equal(applied.changed, true);
  assert.equal(applied.code, 'applied');
  assert.ok(applied.store.undo);
});

test('source apply, reload and Undo use only the exact candidate key and preserve workspace and operating bytes', () => {
  let envelope = sourceUpdateAuthoredEnvelope();
  const flow = envelope.state.flows.find(entry => entry.origin === 'authoring-handoff');
  const taskId = flow.steps[0].itemIds[0];
  envelope = M.transitionEnvelope(envelope, { type: 'move-folder', kind: 'flow', id: flow.id, folderId: 'work' }).envelope;
  envelope = M.transitionEnvelope(envelope, { type: 'schedule', id: taskId, date: '2026-09-07' }).envelope;
  envelope = M.transitionEnvelope(envelope, { type: 'complete', id: taskId, done: true }).envelope;
  const task = stateTask(envelope.state, taskId);
  envelope = M.transitionEnvelope(envelope, {
    type: 'commit-personal-plan',
    flowId: flow.id,
    title: stateFlow(envelope.state, flow.id).title,
    items: [{ id: taskId, title: task.title, memo: '개인 메모 유지', planDate: '2026-09-08' }],
  }).envelope;
  const workspaceBytes = JSON.stringify(envelope);
  const operating = {
    'flow:saved:plans': ' { "spacing": "exact" } ',
    'flow:canonical:bundle': '00ff\nraw',
  };
  const storage = M.createMemoryStorage(Object.assign({ [M.STORAGE_KEY]: workspaceBytes }, operating));
  const prepared = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(), envelope.state, flow.id);
  let working = prepared.store;
  prepared.candidate.changes.forEach((change, index) => {
    working = M.resolveLocalSourceCandidateChange(working, {
      candidateId: prepared.candidate.candidateId,
      changeId: change.changeId,
      resolution: 'use-incoming',
      now: '2026-09-04T02:0' + index + ':00.000Z',
    }).store;
  });
  const applied = M.applyLocalSourceCandidate(
    working,
    envelope.state,
    flow.id,
    prepared.candidate.candidateId,
    '2026-09-04T02:30:00.000Z',
  );
  assert.equal(applied.changed, true);
  const appliedBytes = M.writeSourceCandidateStore(storage, applied.store, null);
  assert.equal(storage.snapshot()[M.STORAGE_KEY], workspaceBytes);
  Object.entries(operating).forEach(([key, value]) => assert.equal(storage.snapshot()[key], value));
  const mutations = storage.calls.filter(call => call[0] === 'setItem' || call[0] === 'removeItem');
  assert.deepEqual(mutations.map(call => call[1]), [M.SOURCE_CANDIDATE_STORAGE_KEY]);

  const reloaded = M.loadSourceCandidateStore(storage);
  assert.equal(reloaded.status, 'restored');
  assert.equal(reloaded.raw, appliedBytes);
  const projected = M.composeSourceCandidateState(envelope.state, reloaded.store);
  const projectedFlow = stateFlow(projected, flow.id);
  const projectedTask = stateTask(projected, taskId);
  assert.match(projectedFlow.title, /새 원문 예시/u);
  assert.match(projectedTask.title, /새 원문 예시/u);
  assert.equal(projectedFlow.folderId, 'work');
  assert.equal(projectedTask.date, '2026-09-07');
  assert.equal(projectedTask.planDate, '2026-09-08');
  assert.equal(projectedTask.memo, '개인 메모 유지');
  assert.equal(projectedTask.done, true);

  const undone = M.undoLocalSourceCandidate(reloaded.store, '2026-09-04T03:00:00.000Z');
  assert.equal(undone.changed, true);
  const undoneBytes = M.writeSourceCandidateStore(storage, undone.store, reloaded.raw);
  assert.equal(M.loadSourceCandidateStore(storage).raw, undoneBytes);
  const restoredProjection = M.composeSourceCandidateState(envelope.state, undone.store);
  assert.doesNotMatch(stateFlow(restoredProjection, flow.id).title, /새 원문 예시/u);
  assert.equal(stateTask(restoredProjection, taskId).date, '2026-09-07');
  assert.equal(stateTask(restoredProjection, taskId).done, true);
  assert.equal(storage.snapshot()[M.STORAGE_KEY], workspaceBytes);
  Object.entries(operating).forEach(([key, value]) => assert.equal(storage.snapshot()[key], value));
});

test('source candidate CAS, corruption and readback failure fail closed with exact rollback', () => {
  const initial = M.initialSourceCandidateStore();
  const initialBytes = JSON.stringify(initial);
  const staleStorage = M.createMemoryStorage({ [M.SOURCE_CANDIDATE_STORAGE_KEY]: initialBytes, 'flow:saved:plans': 'keep' });
  assert.throws(
    () => M.writeSourceCandidateStore(staleStorage, initial, '{different-bytes}'),
    /source-candidate-stale-write/u,
  );
  assert.equal(staleStorage.calls.some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);
  assert.equal(staleStorage.snapshot()[M.SOURCE_CANDIDATE_STORAGE_KEY], initialBytes);

  const corruptStorage = M.createMemoryStorage({ [M.SOURCE_CANDIDATE_STORAGE_KEY]: '{not-json', 'flow:saved:plans': 'keep' });
  const corrupt = M.loadSourceCandidateStore(corruptStorage);
  assert.equal(corrupt.status, 'corrupt');
  assert.equal(corrupt.store, null);
  assert.equal(corruptStorage.snapshot()[M.SOURCE_CANDIDATE_STORAGE_KEY], '{not-json');
  assert.equal(corruptStorage.calls.some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);

  let current = initialBytes;
  let failNextReadback = false;
  const calls = [];
  const rollbackStorage = {
    getItem(key) {
      calls.push(['getItem', key]);
      if (failNextReadback) { failNextReadback = false; return '{readback-mismatch}'; }
      return current;
    },
    setItem(key, value) {
      calls.push(['setItem', key, value]);
      current = String(value);
      if (current !== initialBytes) failNextReadback = true;
    },
    removeItem(key) { calls.push(['removeItem', key]); current = null; },
  };
  const changedStore = sourceUpdateRuntime.createPersonalWorkspacePocSourceCandidateStore('2026-09-04T04:00:00.000Z');
  assert.throws(
    () => M.writeSourceCandidateStore(rollbackStorage, changedStore, initialBytes),
    /source-candidate-write-verification-failed/u,
  );
  assert.equal(current, initialBytes);
  assert.equal(calls.filter(call => call[0] === 'setItem').every(call => call[1] === M.SOURCE_CANDIDATE_STORAGE_KEY), true);
});

test('standalone source update UI exposes local provenance, responsive compare and keyboard-safe dismissal', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  const model = fs.readFileSync(modelPath, 'utf8');
  assert.match(model, /sourceUpdateRuntime\)/u);
  assert.match(model, /flow:poc:personal-workspace:v1:source-candidates/u);
  assert.match(model, /function writeSourceCandidateStore\(storage, store, expectedRaw\)/u);
  assert.match(model, /before !== expectedRaw/u);
  assert.match(model, /source-candidate-write-verification-failed/u);
  assert.match(model, /function composeSourceCandidateState\(state, store\)/u);
  assert.match(app, /외부 원문을 확인하지 않습니다/u);
  assert.match(app, /예시 원문 비교/u);
  assert.match(app, /로컬 원문 비교 연습/u);
  assert.match(app, /Base · 기준 원문/u);
  assert.match(app, /내 작업 유지/u);
  assert.match(app, /새 원문 선택/u);
  assert.match(app, /나중에 결정/u);
  assert.match(app, /data-testid="standalone-source-update-dialog"/u);
  assert.match(app, /event\.key === 'Escape'[\s\S]*closeSourceUpdateReview\(\)/u);
  assert.match(app, /dialog\.querySelectorAll\('button:not\(\[disabled\]\), input:not\(\[disabled\]\)/u);
  assert.match(app, /source-candidate-stale-write/u);
  assert.match(style, /\.source-update-backdrop \{[\s\S]*position: fixed;[\s\S]*z-index: 160/u);
  assert.match(style, /\.source-update-dialog \{[\s\S]*max-height: min\(calc\(var\(--standalone-visual-viewport-height\)/u);
  assert.match(style, /@media \(min-width: 900px\)[\s\S]*\.source-update-dialog \{ width: min\(680px, 72vw\); height: min\(var\(--standalone-visual-viewport-height\), 100dvh\)/u);
  assert.match(style, /\.source-update-dialog \.button,[\s\S]*min-height: 44px/u);
  assert.match(style, /\.source-update-body \{[\s\S]*overflow-y: auto/u);
});

test('single-file build is deterministic and contains inline CSS, model and app', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const androidHtml = fs.readFileSync(androidHtmlPath, 'utf8');
  assert.equal(html, singleFile.buildText());
  assert.equal(androidHtml, html);
  assert.match(html, /<title>FlowMe 개인공간<\/title>/u);
  assert.match(html, /flow:poc:personal-workspace:v1:standalone-integrated/u);
  assert.match(html, /data-flowme-standalone-inline="style"/u);
  assert.match(html, /data-flowme-standalone-inline="lossless-authoring"/u);
  assert.match(html, /data-flowme-standalone-inline="validation-examples"/u);
  assert.match(html, /data-flowme-standalone-inline="structure-template"/u);
  assert.match(html, /data-flowme-standalone-inline="source-update"/u);
  assert.match(html, /data-flowme-standalone-inline="model"/u);
  assert.match(html, /data-flowme-standalone-inline="app"/u);
  assert.ok(
    html.indexOf('data-flowme-standalone-inline="lossless-authoring"')
      < html.indexOf('data-flowme-standalone-inline="model"'),
  );
  assert.ok(
    html.indexOf('data-flowme-standalone-inline="validation-examples"')
      < html.indexOf('data-flowme-standalone-inline="model"'),
  );
  assert.ok(
    html.indexOf('data-flowme-standalone-inline="source-update"')
      < html.indexOf('data-flowme-standalone-inline="model"'),
  );
  assert.match(html, /FlowMePersonalWorkspaceLosslessAuthoring/u);
  assert.match(html, /FlowMePersonalWorkspacePocValidationExamples/u);
  assert.match(html, /FlowMePersonalWorkspaceSourceUpdate/u);
  assert.match(html, /id="compact-undo-button"/u);
  assert.match(html, /\[elements\.undo, elements\.compactUndo\]/u);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/iu);
  assert.doesNotMatch(html, /<link\b[^>]*\brel="stylesheet"/iu);
  assert.doesNotMatch(html, /__FLOWME_INLINE_(?:STYLE|LOSSLESS_AUTHORING|VALIDATION_EXAMPLES|STRUCTURE_TEMPLATE|SOURCE_UPDATE|MODEL|APP)__/u);
});

test('static boot fallback remains when JavaScript is blocked', () => {
  const shell = fs.readFileSync(singleFile.paths.shell, 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');
  [shell, html].forEach(source => {
    assert.match(source, /id="boot-fallback"/u);
    assert.match(source, /이 안내가 계속 보이면 현재 미리보기에서는 화면을 조작할 수 없습니다/u);
    assert.match(source, /Chrome, Safari 또는 데스크톱 브라우저에서 열어 주세요/u);
  });
});
