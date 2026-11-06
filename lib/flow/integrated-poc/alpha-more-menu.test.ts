import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';

// R8a gave the "…" menu its groups, one 복구함 for the four kinds of saved input and a one-line notice. UX B3 (11/7):
// five tabs (쓰기·오늘·분류·Flow·나); the menu's 17 items live on 나, in the Flow tab and in a 복구함 sheet that opens
// anywhere. The menu stays only for an account that cannot open (no tabs then). Source-level and extracted-function
// checks; the browser layout is for synthetic QA.
const source = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const tree = ts.createSourceFile('AlphaWorkspace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function pick(match: (node: ts.Node) => boolean) {
  const found: string[] = [];
  const visit = (node: ts.Node) => { if (match(node)) found.push(node.getText(tree)); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(found.length, 1);
  return found[0];
}
const element = (attribute: string) => pick(node => ts.isJsxElement(node) && node.openingElement.getText(tree).includes(attribute));
const declaration = (name: string) => { const text = pick(node => ts.isVariableDeclaration(node) && node.name.getText(tree) === name); return text.slice(text.indexOf('=') + 1).trim(); };
function evaluate<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as T;
}

test('UX B3: every item of the old "…" menu has its place, and the menu stays only for an account that cannot open', () => {
  const me = declaration('meSections'), head = declaration('meHead');
  const groups = ['aria-label="자료"><h3>자료</h3>', 'aria-label="계정"><h3>계정</h3>', 'aria-label="문제 해결"><summary>문제 해결</summary>', 'aria-label="실험"><summary>실험</summary>'].map(at => me.indexOf(at));
  assert(groups.every(at => at > 0), String(groups));
  assert.deepEqual([...groups].sort((a, b) => a - b), groups, '자료, 계정, then 문제 해결 and 실험 folded');
  const flowTab = element('data-main-tab="flow"'), branches = element('aria-label="둘러보기 종류"');
  const places: [number, string, string][] = [
    [1, branches, ">이야기</button>"], [2, branches, '>Flow 찾기</button>'], [2, flowTab, 'chooseFlowTab()'],
    [3, me, '마지막 변경 되돌리기</button>'], [4, me, '{redoButton}'], [5, me, "'쓰기 화면에서 되돌릴 수 있어요.'"],
    [6, element('data-main-tab="me"'), 'chooseMeTab(event.currentTarget)'], [7, head, "onClick={() => void navigate({ view: 'legacy' })}>개인 Flow 상세 ›</button>"],
    [8, me, '{recoveryButton}'], [9, element('ref={recoveryDialog}'), '보관함에서 보기</button>'], [10, me, '{backupButton}'],
    [11, head, '<p className={styles.meEmail}>{email}</p>'], [12, me, '{signOutButton}'], [13, me, '저장과 공개 안내</button>}'],
    [14, me, '{refreshButton}'], [15, me, '{recordNumber}'], [16, me, "'기존 폴더로 보기' : '문서·모음 시험'"], [17, me, '<p>{DEV_NOTICE_TEXT}</p>'],
  ];
  for (const [item, place, text] of places) assert(place.includes(text), `item ${item}: ${text}`);
  assert.equal(new Set(places.map(([item]) => item)).size, 17);
  assert(head.includes('data.spaces[session.userId].savedBindings.length > 0 &&'), '개인 Flow 상세 only with a saved binding');
  assert(source.includes("{destination.view === 'activity' && meSections}"));
  // The menu: only when unavailable, with the same pieces (no moves in it).
  const menu = element('aria-label="계정 및 자료 관리"');
  assert(source.includes('{unavailable && <details ref={managementMenu}'));
  for (const piece of ['{serverUndo}{redoButton}', '{recoveryButton}{backupButton}{oldLocalLink}', '{signOutButton}', '{refreshButton}', '{recordNumber}', '{DEV_NOTICE_TEXT}{privacyMore}'])
    assert(menu.includes(piece), piece);
  assert(!source.includes('navigateFromMenu') && !source.includes('menuTurns'));
  // The old "마지막 확인 판본" wording and the separate tools strip are gone.
  assert(!source.includes('마지막 확인 판본') && !source.includes('const workspaceTools'));
});

