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
import { importProgramPublicVersion } from '../../../lib/flow/integrated-poc/private-space';
import type * as Discovery from './ProgramDiscovery';

const url = new URL('./ProgramDiscovery.tsx', import.meta.url), require = createRequire(url);
const root = resolve(dirname(fileURLToPath(url)), '../../..');
function harness() {
  // Execute the component and its real callbacks; only React lifecycle is held
  // in memory. This does not stand in for a viewport or browser check.
  const slots: unknown[] = []; let cursor = 0;
  const react = { ...React, useEffect: () => {}, useId: () => ':whole-ux:',
    useRef: (value: unknown) => { const at = cursor++; return slots[at] ?? (slots[at] = { current: value }); },
    useState: (initial: unknown) => {
      const at = cursor++; if (!(at in slots)) slots[at] = typeof initial === 'function' ? initial() : initial;
      return [slots[at], (value: unknown) => { slots[at] = typeof value === 'function' ? value(slots[at]) : value; }];
    } };
  const module = { exports: {} as typeof Discovery };
  const code = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  vm.runInThisContext(`(function(module,exports,require){${code}\n})`)(module, module.exports, (id: string) => {
    if (id === 'react') return react;
    if (id.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  });
  return { api: module.exports, render: (props: Discovery.ProgramDiscoveryProps) => { cursor = 0; return module.exports.ProgramDiscovery(props); } };
}
type Element = React.ReactElement<Record<string, unknown>>;
function walk(node: React.ReactNode): Element[] {
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...React.Children.toArray(node.props.children as React.ReactNode).flatMap(walk)];
}
function text(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return React.Children.toArray(node).map(child => React.isValidElement<Record<string, unknown>>(child)
    ? text(child.props.children as React.ReactNode) : typeof child === 'string' || typeof child === 'number' ? String(child) : '').join('');
}
function button(tree: React.ReactNode, label: string): Element {
  const found = walk(tree).find(node => node.type === 'button' && text(node.props.children as React.ReactNode) === label);
  assert(found, `missing button: ${label}`); return found;
}
function click(node: Element) { (node.props.onClick as () => void)(); }
function fixture(h: ReturnType<typeof harness>) {
  const data = createProgramData(), catalog = buildProgramCatalog(data.activeActorId);
  data.public.flows = catalog.flows; data.public.versions = catalog.versions;
  const version = data.public.versions[0], navigationState = h.api.createProgramDiscoveryNavigationState();
  navigationState.details[version.id] = { selectedItemIds: version.items.map(item => item.id), anchor: '2026-10-10', format: 'txt' };
  const destinations: unknown[] = [], imports: unknown[][] = [];
  const props: Discovery.ProgramDiscoveryProps = { data, navigationState, today: '2026-10-09', storageScope: 'account',
    mutate: async () => assert.fail('unexpected writer'), onStartText: async () => assert.fail('unexpected document creation'),
    navigate: destination => { destinations.push(destination); },
    onUseVersion: async (...args) => { imports.push(args); return false; } };
  return { props, version, destinations, imports };
}

test('public list exposes each actual current title, item count and source without reading private content', () => {
  const h = harness(), { props } = fixture(h), before = JSON.stringify(props.data), tree = h.render(props);
  const rows = walk(tree).filter(node => node.type === 'article');
  assert.equal(rows.length, props.data.public.flows.filter(flow => !flow.archived).length);
  for (const row of rows) {
    const titleButton = walk(row).find(node => node.type === 'button')!;
    const version = props.data.public.versions.find(version => version.title === text(titleButton.props.children as React.ReactNode))!;
    assert(version); const content = text(row);
    assert(content.includes(`${version.items.length}개 항목 · 판본 ${version.number}`));
    assert(content.includes(`출처: ${version.source.label}`));
  }
  assert(renderToStaticMarkup(tree).includes('공개 Flow 검색'));
  assert.equal(JSON.stringify(props.data), before);
});

test('intro separates exact summary, first title and completion criterion without inventing a method', () => {
  const h = harness(), { props, version } = fixture(h); props.selectedFlowId = version.flowId;
  const before = JSON.stringify(props.data), tree = h.render(props), nodes = walk(tree);
  const full = nodes.find(node => node.type === 'details' && text((node.props.children as React.ReactNode[])[0]) === '소개 전체 읽기');
  assert(full); assert.notEqual(full.props.open, true);
  assert(walk(full).some(node => node.type === 'p' && node.props.children === version.summary));
  const first = nodes.find(node => node.props.className === 'firstAction'); assert(first);
  assert(walk(first).some(node => node.type === 'p' && node.props.children === version.items[0].title));
  assert(text(first).includes(version.items[0].completionCriteria));
  assert(!text(first).includes(version.items[0].description));
  assert.equal(JSON.stringify(props.data), before);
});

