import test from 'node:test';
import './test-css-modules';
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
import { setProgramCreatorWorking, applyProgramCreatorAction, handoffProgramCreatorDraft, fingerprintPersonalWorkspacePocAuthoringSource as fp } from '../../../lib/flow/integrated-poc/creator-workspace';
import type * as Creator from './ProgramCreatorWorkspace';

const url = new URL('./ProgramCreatorWorkspace.tsx', import.meta.url), require = createRequire(url), root = resolve(dirname(fileURLToPath(url)), '../../..');
const source = readFileSync(url,'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
const loaded = {exports:{} as typeof Creator};
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded,loaded.exports,(id:string)=>id.endsWith('.module.css') ? {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})} : require(id.startsWith('@/')?resolve(root,id.slice(2)):id));
const {ProgramCreatorWorkspace,ProgramCreatorHandoffComparison,programCreatorNeedsSave,programCreatorReplacementRange} = loaded.exports;
const NOW='2026-09-12T09:00:00.000Z';
const RAW='# 준비\n\n## 출발\n- [ ] 가방 확인\n  - 날짜: 2026-09-15\n  - 완료 기준: 지퍼 닫기';
function props(): Creator.ProgramCreatorWorkspaceProps { return {data:createProgramData(),today:'2026-09-12',mutate:async()=>assert.fail('SSR must not write'),navigate:()=>assert.fail('SSR must not navigate')}; }
function existing() {
  const p=props(),actorId=p.data.activeActorId;
  const working=setProgramCreatorWorking(p.data,{actorId,expectedWorking:null,working:{draftId:'creator-ssr',title:'준비',rawText:RAW,baseRecordRevision:null}},NOW); if(!working.ok)throw Error(working.reason);
  const saved=applyProgramCreatorAction(working.data,{actorId,requestId:'save',action:{type:'save',draftId:'creator-ssr',title:'준비',rawText:RAW,sourceFingerprint:fp(RAW),expectedLibraryRevision:0,now:NOW}},NOW);if(!saved.ok)throw Error(saved.reason);
  p.data=saved.data;return p;
}
test('empty creator starts without inventing a document, sample, or saved draft',()=>{
  const p=props(),before=JSON.stringify(p.data),html=renderToStaticMarkup(<ProgramCreatorWorkspace {...p}/>);
  assert.ok(html.includes('빈 제작 원문 만들기')); assert.ok(html.includes('제작 초안 열기')); assert.equal(html.includes('4주 운동 적응'),false);assert.equal(JSON.stringify(p.data),before);
});
test('template replacement explicitly covers existing raw while insertion preserves its selected span',()=>{
  for(const raw of ['', '# 빈 틀\n- 상대 날짜: ', '한글\n😀\n끝']) assert.deepEqual(programCreatorReplacementRange(raw),{start:0,end:raw.length});
  const insertion={start:3,end:3},selection={start:1,end:5};
  assert.deepEqual(programCreatorReplacementRange('현재 원문',insertion),insertion);
  assert.deepEqual(programCreatorReplacementRange('현재 원문',selection),selection);
  assert.ok(source.includes('range: programCreatorReplacementRange(snapshot.rawText, range)'));
});
test('creator uses existing live editor, explicit templates/properties, result presenter and management',()=>{
  const p=existing(),html=renderToStaticMarkup(<ProgramCreatorWorkspace {...p}/>);
  for(const label of ['제작 원문','작성 틀·예시 선택','빈 틀 확인','예시 확인','항목 속성 편집','제작 초안 저장','원문 결과 확인','별도 초안 복제','이름 변경','보관'])assert.ok(html.includes(label),label);
  assert.ok(html.includes('가방 확인'));assert.ok(html.includes('지퍼 닫기'));
  assert.ok(source.includes('PersonalWorkspacePocLiveEditor'));assert.ok(source.includes('PersonalWorkspacePocResultPresenter'));
});
test('structure examples retain compiler/source gates and the new form describes its actual support',()=>{
  const html=renderToStaticMarkup(<ProgramCreatorWorkspace {...existing()}/>);
  assert.ok(html.includes('구조 템플릿 예시는 빈 제작 원문에서 시작합니다.'));
  assert.ok(html.includes('구조 템플릿으로 시작')); assert.ok(html.includes('작성 틀의 입력값은 원문과 별도로 보관'));
  assert.ok(html.includes('파일 첨부 업로드는 지원하지 않습니다.'));
  assert.ok(source.includes('showStructure(template.templateId)'));
  assert.ok(source.includes('planProgramCreatorStructure({ draftId: snapshot.documentId, expectedDraftId: structure.draftId'));
  assert.ok(source.includes('expectedSourceFingerprint: structure.sourceFingerprint'));
  assert.ok(source.includes('composing: snapshot.composing || composing.current'));
  assert.ok(source.includes('await nativeReplace(plan.nextRawText, undefined, replacement.templateId)'));
  assert.ok(!source.includes('raw: template.exampleSource'));
});
test('archived source stays selectable/read-only with restore, not silent overwrite',()=>{
  const p=existing(),actorId=p.data.activeActorId,workspace=p.data.spaces[actorId].creatorWorkspace!;
  const archived=applyProgramCreatorAction(p.data,{actorId,requestId:'archive',action:{type:'archive',draftId:'creator-ssr',expectedLibraryRevision:workspace.library.revision,expectedRecordRevision:1,now:NOW}},NOW);if(!archived.ok)throw Error(archived.reason);
  const html=renderToStaticMarkup(<ProgramCreatorWorkspace {...p} data={archived.data}/>);assert.ok(html.includes('복원한 뒤 편집'));assert.ok(html.includes('readOnly=""'));assert.ok(html.includes('>복원</button>'));
});
test('conflict comparison exposes source, previous handoff and personal raw without overwrite control',()=>{
  const html=renderToStaticMarkup(<ProgramCreatorHandoffComparison previous="이전 인계" personal="개인 변경" next="새 제작 결과" source="원래 제작 원문"/>);
  for(const text of ['이전 인계','개인 변경','새 제작 결과','원래 제작 원문','자동으로 덮어쓰지'])assert.ok(html.includes(text));assert.equal(html.includes('강제 적용'),false);
});
test('registered flush separates working recovery from saved revision and defers readOnly during composition',()=>{
  const p=existing(),actorId=p.data.activeActorId,w=p.data.spaces[actorId].creatorWorkspace!.working!;
  assert.equal(programCreatorNeedsSave(p.data,actorId,w),false);assert.equal(programCreatorNeedsSave(p.data,actorId,{...w,rawText:RAW+'\n개인 제작 입력'}),true);
  assert.ok(source.includes('history: false'));assert.ok(source.includes('blocksExternalSnapshot'));assert.ok(source.includes('captureDrafts'));
  assert.ok(source.includes('locked && !composing.current'));assert.ok(source.includes('composing.current || editor.current?.readSnapshot()?.composing'));
  assert.doesNotMatch(source,/localStorage\.(?:setItem|removeItem|clear)/u);assert.doesNotMatch(source,/savePersonalWorkspacePoc|commitPersonalWorkspacePocStorage/u);
});

