import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { restoreProgramDialogFocus, restoreProgramWritingReturn, type ProgramWritingReturn } from './dialog-return-focus';
import { programReviewOriginReason } from './review-return';

// N5 FC7: a long document's caret → title ▾ → 준비된 Flow에서 시작 → a Flow → ← Flow 찾기 → ← 내 문서. The editor was hidden
// meanwhile and lost its scroll (S4 v12: 519 → 337 at 390, 389 → 207 at 1280); the return now brings caret and scroll back.

const DOC = 'doc-1', OTHER = 'doc-2', ACTOR = 'actor-1';
const RAW = Array.from({ length: 30 }, (_, index) => `줄 ${index + 1}`).join('\n');

class FakeElement { parentElement = null; isConnected = true; closest() { return null; } matches() { return false; } getClientRects() { return [{}]; } }
class FakeTextArea extends FakeElement {}

/** A page with one editor. `maxTop` is how far the editor scrolls now: on a phone the writing bar comes a frame after the
 *  focus and shortens the editor, so until `barShown()` the editor's limit is lower (390: 812 − 358 = 454, then 532). */
function page(width: 390 | 1280) {
  const frames: (() => void)[] = [];
  const doc = { activeElement: null as unknown, body: {}, defaultView: null as unknown };
  const view = {
    scrollX: 0, scrollY: 0, maxY: 400,
    scrollTo({ left, top }: { left: number; top: number }) { view.scrollX = left; view.scrollY = Math.min(top, view.maxY); },
    requestAnimationFrame(callback: () => void) { frames.push(callback); return frames.length; },
  };
  doc.defaultView = view;
  // 812 high; 358 shown without the bar (1280 always), 280 with it (390 once the bar is there).
  let top = 0, maxTop = 454;
  const area = Object.assign(new FakeTextArea(), {
    id: `program-text-${encodeURIComponent(DOC)}`, value: RAW, readOnly: false, scrollLeft: 0,
    selectionStart: 0, selectionEnd: 0, selectionDirection: 'none' as 'forward' | 'backward' | 'none', ownerDocument: doc,
    setSelectionRange(start: number, end: number, direction: 'forward' | 'backward' | 'none' = 'none') { area.selectionStart = start; area.selectionEnd = end; area.selectionDirection = direction; },
    focus() { doc.activeElement = area; },
  });
  Object.defineProperty(area, 'scrollTop', { get: () => top, set: (value: number) => { top = Math.max(0, Math.min(value, maxTop)); } });
  return { area: area as unknown as HTMLTextAreaElement & { focus(): void }, raw: area as typeof area & { scrollTop: number }, view, doc, frames,
    barShown: () => { if (width === 390) maxTop = 532; },
    /** Run the frames queued so far (a frame may queue the next one). */
    frame: () => { for (const callback of frames.splice(0)) callback(); } };
}

const left = (area: HTMLTextAreaElement, pageX = 0, pageY = 0, top = 467): ProgramWritingReturn =>
  ({ documentId: DOC, raw: RAW, area, start: 379, end: 379, direction: 'none', top, left: 0, pageX, pageY });

test('FC7 1280: the same editor, text and focus get caret, editor scroll and page scroll back', () => {
  const p = page(1280); p.area.focus(); p.raw.scrollTop = 207; p.view.scrollY = 0;
  assert.equal(restoreProgramWritingReturn(left(p.area, 0, 0, 389)), true);
  assert.deepEqual([p.area.selectionStart, p.area.selectionEnd, p.area.scrollTop, p.view.scrollY], [379, 379, 389, 0]);
  p.frame(); assert.equal(p.frames.length, 0, 'nothing left to place again');
});

test('FC7 390: a scroll the editor clamped before the writing bar came is placed again the next frame, page too', () => {
  const p = page(390); p.area.focus(); p.raw.scrollTop = 337; p.view.scrollY = 70;
  assert.equal(restoreProgramWritingReturn(left(p.area, 0, 0, 467)), true);
  assert.equal(p.area.scrollTop, 454, 'clamped by the taller, bar-less editor');
  assert.equal(p.view.scrollY, 0);
  p.barShown(); p.frame();
  assert.deepEqual([p.area.selectionStart, p.area.scrollTop, p.view.scrollY], [379, 467, 0]);
  p.frame(); assert.equal(p.frames.length, 0);
});

