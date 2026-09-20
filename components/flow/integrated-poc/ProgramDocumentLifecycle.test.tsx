import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type * as MoveModule from './ProgramTaskDocumentMove';
import type * as TrashModule from './ProgramDocumentTrash';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { createProgramDocument } from '../../../lib/flow/integrated-poc/private-space';
import { setProgramDocumentTrashed } from '../../../lib/flow/integrated-poc/document-lifecycle';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
function load<T>(name: string): T {
  const url = new URL(name, import.meta.url), require = createRequire(url), module = { exports: {} as T };
  const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(module, module.exports, (id: string) => id.endsWith('.css') ? { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) } : require(id));
  return module.exports;
}
const { ProgramTaskDocumentMove } = load<typeof MoveModule>('./ProgramTaskDocumentMove.tsx');
const { ProgramDocumentTrash, ProgramDocumentTrashAction } = load<typeof TrashModule>('./ProgramDocumentTrash.tsx');
function fixture() {
  const initial = createProgramData(), actorId = initial.activeActorId;
  const result = createProgramDocument(initial, { actorId, requestId: 'ui-document', expectedSpace: initial.spaces[actorId], title: '내 문서', raw: '- [ ] 개인 할 일' });
  assert(result.ok); return { data: result.data, documentId: result.result, taskId: M.tasks(result.data.spaces[actorId].text)[0].id };
}
test('task transfer presents explicit selection/commit/cancel and never writes on render', () => {
  const { data, taskId } = fixture(); let writes = 0;
  const html = renderToStaticMarkup(<ProgramTaskDocumentMove data={data} taskId={taskId} onMove={async () => { writes++; return { ok: true, result: taskId }; }} onOpen={() => {}} />);
  assert.match(html, /할 일의 원문을 다른 문서로 이동/); assert.match(html, /참조 추가와 다릅니다/);
  assert.match(html, /<select/); assert.match(html, /이동 취소/); assert.match(html, /<button type="submit" disabled/); assert.equal(writes, 0);
});
test('trash is empty without a fake sample and shows a stable document recovery route after deletion', () => {
  const { data, documentId } = fixture(), actorId = data.activeActorId;
  const initial = renderToStaticMarkup(<ProgramDocumentTrash space={data.spaces[actorId]} onOpen={() => {}} />); assert.match(initial, /휴지통이 비어 있습니다/);
  const removed = setProgramDocumentTrashed(data, { actorId, requestId: 'ui-trash', expectedSpace: data.spaces[actorId], documentId, trashed: true, now: '2026-09-12T12:00:00.000Z' }); assert(removed.ok);
  const html = renderToStaticMarkup(<ProgramDocumentTrash space={removed.data.spaces[actorId]} onOpen={() => {}} />); assert.match(html, /내 문서/); assert.match(html, /내용 확인·복원/);
  const action = renderToStaticMarkup(<ProgramDocumentTrashAction space={removed.data.spaces[actorId]} documentId={documentId} disabled onChange={async () => { throw Error('render must not write'); }} />);
  assert.match(action, /휴지통에서 복원/); assert.match(action, /<button disabled/); assert.doesNotMatch(action, /영구 삭제/);
});
test('active document delete is a confirmation entry, not an immediate irreversible action', () => {
  const { data, documentId } = fixture();
  const html = renderToStaticMarkup(<ProgramDocumentTrashAction space={data.spaces[data.activeActorId]} documentId={documentId} onChange={async () => { throw Error('render must not write'); }} />);
  assert.match(html, /문서 삭제…/); assert.doesNotMatch(html, /휴지통으로 이동|영구 삭제/);
});
test('lifecycle controls retain focus indication, minimum target height and small-screen wrapping', () => {
  const css = readFileSync(new URL('./ProgramDocumentLifecycle.module.css', import.meta.url), 'utf8');
  assert.match(css, /min-height:44px/); assert.match(css, /focus-visible/); assert.match(css, /minmax\(0,1fr\)/); assert.match(css, /overflow-wrap:anywhere/);
});
