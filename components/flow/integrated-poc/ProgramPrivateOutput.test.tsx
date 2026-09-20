import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import type { ProgramPrivateOutput as Component } from './ProgramPrivateOutput';
const componentUrl=new URL('./ProgramPrivateOutput.tsx',import.meta.url), require=createRequire(componentUrl),root=resolve(dirname(fileURLToPath(componentUrl)),'../../..');
const compiled=ts.transpileModule(readFileSync(componentUrl,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
const loaded={exports:{} as {ProgramPrivateOutput:typeof Component}};
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded,loaded.exports,(id:string)=>id.endsWith('.css')?{__esModule:true,default:new Proxy({},{get:(_t,key)=>String(key)})}:require(id.startsWith('@/')?resolve(root,id.slice(2)):id));
const {ProgramPrivateOutput}=loaded.exports;
test('private output modal initially exposes scope and explicit preview but no transfer action',()=>{
  const data=createProgramData(),space=data.spaces[data.activeActorId]; space.text=M.addDocument(space.text,{title:'개인 메모'}); const id=space.text.documents[0].id;
  space.text=M.editText(space.text,id,'민감한 독립 메모\n- [ ] 내 할 일'); const before=JSON.stringify(data);
  const html=renderToStaticMarkup(<ProgramPrivateOutput data={data} documentId={id} onClose={()=>{}}/>);
  assert.match(html,/aria-labelledby="private-output-title"/); assert.match(html,/문서 원문 전체/); assert.match(html,/실행 항목 선택/); assert.match(html,/출력 내용 미리보기/);
  assert.doesNotMatch(html,/파일 받기|내용 복사/); assert.equal(JSON.stringify(data),before);
});
test('missing document disables output entry instead of leaking another document',()=>{
  const html=renderToStaticMarkup(<ProgramPrivateOutput data={createProgramData()} documentId="missing" onClose={()=>{}}/>);
  assert.match(html,/문서와 현재 인물을 확인/); assert.doesNotMatch(html,/출력 내용 미리보기|파일 받기/);
});
test('local return is explicitly unchecked and part of preview staleness; raw mode never passes it',()=>{
  const source=readFileSync(componentUrl,'utf8');
  assert.match(source,/\[includeReturn, setIncludeReturn\] = useState\(false\)/);
  assert.match(source,/mode === 'tasks' && includeReturn \? \{ returnPageUrl \} : \{\}/);
  assert.match(source,/rangeDraft, includeReturn, returnPageUrl/);
  assert.match(source,/programOutputReturnBase\(window.location.href\)/);
  assert.match(source,/disabled=\{busy \|\| !returnPageUrl\}/);
});