test('mobile management actions wrap as whole labels and result cells retain readable widths inside their own scroller',()=>{
  const css=readFileSync(new URL('./ProgramCreatorWorkspace.module.css',import.meta.url),'utf8');
  assert.match(css,/\.actions>button\{flex:0 0 auto;white-space:nowrap\}/);
  assert.match(css,/\.manage \.actions>label\{flex:1 0 100%;width:100%\}/);
  assert.match(css,/\.actions>button\{flex:1 0 auto\}/);
  assert.match(css,/\[aria-label="Item 결과 표, 가로로 스크롤 가능"\]\{max-width:100%;overflow-x:auto\}/);
  assert.match(css,/table\{min-width:80rem\}/);
  assert.match(css,/td\{min-width:6rem;white-space:pre-wrap\}/);
  assert.match(css,/td button\{min-width:8rem;white-space:normal;word-break:normal\}/);
});

test('creator displays immutable handed-off source history and requires reviewed revision before an update',()=>{
  const p=existing(),actorId=p.data.activeActorId;
  const handed=handoffProgramCreatorDraft(p.data,{actorId,requestId:'handoff-ssr',draftId:'creator-ssr',expectedRecordRevision:1,today:'2026-09-12'},NOW);if(!handed.ok)throw Error(handed.reason);
  const before=JSON.stringify(handed.data),html=renderToStaticMarkup(<ProgramCreatorWorkspace {...p} data={handed.data}/>);
  assert.match(html,/개인 실행으로 인계한 원문 판본/);assert.match(html,/같은 개인 문서·이전 회차 기록 확인/);assert.match(html,/기기 시간대로 자동 변환하지 않습니다/);
  assert.equal(JSON.stringify(handed.data),before);
  assert.match(source,/comparison\?\.recordRevision !== record\.recordRevision/);assert.match(source,/comparison\.source !== record\.rawText/);
  assert.match(source,/비교한 원문을 같은 문서에 인계/);assert.match(source,/새 항목/);assert.match(source,/이전 판본으로 남길 항목/);
  assert.doesNotMatch(source,/반복 회차와 시간대 일정의 개인 실행 인계, 원문 날짜순/);
});
