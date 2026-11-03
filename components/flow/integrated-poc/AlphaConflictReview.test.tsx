import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { ALPHA_COMMAND_SCHEMA, ALPHA_SCHEMA, type AlphaAccount, type AlphaCommand } from '../../../lib/flow/integrated-poc/alpha-persistence/contract';
import { PROGRAM_SCHEMA } from '../../../lib/flow/integrated-poc/contract';
import { createProgramPrivateSpace } from '../../../lib/flow/integrated-poc/program-data';
import { textWorkspaceModel as M, type TextWorkspaceState } from '../../../lib/flow/integrated-poc/text-workspace';
import type * as Component from './AlphaConflictReview';

const url = new URL('./AlphaConflictReview.tsx', import.meta.url), require = createRequire(url), root = resolve(dirname(fileURLToPath(url)), '../../..');
const source = readFileSync(url, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const loaded = { exports: {} as typeof Component };
vm.runInThisContext(`(function(module,exports,require){${compiled}\n})`)(loaded, loaded.exports, (id: string) => id.endsWith('.css')
  ? { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) } : require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id));
const { AlphaConflictReview, inspectAlphaConflict } = loaded.exports;
function fixture() {
  const space = createProgramPrivateSpace();
  space.text = M.addDocument(space.text, { title: '첫 문서' }); const first = space.text.documents.at(-1)!.id;
  space.text = M.editText(space.text, first, '- [ ] 서버의 일정\n  - 메모: 한글 😀');
  space.text = M.addDocument(space.text, { title: '둘째 문서' }); const second = space.text.documents.at(-1)!.id;
  space.text = M.editText(space.text, second, '그대로인 문서');
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: 'owner', revision: 4, source: { schema: PROGRAM_SCHEMA, actorId: 'owner', revision: 0 }, space, legacyUndo: [], legacyReceipts: [] };
  return { account, first, second };
}
const command = (text: TextWorkspaceState): AlphaCommand => ({ schema: ALPHA_COMMAND_SCHEMA, requestId: 'internal-request-secret', expectedRevision: 2,
  kind: 'change-private', changes: [{ field: 'text', present: true, value: text }] });
const render = (draft: AlphaCommand, account: AlphaAccount | null, onCopy?: (raw: string) => void) => renderToStaticMarkup(<AlphaConflictReview draft={draft} account={account} onCopy={onCopy} />);

test('changed text compares the exact document ID and omits an unchanged document', () => {
  const { account, first } = fixture();
  const text = M.editText(account.space.text, first, '- [ ] 저장하려던 일정\n끝의 공백  ');
  const draft = command(text), before = JSON.stringify({ draft, account }), result = inspectAlphaConflict(draft, account);
  assert.equal(result.kind, 'change'); assert.equal(result.documents.length, 1); assert.equal(result.documents[0].id, first);
  assert.equal(result.documents[0].server!.raw, M.raw(account.space.text.documents[0]));
  assert.equal(result.documents[0].mine!.raw, '- [ ] 저장하려던 일정\n끝의 공백  ');
  const html = render(draft, account);
  assert.match(html, /서버 현재 원문/); assert.match(html, /저장하려던 원문/); assert.doesNotMatch(html, /둘째 문서/);
  assert.equal((html.match(/<textarea/g) ?? []).length, 2); assert.equal((html.match(/readOnly=""/g) ?? []).length, 2);
  assert.equal(JSON.stringify({ draft, account }), before);
});

test('same titles and reversed document order never pair unrelated documents', () => {
  const { account, first, second } = fixture();
  for (const doc of account.space.text.documents) doc.title = '같은 제목';
  const text = M.editText(account.space.text, second, '둘째 문서에서 작성한 원문'); text.documents.reverse();
  const result = inspectAlphaConflict(command(text), account);
  assert.equal(result.documents.length, 1); assert.equal(result.documents[0].id, second); assert.notEqual(result.documents[0].id, first);
  assert.equal(result.documents[0].server!.raw, '그대로인 문서');
});

test('rename, addition and removal are shown without substituting another document', () => {
  const { account, first, second } = fixture(); let text = structuredClone(account.space.text);
  text.documents.find(doc => doc.id === first)!.title = '바꾼 제목'; text.documents = text.documents.filter(doc => doc.id !== second);
  text = M.addDocument(text, { title: '새 문서' });
  const draft = command(text), result = inspectAlphaConflict(draft, account), html = render(draft, account);
  assert.equal(result.documents.length, 3); assert.match(html, /첫 문서/); assert.match(html, /바꾼 제목/);
  assert.match(html, /추가 차이/); assert.match(html, /삭제 차이/); assert.match(html, /새 문서/);
});

