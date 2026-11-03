import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import type * as Space from './ProgramSpace';
import type * as Legacy from './ProgramLegacyWorkspace';

// Render the actual parent surfaces; children expose their received capabilities.
// This checks route availability, not browser interaction or persistence.
function load<T>(name: string): T {
  const url = new URL(name, import.meta.url), require = createRequire(url);
  const root = resolve(dirname(fileURLToPath(url)), '../../..'), module = { exports: {} as T };
  const code = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  vm.runInThisContext(`(function(module,exports,require){${code}\n})`)(module, module.exports, (id: string) => {
    if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (id.startsWith('./Program')) return new Proxy({}, { get: (_, component) => (props: { onOpenRevisions?: unknown; onOpenCreatorDraft?: unknown }) =>
      <span data-component={String(component)}>{!!props.onOpenRevisions && 'revision-route'}{!!props.onOpenCreatorDraft && 'creator-route'}</span> });
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  });
  return module.exports;
}
const { ProgramSpace } = load<typeof Space>('./ProgramSpace.tsx');
const { ProgramLegacyWorkspace } = load<typeof Legacy>('./ProgramLegacyWorkspace.tsx');
const restricted: Space.ProgramSpaceCapabilities = {
  discovery: false, publication: false, copyInspection: false, revisionHistory: false, creatorNavigation: false,
};
const unavailable = () => { throw Error('render must not navigate or write'); };
function props(selected = false): Space.ProgramSpaceProps {
  const data = createProgramData(), space = data.spaces[data.activeActorId];
  if (selected) {
    space.text = M.addDocument(space.text, { title: '개인 문서' });
    space.position.documentId = space.text.documents[0].id;
    space.text = M.editText(space.text, space.position.documentId, '- [ ] 내 할 일');
    space.copies = [{ id: 'private-copy', documentId: space.position.documentId, flowId: 'source-flow', baseVersionId: 'source-version',
      itemLines: {}, subcheckLines: {}, includedItemIds: [], inheritedDates: {}, itemOverrides: {}, appliedFields: {}, anchor: null }];
    space.savedBindings = [{ documentId: space.position.documentId, flowRef: 'private-flow', itemLines: {} } as typeof space.savedBindings[number]];
  }
  return { data, mutate: unavailable, navigate: unavailable, today: '2026-09-21', onUndo: unavailable, onRedo: unavailable,
    onPublishDocument: unavailable, onInspectCopy: unavailable, onRevisionHistory: unavailable, onOutputDocument: unavailable };
}

test('alpha empty space keeps creation and all private period views without discovery', () => {
  const base = props(), before = JSON.stringify(base.data);
  const local = renderToStaticMarkup(<ProgramSpace {...base} />);
  const alpha = renderToStaticMarkup(<ProgramSpace {...base} capabilities={restricted} />);
  assert.match(local, /다른 사람의 Flow 둘러보기/);
  assert.doesNotMatch(alpha, /다른 사람의 Flow 둘러보기/);
  for (const label of ['새 문서', '문서 만들기', '오늘', '주간', '월간', '전체 할 일', '날짜 미정', '빠른 할 일']) assert.ok(alpha.includes(label), label);
  assert.equal(JSON.stringify(base.data), before);
});

test('alpha document hides unavailable routes while preserving personal plan, recurrence, editor and output', () => {
  const base = props(true), before = JSON.stringify(base.data);
  const local = renderToStaticMarkup(<ProgramSpace {...base} />);
  const alpha = renderToStaticMarkup(<ProgramSpace {...base} capabilities={restricted} />);
  for (const label of ['선택해서 공개', '저장판본·복구', '내 계획·원본 변경 확인', 'revision-route', 'creator-route']) {
    assert.ok(local.includes(label), label); assert.ok(!alpha.includes(label), label);
  }
  for (const label of ['내 도구로 가져가기', '원본·개인 계획 확인', 'ProgramTextEditor', 'ProgramRecurrence', 'ProgramDocumentProvenance']) assert.ok(alpha.includes(label), label);
  assert.equal(JSON.stringify(base.data), before);
});

test('missing optional callbacks produce no inert action buttons', () => {
  const base = props(true);
  const html = renderToStaticMarkup(<ProgramSpace {...base} onPublishDocument={undefined} onInspectCopy={undefined} onRevisionHistory={undefined} />);
  assert.doesNotMatch(html, /선택해서 공개|저장판본·복구|내 계획·원본 변경 확인|revision-route/);
  assert.match(html, /creator-route/);
});

test('legacy alpha surface suppresses source replacement while retaining the existing private workspace', () => {
  const { capabilities: omitted, ...base } = props(); void omitted;
  const local = renderToStaticMarkup(<ProgramLegacyWorkspace {...base} />);
  const alpha = renderToStaticMarkup(<ProgramLegacyWorkspace {...base} capabilities={{ sourceReview: false }} />);
  assert.match(local, /ProgramLegacySourceReview/); assert.doesNotMatch(alpha, /ProgramLegacySourceReview/);
  for (const label of ['기존 계획', '내 공간으로', '되돌리기', '계획 찾기']) assert.ok(alpha.includes(label), label);
});
