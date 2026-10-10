import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';

for (const scenario of [
  {title:'ordinary prose is not an implicit date command',body:'날짜 미정\n- [ ] 합성 항목',date:'2026-11-09',groupDate:'2026-11-09',explicitDate:false},
  {title:'explicit undated section ends the prior dated section',body:'[미정]\n- [ ] 합성 항목',date:null,groupDate:null,explicitDate:false},
  {title:'individual undated overrides rather than clears section inheritance',body:'- [ ] 합성 항목\n  - 날짜: 미정',date:null,groupDate:'2026-11-09',explicitDate:true},
]) test(`MD08 ${scenario.title}`,()=>{
  let state=M.addDocument(createEmptyTextWorkspace(),{title:'합성 미정 문법'});const id=state.documents[0].id;
  state=M.editText(state,id,`[2026-11-09]\n${scenario.body}`);assert(M.validate(state));const bytes=JSON.stringify(state);
  const item=M.tasks(state)[0];assert.equal(item.date,scenario.date);assert.equal(item.groupDate,scenario.groupDate);assert.equal(item.explicitDate,scenario.explicitDate);
  assert.equal(JSON.stringify(state),bytes);assert.deepEqual(M.tasks(JSON.parse(bytes)),M.tasks(state));
});
