import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { buildProgramCatalog } from '../../../lib/flow/integrated-poc/catalog';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { importProgramPublicVersion } from '../../../lib/flow/integrated-poc/private-space';
import type * as Discovery from './ProgramDiscovery';

const url = new URL('./ProgramDiscovery.tsx', import.meta.url), require = createRequire(url);
const root = resolve(dirname(fileURLToPath(url)), '../../..'), source = readFileSync(url, 'utf8');
const loaded = { exports: {} as typeof Discovery };
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;
vm.runInThisContext(`(function(module,exports,require){${compiled}\n})`)(loaded, loaded.exports, (id: string) => {
  if (id.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
  return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
});
const { ProgramDiscovery, createProgramDiscoveryNavigationState } = loaded.exports;
function fixture(catalog = false) {
  const data = createProgramData();
  for (const actorId of [data.activeActorId, 'participant-jihun']) {
    const space = data.spaces[actorId];
    space.text = M.addDocument(space.text, { title: `${actorId}-private-title` });
    space.text = M.editText(space.text, space.text.documents[0].id, `${actorId}-private-body`);
  }
  if (catalog) { const built = buildProgramCatalog(data.activeActorId); data.public.flows = built.flows; data.public.versions = built.versions; }
  const reject = () => { assert.fail('public browsing must not invoke a writer'); };
  const props: Discovery.ProgramDiscoveryProps = { data, mutate: reject, navigate: reject, onUseVersion: reject, onStartText: reject, today: '2026-10-03' };
  return props;
}
function assertPrivateHidden(html: string) { assert.doesNotMatch(html, /local-user-private|participant-jihun-private/); }

test('F01 empty public account catalog points back to private documents without probing or exposing either actor data', () => {
  const input = fixture(), before = JSON.stringify(input.data);
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} storageScope="account" />);
  assert.match(html, /아직 공개된 Flow가 없어요/); assert.match(html, /내 문서 보기/);
  assert.match(html, /개인 사본·실행 기록·비공개 제작 초안은 포함되지 않습니다/);
  assert.doesNotMatch(html, /검색 조건 지우기/); assertPrivateHidden(html);
  assert.equal(JSON.stringify(input.data), before);
  const local = renderToStaticMarkup(<ProgramDiscovery {...input} />);
  assert.match(local, /기존 내 Flow/); assert.doesNotMatch(local, /내 문서 보기/); assertPrivateHidden(local);
});

test('F02 no search results and ordinary public results retain their distinct recovery and private-document return', () => {
  const input = fixture(true), state = createProgramDiscoveryNavigationState(), before = JSON.stringify(input.data);
  state.query = '절대없는검색어';
  const noResults = renderToStaticMarkup(<ProgramDiscovery {...input} navigationState={state} storageScope="account" />);
  assert.match(noResults, /맞는 자료가 없습니다/); assert.match(noResults, /검색 조건 지우기/); assert.match(noResults, /내 문서 보기/);
  assert.doesNotMatch(noResults, /아직 공개된 Flow가 없어요/); assertPrivateHidden(noResults);
  state.query = '';
  const results = renderToStaticMarkup(<ProgramDiscovery {...input} navigationState={state} storageScope="account" />);
  assert.match(results, /이사 D-30 준비 Flow/); assert.match(results, /내 문서 보기/); assertPrivateHidden(results);
  assert.equal(JSON.stringify(input.data), before);
  const version = input.data.public.versions[0];
  const detail = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} storageScope="account" />);
  assert.doesNotMatch(detail, /내 문서 보기/); assert.match(detail, /내 계획으로 시작/);
  assert.match(detail, /내용 살펴보기/); assert.doesNotMatch(detail, /전체 항목으로 시작|내 문서에 가져오기/);
});

