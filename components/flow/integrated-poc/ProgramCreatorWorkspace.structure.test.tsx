import test from 'node:test';
import './test-css-modules';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import {createProgramData} from '../../../lib/flow/integrated-poc/program-data';
import {setProgramCreatorWorking} from '../../../lib/flow/integrated-poc/creator-workspace';
import {fingerprintPersonalWorkspacePocAuthoringSource as fp} from '../../../lib/flow/personal-workspace-poc-authoring';
import {listPersonalWorkspacePocStructureTemplatePreviews} from '../../../lib/flow/personal-workspace-poc-structure-template/preview-adapter';
import type {GroupInstance} from '../../../lib/flow/personal-workspace-poc-structure-template/types';
import {createProgramCreatorStructure,reduceProgramCreatorStructure,prepareProgramCreatorStructure,programCreatorStructureConnection,type ProgramCreatorStructureResult} from '../../../lib/flow/integrated-poc/creator-structure-sidecar';
import type {ProgramCreatorWorkspaceProps} from './ProgramCreatorWorkspace';
import {creatorNativeText} from '../../../lib/flow/integrated-poc/creator-source-order';
const now='2026-09-12T18:20:00.000Z',draftId='creator-structure-parent';
function ok<T>(r:ProgramCreatorStructureResult<T>):T{if(!r.ok)assert.fail(r.reason);return r.value;}
function readyForm(){
  const entry=listPersonalWorkspacePocStructureTemplatePreviews()[0];
  let sidecar=ok(createProgramCreatorStructure({draftId,templateId:entry.templateId,rawText:'',now}));
  const dispatch=(action:Parameters<typeof reduceProgramCreatorStructure>[1])=>{sidecar=ok(reduceProgramCreatorStructure(sidecar,action,now));};
  for(const g of [...sidecar.draft.groups])dispatch({type:'remove_group_instance',instanceId:g.instanceId});
  for(const [slotId,value]of Object.entries(entry.inputDraft.values))dispatch({type:'set_value',scopeInstanceId:'root',slotId,value});
  const add=(g:GroupInstance,parent:string)=>{dispatch({type:'add_group_instance',parentScopeInstanceId:parent,groupId:g.groupId,instanceId:g.instanceId});for(const [slotId,value]of Object.entries(g.values))dispatch({type:'set_value',scopeInstanceId:g.instanceId,slotId,value});for(const child of g.children)add(child,g.instanceId);};
  entry.inputDraft.groups.forEach(g=>add(g,'root'));return sidecar;
}
// Real parent handlers and transitions; the native port is deterministic here.
// Trusted browser history, actual DOM focus and IME remain separate browser checks.
function harness(){
  let data=createProgramData();const actorId=data.activeActorId;
  const initialized=setProgramCreatorWorking(data,{actorId,expectedWorking:null,working:{draftId,title:'틀 문서',rawText:'',baseRecordRevision:null}},now);assert(initialized.ok);data=initialized.data;
  let writes=0,nativeEdits=0,fail=false,nativeFailure=false,at=0,focusCalls=0;const slots:any[]=[];
  let blankFocusEffect:(()=>void)|null=null;
  let snapshot={editorId:'structure-source',documentId:draftId,rawText:'',sourceFingerprint:fp(''),selectionStart:0,selectionEnd:0,selectionDirection:'none' as const,scrollTop:0,scrollLeft:0,dispatchCount:0,composing:false};
  const hooks={...React,useState:(value:any)=>{const i=at++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],(v:any)=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef:(value:any)=>{const i=at++;if(!(i in slots))slots[i]={current:value};return slots[i];},useMemo:(fn:()=>any)=>{at++;return fn();},useEffect:(fn:()=>void)=>{at++;if(fn.toString().includes('blankSourceFocus.current'))blankFocusEffect=fn;}};
  const url=new URL('./ProgramCreatorWorkspace.tsx',import.meta.url),require=createRequire(url),root=resolve(dirname(fileURLToPath(url)),'../../..');
  const compiled=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}),loaded={exports:{} as {ProgramCreatorWorkspace:(p:ProgramCreatorWorkspaceProps)=>React.ReactNode}};
  vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded,loaded.exports,(id:string)=>id==='react'?hooks:id.endsWith('.css')?{__esModule:true,default:{}}:require(id.startsWith('@/')?resolve(root,id.slice(2)):id));
  let editorNode:any;
  const handle={readSnapshot:()=>({...snapshot}),focusRange:(start:number,end=start,direction:any='none')=>{focusCalls++;snapshot={...snapshot,selectionStart:start,selectionEnd:end,selectionDirection:direction};return true;},applyNativeReplacement:async(request:any)=>{
    assert.deepEqual(request.expected,snapshot);if(nativeFailure)return{ok:false,reason:'unsupported',snapshot:{...snapshot}};nativeEdits++;
    const raw=snapshot.rawText.slice(0,request.range.start)+request.replacement+snapshot.rawText.slice(request.range.end);
    snapshot={...snapshot,rawText:raw,sourceFingerprint:fp(raw),dispatchCount:snapshot.dispatchCount+1};editorNode.props.onNativeInput(snapshot,'insertText');return{ok:true,snapshot:{...snapshot}};
  }};
  function render(){at=0;const tree=loaded.exports.ProgramCreatorWorkspace({data,today:'2026-09-12',navigate:()=>{},mutate:async(_label,transition)=>{
    if(fail)return{ok:false,reason:'storage'} as any;const r=transition(data);if(!r.ok)return{ok:false,reason:r.reason};if(r.changed)writes++;data=r.data;return{ok:true,result:r.result};
  }});const nodes:any[]=[];const walk=(v:any)=>{if(Array.isArray(v))v.forEach(walk);else if(v?.props){nodes.push(v);walk(v.props.children);}};walk(tree);
    editorNode=nodes.find(n=>n.props.label==='제작 원문'&&n.props.onNativeInput);editorNode.props.ref.current=handle;
    if(snapshot.documentId!==editorNode.props.documentId)snapshot={...snapshot,documentId:editorNode.props.documentId,rawText:editorNode.props.initialValue,sourceFingerprint:fp(editorNode.props.initialValue),selectionStart:0,selectionEnd:0};
    return{nodes,form:nodes.find(n=>n.props.onMaterialize),button:(text:string)=>nodes.find(n=>n.type==='button'&&n.props.children===text)};
  }
  const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
  const flush=async()=>{render().button('입력 보관 다시 시도').props.onClick();await settle();render();};
  return{render,flush,settle,get data(){return data;},get working(){return data.spaces[actorId].creatorWorkspace!.working!;},get writes(){return writes;},get nativeEdits(){return nativeEdits;},get raw(){return snapshot.rawText;},get focusCalls(){return focusCalls;},get selection(){return[snapshot.selectionStart,snapshot.selectionEnd,snapshot.selectionDirection];},runBlankFocus(){assert(blankFocusEffect);blankFocusEffect();},select(start:number,end:number){snapshot={...snapshot,selectionStart:start,selectionEnd:end};},setFail(v:boolean){fail=v;},setNativeFailure(v:boolean){nativeFailure=v;},compose(v:boolean){snapshot={...snapshot,composing:v};},foreign(){data=structuredClone(data);data.spaces[actorId].creatorWorkspace!.working!.title='외부 변경';},input(raw:string,inputType:string){snapshot={...snapshot,rawText:creatorNativeText(raw),sourceFingerprint:fp(creatorNativeText(raw)),dispatchCount:snapshot.dispatchCount+1};editorNode.props.onNativeInput(snapshot,inputType);},reloadJSON(){data=JSON.parse(JSON.stringify(data));},prepare(){const s=render().form.props.sidecar;return ok(prepareProgramCreatorStructure(s,{draftId,rawText:snapshot.rawText,now}));}};
}
async function formHarness(){const h=harness();h.render().form.props.onChange(readyForm());await h.flush();return h;}
test('SC-P01 blank raw and typed form are persisted together without a native edit or invented saved record',async()=>{
  const h=await formHarness();assert.equal(h.writes,1);assert.equal(h.nativeEdits,0);assert.equal(h.working.rawText,'');assert.deepEqual(h.working.structure,readyForm());
  assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.library.records[draftId],undefined);h.reloadJSON();assert.deepEqual(h.render().form.props.sidecar,h.working.structure);
});
test('SC-P02 one explicit materialization writes one pair and native Undo/Redo restores raw, form and IDs',async()=>{
  const h=await formHarness(),before=h.working.structure,p=h.prepare(),baseline=h.writes;
  const handler=h.render().form.props.onMaterialize;await Promise.all([handler(p),handler(p)]);h.render();assert.equal(h.nativeEdits,1);assert.equal(h.writes,baseline+1);assert.equal(h.working.rawText,p.command.nextRawText);assert.deepEqual(h.working.structure,p.after);
  const ids=h.working.sourceIdentity;h.input('','historyUndo');await h.flush();assert.equal(h.working.rawText,'');assert.deepEqual(h.working.structure,before);assert.equal(h.working.sourceIdentity,undefined);
  h.input(p.command.nextRawText,'historyRedo');await h.flush();assert.deepEqual(h.working.structure,p.after);assert.deepEqual(h.working.sourceIdentity,ids);assert.equal(h.nativeEdits,1);
});
test('SC-P03 native Undo after explicit saved revision keeps current record binding, then Redo is saveable',async()=>{
  const h=await formHarness(),p=h.prepare();await h.render().form.props.onMaterialize(p);h.render().button('제작 초안 저장').props.onClick();await h.settle();h.render();assert.equal(h.working.baseRecordRevision,1);
  h.input('','historyUndo');await h.flush();assert.equal(h.working.baseRecordRevision,1);assert.equal(h.working.rawText,'');assert.deepEqual(h.working.structure,p.before);
  h.input(p.command.nextRawText,'historyRedo');await h.flush();assert.equal(h.working.baseRecordRevision,1);h.render().button('제작 초안 저장').props.onClick();await h.settle();assert.equal(h.working.baseRecordRevision,1);
});
test('SC-P04 quota retains the applied pair and retry saves it without a second native command',async()=>{
  const h=await formHarness(),p=h.prepare(),before=JSON.stringify(h.data),baseline=h.writes;h.setFail(true);await h.render().form.props.onMaterialize(p);
  assert.equal(JSON.stringify(h.data),before);assert.equal(h.writes,baseline);assert.equal(h.nativeEdits,1);const view=h.render();assert.deepEqual(view.form.props.sidecar,p.after);
  assert(view.nodes.some(n=>n.type==='textarea'&&typeof n.props.value==='string'&&n.props.value.includes(p.after.materialization!.transactionId)));
  h.setFail(false);await h.flush();assert.equal(h.writes,baseline+1);assert.equal(h.nativeEdits,1);assert.deepEqual(h.working.structure,p.after);
});
test('SC-P05 stale source, foreign working state, IME and altered command have zero native or durable changes',async()=>{
  for(const condition of ['source','foreign','ime','command']as const){const h=await formHarness(),p=h.prepare(),baseline=h.writes;
    if(condition==='source')h.input('사용자 입력','insertText');if(condition==='foreign')h.foreign();if(condition==='ime')h.compose(true);
    await h.render().form.props.onMaterialize(condition==='command'?{...p,command:{...p.command,nextRawText:'위조'}}:p);
    assert.equal(h.nativeEdits,0,condition);assert.equal(h.writes,baseline,condition);
  }
});
test('SC-P06 unsupported native replacement preserves raw and unmaterialized form with no write',async()=>{
  const h=await formHarness(),p=h.prepare(),before=JSON.stringify(h.data);h.setNativeFailure(true);await h.render().form.props.onMaterialize(p);assert.equal(JSON.stringify(h.data),before);assert.equal(h.nativeEdits,0);assert.equal(h.raw,'');assert.deepEqual(h.render().form.props.sidecar,p.before);
});
test('SC-P07 ordinary typing keeps stale form, and detach changes no source or native history',async()=>{
  const h=await formHarness(),p=h.prepare();await h.render().form.props.onMaterialize(p);h.render();h.input(p.command.nextRawText+'\n내 추가 메모','insertText');await h.flush();
  assert.equal(programCreatorStructureConnection(h.working.structure!,h.raw),'stale');const raw=h.raw,native=h.nativeEdits;h.render().form.props.onChange(null);await h.flush();assert.equal(h.working.structure,undefined);assert.equal(h.raw,raw);assert.equal(h.nativeEdits,native);
});
test('SC-P08 source help matches connected form and preserves the no binary upload boundary',()=>{
  const source=readFileSync(new URL('./ProgramCreatorWorkspace.tsx',import.meta.url),'utf8');assert(!source.includes('입력값을 별도 폼에서 구성하는 편집기는 아닙니다'));assert(source.includes('연결을 해제해도 원문은 남습니다'));assert(source.includes('파일 첨부 업로드는 지원하지 않습니다'));
});

