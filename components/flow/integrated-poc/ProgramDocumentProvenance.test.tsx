import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createProgramData, validateProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { importProgramCreatorDraft } from '../../../lib/flow/integrated-poc/creator-draft-bridge';
import { fingerprintPersonalWorkspacePocAuthoringSource } from '../../../lib/flow/personal-workspace-poc-authoring';
import { createPersonalWorkspacePocCreatorDraftLibrary, transitionPersonalWorkspacePocCreatorDraftLibrary } from '../../../lib/flow/personal-workspace-poc-creator-drafts';
import { programClone } from '../../../lib/flow/integrated-poc/contract';
import { continueProgramCreatorDraft } from '../../../lib/flow/integrated-poc/creator-workspace';
import type * as ComponentModule from './ProgramDocumentProvenance';

const url = new URL('./ProgramDocumentProvenance.tsx', import.meta.url), source = readFileSync(url, 'utf8'), require = createRequire(url);
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
const loaded = { exports: {} as typeof ComponentModule };
vm.runInThisContext(`(function(module, exports, require) { ${compiled.outputText}\n})`)(loaded, loaded.exports, (id: string) => id.endsWith('.module.css')
  ? { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) } : require(id));
const { ProgramDocumentProvenance } = loaded.exports;
function fixture(previous = true) {
  let library = createPersonalWorkspacePocCreatorDraftLibrary('2026-09-12T00:00:00.000Z');
  for (const [index, rawText] of (previous ? ['# 이전 초안\n이전 개인 원문', '# 가져온 초안\n가져온 개인 원문'] : ['# 가져온 초안\n가져온 개인 원문']).entries()) {
    const result = transitionPersonalWorkspacePocCreatorDraftLibrary(library, { type: 'save', expectedLibraryRevision: library.revision,
      ...(library.records['creator-one'] ? { expectedRecordRevision: library.records['creator-one'].recordRevision } : {}), draftId: 'creator-one', rawText,
      sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(rawText), now: `2026-09-12T00:0${index + 1}:00.000Z` });
    assert.equal(result.code, 'saved'); library = result.library;
  }
  const data = createProgramData(), current = library.records['creator-one'];
  const result = importProgramCreatorDraft(data, library, { actorId: 'local-user', requestId: 'import', creatorDraftId: current.draftId,
    expectedLibraryRevision: library.revision, expectedRecordRevision: current.recordRevision, expectedSourceFingerprint: current.sourceFingerprint,
    expectedSpace: data.spaces['local-user'] }, '2026-09-12T00:03:00.000Z');
  assert(result.ok); assert(validateProgramData(result.data)); return result;
}

test('SSR shows captured current and actual one-Undo source, separates it from live synchronization', () => {
  const result = fixture(), before = JSON.stringify(result.data);
  const html = renderToStaticMarkup(<ProgramDocumentProvenance data={result.data} documentId={result.result} onOpenRevisions={() => {}} />);
  assert.match(html, /가져온 당시 원문/); assert.match(html, /가져온 개인 원문/); assert.match(html, /이전 개인 원문/);
  assert.match(html, /자동으로 동기화되지 않습니다/); assert.match(html, /직전 본문 복구 검토/);
  assert.doesNotMatch(html, /<details[^>]* open/); assert.equal(JSON.stringify(result.data), before);
});

