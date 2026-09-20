import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import {programClone,PROGRAM_STATE_KEY,type ProgramData,type ProgramTransition} from '../../../lib/flow/integrated-poc/contract';
import {createProgramData,validateProgramData} from '../../../lib/flow/integrated-poc/program-data';
import {createTextAuthoringDocument} from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/parser';
import {createNativeCreatorDocumentOwner} from '../../../lib/flow/integrated-poc/native-creator-document';
import {setProgramCreatorWorking,applyProgramCreatorAction} from '../../../lib/flow/integrated-poc/creator-workspace';
import {applyProgramNativeCreatorOperation} from '../../../lib/flow/integrated-poc/creator-native-workspace';
import {inspectProgramNativeCreatorHandoff,applyProgramNativeCreatorHandoff} from '../../../lib/flow/integrated-poc/creator-native-execution-adapter';
import {programNativeSelectedRows} from '../../../lib/flow/integrated-poc/creator-native-execution-validation';
import {textWorkspaceModel as M} from '../../../lib/flow/integrated-poc/text-workspace';
import {fingerprintPersonalWorkspacePocAuthoringSource as fingerprint} from '../../../lib/flow/personal-workspace-poc-authoring';
import {createProgramController} from '../../../lib/flow/integrated-poc/controller';
import {publishProgramFlow} from '../../../lib/flow/integrated-poc/publication';
import type {AuthoringCorrectionOperation} from '../../../lib/flow/integrated-poc/native-creator-document-contract';
import type * as Publisher from './ProgramPublisher';

