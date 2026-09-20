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
import { saveProgramDocumentRevision } from '../../../lib/flow/integrated-poc/document-revisions';
import type { ProgramRevisionHistory as Component } from './ProgramRevisionHistory';

const componentUrl = new URL('./ProgramRevisionHistory.tsx', import.meta.url), source = readFileSync(componentUrl, 'utf8');
const require = createRequire(componentUrl), root = resolve(dirname(fileURLToPath(componentUrl)), '../../..');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
const loaded = { exports: {} as { ProgramRevisionHistory: typeof Component } };
vm.runInThisContext(`(function(module, exports, require) { ${compiled.outputText}\n})`, { filename: 'ProgramRevisionHistory.compiled.cjs' })(loaded, loaded.exports, (id: string) => {
  if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) };
  return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
});
const { ProgramRevisionHistory } = loaded.exports;
function fixture() {
  const data = createProgramData(), actorId = data.activeActorId;
  data.spaces[actorId].text = M.addDocument(data.spaces[actorId].text, { title: '내 문서' });
  const documentId = data.spaces[actorId].text.documents[0].id;
  data.spaces[actorId].text = M.editText(data.spaces[actorId].text, documentId, '- [ ] 원래 할 일\n  - 날짜: 2026-09-12');
  return { data, actorId, documentId };
}
test('empty modal offers explicit checkpoints without inventing previous saved revisions', () => {
  const { data, documentId } = fixture(); let writes = 0;
  const html = renderToStaticMarkup(<ProgramRevisionHistory data={data} documentId={documentId} mutate={async () => { writes++; return { ok: false, reason: 'invalid' }; }} onClose={() => {}} today="2026-09-12" />);
  assert.match(html, /<dialog/); assert.match(html, /aria-labelledby="program-revision-heading"/);
  assert.match(html, /직접 저장한 판본이 아직 없습니다/); assert.match(html, /현재 문서의 판본 저장/);
  assert.match(html, /아직 저장하지 못한 편집 입력은 포함하지 않습니다/); assert.equal(writes, 0);
});
test('native checkpoint renders its saved raw and ID-backed label without an editable raw field', () => {
  const { data, actorId, documentId } = fixture();
  const saved = saveProgramDocumentRevision(data, { actorId, requestId: 'save-ui', expectedSpace: data.spaces[actorId], documentId }, '2026-09-12T12:00:00.000Z'); assert(saved.ok);
  const html = renderToStaticMarkup(<ProgramRevisionHistory data={saved.data} documentId={documentId} mutate={async () => ({ ok: false, reason: 'invalid' })} onClose={() => {}} today="2026-09-12" />);
  assert.match(html, /행 ID 있음/); assert.match(html, /원래 할 일/); assert.match(html, /복구 전 비교/);
  assert.doesNotMatch(html, /<textarea|contenteditable/);
});
test('raw-only legacy checkpoint is labeled honestly and never presents fabricated earlier revisions', () => {
  const { data, actorId, documentId } = fixture();
  data.spaces[actorId].draftRevisions.push({ id: 'raw-old', documentId, title: '과거', raw: '과거 본문', createdAt: '2026-09-12T12:00:00.000Z' });
  const html = renderToStaticMarkup(<ProgramRevisionHistory data={data} documentId={documentId} mutate={async () => ({ ok: false, reason: 'invalid' })} onClose={() => {}} today="2026-09-12" />);
  assert.match(html, /본문만 있음/); assert.match(html, /과거 본문/); assert.equal((html.match(/<option /g) ?? []).length, 2);
});
test('review captures its baseline, explains restored dates and preserves the comparison after a failed save', () => {
  assert.match(source, /setReview\(\{ preview: result.result, expectedSpace: space \}\)/);
  assert.match(source, /expectedSpace: review.expectedSpace/);
  assert.match(source, /제목·본문·실행 날짜·메모를 선택한 판본으로 되돌립니다/);
  assert.match(source, /현재 누적 진행과 날짜별 진행 기록은 되돌리지 않습니다/);
  assert.match(source, /if \(result\) \{ setReview\(null\)/);
  assert.match(source, /restoreProgramRawRevisionAsDocument\(current, input\)/);
  assert.match(source, /showModal\(\)/); assert.match(source, /previous\?\.focus\(\)/);
});
