import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { buildCatalogContent, catalogContentFingerprint, inspectCatalogContentCapability } from '../../../lib/flow/integrated-poc/catalog-content';
import { canonicalJson } from '../../../lib/flow/integrated-poc/alpha-persistence/json';
import { isNativeCreatorCatalogContentSource } from '../../../lib/flow/integrated-poc/native-creator-document-contract';
import { buildCatalogLibrarySnapshot } from '../../../lib/flow/integrated-poc/catalog-library-source';
import { executeAlphaCreatorIntent } from '../../../lib/flow/integrated-poc/alpha-creator/dispatch-source';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { programErrorMessage } from '../../../lib/flow/integrated-poc/ui-contract';
const raw = readFileSync(new URL('./AlphaCatalogCopyActions.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ui.tsx', raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'AlphaCatalogCopyActions'); assert(fn);
const declarations = ast.statements.filter(n => ts.isVariableStatement(n)).map(n => n.getText(ast)).join('\n');
const compiled = ts.transpileModule(`${declarations}\nconst Component=${fn.getText(ast).replace(/^export\s+/, '')}`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const nodes = (v: any): any[] => !v ? [] : Array.isArray(v) ? v.flatMap(nodes) : typeof v === 'object' && 'props' in v ? [v, ...nodes(v.props.children)] : [];
const text = (v: any): string => typeof v === 'string' || typeof v === 'number' ? String(v) : Array.isArray(v) ? v.map(text).join('') : v?.props ? text(v.props.children) : '';
function harness(slug = 'portfolio-4week') {
  const slots: any[] = []; let cursor = 0, id = 0; const calls: any[] = [], navigation: any[] = [], locks: boolean[] = [];
  const library = buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z');
  const props: any = { data: createProgramData(), library, bundle: structuredClone(library.bundles.find(b => b.flow.slug === slug)), disabled: false, variant: false,
    navigate: (next: unknown) => navigation.push(next), onBusyChange: (busy: boolean) => locks.push(busy) };
  let respond = async (args: any[]): Promise<any> => { const result = args[1](props.data); if (result.ok) props.data = result.data; return result; };
  props.mutate = async (...args: any[]) => { calls.push(args); return respond(args); };
  const context = { React, buildCatalogContent, catalogContentFingerprint, canonicalJson, inspectCatalogContentCapability, isNativeCreatorCatalogContentSource, executeAlphaCreatorIntent, programErrorMessage,
    programId: () => `test-${++id}`, styles: {},
    useMemo: (fn: () => unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = fn(); return slots[i]; },
    useRef: (value: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
    useState: (value: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], (next: unknown) => { slots[i] = next; }]; },
  };
  const component = new Function('require', 'exports', ...Object.keys(context), `${compiled}; return Component;`)(createRequire(import.meta.url), {}, ...Object.values(context));
  const render = () => { cursor = 0; return component(props); };
  const button = (name: string) => { const result = nodes(render()).find(n => n.type === 'button' && text(n.props.children) === name); assert(result, name); return result; };
  const click = (name: string) => { const b = button(name); if (!b.props.disabled) b.props.onClick(); };
  const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
  return { props, calls, navigation, locks, render, button, click, settle, respond: (fn: typeof respond) => { respond = fn; } };
}
test('busy rejection retains copy preview and source, then explicit retry creates one copy', async () => {
  const h = harness(), before = canonicalJson(h.props.data), source = canonicalJson(h.props.bundle);
  h.respond(async () => ({ ok: false, reason: 'busy' }));
  h.click('제작 사본 내용 확인'); h.click('비공개 제작 사본으로 가져오기'); await h.settle();
  const slug = h.calls[0][2].alphaCreator.sourceSlug;
  assert.equal(canonicalJson(h.props.data), before); assert.equal(canonicalJson(h.props.bundle), source);
  assert.equal(h.navigation.length, 0); assert.deepEqual(h.locks, [true, false]);
  assert.equal(h.button('비공개 제작 사본으로 가져오기').props.disabled, false);
  assert(text(h.render()).includes(programErrorMessage('busy')));
  assert.match(text(h.render()), /이번 요청은 실행하지 않았습니다/); assert.doesNotMatch(text(h.render()), /확인하고 있습니다/);
  h.render(); await h.settle(); assert.equal(h.calls.length, 1);
  h.respond(async args => { const result = args[1](h.props.data); assert(result.ok); h.props.data = result.data; return result; });
  h.click('비공개 제작 사본으로 가져오기'); await h.settle();
  assert.equal(h.calls.length, 2); assert.equal(h.calls[1][2].alphaCreator.sourceSlug, slug);
  assert.equal(canonicalJson(h.props.bundle), source); assert.deepEqual(h.locks, [true, false, true, false]);
  h.button('제작 사본 열기'); assert(text(h.render()).includes('제작 사본을 저장했습니다'));
  assert(!text(h.render()).includes(programErrorMessage('busy')));
});

test('preview cancel and Escape never mutate; Escape closes preview before library detail', () => {
  const h = harness(), before = canonicalJson(h.props.data); h.click('제작 사본 내용 확인'); assert(text(h.render()).includes('6개 항목'));
  h.click('취소'); h.click('제작 사본 내용 확인'); let stopped = false;
  h.render().props.onKeyDown({ key: 'Escape', stopPropagation: () => { stopped = true; } });
  assert(stopped); assert.equal(h.calls.length, 0); assert.equal(canonicalJson(h.props.data), before);
});
test('explicit import uses locator only, preserves source, opens exact existing draft, never repeats import', async () => {
  const h = harness(), source = canonicalJson(h.props.bundle); h.click('제작 사본 내용 확인'); h.click('비공개 제작 사본으로 가져오기'); await h.settle();
  assert.equal(h.calls.length, 1); assert.deepEqual(Object.keys(h.calls[0][2].alphaCreator).sort(), ['draftId','now','sourceSlug','sourceVersionId','type']);
  const draftId = h.calls[0][2].alphaCreator.draftId; assert(text(h.render()).includes('제작 사본을 저장했습니다'));
  h.click('제작 사본 열기'); assert.deepEqual(h.navigation, [{view:'creator',id:draftId}]); assert.equal(h.calls.length, 1);
  assert.equal(canonicalJson(h.props.bundle), source); assert.deepEqual(h.locks, [true,false]);
});
test('disabled, busy and save failure protect the write boundary and retry path', async () => {
  const h = harness(); h.click('제작 사본 내용 확인'); h.props.disabled = true;
  h.button('비공개 제작 사본으로 가져오기').props.onClick(); assert.equal(h.calls.length,0); h.props.disabled=false;
  let release: (v: unknown) => void = () => {}; h.respond(() => new Promise(resolve => { release=resolve; }));
  const submit=h.button('비공개 제작 사본으로 가져오기'); submit.props.onClick(); submit.props.onClick(); assert.equal(h.calls.length,1);
  assert(h.button('취소').props.disabled); release({ok:false,reason:'conflict'}); await h.settle();
  assert(!text(h.render()).includes('제작 사본을 저장했습니다')); assert(!h.button('비공개 제작 사본으로 가져오기').props.disabled);
});
test('unsupported, archived, variants and mismatched source never offer import', () => {
  for(const slug of ['baby-food-menu-recipe','parent-care-routine']) { const h=harness(slug); if(!h.props.bundle)continue; assert(!nodes(h.render()).some(n=>n.type==='button')); assert.equal(h.calls.length,0); }
  const v=harness(); v.props.variant=true; assert(text(v.render()).includes('현재 작업 판본은 비교 열람만'));
  const changed=harness(); changed.props.bundle.items[0].title='변경된 원본'; assert(text(changed.render()).includes('원본과 제작용 원본이 달라'));
});
test('archived existing copy is neither silently duplicated nor reopened as active', async () => {
  const h=harness(); h.click('제작 사본 내용 확인'); h.click('비공개 제작 사본으로 가져오기'); await h.settle();
  const id=h.calls[0][2].alphaCreator.draftId; h.props.data.spaces[h.props.data.activeActorId].creatorWorkspace.library.records[id].status='archived';
  assert(text(h.render()).includes('보관된 제작 사본')); assert(!nodes(h.render()).some(n=>n.type==='button')); assert.equal(h.calls.length,1);
});
test('same-request recovery clears stale failure text once the saved copy is confirmed', async () => {
  const h=harness(); h.respond(async()=>({ok:false,reason:'recovery-required'}));
  h.click('제작 사본 내용 확인'); h.click('비공개 제작 사본으로 가져오기'); await h.settle();
  assert(!text(h.render()).includes('제작 사본을 저장했습니다'));
  const result=h.calls[0][1](h.props.data); assert(result.ok); h.props.data=result.data;
  assert(text(h.render()).includes('제작 사본을 저장했습니다')); h.button('제작 사본 열기');
  assert.equal(h.calls.length,1);
});
