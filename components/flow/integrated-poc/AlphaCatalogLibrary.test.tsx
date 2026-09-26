import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { CATALOG_LIBRARY_VERSION, catalogLibrarySummary } from '../../../lib/flow/integrated-poc/catalog-library';
import { buildCatalogLibrarySnapshot } from '../../../lib/flow/integrated-poc/catalog-library-source';
import { executeAlphaCreatorIntent } from '../../../lib/flow/integrated-poc/alpha-creator/dispatch-source';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { programErrorMessage } from '../../../lib/flow/integrated-poc/ui-contract';
import { CatalogLibraryContent } from './CatalogLibraryContent';
import { CATALOG_CONTENT_SLUGS, CATALOG_CONTENT_V2_SLUGS, CATALOG_CONTENT_V3_SLUGS } from '../../../lib/flow/integrated-poc/catalog-content';
const AlphaCatalogCopyActions = () => null;
const raw = readFileSync(new URL('./AlphaCatalogLibrary.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ui.tsx', raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'AlphaCatalogLibrary'); assert(node);
const loaded = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'LoadedCatalogLibrary'); assert(loaded);
const compiled = ts.transpileModule(`${loaded.getText(ast)}\nconst Component=${node.getText(ast).replace(/^export\s+/, '')}`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const nodes = (v: any): any[] => !v ? [] : Array.isArray(v) ? v.flatMap(nodes) : typeof v === 'object' && 'props' in v ? [v, ...nodes(v.props.children)] : [];
const text = (v: any): string => typeof v === 'string' || typeof v === 'number' ? String(v) : Array.isArray(v) ? v.map(text).join('') : v?.props ? text(v.props.children) : '';
function harness(stored = false) {
  const slots: any[] = []; let cursor = 0, id = 0; const calls: any[] = [];
  const props: any = { data: createProgramData(), disabled: false, sourceLibrary: buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z') };
  if (stored) props.data.spaces[props.data.activeActorId].catalogLibrary = buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z');
  let respond = async (_call: any): Promise<any> => ({ ok: true });
  props.mutate = async (...args: any[]) => { calls.push(args); return respond(args); };
  const context = { React, CatalogLibraryContent, AlphaCatalogCopyActions, CATALOG_CONTENT_SLUGS, CATALOG_CONTENT_V2_SLUGS, CATALOG_CONTENT_V3_SLUGS, buildCatalogLibrarySnapshot, CATALOG_LIBRARY_VERSION, catalogLibrarySummary, executeAlphaCreatorIntent, programErrorMessage,
    programId: () => `test-${++id}`, styles: {},
    useMemo: (fn: () => unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = fn(); return slots[i]; },
    useRef: (value: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
    useState: (value: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], (next: unknown) => { slots[i] = next; }]; },
  };
  const component = new Function('require', 'exports', ...Object.keys(context), `${compiled}; return Component;`)(createRequire(import.meta.url), {}, ...Object.values(context));
  const render = () => { cursor = 0; const tree = component(props); return typeof tree?.type === 'function' ? tree.type(tree.props) : tree; };
  const button = (name: string) => { const result = nodes(render()).find(n => n.type === 'button' && text(n.props.children) === name); assert(result, name); return result; };
  const click = (name: string) => { const b = button(name); if (!b.props.disabled) b.props.onClick(); };
  const search = (value: string) => nodes(render()).find(n => n.type === 'input').props.onChange({ target: { value } });
  const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
  return { props, calls, render, button, click, search, settle, respond: (fn: typeof respond) => { respond = fn; } };
}
test('busy rejection preserves library preview without automatic retry, then accepts explicit retry', async () => {
  const h = harness(), before = JSON.stringify(h.props.data);
  h.respond(async () => ({ ok: false, reason: 'busy' }));
  h.click('전체 콘텐츠 내용 확인'); h.click('전체 콘텐츠 비공개로 가져오기'); await h.settle();
  assert.equal(JSON.stringify(h.props.data), before); assert.equal(h.calls.length, 1);
  assert.equal(h.button('전체 콘텐츠 비공개로 가져오기').props.disabled, false);
  assert(text(h.render()).includes(programErrorMessage('busy')));
  assert.match(text(h.render()), /이번 요청은 실행하지 않았습니다/); assert.doesNotMatch(text(h.render()), /확인하고 있습니다/);
  h.render(); await h.settle(); assert.equal(h.calls.length, 1);
  h.respond(async args => { const result = args[1](h.props.data); assert(result.ok); h.props.data = result.data; return result; });
  h.click('전체 콘텐츠 비공개로 가져오기'); await h.settle();
  assert.equal(h.calls.length, 2); assert(h.props.data.spaces[h.props.data.activeActorId].catalogLibrary);
  assert(text(h.render()).includes('전체 콘텐츠를 비공개 자료실에 보관했습니다.'));
  assert(!text(h.render()).includes(programErrorMessage('busy')));
});

test('preview search cancel and Escape are read-only', () => {
  const h = harness(), before = JSON.stringify(h.props.data); h.click('전체 콘텐츠 내용 확인'); h.search('이사');
  assert(text(h.render()).includes('177')); h.click('취소'); h.click('전체 콘텐츠 내용 확인'); h.render().props.onKeyDown({ key: 'Escape' });
  assert.equal(h.calls.length, 0); assert.equal(JSON.stringify(h.props.data), before);
});

test('Escape from an unstored catalog detail keeps its preview list and restores the item focus', () => {
  const h = harness(), before = JSON.stringify(h.props.data);
  h.click('전체 콘텐츠 내용 확인');
  const first = nodes(h.render()).find(n => n.type === 'li').props.children;
  const label = text(first.props.children);
  h.click(label);
  assert(!nodes(h.render()).some(n => n.type === 'input'));
  h.render().props.onKeyDown({ key: 'Escape' });
  assert(nodes(h.render()).some(n => n.type === 'input'));
  let focused = false;
  h.button(label).props.ref({ focus: () => { focused = true; } });
  assert(focused);
  h.render().props.onKeyDown({ key: 'Escape' });
  assert(!nodes(h.render()).some(n => n.type === 'input'));
  assert.equal(h.calls.length, 0);
  assert.equal(JSON.stringify(h.props.data), before);
});

test('copy capability count follows explicit contracts without claiming source or user validation', () => {
  const h = harness(true), content = text(h.render());
  assert(content.includes(`${CATALOG_CONTENT_SLUGS.length + CATALOG_CONTENT_V2_SLUGS.length + CATALOG_CONTENT_V3_SLUGS.length}개 콘텐츠는 상세에서 제작 사본`));
  assert(!content.includes('검증된')); assert.equal(h.calls.length, 0);
});
test('disabled and busy imports prevent duplicate mutations with locator-only intent', async () => {
  const h = harness(); h.click('전체 콘텐츠 내용 확인'); h.props.disabled = true;
  h.button('전체 콘텐츠 비공개로 가져오기').props.onClick(); assert.equal(h.calls.length, 0); h.props.disabled = false;
  let release: (v: unknown) => void = () => {}; h.respond(() => new Promise(resolve => { release = resolve; }));
  const b = h.button('전체 콘텐츠 비공개로 가져오기'); b.props.onClick(); b.props.onClick(); assert.equal(h.calls.length, 1);
  assert.deepEqual(Object.keys(h.calls[0][2].alphaCreator).sort(), ['catalogVersion', 'now', 'type']);
  assert(h.button('취소').props.disabled); release({ ok: true }); await h.settle();
});
test('all 177 Flow entries and 26 maps remain reachable through pagination without writes', () => {
  const h = harness(true), seen = new Set<string>();
  for (;;) { for (const n of nodes(h.render()).filter(n => n.type === 'li')) seen.add(text(n)); if (h.button('다음 쪽').props.disabled) break; h.click('다음 쪽'); }
  assert.equal(seen.size, 177); h.click('Flow Map'); const maps = new Set<string>();
  for (;;) { for (const n of nodes(h.render()).filter(n => n.type === 'li')) maps.add(text(n)); if (h.button('다음 쪽').props.disabled) break; h.click('다음 쪽'); }
  assert.equal(maps.size, 26); h.click('보관 대상'); assert(text(h.render()).includes('검색 결과 21개')); assert.equal(h.calls.length, 0);
});
test('Map child opens actual archived Flow while keeping archive policy and readonly state', () => {
  const h = harness(true), library = h.props.data.spaces[h.props.data.activeActorId].catalogLibrary;
  const archived = new Set(library.policies.flows.filter((p: any) => p.runtimeExcluded).map((p: any) => p.slug));
  const map = library.maps.find((m: any) => m.flowSlugs.some((s: string) => archived.has(s))); assert(map);
  h.click('Flow Map'); h.search(map.title); h.click(`${map.title} · ${map.flowSlugs.length}개 Flow`);
  const slug = map.flowSlugs.find((s: string) => archived.has(s)); const flow = library.bundles.find((b: any) => b.flow.slug === slug).flow;
  h.click(`${flow.title} · 보관 대상`); assert(nodes(h.render()).some(n => n.props['aria-label'] === 'Flow 콘텐츠 상세'));
  assert(text(h.render()).includes('공개 제외 정책을 유지')); assert.equal(h.calls.length, 0);
});
test('raw absence and two original/current variants are explicit and read-only', () => {
  const h = harness(true), library = h.props.data.spaces[h.props.data.activeActorId].catalogLibrary;
  const missing = library.bundles.find((b: any) => !b.flow.raw_text); h.search(missing.flow.title);
  h.click(missing.flow.title + (library.policies.flows.find((p: any) => p.slug === missing.flow.slug)?.runtimeExcluded ? ' · 보관 대상' : ''));
  assert(text(h.render()).includes('저장된 원문 없음')); h.click('목록으로');
  for (const variant of library.variants) { const original = library.bundles.find((b: any) => b.flow.slug === variant.slug); h.search(original.flow.title);
    h.click(original.flow.title); h.click('현재 작업 판본 비교'); assert(text(h.render()).includes('현재 작업 판본 · 2026-09-23'));
    h.click('이전 PoC 원본 보기'); assert(text(h.render()).includes('이전 PoC 원본 판본')); h.click('목록으로'); }
  assert.equal(h.calls.length, 0);
});
test('failed import remains retryable without claiming success', async () => {
  const h = harness(); h.respond(async () => ({ ok: false, reason: 'conflict' })); h.click('전체 콘텐츠 내용 확인'); h.click('전체 콘텐츠 비공개로 가져오기'); await h.settle();
  assert.equal(h.button('전체 콘텐츠 비공개로 가져오기').props.disabled, false); assert(!text(h.render()).includes('비공개 자료실에 보관했습니다.'));
});
test('detail receives focus and returning restores the original list button without losing query or page', () => {
  const h = harness(true); h.click('다음 쪽');
  const opener = nodes(h.render()).find(n => n.type === 'li').props.children, label = text(opener);
  opener.props.onClick(); let focused = '';
  const detail = nodes(h.render()).find(n => n.type === 'h2'); assert.equal(detail.props.tabIndex, -1);
  detail.props.ref({ focus: () => { focused = 'detail'; } }); assert.equal(focused, 'detail');
  assert(!nodes(h.render()).some(n => n.type === 'input')); h.click('목록으로');
  const returned = h.button(label); returned.props.ref({ focus: () => { focused = 'opener'; } });
  assert.equal(focused, 'opener'); assert(text(h.render()).includes('2/9쪽')); assert.equal(h.calls.length, 0);
});

test('detail visibility callback separates editor and restores it on Escape or collapse without mutation', () => {
  const h = harness(true), visibility: boolean[] = [];
  h.props.onDetailChange = (open: boolean) => visibility.push(open);
  const first = () => nodes(h.render()).find(n => n.type === 'li').props.children.props.onClick();
  first(); assert.deepEqual(visibility, [true]);
  h.render().props.onKeyDown({ key: 'Escape' }); assert.equal(visibility.at(-1), false);
  assert(!text(h.render()).includes('닫았습니다'));
  first(); h.render().props.onToggle({ currentTarget: { open: false } }); assert.equal(visibility.at(-1), false);
  assert.equal(h.calls.length, 0);
});

test('server rerenders never steal detail focus; a different detail gets focus once', () => {
  const h = harness(true); nodes(h.render()).find(n => n.type === 'li').props.children.props.onClick();
  let count = 0;
  for (let i = 0; i < 3; i++) nodes(h.render()).find(n => n.type === 'h2').props.ref({ focus: () => count++ });
  assert.equal(count, 1); h.click('목록으로');
  nodes(h.render()).find(n => n.type === 'li').props.children.props.onClick();
  nodes(h.render()).find(n => n.type === 'h2').props.ref({ focus: () => count++ }); assert.equal(count, 2);
});

test('Map historical executable claims are disclosed as history, never current status', () => {
  const h = harness(true), library = h.props.data.spaces[h.props.data.activeActorId].catalogLibrary;
  const map = library.maps.find((m: any) => m.userFacingStatus?.includes('바로 시작'));
  assert(map); h.click('Flow Map'); h.search(map.title); h.click(`${map.title} · ${map.flowSlugs.length}개 Flow`);
  const section = nodes(h.render()).find(n => n.props['aria-label'] === 'Flow Map 상세');
  const history = nodes(section).find(n => n.type === 'details' && text(n.props.children).includes('원본에 기록된 소개·상태'));
  assert(history); assert(!history.props.open); assert(text(history).includes(map.summary));
  assert(text(history).includes('현재 실행 가능 여부가 아닙니다'));
  const outside = nodes(section).filter(n => n.type === 'p' && !nodes(history).includes(n));
  assert(outside.every(n => !text(n).includes('바로 시작 가능'))); assert.equal(h.calls.length, 0);
});
