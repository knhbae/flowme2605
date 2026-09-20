import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';

function fixture(raw = '- [ ] 첫 준비\n  - 날짜: 2026-09-20\n  - 메모: 처음 메모') {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '숫자 일괄 입력' });
  const id = state.documents[0].id;
  state = M.editText(state, id, raw, { progressDate: '2026-09-12' });
  assert.equal(M.raw(state.documents[0]), raw);
  return { state, id };
}

for (const token of ['20%', '20', '0.2']) test(`bulk numeric ${token} preserves existing identity while adding a task`, () => {
  let { state, id } = fixture();
  const taskId = M.tasks(state)[0].id;
  state = M.recordProgress(state, taskId, '2026-09-19', 10);
  const before = structuredClone(state);
  const raw = `- [40%] 첫 준비\n  - 날짜: 2026-09-23\n  - 메모: 나중 메모\n- [${token}] 나중 추가\n  - 날짜: 2026-09-24`;
  const next = M.editText(state, id, raw);
  assert.notEqual(next, state);
  assert(M.validate(next));
  assert.equal(M.raw(next.documents[0]), raw);
  assert.equal(M.tasks(next)[0].id, taskId);
  assert.deepEqual(M.progressHistory(next, taskId), [{ date: '2026-09-19', percent: 10 }, { date: '2026-09-23', percent: 40 }]);
  assert.deepEqual(M.latestProgress(next, M.tasks(next)[1].id), { date: '2026-09-24', percent: 20 });
  assert.deepEqual(state, before);
  assert.equal(M.editText(next, id, raw), next);
});

test('ambiguous same-title replacements do not guess identities', () => {
  const { state, id } = fixture('- [ ] 같은 제목\n- [ ] 같은 제목');
  assert.equal(M.editText(state, id, '- [20%] 같은 제목\n- [40%] 같은 제목\n- [ ] 추가', { progressDate: '2026-09-12' }), state);
});

test('unrelated multi-task rename still fails closed', () => {
  const { state, id } = fixture('- [ ] 이전 하나\n- [ ] 이전 둘');
  assert.equal(M.editText(state, id, '- [20%] 새 하나\n- [40%] 새 둘\n- [ ] 추가', { progressDate: '2026-09-12' }), state);
});

test('numeric bulk input without a valid explicit execution date remains atomic', () => {
  const { state, id } = fixture('- [ ] 첫 준비');
  const raw = '- [40%] 첫 준비\n- [20%] 추가';
  assert.equal(M.editText(state, id, raw), state);
  assert.equal(M.editText(state, id, raw, { progressDate: '2026-02-30' }), state);
  assert.equal(M.editText(state, id, 'x'.repeat(100001)), state);
  assert.equal(M.editText(state, id, Array(1201).fill('- 메모').join('\n')), state);
});

test('equivalent numeric notation plus insertion does not create another dated progress entry', () => {
  const { state, id } = fixture('- [20%] 첫 준비\n  - 날짜: 2026-09-20');
  const taskId = M.tasks(state)[0].id;
  const next = M.editText(state, id, '- [0.2] 첫 준비\n  - 날짜: 2026-09-20\n- [ ] 새 준비', { progressDate: '2026-09-25' });
  assert.notEqual(next, state);
  assert.equal(M.tasks(next)[0].id, taskId);
  assert.deepEqual(next.progressRecords, state.progressRecords);
});

for (const [token, percent] of [['0%', 0], ['100%', 100], ['0', 0], ['1.0', 100]] as const) test(`numeric boundary ${token} keeps its canonical meaning`, () => {
  const { state, id } = fixture('- [ ] 첫 준비');
  const taskId = M.tasks(state)[0].id;
  const next = M.editText(state, id, `- [${token}] 첫 준비\n- [ ] 추가`, { progressDate: '2026-09-12' });
  assert.notEqual(next, state);
  assert.equal(M.tasks(next)[0].id, taskId);
  assert.deepEqual(M.latestProgress(next, taskId), { date: '2026-09-12', percent });
});

test('invalid numeric spellings do not turn an existing task into another identity', () => {
  const { state, id } = fixture('- [ ] 첫 준비');
  for (const token of ['101%', '-1', '.2', '1.2', 'NaN']) {
    assert.equal(M.parseProgressToken(token).ok, false);
    assert.equal(M.editText(state, id, `- [${token}] 첫 준비\n- [20%] 추가`, { progressDate: '2026-09-12' }), state);
  }
});

test('unique child progress edit under the same exact parent retains its ID', () => {
  const { state, id } = fixture('- [ ] 부모\n  - [ ] 자식');
  const childId = state.documents[0].lines[1].id;
  const next = M.editText(state, id, '- [ ] 부모\n  - [20%] 자식\n  - [ ] 추가', { progressDate: '2026-09-12' });
  assert.notEqual(next, state);
  assert.equal(next.documents[0].lines[1].id, childId);
  assert.deepEqual(M.latestProgress(next, childId), { date: '2026-09-12', percent: 20 });
});

test('bulk numeric input cannot infer a changed parent or depth', () => {
  const { state, id } = fixture('- [ ] 부모\n  - [ ] 자식\n- [ ] 다른 부모');
  for (const raw of [
    '- [ ] 부모\n- [ ] 다른 부모\n  - [20%] 자식\n  - [ ] 추가',
    '- [ ] 부모\n- [20%] 자식\n- [ ] 추가\n- [ ] 다른 부모',
  ]) assert.equal(M.editText(state, id, raw, { progressDate: '2026-09-12' }), state);
});
