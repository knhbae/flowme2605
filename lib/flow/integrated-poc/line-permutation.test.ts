import assert from 'node:assert/strict';
import test from 'node:test';
import { applyProgramLinePermutation as apply, createProgramPermutationHistory } from './line-permutation';
import { planProgramDateBlockOrder } from './date-block-order';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';

function fixture() {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '순열' });
  const id = state.documents[0].id;
  state = M.editText(state, id, '## 준비\n- [40%] 같은 제목\n  - 날짜: 2026-09-23\n  - 모르는 속성: exact\n  - [ ] 하위\n\n- [20%] 같은 제목\n  - 날짜: 2026-09-20', { progressDate: '2026-09-12' });
  const plan = planProgramDateBlockOrder(state, id, state.documents[0].lines[0].id);
  assert.equal(plan.status, 'ready'); if (plan.status !== 'ready') throw new Error('fixture');
  return { state, id, plan, next: apply(state, id, plan.afterLineIds)! };
}
test('explicit permutation preserves unknown owned lines, cumulative history and exact inverse', () => {
  const { state, id, plan, next } = fixture();
  assert(M.validate(next)); assert.deepEqual(next.progressRecords, state.progressRecords);
  assert.deepEqual(apply(next, id, plan.beforeLineIds), state);
  assert(M.raw(next.documents[0]).includes('  - 모르는 속성: exact'));
});
test('history bridge resolves only actual history type and exact workspace', () => {
  const { state, id, next } = fixture(), history = createProgramPermutationHistory(id);
  assert(history.record(state, next));
  assert.equal(history.resolve(next, M.raw(state.documents[0]), 'insertText'), null);
  assert.deepEqual(history.resolve(next, M.raw(state.documents[0]), 'historyUndo'), state);
  assert.deepEqual(history.resolve(state, M.raw(next.documents[0]), 'historyRedo'), next);
  const foreign = M.addDocument(next, { title: '새 문맥' });
  const rebased = history.resolve(foreign, M.raw(state.documents[0]), 'historyUndo')!;
  assert.deepEqual(rebased.documents[1], foreign.documents[1]);
  assert.deepEqual(rebased.documents[0], state.documents[0]);
  history.clear(); assert.equal(history.resolve(next, M.raw(state.documents[0]), 'historyUndo'), null);
});
test('duplicate, missing, foreign IDs and semantic reparenting are rejected without mutation', () => {
  const { state, id, plan } = fixture(), before = structuredClone(state);
  assert.equal(apply(state, id, plan.beforeLineIds), state);
  assert.equal(apply(state, id, plan.beforeLineIds.slice(1)), null);
  assert.equal(apply(state, id, [...plan.beforeLineIds.slice(1), 'foreign']), null);
  assert.equal(apply(state, id, plan.beforeLineIds.map(() => plan.beforeLineIds[0])), null);
  const reversed = plan.beforeLineIds.slice(); [reversed[2], reversed[7]] = [reversed[7], reversed[2]];
  assert.equal(apply(state, id, reversed), null);
  assert.deepEqual(state, before);
});

test('private Flow documents sort without changing their source version or other documents', () => {
  const { state, id } = fixture();
  const privateFlow = { ...state.documents[0], private: true as const, sourceVersion: 'original-v1' };
  const workspace = { ...state, documents: [], flows: [privateFlow] };
  assert(M.validate(workspace));
  const plan = planProgramDateBlockOrder(workspace, id, privateFlow.lines[0].id);
  assert.equal(plan.status, 'ready'); if (plan.status !== 'ready') return;
  const next = apply(workspace, id, plan.afterLineIds)!;
  assert.equal(next.flows[0].sourceVersion, 'original-v1');
  assert.deepEqual(apply(next, id, plan.beforeLineIds), workspace);
});

test('history rebase keeps later execution progress and unrelated document changes', () => {
  const { state, id, next } = fixture(), history = createProgramPermutationHistory(id);
  assert(history.record(state, next));
  let current = M.addDocument(next, { title: '별도 문서' });
  const otherId = current.documents[1].id;
  current = M.editText(current, otherId, '보존할 새 메모');
  current = M.recordProgress(current, M.tasks(current)[0].id, '2026-10-01', 80);
  const restored = history.resolve(current, M.raw(state.documents[0]), 'historyUndo')!;
  assert(restored); assert.deepEqual(restored.progressRecords, current.progressRecords);
  assert.deepEqual(restored.documents[1], current.documents[1]);
  assert.deepEqual(restored.documents[0], state.documents[0]);
});

test('adversarial permutations cannot reorder or reparent subchecks, properties or unknown owned notes', () => {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '하위 소유 검사' });
  const id = state.documents[0].id;
  state = M.editText(state, id, '- [ ] 부모 A\n  - [ ] 자식1\n    - 날짜: 2026-09-20\n    - 메모: 보존\n    - 모르는 속성: 그대로\n  - [x] 자식2\n- [ ] 부모 B');
  assert(M.validate(state));
  const ids = state.documents[0].lines.map(line => line.id), before = structuredClone(state);
  for (const order of [
    [0, 5, 1, 2, 3, 4, 6], // same parent, reversed child order and completion positions
    [0, 1, 2, 3, 4, 6, 5], // completed child moved to another parent
    [0, 1, 3, 2, 4, 5, 6], // same values, changed property order
    [0, 1, 2, 3, 5, 4, 6], // unknown note moved to the other child
  ]) assert.equal(apply(state, id, order.map(index => ids[index])), null);
  assert.deepEqual(state, before);
});