test('FC7 390: a caret or scroll the person moved before that frame stays theirs', () => {
  const moved = page(390); moved.area.focus();
  restoreProgramWritingReturn(left(moved.area));
  moved.area.setSelectionRange(10, 10); moved.barShown(); moved.frame();
  assert.deepEqual([moved.area.selectionStart, moved.area.scrollTop], [10, 454]);
  const scrolled = page(390); scrolled.area.focus();
  restoreProgramWritingReturn(left(scrolled.area));
  scrolled.raw.scrollTop = 100; scrolled.barShown(); scrolled.frame();
  assert.equal(scrolled.area.scrollTop, 100);
});

test('FC7: another text, another document\'s editor, no focus, read-only or a removed editor keep the focus-only return', () => {
  const cases: [string, (p: ReturnType<typeof page>) => ProgramWritingReturn | undefined][] = [
    ['text changed', p => { p.raw.value = RAW + '\n추가'; return left(p.area); }],
    ['other document', p => ({ ...left(p.area), documentId: OTHER })],
    ['focus elsewhere', p => { p.doc.activeElement = p.doc.body; return left(p.area); }],
    ['read-only', p => { p.raw.readOnly = true; return left(p.area); }],
    ['removed', p => { p.raw.isConnected = false; return left(p.area); }],
    ['nothing kept', () => undefined],
  ];
  for (const [name, make] of cases) {
    const p = page(1280); p.area.focus(); p.raw.scrollTop = 207; p.raw.selectionStart = p.raw.selectionEnd = 5; p.view.scrollY = 30;
    assert.equal(restoreProgramWritingReturn(make(p)), false, name);
    assert.deepEqual([p.area.scrollTop, p.area.selectionStart, p.view.scrollY, p.frames.length], [207, 5, 30, 0], name);
  }
});

// The host's own return: AlphaWorkspace's openFlowsFromDocument and returnFromFlows, run as written.
const workspace = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8');
const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
function source(text: string, name: string, match: (node: ts.Node) => boolean) {
  const tree = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), found: ts.Node[] = [];
  const visit = (node: ts.Node) => { if (match(node)) found.push(node); ts.forEachChild(node, visit); };
  visit(tree); assert.equal(found.length, 1, name); return found[0].getText(tree);
}
const declared = (text: string, name: string, fn: string) => source(text, name, node => ts.isFunctionDeclaration(node) && node.name?.text === fn);
const js = (code: string) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.Preserve } }).outputText;
const hostSource = js(`${declared(workspace, 'AlphaWorkspace.tsx', 'openFlowsFromDocument')}\n${declared(workspace, 'AlphaWorkspace.tsx', 'returnFromFlows')}`);

function data(raw = RAW, actor = ACTOR) {
  return { activeActorId: actor, spaces: { [ACTOR]: { archivedDocumentIds: [], documentTrash: {}, retentionDocuments: {},
    text: { documents: [{ id: DOC, title: '긴 문서', lines: raw.split('\n').map((text, index) => ({ id: `l${index}`, text })) }] } } } };
}
function host(p: ReturnType<typeof page>) {
  const scope = {
    session: { userId: ACTOR }, sessionEpochRef: { current: 1 }, currentOwnerRef: { current: ACTOR }, destinationRef: { current: { view: 'space', id: DOC } as { view: string; id?: string } },
    currentData: { current: data() as unknown }, document: p.doc, requestAnimationFrame: p.view.requestAnimationFrame,
    navigate: async (next: { view: string; id?: string }) => { scope.destinationRef.current = next; },
    restoreProgramDialogFocus, restoreProgramWritingReturn, programReviewOriginReason,
  };
  // The state the host keeps between leaving and coming back.
  const run = new Function(...Object.keys(scope), `let flowReturn = null; const setFlowReturn = value => { flowReturn = value; };
${hostSource}
return { openFlowsFromDocument, returnFromFlows, kept: () => flowReturn };`);
  return { scope, ...run(...Object.values(scope)) as {
    openFlowsFromDocument: (documentId?: string, flowId?: string, returnFocus?: unknown, writing?: ProgramWritingReturn) => Promise<void>;
    returnFromFlows: () => Promise<void>; kept: () => { writing?: ProgramWritingReturn } | null } };
}
/** Leave for the Flow screen (the editor hidden: scroll 0, focus gone), then come back with ← 내 문서. */
async function journey(p: ReturnType<typeof page>, h: ReturnType<typeof host>, writing = left(p.area, 0, 0, 467)) {
  await h.openFlowsFromDocument(DOC, undefined, p.area, writing);
  p.raw.scrollTop = 0; p.doc.activeElement = p.doc.body; p.view.scrollY = 70;
  return h;
}

