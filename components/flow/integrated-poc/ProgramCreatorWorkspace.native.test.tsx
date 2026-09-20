import test from 'node:test';import assert from 'node:assert/strict';
import './test-css-modules';
import React from 'react';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import vm from 'node:vm';import ts from 'typescript';
import {createProgramData,validateProgramData} from '../../../lib/flow/integrated-poc/program-data';
import {setProgramCreatorWorking,applyProgramCreatorAction,handoffProgramCreatorDraft} from '../../../lib/flow/integrated-poc/creator-workspace';
import {createTextAuthoringDocument} from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/parser';
import {createNativeCreatorDocumentOwner} from '../../../lib/flow/integrated-poc/native-creator-document';
import {buildProgramNativeCreatorRawSyncOperation} from '../../../lib/flow/integrated-poc/creator-native-workspace';
import {fingerprintPersonalWorkspacePocAuthoringSource as fp} from '../../../lib/flow/personal-workspace-poc-authoring';
import {creatorNativeText} from '../../../lib/flow/integrated-poc/creator-source-order';
import {createNativeCreatorSourceFocusTarget} from '../../../lib/flow/integrated-poc/creator-native-source-focus';
import type {ProgramCreatorWorkspaceProps} from './ProgramCreatorWorkspace';
import {prepareProgramNativeSourceInput} from '../../../lib/flow/integrated-poc/creator-native-source-input';
import {readProgramNativeSourceUpdate} from '../../../lib/flow/integrated-poc/creator-native-source-store';
import {nativeInspectorPatch} from './creator-native-context-model';
const NOW='2026-09-12T17:00:00.000Z',LATER='2026-09-12T18:00:00.000Z',ID='native-parent';
const RAW='# 저장된 제작\r\n- [ ] 첫 항목\r\n  - 날짜: 2026-09-20\r\n- [ ] 둘째 항목';

