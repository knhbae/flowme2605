import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import type { ProgramOutputReturn as Component } from './ProgramOutputReturn';
const componentUrl=new URL('./ProgramOutputReturn.tsx',import.meta.url),require=createRequire(componentUrl),root=resolve(dirname(fileURLToPath(componentUrl)),'../../..');
const children=new Map<string,{exports:unknown}>();
function load(id:string):unknown{
  if(id.endsWith('.css'))return{__esModule:true,default:new Proxy({},{get:(_t,key)=>String(key)})};
  if(id.startsWith('./Program')){if(children.has(id))return children.get(id)!.exports;const child={exports:{}};children.set(id,child);
    const code=ts.transpileModule(readFileSync(new URL(`${id}.tsx`,componentUrl),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
    vm.runInThisContext(`(function(module,exports,require){${code.outputText}\n})`)(child,child.exports,load);return child.exports;}
  return require(id.startsWith('@/')?resolve(root,id.slice(2)):id);
}
const {ProgramOutputReturn}=load('./ProgramOutputReturn') as {ProgramOutputReturn:typeof Component};
test('return view starts read-only and foreign actor renders neither private title nor source button',()=>{
  const data=createProgramData(),s=data.spaces[data.activeActorId];s.text=M.addDocument(s.text,{title:'PRIVATE_DOC'});const id=s.text.documents[0].id;s.text=M.editText(s.text,id,'- [ ] PRIVATE_TASK');const task=M.tasks(s.text)[0];
  const destination={view:'space' as const,id,returnActorId:data.activeActorId,executionKey:JSON.stringify(['text-task',id,task.id])};
  let writes=0,opens=0;const props={data,destination,today:'2026-09-12',mutate:async()=>{writes++;return{ok:false as const,reason:'forbidden'};},onOpenSource:()=>{opens++;},onUndo:async()=>{},onRedo:async()=>{}};
  const before=JSON.stringify(data),html=renderToStaticMarkup(<ProgramOutputReturn {...props}/>);assert.match(html,/PRIVATE_TASK|원래 문서의 이 행 열기/);assert.doesNotMatch(html,/진행.*button|날짜 저장/);
  const foreign=renderToStaticMarkup(<ProgramOutputReturn {...props} destination={{...destination,returnActorId:'creator-minji'}}/>);assert.doesNotMatch(foreign,/PRIVATE|원래 문서의 이 행 열기/);assert.match(foreign,/현재 인물이 다릅니다/);
  s.archivedDocumentIds.push(id);const archived=renderToStaticMarkup(<ProgramOutputReturn {...props}/>);assert.match(archived,/보관되어 있습니다/);assert.doesNotMatch(archived,/PRIVATE_TASK/);s.archivedDocumentIds=[];
  assert.equal(writes,0);assert.equal(opens,0);assert.equal(JSON.stringify(data),before);
});
test('exact recurrence key is forwarded to parent port registration and uses existing guarded editor',()=>{
  const source=readFileSync(componentUrl,'utf8');assert.match(source,/onRegisterEditors\?\.\(port, key\)/);assert.match(source,/key = target.kind === 'occurrence' \? target.row.key/);
  assert.match(source,/row=\{target.row\}/);assert.match(source,/onRegisterEditors=\{register\}/);assert.doesNotMatch(source,/localStorage|setItem|updateProgram.*Execution/);
});