test('FC7 host: ← 내 문서 back to the same account, document and text restores caret and scroll after the focus', async () => {
  for (const [width, top] of [[390, 467], [1280, 389]] as const) {
    const p = page(width), h = host(p);
    await journey(p, h, left(p.area, 0, 0, top));
    assert.equal(h.kept()?.writing?.top, top, `${width}: the position is kept with the return`);
    await h.returnFromFlows(); p.frame();
    assert.equal(p.doc.activeElement, p.area, `${width}: focus back`);
    if (width === 390) { p.barShown(); p.frame(); }
    assert.deepEqual([p.area.selectionStart, p.area.scrollTop, p.view.scrollY], [379, top, 0], `${width}`);
  }
});

test('FC7 host: text changed while away, another account, or a position for another document keep today\'s focus-only return', async () => {
  const changed = page(1280), h1 = host(changed);
  await journey(changed, h1); h1.scope.currentData.current = data(RAW + '\n다른 기기에서 쓴 줄');
  await h1.returnFromFlows(); changed.frame();
  assert.equal(changed.doc.activeElement, changed.area);
  assert.deepEqual([changed.area.scrollTop, changed.view.scrollY], [0, 70]);

  const switched = page(1280), h2 = host(switched);
  await journey(switched, h2); h2.scope.currentOwnerRef.current = 'actor-2';
  await h2.returnFromFlows(); switched.frame();
  assert.deepEqual([switched.doc.activeElement, switched.area.scrollTop], [switched.doc.body, 0]);

  const other = page(1280), h3 = host(other);
  await h3.openFlowsFromDocument(DOC, undefined, other.area, { ...left(other.area), documentId: OTHER });
  assert.equal(h3.kept()?.writing, undefined, 'a position for another document is not kept');
});

// ProgramSpace's side: the find opener remembers the page scroll too, and 준비된 Flow에서 시작 hands this document's position on.
test('FC7 space: 준비된 Flow에서 시작 hands on the caret, editor scroll and page scroll it remembered at the title ▾', () => {
  const remember = js(declared(space, 'ProgramSpace.tsx', 'rememberFindFocus'));
  const press = js(`const onClick = (${source(space, 'ProgramSpace.tsx', node => ts.isJsxAttribute(node) && node.name.getText() === 'onClick'
    && !!node.parent?.parent && ts.isJsxOpeningElement(node.parent.parent) && /styles\.flowEntry/.test(node.parent.parent.getText())).replace(/^onClick=\{/, '').replace(/\}$/, '')});`);
  // Writing on the phone: the bar is up.
  const p = page(390); p.barShown(); p.area.focus(); p.raw.scrollTop = 467; p.raw.setSelectionRange(379, 379); p.view.scrollY = 12;
  const handed: unknown[][] = [];
  const scope = {
    document: p.doc, window: p.view, HTMLElement: FakeElement, HTMLTextAreaElement: FakeTextArea, root: { current: { contains: () => true } },
    libraryReturn: { current: null as { documentId: string } | null }, actorId: ACTOR, selectedRef: { current: DOC }, presentation: { current: { period: 'documents', folderId: '' } },
    titleToggle: { current: null }, libraryToggle: { current: null }, setLibraryOpen: () => {}, selectedDoc: { id: DOC },
    openDocumentAction: (action: (id: string) => void) => action(DOC), props: { onBrowseFlows: (...args: unknown[]) => { handed.push(args); } },
  };
  const run = new Function(...Object.keys(scope), `${remember}\n${press}\nreturn { rememberFindFocus, onClick };`)(...Object.values(scope));
  run.rememberFindFocus(); run.onClick();
  const [id, focus, writing] = handed[0] as [string, unknown, ProgramWritingReturn];
  assert.deepEqual([id, focus], [DOC, p.area]);
  assert.deepEqual({ ...writing, area: undefined }, { documentId: DOC, raw: RAW, area: undefined, start: 379, end: 379, direction: 'none', top: 467, left: 0, pageX: 0, pageY: 12 });

  // Remembered for another document: the Flow still opens, with the focus only.
  run.rememberFindFocus(); scope.libraryReturn.current!.documentId = OTHER; run.onClick();
  assert.equal(handed[1][2], undefined);
});