test('NCP native property addition refreshes raw text without remounting the active inspector',async()=>{
 const h=harness(),before=h.render(),owner=h.working.nativeDocument!,item=owner.document.parseResult.canonical.items[0];
 const editorKey=before.nodes.find(n=>n.props.label==='제작 원문').key,nativeKey=before.native.key;
 const result=await before.native.props.onOperation({expectedOwner:owner,requestId:'add-place',operation:{type:'sync_item_to_working_text',itemId:item.itemId,patch:{...nativeInspectorPatch(owner.document,item),place:'공항 안내 데스크'}},now:LATER});
 assert(result.ok);assert.equal(h.writes,1);const after=h.render();
 assert.equal(after.native.key,nativeKey,'inspector selection, disclosure and focus must survive the native commit');
 assert.notEqual(after.nodes.find(n=>n.props.label==='제작 원문').key,editorKey,'raw editor receives the changed exact source');
 assert(h.working.rawText.includes('  - 장소: 공항 안내 데스크'));assert.equal(after.native.props.owner.document.parseResult.canonical.items[0].itemId,item.itemId);
});
function fixture(){let data=createProgramData();const actorId=data.activeActorId;
  const document=createTextAuthoringDocument(RAW,{documentId:'original-document',ownership:'creator',reviewRequirements:[{kind:'rights',reasonKey:'original-rights'}],now:NOW});
  const source={storageKey:'flow:text-authoring:drafts:v1' as const,draftId:'original-draft',versionId:'original-version',revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)};
  const native=createNativeCreatorDocumentOwner({id:ID,source},NOW);assert(native.ok);
  const working={draftId:ID,title:'제작 문서',rawText:RAW,baseRecordRevision:null,nativeDocument:native.owner,nativeSelection:source};
  const set=setProgramCreatorWorking(data,{actorId,expectedWorking:null,working},NOW);assert(set.ok);data=set.data;
  const saved=applyProgramCreatorAction(data,{actorId,requestId:'initial',expectedNativeDocument:native.owner,expectedNativeSelection:source,expectedStructure:null,action:{type:'save',draftId:ID,title:working.title,rawText:RAW,sourceFingerprint:fp(RAW),expectedLibraryRevision:data.spaces[actorId].creatorWorkspace!.library.revision,now:NOW}},NOW);assert(saved.ok);return saved.data;
}
const label=(v:any):string=>Array.isArray(v)?v.map(label).join(''):typeof v==='string'||typeof v==='number'?String(v):v?.props?label(v.props.children):'';
function harness(seed=fixture()){let data=seed,at=0,writes=0,fail=false;const slots:any[]=[],focuses:Array<{start:number;end:number}>=[],destinations:any[]=[];let editorNode:any,registered:any,editorKey:string|null=null,synchronize:(()=>void)|undefined;
  let snapshot={editorId:'native-parent-editor',documentId:ID,rawText:creatorNativeText(RAW),sourceFingerprint:fp(creatorNativeText(RAW)),selectionStart:0,selectionEnd:0,selectionDirection:'none' as const,scrollTop:0,scrollLeft:0,dispatchCount:0,composing:false};
  const hooks={...React,useState:(initial:any)=>{const i=at++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],(v:any)=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef:(initial:any)=>{const i=at++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useMemo:(fn:any)=>{at++;const value=fn();if(value?.flushAll&&value?.captureDrafts)registered=value;return value;},useEffect:(fn:()=>void)=>{at++;if(fn.toString().includes('synchronizeCreatorWorking()'))synchronize=fn;}};
  const url=new URL('./ProgramCreatorWorkspace.tsx',import.meta.url),require=createRequire(url),root=resolve(dirname(fileURLToPath(url)),'../../..'),loaded={exports:{} as {ProgramCreatorWorkspace:(p:ProgramCreatorWorkspaceProps)=>React.ReactNode}};
  const compiled=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInThisContext(`(function(module,exports,require){${compiled}\n})`)(loaded,loaded.exports,(id:string)=>id==='react'?hooks:id.endsWith('.css')?{__esModule:true,default:{}}:require(id.startsWith('@/')?resolve(root,id.slice(2)):id));
  function render(){at=0;const tree=loaded.exports.ProgramCreatorWorkspace({data,today:'2026-09-12',navigate:value=>destinations.push(value),onRegisterEditors:value=>{registered=value;},mutate:async(_label,transition)=>{
    if(fail)return{ok:false,reason:'storage'};const result=transition(data);if(!result.ok)return{ok:false,reason:result.reason};assert(validateProgramData(result.data));if(result.changed)writes++;data=result.data;return{ok:true,result:result.result};
  }});const nodes:any[]=[];function walk(v:any){if(Array.isArray(v))v.forEach(walk);else if(v?.props){nodes.push(v);walk(v.props.children);}}walk(tree);
    editorNode=nodes.find(n=>n.props.label==='제작 원문'&&n.props.onNativeInput);
    if(editorKey!==null&&editorKey!==editorNode.key)snapshot={...snapshot,rawText:creatorNativeText(editorNode.props.initialValue),sourceFingerprint:fp(creatorNativeText(editorNode.props.initialValue)),selectionStart:0,selectionEnd:0,dispatchCount:0,composing:false};
    editorKey=editorNode.key;editorNode.props.ref.current={readSnapshot:()=>({...snapshot}),focusRange:(start:number,end:number)=>{focuses.push({start,end});return true;}};
    return{nodes,native:nodes.find(n=>n.props.onOperation&&n.props.owner),handoff:nodes.find(n=>n.type?.name==='ProgramCreatorNativeHandoff'),button:(text:string)=>nodes.find(n=>n.type==='button'&&label(n.props.children).startsWith(text))};
  }
  const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};const flush=async()=>{render().button('입력 보관 다시 시도').props.onClick();await settle();render();};
  return{render,settle,flush,focuses,destinations,get registered(){return registered;},get data(){return data;},get working(){return data.spaces[data.activeActorId].creatorWorkspace!.working!;},get writes(){return writes;},fail(v:boolean){fail=v;},input(raw:string,type='insertText'){snapshot={...snapshot,rawText:creatorNativeText(raw),sourceFingerprint:fp(creatorNativeText(raw)),dispatchCount:snapshot.dispatchCount+1};editorNode.props.onNativeInput(snapshot,type);},reloadJSON(){data=JSON.parse(JSON.stringify(data));},foreign(){data=structuredClone(data);data.spaces[data.activeActorId].creatorWorkspace!.working!.title='다른 탭';},acceptSnapshot(next:typeof data){assert(validateProgramData(next));data=structuredClone(next);render();assert(synchronize,'invoke the real snapshot effect without running browser timers');synchronize();return render();},composition(value:boolean){snapshot.composing=value;}};
}

