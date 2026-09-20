import test from 'node:test';
import assert from 'node:assert/strict';
import { programClone, programFailure, programResult, PROGRAM_STATE_KEY, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, createProgramEnvelope, validateProgramData } from './program-data';
import { createProgramDocument,archiveProgramDocument,linkProgramTask,updateProgramTask,recordProgramTaskProgress,completeProgramTask,addProgramQuickTask,renameProgramDocument,setProgramDocumentFolder } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { programDocumentContentLock,programPreservesLockedDocumentContent,programReferenceExecutionAccess } from './reference-execution-guard';
import { createProgramController } from './controller';
import { setProgramDocumentTrashed } from './document-lifecycle';
const actorId='local-user';let seq=0;
const base=(data:ProgramData)=>({actorId,requestId:`locked-reference-${++seq}`,expectedSpace:programClone(data.spaces[actorId])});
function accept(r:ProgramTransition<string>){if(!r.ok)assert.fail(r.reason);assert(validateProgramData(r.data));return r;}
function fixture(){const a=createProgramData(),source=accept(createProgramDocument(a,{...base(a),title:'원본',raw:'- [ ] 보관 할 일\n  - 날짜: 2026-10-12\n  PRIVATE_NOTE\n  - [ ] 하위 체크'})),ref=accept(createProgramDocument(source.data,{...base(source.data),title:'연결 문서'})),taskId=M.tasks(ref.data.spaces[actorId].text)[0].id,linked=accept(linkProgramTask(ref.data,{...base(ref.data),documentId:ref.result,taskId}));return{data:linked.data,documentId:source.result,referenceId:ref.result,taskId};}
test('regression actual active reference may not update archived canonical date, progress or completion',()=>{
 const f=fixture(),data=accept(archiveProgramDocument(f.data,{...base(f.data),documentId:f.documentId})).data,raw=JSON.stringify(data);
 for(const result of [updateProgramTask(data,{...base(data),taskId:f.taskId,patch:{date:'2026-10-19'}}),recordProgramTaskProgress(data,{...base(data),taskId:f.taskId,date:'2026-09-12',percent:35}),completeProgramTask(data,{...base(data),taskId:f.taskId,date:'2026-09-12',done:true})]){assert.equal(result.ok,false);assert.equal(result.data,data);}
 assert.equal(JSON.stringify(data),raw);
});
test('canonical ID resolves actual document, never filing scope or same titled reference; unknown target is blocked',()=>{
 const f=fixture(),s=f.data.spaces[actorId];assert.notEqual(s.text.taskScopes[f.taskId],f.documentId);
 assert.deepEqual(programReferenceExecutionAccess(s,f.taskId),{documentId:f.documentId,lineId:f.taskId,kind:'active',reason:null});
 assert.equal(programReferenceExecutionAccess(s,'missing').kind,'missing');
 const reference=s.text.bindings.find(b=>b.docId===f.referenceId)!;assert.notEqual(reference.lineId,f.taskId);
});
test('archive/trash/retention guard preserves all canonical lines and records while allowing unrelated edits and reference unlink',()=>{
 const f=fixture();
 for(const kind of ['archived','trash','retention'] as const){let data=accept(archiveProgramDocument(f.data,{...base(f.data),documentId:f.documentId})).data;
 if(kind==='trash')data=accept(setProgramDocumentTrashed(data,{...base(data),documentId:f.documentId,trashed:true,now:'2026-09-12T00:00:00.000Z'})).data;
 if(kind==='retention')data.spaces[actorId].retentionDocuments={[f.referenceId]:f.documentId};
 assert(validateProgramData(data));const s=data.spaces[actorId];assert.equal(programReferenceExecutionAccess(s,f.taskId).kind,kind);
 const child=M.parseDocument(M.getDocument(s.text,f.documentId)!,s.text).items.find(x=>!x.isCanonical)!;
 for(const next of [M.updateTask(s.text,f.taskId,{date:'2026-10-19'}),M.recordProgress(s.text,f.taskId,'2026-09-12',35),M.updateSubcheck(s.text,f.documentId,child.id,true),M.editText(s.text,f.documentId,M.raw(M.getDocument(s.text,f.documentId)).replace('PRIVATE_NOTE','MUTATED'))])assert.equal(programPreservesLockedDocumentContent(s,next),false);
 assert.equal(recordProgramTaskProgress(data,{...base(data),taskId:child.id,date:'2026-09-12',percent:100}).ok,false);
 assert.equal(addProgramQuickTask(data,{...base(data),documentId:f.documentId,title:'차단'}).ok,false);
 assert.equal(linkProgramTask(data,{...base(data),documentId:f.documentId,taskId:f.taskId}).ok,false);
 const binding=s.text.bindings.find(b=>b.docId===f.referenceId)!;
 assert(programPreservesLockedDocumentContent(s,M.unlink(s.text,f.referenceId,binding.lineId)));
 assert(programPreservesLockedDocumentContent(s,M.editText(s.text,f.referenceId,M.raw(M.getDocument(s.text,f.referenceId))+'\n자유 메모')));
 const renamed=accept(renameProgramDocument(data,{...base(data),documentId:f.documentId,title:'보관 이름 정리'}));assert.equal(M.getDocument(renamed.data.spaces[actorId].text,f.documentId)?.title,'보관 이름 정리');
 assert(accept(setProgramDocumentFolder(data,{...base(data),documentId:f.documentId,folderId:'folder-unfiled'})).ok);
 }
});
test('fresh archive lock rejects a pre-opened edit at the commit boundary; restore allows the same ordinary update',()=>{
 const f=fixture(),proposed=M.updateTask(f.data.spaces[actorId].text,f.taskId,{date:'2026-10-19'}),locked=accept(archiveProgramDocument(f.data,{...base(f.data),documentId:f.documentId})).data;
 assert(programPreservesLockedDocumentContent(f.data.spaces[actorId],proposed));assert.equal(programPreservesLockedDocumentContent(locked.spaces[actorId],proposed),false);
 const restored=accept(archiveProgramDocument(locked,{...base(locked),documentId:f.documentId,archived:false})).data;
 assert(programPreservesLockedDocumentContent(restored.spaces[actorId],proposed));assert(accept(updateProgramTask(restored,{...base(restored),taskId:f.taskId,patch:{date:'2026-10-19'}})).changed);
});
test('controller blocked reference changes commit zero times; quota/restore/Undo/Redo/reload preserve canonical data and protected keys',async()=>{
 const f=fixture(),locked=accept(archiveProgramDocument(f.data,{...base(f.data),documentId:f.documentId})).data,values=new Map([[PROGRAM_STATE_KEY,JSON.stringify(createProgramEnvelope(locked))],['flow:original-guard','exact\r\nbytes']]);let writes=0,quota=false;
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{assert.equal(k,PROGRAM_STATE_KEY);if(quota)throw Error('quota');writes++;values.set(k,v);},removeItem:()=>assert.fail('no remove')};const options={initialData:f.data,storage,exclusive:async<T>(fn:()=>T|Promise<T>)=>await fn()},controller=createProgramController(options);assert(controller.ok);
 const before=values.get(PROGRAM_STATE_KEY),nextText=M.updateTask(locked.spaces[actorId].text,f.taskId,{date:'2026-10-19'});
 assert.equal((await controller.mutate('참조 편집',current=>{if(!programPreservesLockedDocumentContent(current.spaces[actorId],nextText))return programFailure(current,'conflict');const next=programClone(current);next.spaces[actorId].text=nextText;return programResult(current,next,f.referenceId);},{actorId})).ok,false);
 assert.equal((await controller.mutate('직접 진행',current=>recordProgramTaskProgress(current,{...base(current),taskId:f.taskId,date:'2026-09-12',percent:35}),{actorId})).ok,false);assert.equal(writes,0);assert.equal(values.get(PROGRAM_STATE_KEY),before);
 const restore=()=>controller.mutate('복원',current=>archiveProgramDocument(current,{...base(current),documentId:f.documentId,archived:false}),{actorId});quota=true;assert.equal((await restore()).ok,false);assert.equal(writes,0);quota=false;assert((await restore()).ok);
 assert((await controller.mutate('정상 진행',current=>recordProgramTaskProgress(current,{...base(current),taskId:f.taskId,date:'2026-09-12',percent:35}),{actorId})).ok);assert.equal(writes,2);
 assert((await controller.undo(actorId)).ok);assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId].text,locked.spaces[actorId].text);assert((await controller.redo(actorId)).ok);
 const reload=createProgramController(options);assert(reload.ok);assert.deepEqual(reload.snapshot().envelope.data,controller.snapshot().envelope.data);assert.equal(values.get('flow:original-guard'),'exact\r\nbytes');
});