const url=new URL('./ProgramPublisher.tsx',import.meta.url),require=createRequire(url),root=resolve(dirname(fileURLToPath(url)),'../../..');
const compiled=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}),loaded={exports:{} as typeof Publisher};
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`,{filename:'ProgramPublisher.corrections.cjs'})(loaded,loaded.exports,(id:string)=>id.endsWith('.module.css')?{__esModule:true,default:{}}:require(id.startsWith('@/')?resolve(root,id.slice(2)):id));
const {createProgramPublicationDraft,saveProgramPublicationDraft,publishProgramDocument}=loaded.exports;
const NOW='2026-09-13T10:00:00.000Z',ID='native-corrections';
const RAW='# 출국 준비\r\n## 출발 전\r\n- [ ] 여권 확인 탑승권 준비\r\n  - 날짜: 2026-10-01\r\n  - 시간: 09:00\r\n  - 설명: 원래 확인 내용\r\n  - 자료: https://example.com/travel\r\n  - [ ] 여권 이름 확인\r\n\r\n- [ ] 숙소 주소 확인\r\n  - 날짜: 2026-10-01\r\n  - 시간: 09:00\r\n  - 설명: 원래 확인 내용\r\n  - 자료: https://example.com/travel';
const ok=<T,>(r:ProgramTransition<T>)=>{if(!r.ok)assert.fail(r.reason);assert(validateProgramData(r.data));return r;};
const own=(d:ProgramData)=>d.spaces[d.activeActorId];
function save(d:ProgramData,requestId:string){const w=own(d).creatorWorkspace!.working!,library=own(d).creatorWorkspace!.library;return applyProgramCreatorAction(d,{actorId:d.activeActorId,requestId,expectedStructure:w.structure??null,expectedNativeDocument:w.nativeDocument,expectedNativeSelection:w.nativeSelection,action:{type:'save',draftId:ID,title:w.title,rawText:w.rawText,sourceFingerprint:fingerprint(w.rawText),expectedLibraryRevision:library.revision,...(w.baseRecordRevision?{expectedRecordRevision:w.baseRecordRevision}:{}),now:NOW}},NOW);}
function edit(d:ProgramData,operation:AuthoringCorrectionOperation,requestId:string){const w=own(d).creatorWorkspace!.working!;return applyProgramNativeCreatorOperation(d,{actorId:d.activeActorId,requestId,draftId:ID,expectedWorking:w,expectedOwner:w.nativeDocument!,operation},NOW);}
function preview(d:ProgramData){const r=inspectProgramNativeCreatorHandoff(d,{actorId:d.activeActorId,draftId:ID},NOW);assert(r.ok,r.ok?'':r.reason);return r.preview;}
function handoff(d:ProgramData,requestId:string,p=preview(d)){return applyProgramNativeCreatorHandoff(d,{actorId:d.activeActorId,requestId,preview:p,choices:Object.fromEntries(p.rows.map(r=>[r.itemId,{source:'incoming',date:'keep',time:'keep',children:'keep'}]))},NOW);}
function fixture(){
 const document=createTextAuthoringDocument(RAW,{documentId:'actual-corrections-source',ownership:'creator',now:NOW}),source={storageKey:'flow:text-authoring:drafts:v1' as const,draftId:'original-corrections',versionId:'actual-original-v1',revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)};
 const made=createNativeCreatorDocumentOwner({id:ID,source},NOW);assert(made.ok);let data=createProgramData();
 data=ok(setProgramCreatorWorking(data,{actorId:data.activeActorId,expectedWorking:null,working:{draftId:ID,title:'출국 준비 수정',rawText:RAW,baseRecordRevision:null,nativeDocument:made.owner,nativeSelection:source}},NOW)).data;
 data=ok(save(data,'initial-save')).data;data=ok(handoff(data,'initial-handoff')).data;
 const space=own(data),rows=programNativeSelectedRows(space.creatorWorkspace!.nativeExecutionSources![ID]).map(r=>r.row);
 for(const [index,row] of rows.entries()){
  space.text=M.updateTask(space.text,row.lineId,{date:`2026-10-0${index+2}`,note:`PRIVATE_CORRECTION_${index}`});
  space.text=M.recordProgress(space.text,row.lineId,'2026-09-11',index?60:20);
  space.text=M.recordProgress(space.text,row.lineId,'2026-09-12',index?75:45);
  space.text=M.addDocument(space.text,{title:`별도 참조 ${index+1}`});space.text=M.linkTask(space.text,space.text.documents.at(-1)!.id,0,row.lineId);
 }
 const published=ok(publishProgramFlow(data,{actorId:data.activeActorId,requestId:'existing-public',title:'기존 불변 공개',summary:'별도 공개 자료',category:'생활',situations:[],source:{kind:'simulated-example',label:'검증용 공개',url:null,checkedAt:null},items:[{id:'public-original',title:'공개 항목',description:'원래 내용',completionCriteria:'',sourceUrl:null,schedule:{kind:'undated'},subchecks:[]}]},NOW));data=published.data;
 return{data,rows,source,documentId:own(data).creatorWorkspace!.nativeExecutionSources![ID].documentId};
}
function publishSelected(d:ProgramData,documentId:string,rowId:string){const draft=createProgramPublicationDraft(d,documentId,NOW);assert(draft);draft.title='수정한 출국 준비';draft.summary='선택한 항목만 공개';draft.sourceLabel='검증용 직접 작성';draft.rows=draft.rows.map(row=>({...row,selected:row.rowId===rowId}));const saved=ok(saveProgramPublicationDraft(d,d.activeActorId,draft,null));return ok(publishProgramDocument(saved.data,d.activeActorId,draft,NOW));}
function assertReferenceMirrors(data:ProgramData,before:ProgramData,title:string){const expected=programClone(own(before).text.documents.filter(d=>d.title.startsWith('별도 참조')));expected[0].lines[0].text=`- [ ] ${title}`;assert.deepEqual(own(data).text.documents.filter(d=>expected.some(prior=>prior.id===d.id)),expected);assert.deepEqual(own(data).text.bindings,own(before).text.bindings);}

test('CCR01 split after dated progress preserves old target and references; new target starts clean and only explicit selection is published',()=>{
 const f=fixture(),before=programClone(f.data),item=own(f.data).creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items[0];
 let data=ok(edit(f.data,{type:'split',itemId:item.itemId,at:'여권 확인 '.length},'split')).data;
 assert.deepEqual(own(data).text,own(before).text);assert.equal(own(data).creatorWorkspace!.working!.rawText,RAW);
 data=ok(save(data,'split-save')).data;const p=preview(data);assert.equal(p.rows.filter(r=>r.mode==='new').length,1);assert.equal(p.rows.find(r=>r.itemId===item.itemId)!.mode,'update');
 data=ok(handoff(data,'split-handoff',p)).data;const space=own(data),old=M.tasks(space.text).find(t=>t.id===f.rows[0].lineId)!,newRow=programNativeSelectedRows(space.creatorWorkspace!.nativeExecutionSources![ID]).find(r=>!f.rows.some(prior=>prior.itemId===r.row.itemId))!.row,newTask=M.tasks(space.text).find(t=>t.id===newRow.lineId)!;
 assert.equal(old.title,'여권 확인');assert.equal(old.date,'2026-10-02');assert.equal(old.note,'PRIVATE_CORRECTION_0');assert.deepEqual(M.progressHistory(space.text,old.id),M.progressHistory(own(before).text,old.id));
 assert.equal(newTask.title,'탑승권 준비');assert.equal(newTask.date,'2026-10-01');assert.equal(newTask.note,'');assert.deepEqual(M.progressHistory(space.text,newTask.id),[]);assert.equal(newTask.done,false);
 assert.deepEqual(space.text.progressRecords,own(before).text.progressRecords);assertReferenceMirrors(data,before,old.title);
 assert.equal(space.creatorWorkspace!.working!.nativeDocument!.source.documentJson,f.source.documentJson);assert.deepEqual(data.public,before.public);
 const publication=publishSelected(data,f.documentId,newTask.id),version=publication.data.public.versions.find(v=>v.id===publication.result)!;
 assert.deepEqual(version.items.map(i=>i.title),['탑승권 준비']);assert(!JSON.stringify(version).includes('PRIVATE_CORRECTION'));assert(!JSON.stringify(version).includes('2026-10-02'));assert(!JSON.stringify(version).includes('progressRecords'));assert.deepEqual(publication.data.public.versions.slice(0,before.public.versions.length),before.public.versions);assert.deepEqual(own(publication.data).text,space.text);
});

test('CCR02 merge with two independent records keeps first identity and retains second block/history/references; publication does not expose retained content',()=>{
 const f=fixture(),before=programClone(f.data),ids=own(f.data).creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items.map(i=>i.itemId);
 let data=ok(edit(f.data,{type:'merge',itemIds:ids},'merge')).data;assert.equal(own(data).creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items.length,1);assert.equal(own(data).creatorWorkspace!.working!.rawText,RAW);
 data=ok(save(data,'merge-save')).data;const p=preview(data);assert.equal(p.rows.find(r=>r.itemId===ids[1])!.mode,'retain');data=ok(handoff(data,'merge-handoff',p)).data;
 const space=own(data),first=M.tasks(space.text).find(t=>t.id===f.rows[0].lineId)!,second=M.tasks(space.text).find(t=>t.id===f.rows[1].lineId)!;
 assert.equal(first.title,'여권 확인 탑승권 준비 · 숙소 주소 확인');assert.equal(first.date,'2026-10-02');assert.equal(first.note,'PRIVATE_CORRECTION_0');assert.equal(second.title,'숙소 주소 확인');assert.equal(second.date,'2026-10-03');assert.equal(second.note,'PRIVATE_CORRECTION_1');assert(space.archivedDocumentIds.includes(second.docId));
 assert.deepEqual(space.text.progressRecords,own(before).text.progressRecords);assertReferenceMirrors(data,before,first.title);assert.deepEqual(data.public,before.public);
 const publication=publishSelected(data,f.documentId,first.id),version=publication.data.public.versions.find(v=>v.id===publication.result)!;assert.equal(version.items.length,1);assert.equal(version.items[0].title,first.title);assert(!JSON.stringify(version).includes('PRIVATE_CORRECTION'));assert.deepEqual(own(publication.data).text,space.text);assert.deepEqual(publication.data.public.versions.slice(0,before.public.versions.length),before.public.versions);
});

test('CCR03 split/save/handoff use one successful write each; quota, cancel and stale stay unchanged and three Undos restore exact private/public state on reload',async()=>{
 const f=fixture(),before=programClone(f.data),values=new Map([['flow:operating-corrections',' untouched source bytes ']]),calls:{key:string;failed:boolean}[]=[];let fail=false;
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{calls.push({key:k,failed:fail});if(fail)throw Error('quota');values.set(k,v);},removeItem:()=>assert.fail('removeItem forbidden')};
 const c=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert(c.ok);const actorId=f.data.activeActorId,item=own(f.data).creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items[0];
 const operation:AuthoringCorrectionOperation={type:'split',itemId:item.itemId,at:'여권 확인 '.length},stale=preview(f.data);
 assert((await c.mutate('분할',d=>edit(d,operation,'controller-split'),{actorId})).ok);assert((await c.mutate('명시 저장',d=>save(d,'controller-save'),{actorId})).ok);
 const p=preview(c.snapshot().envelope.data),wire=values.get(PROGRAM_STATE_KEY),count=calls.length;
 assert(!(await c.mutate('오래된 비교',d=>handoff(d,'controller-stale',stale),{actorId})).ok);assert.equal(calls.length,count);
 assert((await c.mutate('모두 유지',d=>applyProgramNativeCreatorHandoff(d,{actorId,requestId:'controller-cancel',preview:p,choices:Object.fromEntries(p.rows.map(r=>[r.itemId,{source:'keep',date:'keep',time:'keep',children:'keep'}]))},NOW),{actorId})).ok);assert.equal(calls.length,count);
 fail=true;assert(!(await c.mutate('개인 수용',d=>handoff(d,'controller-handoff',p),{actorId})).ok);assert.equal(values.get(PROGRAM_STATE_KEY),wire);
 fail=false;assert((await c.mutate('개인 수용',d=>handoff(d,'controller-handoff',p),{actorId})).ok);assert.equal(calls.filter(r=>!r.failed).length,3);
 for(let i=0;i<3;i++)assert((await c.undo(actorId)).ok);const restored=c.snapshot().envelope.data;assert.deepEqual(restored.spaces,before.spaces);assert.deepEqual(restored.public,before.public);assert.equal(calls.filter(r=>!r.failed).length,6);assert(calls.every(r=>r.key===PROGRAM_STATE_KEY));assert.equal(values.get('flow:operating-corrections'),' untouched source bytes ');
 const reload=createProgramController({initialData:createProgramData(),storage,exclusive:async work=>work()});assert(reload.ok);assert.deepEqual(reload.snapshot().envelope.data,restored);
});