test('SSR does not invent a previous revision, leak a different actor, or retain provenance after private Undo', () => {
  const result = fixture(false);
  assert.match(renderToStaticMarkup(<ProgramDocumentProvenance data={result.data} documentId={result.result} />), /별도로 보존된 직전 상태는 없습니다/);
  const switched = programClone(result.data); switched.activeActorId = 'participant-jihun';
  assert.equal(renderToStaticMarkup(<ProgramDocumentProvenance data={switched} documentId={result.result} />), '');
  const undone = programClone(result.data); undone.spaces['local-user'] = createProgramData().spaces['local-user'];
  assert.equal(renderToStaticMarkup(<ProgramDocumentProvenance data={undone} documentId={result.result} />), '');
  assert.doesNotMatch(source, /localStorage|fetch\(|setItem|window\.open/);
});

function linkedFixture() {
  const imported = fixture(false), source = imported.data.spaces['local-user'].creatorDraftImports![0].source;
  const library = createPersonalWorkspacePocCreatorDraftLibrary('2026-09-12T00:00:00.000Z');
  const saved = transitionPersonalWorkspacePocCreatorDraftLibrary(library, { type: 'save', expectedLibraryRevision: 0, draftId: 'creator-one', rawText: source.current.rawText,
    sourceFingerprint: source.current.sourceFingerprint, now: source.current.updatedAt });
  const continued = continueProgramCreatorDraft(imported.data, saved.library, { actorId: 'local-user', requestId: 'continue', creatorDraftId: 'creator-one', expectedLibraryRevision: saved.library.revision, expectedRecordRevision: 1 }, '2026-09-12T01:00:00.000Z');
  assert(continued.ok); assert(validateProgramData(continued.data)); return { data: continued.data, documentId: imported.result, draftId: continued.result };
}

test('SSR distinguishes Program handoff from preserved legacy source and exposes same-draft return without writes', () => {
  const { data, documentId, draftId } = linkedFixture(), before = JSON.stringify(data);
  const html = renderToStaticMarkup(<ProgramDocumentProvenance data={data} documentId={documentId} onOpenCreatorDraft={() => {}} />);
  assert.match(html, /제작 계속하기/); assert.match(html, /이 문서로 인계한 저장 판본 1/); assert.match(html, /현재 제작 초안의 저장 판본 1/);
  assert.match(html, /마지막으로 인계한 내용/); assert.match(html, /전체 판본 이력은 아닙니다/); assert.match(html, /가져온 당시 원문/);
  assert.match(html, new RegExp(draftId)); assert.match(html, /자동으로 공개되지 않습니다/); assert.equal(JSON.stringify(data), before);
  const panel = ProgramDocumentProvenance({ data, documentId, onOpenCreatorDraft: id => assert.equal(id, draftId) });
  let clicked = 0;
  function visit(node: React.ReactNode) {
    React.Children.forEach(node, child => { if (!React.isValidElement<{ children?: React.ReactNode; onClick?: () => void }>(child)) return;
      if (child.type === 'button' && child.props.children === '제작 계속하기') { child.props.onClick!(); clicked++; }
      visit(child.props.children);
    });
  }
  visit(panel); assert.equal(clicked, 1); assert.equal(JSON.stringify(data), before);
});

test('SSR archived, missing and ambiguous links guide recovery without replacement; disabled action stays disabled', () => {
  const { data, documentId, draftId } = linkedFixture(), workspace = data.spaces['local-user'].creatorWorkspace!;
  workspace.library = { ...workspace.library, records: { ...workspace.library.records, [draftId]: { ...workspace.library.records[draftId], status: 'archived' } } };
  let html = renderToStaticMarkup(<ProgramDocumentProvenance data={data} documentId={documentId} disabled onOpenCreatorDraft={() => {}} />);
  assert.match(html, /보관한 제작 초안 열기/); assert.match(html, /복원한 뒤/); assert.match(html, /<button[^>]*disabled/); assert.doesNotMatch(html, /제작 계속하기/);
  workspace.library = { ...workspace.library, records: {} };
  html = renderToStaticMarkup(<ProgramDocumentProvenance data={data} documentId={documentId} onOpenCreatorDraft={() => {}} />);
  assert.match(html, /현재 개인 보관함에서 찾을 수 없습니다/); assert.doesNotMatch(html, /제작 계속하기|보관한 제작 초안 열기/); assert.match(html, /마지막으로 인계한 내용/);
  workspace.handoffs.another = { ...workspace.handoffs[draftId] };
  html = renderToStaticMarkup(<ProgramDocumentProvenance data={data} documentId={documentId} onOpenCreatorDraft={() => {}} />);
  assert.match(html, /하나로 확인할 수 없습니다/); assert.doesNotMatch(html, /제작 계속하기/);
});

test('Space return passes through existing save-before-navigation gate using the same creator route', () => {
  const space = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
  assert.match(space, /onOpenCreatorDraft=\{draftId => void openDocumentAction\(\(\) => props\.navigate\(\{ view: 'creator', id: draftId \}\)\)\}/);
});
