import test from 'node:test';
import './test-css-modules';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { setProgramCreatorWorking,applyProgramCreatorAction,handoffProgramCreatorDraft } from '../../../lib/flow/integrated-poc/creator-workspace';
import type {ProgramData} from '../../../lib/flow/integrated-poc/contract';
import { fingerprintPersonalWorkspacePocAuthoringSource as fp } from '../../../lib/flow/personal-workspace-poc-authoring';
import type { ProgramCreatorWorkspaceProps } from './ProgramCreatorWorkspace';
import { creatorNativeText } from '../../../lib/flow/integrated-poc/creator-source-order';
import { programCreatorOrderNativeReplacement } from './ProgramCreatorWorkspace';

test('order native edit excludes a common first line and preserves exact outside bytes',()=>{
  const before='# 밖\n## 구간\n- [ ] 같은 제목\n  - [ ] B\n- [ ] 같은 제목\n  - [ ] A\n## 뒤\n보존';
  const after=before.replace('] B','] X').replace('] A','] B').replace('] X','] A');
  const edit=programCreatorOrderNativeReplacement(before,after);
  assert.equal(edit.range.start,before.indexOf('B\n'));
  assert.equal(before.slice(0,edit.range.start)+edit.replacement+before.slice(edit.range.end),after);
  assert(!edit.replacement.includes('## 뒤'));
});
test('order native edit keeps surrogate and CRLF boundaries whole for insert/delete/no-op',()=>{
  for(const [before,after] of [
    ['abc','abc'],['','새 원문'],['원문',''],['abc','abXc'],['abXc','abc'],
    ['앞😀뒤','앞😁뒤'],['앞😀뒤','앞뒤'],['앞뒤','앞😁뒤'],
    ['a\r\nb','a\rb'],['a\rb','a\r\nb'],['a\r\nb','a\nb'],
    ['😀\r\n끝','😁\r\n끝'],
  ]) {
    const edit=programCreatorOrderNativeReplacement(before,after),{start,end}=edit.range;
    assert.equal(before.slice(0,start)+edit.replacement+before.slice(end),after);
    for(const [text,at] of [[before,start],[before,end],[after,start],[after,start+edit.replacement.length]] as const) {
      assert(!(text[at-1]==='\r'&&text[at]==='\n'));
      assert(!(/[\uD800-\uDBFF]/u.test(text[at-1]??'')&&/[\uDC00-\uDFFF]/u.test(text[at]??'')));
    }
  }
});

