import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';

// R8b review A2: two focus handoffs that end at the document sheet. These run the real
// effect bodies from ProgramSpace.tsx against a small fake DOM, in commit order.
const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
function effect(marker: string) {
  const tree = ts.createSourceFile('x.tsx', space, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useEffect') {
      const body = node.arguments[0]?.getText(tree) ?? '';
      if (body.includes(marker)) found.push(body);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.equal(found.length, 1, marker);
  return found[0];
}
function run(body: string, scope: Record<string, unknown>) {
  const code = ts.transpileModule('const extracted = (' + body + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return (new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as () => unknown)();
}
type Fake = { name: string; [key: string]: unknown };
function fakeDocument() {
  const doc = { body: { name: 'body' } as Fake, activeElement: null as Fake | null };
  const element = (name: string, extra: Record<string, unknown> = {}): Fake =>
    ({ name, isConnected: true, readOnly: false, getClientRects: () => [{}], focus() { doc.activeElement = this as Fake; }, ...extra });
  return { doc, element };
}
function frames() {
  const queue: Array<() => void> = [];
  return { requestAnimationFrame: (callback: () => void) => queue.push(callback), cancelAnimationFrame: () => {}, flush: () => queue.splice(0).forEach(callback => callback()) };
}

test('＋ 새 글 in the sheet: once the sheet closes onto its opener, the new document takes focus', () => {
  const attempt = (focusInSheet: 'new button' | 'search' | 'body') => {
    const { doc, element } = fakeDocument(), raf = frames();
    const title = element('title ▾'), sheetNew = element('＋ 새 글'), search = element('search'), area = element('new document');
    doc.activeElement = focusInSheet === 'new button' ? sheetNew : focusInSheet === 'search' ? search : doc.body;
    // A modal dialog's close() restores the element focused before showModal: the title ▾.
    const panel = { open: true, contains: (node: unknown) => node === sheetNew || node === search, close() { this.open = false; doc.activeElement = title; } };
    const request = { id: 'new', actorId: 'me', focusOwner: sheetNew };
    const scope = {
      document: doc, ...raf, writingFocus: request, writingFocusRef: { current: request }, selected: 'new', actorId: 'me', period: 'documents',
      root: { current: { querySelector: () => area } }, dataRef: { current: { activeActorId: 'me' } }, setWritingFocus: () => {},
      libraryDialog: { current: panel }, libraryOpen: false, libraryComposing: { current: false }, setLibraryOpen: () => {}, noteFindMenu: { current: null },
      libraryReturn: { current: { actorId: 'me', documentId: 'old', period: 'documents', folderId: '', element: title, area: null } },
      pendingSourceFocus: { current: null }, selectedRef: { current: 'new' }, presentation: { current: { period: 'documents', folderId: '' } },
      libraryToggle: { current: null }, noteFindMenuSummary: { current: null },
    };
    // One commit sets writingFocus, the new selection and libraryOpen=false; effects run in declaration order.
    run(effect('writingFocus.focusOwner'), scope);
    run(effect('panel.close()'), scope);
    raf.flush();
    return doc.activeElement?.name;
  };
  assert.equal(attempt('new button'), 'new document');
  // A disabled-while-saving button can drop focus to body; that is still this request.
  assert.equal(attempt('body'), 'new document');
  // The user moved within the sheet while the document was being made: leave focus alone.
  assert.equal(attempt('search'), 'title ▾');
});

test('＋ 새 글 outside the sheet keeps the old rule: only its own button or body hands focus on', () => {
  const { doc, element } = fakeDocument(), raf = frames();
  const button = element('새 글'), other = element('other'), area = element('new document');
  const request = { id: 'new', actorId: 'me', focusOwner: button };
  const scope = { document: doc, ...raf, writingFocus: request, selected: 'new', actorId: 'me', period: 'documents',
    root: { current: { querySelector: () => area } }, dataRef: { current: { activeActorId: 'me' } }, setWritingFocus: () => {} };
  doc.activeElement = button; run(effect('writingFocus.focusOwner'), scope); raf.flush();
  assert.equal(doc.activeElement?.name, 'new document');
  doc.activeElement = other; run(effect('writingFocus.focusOwner'), scope); raf.flush();
  assert.equal(doc.activeElement?.name, 'other');
});

test('a folder chosen in the sheet on a phone reveals its editor again, with the R8b title ▾ as the opener', () => {
  const attempt = (host: boolean) => {
    const { doc, element } = fakeDocument(), raf = frames();
    const title = element('title ▾'), toggle = element('글 찾기'), select = element('folder select');
    let revealed = 0;
    const area = element('folder editor line', { getBoundingClientRect: () => ({ top: 2000, bottom: 2100 }) });
    const editor = { getClientRects: () => [{}], querySelectorAll: () => [area], scrollIntoView: () => { revealed++; } };
    const documentHost = { dataset: { programDocument: 'doc' }, querySelector: () => editor };
    const request = { epoch: 0, documentId: 'doc', folderId: 'folder', focusOwner: select };
    doc.activeElement = host ? title : toggle; // the sheet's close restored its opener
    const scope = {
      document: doc, ...raf, libraryHandoff: request, libraryReveal: { current: { epoch: 0, frame: null, request, committedRequest: null } },
      libraryOpen: false, period: 'documents', selected: 'doc', folderId: 'folder',
      inputLockCount: { current: 0 }, dirty: { current: {} }, recurrencePorts: { current: {} },
      props: { hostMainTabs: host, canContinueWholeDocument: () => true }, window: { matchMedia: () => ({ matches: true }), innerHeight: 800 },
      selectedRef: { current: 'doc' }, presentation: { current: { period: 'documents', folderId: 'folder' } },
      // R8b's host renders no 글 찾기 button in the writing view: only the title ▾ opens the sheet.
      libraryToggle: { current: host ? null : toggle }, titleToggle: { current: host ? title : null },
      root: { current: { getClientRects: () => [{}], querySelectorAll: () => [documentHost] } },
    };
    run(effect('libraryReveal.current.committedRequest = request'), scope);
    raf.flush();
    return { revealed, focus: doc.activeElement?.name };
  };
  // Focus stays on the opener so the phone keyboard does not open; the editor scrolls into view.
  assert.deepEqual(attempt(true), { revealed: 1, focus: 'title ▾' });
  assert.deepEqual(attempt(false), { revealed: 1, focus: '글 찾기' });
});

test('the title ▾ carries its own ref; the 글 찾기 ref stays on the finder button only', () => {
  assert(/className=\{styles\.titleButton\}[^>]*ref=\{titleToggle\}|ref=\{titleToggle\}[^>]*className=\{styles\.titleButton\}/.test(space));
  assert.equal(space.match(/ref=\{libraryToggle\}/g)?.length, 1);
});