test('the four kinds of saved input show only in the 복구함 sheet, each with its own buttons as before', () => {
  const sheet = element('ref={recoveryDialog}');
  assert(sheet.includes('{savedInputPanel}{structuralRecoveryPanel}{creatorRecoveryPanel}{socialRecoveryPanel}'));
  for (const panel of ['savedInputPanel', 'structuralRecoveryPanel', 'creatorRecoveryPanel', 'socialRecoveryPanel'])
    assert.equal(source.split(`{${panel}}`).length - 1, 1, `${panel} is drawn once, in the sheet`);
  for (const button of ['원문 복사</button>', '새 문서로 복구</button>', '보관 입력 버리기</button>', '복사 작업 복구</button>', '보관한 복사 작업 지우기</button>',
    '제작 작업본으로 복구</button>', '보관 제작 입력 버리기</button>', '비공개 초안으로 복구</button>', '보관 공개·참여 입력 버리기</button>'])
    assert.equal(source.split(button).length - 1, 1, button);
  // The note editor's extras row keeps only the last message; no saved-input box rides along.
  assert(source.includes("extras: destination.view === 'space' && message && !participationMessage"));
  assert(!source.includes('personalRecovery'));
  // The badge counts them on the 나 tab (and on the menu left for an account that cannot open), and in their names.
  assert(source.includes('{savedTotal > 0 && <span className={styles.navBadge} aria-hidden="true">{savedTotal}</span>}'));
  assert(source.includes('{savedTotal > 0 && <span className={styles.menuBadge} aria-hidden="true">{savedTotal}</span>}'));
  assert(source.includes("aria-label={`나${savedTotal ? ` · 확인이 필요한 입력 ${savedTotal}개` : ''}`}"));
  assert(source.includes("${savedTotal ? ` · 확인이 필요한 입력 ${savedTotal}개` : ''}"));
});

test('the notice shows for saved input on opening and for each newly saved one, until closed; nothing is deleted', () => {
  const shownExpr = declaration('savedNoticeShown');
  const lower = pick(node => ts.isArrowFunction(node) && node.getText(tree).startsWith('at => at !== null && savedTotal < at'));
  let total = 0, closedAt: number | null = null;
  const isShown = () => evaluate<boolean>(shownExpr, { savedTotal: total, savedNoticeClosedAt: closedAt });
  const change = (next: number) => { total = next; closedAt = evaluate<(at: number | null) => number | null>(lower, { savedTotal: total })(closedAt); };
  change(1); assert.equal(isShown(), true);            // saved input found on opening
  closedAt = 1; assert.equal(isShown(), false);        // closed
  change(2); assert.equal(isShown(), true);            // a newly saved one
  closedAt = 2; change(0); assert.equal(isShown(), false);
  change(1); assert.equal(isShown(), true);            // after discarding everything, the next one shows again
  // Closing the line only marks it closed; discarding stays with the 복구함's own buttons.
  assert(source.includes('aria-label="확인이 필요한 입력 안내 닫기" onClick={() => setSavedNoticeClosedAt(savedTotal)}'));
});

test('복구함 opens as a sheet from anywhere: it keeps input and moves nothing; closing it returns focus to its opener', () => {
  const calls: string[] = [];
  const opener = { name: '복구함 열기' }, recoveryOpener: { current: unknown } = { current: null };
  evaluate<(opener?: unknown) => void>(pick(node => ts.isFunctionDeclaration(node) && node.name?.text === 'openRecoveryBox'), {
    captureInput: () => { calls.push('captureInput'); return true; }, recoveryOpener, setRecoveryOpen: (open: boolean) => calls.push(`open ${open}`),
    document: { activeElement: null }, HTMLElement: class {},
  })(opener);
  assert.deepEqual([calls, recoveryOpener.current], [['captureInput', 'open true'], opener]);
  const open = pick(node => ts.isFunctionDeclaration(node) && node.name?.text === 'openRecoveryBox');
  for (const move of ['navigate(', 'lockInput', 'flushAll']) assert(!open.includes(move), `not a move: ${move}`);
  // A modal dialog: shown and closed by the state; Escape closes it; the opener gets focus back.
  assert(source.includes('if (recoveryOpen && !sheet.open) sheet.showModal();'));
  assert(source.includes('if (opener?.isConnected) opener.focus({ preventScroll: true });'));
  assert(source.includes('onCancel={event => { event.preventDefault(); setRecoveryOpen(false); }}'));
  // Every way in passes its button: the notice, 나 › 자료 (and the menu's), and the 나 tab when a move is refused.
  assert(source.includes('<button type="button" onClick={event => openRecoveryBox(event.currentTarget)}>복구함 열기</button>'));
  assert(source.includes('const recoveryButton = <button type="button" onClick={event => openRecoveryBox(event.currentTarget)}>'));
  assert(source.includes('if (refused) openRecoveryBox(opener);'));
});
