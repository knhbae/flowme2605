import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (node: ts.Node) => boolean) {
  let result: ts.Node | undefined;
  function visit(node: ts.Node) { if (predicate(node)) result ??= node; ts.forEachChild(node, visit); }
  visit(ast); assert(result); return result;
}
const effect = find(node => ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect'
  && node.arguments[0]?.getText(ast).includes('const panel = libraryDialog.current')) as ts.CallExpression;
function compile(text: string) { return ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText; }
function execute(name: string, context: Record<string, unknown>) {
  const declaration = find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  return new Function(...Object.keys(context), `${compile(declaration.getText(ast))}; return ${name};`)(...Object.values(context));
}
function harness() {
  const events: string[] = [];
  class Element {
    isConnected = true; visible = true;
    getClientRects() { return this.visible ? [{}] : []; }
    focus() { events.push('focus'); document.activeElement = this; }
  }
  class Area extends Element {
    value = '업무 메모\n- [ ] 자료 정리'; readOnly = false;
    selectionStart = 3; selectionEnd = 8; selectionDirection = 'backward'; scrollTop = 76; scrollLeft = 2;
    setSelectionRange(start: number, end: number, direction: string) {
      events.push('selection'); this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction;
    }
  }
  const area = new Area(), other = new Element(), toggle = new Element(), search = new Element();
  const body = new Element(), document = { activeElement: area as Element, body };
  const panel = { open: false,
    contains: (element: Element) => element === search,
    showModal() { this.open = true; document.activeElement = search; events.push('show'); },
    close() { this.open = false; document.activeElement = area; events.push('close'); },
  };
  const libraryReturn = { current: null as any }, libraryComposing = { current: false }, inputLockCount = { current: 0 };
  const selectedRef = { current: 'doc-one' }, presentation = { current: { period: 'documents', folderId: '' } };
  const dataRef = { current: { activeActorId: 'fixture-owner' } };
  const pendingSourceFocus = { current: null as any };
  const messages: string[] = [];
  let libraryOpen = false;
  const context: Record<string, unknown> = {
    HTMLElement: Element, HTMLTextAreaElement: Area, document, actorId: 'fixture-owner', root: { current: { contains: (element: Element) => element === area } },
    libraryReturn, libraryComposing, inputLockCount, selectedRef, presentation, dataRef, pendingSourceFocus,
    libraryDialog: { current: panel }, libraryToggle: { current: toggle },
    setLibraryOpen: (value: boolean) => { libraryOpen = value; }, setMessage: (value: string) => messages.push(value),
    cancelLibraryReveal: () => events.push('cancel-reveal'),
    requestAnimationFrame: () => { events.push('source-frame'); return 1; },
  };
  const remember = execute('rememberFindFocus', context);
  context.rememberFindFocus = remember;
  const open = execute('openFindPanel', context);
  const renderEffect = () => new Function(...Object.keys(context), 'libraryOpen',
    `${compile(`const callback = ${effect.arguments[0].getText(ast)};`)} return callback();`)(...Object.values(context), libraryOpen);
  return { area, other, search, document, panel, events, libraryReturn, libraryComposing, inputLockCount,
    selectedRef, presentation, dataRef, pendingSourceFocus, messages, remember, open, renderEffect,
    close: () => { libraryOpen = false; renderEffect(); }, isOpen: () => libraryOpen };
}

test('find open/close restores the same native editor selection and scroll without reinstalling input', () => {
  const h = harness(), original = h.area.value;
  h.open(); h.renderEffect(); assert(h.panel.open); assert.equal(h.libraryReturn.current.area, h.area);
  h.area.selectionStart = 0; h.area.selectionEnd = 0; h.area.scrollTop = 0;
  h.close(); assert.equal(h.document.activeElement, h.area); assert.equal(h.area.value, original);
  assert.deepEqual([h.area.selectionStart, h.area.selectionEnd, h.area.selectionDirection, h.area.scrollTop, h.area.scrollLeft], [3, 8, 'backward', 76, 2]);
  assert.deepEqual(h.events, ['cancel-reveal', 'show', 'close', 'focus', 'selection']);
});

test('composition or active save lock refuses find before autofocus and preserves input', () => {
  for (const blocked of ['composition', 'lock']) {
    const h = harness(); if (blocked === 'composition') h.libraryComposing.current = true; else h.inputLockCount.current = 1;
    h.remember(); h.open(); h.renderEffect();
    assert.equal(h.isOpen(), false); assert.equal(h.panel.open, false); assert.equal(h.libraryReturn.current, null);
    assert.equal(h.document.activeElement, h.area); assert(h.messages[0].includes('입력은 그대로')); assert.deepEqual(h.events, []);
  }
});

test('composition starting before the modal effect cancels opening', () => {
  const h = harness(); h.open(); h.libraryComposing.current = true; h.renderEffect();
  assert.equal(h.isOpen(), false); assert.equal(h.panel.open, false); assert(!h.events.includes('show'));
});

