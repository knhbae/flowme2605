import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { inspectProgramPrivateOutput, makeProgramPrivateOutput, type PrivateOutputOptions } from './private-output';
import { importProgramPublicVersion, setProgramCopyInclusion } from './private-space';
import { buildProgramCatalog } from './catalog';
import { programOutputReturnUrl } from './output-return';
import { parseProgramLocation } from './navigation';
import { readProgramOutputReturnTarget } from './output-return-target';
const now = '2026-09-12T00:00:00.000Z';
function fixture(raw='독립 비공개 메모\n- [ ] 내 준비\n  - 날짜: 2026-09-20\n  - 메모: 직접 바꾼 메모\n- [ ] 날짜 없는 할 일') {
  const data = createProgramData(), actorId = data.activeActorId, space = data.spaces[actorId];
  space.text = M.addDocument(space.text, { title: '내 여행' }); const documentId = space.text.documents[0].id;
  space.text = M.editText(space.text, documentId, raw);
  const task = M.tasks(space.text)[0]; space.text = M.recordProgress(space.text, task.id, '2026-09-12', 35);
  return {data,actorId,documentId,taskId:task.id};
}
function result(f: ReturnType<typeof fixture>, patch: Partial<PrivateOutputOptions> = {}) {
  const inspect = inspectProgramPrivateOutput(f.data, f); assert.ok(inspect.ok);
  const output = makeProgramPrivateOutput(f.data, { actorId:f.actorId,documentId:f.documentId,mode:'tasks',format:'txt',selectedItemIds:inspect.rows.map(row=>row.id),...patch }, now);
  assert.ok(output.ok, JSON.stringify(output)); return output;
}
test('return links are opt-in selected output only, preserve source URL UID/raw and resolve canonical target',()=>{
  const f=fixture(),space=f.data.spaces[f.actorId];
  space.text=M.updateTask(space.text,f.taskId,{note:'출처: https://example.com/original'});
  const before=JSON.stringify(f.data),page='http://127.0.0.1:3641/my?personalWorkspacePoc=v1';
  const inspection=inspectProgramPrivateOutput(f.data,f);assert(inspection.ok);
  assert.equal(inspection.rows[0].sourceUrl,'https://example.com/original');
  const target=inspection.rows[0].returnTarget!,url=programOutputReturnUrl(page,f.actorId,target)!;
  for(const format of ['txt','csv','ics']as const){
    const normal=result(f,{format}),linked=result(f,{format,returnPageUrl:page});
    const payload=linked.payload.replace(/\r\n[ \t]/g,'');assert.match(payload,/FlowMe에서 이 항목 열기/);assert.match(payload,/https:\/\/example.com\/original/);assert.doesNotMatch(normal.payload,/FlowMe에서 이 항목 열기/);
    if(format==='ics')assert.equal(payload.match(/UID:(.+)/)?.[1],normal.payload.replace(/\r\n[ \t]/g,'').match(/UID:(.+)/)?.[1]);
    assert.equal(result(f,{format,returnPageUrl:page+'&wrong=1'}).payload,normal.payload);
  }
  assert.equal(result(f,{mode:'raw',returnPageUrl:page}).payload,result(f,{mode:'raw'}).payload);
  assert.equal(readProgramOutputReturnTarget(f.data,parseProgramLocation(new URL(url).hash),'2026-09-12').kind,'task');
  assert.equal(JSON.stringify(f.data),before);
});
test('raw preserves exact source while selected execution output retains effective date, note and latest progress', () => {
  const f=fixture(), before=JSON.stringify(f.data), raw=M.raw(M.getDocument(f.data.spaces[f.actorId].text,f.documentId));
  assert.equal(result(f,{mode:'raw'}).payload,raw);
  const out=result(f); assert.match(out.payload,/直接|직접 바꾼 메모/); assert.match(out.payload,/진행: 35%/); assert.match(out.payload,/2026-09-20/);
  assert.doesNotMatch(out.payload,/독립 비공개 메모/); assert.doesNotMatch(out.payload,/판본: 1/); assert.equal(JSON.stringify(f.data),before);
});
test('ICS excludes undated tasks and retains stable UID when personal date changes', () => {
  const f=fixture(), first=result(f,{format:'ics'}); assert.equal(first.itemIds.length,1); assert.equal(first.undatedItemIds.length,1);
  f.data.spaces[f.actorId].text=M.updateTask(f.data.spaces[f.actorId].text,f.taskId,{date:'2026-09-25'});
  const second=result(f,{format:'ics'}), unfold=(s:string)=>s.replace(/\r\n[ \t]/g,'');
  assert.equal(unfold(first.payload).match(/UID:(.+)/)?.[1],unfold(second.payload).match(/UID:(.+)/)?.[1]);
  assert.match(second.payload,/DTSTART;VALUE=DATE:20260925/); assert.match(unfold(second.payload),/진행: 35%/);
  assert.doesNotMatch(unfold(second.payload),/판본: 1/); assert.ok(second.payload.split('\r\n').every(line=>new TextEncoder().encode(line).length<=75));
});
test('same canonical target exported through another document has the same UID and no duplicate', () => {
  const f=fixture(), first=result(f,{format:'ics'}), space=f.data.spaces[f.actorId];
  space.text=M.addDocument(space.text,{title:'다른 문서'}); const other=space.text.documents.at(-1)!.id;
  space.text=M.linkTask(space.text,other,0,f.taskId); space.text=M.linkTask(space.text,other,1,f.taskId);
  const second=result({...f,documentId:other},{format:'ics'});
  assert.deepEqual(second.itemIds,[f.taskId]);
  const uid=(s:string)=>s.replace(/\r\n[ \t]/g,'').match(/UID:(.+)/)?.[1]; assert.equal(uid(first.payload),uid(second.payload));
});
test('CSV preserves quoting/multiline cells and formula shielding after removing synthetic version column', () => {
  const f=fixture(); f.data.spaces[f.actorId].text=M.updateTask(f.data.spaces[f.actorId].text,f.taskId,{title:'=SUM(1,2)',note:'첫 줄\n둘째 "줄"'});
  const csv=result(f,{format:'csv'}).payload;
  assert.ok(csv.startsWith('\uFEFF"Flow","순서"')); assert.ok(csv.includes('"\t=SUM(1,2)"')); assert.ok(csv.includes('둘째 ""줄""')); assert.doesNotMatch(csv,/"판본"/);
});
test('excluded imported source is absent from task output while private added task remains', () => {
  const f=fixture(); const catalog=buildProgramCatalog(f.actorId); f.data.public.flows=catalog.flows; f.data.public.versions=catalog.versions; const version=f.data.public.versions[0];
  const imported=importProgramPublicVersion(f.data,{actorId:f.actorId,requestId:'private-output-import',expectedSpace:f.data.spaces[f.actorId],versionId:version.id,itemIds:version.items.map(x=>x.id),anchor:'2026-09-30'});
  assert.ok(imported.ok); const copy=imported.data.spaces[f.actorId].copies[0];
  const excluded=setProgramCopyInclusion(imported.data,{actorId:f.actorId,requestId:'private-output-exclude',expectedSpace:imported.data.spaces[f.actorId],copyId:copy.id,itemId:version.items[0].id,included:false}); assert.ok(excluded.ok);
  excluded.data.spaces[f.actorId].text=M.addTask(excluded.data.spaces[f.actorId].text,{docId:copy.documentId,title:'개인 추가 준비'});
  const inspect=inspectProgramPrivateOutput(excluded.data,{actorId:f.actorId,documentId:copy.documentId}); assert.ok(inspect.ok);
  assert.ok(inspect.raw.includes(version.items[0].title)); assert.ok(!inspect.rows.some(row=>row.id===copy.itemLines[version.items[0].id])); assert.ok(inspect.rows.some(row=>row.title==='개인 추가 준비'));
  assert.ok(inspect.rows.some(row=>row.sourceUrl)); assert.ok(inspect.rows.some(row=>row.note.includes('설명:')));
});
test('selection, actor and raw mode are fail closed with no mutation', () => {
  const f=fixture(), base:PrivateOutputOptions={actorId:f.actorId,documentId:f.documentId,mode:'tasks',format:'txt',selectedItemIds:[f.taskId]}, before=JSON.stringify(f.data);
  for(const options of [{...base,selectedItemIds:[f.taskId,f.taskId]},{...base,selectedItemIds:['unknown']},{...base,actorId:'local-minji'},{...base,mode:'raw' as const,format:'csv' as const}]) assert.equal(makeProgramPrivateOutput(f.data,options,now).ok,false);
  assert.equal(JSON.stringify(f.data),before);
});

