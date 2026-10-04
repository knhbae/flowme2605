import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, programResult } from './contract';
import { createProgramController } from './controller';
import { createProgramData } from './program-data';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

const block = '- [ ] 준비\n  - 시간: 09:30\n  - 메모: 첫 줄\n  - 메모: 둘째 줄';

function fixture(recorded = true) {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '부분 붙여넣기 회귀' });
  const docId = workspace.documents[0].id;
  const raw = `[2026-10-05]\n${block}\n[2026-10-08]\n- [ ] 예약`;
  workspace = M.editText(workspace, docId, raw);
  const taskId = M.tasks(workspace)[0].id;
  if (recorded) {
    workspace = M.recordProgress(workspace, taskId, '2026-10-01', 25);
    workspace = M.recordProgress(workspace, taskId, '2026-10-02', 50);
  }
  assert(M.validate(workspace)); assert.equal(M.raw(M.getDocument(workspace, docId)), raw);
  return { workspace, docId, taskId, raw };
}

function replaceSelection(raw: string, selected: string, pasted: string) {
  const start = raw.indexOf(selected); assert(start >= 0);
  return raw.slice(0, start) + pasted + raw.slice(start + selected.length);
}

test('MD09 partial title and memo replacements retain the existing Item and all unrelated source lines', () => {
  const f = fixture(), before = structuredClone(f.workspace);
  let next = M.editTextResult(f.workspace, f.docId, replaceSelection(f.raw, '준비', '준비 확인'));
  assert.equal(next.reason, null);
  const titled = next.state;
  next = M.editTextResult(titled, f.docId, replaceSelection(M.raw(M.getDocument(titled, f.docId)), '첫 줄', '첫 줄 추가'));
  assert.equal(next.reason, null); assert(M.validate(next.state));
  const task = M.tasks(next.state).find(item => item.id === f.taskId)!;
  assert.equal(task.title, '준비 확인'); assert.equal(task.note, '첫 줄 추가\n둘째 줄');
  assert.equal(task.date, '2026-10-05'); assert.equal(task.time, '09:30');
  assert.deepEqual(next.state.documents[0].lines.map(line => line.id), f.workspace.documents[0].lines.map(line => line.id));
  assert.deepEqual(next.state.taskScopes, f.workspace.taskScopes); assert.deepEqual(next.state.itemScopes, f.workspace.itemScopes);
  assert.deepEqual(next.state.progressRecords, f.workspace.progressRecords); assert.deepEqual(f.workspace, before);
  assert.equal(M.tasks(next.state).find(item => item.title === '예약')!.id, M.tasks(f.workspace)[1].id);
});

test('MD09 copied partial subtree is a distinct Item at the destination date and does not copy execution history', () => {
  const f = fixture(), pastedRaw = `${f.raw}\n${block}`;
  const result = M.editTextResult(f.workspace, f.docId, pastedRaw);
  assert.equal(result.reason, null); assert.equal(M.raw(M.getDocument(result.state, f.docId)), pastedRaw);
  const originals = M.tasks(result.state).filter(item => item.title === '준비');
  assert.equal(originals.length, 2); assert.equal(originals[0].id, f.taskId); assert.notEqual(originals[1].id, f.taskId);
  assert.equal(originals[0].date, '2026-10-05'); assert.equal(originals[1].date, '2026-10-08');
  assert.equal(originals[1].note, '첫 줄\n둘째 줄'); assert.equal(originals[1].time, '09:30');
  assert.deepEqual(result.state.progressRecords, f.workspace.progressRecords);
  assert.deepEqual(M.progressHistory(result.state, originals[1].id), []);
  const changedCopy = M.updateTask(result.state, originals[1].id, { title: '사본 준비' });
  assert.equal(M.tasks(changedCopy).find(item => item.id === f.taskId)!.title, '준비');
  assert.deepEqual(M.progressHistory(changedCopy, f.taskId), M.progressHistory(f.workspace, f.taskId));
});

