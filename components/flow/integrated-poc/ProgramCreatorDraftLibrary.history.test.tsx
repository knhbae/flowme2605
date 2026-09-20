import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import {createProgramData} from '../../../lib/flow/integrated-poc/program-data';
import {TEXT_AUTHORING_HISTORY_KEY} from '../../../lib/flow/integrated-poc/creator-history-contract';
import type {ProgramCreatorDraftLibraryProps} from './ProgramCreatorDraftLibrary';

const label=(v:any):string=>Array.isArray(v)?v.map(label).join(''):typeof v==='string'?v:v?.props?label(v.props.children):'';
/** Explicit serialized fixture; original storage is read-only throughout. */
function fixture(){const document={schemaVersion:'flowme-text-authoring-v2',documentId:'native-library-document',ownership:'creator',title:'실제 남은 초안',rawText:'# 현재 원문\n- [ ] 준비',revision:{revisionId:'native-r2'},revisionHistory:[]};
  return JSON.stringify({schemaVersion:1,drafts:{native:{draftId:'native',title:document.title,ownership:'creator',status:'draft',document,revisionId:'native-r2',history:[{versionId:'native-save-1',kind:'saved',savedAt:'2026-09-12T01:00:00.000Z',revisionId:'native-r1',document:{...document,rawText:'# 이전 원문\n- [ ] 확인',revision:{revisionId:'native-r1'},selection:{itemId:'private-id'}}}]}},recoveries:{}});}
function harness(){let data=createProgramData(),raw=fixture(),at=0,reads=0,writes=0,fail=false;const slots:any[]=[],opened:string[]=[];
 const hooks={...React,useState:(initial:any)=>{const i=at++;if(!(i in slots))slots[i]=initial;return[slots[i],(v:any)=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef:(initial:any)=>{const i=at++;return slots[i]??={current:initial};},useEffect:()=>{at++;}};
 const url=new URL('./ProgramCreatorDraftLibrary.tsx',import.meta.url),root=resolve(dirname(fileURLToPath(url)),'../../..');
 // Load the real nested recovery component under the same React/CSS test adapters.
 // Native require would otherwise parse its CSS module as JavaScript.
 function loadComponent(source:URL):Record<string,unknown>{
  const require=createRequire(source),loaded={exports:{} as Record<string,unknown>};
  const code=ts.transpileModule(readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInThisContext(`(function(module,exports,require){${code}\n})`)(loaded,loaded.exports,(id:string)=>id==='react'?hooks:id.endsWith('.css')?{__esModule:true,default:{}}:id==='./ProgramLegacyCreatorRecovery'?loadComponent(new URL('./ProgramLegacyCreatorRecovery.tsx',source)):require(id.startsWith('@/')?resolve(root,id.slice(2)):id));
  return loaded.exports;
 }
 const loaded={exports:loadComponent(url) as {ProgramCreatorDraftLibrary:(p:ProgramCreatorDraftLibraryProps)=>React.ReactNode}};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window');Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(key:string)=>{assert.equal(key,TEXT_AUTHORING_HISTORY_KEY);reads++;return raw;},setItem:()=>{throw Error('operating writer forbidden');}}}});
 function render(){at=0;const tree=loaded.exports.ProgramCreatorDraftLibrary({data,mutate:async(_label,build)=>{if(fail)return{ok:false,reason:'storage'};const result=build(data);if(!result.ok)return{ok:false,reason:result.reason};if(result.changed)writes++;data=result.data;return{ok:true,result:result.result};},onClose:()=>{},onOpenDocument:()=>{},onOpenCreatorDraft:id=>opened.push(id)});const nodes:any[]=[];function walk(v:any){if(Array.isArray(v))v.forEach(walk);else if(v?.props){nodes.push(v);walk(v.props.children);}}walk(tree);return{nodes,text:label(tree),button:(text:string)=>nodes.find(n=>n.type==='button'&&label(n).startsWith(text)),select:(index:number)=>nodes.filter(n=>n.type==='select')[index]};}
 return{render,opened,get data(){return data;},get reads(){return reads;},get writes(){return writes;},fail(v:boolean){fail=v;},changeSource(){raw+=' ';},cleanup(){if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');},async settle(){for(let i=0;i<20;i++)await Promise.resolve();}};
}
test('CHLIB01 native read requires explicit click; exact previous source preview writes nothing',()=>{const h=harness();try{assert.equal(h.reads,0);h.render();assert.equal(h.reads,0);h.render().button('개발2 저장 이력 읽기').props.onClick();assert.equal(h.reads,1);h.render().select(0).props.onChange({target:{value:'native'}});h.render().select(1).props.onChange({target:{value:'native:native:native-save-1'}});const screen=h.render();assert(screen.text.includes('# 현재 원문'));assert(screen.text.includes('# 이전 원문'));assert(screen.text.includes('private-id'));assert.equal(h.writes,0);}finally{h.cleanup();}});
test('CHLIB02 failed import preserves selection; duplicate retry commits once and original source remains read-only',async()=>{const h=harness();try{h.render().button('개발2 저장 이력 읽기').props.onClick();h.render().select(0).props.onChange({target:{value:'native'}});h.fail(true);h.render().button('현재 원문과 저장 이력').props.onClick();await h.settle();assert.equal(h.writes,0);assert.equal(h.render().select(0).props.value,'native');h.fail(false);const apply=h.render().button('현재 원문과 저장 이력').props.onClick;apply();apply();await h.settle();assert.equal(h.writes,1);assert.equal(h.opened.length,1);assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText,'# 현재 원문\n- [ ] 준비');}finally{h.cleanup();}});
test('CHLIB03 source changes after selection reject whole import without opening or writing',async()=>{const h=harness();try{h.render().button('개발2 저장 이력 읽기').props.onClick();h.render().select(0).props.onChange({target:{value:'native'}});h.changeSource();h.render().button('현재 원문과 저장 이력').props.onClick();await h.settle();assert.equal(h.writes,0);assert.equal(h.opened.length,0);assert(h.render().text.includes('기존 저장소나 현재 입력이 바뀌었습니다'));}finally{h.cleanup();}});
