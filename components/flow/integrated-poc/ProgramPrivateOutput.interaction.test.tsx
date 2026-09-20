import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import { materializePersonalWorkspacePocAuthoring } from '../../../lib/flow/personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../../../lib/flow/personal-workspace-poc-state';
import { prepareProgramInitialData } from '../../../lib/flow/integrated-poc/legacy-entry';
import * as output from '../../../lib/flow/integrated-poc/private-output';
import type { ProgramPrivateOutputProps } from './ProgramPrivateOutput';

// Executes component handlers with hook state. Not DOM, browser, or native-input evidence.
function harness() {
  const now='2026-09-12T12:00:00.000Z',raw='# 회차\n- [ ] 준비\n  - 날짜: 2026-09-14\n  - 반복: 매주 월\n  - 반복 종료: 3회';
  const made=materializePersonalWorkspacePocAuthoring({handoffId:'output-ui',documentId:'output-ui-source',revisionId:'output-ui-v1',committedAt:now,rawText:raw});assert(made.ok);
  const data=prepareProgramInitialData({baseModel:{version:1,flows:[made.flow]},legacyState:createPersonalWorkspacePocState(now)}).data;
  const documentId=data.spaces[data.activeActorId].savedBindings[0].documentId;
  let cursor=0,failRange=false;const slots:any[]=[];
  const hooks={...React,useState:(initial:any)=>{const id=cursor++;if(!(id in slots))slots[id]=typeof initial==='function'?initial():initial;return[slots[id],(next:any)=>{slots[id]=typeof next==='function'?next(slots[id]):next;}];},
    useRef:(initial:any)=>{const id=cursor++;if(!(id in slots))slots[id]={current:initial};return slots[id];},useMemo:(fn:()=>any)=>{cursor++;return fn();},useEffect:()=>{cursor++;},useId:()=>`output-test-${cursor++}`};
  const url=new URL('./ProgramPrivateOutput.tsx',import.meta.url),require=createRequire(url),root=resolve(dirname(fileURLToPath(url)),'../../..');
  const compiled=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
  const loaded={exports:{}as {ProgramPrivateOutput:(props:ProgramPrivateOutputProps)=>React.ReactNode}};
  vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded,loaded.exports,(id:string)=>id==='react'?hooks:id.endsWith('.css')?{__esModule:true,default:{}}:id==='@/lib/flow/integrated-poc/private-output'?{
    ...output,inspectProgramPrivateOutput:(...args:Parameters<typeof output.inspectProgramPrivateOutput>)=>failRange&&args[1].occurrenceRange?{ok:false,reason:'occurrence-source-unavailable'}:output.inspectProgramPrivateOutput(...args),
  }:require(id.startsWith('@/')?resolve(root,id.slice(2)):id));
  function render(){cursor=0;const nodes:any[]=[];const visit=(node:any)=>{if(Array.isArray(node))node.forEach(visit);else if(node&&typeof node==='object'&&node.props){nodes.push(node);visit(node.props.children);}};
    visit(loaded.exports.ProgramPrivateOutput({data,documentId,onClose(){}}));
    return{nodes,button:(text:string)=>nodes.find(node=>node.type==='button'&&node.props.children===text),mode:nodes.find(node=>node.type==='select'&&['raw','tasks'].includes(node.props.value))};
  }
  return{data,render,fail(){failRange=true;}};
}

test('unapplied recurrence range blocks task preview, cancel and raw TXT remain zero-write',()=>{
  const h=harness(),before=JSON.stringify(h.data);let view=h.render();view.mode.props.onChange({target:{value:'tasks'}});view=h.render();
  view.nodes.find(node=>node.type==='input'&&node.props.type==='date').props.onChange({target:{value:'2026-09-14'}});view=h.render();
  view.button('출력 내용 미리보기').props.onClick();view=h.render();
  assert(view.nodes.some(node=>node.props.role==='status'&&String(node.props.children).includes('적용하거나 취소')));
  assert(!view.nodes.some(node=>node.type==='textarea'));view.button('조회 변경 취소').props.onClick();
  view=h.render();view.mode.props.onChange({target:{value:'raw'}});view=h.render();view.button('출력 내용 미리보기').props.onClick();
  assert(h.render().nodes.some(node=>node.type==='textarea'&&node.props.value.includes('회차')));assert.equal(JSON.stringify(h.data),before);
});

test('range read failure keeps scope selector and exact raw output recovery reachable',()=>{
  const h=harness(),before=JSON.stringify(h.data);let view=h.render();view.mode.props.onChange({target:{value:'tasks'}});view=h.render();
  const dates=view.nodes.filter(node=>node.type==='input'&&node.props.type==='date');dates[0].props.onChange({target:{value:'2026-09-14'}});dates[1].props.onChange({target:{value:'2026-10-05'}});
  view=h.render();view.button('조회 기간 적용').props.onClick();h.fail();view=h.render();
  assert(view.mode,'range failure must not hide raw selector');assert(view.button('회차 조회 다시 시작'));
  view.mode.props.onChange({target:{value:'raw'}});view=h.render();view.button('출력 내용 미리보기').props.onClick();view=h.render();
  const preview=view.nodes.find(node=>node.type==='textarea');assert(preview);assert(preview.props.value.includes('회차'));
  assert.equal(JSON.stringify(h.data),before);
});