test('F03 the actual private-document return callback delegates only the existing current-actor space navigation', () => {
  const ast = ts.createSourceFile('ProgramDiscovery.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let button: ts.JsxElement | undefined;
  const visit = (node: ts.Node) => { if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'button'
    && node.children.some(child => ts.isJsxText(child) && child.getText(ast).trim() === '내 문서 보기')) button = node;
    ts.forEachChild(node, visit); };
  visit(ast); assert(button, 'production private-document return must exist');
  const click = button.openingElement.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === 'onClick') as ts.JsxAttribute;
  const expression = (click.initializer as ts.JsxExpression).expression!.getText(ast);
  const input = fixture(), before = JSON.stringify(input.data), navigated: unknown[] = [];
  const callback = new Function('navigate', `return (${expression});`)((destination: unknown) => navigated.push(destination));
  callback(); assert.deepEqual(navigated, [{ view: 'space' }]); assert.equal(JSON.stringify(input.data), before);
});

function savedCopyFixture() {
  const input = fixture(true), version = input.data.public.versions[0];
  const result = importProgramPublicVersion(input.data, { actorId: input.data.activeActorId,
    requestId: 'return-copy-test', expectedSpace: input.data.spaces[input.data.activeActorId],
    versionId: version.id, itemIds: [version.items[0].id], anchor: '2026-10-05' });
  assert(result.ok); input.data = result.data;
  const space = input.data.spaces[input.data.activeActorId], copy = space.copies.find(row => row.id === result.result)!;
  return { input, version, space, copy };
}

test('F04 an existing actor copy has a direct return without replacing selection, dates, progress or source', () => {
  const { input, version, space, copy } = savedCopyFixture();
  const state = createProgramDiscoveryNavigationState();
  state.details[version.id] = { selectedItemIds: [], anchor: '2026-11-01', format: 'txt' };
  space.text = M.editText(space.text, copy.documentId, M.raw(M.getDocument(space.text, copy.documentId)!) + '\n내 메모');
  const before = JSON.stringify(input.data);
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} navigationState={state} />);
  assert.match(html, /내 문서에서 이어보기/); assert.match(html, /날짜·진행 기록은 그대로입니다/);
  assert.match(html, /내 문서에 가져오기/); assertPrivateHidden(html); assert.doesNotMatch(html, /내 메모/);
  assert.equal(JSON.stringify(input.data), before);
});

test('F05 prior-version and archived copies stay explicit read-only return targets, including a withdrawn public Flow', () => {
  const { input, version, space, copy } = savedCopyFixture();
  copy.baseVersionId = 'prior-version'; space.archivedDocumentIds.push(copy.documentId);
  input.data.public.flows.find(row => row.id === version.flowId)!.archived = true;
  const before = JSON.stringify(input.data);
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} selectedVersionId={version.id} />);
  assert.match(html, /내 문서에서 이어보기/); assert.match(html, /보관한 내 문서를 읽기 전용으로 엽니다/);
  assert.match(html, /공개 판본과 내 문서의 원본 판본은 다릅니다/);
  assert.doesNotMatch(html, /내 문서에 가져오기|TXT 파일 받기/);
  const bare = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} />);
  assert.match(bare, /이 Flow를 찾을 수 없습니다/); assert.match(bare, /내 문서에서 이어보기/);
  assert.doesNotMatch(bare, /내 문서에 가져오기|TXT 파일 받기|program-flow-detail/);
  assert.equal(JSON.stringify(input.data), before);
});

test('F06 absent, foreign, missing and trashed copies do not produce a return target', () => {
  const input = fixture(true), version = input.data.public.versions[0];
  assert.doesNotMatch(renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} />), /program-existing-copy-return/);
  for (const condition of ['foreign', 'missing', 'trashed'] as const) {
    const saved = savedCopyFixture();
    if (condition === 'foreign') {
      saved.input.data.spaces['participant-jihun'].copies.push(saved.copy); saved.space.copies = [];
    } else if (condition === 'missing') {
      saved.space.text.flows = saved.space.text.flows.filter(row => row.id !== saved.copy.documentId);
    } else saved.space.documentTrash = { [saved.copy.documentId]: { trashedAt: '2026-10-05T00:00:00Z', wasArchived: false } };
    const before = JSON.stringify(saved.input.data);
    const html = renderToStaticMarkup(<ProgramDiscovery {...saved.input} selectedFlowId={saved.version.flowId} />);
    assert.doesNotMatch(html, /program-existing-copy-return/, condition); assertPrivateHidden(html);
    assert.equal(JSON.stringify(saved.input.data), before);
  }
});

