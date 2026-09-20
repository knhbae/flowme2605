import test from 'node:test';
import assert from 'node:assert/strict';
import { listPersonalWorkspacePocStructureTemplatePreviews } from '../personal-workspace-poc-structure-template/preview-adapter';
import { fingerprintStructureTemplateRawText } from '../personal-workspace-poc-structure-template/materialization';
import { parsePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import type { GroupInstance } from '../personal-workspace-poc-structure-template/types';
import { createProgramCreatorStructure, reduceProgramCreatorStructure, prepareProgramCreatorStructure, commitProgramCreatorStructure, restoreProgramCreatorStructureHistory, compareProgramCreatorStructure, switchProgramCreatorStructure, programCreatorStructureConnection, type ProgramCreatorStructureResult, type ProgramCreatorStructureSidecar } from './creator-structure-sidecar';
import { validateProgramCreatorStructureSidecar } from './creator-structure-validation';
const now='2026-09-12T18:20:00.000Z';
function ok<T>(r:ProgramCreatorStructureResult<T>):T { if(!r.ok)assert.fail(r.reason);return r.value; }
function form(templateId:string){return ok(createProgramCreatorStructure({draftId:'test-creator',templateId,rawText:'',now}));}
const entries=listPersonalWorkspacePocStructureTemplatePreviews();
for(const entry of entries)test(`real reducer form values compile ${entry.templateId}, commit and paired Undo/Redo`,()=>{
  let s=form(entry.templateId);const blank=JSON.stringify(s);
  assert.equal(prepareProgramCreatorStructure(s,{draftId:s.draft.draftId,rawText:'',now}).ok,false);
  const dispatch=(a:Parameters<typeof reduceProgramCreatorStructure>[1])=>{s=ok(reduceProgramCreatorStructure(s,a,now));};
  for(const g of [...s.draft.groups])dispatch({type:'remove_group_instance',instanceId:g.instanceId});
  for(const [slotId,value]of Object.entries(entry.inputDraft.values))dispatch({type:'set_value',scopeInstanceId:'root',slotId,value});
  const add=(g:GroupInstance,parent:string)=>{dispatch({type:'add_group_instance',parentScopeInstanceId:parent,groupId:g.groupId,instanceId:g.instanceId});for(const[slotId,value]of Object.entries(g.values))dispatch({type:'set_value',scopeInstanceId:g.instanceId,slotId,value});for(const child of g.children)add(child,g.instanceId);};
  entry.inputDraft.groups.forEach(g=>add(g,'root'));const before=JSON.stringify(s),p=ok(prepareProgramCreatorStructure(s,{draftId:s.draft.draftId,rawText:'',now}));
  assert.equal(p.command.nextRawText,entry.expectedRawText);assert.equal(parsePersonalWorkspacePocAuthoring(p.command.nextRawText).items.length,entry.expectedItemCount);assert.equal(p.plan.sourceCallbackCount,1);assert.equal(p.plan.undoCountToRestoreInitial,1);
  assert.equal(JSON.stringify(s),before);assert.notEqual(before,blank);assert(validateProgramCreatorStructureSidecar(p.after));assert.equal(p.after.draft.sourceFingerprint,s.draft.sourceFingerprint);assert.equal(p.after.materialization!.afterSourceFingerprint,fingerprintStructureTemplateRawText(entry.expectedRawText));
  const applied=ok(commitProgramCreatorStructure(p,{draftId:s.draft.draftId,rawText:'',sidecar:s,nativeRawText:entry.expectedRawText}));assert.equal(programCreatorStructureConnection(applied.sidecar,applied.rawText),'materialized');
  const undo=ok(restoreProgramCreatorStructureHistory(p,{transactionId:p.command.transactionId,inputType:'historyUndo',beforeRawText:applied.rawText,rawText:'',sidecar:applied.sidecar}));assert.deepEqual(undo,{rawText:'',sidecar:s});
  const redo=ok(restoreProgramCreatorStructureHistory(p,{transactionId:p.command.transactionId,inputType:'historyRedo',beforeRawText:'',rawText:applied.rawText,sidecar:undo.sidecar}));assert.deepEqual(redo,applied);
  assert.equal(restoreProgramCreatorStructureHistory(p,{transactionId:p.command.transactionId,inputType:'insertText',beforeRawText:applied.rawText,rawText:'',sidecar:applied.sidecar}).ok,false);
  assert.equal(restoreProgramCreatorStructureHistory(p,{transactionId:'other',inputType:'historyUndo',beforeRawText:applied.rawText,rawText:'',sidecar:applied.sidecar}).ok,false);
  for(const patch of [{draftId:'foreign'},{rawText:'changed'},{sidecar:null},{nativeRawText:entry.expectedRawText+'x'},{composing:true}])assert.equal(commitProgramCreatorStructure(p,{draftId:s.draft.draftId,rawText:'',sidecar:s,nativeRawText:entry.expectedRawText,...patch}).ok,false);
  assert.equal(commitProgramCreatorStructure({...p,command:{...p.command,nextRawText:'tampered'}},{draftId:s.draft.draftId,rawText:'',sidecar:s,nativeRawText:'tampered'}).ok,false);
});
test('raw-empty recovery, stable group identity, stale CAS and detach have no raw writer',()=>{
  const s=form(entries[0].templateId),raw='';assert.deepEqual(JSON.parse(JSON.stringify(s)),s);assert.equal(programCreatorStructureConnection(s,raw),'unmaterialized');
  const changed=ok(reduceProgramCreatorStructure(s,{type:'set_value',scopeInstanceId:'root',slotId:'flow_title',value:'사용자 제목'},now));assert.deepEqual(changed.draft.groups,s.draft.groups);
  assert.equal(compareProgramCreatorStructure(changed,s,null,s.draft.draftId).ok,false);assert.equal(compareProgramCreatorStructure(s,s,changed,'other-creator').ok,false);
  assert.equal(ok(compareProgramCreatorStructure(changed,changed,null,s.draft.draftId)),null);assert.equal(raw,'');
  assert.equal(switchProgramCreatorStructure(changed,{draftId:s.draft.draftId,templateId:entries[1].templateId,rawText:raw,now,confirmed:false}).ok,false);
  assert(switchProgramCreatorStructure(changed,{draftId:s.draft.draftId,templateId:entries[1].templateId,rawText:raw,now,confirmed:true}).ok);
  assert.equal(createProgramCreatorStructure({draftId:s.draft.draftId,templateId:entries[0].templateId,rawText:'기존 원문',now}).ok,false);
  assert.equal(prepareProgramCreatorStructure(changed,{draftId:s.draft.draftId,rawText:'\r\n',now}).ok,false);
  assert.equal(prepareProgramCreatorStructure(changed,{draftId:s.draft.draftId,rawText:'',now,composing:true}).ok,false);
});
