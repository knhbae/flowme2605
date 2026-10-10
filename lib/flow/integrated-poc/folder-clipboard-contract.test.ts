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

function scopedRecordedFixture() {
  let state=M.addDocument(createEmptyTextWorkspace(),{title:'업무 폴더 복붙'});
  const docId=state.documents[0].id;
  state=M.createFolderAt(state,docId,0,'업무');
  const folderId=state.folders.find(folder=>folder.title==='업무')!.id;
  const block='- 업무\n  - [ ] 회의 준비\n    - 날짜: 2026-10-09\n    - 메모: 원본 회의 메모\n    - [ ] 자료 확인\n      - 메모: 원본 자료 메모';
  state=M.editText(state,docId,`${block}\n끝 메모`);
  const task=M.tasks(state)[0],child=M.rowMeta(state,docId).find(row=>row.kind==='subcheck')!;
  state=M.recordProgress(state,task.id,'2026-10-08',20);
  state=M.recordProgress(state,child.id,'2026-10-09',60);
  assert(M.validate(state));assert.equal(task.scopeId,folderId);assert.equal(state.itemScopes[child.id],folderId);
  return {state,docId,block,folderId,task,child,lines:M.getDocument(state,docId)!.lines};
}

for (const location of ['prepend','append'] as const) {
  test(`native ${location} of an entire scoped subtree keeps original IDs, scope binding and recorded progress`,()=>{
    const f=scopedRecordedFixture(),before=structuredClone(f.state),raw=M.raw(M.getDocument(f.state,f.docId));
    const start=location==='prepend'?0:raw.length,pasted=location==='prepend'?`${f.block}\n`:`\n${f.block}`;
    const target=raw.slice(0,start)+pasted+raw.slice(start);
    const result=M.editTextResult(f.state,f.docId,target,{inputSplice:{start,end:start,text:pasted}});
    assert.equal(result.reason,null);assert(M.validate(result.state));
    const lines=M.getDocument(result.state,f.docId)!.lines,copyLength=f.block.split('\n').length;
    const originalStart=location==='prepend'?copyLength:0,copyStart=location==='prepend'?0:f.lines.length;
    assert.deepEqual(lines.slice(originalStart,originalStart+f.lines.length),f.lines);
    const oldIds=new Set(f.lines.map(line=>line.id));
    assert(lines.slice(copyStart,copyStart+copyLength).every(line=>!oldIds.has(line.id)));
    assert.deepEqual(result.state.bindings,f.state.bindings);assert.deepEqual(result.state.progressRecords,f.state.progressRecords);
    const original=M.tasks(result.state).find(task=>task.id===f.task.id)!,copy=M.tasks(result.state).find(task=>task.id!==f.task.id)!;
    assert.equal(original.scopeId,f.folderId);assert.equal(original.date,f.task.date);assert.equal(original.note,f.task.note);
    assert.equal(copy.scopeId,'folder-unfiled');assert.equal(copy.note,f.task.note);assert.equal(copy.date,f.task.date);
    const rows=M.rowMeta(result.state,f.docId),copyChild=rows[copyStart+4];
    assert.equal(rows[originalStart].kind,'scope');assert.equal(rows[copyStart].kind,'note');
    assert.equal(result.state.itemScopes[f.child.id],f.folderId);assert.equal(result.state.itemScopes[copyChild.id],'folder-unfiled');
    assert.deepEqual(M.progressHistory(result.state,copy.id),[]);assert.deepEqual(M.progressHistory(result.state,copyChild.id),[]);
    assert.deepEqual(M.progressHistory(result.state,f.task.id),M.progressHistory(f.state,f.task.id));
    assert.deepEqual(M.progressHistory(result.state,f.child.id),M.progressHistory(f.state,f.child.id));
    assert.deepEqual(f.state,before);assert.equal(M.raw(M.getDocument(result.state,f.docId)),target);
  });
}

test('native partial title replacements keep the original scoped Item and child IDs with their history',()=>{
  const f=scopedRecordedFixture(),before=structuredClone(f.state);
  let state=f.state;
  for (const [selected,pasted] of [['준비','준비 확인'],['자료','자료 추가']] as const) {
    const raw=M.raw(M.getDocument(state,f.docId)),start=raw.indexOf(selected),end=start+selected.length;
    const target=raw.slice(0,start)+pasted+raw.slice(end);
    const result=M.editTextResult(state,f.docId,target,{inputSplice:{start,end,text:pasted}});
    assert.equal(result.reason,null);assert(M.validate(result.state));state=result.state;
  }
  assert.deepEqual(M.getDocument(state,f.docId)!.lines.map(line=>line.id),f.lines.map(line=>line.id));
  assert.equal(M.tasks(state)[0].id,f.task.id);assert.equal(M.tasks(state)[0].title,'회의 준비 확인');
  assert.equal(M.rowMeta(state,f.docId).find(row=>row.id===f.child.id)?.title,'자료 추가 확인');
  assert.deepEqual(state.bindings,f.state.bindings);assert.deepEqual(state.taskScopes,f.state.taskScopes);
  assert.deepEqual(state.itemScopes,f.state.itemScopes);assert.deepEqual(state.progressRecords,f.state.progressRecords);assert.deepEqual(f.state,before);
});

