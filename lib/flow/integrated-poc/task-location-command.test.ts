import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument, importProgramPublicVersion } from './private-space';
import { moveProgramTaskLocation, readTaskLocationPolicy, undoProgramTaskLocation } from './task-location-command';
import { extendProgramRecent, programRecentHidden, programRecentHold, restrictProgramRecent } from './recent-writing';
import { textWorkspaceModel as M } from './text-workspace';
const space=(data:ProgramData)=>data.spaces[data.activeActorId];
let request=0;
const base=(data:ProgramData)=>({actorId:data.activeActorId,requestId:`synthetic-move-${++request}`,expectedSpace:space(data)});
const ok=<T,>(value:ProgramTransition<T>)=>{assert.ok(value.ok,value.ok?'':value.reason);return value;};
function fixture(title='합성 부모'){
  const initial=createProgramData(),created=ok(createProgramDocument(initial,{...base(initial),title:'합성 이동',raw:`[2026-11-10]\n- [ ] ${title}\n  - 날짜: 2026-11-11\n  - 시간: 09:30\n  - 메모: 합성 메모\n  - [ ] 합성 하위\n[2026-11-12]\n- [ ] 합성 목적`}));
  const taskId=M.tasks(space(created.data).text).find(task=>task.title.startsWith('합성 부모'))!.id;
  return {data:created.data,documentId:created.result,taskId};
}
test('private command moves source once; serialize/reopen keeps exact RAW and IDs; a single text undo restores bytes',()=>{
  const f=fixture(),before=programClone(space(f.data).text),beforeRaw=M.raw(before.documents[0]);
  const moved=ok(moveProgramTaskLocation(f.data,{...base(f.data),taskId:f.taskId,target:{kind:'new-folder',title:'합성 새 폴더'}}));
  assert.ok(validateProgramData(moved.data));
  const reopened=JSON.parse(JSON.stringify(moved.data)) as ProgramData;
  assert.ok(validateProgramData(reopened));
  const after=space(reopened).text;
  assert.match(M.raw(after.documents[0]),/- \/합성 새 폴더\n  - \[ \] 합성 부모/);
  assert.deepEqual(M.tasks(after).map(task=>task.id).sort(),M.tasks(before).map(task=>task.id).sort());
  const undo=ok(undoProgramTaskLocation(reopened,{actorId:reopened.activeActorId,documentId:f.documentId,after,before}));
  assert.equal(M.raw(space(undo.data).text.documents[0]),beforeRaw);
  assert.deepEqual(space(undo.data).text,before);
  assert.equal(undoProgramTaskLocation(undo.data,{actorId:undo.data.activeActorId,documentId:f.documentId,after,before}).ok,false,'an undo is consumed once');
});
test('date command uses section movement and keeps native metadata valid',()=>{
  const f=fixture(),moved=ok(moveProgramTaskLocation(f.data,{...base(f.data),taskId:f.taskId,target:{kind:'date',date:'2026-11-12'}}));
  const text=space(moved.data).text,task=M.tasks(text).find(task=>task.id===f.taskId)!;
  assert.ok(validateProgramData(moved.data));assert.equal(task.date,'2026-11-12');assert.equal(task.explicitDate,false);assert.equal(task.time,'09:30');
  assert.match(M.raw(text.documents[0]),/합성 목적\n- \[ \] 합성 부모/);
});
test('stale expected private space rejects without changing input',()=>{
  const f=fixture(),old=programClone(space(f.data)),changed=programClone(f.data);
  space(changed).text=M.editText(space(changed).text,f.documentId,M.raw(space(changed).text.documents[0])+'\n합성 후속 입력');
  const before=JSON.stringify(changed),result=moveProgramTaskLocation(changed,{...base(changed),expectedSpace:old,taskId:f.taskId,target:{kind:'date',date:'2026-11-12'}});
  assert.equal(result.ok,false);assert.equal(JSON.stringify(changed),before);
});
test('a remote non-text save also rejects a stale dialog, and a later input makes undo refuse without deleting it',()=>{
  const f=fixture(),old=programClone(space(f.data)),remote=programClone(f.data);
  space(remote).position={...space(remote).position,scrollTop:17};
  const untouched=JSON.stringify(remote);
  assert.equal(moveProgramTaskLocation(remote,{...base(remote),expectedSpace:old,taskId:f.taskId,target:{kind:'date',date:'2026-11-12'}}).ok,false);
  assert.equal(JSON.stringify(remote),untouched);
  const moved=ok(moveProgramTaskLocation(f.data,{...base(f.data),taskId:f.taskId,target:{kind:'date',date:'2026-11-12'}}));
  const after=space(moved.data).text,newer=programClone(moved.data);
  space(newer).text=M.editText(space(newer).text,f.documentId,M.raw(space(newer).text.documents[0])+'\n합성 후속 입력');
  const kept=JSON.stringify(newer);
  assert.equal(undoProgramTaskLocation(newer,{actorId:newer.activeActorId,documentId:f.documentId,before:old.text,after}).ok,false);
  assert.equal(JSON.stringify(newer),kept);
});
test('a folded 30-day-old destination is resolved in the complete source; old header and line IDs are reused, undo restores full bytes',()=>{
  const initial=createProgramData(),raw='[2026-10-10]\n- [ ] 합성 과거 목적\n'+Array.from({length:201},(_,i)=>`합성 과거 글 ${i}`).join('\n')+'\n[2026-11-10]\n- [ ] 합성 부모';
  const made=ok(createProgramDocument(initial,{...base(initial),title:'합성 긴 글',raw})),before=space(made.data).text;
  const hold=programRecentHold(before,made.result,'2026-11-10');assert.ok(hold);
  const hidden=programRecentHidden(before,hold),shown=restrictProgramRecent(before,made.result,hidden);
  assert.ok(!M.raw(shown.documents[0]).includes('[2026-10-10]'));
  const full=extendProgramRecent(before,shown,made.result,hidden,false);assert.ok(full.ok);assert.deepEqual(full.state,before);
  const taskId=M.tasks(shown).find(task=>task.title==='합성 부모')!.id;
  const moved=ok(moveProgramTaskLocation(made.data,{...base(made.data),taskId,target:{kind:'date',date:'2026-10-10'}}));
  const after=space(moved.data).text,doc=M.getDocument(after,made.result)!;
  assert.equal(doc.lines.filter(line=>line.text==='[2026-10-10]').length,1);
  assert.deepEqual(new Set(doc.lines.map(line=>line.id)),new Set(before.documents[0].lines.map(line=>line.id)));
  assert.equal(M.tasks(after).find(task=>task.id===taskId)!.date,'2026-10-10');
  assert.ok(programRecentHidden(after,hold).has(taskId),'destination remains in the existing fold until explicitly revealed');
  const undone=ok(undoProgramTaskLocation(moved.data,{actorId:moved.data.activeActorId,documentId:made.result,before,after}));
  assert.equal(M.raw(M.getDocument(space(undone.data).text,made.result)!),raw);
});
test('repeat is date-only in every command entrance and keeps its original source position',()=>{
  const f=fixture('합성 부모 @매일'),before=space(f.data).text,source=before.documents[0].lines.findIndex(line=>line.id===f.taskId);
  assert.equal(readTaskLocationPolicy(space(f.data),f.taskId).kind,'date-only');
  const no=moveProgramTaskLocation(f.data,{...base(f.data),taskId:f.taskId,target:{kind:'new-folder',title:'합성 금지'}});assert.equal(no.ok,false);
  const moved=ok(moveProgramTaskLocation(f.data,{...base(f.data),taskId:f.taskId,target:{kind:'date',date:'2026-11-12'}}));
  assert.equal(space(moved.data).text.documents[0].lines.findIndex(line=>line.id===f.taskId),source);
  assert.equal(M.tasks(space(moved.data).text).find(task=>task.id===f.taskId)!.date,'2026-11-12');
});
test('a reference row uses its source ID for date-only, never regenerates or moves the source',()=>{
  const f=fixture(),created=ok(createProgramDocument(f.data,{...base(f.data),title:'합성 참조'}));
  space(created.data).text=M.linkTask(space(created.data).text,created.result,0,f.taskId);
  assert.ok(validateProgramData(created.data));
  const reference=M.rowMeta(space(created.data).text,created.result).find(row=>row.progressTargetId===f.taskId)!;
  assert.equal(readTaskLocationPolicy(space(created.data),reference.id,created.result).kind,'date-only');
  const result=ok(moveProgramTaskLocation(created.data,{...base(created.data),taskId:reference.id,documentId:created.result,target:{kind:'date',date:null}}));
  assert.deepEqual(space(result.data).text.documents.find(doc=>doc.id===created.result),space(created.data).text.documents.find(doc=>doc.id===created.result));
  assert.equal(M.tasks(space(result.data).text).find(task=>task.id===f.taskId)!.date,null);
});
test('Flow copy metadata stays on the date-only path and disallows folder movement',()=>{
  let data=fixture().data;
  data.public.flows.push({id:'flow-synthetic',ownerId:'creator-minji',currentVersionId:'version-synthetic',category:'생활',situations:[],derivedFrom:null,archived:false});
  data.public.versions.push({id:'version-synthetic',flowId:'flow-synthetic',number:1,parentVersionId:null,title:'합성 Flow',summary:'',source:{kind:'simulated-example',label:'합성',url:null,checkedAt:null},createdBy:'creator-minji',createdAt:'2026-10-01T00:00:00.000Z',items:[{id:'item-synthetic',title:'합성 사본',description:'',completionCriteria:'',sourceUrl:null,schedule:{kind:'fixed',date:'2026-11-10'},subchecks:[]}]});
  data=ok(importProgramPublicVersion(data,{...base(data),versionId:'version-synthetic',itemIds:['item-synthetic'],anchor:'2026-11-10'})).data;
  const copy=space(data).copies[0],taskId=copy.itemLines['item-synthetic'],before=M.getDocument(space(data).text,copy.documentId)!;
  assert.equal(readTaskLocationPolicy(space(data),taskId).kind,'date-only');
  assert.equal(moveProgramTaskLocation(data,{...base(data),taskId,target:{kind:'new-folder',title:'합성 금지'}}).ok,false);
  const moved=ok(moveProgramTaskLocation(data,{...base(data),taskId,target:{kind:'date',date:'2026-11-12'}}));
  assert.ok(validateProgramData(moved.data));
  assert.equal(M.getDocument(space(moved.data).text,copy.documentId)!.lines.findIndex(line=>line.id===taskId),before.lines.findIndex(line=>line.id===taskId));
});
