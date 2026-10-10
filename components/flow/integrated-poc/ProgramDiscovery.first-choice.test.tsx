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
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import type * as Discovery from './ProgramDiscovery';

const url = new URL('./ProgramDiscovery.tsx', import.meta.url), require = createRequire(url);
const root = resolve(dirname(fileURLToPath(url)), '../../..'), source = readFileSync(url, 'utf8');
let hook = 0, presentation: { key: string; stage: 'contents' | 'confirm' } | null = null;
const loaded = { exports: {} as typeof Discovery };
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
vm.runInThisContext(`(function(module,exports,require){${compiled}\n})`)(loaded, loaded.exports, (id: string) => {
  if (id.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
  // Controlled SSR presentation only; interactive state is tested in the real
  // browser. Still call React's hook so the production hook order is retained.
  if (id === 'react') return { ...React, useState: (initial: unknown) => {
    const pair = React.useState(initial); hook += 1; return hook === 5 ? [presentation, pair[1]] : pair;
  } };
  return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
});
const { ProgramDiscovery, createProgramDiscoveryNavigationState } = loaded.exports;
function fixture() {
  const data = createProgramData(), catalog = buildProgramCatalog(data.activeActorId);
  data.public.flows = catalog.flows; data.public.versions = catalog.versions;
  const version = data.public.versions.find(row => row.flowId === 'catalog-chiangmai-solo-trip-packing')!;
  version.items = version.items.slice(0, 4).map(item => ({ ...item, schedule: { kind: 'undated' as const } }));
  const noWrite = () => { assert.fail('rendering must not call navigation or writers'); };
  const props: Discovery.ProgramDiscoveryProps = { data, mutate: noWrite, navigate: noWrite, onUseVersion: noWrite,
    onStartText: noWrite, today: '2026-10-06', storageScope: 'account', selectedFlowId: version.flowId };
  return { props, version };
}
function render(props: Discovery.ProgramDiscoveryProps, stage: 'intro' | 'contents' | 'confirm' = 'intro', key?: string) {
  const version = props.data.public.versions.find(row => row.flowId === props.selectedFlowId)!;
  hook = 0; presentation = stage === 'intro' ? null : { key: key ?? `${props.data.activeActorId}:${version.id}`, stage };
  return renderToStaticMarkup(<ProgramDiscovery {...props} />);
}
function saved() {
  const { props, version } = fixture();
  const result = importProgramPublicVersion(props.data, { actorId: props.data.activeActorId, requestId: 'first-choice-existing',
    expectedSpace: props.data.spaces[props.data.activeActorId], versionId: version.id, itemIds: version.items.map(item => item.id), anchor: null });
  assert(result.ok); props.data = result.data;
  const space = props.data.spaces[props.data.activeActorId], copy = space.copies.find(row => row.id === result.result)!;
  space.text = M.editText(space.text, copy.documentId, M.raw(M.getDocument(space.text, copy.documentId)!) + '\n개인 sentinel memo');
  return { props, version: props.data.public.versions.find(row => row.id === version.id)!, space, copy };
}

function markHeld(props: Discovery.ProgramDiscoveryProps, version: ReturnType<typeof fixture>['version']) {
  const originalId = version.flowId, heldId = 'catalog-childcare-fee-support-apply';
  props.data.public.flows.find(flow => flow.id === originalId)!.id = heldId;
  version.flowId = heldId; props.selectedFlowId = heldId;
  for (const copy of props.data.spaces[props.data.activeActorId].copies) if (copy.flowId === originalId) copy.flowId = heldId;
}

test('held NEW source is absent from discovery but its direct reading never invokes a writer', () => {
  const { props, version } = fixture(); markHeld(props, version);
  const before = JSON.stringify(props.data);
  const list = render({ ...props, selectedFlowId: undefined });
  assert(!list.includes(`program-discovery-${version.flowId}`));
  const intro = render(props);
  assert.match(intro, /disabled=""[^>]*>내 계획으로 시작/);
  assert.match(intro, /출처를 재검토/);
  assert.equal(JSON.stringify(props.data), before);
});

test('held source confirmation stays disabled even when a valid output can be generated', () => {
  const { props, version } = fixture(); markHeld(props, version);
  const before = JSON.stringify(props.data), html = render(props, 'confirm');
  assert.match(html, /disabled=""[^>]*>전체 항목으로 시작/);
  assert.equal(JSON.stringify(props.data), before);
});

test('held source keeps the same existing copy resume entry at all reading stages', () => {
  const { props, version, copy } = saved(); markHeld(props, version);
  const before = JSON.stringify(props.data);
  for (const stage of ['intro', 'contents', 'confirm'] as const) {
    const html = render(props, stage);
    assert.match(html, /내 문서에서 이어보기/);
    assert.doesNotMatch(html, />전체 항목으로 시작</);
  }
  assert.equal(props.data.spaces[props.data.activeActorId].copies.filter(row => row.id === copy.id).length, 1);
  assert.equal(JSON.stringify(props.data), before);
});

test('intro shows actual title, full summary, first item and total without writing or offering partial selection', () => {
  const { props, version } = fixture(), before = JSON.stringify(props.data);
  const html = render(props);
  assert(html.includes(version.title)); assert(html.includes(version.items[0].title)); assert(html.includes('전체 4개 항목'));
  assert.match(html, /program-flow-intro|내용 살펴보기/); assert.match(html, /내 계획으로 시작/);
  assert.doesNotMatch(html, /type="checkbox"|전체 항목으로 시작|내 문서에 가져오기/);
  assert.equal(JSON.stringify(props.data), before);
});
test('intro shows only the first existing completion criterion and does not invent a missing criterion or personal record', () => {
  const {props,version}=fixture();
  version.items[0].completionCriteria='무엇을 정할지 개인 메모에 한 문장으로 적었다.';
  version.items[1].completionCriteria='나중 항목 전용 기준';
  const before=JSON.stringify(props.data),html=render(props);
  assert.match(html,/첫 행동 완료 기준/);assert(html.includes(version.items[0].completionCriteria));
  assert(!html.includes(version.items[1].completionCriteria));
  assert.equal(JSON.stringify(props.data),before);
  version.items[0].completionCriteria='';
  const emptyBefore=JSON.stringify(props.data),empty=render(props);
  assert.doesNotMatch(empty,/첫 행동 완료 기준|무엇을 정할지 개인 메모에 한 문장으로 적었다/);
  assert.equal(JSON.stringify(props.data),emptyBefore);
});
test('reading contents never exposes partial controls or a final save action before confirmation', () => {
  const { props, version } = fixture(), before = JSON.stringify(props.data), html = render(props, 'contents');
  assert.match(html, /전체 내용|소개로 돌아가기|내 계획으로 시작/);
  for (const item of version.items) assert(html.includes(item.title));
  assert.doesNotMatch(html, /type="checkbox"|선택 해제|전체 선택|전체 항목으로 시작/);
  assert.equal(JSON.stringify(props.data), before);
});
test('confirmation explicitly starts all items and cancels without writing during render', () => {
  const { props } = fixture(), before = JSON.stringify(props.data), html = render(props, 'confirm');
  assert.match(html, /전체 항목으로 시작|취소|공개 원본|원문의 일정은 유지/);
  assert.doesNotMatch(html, /type="checkbox"|내 문서에 가져오기/);
  assert.equal(JSON.stringify(props.data), before);
});
test('hidden prior partial presentation does not narrow the new whole-item output or mutate presentation', () => {
  const { props, version } = fixture(), state = createProgramDiscoveryNavigationState();
  state.details[version.id] = { selectedItemIds: [version.items[0].id], anchor: '', format: 'txt' }; props.navigationState = state;
  const before = JSON.stringify({ data: props.data, state }), html = render(props, 'confirm');
  assert.match(html, /4개 항목 ·/); assert.doesNotMatch(html, /type="checkbox"/);
  assert.equal(JSON.stringify({ data: props.data, state }), before);
});
test('existing copy offers resume rather than import at intro, contents and confirmation', () => {
  const { props } = saved(), before = JSON.stringify(props.data);
  for (const stage of ['intro', 'contents', 'confirm'] as const) {
    const html = render(props, stage); assert.match(html, /내 문서에서 이어보기/);
    assert.doesNotMatch(html, /전체 항목으로 시작|>내 계획으로 시작<|내 문서에 가져오기|sentinel memo/);
  }
  assert.equal(JSON.stringify(props.data), before);
});
test('archived personal copy remains a read-only resume target without restarting', () => {
  const { props, space, copy } = saved(); space.archivedDocumentIds.push(copy.documentId);
  const before = JSON.stringify(props.data), html = render(props);
  assert.match(html, /보관한 내 문서를 읽기 전용으로 엽니다/); assert.doesNotMatch(html, /내 계획으로 시작/);
  assert.equal(JSON.stringify(props.data), before);
});
test('trashed or missing saved copy offers recovery instead of a start which the existing import cannot accept', () => {
  for (const condition of ['trashed', 'missing'] as const) {
    const { props, space, copy } = saved();
    if (condition === 'trashed') {
      space.archivedDocumentIds.push(copy.documentId);
      space.documentTrash = { [copy.documentId]: { trashedAt: '2026-10-06T00:00:00Z', wasArchived: false } };
    } else space.text.flows = space.text.flows.filter(doc => doc.id !== copy.documentId);
    const before = JSON.stringify(props.data);
    for (const stage of ['intro', 'contents', 'confirm'] as const) {
      const html = render(props, stage); assert.match(html, /내 공간에서 확인/);
      assert.doesNotMatch(html, /program-existing-copy-return|전체 항목으로 시작|>내 계획으로 시작</);
    }
    assert.equal(JSON.stringify(props.data), before);
  }
});
test('other actor and version presentation cannot skip the introduction', () => {
  const { props } = fixture();
  for (const key of ['foreign:version', `${props.data.activeActorId}:another-version`]) {
    assert.match(render(props, 'confirm', key), /program-flow-intro/);
    assert.doesNotMatch(render(props, 'confirm', key), /전체 항목으로 시작/);
  }
});
test('relative date validation remains required and no date is assigned by introduction', () => {
  const { props, version } = fixture(); version.items[0].schedule = { kind: 'relative', days: 1 };
  const before = JSON.stringify(props.data), html = render(props, 'confirm');
  assert.match(html, /기준일/); assert.match(html, /disabled=""[^>]*>전체 항목으로 시작/);
  assert.equal(JSON.stringify(props.data), before);
});
test('empty public catalog stays empty and provides recovery without injecting representative content', () => {
  const { props } = fixture(); props.data.public.flows = []; props.data.public.versions = []; delete props.selectedFlowId;
  const before = JSON.stringify(props.data), html = render(props);
  assert.match(html, /아직 공개된 Flow가 없어요|내 문서 보기/); assert.doesNotMatch(html, /program-flow-intro|내 계획으로 시작/);
  assert.equal(JSON.stringify(props.data), before);
});
test('missing version remains fail-closed instead of substituting the latest introduction', () => {
  const { props } = fixture(); props.selectedVersionId = 'missing';
  assert.match(render(props), /이 Flow를 찾을 수 없습니다/); assert.doesNotMatch(render(props), /program-flow-intro|전체 항목으로 시작/);
});
test('legacy local and item deep-link reading retain existing selection/export return contract', () => {
  const { props, version } = fixture();
  assert.match(render({ ...props, storageScope: 'local' }), /type="checkbox"|내 문서에 가져오기/);
  const html = render({ ...props, selectedItemId: version.items[0].id });
  assert.match(html, /program-flow-detail/); assert.doesNotMatch(html, /program-flow-intro|전체 항목으로 시작/);
});
test('final start delegates whole IDs to existing acknowledged callback and keeps one-flight protection', () => {
  assert.match(source, /onUseVersion\(version\.id, useItemIds, detail\.anchor \|\| null/);
  assert.match(source, /const useItemIds = firstChoice \? version!\.items\.map\(item => item\.id\)/);
  assert.match(source, /if \(pendingRef\.current\) return;/);
  assert.match(source, /const accepted = await work\(\)/);
  assert.match(source, /onClick=\{\(\) => showChoice\('intro'\)\}>취소/);
});