test('close never steals focus after document, actor, view, folder, raw, readonly or focus ownership changes', () => {
  for (const changed of ['document', 'actor', 'period', 'folder', 'raw', 'readonly', 'focus', 'disconnected', 'hidden', 'composition']) {
    const h = harness(); h.open(); h.renderEffect();
    if (changed === 'document') h.selectedRef.current = 'other-doc';
    if (changed === 'actor') h.dataRef.current.activeActorId = 'other-owner';
    if (changed === 'period') h.presentation.current.period = 'today';
    if (changed === 'folder') h.presentation.current.folderId = 'other-folder';
    if (changed === 'raw') h.area.value += '\n새 입력';
    if (changed === 'readonly') h.area.readOnly = true;
    if (changed === 'focus') h.document.activeElement = h.other;
    if (changed === 'disconnected') h.area.isConnected = false;
    if (changed === 'hidden') h.area.visible = false;
    if (changed === 'composition') h.libraryComposing.current = true;
    h.close(); assert(!h.events.includes('selection'), changed); assert(!h.events.includes('focus'), changed);
    assert.equal(h.libraryReturn.current, null, changed);
  }
});

test('explicit source navigation owns focus instead of drawer cancellation', () => {
  const h = harness(); h.open(); h.renderEffect(); h.libraryReturn.current = null;
  h.pendingSourceFocus.current = { documentId: 'doc-one', taskId: 'item', findPanel: h.panel };
  h.close(); assert.equal(h.pendingSourceFocus.current.managedReturnFocus, h.area); assert(!h.events.includes('focus'));
  assert.equal(h.pendingSourceFocus.current.findPanel, undefined);
  const open = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'openDocument').getText(ast);
  assert(open.includes('libraryReturn.current = null;'));
  assert(open.indexOf('libraryReturn.current = null;') > open.indexOf('prepareDocumentScopeChange'));
  assert(open.includes('writingLineId: taskId'));
  assert(open.includes('if (pendingSourceFocus.current.findPanel?.open || inputLockCount.current > 0) return;'));
});

test('native modal return is not granted to an unrelated request or unowned focus', () => {
  for (const changed of ['request', 'panel', 'view', 'actor', 'focus']) {
    const h = harness(); h.open(); h.renderEffect(); h.libraryReturn.current = null;
    const pending = { documentId: changed === 'request' ? 'other-doc' : 'doc-one', taskId: 'item',
      findPanel: changed === 'panel' ? {} : h.panel, managedReturnFocus: undefined };
    h.pendingSourceFocus.current = pending;
    if (changed === 'view') h.presentation.current.period = 'today';
    if (changed === 'actor') h.dataRef.current.activeActorId = 'other-owner';
    if (changed === 'focus') h.document.activeElement = h.other;
    h.close(); assert.equal(pending.managedReturnFocus, undefined, changed);
  }
});

test('the same source request survives removal of the clicked result before native modal close', () => {
  const h = harness(); h.open(); h.renderEffect(); h.libraryReturn.current = null;
  const request = { documentId: 'doc-one', taskId: 'item', findPanel: h.panel, findSourceOwner: h.search, managedReturnFocus: undefined };
  h.pendingSourceFocus.current = request; h.search.isConnected = false; h.document.activeElement = h.document.body;
  h.close(); assert.equal(request.managedReturnFocus, h.area); assert.equal(request.findPanel, undefined);
  assert(h.events.includes('source-frame')); assert(!h.events.includes('selection'));
});

test('body focus alone never authorizes a connected result or another focus owner', () => {
  for (const changed of ['connected', 'other-focus']) {
    const h = harness(); h.open(); h.renderEffect(); h.libraryReturn.current = null;
    const request = { documentId: 'doc-one', taskId: 'item', findPanel: h.panel, findSourceOwner: h.search, managedReturnFocus: undefined };
    h.pendingSourceFocus.current = request;
    h.search.isConnected = changed === 'connected'; h.document.activeElement = changed === 'connected' ? h.document.body : h.other;
    h.close(); assert.equal(request.managedReturnFocus, undefined, changed); assert(!h.events.includes('source-frame'), changed);
  }
});

test('find remains available in every private view and keeps current search/period contracts', () => {
  assert.match(source, /onClick=\{openFindPanel\}>글 찾기/);
  assert.match(source, /aria-label="현재 보기의 할 일 검색 결과"/);
  assert(source.includes('executionRows.map(entry => {'));
  assert(source.includes('entry.row.sourceItemRef'));
  assert(source.includes('openDocument(source.documentId, source.lineId)'));
  assert.match(source, /onClick=\{\(\) => setQuery\(''\)\}>검색 지우기/);
  assert.match(source, /onChange=\{event => \{ void changePeriod\(event.target.value as ProgramPeriod\); \}\}/);
  const open = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'openFindPanel').getText(ast);
  assert(!/setPeriod|setSelected|mutate|run\(/.test(open));
});

test('stored document title and raw preview stay separate, and hidden editors remain retained', () => {
  assert.match(source, /\{doc.title\}<small>\{\(M.raw\(doc\)/);
  assert.match(source, /data-program-document=\{id\}/);
  assert(source.includes("<div hidden={period !== 'documents'}>"));
  assert(source.includes('hidden={selected !== id} data-program-document={id}'));
  assert.match(source, /onRegisterDraft=\{read => \{ draftReaders.current\[id\] = read;/);
  assert.match(source, /onRegisterInputLock=\{lock => \{ inputLocks.current\[id\] = lock;/);
});
