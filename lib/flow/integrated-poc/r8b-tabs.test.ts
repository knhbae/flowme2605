import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';

// R8b: four bottom tabs in the host; 쓰기·오늘·분류 choose the space's main tab through a port,
// 더보기 opens the menu. The space keeps its own period state and the R7 return path.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8');
const space = read('ProgramSpace.tsx'), alpha = read('AlphaWorkspace.tsx');
function fn(source: string, name: string) {
  const tree = ts.createSourceFile('x.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === name) found.push(node.getText(tree)); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(found.length, 1, name);
  return found[0];
}
function evaluate<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as T;
}

test('the space chooses a main tab the R7 way: the tab a source came from returns there, others change the period', async () => {
  const run = async (originTab: 'today' | 'all' | null, key: string) => {
    const calls: string[] = [];
    const choose = evaluate<(key: string) => Promise<boolean>>(fn(space, 'chooseMainTab'), {
      sourceOriginOpen: originTab !== null, sourceOrigin: { tab: originTab }, sourceOriginTab: (origin: { tab: string }) => origin.tab,
      returnToSourceOrigin: async () => { calls.push('return'); }, changePeriod: async (period: string, main: boolean) => { calls.push(`period ${period} ${main}`); return true; },
    });
    return { result: await choose(key), calls };
  };
  assert.deepEqual(await run('today', 'today'), { result: true, calls: ['return'] });
  assert.deepEqual(await run('today', 'all'), { result: true, calls: ['period all true'] });
  assert.deepEqual(await run('all', 'all'), { result: true, calls: ['return'] });
  assert.deepEqual(await run(null, 'documents'), { result: true, calls: ['period documents true'] });
  // Not onRegisterNavigation: the source-open focus path (`!props.onRegisterNavigation`) is untouched.
  assert(!alpha.includes('onRegisterNavigation='));
});

test('the host tabs go to the space first when needed, then ask the port; 더보기 toggles the menu', async () => {
  const calls: string[] = [];
  const port = { choose: async (tab: string) => { calls.push(`choose ${tab}`); return true; } };
  const make = (view: string) => evaluate<(tab: string) => Promise<void>>(fn(alpha, 'chooseMainTab'), {
    destination: { view }, navigate: async (next: { view: string }) => { calls.push(`navigate ${next.view}`); }, mainTabs: { current: port },
  });
  await make('community')('today');
  await make('space')('all');
  assert.deepEqual(calls, ['navigate space', 'choose today', 'choose all']);
  const focus: string[] = [], menu = { open: false, querySelector: () => ({ focus: () => focus.push('first item') }) };
  const toggle = evaluate<() => void>(fn(alpha, 'toggleMoreMenu'), { managementMenu: { current: menu }, requestAnimationFrame: (callback: () => void) => { callback(); return 1; } });
  toggle(); assert.deepEqual([menu.open, focus], [true, ['first item']]);
  toggle(); assert.equal(menu.open, false);
});

test('tab marks: the space reports its main tab (week, month, date-less under 오늘); the host marks the matching tab', () => {
  const mainTabOf = evaluate<(period: string) => string>(/programMainTabOf = (\(period: ProgramPeriod\): ProgramMainTab => [^;]+);/.exec(space)![1], {});
  assert.deepEqual(['documents', 'today', 'week', 'month', 'undated', 'all'].map(mainTabOf), ['documents', 'today', 'today', 'today', 'today', 'all']);
  assert(space.includes('useEffect(() => { props.onMainTabChange?.(programMainTabOf(period)); }, [period]);'));
  assert(alpha.includes("data-main-tab={tab} aria-current={destination.view === 'space' && mainTab === tab ? 'page' : undefined}"));
  assert(alpha.includes("data-main-tab=\"more\" aria-current={['discover', 'flow', 'community', 'activity', 'legacy', 'creator'].includes(destination.view) ? 'page' : undefined}"));
  // 둘러보기 and 내 활동 now live in the 더보기 menu; the space's own tab row is hidden under the host tabs.
  assert(alpha.includes('aria-label="둘러보기"><h3>둘러보기</h3>') && alpha.includes('aria-label="내 활동"><h3>내 활동</h3>'));
  assert(space.includes('aria-label="기본 이동" hidden={!!props.hostMainTabs}'));
  assert(!alpha.includes('<span>내 공간</span>') && !alpha.includes('<span>둘러보기</span>'));
});

test('title rows: the writing title opens the document sheet, ⋯ keeps document actions; today and 분류 say what they show', () => {
  const alphaCss = read('AlphaWorkspace.module.css');
  assert(space.includes('className={styles.titleButton} aria-haspopup="dialog" aria-expanded={libraryOpen} aria-controls="program-library"'));
  assert(space.includes('onPointerDown={findPointerDown} onClick={openFindPanel}'));
  assert(space.includes('{props.hostMainTabs ? selectedDocumentTools && <div className={styles.titleActions}>{selectedDocumentTools}</div>'));
  // The editor's "…" no longer carries 새 글·글 찾기·글 작업 under the host tabs; the sheet starts with ＋ 새 글.
  assert(space.includes('{props.noteHeader && !props.hostMainTabs && <>{period === \'documents\' && findActions}{selectedDocumentTools}</>}{selectedDocumentExample}'));
  assert(space.includes('{props.hostMainTabs && <button type="button" className={styles.sheetNewWriting} disabled={preparingDocumentAction} onClick={() => void beginWriting()}>＋ 새 글</button>}'));
  assert(space.includes("period === 'today' ? (date === today ? `오늘 · ${programCalendarDate(today, today)}` : programCalendarDate(date, today))"));
  assert(space.includes("period === 'all' ? (collectionMode ? '전체 할 일' : folder ? folder.title : '분류')"));
  // On phones the fixed header bar gives way to the title rows; the tabs stay at the bottom.
  assert(alphaCss.includes('.page[data-alpha-frame="b"][data-note-layout="true"] > .header > :not(.globalNavigation) { display: none; }'));
});

test('toolbar: ↶ ↷ and 반복 N; the Flow·반복 box is a sheet that stays mounted, and the "…" keeps editing tools', () => {
  const editor = read('ProgramTextEditor.tsx');
  assert(editor.includes("{props.authoringMode && <button type=\"button\" disabled={inputLocked || !!props.readOnly || draft.saving || !!props.folderId} title=\"다시 실행\" aria-label=\"다시 실행\""));
  assert(editor.includes('{props.repeatLabel && props.onOpenPersonalAuthoring && <button type="button" className={styles.repeatButton} aria-haspopup="dialog" onClick={() => props.onOpenPersonalAuthoring?.()}>{props.repeatLabel}</button>}'));
  assert(editor.includes('{!props.authoringMode && (props.onRedo || orderHistoryRef.current.hasEntries()) && <button type="button" hidden={!!props.folderId}'));
  assert(space.includes('if (props.hostMainTabs) { const sheet = authoringSheet.current; if (sheet && !sheet.open) sheet.showModal(); return; }'));
  assert(space.includes('className={`${styles.findDialog} ${styles.authoringSheet}`} aria-labelledby="program-authoring-title"'));
  assert(space.includes("repeatLabel={props.hostMainTabs && props.nativeAuthoringEnabled && selected === id ? repeatLabel(id) : undefined}"));
  const label = /function repeatLabel\(id: string\) \{[\s\S]*?return count \? `반복 \$\{count\}` : '반복';\n  \}/.test(space.replace(/\r\n/g, '\n'));
  assert(label);
});