test('SC-P09 only a successfully opened new blank draft requests first source focus, once',async()=>{
  const h=harness();h.render();h.runBlankFocus();assert.equal(h.focusCalls,0);
  h.render().button('빈 제작 원문 만들기').props.onClick();h.render().button('계속 편집').props.onClick();h.render();h.runBlankFocus();assert.equal(h.focusCalls,0);
  h.render().button('빈 제작 원문 만들기').props.onClick();h.render().button('입력 버리고 열기').props.onClick();await h.settle();h.render();const before=h.writes;
  assert.notEqual(h.working.draftId,draftId);h.runBlankFocus();h.runBlankFocus();assert.equal(h.focusCalls,1);assert.deepEqual(h.selection,[0,0,'none']);assert.equal(h.writes,before);
  h.reloadJSON();h.render();h.runBlankFocus();assert.equal(h.focusCalls,1);
});

test('SC-P10 failed blank open and composition do not steal source focus',async()=>{
  const failed=harness();failed.render().button('빈 제작 원문 만들기').props.onClick();failed.setFail(true);failed.render().button('입력 버리고 열기').props.onClick();await failed.settle();failed.render();failed.runBlankFocus();assert.equal(failed.focusCalls,0);assert.equal(failed.writes,0);assert.equal(failed.working.draftId,draftId);
  const composing=harness();composing.render().button('빈 제작 원문 만들기').props.onClick();composing.render().button('입력 버리고 열기').props.onClick();await composing.settle();composing.compose(true);composing.render();composing.runBlankFocus();assert.equal(composing.focusCalls,0);composing.compose(false);composing.render();composing.runBlankFocus();assert.equal(composing.focusCalls,0);
});