test('missing completion criterion stays missing, and full summary remains accessible for a single long line', () => {
  const h = harness(), { props, version } = fixture(h); props.selectedFlowId = version.flowId;
  version.items[0].completionCriteria = ''; version.summary = '단일 줄 소개 원문 '.repeat(80);
  const before = JSON.stringify(props.data), tree = h.render(props);
  assert(!text(tree).includes('첫 행동 완료 기준'));
  const full = walk(tree).find(node => node.props.className === 'fullIntroduction'); assert(full);
  assert(walk(full).some(node => node.type === 'p' && node.props.children === version.summary));
  assert.equal(JSON.stringify(props.data), before);
});

test('reading and intro start are presentation only; only explicit confirmation delegates exact whole IDs', async () => {
  const h = harness(), { props, version, imports, destinations } = fixture(h); props.selectedFlowId = version.flowId;
  const before = JSON.stringify(props.data);
  click(button(h.render(props), '내용 살펴보기'));
  let tree = h.render(props); assert(text(tree).includes('전체 내용'));
  for (const item of version.items) {
    assert(text(tree).includes(item.title)); assert(text(tree).includes(item.description)); assert(text(tree).includes(item.completionCriteria));
  }
  assert.deepEqual(imports, []); assert.deepEqual(destinations, []);
  click(button(tree, '내 계획으로 시작')); tree = h.render(props);
  assert.deepEqual(imports, []); click(button(tree, '취소')); assert.deepEqual(imports, []);
  click(button(h.render(props), '내 계획으로 시작')); tree = h.render(props);
  const start = button(tree, '전체 항목으로 시작'); assert.equal(start.props.disabled, false); click(start);
  await Promise.resolve();
  assert.deepEqual(imports, [[version.id, version.items.map(item => item.id), '2026-10-10', undefined]]);
  const failed = h.render(props); assert(text(failed).includes('입력과 선택은 유지됩니다. 다시 시도해 주세요.'));
  assert.equal(imports.length, 1, 'failed acknowledgement must not retry automatically');
  click(button(failed, '전체 항목으로 시작')); await Promise.resolve();
  assert.equal(imports.length, 2); assert.deepEqual(imports[1], imports[0]);
  assert.deepEqual(destinations, []); assert.equal(JSON.stringify(props.data), before);
});

test('existing-copy resume retains exact actor document, source and progress and never invokes import', () => {
  const h = harness(), { props, version, imports, destinations } = fixture(h);
  const saved = importProgramPublicVersion(props.data, { actorId: props.data.activeActorId, requestId: 'whole-ux-resume',
    expectedSpace: props.data.spaces[props.data.activeActorId], versionId: version.id, itemIds: [version.items[0].id], anchor: '2026-10-10' });
  assert(saved.ok); props.data = saved.data; props.selectedFlowId = version.flowId;
  const copy = props.data.spaces[props.data.activeActorId].copies.find(copy => copy.id === saved.result)!;
  const before = JSON.stringify(props.data), tree = h.render(props);
  assert(!text(tree).includes('내 계획으로 시작')); click(button(tree, '내 문서에서 이어보기'));
  assert.deepEqual(destinations, [{ view: 'space', id: copy.documentId }]); assert.deepEqual(imports, []);
  assert.equal(JSON.stringify(props.data), before);
});

test('story, activity and creation entrances delegate their existing routes without import or mutation', () => {
  const h = harness(), { props, imports, destinations } = fixture(h); let created = 0;
  props.onCreateFlow = () => { created += 1; }; const before = JSON.stringify(props.data), tree = h.render(props);
  click(button(tree, '이야기 보기')); click(button(tree, '내 활동')); click(button(tree, 'Flow 만들기'));
  assert.deepEqual(destinations, [{ view: 'community' }, { view: 'activity' }]); assert.equal(created, 1);
  assert.deepEqual(imports, []); assert.equal(JSON.stringify(props.data), before);
  const local = renderToStaticMarkup(h.render({ ...props, storageScope: 'local' })); assert(!local.includes('>내 활동<'));
});
