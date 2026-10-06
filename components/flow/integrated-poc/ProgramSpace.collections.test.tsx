import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createDocumentCollectionsTrialData } from '../../../lib/flow/integrated-poc/document-collections-trial';
import { addProgramQuickTask } from '../../../lib/flow/integrated-poc/private-space';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { collectionDocumentIds, emptyDocumentCollections } from '../../../lib/flow/integrated-poc/document-collections';
import { validateProgramData } from '../../../lib/flow/integrated-poc/program-data';

const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodeWhere(predicate: (node: ts.Node) => boolean) {
  let found: ts.Node | undefined;
  const visit = (node: ts.Node) => { if (!found && predicate(node)) found = node; if (!found) ts.forEachChild(node, visit); };
  visit(ast); assert(found); return found;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`const fn = (${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  return new Function(...Object.keys(context), `${code}; return fn;`)(...Object.values(context));
}
const callback = (name: string, context: Record<string, unknown>) => evaluate(nodeWhere(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast), context);

test('collection first entry reuses only the host-specified active document without overriding explicit or saved position', () => {
  const data = createDocumentCollectionsTrialData(), space = data.spaces[data.activeActorId];
  const select = callback('initialProgramDocumentId', {});
  const quick = space.text.documents.find(doc => doc.title === '빠른 메모')!;
  const mode = { documentCollections: { state: emptyDocumentCollections(), initialWritingDocumentId: quick.id } };
  const first = { ...space, position: { ...space.position, documentId: null } };
  const original = JSON.stringify(first);
  assert.equal(select(mode, first), quick.id);
  assert.equal(select({}, first), '');
  assert.equal(select({ documentCollections: { state: emptyDocumentCollections() } }, first), '');
  assert.equal(select({ documentCollections: { initialWritingDocumentId: 'missing' } }, first), '');
  assert.equal(select({ ...mode, selectedDocumentId: 'explicit-missing' }, first), 'explicit-missing');
  assert.equal(select(mode, { ...first, position: { ...first.position, documentId: 'saved' } }), 'saved');
  assert.equal(select(mode, { ...first, archivedDocumentIds: [quick.id] }), '');
  assert.equal(select(mode, { ...first, documentTrash: { [quick.id]: {} } }), '');
  assert.equal(select(mode, { ...first, retentionDocuments: { parent: quick.id } }), '');
  assert.equal(select(mode, { ...first, text: { ...first.text, documents: first.text.documents.filter(doc => doc.id !== quick.id) } }), '');
  assert.equal(select(mode, { ...first, text: { ...first.text, documents: [...first.text.documents, { ...quick, id: 'same-title-other-id' }] } }), quick.id);
  assert.equal(select(mode, { ...first, text: { ...first.text, documents: first.text.documents.map(doc => doc.id === quick.id ? { ...doc, title: '이름 변경' } : doc) } }), quick.id);
  assert.match(readFileSync(new URL('./DocumentCollectionsLab.tsx', import.meta.url), 'utf8'), /row\.id === 'trial-quick-document'/);
  assert.equal(JSON.stringify(first), original);
});

test('today/week disclosure retains one mounted quick-add form and leaves existing non-collection entry open', () => {
  const detail = nodeWhere(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'details'
    && node.openingElement.attributes.getText(ast).includes('styles.quickDisclosure')) as ts.JsxElement;
  const open = detail.openingElement.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(ast) === 'open') as ts.JsxAttribute;
  const expression = (open.initializer as ts.JsxExpression).expression!.getText(ast);
  for (const period of ['today', 'week']) assert.equal(evaluate(expression, { collectionMode: {}, period }), false);
  for (const period of ['today', 'week', 'documents', 'all', 'undated']) assert.equal(evaluate(expression, { collectionMode: undefined, period }), true);
  for (const period of ['all', 'undated', 'month']) assert.equal(evaluate(expression, { collectionMode: {}, period }), true);
  let forms = 0;
  const visit = (node: ts.Node) => { if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'form') forms++; ts.forEachChild(node, visit); };
  visit(detail); assert.equal(forms, 1); assert.match(detail.getText(ast), /onSubmit={quickTask}/);
  assert(!detail.getText(ast).includes('key={period}'));
});

test('membership summary uses all links and keeps excluded-document status outside the collapsed settings', () => {
  const detail = nodeWhere(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'details'
    && node.openingElement.attributes.getText(ast).includes('styles.collectionDisclosure')) as ts.JsxElement;
  assert(!detail.openingElement.attributes.getText(ast).includes('open='));
  assert.match(detail.getText(ast), /state\.collections\.filter\(row => row\.documentIds\.includes\(selectedDoc\.id\)\)/);
  assert(!detail.getText(ast).includes('selectedCollection'));
  assert(detail.getText(ast).includes('체크를 빼도 원문과 할 일은 남습니다.'));
  assert(!detail.getText(ast).includes('이 문서는 선택한 모음에 없습니다.'));
  assert(source.includes('이 문서는 선택한 모음에 없습니다. 원문은 그대로 열려 있습니다.'));
});

test('successful collection period change closes the library only after input flush; refusal preserves it', async () => {
  for (const mode of ['collection', 'ordinary', 'failed-save', 'locked'] as const) {
    const calls: string[] = []; const inputLockCount = { current: mode === 'locked' ? 1 : 0 };
    const change = callback('changePeriod', { inputLockCount, collectionMode: mode === 'ordinary' ? undefined : {},
      today: '2026-10-06', lockInput: () => { calls.push('lock'); return () => calls.push('release'); },
      flushAllEditors: async () => { calls.push('flush'); return mode !== 'failed-save'; },
      setPeriod: (period: string) => calls.push(period), setLibraryOpen: (open: boolean) => calls.push(`library:${open}`),
      setDate: (date: string) => calls.push(date), setMessage: () => calls.push('message'), setTaskNotice: () => calls.push('notice') });
    const ok = await change('today');
    assert.equal(ok, mode === 'collection' || mode === 'ordinary');
    assert.equal(calls.includes('library:false'), mode === 'collection');
    if (mode === 'collection') assert(calls.indexOf('flush') < calls.indexOf('library:false'));
    if (mode === 'failed-save') assert(!calls.includes('today'));
    if (mode === 'locked') assert.deepEqual(calls, []);
  }
  assert.match(source, /directWriting={!!collectionMode}/);
});

test('production quick-add writes the explicitly chosen document, not a selected collection or a name-matched new document', async () => {
  let data = createDocumentCollectionsTrialData(); const actorId = data.activeActorId;
  const chosen = data.spaces[actorId].text.documents[1], prior = M.tasks(data.spaces[actorId].text).map(row => row.id);
  const beforeOther = JSON.stringify(data.spaces[actorId].text.documents[0]);
  let resets = 0, requests = 0, notice = '';
  const quickTask = callback('quickTask', { collectionMode: { state: emptyDocumentCollections() }, actorId, folderId: 'not-an-item-scope',
    quickDocuments: data.spaces[actorId].text.documents, addProgramQuickTask,
    FormData: class { get(key: string) { return ({ title: '명시 문서의 새 할 일', date: '2026-10-06', documentId: chosen.id } as Record<string,string>)[key]; } },
    base: (current: typeof data) => ({ actorId, expectedSpace: current.spaces[actorId], requestId: 'production-quick-add' }),
    run: async (_label: string, build: (current: typeof data) => ReturnType<typeof addProgramQuickTask>) => { requests++; const result = build(data); if (result.ok) data = result.data; return result; },
    setMessage: (message: string) => { notice = message; },
    createProgramDocument: () => { throw new Error('must-not-create-a-copy-or-guess-by-title'); },
  });
  await quickTask({ preventDefault() {}, currentTarget: { reset() { resets++; } } });
  assert(validateProgramData(data)); const added = M.tasks(data.spaces[actorId].text).filter(row => !prior.includes(row.id));
  assert.equal(added.length, 1); assert.equal(added[0].docId, chosen.id); assert.equal(added[0].date, '2026-10-06');
  assert.equal(added[0].scopeId, 'folder-unfiled'); assert.equal(JSON.stringify(data.spaces[actorId].text.documents[0]), beforeOther);
  assert.equal(requests, 1); assert.equal(resets, 1); assert.equal(notice, '');
});

test('a missing quick-add document retains input and never creates a guessed fallback', async () => {
  let writes = 0, resets = 0, message = '';
  const quickTask = callback('quickTask', { collectionMode: {}, quickDocuments: [],
    FormData: class { get(key: string) { return key === 'documentId' ? 'missing' : '입력'; } },
    run: () => { writes++; }, setMessage: (value: string) => { message = value; } });
  await quickTask({ preventDefault() {}, currentTarget: { reset() { resets++; } } });
  assert.equal(writes, 0); assert.equal(resets, 0); assert.match(message, /작성할 문서/);
});

test('changing a collection keeps rejected or composing input and does not assign an Item folder', async () => {
  for (const ready of [false, true]) {
    let selected = 'A', release = 0, message = '', mutations = 0;
    const change = callback('changeCollection', { inputLockCount: { current: 0 }, lockInput: () => () => { release++; },
      flushAllEditors: async () => ready, setCollectionId: (value: string) => { selected = value; }, setMessage: (value: string) => { message = value; },
      mutate: () => { mutations++; }, setFolderId: () => { throw new Error('scope-inheritance'); } });
    await change('B'); assert.equal(selected, ready ? 'B' : 'A'); assert.equal(release, 1); assert.equal(mutations, 0);
    assert.equal(!!message, !ready);
  }
});

test('production document list uses whole-document IDs while today/week query ignores collection and legacy Item scope', () => {
  const docs = [{ id: 'D', title: '원문', folderId: 'legacy-other', lines: [] }, { id: 'E', title: '다른 문서', folderId: 'collection-b', lines: [] }];
  const state = { version: 1 as const, collections: [{ id: 'B', title: '모음 B', documentIds: ['D'] }] };
  const listNode = nodeWhere(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === 'documentList') as ts.VariableDeclaration;
  const list = evaluate(listNode.initializer!.getText(ast), { docs, retainedIds: new Set(), space: { documentTrash: {}, archivedDocumentIds: [] }, showArchived: false,
    collectionMode: { state }, collectionId: 'B', collectionIds: collectionDocumentIds(state, ['B']), folderId: 'legacy-other', matchingDocumentIds: new Set(['E']), query: '', M });
  assert.deepEqual(list.map((doc: typeof docs[0]) => doc.id), ['D']);
  const queryNode = nodeWhere(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === 'executionQuery') as ts.VariableDeclaration;
  for (const collectionMode of [undefined, { state }]) {
    const query = evaluate(queryNode.initializer!.getText(ast), { collectionMode, folderId: 'legacy-other', period: 'today', date: '2026-10-06', today: '2026-10-06', query: '', includeHeldOccurrences: false, includeExcludedOccurrences: false, occurrencePage: 0 });
    assert.equal(query.folderId, collectionMode ? '' : 'legacy-other');
  }
});
