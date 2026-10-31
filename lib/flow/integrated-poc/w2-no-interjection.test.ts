import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';

// W2: nothing pushes the body down while writing. The "- 이름" folder suggestion bar goes (its link was
// always refused; folder linking stays in the ＋ menu), the move notice and the last message sit under
// the body, which keeps its top and gives up their height at its bottom, and one recovery box holds both
// the server's and the editor's recovery.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const source = read('ProgramTextEditor.tsx'), alpha = read('AlphaWorkspace.tsx'), css = read('ProgramTextEditor.module.css');
const tree = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function pick(match: (node: ts.Node) => boolean) {
  const found: string[] = [];
  const visit = (node: ts.Node) => { if (match(node)) found.push(node.getText(tree)); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(found.length, 1);
  return found[0];
}
type El = { type: unknown; props: Record<string, unknown>; children: unknown[] };
const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): El => ({ type, props: props ?? {}, children });
function run<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', { fileName: 'w2.tsx', compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, jsxFactory: 'h', jsxFragmentFactory: 'Fragment' } }).outputText;
  return new Function('h', 'Fragment', ...Object.keys(scope), code + '\nreturn extracted;')(h, 'fragment', ...Object.values(scope)) as T;
}
function all(node: unknown, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach(child => all(child, out));
  else if (node && typeof node === 'object' && 'children' in node) { out.push(node as El); all((node as El).children, out); }
  return out;
}
const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text((node as El).children) : typeof node === 'string' ? node : '';
const styles = new Proxy({}, { get: (_, key) => String(key) });

test('W2: the "- 이름" folder suggestion bar is gone, and folder linking stays in the ＋ menu', () => {
  for (const gone of ['aria-label="폴더 연결 제안"', '제안 닫기', '새 폴더로 연결…', 'programFolderInputSuggestion', 'dismissedSuggestion', 'chooseSuggestion'])
    assert(!source.includes(gone), gone);
  assert(source.includes('<button type="button" onClick={() => openFolderPanel(panel.lineId)}>폴더 연결</button>'));
});

test('W2: the move notice and the last message sit under the body, which gives up their height at its bottom', () => {
  const view = source.slice(source.indexOf('return <section className={styles.editor}'));
  const host = view.indexOf('ref={hostRef}'), under = view.indexOf('{notices}');
  assert(host > 0 && under > host, 'the notices come after the body');
  // Before the keyboard bar, and above the regions of a folder view (the body is hidden there).
  assert(under < view.indexOf('{props.authoringMode && !folderView && writingBar}') && under < view.indexOf('{folderView && <ProgramFolderRegionEditor'));
  // Nothing of theirs is left between the toolbar and the body.
  const between = view.slice(0, host);
  for (const old of ['styles.moveNotice', '{message && !panel && <p'])
    assert(!between.includes(old), old);
  const notices = pick(node => ts.isVariableDeclaration(node) && node.name.getText(tree) === 'notices');
  // Server feedback and the refused-line reason use the same measured area below the body.
  assert(notices.includes('serverView?.extras') && notices.includes('styles.serverExtras'));
  assert(notices.includes('styles.refusedLine') && notices.includes('refusedReason'));
  assert(!between.includes('styles.serverExtras') && !between.includes('styles.refusedLine'));
  // W15: the move notice and the message are rows of the shared notice row, in the same place.
  assert(notices.includes('<ProgramNoticeRow') && notices.includes('ref={noticeRef}'));
  const views = pick(node => ts.isVariableDeclaration(node) && node.name.getText(tree) === 'noticeViews');
  assert(views.includes("label: '위치 선택'") && views.includes("label: '이동 취소'") && views.includes("text: message"));
  // A press there while typing must not take focus off the body: the bar would go and they would move under it.
  const row = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramNoticeRow.tsx', import.meta.url), 'utf8');
  assert.equal(row.match(/<button /g)?.length, 2);
  assert.equal(row.match(/onPointerDown=\{keepFocus\}/g)?.length, 2);
  assert.match(row, /const keepFocus = \(event: React\.PointerEvent\) => \{ event\.preventDefault\(\); \};/);
  // The body's visible height ends above them, like it ends above the keyboard bar.
  const update = source.slice(source.indexOf('const update = () => {\n      frame = 0;'), source.indexOf('const schedule = () => { if (!frame)'));
  assert(update.length > 0);
  // With N1 fix 3 the bar is fixed to the visible bottom and comes off first; the notices come off after it.
  assert(update.indexOf('bottom -= bar!.getBoundingClientRect().height + 4;') < update.indexOf('bottom -= notice'));
  assert.match(update, /const notice = noticeRef\.current;\s*if \(notice\?\.getClientRects\(\)\.length\) bottom -= notice\.getBoundingClientRect\(\)\.height;/);
  // The 17px fix measures the top from the page and caps the bottom (page-fit.test.ts); the notices still come first.
  assert(update.indexOf('bottom -= notice') < update.indexOf('programEditorVisibleHeight(top, below === null ? bottom : '));
  // A longer message changes their height without a mutation the shell's observers see.
  assert(source.includes('if (noticeRef.current) observer.observe(noticeRef.current);'));
  assert(css.includes('.notices:empty { display: none; }'));
});

