import assert from 'node:assert/strict';
import test from 'node:test';
import {createEmptyTextWorkspace,textWorkspaceModel as M} from './text-workspace';
function fixture() {
  let state=M.addDocument(createEmptyTextWorkspace(),{title:'가상 폴더 복붙'});
  const docId=state.documents[0].id;
  const block='- 미분류\n  - [ ] 회의 준비\n    - 날짜: 2026-10-09\n    - 메모: 가상 비교 메모';
  state=M.attachScope(state,docId,0,'folder-unfiled');
  assert.equal(state.bindings.length,1);
  state=M.editText(state,docId,`${block}\n끝 메모`);
  return {state,docId,block,task:M.tasks(state)[0],scopeLine:M.getDocument(state,docId)!.lines[0]};
}
test('plain folder subtree copy keeps raw hierarchy, but creates a new Item without an implicit folder link',()=>{
  const f=fixture(),before=structuredClone(f.state),raw=M.raw(M.getDocument(f.state,f.docId));
  const result=M.editTextResult(f.state,f.docId,`${raw}\n${f.block}`);assert.equal(result.reason,null);
  const tasks=M.tasks(result.state),rows=M.rowMeta(result.state,f.docId);
  assert.equal(tasks.length,2);assert.equal(tasks[0].id,f.task.id);assert.notEqual(tasks[1].id,f.task.id);
  assert.equal(tasks[1].date,f.task.date);assert.equal(tasks[1].note,f.task.note);
  assert.equal(rows[0].kind,'scope');assert.equal(rows[5].kind,'note');
  assert.equal(rows[6].depth,1);assert.deepEqual(result.state.bindings,f.state.bindings);
  assert.deepEqual(f.state,before);assert.equal(M.raw(M.getDocument(result.state,f.docId)),`${raw}\n${f.block}`);
});
test('explicit folder subtree move preserves the scope line, same Item, date, memo and recorded progress',()=>{
  const f=fixture(),state=M.recordProgress(f.state,f.task.id,'2026-10-09',20);
  const moved=M.moveSubtree(state,f.docId,f.scopeLine.id,null,0);assert.notEqual(moved,state);assert(M.validate(moved));
  const {sourceIndex: movedIndex,...after}=M.tasks(moved).find(t=>t.id===f.task.id)!;
  const {sourceIndex: beforeIndex,...before}=M.tasks(state)[0];
  assert.notEqual(movedIndex,beforeIndex);assert.deepEqual(after,before);
  assert.deepEqual(moved.bindings,state.bindings);assert.deepEqual(moved.progressRecords,state.progressRecords);
  assert.equal(M.rowMeta(moved,f.docId).find(r=>r.id===f.scopeLine.id)?.kind,'scope');
});
test('raw cut of a recorded folder subtree cannot silently orphan its personal progress',()=>{
  const f=fixture(),state=M.recordProgress(f.state,f.task.id,'2026-10-09',20);
  const result=M.editTextResult(state,f.docId,'끝 메모');assert.equal(result.reason,'blocked');assert.equal(result.state,state);
});
