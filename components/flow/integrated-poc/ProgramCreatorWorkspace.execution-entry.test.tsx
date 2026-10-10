import test from 'node:test';
import assert from 'node:assert/strict';
import './test-css-modules';
import React from 'react';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { createProgramData, validateProgramData } from '../../../lib/flow/integrated-poc/program-data';
import type { ProgramData } from '../../../lib/flow/integrated-poc/contract';
import { setProgramCreatorWorking, applyProgramCreatorAction } from '../../../lib/flow/integrated-poc/creator-workspace';
import { createTextAuthoringDocument } from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner } from '../../../lib/flow/integrated-poc/native-creator-document';
import { inspectProgramNativeCreatorHandoff, applyProgramNativeCreatorHandoff } from '../../../lib/flow/integrated-poc/creator-native-execution-adapter';
import { fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from '../../../lib/flow/personal-workspace-poc-authoring';
import { creatorNativeText } from '../../../lib/flow/integrated-poc/creator-source-order';
import { updateProgramTask, recordProgramTaskProgress } from '../../../lib/flow/integrated-poc/private-space';
import { programCreatorExecutionDocument, type ProgramCreatorWorkspaceProps } from './ProgramCreatorWorkspace';

const NOW = '2026-10-01T08:00:00.000Z', DRAFT = 'execution-entry-draft';
const RAW = '# 여행 준비\r\n- [x] 여권 확인\r\n  - 날짜: 2026-10-02\r\n  - [x] 만료일 확인';
function fixture(linked = true): ProgramData {
  let data = createProgramData();
  const actorId = data.activeActorId;
  const document = createTextAuthoringDocument(RAW, { documentId: 'entry-source-document', ownership: 'creator', now: NOW });
  const source = { storageKey: 'flow:text-authoring:drafts:v1' as const, draftId: 'entry-original-draft', versionId: 'entry-original-version',
    revisionId: document.revision.revisionId, documentJson: JSON.stringify(document) };
  const native = createNativeCreatorDocumentOwner({ id: DRAFT, source }, NOW); assert(native.ok);
  const working = { draftId: DRAFT, title: '여행 준비', rawText: RAW, baseRecordRevision: null, nativeDocument: native.owner, nativeSelection: source };
  const opened = setProgramCreatorWorking(data, { actorId, expectedWorking: null, working }, NOW); assert(opened.ok); data = opened.data;
  const saved = applyProgramCreatorAction(data, { actorId, requestId: 'entry-save', expectedStructure: null,
    expectedNativeDocument: native.owner, expectedNativeSelection: source, action: { type: 'save', draftId: DRAFT, title: working.title,
      rawText: RAW, sourceFingerprint: fingerprint(RAW), expectedLibraryRevision: data.spaces[actorId].creatorWorkspace!.library.revision, now: NOW } }, NOW);
  assert(saved.ok); data = saved.data;
  if (linked) {
    const review = inspectProgramNativeCreatorHandoff(data, { actorId, draftId: DRAFT }, NOW); assert(review.ok);
    const choices = Object.fromEntries(review.preview.rows.map(row => [row.itemId, { source: 'incoming' as const, date: 'keep' as const, time: 'keep' as const, children: 'keep' as const }]));
    const result = applyProgramNativeCreatorHandoff(data, { actorId, requestId: 'entry-handoff', preview: review.preview, choices }, NOW);
    assert(result.ok); data = result.data;
  }
  assert(validateProgramData(data)); return data;
}
const label = (value: any): string => Array.isArray(value) ? value.map(label).join('') : typeof value === 'string' || typeof value === 'number'
  ? String(value) : value?.props ? label(value.props.children) : '';
function harness(seed = fixture(), storageScope: 'local' | 'account' = 'account') {
  let data = seed, at = 0, mutations = 0, denyNavigation = false, editorNode: any, registered: any;
  const slots: any[] = [], destinations: any[] = [];
  let snapshot = { documentId: DRAFT, rawText: creatorNativeText(RAW), composing: false, dispatchCount: 0,
    editorId: 'execution-entry-editor', sourceFingerprint: fingerprint(creatorNativeText(RAW)), selectionStart: 0, selectionEnd: 0,
    selectionDirection: 'none' as const, scrollTop: 0, scrollLeft: 0 };
  const hooks = { ...React,
    useState: (initial: any) => { const index = at++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value: any) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef: (initial: any) => { const index = at++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useMemo: (build: any) => { at++; const value = build(); if (value?.flushAll && value?.captureDrafts) registered = value; return value; },
    useEffect: () => { at++; },
  };
  const url = new URL('./ProgramCreatorWorkspace.tsx', import.meta.url), require = createRequire(url), root = resolve(dirname(fileURLToPath(url)), '../../..');
  const loaded = { exports: {} as { ProgramCreatorWorkspace: (props: ProgramCreatorWorkspaceProps) => React.ReactNode } };
  const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInThisContext(`(function(module,exports,require){${compiled}\n})`)(loaded, loaded.exports,
    (id: string) => id === 'react' ? hooks : id.endsWith('.css') ? { __esModule: true, default: {} } : require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id));
  function render() {
    at = 0;
    const tree = loaded.exports.ProgramCreatorWorkspace({ data, today: '2026-10-01', storageScope,
      navigate: destination => { if (denyNavigation) throw Error('forbidden'); destinations.push(destination); },
      mutate: async () => { mutations++; return { ok: false, reason: 'forbidden' }; } });
    const nodes: any[] = [];
    function walk(value: any) { if (Array.isArray(value)) value.forEach(walk); else if (value?.props) { nodes.push(value); walk(value.props.children); } }
    walk(tree);
    editorNode = nodes.find(node => node.props.label === '제작 원문' && node.props.onNativeInput);
    editorNode.props.ref.current = { readSnapshot: () => ({ ...snapshot }) };
    return { nodes, native: nodes.find(node => node.props.onOperation && node.props.owner),
      source: nodes.find(node => node.type?.name === 'ProgramCreatorSourceUpdate'),
      handoff: nodes.find(node => node.type?.name === 'ProgramCreatorNativeHandoff'),
      button: (text: string) => nodes.find(node => node.type === 'button' && label(node.props.children) === text) };
  }
  return { render, destinations, get data() { return data; }, get mutations() { return mutations; }, get port() { return registered; },
    replace(next: ProgramData) { data = next; render(); }, deny(value: boolean) { denyNavigation = value; }, compose(value: boolean) { snapshot.composing = value; },
    input(rawText: string) { snapshot = { ...snapshot, rawText, sourceFingerprint: fingerprint(rawText), dispatchCount: snapshot.dispatchCount + 1 }; editorNode.props.onNativeInput(snapshot, 'insertText'); } };
}

test('CE01 exact native document lookup is read-only and survives JSON reload', () => {
  const data = fixture(), before = JSON.stringify(data), actor = data.activeActorId;
  const documentId = data.spaces[actor].creatorWorkspace!.nativeExecutionSources![DRAFT].documentId;
  assert.equal(programCreatorExecutionDocument(data, actor, DRAFT), documentId);
  assert.equal(programCreatorExecutionDocument(JSON.parse(before), actor, DRAFT), documentId);
  assert.equal(JSON.stringify(data), before);
  assert.equal(programCreatorExecutionDocument(fixture(false), actor, DRAFT), null);
});

test('CE02 absent, foreign, stale, archived and tampered native bindings cannot become a document entry', () => {
  for (const change of ['actor', 'missing-owner', 'missing-document', 'foreign-draft', 'handoff-document', 'handoff-revision', 'source-document', 'revision', 'archive', 'draft-archive'] as const) {
    const data = fixture(), actor = data.activeActorId, space = data.spaces[actor], workspace = space.creatorWorkspace!, owner = workspace.nativeExecutionSources![DRAFT];
    if (change === 'actor') data.activeActorId = data.actors.find(row => row.id !== actor)!.id;
    if (change === 'missing-owner') delete workspace.nativeExecutionSources![DRAFT];
    if (change === 'missing-document') space.text.documents = [];
    if (change === 'foreign-draft') owner.draftId = 'foreign-draft';
    if (change === 'handoff-document') workspace.handoffs[DRAFT].documentId = 'unrelated-document';
    if (change === 'handoff-revision') workspace.handoffs[DRAFT].recordRevision++;
    if (change === 'source-document') workspace.structureDrafts![DRAFT].nativeDocument!.document.documentId = 'foreign-source-document';
    if (change === 'revision') owner.currentRevisionId = 'missing-revision';
    if (change === 'archive') space.archivedDocumentIds.push(owner.documentId);
    if (change === 'draft-archive') workspace.library = { ...workspace.library,
      records: { ...workspace.library.records, [DRAFT]: { ...workspace.library.records[DRAFT], status: 'archived' } } };
    const before = JSON.stringify(data);
    assert.equal(programCreatorExecutionDocument(data, actor, DRAFT), null, change); assert.equal(JSON.stringify(data), before, change);
  }
});

test('CE03 local and account creator result open the same personal document without any mutation or writer', () => {
  for (const scope of ['local', 'account'] as const) {
    const h = harness(fixture(), scope), before = JSON.stringify(h.data), actor = h.data.activeActorId;
    const documentId = h.data.spaces[actor].creatorWorkspace!.nativeExecutionSources![DRAFT].documentId;
    h.render().button('결과').props.onClick(); const view = h.render(), button = view.button('개인 문서 열기');
    assert(button); assert.equal(button.props.disabled, false); button.props.onClick();
    assert.deepEqual(h.destinations, [{ view: 'space', id: documentId }]); assert.equal(h.mutations, 0); assert.equal(JSON.stringify(h.data), before);
    assert(h.render().button('제작 설정을 개인 실행과 비교'));
  }
});

test('CE04 pending raw, title, native/source input, comparison, composition and input lock are preserved instead of auto-saving', () => {
  for (const guard of ['raw', 'title', 'native', 'source', 'comparison', 'composition', 'lock'] as const) {
    const h = harness(), initial = h.render(), open = initial.button('개인 문서 열기').props.onClick, before = JSON.stringify(h.data);
    if (guard === 'raw') h.input('미적용 새 원문');
    if (guard === 'title') initial.nodes.find(node => node.type === 'input' && node.props.maxLength === 200).props.onChange({ target: { value: '미저장 제목' } });
    if (guard === 'native') initial.native.props.onRegisterEditors({ hasPendingInput: () => true, flushAll: async () => { throw Error('unexpected flush'); } });
    if (guard === 'source') initial.source.props.onRegisterEditors({ hasPendingInput: () => true, flushAll: async () => { throw Error('unexpected flush'); } });
    if (guard === 'comparison') initial.button('제작 설정을 개인 실행과 비교').props.onClick();
    if (guard === 'composition') h.compose(true);
    const release = guard === 'lock' ? h.port.lockInput() : () => {};
    h.render(); const captured = h.port.captureDrafts(); open();
    assert.deepEqual(h.destinations, [], guard); assert.equal(h.mutations, 0, guard); assert.equal(JSON.stringify(h.data), before, guard);
    assert.deepEqual(h.port.captureDrafts(), captured, guard); release();
  }
});

test('CE05 stale mounted click cannot open an absent target or a different actor snapshot', () => {
  for (const change of ['missing', 'actor', 'working'] as const) {
    const h = harness(), oldClick = h.render().button('개인 문서 열기').props.onClick, next = structuredClone(h.data), actor = next.activeActorId;
    if (change === 'missing') next.spaces[actor].text.documents = [];
    if (change === 'actor') next.activeActorId = next.actors.find(row => row.id !== actor)!.id;
    if (change === 'working') next.spaces[actor].creatorWorkspace!.working!.title = '다른 탭에서 바뀐 제작 제목';
    h.replace(next); const before = JSON.stringify(h.data); oldClick();
    assert.deepEqual(h.destinations, [], change); assert.equal(h.mutations, 0, change); assert.equal(JSON.stringify(h.data), before, change);
  }
});

test('CE06 explicit comparison cancellation restores the read-only document entry', () => {
  const h = harness(), before = JSON.stringify(h.data);
  h.render().button('제작 설정을 개인 실행과 비교').props.onClick();
  const review = h.render(); assert.equal(review.button('개인 문서 열기').props.disabled, true);
  review.handoff.props.onCancel(); const restored = h.render(); assert.equal(restored.button('개인 문서 열기').props.disabled, false);
  restored.button('개인 문서 열기').props.onClick(); assert.equal(h.destinations.length, 1); assert.equal(h.mutations, 0); assert.equal(JSON.stringify(h.data), before);
});

test('CE07 navigation rejection leaves all source and private owners intact and can be retried', () => {
  const h = harness(), before = JSON.stringify(h.data); h.deny(true); h.render().button('개인 문서 열기').props.onClick();
  assert.deepEqual(h.destinations, []); assert.equal(h.mutations, 0); assert.equal(JSON.stringify(h.data), before);
  assert(h.render().nodes.some(node => node.props.role === 'alert' && label(node.props.children).includes('개인 문서를 열지 못했습니다')));
  h.deny(false); h.render().button('개인 문서 열기').props.onClick(); assert.equal(h.destinations.length, 1); assert.equal(h.mutations, 0);
});

test('CE08 continuing an edited personal execution never requires reaccepting creator dates, notes or progress', () => {
  let data = fixture(); const actorId = data.activeActorId, source = data.spaces[actorId].creatorWorkspace!.nativeExecutionSources![DRAFT];
  const taskId = source.revisions[0].rows[0].lineId;
  const edited = updateProgramTask(data, { actorId, requestId: 'entry-private-edit', expectedSpace: data.spaces[actorId], taskId,
    patch: { date: '2026-10-05', note: '개인 확인 메모' } }); assert(edited.ok); data = edited.data;
  const recorded = recordProgramTaskProgress(data, { actorId, requestId: 'entry-private-record', expectedSpace: data.spaces[actorId],
    taskId, date: '2026-10-01', percent: 50 }); assert(recorded.ok); data = recorded.data;
  const h = harness(data), before = JSON.stringify(h.data);
  h.render().button('개인 문서 열기').props.onClick();
  assert.deepEqual(h.destinations, [{ view: 'space', id: source.documentId }]); assert.equal(h.mutations, 0); assert.equal(JSON.stringify(h.data), before);
});
