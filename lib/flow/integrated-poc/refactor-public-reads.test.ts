import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function tree(file: string) { return ts.createSourceFile(file, readFileSync(new URL('../../../components/flow/integrated-poc/' + file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function expression(file: string, name: string, contains = '') {
  const source = tree(file), found: string[] = [];
  const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(source) === name && node.initializer) {
    const text = node.initializer.getText(source); if (text.includes(contains)) found.push(text);
  } ts.forEachChild(node, visit); }; visit(source); assert.equal(found.length, 1, file + ':' + name); return found[0];
}
function run<T>(source: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const value = (' + source + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), code + ';return value;')(...Object.values(scope)) as T;
}

test('hidden discovery list never reads copies, link matches, sort input or card rows', () => {
  const forbidden = () => { throw Error('hidden display read'); }, data = new Proxy({}, { get: forbidden });
  assert.equal(run<Set<string>>(expression('ProgramDiscovery.tsx', 'copies'), { active: false, privateSpace: data, programLiveCopies: forbidden }).size, 0);
  assert.deepEqual(run(expression('ProgramDiscovery.tsx', 'linkMatches'), { active: false, linkQuery: 'https://example.invalid/', data, programFlowsByLink: forbidden }), []);
  assert.deepEqual(run(expression('ProgramDiscovery.tsx', 'visible'), { active: false, linkQuery: 'https://example.invalid/', linkMatches: data, programSortFlowsByRecent: forbidden, flows: data, state: data }), []);
});

for (const active of [false, true]) for (const sheetOpen of [false, true]) test(`import preview has only its visible open-sheet consumer (${active}/${sheetOpen})`, () => {
  let reads = 0; const expected = { dated: [], repeats: [], undated: { count: 0 } };
  const result = run(expression('ProgramDiscovery.tsx', 'preview', 'programImportPreview'), {
    active, sheetOpen, importDestination: 'new', storedCopy: null, version: {}, useItemIds: [], detail: { anchor: null },
    sheetRepeats: [], today: '2026-11-14', repeatChoice: {}, recurrenceStarts: {},
    programImportPreview: () => { reads++; return expected; },
  });
  assert.equal(reads, active && sheetOpen ? 1 : 0); assert.equal(result, active && sheetOpen ? expected : null);
});

test('hidden detail skips private progress read; visible detail keeps the exact reader result', () => {
  for (const active of [false, true]) {
    let reads = 0; const expected = {};
    const result = run(expression('ProgramDiscovery.tsx', 'progress', 'programFlowProgress'), {
      active, existingCopy: { documentId: 'd' }, flow: { archived: false, id: 'flow' }, privateSpace: { archivedDocumentIds: [] },
      data: {}, actorId: 'owner', today: '2026-11-14', programFlowProgress: () => { reads++; return expected; },
    }); assert.equal(reads, active ? 1 : 0); assert.equal(result, active ? expected : null);
  }
});

for (const active of [false, true]) for (const view of ['community', 'activity']) for (const selectedPostId of [undefined, 'detail']) test(`only a visible community list filters public posts (${active}/${view}/${!!selectedPostId})`, () => {
  let reads = 0;
  const data = { public: { get posts() { reads++; return [
    { id: 'old', deleted: false, kind: 'question', title: '합성', body: '질문', topic: '', createdAt: '2026-11-13' },
    { id: 'new', deleted: false, kind: 'question', title: '합성', body: '질문', topic: '', createdAt: '2026-11-14' },
    { id: 'deleted', deleted: true, kind: 'question', title: '합성', body: '질문', topic: '', createdAt: '2026-11-15' },
  ]; } } };
  const result = run<{ id: string }[]>(expression('ProgramCommunity.tsx', 'posts'), { active, view, selectedPostId, data, kind: 'all', query: '합성' });
  const needed = active && view === 'community' && !selectedPostId;
  assert.equal(reads, needed ? 1 : 0); assert.deepEqual(result.map(post => post.id), needed ? ['new', 'old'] : []);
});

test('host visibility props match hidden wrappers without replacing component keys or input-owner props', () => {
  const source = tree('AlphaWorkspace.tsx'), found = new Map<string, ts.JsxAttributes>();
  const visit = (node: ts.Node) => { if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))
    && ['ProgramDiscovery', 'ProgramCommunity'].includes(node.tagName.getText(source))) found.set(node.tagName.getText(source), node.attributes); ts.forEachChild(node, visit); }; visit(source);
  assert.equal(found.size, 2);
  for (const [name, attributes] of found) {
    const attr = (key: string) => attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText(source) === key) as ts.JsxAttribute;
    const active = attr('active'); assert(active && ts.isJsxExpression(active.initializer!) && active.initializer.expression);
    for (const view of ['space', 'discover', 'flow', 'community', 'activity', 'legacy']) {
      const expected = name === 'ProgramDiscovery' ? ['discover', 'flow'].includes(view) : ['community', 'activity'].includes(view);
      assert.equal(run(active.initializer.expression.getText(source), { destination: { view } }), expected);
    }
    assert.equal(attr('data').initializer!.getText(source), '{data}', 'hidden input owners still receive fresh data');
    assert(attr('key').initializer!.getText(source).includes('session.userId}:${presentation}'), 'visibility must not change owner key');
  }
});