const RAW='# 제목\n## 준비\n- [ ] 늦게\n  - 날짜: 2026-09-20\n- [ ] 먼저\n  - 날짜: 2026-09-15';
// Exercises real component handlers and real private transitions. Native browser history is separately verified.
function harness(initialRaw=RAW,initialData?:ProgramData) {
  let data=createProgramData();const actor=data.activeActorId;
  const initial=setProgramCreatorWorking(data,{actorId:actor,expectedWorking:null,working:{draftId:'creator-order-ui',title:'제목',rawText:initialRaw,baseRecordRevision:null}},new Date().toISOString());assert(initial.ok);if(!initial.ok)throw Error('fixture');data=initial.data;
  if(initialData)data=initialData;
  let writes=0,nativeEdits=0,fail=false,at=0;const slots:any[]=[],nativeRequests:any[]=[];
  let snapshot={editorId:'source',documentId:'creator-order-ui',rawText:creatorNativeText(initialRaw),sourceFingerprint:fp(creatorNativeText(initialRaw)),selectionStart:0,selectionEnd:0,selectionDirection:'none' as const,scrollTop:120,scrollLeft:4,dispatchCount:0,composing:false};
  const hooks={...React,useState:(value:any)=>{const i=at++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],(v:any)=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef:(value:any)=>{const i=at++;if(!(i in slots))slots[i]={current:value};return slots[i];},useMemo:(fn:()=>any)=>{at++;return fn();},useEffect:()=>{at++;}};
  const url=new URL('./ProgramCreatorWorkspace.tsx',import.meta.url),require=createRequire(url),root=resolve(dirname(fileURLToPath(url)),'../../..');
  const compiled=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}),loaded={exports:{} as {ProgramCreatorWorkspace:(p:ProgramCreatorWorkspaceProps)=>React.ReactNode}};
  vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded,loaded.exports,(id:string)=>id==='react'?hooks:id.endsWith('.css')?{__esModule:true,default:{}}:require(id.startsWith('@/')?resolve(root,id.slice(2)):id));
  let editorNode:any;
  const handle={readSnapshot:()=>({...snapshot}),focusRange:(start:number,end:number,direction:any)=>{snapshot={...snapshot,selectionStart:start,selectionEnd:end,selectionDirection:direction};return true;},applyNativeReplacement:async(request:any)=>{
    assert.equal(request.expected.rawText,snapshot.rawText);nativeEdits++;nativeRequests.push(request);
    const raw=snapshot.rawText.slice(0,request.range.start)+request.replacement+snapshot.rawText.slice(request.range.end);
    snapshot={...snapshot,rawText:raw,sourceFingerprint:fp(raw),dispatchCount:snapshot.dispatchCount+1};editorNode.props.onNativeInput(snapshot,'insertText');return{ok:true,snapshot:{...snapshot}};
  }};
  function render(){at=0;const tree=loaded.exports.ProgramCreatorWorkspace({data,today:'2026-09-12',navigate:()=>{},mutate:async(_label,transition)=>{
    if(fail)return{ok:false,reason:'storage'} as any;const result=transition(data);if(!result.ok)return{ok:false,reason:result.reason};if(result.changed)writes++;data=result.data;return{ok:true,result:result.result};
  }});const nodes:any[]=[];const walk=(v:any)=>{if(Array.isArray(v))v.forEach(walk);else if(v?.props){nodes.push(v);walk(v.props.children);}};walk(tree);
    editorNode=nodes.find(n=>n.props.label==='제작 원문'&&n.props.onNativeInput);editorNode.props.ref.current=handle;
    return {nodes,button:(text:string)=>nodes.find(n=>n.type==='button'&&n.props.children===text),step:()=>nodes.find(n=>n.type==='select'&&n.props.children?.[0]?.props?.children==='구간 선택')};
  }
  const settle=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
  function preview(calendar=false,step='2'){let v=render();v.step().props.onChange({target:{value:step}});v=render();v.button(calendar?'Calendar 결과순 미리보기':'날짜순 미리보기').props.onClick();return render();}
  return {render,preview,settle,nativeRequests,get data(){return data;},get writes(){return writes;},get nativeEdits(){return nativeEdits;},setFail(v:boolean){fail=v;},compose(v:boolean){snapshot={...snapshot,composing:v};},foreign(){data=structuredClone(data);data.spaces[actor].creatorWorkspace!.working!.title='외부 변경';},input(raw:string,type:string){snapshot={...snapshot,rawText:raw,sourceFingerprint:fp(raw),dispatchCount:snapshot.dispatchCount+1};editorNode.props.onNativeInput(snapshot,type);},get raw(){return snapshot.rawText;}};
}