test('MD09 replacing the same partial selection with identical bytes is an identity no-op', () => {
  const f = fixture();
  for (const selected of ['준비', '첫 줄', block]) {
    const result = M.editTextResult(f.workspace, f.docId, replaceSelection(f.raw, selected, selected));
    assert.equal(result.reason, null); assert.equal(result.state, f.workspace);
  }
});

test('MD09 a cut that would orphan recorded progress is rejected while explicit move preserves the Item', () => {
  const f = fixture(), before = structuredClone(f.workspace);
  const cut = M.editTextResult(f.workspace, f.docId, f.raw.replace(`${block}\n`, ''));
  assert.equal(cut.reason, 'blocked'); assert.equal(cut.state, f.workspace);
  const moved = M.moveSubtree(f.workspace, f.docId, f.taskId, null, 0);
  assert.notEqual(moved, f.workspace); assert(M.validate(moved));
  const task = M.tasks(moved).find(item => item.id === f.taskId)!;
  assert.equal(task.date, '2026-10-05'); assert.equal(task.note, '첫 줄\n둘째 줄'); assert.equal(task.time, '09:30');
  assert.deepEqual(moved.progressRecords, f.workspace.progressRecords);
  assert.deepEqual(moved.taskScopes, f.workspace.taskScopes); assert.deepEqual(moved.itemScopes, f.workspace.itemScopes);
  assert.deepEqual(f.workspace, before);
});

test('MD09 two accepted raw cut/paste events without recorded progress create a new Item, not an implicit move', () => {
  const f = fixture(false), cutRaw = f.raw.replace(`${block}\n`, '');
  const cut = M.editTextResult(f.workspace, f.docId, cutRaw); assert.equal(cut.reason, null);
  const pasted = M.editTextResult(cut.state, f.docId, `${cutRaw}\n${block}`); assert.equal(pasted.reason, null);
  const copy = M.tasks(pasted.state).find(item => item.title === '준비')!;
  assert.notEqual(copy.id, f.taskId); assert.equal(copy.date, '2026-10-08');
  assert.equal(copy.note, '첫 줄\n둘째 줄'); assert.equal(copy.time, '09:30'); assert(M.validate(pasted.state));
});

test('MD09 saved partial paste and structural move use full private snapshots for exact global Undo/Redo', async () => {
  const f = fixture(), data = createProgramData(), actorId = data.activeActorId;
  data.spaces[actorId].text = f.workspace;
  const values = new Map<string, string>(); let writes = 0;
  const controller = createProgramController({ initialData: data, exclusive: async work => work(), storage: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes++; values.set(key, value); }, removeItem: key => { values.delete(key); },
  } });
  assert(controller.ok);
  const commit = async (workspace: TextWorkspaceState, label: string) => controller.mutate(label, current => {
    const next = programClone(current); next.spaces[actorId].text = workspace;
    return programResult(current, next, f.docId);
  }, { actorId });
  const pasted = M.editText(f.workspace, f.docId, `${f.raw}\n${block}`);
  assert((await commit(pasted, '부분 붙여넣기')).ok);
  const pastedSpace = controller.snapshot().envelope.data.spaces[actorId];
  assert((await controller.undo(actorId)).ok);
  assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId].text, f.workspace);
  assert((await controller.redo(actorId)).ok);
  assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], pastedSpace);
  const moved = M.moveSubtree(pasted, f.docId, f.taskId, null, 0);
  assert((await commit(moved, '하위 묶음 이동')).ok);
  const movedSpace = controller.snapshot().envelope.data.spaces[actorId];
  assert((await controller.undo(actorId)).ok);
  assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], pastedSpace);
  assert((await controller.redo(actorId)).ok);
  assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], movedSpace);
  const restarted = createProgramController({ initialData: data, exclusive: async work => work(), storage: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); },
  } });
  assert(restarted.ok); assert.deepEqual(restarted.snapshot(), controller.snapshot()); assert.equal(writes, 6);
});