test('unavailable server data shows intended text without claiming additions, removals or metadata differences', () => {
  const { account } = fixture(), draft = command(account.space.text);
  const result = inspectAlphaConflict(draft, null), html = render(draft, null);
  assert.equal(result.serverAvailable, false); assert.equal(result.documents.length, 2); assert.deepEqual(result.summaries, []);
  assert.match(html, /서버의 현재 내용을 아직 확인하지 못했습니다/); assert.doesNotMatch(html, /추가 차이|삭제 차이/);
});

test('non-text fields use concise user terms with no transport details or raw values', () => {
  const { account } = fixture();
  const draft: AlphaCommand = { schema: ALPHA_COMMAND_SCHEMA, requestId: 'internal-request-secret', expectedRevision: 2, kind: 'change-private', changes: [
    { field: 'timelineOrders', present: true, value: { internal: ['hidden-value'] } },
    { field: 'executionTimelineOrders', present: true, value: {} }, { field: 'recurrencePlans', present: false },
    { field: 'recurrenceExecution', present: true, value: {} }, { field: 'legacySnapshot', present: true, value: { raw: 'do not render JSON' } },
  ] };
  const result = inspectAlphaConflict(draft, account), html = render(draft, account);
  assert.deepEqual(result.summaries, ['같은 날짜의 항목 순서', '반복 일정', '반복 회차의 완료·진행 기록', '저장한 계획의 상세 내용']);
  assert.doesNotMatch(html, /requestId|expectedRevision|schema|change-private|internal-request-secret|hidden-value|timelineOrders|recurrencePlans|do not render JSON|textarea/);
});

test('folders and progress-only text changes remain visible without repeating identical raw text', () => {
  const { account, first } = fixture(), text = structuredClone(account.space.text);
  const taskId = M.tasks(text).find(task => task.docId === first)!.id;
  text.folders.push({ id: 'folder-extra', title: '새 폴더', parentId: null }); text.progressRecords.push({ taskId, date: '2026-09-21', percent: 50 });
  const result = inspectAlphaConflict(command(text), account);
  assert.equal(result.documents.length, 0); assert(result.summaries.includes('폴더와 문서 위치')); assert(result.summaries.includes('날짜별 진행 기록'));
});

test('undo conflict preserves subsequent changes and offers no write or copy action', () => {
  const draft: AlphaCommand = { schema: ALPHA_COMMAND_SCHEMA, requestId: 'undo-request', expectedRevision: 2, kind: 'undo-private', operationId: 'original-operation' };
  const html = render(draft, fixture().account, () => assert.fail('must not invoke'));
  assert.match(html, /그 내용을 지우지 않도록 되돌리기를 멈췄습니다/); assert.doesNotMatch(html, /button|textarea|undo-request|original-operation/);
});

test('unsafe drafts fail closed, render no payload and never invoke getters', () => {
  const { account } = fixture(); let called = 0;
  const getter = { get schema() { called++; throw Error('unsafe getter'); } };
  for (const draft of [null, {}, getter, { ...command(account.space.text), changes: [{ field: 'text', present: true, value: { documents: 'bad' } }] },
    { ...command(account.space.text), changes: [{ field: 'text', present: false }] }]) {
    const html = render(draft as AlphaCommand, account);
    assert.match(html, /안전하게 비교하지 못했습니다/); assert.doesNotMatch(html, /textarea|button/);
  }
  assert.equal(called, 0);
});

test('raw HTML stays escaped and the optional copy callback receives only the exact raw text', async () => {
  const { account, first } = fixture(), raw = '</textarea><script>alert("x")</script>\n개인 원문 😀';
  const draft = command(M.editText(account.space.text, first, raw)), copies: string[] = [];
  const html = render(draft, account, value => copies.push(value)); assert.doesNotMatch(html, /<script>/); assert.match(html, /&lt;script&gt;/);
  assert.match(html, /내 원문 복사/); assert.doesNotMatch(render(draft, account), /<button/); assert.equal(copies.length, 0);
  const tree = AlphaConflictReview({ draft, account, onCopy: value => { copies.push(value); } });
  const walk = (node: React.ReactNode): React.ReactElement<{ onClick?: () => void }>[] => {
    if (!React.isValidElement<{ children?: React.ReactNode; onClick?: () => void }>(node)) return Array.isArray(node) ? node.flatMap(walk) : [];
    return [...(node.type === 'button' ? [node] : []), ...React.Children.toArray(node.props.children).flatMap(walk)];
  };
  const buttons = walk(tree); assert.equal(buttons.length, 1); buttons[0].props.onClick!();
  assert.deepEqual(copies, [raw]);
});

test('responsive comparison preserves two desktop columns, one mobile column and 48px copy targets', () => {
  const css = readFileSync(new URL('./AlphaConflictReview.module.css', import.meta.url), 'utf8');
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\).*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /min-height:48px/); assert.match(css, /focus-visible/); assert.match(css, /overflow-wrap:anywhere/);
});