test('private TXT renders one actual checkbox state and one execution date without rewriting literal memo text', () => {
  const raw='- [ ] 출발 준비\n  - 날짜: 2026-09-20\n  - 메모: [ ] 문자 그대로 남길 메모\n  - [ ] 여권 확인\n  - [x] 예약 확인\n  - [ ] [x] 제목의 문자';
  const f=fixture(raw);
  const before=JSON.stringify(f.data),inspected=inspectProgramPrivateOutput(f.data,f);assert(inspected.ok);
  const row=inspected.rows.find(row=>row.title==='출발 준비');assert(row,JSON.stringify(inspected.rows));
  const txt=result(f,{selectedItemIds:[row.id]}).payload;
  assert.match(txt,/^  \[ \] 여권 확인$/m);assert.match(txt,/^  \[x\] 예약 확인$/m);
  assert.match(txt,/^  \[ \] \[x\] 제목의 문자$/m);
  assert.match(txt,/\[ \] 문자 그대로 남길 메모/);
  assert.equal(txt.match(/^실행 날짜: 2026-09-20$/gm)?.length,1);assert.doesNotMatch(txt,/^날짜:/m);
  for(const format of ['csv','ics']as const){const payload=result(f,{format,selectedItemIds:[row.id]}).payload.replace(/\r\n[ \t]/g,'');assert.match(payload,/\[x\] 예약 확인/);assert.match(payload,/\[ \] 여권 확인/);}
  assert.equal(result(f,{mode:'raw'}).payload,raw);assert.equal(JSON.stringify(f.data),before);
});
