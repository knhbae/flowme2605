import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';

// R8a: the "…" menu in groups, the four kinds of saved input in one 복구함, and a one-line notice.
// Source-level and extracted-function checks; the browser layout is for synthetic QA.
const source = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('AlphaWorkspace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function pick(match: (node: ts.Node) => boolean) {
  const found: string[] = [];
  const visit = (node: ts.Node) => { if (match(node)) found.push(node.getText(tree)); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(found.length, 1);
  return found[0];
}
const element = (attribute: string) => pick(node => ts.isJsxElement(node) && node.openingElement.getText(tree).includes(attribute));
function evaluate<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as T;
}

test('every function of the old "…" menu has a place in the new groups, in the designed order', () => {
  const menu = element('aria-label="계정 및 자료 관리"');
  const groups = ['편집', '내 활동', '자료', '계정', '문제 해결', '실험', '개발계 안내'].map(title => menu.indexOf(`aria-label="${title}"><h3>${title}</h3>`));
  assert(groups.every(at => at > 0), String(groups));
  assert.deepEqual([...groups].sort((a, b) => a - b), groups);
  const between = (from: string, to?: string) => menu.slice(menu.indexOf(`aria-label="${from}"`), to ? menu.indexOf(`aria-label="${to}"`) : undefined);
  const expect: [string, string[]][] = [
    ['편집', ['{usesNoteChrome && serverUndo}', '다시 실행']],
    ['내 활동', ['>내 활동</button>', '개인 Flow 상세']],
    ['자료', ['복구함', '백업 · 복원 · 가져오기']],
    ['계정', ['{email}', '로그아웃 · 계정 바꾸기']],
    ['문제 해결', ['서버에서 다시 확인', '서버 기록 번호 {snapshot.account.revision}']],
    ['실험', ["'기존 폴더로 보기' : '문서·모음 시험'"]],
    ['개발계 안내', ['{DEV_NOTICE_TEXT}']],
  ];
  const order = expect.map(([title]) => title);
  expect.forEach(([title, items], index) => { const part = between(title, order[index + 1]); for (const item of items) assert(part.includes(item), `${title}: ${item}`); });
  // The old "마지막 확인 판본" wording and the separate tools strip are gone.
  assert(!source.includes('마지막 확인 판본') && !source.includes('const workspaceTools'));
});

test('the four kinds of saved input show only in the 복구함, each with its own buttons as before', () => {
  const box = element('ref={recoveryBox}');
  assert(box.includes('{savedInputPanel}{structuralRecoveryPanel}{creatorRecoveryPanel}{socialRecoveryPanel}'));
  for (const panel of ['savedInputPanel', 'structuralRecoveryPanel', 'creatorRecoveryPanel', 'socialRecoveryPanel'])
    assert.equal(source.split(`{${panel}}`).length - 1, 1, `${panel} is drawn once, in the 복구함`);
  for (const button of ['원문 복사</button>', '새 문서로 복구</button>', '보관 입력 버리기</button>', '복사 작업 복구</button>', '보관한 복사 작업 지우기</button>',
    '제작 작업본으로 복구</button>', '보관 제작 입력 버리기</button>', '비공개 초안으로 복구</button>', '보관 공개·참여 입력 버리기</button>'])
    assert.equal(source.split(button).length - 1, 1, button);
  // The note editor's extras row keeps only the last message; no saved-input box rides along.
  assert(source.includes("extras: destination.view === 'space' && message && !participationMessage"));
  assert(!source.includes('personalRecovery'));
  // The badge counts them on the "…" button and in its name.
  assert(source.includes('{savedTotal > 0 && <span className={styles.menuBadge} aria-hidden="true">{savedTotal}</span>}'));
  assert(source.includes("${savedTotal ? ` · 보관한 입력 ${savedTotal}개` : ''}"));
});

test('the notice shows for saved input on opening and for each newly saved one, until closed; nothing is deleted', () => {
  const shown = pick(node => ts.isVariableDeclaration(node) && node.name.getText(tree) === 'savedNoticeShown');
  const shownExpr = shown.slice(shown.indexOf('=') + 1).trim();
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
  assert(source.includes('aria-label="보관한 입력 안내 닫기" onClick={() => setSavedNoticeClosedAt(savedTotal)}'));
});

test('복구함 열기 opens the menu and the box and puts focus on it', () => {
  const calls: string[] = [];
  const summary = { focus: () => calls.push('focus') };
  const menu = { open: false }, box = { open: false, querySelector: () => summary };
  evaluate<() => void>(pick(node => ts.isFunctionDeclaration(node) && node.name?.text === 'openRecoveryBox'), {
    managementMenu: { current: menu }, recoveryBox: { current: box }, requestAnimationFrame: (callback: () => void) => { callback(); return 1; },
  })();
  assert.deepEqual([menu.open, box.open, calls], [true, true, ['focus']]);
});
