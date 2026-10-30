import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { PROGRAM_CATALOG_SLUGS } from '../../../lib/flow/integrated-poc/catalog';
import { buildCatalogContent } from '../../../lib/flow/integrated-poc/catalog-content';
import { isNativeCreatorCatalogContentSource } from '../../../lib/flow/integrated-poc/native-creator-document-contract';
import { executeAlphaCreatorIntent } from '../../../lib/flow/integrated-poc/alpha-creator/dispatch-source';
import { buildCatalogLibrarySnapshot } from '../../../lib/flow/integrated-poc/catalog-library-source';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { programErrorMessage } from '../../../lib/flow/integrated-poc/ui-contract';

const source = readFileSync(new URL('./AlphaCatalogContentImport.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('AlphaCatalogContentImport.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'AlphaCatalogContentImport');
assert(component && ts.isFunctionDeclaration(component));
const compiled = ts.transpileModule(`const Component = ${component.getText(ast).replace(/^export\s+/, '')};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const require = createRequire(import.meta.url);
const nodes = (value: any): any[] => !value ? [] : Array.isArray(value) ? value.flatMap(nodes)
  : typeof value === 'object' && 'props' in value ? [value, ...nodes(value.props.children)] : [];
const text = (value: any): string => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join('')
  : value && typeof value === 'object' ? text(value.props?.children) : typeof value === 'number' ? String(value) : '';

function harness() {
  const slots: any[] = []; let cursor = 0; let ids = 0;
  const calls: any[] = [], navigation: any[] = [];
  const props: any = { data: createProgramData(), sourceLibrary: buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z'), disabled: false, navigate: (route: unknown) => navigation.push(route) };
  let respond: (call: any) => Promise<any> = async () => ({ ok: true });
  props.mutate = async (label: string, action: any, metadata: any) => {
    const call = { label, action, metadata }; calls.push(call); return respond(call);
  };
  const context = {
    PROGRAM_CATALOG_SLUGS, buildCatalogContent, isNativeCreatorCatalogContentSource, executeAlphaCreatorIntent, programErrorMessage,
    programId: (prefix: string) => `${prefix}-test-${++ids}`, styles: new Proxy({}, { get: (_, key) => String(key) }),
    useMemo: (factory: () => unknown) => { const index = cursor++; if (!(index in slots)) slots[index] = factory(); return slots[index]; },
    useRef: (initial: unknown) => { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useState: (initial: unknown) => { const index = cursor++; if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value: unknown) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
  };
  const renderComponent = new Function('require', 'exports', ...Object.keys(context), `${compiled}; return Component;`)(require, {}, ...Object.values(context));
  const render = () => { cursor = 0; return renderComponent(props); };
  const button = (label: string, index = 0) => { const node = nodes(render()).filter(node => node.type === 'button' && text(node.props.children) === label)[index]; assert(node, label); return node; };
  const click = (label: string, index = 0) => { const node = button(label, index); if (!node.props.disabled) node.props.onClick(); };
  const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
  return { props, calls, navigation, render, button, click, settle, respond: (next: typeof respond) => { respond = next; } };
}

test('busy rejection keeps selected catalog content and retries only after explicit confirmation', async () => {
  const h = harness(), before = JSON.stringify(h.props.data);
  h.respond(async () => ({ ok: false, reason: 'busy' }));
  h.click('내용 확인'); h.click('비공개 제작 사본으로 가져오기'); await h.settle();
  const slug = h.calls[0].metadata.alphaCreator.sourceSlug;
  assert.equal(JSON.stringify(h.props.data), before); assert.equal(h.navigation.length, 0);
  assert.equal(h.button('비공개 제작 사본으로 가져오기').props.disabled, false);
  assert(nodes(h.render()).some(n => n.props['aria-label'] === '가져올 콘텐츠 확인'));
  assert(text(h.render()).includes(programErrorMessage('busy')));
  assert.match(text(h.render()), /이번 요청은 실행하지 않았습니다/); assert.doesNotMatch(text(h.render()), /확인하고 있습니다/);
  h.render(); await h.settle(); assert.equal(h.calls.length, 1);
  h.respond(async call => { const result = call.action(h.props.data); assert(result.ok); h.props.data = result.data; return result; });
  h.click('비공개 제작 사본으로 가져오기'); await h.settle();
  assert.equal(h.calls.length, 2); assert.equal(h.calls[1].metadata.alphaCreator.sourceSlug, slug);
  assert(!nodes(h.render()).some(n => n.props['aria-label'] === '가져올 콘텐츠 확인'));
  assert(text(h.render()).includes('제작 공간에 가져왔습니다.'));
  assert(!text(h.render()).includes(programErrorMessage('busy')));
});

test('catalog preview, original-source disclosure, cancel and Escape cause zero mutations', () => {
  const h = harness(); const before = JSON.stringify(h.props.data);
  h.click('내용 확인');
  assert(text(h.render()).includes('24개 항목'));
  assert(nodes(h.render()).some(node => node.type === 'section' && node.props['aria-label'] === '가져올 콘텐츠 확인'));
  const sourceLink = nodes(h.render()).find(node => node.type === 'a'); assert(sourceLink);
  assert.equal(text(sourceLink.props.children), '원래 출처 열기'); assert.equal(sourceLink.props.target, '_blank');
  assert.equal(sourceLink.props.rel, 'noopener noreferrer');
  h.click('취소'); assert(!nodes(h.render()).some(node => node.type === 'section'));
  h.click('내용 확인', 1); assert(text(h.render()).includes('출처 재검토가 필요한 콘텐츠'));
  h.render().props.onKeyDown({ key: 'Escape' }); assert(!nodes(h.render()).some(node => node.type === 'section'));
  assert.equal(h.calls.length, 0); assert.equal(JSON.stringify(h.props.data), before);
});

test('disabled entry and disabled apply do not call mutate even through a retained apply handler', async () => {
  const h = harness(); h.props.disabled = true;
  assert(h.button('내용 확인').props.disabled); h.click('내용 확인'); assert.equal(h.calls.length, 0);
  h.props.disabled = false; h.click('내용 확인'); h.props.disabled = true;
  const apply = h.button('비공개 제작 사본으로 가져오기'); assert(apply.props.disabled);
  apply.props.onClick(); await h.settle(); assert.equal(h.calls.length, 0);
});

test('busy double click and Escape cannot dispatch twice or discard the in-flight selection', async () => {
  const h = harness(); let release: (value: unknown) => void = () => {};
  h.respond(() => new Promise(resolve => { release = resolve; })); h.click('내용 확인');
  const apply = h.button('비공개 제작 사본으로 가져오기'); apply.props.onClick(); apply.props.onClick();
  assert.equal(h.calls.length, 1); assert(h.button('가져오는 중…').props.disabled); assert(h.button('취소').props.disabled);
  h.render().props.onKeyDown({ key: 'Escape' }); assert(nodes(h.render()).some(node => node.type === 'section'));
  release({ ok: true }); await h.settle(); assert(!nodes(h.render()).some(node => node.type === 'section'));
});

test('successful apply sends locator-only alphaCreator intent and executes the real content transition', async () => {
  const h = harness(); h.respond(async call => {
    const result = call.action(h.props.data); assert(result.ok, JSON.stringify(result)); return { ok: true };
  }); h.click('내용 확인'); h.click('비공개 제작 사본으로 가져오기'); await h.settle();
  assert.equal(h.calls.length, 1); const metadata = h.calls[0].metadata;
  assert.deepEqual(Object.keys(metadata), ['alphaCreator']);
  assert.deepEqual(Object.keys(metadata.alphaCreator).sort(), ['draftId', 'now', 'sourceSlug', 'sourceVersionId', 'type']);
  assert.equal(metadata.alphaCreator.type, 'catalog-content-import'); assert.equal(metadata.alphaCreator.sourceSlug, PROGRAM_CATALOG_SLUGS[0]);
  assert(!JSON.stringify(metadata).includes('documentJson')); assert(!JSON.stringify(metadata).includes('contentJson'));
  assert(text(h.render()).includes('사용 기록은 포함하지 않았고, 아직 공개하지 않았습니다.'));
});

for (const failure of ['refused', 'exception']) test(`catalog ${failure} retains preview and enables retry`, async () => {
  const h = harness(); h.respond(async () => { if (failure === 'exception') throw Error('lost'); return { ok: false, reason: 'conflict' }; });
  h.click('내용 확인'); h.click('비공개 제작 사본으로 가져오기'); await h.settle();
  assert(nodes(h.render()).some(node => node.type === 'section')); assert.equal(h.button('비공개 제작 사본으로 가져오기').props.disabled, false);
  assert(nodes(h.render()).some(node => node.props.role === 'status' && node.props['aria-live'] === 'polite'));
  h.respond(async () => ({ ok: true })); h.click('비공개 제작 사본으로 가져오기'); await h.settle();
  assert.equal(h.calls.length, 2); assert(!nodes(h.render()).some(node => node.type === 'section'));
});

test('existing content opens its creator draft instead of importing again', async () => {
  const h = harness(); h.click('내용 확인'); h.click('비공개 제작 사본으로 가져오기');
  const result = h.calls[0].action(h.props.data); assert(result.ok, JSON.stringify(result));
  // Use the actual transition result rather than inventing a source-marker fixture.
  h.props.data = result.data;
  await h.settle();
  const imported = h.button('가져온 콘텐츠 열기'); assert.equal(imported.props.disabled, false); imported.props.onClick();
  assert.deepEqual(h.navigation, [{ view: 'creator', id: h.calls[0].metadata.alphaCreator.draftId }]);
  assert.equal(h.calls.length, 1);
});