test('F07 production existing-copy callback opens exactly that document with no import or mutation', () => {
  const ast = ts.createSourceFile('ProgramDiscovery.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let button: ts.JsxElement | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'button'
      && node.openingElement.attributes.getText(ast).includes('program-existing-copy-return')) button = node;
    ts.forEachChild(node, visit);
  };
  visit(ast); assert(button);
  const click = button.openingElement.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === 'onClick') as ts.JsxAttribute;
  const expression = (click.initializer as ts.JsxExpression).expression!.getText(ast);
  const { input, copy } = savedCopyFixture(), before = JSON.stringify(input.data), navigated: unknown[] = [];
  const callback = new Function('navigate', 'existingCopy', `return (${expression});`)((destination: unknown) => navigated.push(destination), copy);
  callback(); assert.deepEqual(navigated, [{ view: 'space', id: copy.documentId }]);
  assert.equal(JSON.stringify(input.data), before);
});

test('F08 each item exposes its own source link beside its unchanged method and personal completion criterion', () => {
  const input = fixture(true), version = input.data.public.versions[0];
  const base = version.items[0];
  version.items = [18438, 18437, 18445, 18448].map((id, index) => ({ ...base, id: `source-${id}`,
    title: `토픽 ${index + 1}`, description: `토픽 ${index + 1}을 먼저 여세요.`,
    completionCriteria: `토픽 ${index + 1}의 이어 볼 위치를 개인 메모에 남겼다.`,
    sourceUrl: `https://opentutorials.org/course/3084/${id}`, schedule: { kind: 'undated' }, subchecks: [] }));
  const before = JSON.stringify(input.data);
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} />);
  for (const item of version.items) {
    assert.match(html, new RegExp(`href="${item.sourceUrl}" target="_blank" rel="noreferrer noopener" aria-label="${item.title} 원문 열기"`));
    assert(html.includes(item.description)); assert(html.includes(item.completionCriteria));
  }
  assert.equal((html.match(/항목 원문 열기 ↗/g) ?? []).length, 4);
  assert.equal(JSON.stringify(input.data), before); assertPrivateHidden(html);
});

test('F09 a source-only item still offers its existing disclosure and does not invent a description, date or completion criterion', () => {
  const input = fixture(true), version = input.data.public.versions[0];
  version.items = [{ ...version.items[0], description: '', completionCriteria: '', subchecks: [],
    schedule: { kind: 'undated' }, sourceUrl: 'http://opentutorials.org/course/3084/18438/?utm_source=fixture#section-a' }];
  const before = JSON.stringify(input.data);
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} />);
  assert.match(html, /방법과 완료 기준/); assert.match(html, /항목 원문 열기 ↗/); assert.match(html, /날짜 미정/);
  assert(html.includes(`href="${version.items[0].sourceUrl}"`), 'link destination must retain original scheme, path, query and section');
  assert.doesNotMatch(html, /<strong>완료 기준<\/strong>|type="date"/);
  assert.equal(JSON.stringify(input.data), before);
});

test('F10 absent or unsafe item URLs do not become source links or silently fall back to the Flow URL', () => {
  for (const sourceUrl of [null, '', 'javascript:alert(1)', 'data:text/html,bad', 'https://user:pass@example.com/topic',
    'http://127.0.0.1/topic', 'https://example.com/topic?token=not-a-secret', 'not-a-url']) {
    const input = fixture(true), version = input.data.public.versions[0];
    version.items = [{ ...version.items[0], description: '', completionCriteria: '', subchecks: [],
      schedule: { kind: 'undated' }, sourceUrl }];
    const before = JSON.stringify(input.data);
    const html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} />);
    assert.doesNotMatch(html, /항목 원문 열기 ↗|방법과 완료 기준/);
    assert.equal(JSON.stringify(input.data), before);
  }
});
