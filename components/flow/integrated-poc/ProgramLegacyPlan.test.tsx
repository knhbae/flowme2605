import {loadProgramPlanUi} from './ProgramLegacyPlan.test-support';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { materializePersonalWorkspacePocAuthoring } from '../../../lib/flow/personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../../../lib/flow/personal-workspace-poc-state';
import { prepareProgramInitialData } from '../../../lib/flow/integrated-poc/legacy-entry';
import type { ProgramEditorFlush } from '../../../lib/flow/integrated-poc/document-action';
import type * as Component from './ProgramLegacyPlan';
import { applyProgramLegacySourceAction, prepareProgramLegacyView } from '../../../lib/flow/integrated-poc/legacy-transaction';
import { readProgramLegacySourceLifecycle, type ProgramLegacySourceAction } from '../../../lib/flow/integrated-poc/legacy-source-lifecycle';
import { programLegacySourceChanges } from '../../../lib/flow/integrated-poc/legacy-source-lifecycle-contract';
const now='2026-09-12T00:00:00.000Z';
function harness(){
  const source=materializePersonalWorkspacePocAuthoring({handoffId:'k4-ui',documentId:'k4-ui-doc',revisionId:'v1',committedAt:now,rawText:'# 준비\n- 기준일: 2026-09-18\n- [ ] 첫째\n  - 상대 날짜: D-1\n- [ ] 둘째'});assert.ok(source.ok);
  const flowRef=source.flow.ref;let data=prepareProgramInitialData({baseModel:{version:1,flows:[source.flow]},legacyState:createPersonalWorkspacePocState(now)}).data;
  let cursor=0,writes=0,fail=false,port:ProgramEditorFlush|null=null;const slots:any[]=[];
  const hooks={...React,useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useEffect:(fn:()=>void)=>{const i=cursor++;if(!(i in slots)){slots[i]=true;fn();}}};
  const url=new URL('./ProgramLegacyPlan.tsx',import.meta.url),require=createRequire(url),root=resolve(dirname(fileURLToPath(url)),'../../..');
  const compiled=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}),loaded={exports:{} as typeof Component};
  vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded,loaded.exports,(id:string)=>id==='react'?hooks:id==='./ProgramLegacyPlanSeries'?loadProgramPlanUi(resolve(root,'components/flow/integrated-poc/ProgramLegacyPlanSeries.tsx'),hooks):id==='./ProgramLegacyMapPlan'?{ProgramLegacyMapPlan:()=>{throw Error('ordinary harness must not render Map');}}:id.endsWith('.css')?{__esModule:true,default:{}}:require(id.startsWith('@/')?resolve(root,id.slice(2)):id));
  function render(){cursor=0;const tree=loaded.exports.ProgramLegacyPlan({data,flowRef,onRegisterEditors:value=>{port=value;},mutate:async(_label,build)=>{if(fail)return{ok:false,reason:'quota'};const result=build(data);if(!result.ok)return{ok:false,reason:result.reason};if(result.changed)writes++;data=result.data;return{ok:true,result:result.result};}});const nodes:any[]=[];function visit(node:any){if(Array.isArray(node))node.forEach(visit);else if(node?.props){if(typeof node.type==='function'){visit(node.type(node.props));return;}nodes.push(node);visit(node.props.children);}}visit(tree);return {nodes,button:(text:string)=>nodes.find(node=>node.type==='button'&&node.props.children===text),date:()=>nodes.find(node=>node.type==='input'&&node.props.type==='date')};}
  return{render,flowRef,get data(){return data;},setData(value:typeof data){data=value;},get writes(){return writes;},get port(){return port!;},setFail(value:boolean){fail=value;}};
}
test('actual K4 component draft input, preview, Cancel/Escape and IME/lock are no-write; explicit apply is one mutation',async()=>{
  const h=harness(),before=JSON.stringify(h.data);let view=h.render();view.button('기준일·항목 선택 검토').props.onClick();view=h.render();
  view.date().props.onChange({target:{value:'2026-09-20'}});view=h.render();assert.equal(await h.port.flushAll(),false);assert.equal(h.writes,0);
  view.button('변경 비교').props.onClick();view=h.render();assert.ok(view.button('이 선택 적용'));assert.equal(JSON.stringify(h.data),before);
  view.button('취소').props.onClick();view=h.render();assert.equal(h.port.hasPendingInput?.(),false);assert.equal(h.writes,0);
  view.button('기준일·항목 선택 검토').props.onClick();view=h.render();view.date().props.onChange({target:{value:'2026-09-20'}});view=h.render();view.nodes[0].props.onKeyDown({key:'Escape',preventDefault(){}});view=h.render();assert.equal(h.writes,0);
  view.button('기준일·항목 선택 검토').props.onClick();view=h.render();view.date().props.onChange({target:{value:'2026-09-20'}});view=h.render();view.button('변경 비교').props.onClick();view=h.render();
  const release=h.port.lockInput();view.button('이 선택 적용').props.onClick();assert.equal(h.writes,0);release();
  view.date().props.onCompositionStart();view.button('이 선택 적용').props.onClick();assert.equal(h.writes,0);assert.equal(await h.port.flushAll(),false);view.date().props.onCompositionEnd();
  h.setFail(true);view.button('이 선택 적용').props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.writes,0);assert.ok(h.port.hasPendingInput?.());
  h.setFail(false);view=h.render();view.button('이 선택 적용').props.onClick();await new Promise(resolve=>setImmediate(resolve));h.render();assert.equal(h.writes,1);assert.equal(h.port.hasPendingInput?.(),false);
});
test('actual stale review UI reopens, demands a choice for each new source item and applies without resurrecting excluded items',async()=>{
  const h=harness();let view=h.render();view.button('기준일·항목 선택 검토').props.onClick();view=h.render();
  view.nodes.filter(node=>node.type==='input'&&node.props.type==='checkbox')[1].props.onChange({target:{checked:false}});view=h.render();view.button('변경 비교').props.onClick();view=h.render();view.button('이 선택 적용').props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.writes,1);h.render();
  const actorId=h.data.activeActorId,flowRef=h.flowRef;
  function sourceAction(action:ProgramLegacySourceAction){const read=prepareProgramLegacyView(h.data,{actorId,now,onlyFlowRef:flowRef,sourceReview:true});assert.ok(read.ok);const result=applyProgramLegacySourceAction(h.data,{actorId,expectedToken:read.token,action});assert.ok(result.transition.ok);h.setData(result.transition.data);}
  sourceAction({type:'stage',flowRef,requestId:'k4-ui-current',now,rawText:'# 준비\n- 기준일: 2026-09-18\n- [ ] 첫째\n  - 상대 날짜: D-1\n- [ ] 둘째\n- [ ] 새로운 셋째'});
  const read=readProgramLegacySourceLifecycle(JSON.parse(h.data.spaces[actorId].legacySnapshot!.raw),flowRef);assert.ok(read.ok);
  for(const change of programLegacySourceChanges(read.owner,'program-source:k4-ui-current'))sourceAction({type:'choice',flowRef,reviewId:'k4-ui-current',changeId:change.id,choice:'incoming',now});
  sourceAction({type:'apply',flowRef,reviewId:'k4-ui-current',now});
  view=h.render();assert.equal(view.button('기준일·항목 선택 검토').props.disabled,false);view.button('기준일·항목 선택 검토').props.onClick();view=h.render();
  const radios=view.nodes.filter(node=>node.type==='input'&&node.props.type==='radio');assert.equal(radios.length,2);assert.ok(radios.every(node=>node.props.checked===false));
  view.button('변경 비교').props.onClick();view=h.render();assert.equal(view.button('이 선택 적용'),undefined);assert.ok(view.nodes.some(node=>node.props.role==='alert'&&String(node.props.children).includes('직접 선택')));
  radios[1].props.onChange();view=h.render();view.button('변경 비교').props.onClick();view=h.render();view.button('이 선택 적용').props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.writes,2);
  const owner=JSON.parse(h.data.spaces[actorId].legacySnapshot!.raw).planSelections.flows[flowRef];assert.equal(owner.includedItemRefs.length,1);assert.equal(h.port.hasPendingInput?.(),false);
});
