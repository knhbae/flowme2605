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
  assert.doesNotMatch(detail, /내 문서 보기/); assert.match(detail, /내 문서에 가져오기/);
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
