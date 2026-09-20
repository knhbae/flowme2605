import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProgramPublicVersion } from './contract';
import { makeProgramOutput } from './output';
import { parseProgramLocation, programLocation } from './navigation';
import { programPublicOutputBase, readProgramPublicOutputReturn, resolveProgramPublicOutputReturn } from './public-output-return';
import { programRecurringScheduleFromDraft } from './public-recurrence-contract';
import { defaultProgramOutputRecurrenceWindow } from './public-output-recurrence';
const now='2026-09-20T00:00:00.000Z', base='http://127.0.0.1:3641/my?personalWorkspacePoc=v1';
function source():ProgramPublicVersion{return {id:'version-1',flowId:'flow-1',number:1,parentVersionId:null,title:'공개 주간 연습',summary:'공개 설명',createdBy:'author',createdAt:now,
 source:{kind:'user-text',label:'공개 원문',url:null,checkedAt:null},items:[{id:'task-1',title:'주간 연습',description:'확인',completionCriteria:'세 번 연습',sourceUrl:null,subchecks:[],schedule:programRecurringScheduleFromDraft({version:1,raw:'매주 화, 목',end:'8회',startKind:'undated',startValue:'',time:'09:00',timeZone:'Asia/Tokyo'})!}]};}
const options={selectedItemIds:['task-1'],anchor:'2026-10-01',recurrenceStarts:{'task-1':'2026-10-12'},recurrenceWindow:{...defaultProgramOutputRecurrenceWindow(),offset:1,limit:3}};
function returned(format:'txt'|'csv'|'ics'){
 const v=source(),before=JSON.stringify(v), result=makeProgramOutput(v,{...options,format,returnContext:{baseUrl:base}},now);assert(result.ok);
 assert.equal(JSON.stringify(v),before);const flat=result.payload.replace(/\r\n[ \t]/g,'');const link=flat.match(/http:\/\/127\.0\.0\.1:3641\/my\?personalWorkspacePoc=v1#flowme[^\s"\r\n]+/)?.[0];assert(link);
 return {v,result,link,destination:parseProgramLocation(new URL(link).hash)};
}
for(const format of ['txt','csv','ics'] as const)test(`public return ${format}: exact immutable item and selected occurrences, no source mutation`,()=>{
 const {v,result,link,destination:d}=returned(format);assert.equal(d.view,'flow');assert.equal(d.id,v.flowId);assert.equal(d.versionId,v.id);assert.equal(d.itemId,'task-1');
 assert.equal(programLocation(d),new URL(link).hash);assert.deepEqual(resolveProgramPublicOutputReturn(d.publicOutputReturn,base,v,d.itemId),{...options,format});
 assert.equal(new URL(link).search,'?personalWorkspacePoc=v1');assert(!link.includes('author'));assert(!link.includes('공개'));assert(!link.includes('actor'));
 // Existing recurrence contract includes the explicit start as occurrence 1.
 assert.deepEqual(result.series?.[0].indices,[2,3,4]);assert.deepEqual(result.series?.[0].dates,['2026-10-13','2026-10-15','2026-10-20']);
 if(format==='ics')assert(result.payload.replace(/\r\n /g,'').includes('URL:'+link));
});
test('default calls retain exact legacy bytes; optional return never changes UID/date/source rule',()=>{
 for(const format of ['txt','csv','ics'] as const){const v=source(),a=makeProgramOutput(v,{...options,format},now),b=makeProgramOutput(v,{...options,format,returnContext:undefined},now);assert.deepEqual(a,b);assert(a.ok);assert(!a.payload.includes('#flowme/'));
 const linked=returned(format).result;assert.deepEqual(linked.series,a.series);if(format==='ics'){const unfold=(s:string)=>s.replace(/\r\n[ \t]/g,'');assert.equal(unfold(linked.payload).split('\r\n').filter(s=>!s.startsWith('URL:')).join('\r\n'),unfold(a.payload));}}
});
test('ordinary relative/fixed/undated public selections round-trip without manufacturing recurrence',()=>{
 const v=source();v.items[0].schedule={kind:'relative',days:-2};const r=makeProgramOutput(v,{selectedItemIds:['task-1'],anchor:'2026-10-12',format:'txt',returnContext:{baseUrl:base}},now);assert(r.ok);
 const d=parseProgramLocation(new URL(r.payload.match(/http:[^\s]+/)![0]).hash);assert.deepEqual(resolveProgramPublicOutputReturn(d.publicOutputReturn,base,v,'task-1'),{selectedItemIds:['task-1'],anchor:'2026-10-12',format:'txt'});
});
test('same browser origin and exact gate only; foreign origin or gate mutation is rejected',()=>{
 const {v,destination:d}=returned('txt');for(const url of [base.replace('3641','3642'),base.replace('v1','v2'),base+'&x=1',base.replace('/my?','/flows?'),'file:///tmp/my?personalWorkspacePoc=v1'])assert.equal(resolveProgramPublicOutputReturn(d.publicOutputReturn,url,v,d.itemId),null,url);
 for(const url of ['https://u:p@example.com/my?personalWorkspacePoc=v1','javascript:alert(1)',base+'&personalWorkspacePoc=v1'])assert.equal(programPublicOutputBase(url),null);
});
test('missing immutable version/item and unsupported/future/extra/private token fields fail closed',()=>{
 const {v,destination:d}=returned('txt'),token=JSON.parse(d.publicOutputReturn!);
 assert.equal(resolveProgramPublicOutputReturn(d.publicOutputReturn,base,undefined,d.itemId),null);
 assert.equal(resolveProgramPublicOutputReturn(d.publicOutputReturn,base,{...v,id:'new-version'},d.itemId),null);
 assert.equal(resolveProgramPublicOutputReturn(d.publicOutputReturn,base,{...v,items:[]},d.itemId),null);
 for(const candidate of [{...token,version:2},{...token,raw:'PRIVATE'},{...token,actor:'private'},{...token,detail:{...token.detail,raw:'PRIVATE'}},{...token,detail:{...token.detail,recurrenceWindow:{...token.detail.recurrenceWindow,limit:0}}}])assert.equal(readProgramPublicOutputReturn(JSON.stringify(candidate)),null);
 assert.equal(readProgramPublicOutputReturn('{broken'),null);assert.deepEqual(parseProgramLocation(programLocation({...d,itemId:'other'})),{view:'space'});
});
test('invalid return context prevents output rather than silently dropping safety contract',()=>{
 assert.deepEqual(makeProgramOutput(source(),{...options,format:'txt',returnContext:{baseUrl:base+'&x=1'}},now),{ok:false,reason:'invalid-return-context'});
 const {v,destination:d}=returned('txt'),value=JSON.parse(d.publicOutputReturn!);value.detail.recurrenceStarts={'other':'2026-10-12'};assert.equal(resolveProgramPublicOutputReturn(JSON.stringify(value),base,v,d.itemId),null);
});