test('W2: one recovery box holds the server\'s 다시 확인 and the editor\'s three actions', () => {
  const slotExpression = pick(node => ts.isJsxExpression(node) && !!node.expression && ts.isConditionalExpression(node.expression)
    && node.expression.condition.getText(tree) === 'serverView' && node.expression.whenTrue.getText(tree).includes('styles.statusSlot')).slice(1, -1);
  const editorRecovery = pick(node => ts.isFunctionDeclaration(node) && node.name?.text === 'editorRecovery');
  const noop = () => {};
  function slot(server: boolean, error: boolean) {
    const serverView = { label: '저장 여부 확인 못 함', level: 4,
      recovery: server ? h('details', { 'data-test': 'server-recovery' }, h('summary', null, '저장 여부 확인 못 함'), h('button', null, '다시 확인')) : null,
      recoveryBody: server ? h('section', { 'data-test': 'server-body' }, h('button', null, '다시 확인')) : null, extras: null };
    const draft = { error: error ? '여러 줄의 변경을 기존 항목과 연결하지 못해 반영하지 않았습니다.' : '', saving: false };
    const recovery = run<(announce: boolean, server?: unknown) => El>(editorRecovery, { props: { readOnly: false }, inputLocked: false, refused: false, refusedLine: 1, refusedReason: '',
      styles, composingRef: { current: false }, draft, progressConflict: null, showProgressConflict: noop, draftRef: { current: null }, saveNow: noop,
      downloadDraft: noop, orderHistoryRef: { current: null }, orderPositionsRef: { current: [] }, orderEpochRef: { current: 0 }, editorRef: { current: null }, propsRef: { current: {} } });
    const nodes = all(run(slotExpression, { serverView, styles, statusWarn: true, hasRecovery: server || error, statusLabel: '저장 확인 필요', quietStatus: false,
      draft, editorRecovery: recovery, props: {}, editorStatus: { label: '저장 확인 필요' } }));
    const boxes = nodes.filter(node => node.type === 'details');
    return { boxes: boxes.length, text: boxes.map(text), groups: nodes.filter(node => node.type === 'section' && node.props['aria-label']).map(node => String(node.props['aria-label'])) };
  }
  const both = slot(true, true);
  assert.equal(both.boxes, 1);
  assert.deepEqual(both.groups, ['서버 저장', '이 기기의 입력']);
  for (const action of ['다시 확인', '다시 저장', '입력한 원문 받기', '저장본으로 되돌리기']) assert(both.text[0].includes(action), action);
  // One side alone keeps its own box as before.
  const server = slot(true, false), editor = slot(false, true);
  assert.equal(server.boxes, 1); assert(server.text[0].includes('다시 확인') && !server.text[0].includes('다시 저장'));
  assert.equal(editor.boxes, 1); assert.deepEqual(editor.groups, []); assert(!editor.text[0].includes('다시 확인'));
  // The host passes its recovery body apart from its box.
  assert(alpha.includes('recoveryBody: destination.view === \'space\' && needsInputProtection ? <div className={styles.inputRecoveryGroup}>{inputProtectionFor(false)}</div> : null,'));
});