test('NCP15 global snapshot Undo restores the same selected Item without a storage mutation',async()=>{
 const h=harness(),before=structuredClone(h.data),owner=h.working.nativeDocument!,itemId=owner.document.parseResult.canonical.items[1].itemId;
 h.render().native.props.onSelectionChange(owner.id,itemId);
 assert((await h.render().native.props.onOperation({expectedOwner:owner,requestId:'selected-exclude',operation:{type:'exclude',itemId},now:LATER})).ok);
 const changed=h.render(),writes=h.writes,view=h.acceptSnapshot(before);
 assert.equal(view.native.props.selectedItemId,itemId);assert.notEqual(view.native.key,changed.native.key);
 assert.deepEqual(view.native.props.owner,owner);assert.equal(h.writes,writes);assert.deepEqual(h.data,before);
});

test('NCP16 an undone new split Item has no surviving selection and never falls back to the first Item',async()=>{
 const h=harness(),before=structuredClone(h.data),owner=h.working.nativeDocument!,originalId=owner.document.parseResult.canonical.items[1].itemId;
 assert((await h.render().native.props.onOperation({expectedOwner:owner,requestId:'selected-split',operation:{type:'split',itemId:originalId,at:3},now:LATER})).ok);
 const next=h.working.nativeDocument!,added=next.document.parseResult.canonical.items.find(item=>!owner.document.parseResult.canonical.items.some(prior=>prior.itemId===item.itemId));assert(added);
 h.render().native.props.onSelectionChange(next.id,added.itemId);const writes=h.writes;
 assert.equal(h.acceptSnapshot(before).native.props.selectedItemId,null);assert.equal(h.writes,writes);
});

test('NCP17 selection callbacks cannot cross owner or draft identity during an external replacement',()=>{
 const h=harness(),owner=h.working.nativeDocument!,itemId=owner.document.parseResult.canonical.items[1].itemId;
 const oldCallback=h.render().native.props.onSelectionChange;oldCallback(owner.id,itemId);
 const otherOwner=createNativeCreatorDocumentOwner({id:'other-draft',source:owner.source},LATER);assert(otherOwner.ok);
 const switched=setProgramCreatorWorking(h.data,{actorId:h.data.activeActorId,expectedWorking:h.working,working:{draftId:'other-draft',title:'다른 제작 문서',rawText:RAW,baseRecordRevision:null,nativeDocument:otherOwner.owner,nativeSelection:owner.source}},LATER);assert(switched.ok);const other=switched.data;
 const view=h.acceptSnapshot(other);assert.equal(view.native.props.selectedItemId,null);
 oldCallback(owner.id,itemId);view.native.props.onSelectionChange('not-this-owner',itemId);view.native.props.onSelectionChange('other-draft','missing-item');
 const again=structuredClone(other);again.spaces[again.activeActorId].creatorWorkspace!.working!.title='다음 저장';
 assert.equal(h.acceptSnapshot(again).native.props.selectedItemId,null);assert.equal(h.writes,0);
});