test('SC-P11 returning from the panel preserves the exact selection, with no edit/write; IME blocks focus',()=>{
  const h=harness();h.render();h.input('이어서 쓸 원문','insertText');h.select(2,5);const before=h.writes;
  h.render().form.props.onReturnToSource();assert.deepEqual(h.selection,[2,5,'none']);assert.equal(h.focusCalls,1);assert.equal(h.writes,before);assert.equal(h.nativeEdits,0);
  h.compose(true);h.render().form.props.onReturnToSource();assert.equal(h.focusCalls,1);
});

test('SC-P12 materialized parent wires default date/view and preserves explicit same-draft choices without writes',async()=>{
  const h=await formHarness(),p=h.prepare();await h.render().form.props.onMaterialize(p);
  h.render().button('결과').props.onClick();let presenter=h.render().nodes.find(n=>n.props.projection&&n.props.onResultViewChange);
  assert.equal(presenter.props.navigation.resultView,'calendar');assert(presenter.props.navigation.baseDate);
  assert.deepEqual(presenter.props.availableViews.filter((v:string)=>v!=='sheet'),['calendar','todo','text']);
  const before=JSON.stringify(h.data),writes=h.writes;
  presenter.props.onResultViewChange('todo');h.render().button('원문').props.onClick();h.render().button('결과').props.onClick();
  presenter=h.render().nodes.find(n=>n.props.projection&&n.props.onResultViewChange);assert.equal(presenter.props.navigation.resultView,'todo');
  presenter.props.onCalendarBaseDateChange('2027-02-01');presenter.props.onCalendarSelectedDateChange('2027-02-08');
  presenter=h.render().nodes.find(n=>n.props.projection&&n.props.onResultViewChange);assert.equal(presenter.props.navigation.baseDate,'2027-02-01');assert.equal(presenter.props.navigation.selectedDate,'2027-02-08');
  assert.equal(JSON.stringify(h.data),before);assert.equal(h.writes,writes);
});
