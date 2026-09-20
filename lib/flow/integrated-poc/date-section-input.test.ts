import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';

export const CAPTURED_DATE_INPUT_BASE = '# 브라우저 현재 초안\n- [ ] 현재 준비\n  - 설명: 함께 확인할 공개 설명\n- [ ] 비공개 선택 제외\n  - 메모: PRIVATE_CREATOR_UNSELECTED_1127\n비공개 자유 메모 PRIVATE_CREATOR_FREE_1127';
export const CAPTURED_DATE_INPUT = CAPTURED_DATE_INPUT_BASE.replace('- [ ] 현재 준비', '[2026-09-13]\n- [20%] 현재 준비\n  - 메모: PRIVATE_CREATOR_EXECUTION_1134');
function fixture(raw: string) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '날짜 입력' });const id=state.documents[0].id;
  state=M.editText(state,id,raw,{progressDate:'2026-09-12'});assert.equal(M.raw(state.documents[0]),raw);return{state,id};
}
// Minimized from the 11:10 production CreatorDraft handoff/browser capture:
// text-input-diagnostic-2026-09-12T11-36-51-484Z.json. The date pin used to
// inject two implicit "날짜: 미정" lines, so the draft raw-equality gate rejected it.
test('captured date-section plus numeric progress and memo input is exact and retains original IDs/history',()=>{
  let {state,id}=fixture(CAPTURED_DATE_INPUT_BASE);const ids=M.tasks(state).map(task=>task.id);state=M.recordProgress(state,ids[0],'2026-09-11',10);const before=JSON.stringify(state);
  const next=M.editText(state,id,CAPTURED_DATE_INPUT,{progressDate:'2026-09-12'});
  assert.equal(M.raw(M.getDocument(next,id)),CAPTURED_DATE_INPUT);assert(M.validate(next));assert.deepEqual(M.tasks(next).map(task=>task.id),ids);
  assert.deepEqual(M.tasks(next).map(task=>task.date),['2026-09-13','2026-09-13']);assert.deepEqual(M.progressHistory(next,ids[0]),[{date:'2026-09-11',percent:10},{date:'2026-09-13',percent:20}]);
  assert.equal(JSON.stringify(state),before);assert.equal(M.editText(next,id,CAPTURED_DATE_INPUT),next);
});
test('explicit section insert/remove/change changes inherited dates without rewriting progress history',()=>{
  let {state,id}=fixture('[2026-09-07]\n- [20%] A\n- [ ] B');const records=state.progressRecords,ids=M.tasks(state).map(task=>task.id);
  for(const [raw,dates]of [
    ['[2026-09-07]\n- [20%] A\n[2026-09-08]\n- [ ] B',['2026-09-07','2026-09-08']],
    ['- [20%] A\n- [ ] B',[null,null]],
    ['[2026-09-09]\n- [20%] A\n- [ ] B',['2026-09-09','2026-09-09']],
  ]as const){const next=M.editText(state,id,raw,{progressDate:'2026-09-12'});assert.equal(M.raw(M.getDocument(next,id)),raw);assert.deepEqual(M.tasks(next).map(task=>task.date),dates);assert.deepEqual(M.tasks(next).map(task=>task.id),ids);assert.deepEqual(next.progressRecords,records);}
});
test('explicit fixed and unscheduled item dates override inserted section without losing subcheck IDs',()=>{
  const raw='- [ ] A\n  - 날짜: 2026-09-20\n  - [ ] 하위\n- [ ] B\n  - 날짜: 미정';const{state,id}=fixture(raw),input='[2026-09-13]\n'+raw;
  const next=M.editText(state,id,input);assert.equal(M.raw(M.getDocument(next,id)),input);assert.deepEqual(M.tasks(next).map(task=>task.date),['2026-09-20',null]);assert.deepEqual(M.tasks(next)[0].subchecks,M.tasks(state)[0].subchecks);
});
test('same-title items and duplicate date markers retain exact existing IDs when only a marker is inserted',()=>{
  const{state,id}=fixture('[2026-09-12]\n- [ ] 같은 제목\n- [ ] 같은 제목');const input='[2026-09-12]\n- [ ] 같은 제목\n[2026-09-12]\n- [ ] 같은 제목';const next=M.editText(state,id,input);
  assert.equal(M.raw(M.getDocument(next,id)),input);assert.deepEqual(M.tasks(next).map(task=>task.id),M.tasks(state).map(task=>task.id));
});
test('actual task reorder across a date boundary still pins original execution dates',()=>{
  const{state,id}=fixture('[2026-09-07]\n- [ ] A\n- [ ] B');const next=M.editText(state,id,'[2026-09-07]\n- [ ] B\n[2026-09-08]\n- [ ] A');
  assert.notEqual(next,state);assert.equal(M.tasks(next).find(task=>task.title==='A')!.date,'2026-09-07');assert.equal(M.tasks(next).find(task=>task.title==='A')!.groupDate,'2026-09-08');
});
test('date insertion with reparenting does not reinterpret a child execution date',()=>{
  const{state,id}=fixture('[2026-09-07]\n- [ ] A\n  - [ ] 하위\n- [ ] B');const child=M.parseDocument(M.getDocument(state,id)!,state).items.find(item=>item.title==='하위')!;
  const next=M.editText(state,id,'[2026-09-07]\n- [ ] A\n[2026-09-08]\n- [ ] B\n  - [ ] 하위');
  if(next!==state)assert.equal(M.parseDocument(M.getDocument(next,id)!,next).items.find(item=>item.id===child.id)?.date,'2026-09-07');
  assert.deepEqual(next.progressRecords,state.progressRecords);
});