test('NCP18 dirty native input, composition and transaction lock postpone snapshot remount and selection restoration',()=>{
 for(const guard of ['native','composition','lock','raw'] as const){
  const h=harness(),owner=h.working.nativeDocument!,itemId=owner.document.parseResult.canonical.items[1].itemId;
  h.render().native.props.onSelectionChange(owner.id,itemId);const initial=h.render(),next=structuredClone(h.data);next.spaces[next.activeActorId].creatorWorkspace!.working!.title='외부 저장 제목';
  let release=()=>{};
  if(guard==='native')initial.native.props.onRegisterEditors({flushAll:async()=>false,hasPendingInput:()=>true});
  if(guard==='composition')h.composition(true);
  if(guard==='lock')release=h.registered.lockInput();
  if(guard==='raw')h.input('남겨야 할 미적용 원문');
  assert.equal(h.acceptSnapshot(next).native.key,initial.native.key,guard);assert.equal(h.writes,0);
  if(guard==='raw'){assert.equal(h.render().native.props.pendingRawText,'남겨야 할 미적용 원문');continue;}
  if(guard==='native')h.render().native.props.onRegisterEditors(null);
  h.composition(false);release();
  const restored=h.acceptSnapshot(next);assert.notEqual(restored.native.key,initial.native.key,guard);assert.equal(restored.native.props.selectedItemId,itemId,guard);assert.equal(h.writes,0);
 }
});
test('NCP01 actual parent canonical edit saves context only and result receives the full changed owner',async()=>{
  const h=harness(),owner=h.working.nativeDocument!,outside=JSON.stringify({text:h.data.spaces[h.data.activeActorId].text,public:h.data.public});
  const result=await h.render().native.props.onOperation({expectedOwner:owner,requestId:'exclude',operation:{type:'exclude',itemId:owner.document.parseResult.canonical.items[0].itemId},now:LATER});assert(result.ok);assert.equal(h.writes,1);assert.equal(h.working.rawText,RAW);assert.equal(h.working.nativeDocument!.document.parseResult.canonical.items[0].included,false);
  const view=h.render();assert(view.nodes.some(n=>n.props.owner===h.working.nativeDocument&&!n.props.onOperation));view.button('제작 초안 저장').props.onClick();await h.settle();assert.equal(h.working.baseRecordRevision,1);assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.structureDrafts![ID].contextRevision,2);
  assert.equal(JSON.stringify({text:h.data.spaces[h.data.activeActorId].text,public:h.data.public}),outside);
});
test('NCP02 pending raw autosave/reload keeps canonical bytes and explicit native sync preserves review requirements',async()=>{
  const h=harness(),source=h.working.nativeDocument!.source;h.render();const pending=creatorNativeText(RAW)+'\n- [ ] 새 항목';h.input(pending);await h.flush();assert.equal(h.working.rawText,RAW);assert.equal(h.working.nativePendingRawText,pending);h.reloadJSON();let view=h.render();assert.equal(view.native.props.pendingRawText,pending);assert.equal(view.button('제작 초안 저장').props.disabled,true);
  const owner=h.working.nativeDocument!,built=buildProgramNativeCreatorRawSyncOperation(owner,pending);assert(built.ok);const r=await view.native.props.onOperation({expectedOwner:owner,requestId:'sync',operation:built.operation,now:LATER});assert(r.ok);assert.equal(h.working.nativePendingRawText,undefined);assert.equal(h.working.rawText,pending);assert.deepEqual(h.working.nativeDocument!.source,source);assert.equal(h.working.nativeDocument!.document.reviewGates![0].reasonKey,'original-rights');assert.equal(h.working.nativeDocument!.document.reviewGates![0].status,'required');
});
test('NCP03 quota and stale native intent keep input/owner; exact retry commits once',async()=>{
  const h=harness(),owner=h.working.nativeDocument!,request={expectedOwner:owner,requestId:'exclude',operation:{type:'exclude',itemId:owner.document.parseResult.canonical.items[0].itemId},now:LATER},before=JSON.stringify(h.data);
  h.fail(true);assert(!(await h.render().native.props.onOperation(request)).ok);assert.equal(h.writes,0);assert.equal(JSON.stringify(h.data),before);h.fail(false);assert((await h.render().native.props.onOperation(request)).ok);assert.equal(h.writes,1);assert(!(await h.render().native.props.onOperation(request)).ok);assert.equal(h.writes,1);
  const other=harness(),oldOwner=other.working.nativeDocument!;other.render();other.input('미확정 새 원문');assert(!(await other.render().native.props.onOperation({...request,expectedOwner:oldOwner})).ok);assert.equal(other.writes,0);assert.equal(other.render().native.props.pendingRawText,'미확정 새 원문');
});
test('NCP04 stale raw sync preview cannot replace later input; native Undo restores original CRLF canonical without a sync',async()=>{
  const h=harness(),owner=h.working.nativeDocument!;h.render();h.input('처음 입력');await h.flush();const built=buildProgramNativeCreatorRawSyncOperation(owner,'처음 입력');assert(built.ok);h.render();h.input('이어 쓴 입력');assert(!(await h.render().native.props.onOperation({expectedOwner:owner,requestId:'old-sync',operation:built.operation,now:LATER})).ok);assert.equal(h.render().native.props.pendingRawText,'이어 쓴 입력');
  h.input(RAW,'historyUndo');await h.flush();assert.equal(h.working.nativePendingRawText,undefined);assert.equal(h.working.rawText,RAW);assert.equal(h.working.nativeDocument!.actions.length,0);
});
test('NCP05 full context history restores inclusion with same raw and exact original IDs',async()=>{
  const h=harness(),initial=h.working.nativeDocument!,itemId=initial.document.parseResult.canonical.items[0].itemId;
  await h.render().native.props.onOperation({expectedOwner:initial,requestId:'exclude',operation:{type:'exclude',itemId},now:LATER});h.render().button('제작 초안 저장').props.onClick();await h.settle();h.render().button('Program 저장 1 · 작성 설정 1').props.onClick();const restore=h.render().button('이 저장본의 원문·제작 설정으로 복구');assert(restore);restore.props.onClick();await h.settle();assert.deepEqual(h.working.nativeDocument,initial);assert.equal(h.working.rawText,RAW);assert.equal(h.working.baseRecordRevision,1);
});
test('NCP06 unconfirmed native child input participates in save and saved-version comparison guards',async()=>{
  const h=harness();h.render().native.props.onRegisterEditors({flushAll:async()=>false,hasPendingInput:()=>true,captureDrafts:()=>[{title:'구조 입력',raw:'사용자 제목'}]});h.render().button('제작 초안 저장').props.onClick();await h.settle();assert.equal(h.writes,0);
  h.render().button('Program 저장 1').props.onClick();assert.equal(h.render().button('이 저장본의 원문·제작 설정으로 복구'),undefined);assert.equal(h.writes,0);
});
test('NCP07 native result opens its exact canonical item and unconfirmed structure input prevents a different selection',async()=>{
  const h=harness(),itemId=h.working.nativeDocument!.document.parseResult.canonical.items[1].itemId;
  const result=()=>h.render().nodes.find(n=>n.props.onOpenItem&&n.props.owner);result().props.onOpenItem(itemId);await h.settle();assert.equal(h.render().native.props.selectedItemId,itemId);assert.equal(h.writes,0);
  h.render().native.props.onRegisterEditors({flushAll:async()=>false,hasPendingInput:()=>true});result().props.onOpenItem(h.working.nativeDocument!.document.parseResult.canonical.items[0].itemId);await h.settle();assert.equal(h.render().native.props.selectedItemId,itemId);assert.equal(h.writes,0);
});
test('NCP08 native inspector fallback focuses exact source lineage with CRLF offsets and no mutation',async()=>{
  const h=harness(),owner=h.working.nativeDocument!,target=createNativeCreatorSourceFocusTarget(owner,owner.document.parseResult.canonical.items[0].itemId);assert(target);const before=JSON.stringify(h.data);
  await h.render().native.props.onOpenSource(target);assert.equal(h.focuses.length,1);assert.equal(creatorNativeText(RAW).slice(h.focuses[0].start,h.focuses[0].end),creatorNativeText(RAW.slice(target.startOffset,target.endOffset)));assert.equal(h.writes,0);assert.equal(JSON.stringify(h.data),before);
  await h.render().native.props.onOpenSource({...target,startOffset:target.startOffset+1});assert.equal(h.focuses.length,1);
  h.render();h.input('미적용 새 원문');await h.render().native.props.onOpenSource(target);assert.equal(h.focuses.length,1);assert.equal(h.render().native.props.pendingRawText,'미적용 새 원문');assert.equal(h.writes,0);
});
test('NCP09 actual native handoff previews without writes, cancellation clears selection, and quota retry connects once',async()=>{
 const h=harness(),before=JSON.stringify(h.data);h.render().button('제작 설정을 개인 실행과 비교').props.onClick();let view=h.render();assert(view.handoff);assert.equal(h.writes,0);assert.equal(JSON.stringify(h.data),before);
 view.handoff.props.onCancel();assert(!h.render().handoff);assert.equal(h.writes,0);
 h.render().button('제작 설정을 개인 실행과 비교').props.onClick();h.fail(true);h.render().handoff.props.onApply();await h.settle();assert(h.render().handoff);assert.equal(h.writes,0);assert.equal(JSON.stringify(h.data),before);
 h.fail(false);h.render().handoff.props.onApply();await h.settle();assert.equal(h.writes,1);assert(!h.render().handoff);const owner=h.data.spaces[h.data.activeActorId].creatorWorkspace!.nativeExecutionSources![ID];assert(owner);assert.deepEqual(h.destinations,[{view:'space',id:owner.documentId}]);assert.equal(h.working.rawText,RAW);
});
test('NCP10 actual handoff preserves changed choices on failure and rejects dirty input/foreign snapshot',async()=>{
 const h=harness();h.render().button('제작 설정을 개인 실행과 비교').props.onClick();const itemId=h.render().handoff.props.preview.rows[0].itemId;
 h.render().handoff.props.onChange(itemId,'source','keep');h.fail(true);h.render().handoff.props.onApply();await h.settle();assert.equal(h.render().handoff.props.choices[itemId].source,'keep');assert.equal(h.writes,0);
 h.fail(false);h.foreign();h.render().handoff.props.onApply();await h.settle();assert(h.render().handoff);assert.equal(h.writes,0);assert.deepEqual(h.destinations,[]);
 h.render();h.input('미적용 입력');h.render().handoff.props.onApply();await h.settle();assert.equal(h.writes,0);assert.equal(h.render().native.props.pendingRawText,'미적용 입력');
});
test('NCP11 pending native comparison blocks navigation and captures exact choices without writes',async()=>{
 const h=harness();h.render().button('제작 설정을 개인 실행과 비교').props.onClick();const itemId=h.render().handoff.props.preview.rows[0].itemId;
 h.render().handoff.props.onChange(itemId,'source','keep');h.render();assert(h.registered.hasPendingInput());assert.equal(await h.registered.flushAll(),false);
 const capture=h.registered.captureDrafts().find((row:any)=>row.title.includes('개인 실행 비교 선택'));assert(capture);const recorded=JSON.parse(capture.raw);assert.equal(recorded.version,1);assert.equal(recorded.choices[itemId].source,'keep');assert.equal(recorded.preview.id,h.render().handoff.props.preview.id);
 h.render().handoff.props.onChange(itemId,'date','incoming');assert.equal(h.render().handoff.props.choices[itemId].date,'keep');
 h.foreign();h.render().handoff.props.onRefresh();assert.equal(h.render().handoff.props.choices[itemId].source,'keep');assert.equal(h.writes,0);
 h.render().handoff.props.onCancel();assert(!h.render().handoff);assert.equal(h.render().native.props.owner,h.working.nativeDocument);assert.equal(h.writes,0);
});
test('NCP12 actual parent source stage/choice/apply atomically updates mounted owner and source Undo restores exact CRLF',async()=>{
 const h=harness(),before=JSON.stringify({text:h.data.spaces[h.data.activeActorId].text,public:h.data.public}),original=h.working.nativeDocument!,raw=RAW.replace('첫 항목','새 첫 항목');
 const prepared=prepareProgramNativeSourceInput(original,{rawText:raw,version:'local-b',actorId:h.data.activeActorId},LATER);assert(prepared);
 const source=()=>h.render().nodes.find(node=>node.props.onCommand);
 const head=()=>({actorId:h.data.activeActorId,draftId:ID,expectedWorking:h.working,expectedSession:h.data.spaces[h.data.activeActorId].creatorWorkspace!.sourceUpdateSessions?.[ID]?.session??null});
 assert((await source().props.onCommand({kind:'stage',now:LATER,input:{...head(),envelope:prepared.envelope,candidateDocument:prepared.candidateDocument,matches:original.document.parseResult.canonical.items.map((item,index)=>({activeItemId:item.itemId,incomingItemId:prepared.candidateDocument.parseResult.canonical.items[index].itemId,basis:'explicit'}))}})).ok);
 assert.equal(h.working.rawText,RAW);const read=readProgramNativeSourceUpdate(h.data,h.data.activeActorId,ID);assert(read?.ok);
 for(const change of read.value.changes)assert((await source().props.onCommand({kind:'event',now:LATER,input:{...head(),requestId:change.changeId,event:{kind:'decision',changeId:change.changeId,decision:'use_incoming'}}})).ok);
 const command={kind:'event',now:LATER,input:{...head(),requestId:'source-apply',event:{kind:'apply'}}},writes=h.writes;h.fail(true);assert(!(await source().props.onCommand(command)).ok);assert.equal(h.writes,writes);assert.equal(h.working.rawText,RAW);
 h.fail(false);assert((await source().props.onCommand(command)).ok);assert.equal(h.writes,writes+1);assert.equal(h.working.rawText,raw);assert.equal(h.render().native.props.owner,h.working.nativeDocument);
 assert((await source().props.onCommand({kind:'event',now:LATER,input:{...head(),requestId:'source-undo',event:{kind:'undo'}}})).ok);assert.deepEqual(h.working.nativeDocument,original);assert.equal(h.working.rawText,RAW);
 assert.equal(JSON.stringify({text:h.data.spaces[h.data.activeActorId].text,public:h.data.public}),before);
});
test('NCP13 unsaved source-comparison input participates in parent navigation, handoff, archive/save and capture guards',async()=>{
 const h=harness();h.render().nodes.find(node=>node.props.onCommand).props.onRegisterEditors({flushAll:async()=>false,hasPendingInput:()=>true,captureDrafts:()=>[{title:'새 원문 비교',raw:'아직 저장하지 않은 입력'}]});
 h.render();assert(h.registered.hasPendingInput());assert.equal(await h.registered.flushAll(),false);assert(h.registered.captureDrafts().some((row:any)=>row.raw==='아직 저장하지 않은 입력'));
 h.render().button('제작 설정을 개인 실행과 비교').props.onClick();assert(!h.render().handoff);
 h.render().button('빈 제작 원문 만들기').props.onClick();h.render().button('제작 초안 저장').props.onClick();await h.settle();assert.equal(h.writes,0);assert.equal(h.working.draftId,ID);
});
test('NCP14 actual parent opens lineage review, cancels without writes, retries once and reuses the same personal document',async()=>{
 let data=createProgramData();const actorId=data.activeActorId,original=fixture().spaces[actorId].creatorWorkspace!.working!;
 const first=setProgramCreatorWorking(data,{actorId,expectedWorking:null,working:{draftId:ID,title:original.title,rawText:RAW,baseRecordRevision:null}},NOW);assert(first.ok);data=first.data;
 const saveRaw=applyProgramCreatorAction(data,{actorId,requestId:'raw-save',action:{type:'save',draftId:ID,title:original.title,rawText:RAW,sourceFingerprint:fp(RAW),expectedLibraryRevision:0,now:NOW}},NOW);assert(saveRaw.ok);data=saveRaw.data;
 const handoff=handoffProgramCreatorDraft(data,{actorId,requestId:'raw-first-handoff',draftId:ID,expectedRecordRevision:1,today:'2026-09-12'},NOW);assert(handoff.ok);data=handoff.data;const documentId=handoff.result;
 const old=data.spaces[actorId].creatorWorkspace!.working!,native=setProgramCreatorWorking(data,{actorId,expectedWorking:old,working:{...old,nativeDocument:original.nativeDocument,nativeSelection:original.nativeSelection}},NOW);assert(native.ok);data=native.data;
 const saveNative=applyProgramCreatorAction(data,{actorId,requestId:'native-save',expectedNativeDocument:original.nativeDocument!,expectedNativeSelection:original.nativeSelection!,expectedStructure:null,action:{type:'save',draftId:ID,title:original.title,rawText:RAW,sourceFingerprint:fp(RAW),expectedLibraryRevision:data.spaces[actorId].creatorWorkspace!.library.revision,expectedRecordRevision:1,now:NOW}},NOW);assert(saveNative.ok);
 const h=harness(saveNative.data),text=JSON.stringify(h.data.spaces[actorId].text),lineage=()=>h.render().nodes.find(node=>node.type?.name==='ProgramCreatorNativeLineage');
 h.render().button('제작 설정을 개인 실행과 비교').props.onClick();assert(lineage());assert.equal(h.writes,0);h.render();assert.equal(await h.registered.flushAll(),false);assert(h.registered.captureDrafts().some((row:any)=>row.title.includes('기존 문서 연결 선택')));
 lineage().props.onCancel();assert(!lineage());assert.equal(h.writes,0);
 h.render().button('제작 설정을 개인 실행과 비교').props.onClick();h.fail(true);lineage().props.onApply();await h.settle();assert(lineage());assert.equal(h.writes,0);
 h.fail(false);lineage().props.onApply();await h.settle();assert.equal(h.writes,1);assert(!lineage());assert.equal(JSON.stringify(h.data.spaces[actorId].text),text);assert.equal(h.data.spaces[actorId].creatorWorkspace!.nativeExecutionSources![ID].documentId,documentId);
 h.render().button('제작 설정을 개인 실행과 비교').props.onClick();assert(h.render().handoff);assert.equal(h.render().handoff.props.preview.documentId,documentId);
});