test('invalid or stale native splice evidence is rejected before identity fallback, including unchanged text',()=>{
  const f=scopedRecordedFixture(),before=structuredClone(f.state),raw=M.raw(M.getDocument(f.state,f.docId)),pasted=`${f.block}\n`,target=pasted+raw;
  const invalid: unknown[]=[
    null,{start:-1,end:0,text:pasted},{start:0.5,end:0.5,text:pasted},{start:2,end:1,text:pasted},
    {start:0,end:raw.length+1,text:pasted},{start:0,end:0,text:42},{start:0,end:0,text:pasted,extra:true},
    {start:1,end:1,text:pasted},{start:0,end:0,text:'stale'},
  ];
  for (const inputSplice of invalid) {
    const result=M.editTextResult(f.state,f.docId,target,{inputSplice} as Parameters<typeof M.editTextResult>[3]);
    assert(['identity-ambiguous','blocked'].includes(result.reason!));assert.equal(result.state,f.state);
  }
  const unchanged=M.editTextResult(f.state,f.docId,raw,{inputSplice:{start:-1,end:0,text:''}});
  assert(['identity-ambiguous','blocked'].includes(unchanged.reason!));assert.equal(unchanged.state,f.state);assert.deepEqual(f.state,before);
});

test('valid native splice evidence accepts normalized target newlines and still refuses recorded cuts',()=>{
  const f=scopedRecordedFixture(),raw=M.raw(M.getDocument(f.state,f.docId)),pasted=`${f.block}\n`;
  const result=M.editTextResult(f.state,f.docId,(pasted+raw).replace(/\n/g,'\r\n'),{inputSplice:{start:0,end:0,text:pasted}});
  assert.equal(result.reason,null);assert.equal(M.raw(M.getDocument(result.state,f.docId)),pasted+raw);
  const cut=M.editTextResult(f.state,f.docId,'끝 메모',{inputSplice:{start:0,end:f.block.length+1,text:''}});
  assert.equal(cut.reason,'blocked');assert.equal(cut.state,f.state);
});

test('native prepend keeps the original empty boundary line after inserted identical blank lines',()=>{
  let state=M.addDocument(createEmptyTextWorkspace(),{title:'빈 줄 경계'});
  const docId=state.documents[0].id,raw='\n- [ ] 원본 작업',pasted='\n- [ ] 삽입\n';
  state=M.editText(state,docId,raw);
  const lines=M.getDocument(state,docId)!.lines;
  const result=M.editTextResult(state,docId,pasted+raw,{inputSplice:{start:0,end:0,text:pasted}});
  assert.equal(result.reason,null);assert.deepEqual(M.getDocument(result.state,docId)!.lines.slice(2),lines);
  assert.notEqual(M.getDocument(result.state,docId)!.lines[0].id,lines[0].id);
});

test('native splice keeps format, progress conflict and ambiguous multiline rewrite rejections',()=>{
  const f=scopedRecordedFixture(),raw=M.raw(M.getDocument(f.state,f.docId)),taskStart=raw.indexOf('  - [ ]');
  const malformed=M.editTextResult(f.state,f.docId,raw.slice(0,taskStart)+' '+raw.slice(taskStart),{inputSplice:{start:taskStart,end:taskStart,text:' '}});
  assert.equal(malformed.reason,'invalid-format');assert.equal(malformed.state,f.state);
  const token=raw.indexOf('[ ]')+1;
  const conflict=M.editTextResult(f.state,f.docId,raw.slice(0,token)+'x'+raw.slice(token+1),{inputSplice:{start:token,end:token+1,text:'x'}});
  assert.equal(conflict.reason,'progress-check-conflict');assert.equal(conflict.state,f.state);
  assert.deepEqual(conflict.progressConflict,{lineId:f.task.id,targetId:f.task.id});
  let state=M.addDocument(createEmptyTextWorkspace(),{title:'모호한 교체'});
  const docId=state.documents[0].id,source='- [ ] 첫 항목\n- [ ] 둘째 항목',replacement='- [ ] 새 항목\n- [ ] 다른 항목';
  state=M.editText(state,docId,source);
  const ambiguous=M.editTextResult(state,docId,replacement,{inputSplice:{start:0,end:source.length,text:replacement}});
  assert.equal(ambiguous.reason,'identity-ambiguous');assert.equal(ambiguous.state,state);
});