test('same-title Calendar order sends only its differing span to one native transaction',async()=>{
  const raw='# 계획\n- 기준일: 2026-10-05\n## 발표 연습\n- [ ] 발표 연습\n  - [ ] 예상 질문 확인\n  - 날짜: 2026-10-08\n  - 반복: 매주 목\n  - 반복 종료: 3회\n- [ ] 발표 연습\n  - [ ] 도입 문장 확인\n  - 날짜: 2026-10-05\n  - 반복: 매주 월\n  - 반복 종료: 3회';
  const h=harness(raw);h.preview(true,'3').button('확인한 순서로 원문에 적용').props.onClick();await h.settle();
  assert.equal(h.nativeEdits,1);assert.equal(h.writes,1);
  const request=h.nativeRequests[0];assert.equal(request.range.start,raw.indexOf('예상'));
  assert.equal(raw.slice(0,request.range.start)+request.replacement+raw.slice(request.range.end),h.raw);
  assert(h.raw.indexOf('도입 문장 확인')<h.raw.indexOf('예상 질문 확인'));
  const sorted=h.raw;
  h.render();h.input(raw,'historyUndo');h.render().button('입력 보관 다시 시도').props.onClick();await h.settle();
  assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText,raw);
  h.render();h.input(sorted,'historyRedo');h.render().button('입력 보관 다시 시도').props.onClick();await h.settle();
  assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText,sorted);
  assert.equal(h.nativeEdits,1);
});
test('preview/cancel/Escape and stale/IME apply have zero native and durable writes',async()=>{
  const h=harness();let v=h.preview();assert(v.button('확인한 순서로 원문에 적용'));assert.equal(h.writes,0);
  v.button('정렬 취소').props.onClick();assert.equal(h.nativeEdits,0);
  v=h.preview();v.nodes.find(n=>n.props['aria-label']==='제작 원문 날짜순 확인').props.onKeyDown({key:'Escape',preventDefault(){}});assert.equal(h.nativeEdits,0);
  v=h.preview();h.compose(true);v.button('확인한 순서로 원문에 적용').props.onClick();await h.settle();assert.equal(h.writes,0);assert.equal(h.nativeEdits,0);
  h.compose(false);v=h.preview();h.foreign();v=h.render();v.button('확인한 순서로 원문에 적용').props.onClick();await h.settle();assert.equal(h.nativeEdits,0);assert.equal(h.writes,0);
});
test('actual Calendar alignment handler accepts relative recurrence, keeps cancel empty and uses one native apply with paired Undo',async()=>{
  const raw='# 계획\n- 기준일: 2026-09-20\n## 준비\n- [ ] 뒤\n  - 상대 날짜: D-1\n- [ ] 미정\n- [ ] 앞\n  - 날짜: 2026-09-14\n  - 반복: 매주 월\n  - 반복 종료: 2026-09-28';
  const h=harness(raw);h.preview(true,'3').button('정렬 취소').props.onClick();assert.equal(h.writes,0);assert.equal(h.nativeEdits,0);
  h.preview(true,'3').button('확인한 순서로 원문에 적용').props.onClick();await h.settle();assert.equal(h.writes,1);assert.equal(h.nativeEdits,1);
  assert(h.raw.indexOf('- [ ] 앞')<h.raw.indexOf('- [ ] 뒤'));assert(h.raw.endsWith('- [ ] 미정'));const afterIdentity=h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.sourceIdentity!;
  h.render();h.input(raw,'historyUndo');h.render().button('입력 보관 다시 시도').props.onClick();await h.settle();
  assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText,raw);
  assert.deepEqual(new Set(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.sourceIdentity!.lines.map(l=>l.id)),new Set(afterIdentity.lines.map(l=>l.id)));
});
test('one apply keeps source identity through handler native Undo/Redo and saves via the real transition',async()=>{
  const h=harness(),v=h.preview();v.button('확인한 순서로 원문에 적용').props.onClick();await h.settle();assert.equal(h.nativeEdits,1);assert.equal(h.writes,1);
  const after=h.raw,identity=h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.sourceIdentity!;assert(identity);assert(after.indexOf('먼저')<after.indexOf('늦게'));
  h.render();h.input(RAW,'historyUndo');let r=h.render();r.button('입력 보관 다시 시도').props.onClick();await h.settle();
  const before=h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.sourceIdentity!;assert.equal(before.rawText,RAW);assert.deepEqual(new Set(before.lines.map(l=>l.id)),new Set(identity.lines.map(l=>l.id)));
  h.render();h.input(after,'historyRedo');r=h.render();r.button('입력 보관 다시 시도').props.onClick();await h.settle();assert.deepEqual(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.sourceIdentity,identity);
});
test('storage failure retains unsaved sorted input and explicit retry stores it without another native edit',async()=>{
  const h=harness();h.setFail(true);h.preview().button('확인한 순서로 원문에 적용').props.onClick();await h.settle();assert.equal(h.writes,0);assert.equal(h.nativeEdits,1);assert.notEqual(h.raw,RAW);
  h.setFail(false);h.render().button('입력 보관 다시 시도').props.onClick();await h.settle();assert.equal(h.writes,1);assert.equal(h.nativeEdits,1);
});
test('normalized textarea transport preserves CRLF source bytes through sort and native Undo/Redo handlers',async()=>{
  const raw=RAW.replaceAll('\n','\r\n'),h=harness(raw);h.preview().button('확인한 순서로 원문에 적용').props.onClick();await h.settle();
  const after=h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText;assert(after.includes('\r\n'));assert.equal(after.replaceAll('\r\n','\n'),h.raw);
  h.render();h.input(creatorNativeText(raw),'historyUndo');h.render().button('입력 보관 다시 시도').props.onClick();await h.settle();assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText,raw);
  h.render();h.input(creatorNativeText(after),'historyRedo');h.render().button('입력 보관 다시 시도').props.onClick();await h.settle();assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText,after);
});
test('ordinary typing invalidates a sort receipt instead of reusing a stale source ID permutation',async()=>{
  const h=harness();h.preview().button('확인한 순서로 원문에 적용').props.onClick();await h.settle();h.render();h.input(h.raw+'\n새 메모','insertText');
  h.render().button('입력 보관 다시 시도').props.onClick();await h.settle();assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.sourceIdentity,undefined);
});
function updateFixture(){
  let data=createProgramData();const actorId=data.activeActorId,now='2026-09-12T13:00:00.000Z',draftId='creator-order-ui';
  function save(rawText:string){const w=data.spaces[actorId].creatorWorkspace,rev=w?.library.records[draftId]?.recordRevision;const working=setProgramCreatorWorking(data,{actorId,expectedWorking:w?.working??null,working:{draftId,title:'제목',rawText,baseRecordRevision:rev??null}},now);assert(working.ok);data=working.data;
    const result=applyProgramCreatorAction(data,{actorId,requestId:`save-${rev??0}`,action:{type:'save',draftId,title:'제목',rawText,sourceFingerprint:fp(rawText),expectedLibraryRevision:data.spaces[actorId].creatorWorkspace!.library.revision,...(rev?{expectedRecordRevision:rev}:{}),now}},now);assert(result.ok);data=result.data;}
  save(RAW);const handed=handoffProgramCreatorDraft(data,{actorId,requestId:'handoff',draftId,expectedRecordRevision:1,today:'2026-09-12'},now);assert(handed.ok);data=handed.data;
  const raw=RAW.replace('늦게','새 늦게');save(raw);return harness(raw,data);
}
test('selective update component keeps cancel/Escape write-free and retries an explicit failed apply once',async()=>{
  const h=updateFixture();let v=h.render();v.button('개인 수정과 새 제작 내용 비교').props.onClick();v=h.render();assert(v.button('선택한 변경만 한 번 적용'));assert.equal(h.writes,0);
  v.nodes.find(n=>n.props['aria-label']==='제작 업데이트 선택 비교').props.onKeyDown({key:'Escape',preventDefault(){}});assert.equal(h.writes,0);
  h.render().button('개인 수정과 새 제작 내용 비교').props.onClick();v=h.render();v.button('모두 유지하고 비교 닫기').props.onClick();assert.equal(h.writes,0);
  h.render().button('개인 수정과 새 제작 내용 비교').props.onClick();v=h.render();const radios=v.nodes.filter(n=>n.type==='input'&&n.props.type==='radio');radios[1].props.onChange();
  h.setFail(true);h.render().button('선택한 변경만 한 번 적용').props.onClick();await h.settle();assert.equal(h.writes,0);assert(h.render().button('선택한 변경만 한 번 적용'));
  h.setFail(false);h.render().button('선택한 변경만 한 번 적용').props.onClick();await h.settle();assert.equal(h.writes,1);assert.equal(h.render().button('선택한 변경만 한 번 적용'),undefined);assert.equal(h.nativeEdits,0);
});
