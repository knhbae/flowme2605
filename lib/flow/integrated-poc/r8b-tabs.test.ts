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

test('the host tabs go to the space first when needed, then ask the port; Flow and 나 move by navigate() alone (UX B3)', async () => {
  const calls: string[] = [];
  const port = { choose: async (tab: string) => { calls.push(`choose ${tab}`); return true; } };
  const make = (view: string) => evaluate<(tab: string) => Promise<void>>(fn(alpha, 'chooseMainTab'), {
    destination: { view }, navigate: async (next: { view: string }) => { calls.push(`navigate ${next.view}`); }, mainTabs: { current: port },
  });
  await make('community')('today');
  await make('space')('all');
  assert.deepEqual(calls, ['navigate space', 'choose today', 'choose all']);
  // Flow: the branch last seen, or back to the 찾기 list (and the top) when already there.
  const moves: string[] = [];
  const flow = (view: string, last: string) => evaluate<() => Promise<void>>(fn(alpha, 'chooseFlowTab'), {
    destinationRef: { current: { view } }, lastBrowse: { current: last }, navigate: async (next: { view: string }) => { moves.push(`navigate ${next.view}`); },
    window: { scrollTo: () => moves.push('top') } });
  await flow('space', 'community')(); await flow('today', 'discover')(); await flow('flow', 'community')();
  assert.deepEqual(moves, ['navigate community', 'navigate discover', 'navigate discover', 'top']);
  // 나: a refused move (a save or held input, before or inside navigate()) also opens the 복구함 sheet; again on 나, the top.
  const me = (outcome: string, view: string) => { const log: string[] = []; return { log, run: evaluate<(opener: unknown) => Promise<void>>(fn(alpha, 'chooseMeTab'), {
    destinationRef: { current: { view } },
    navigate: async (next: { view: string }) => { log.push(`navigate ${next.view}`); return outcome; }, openRecoveryBox: (opener: unknown) => log.push(`sheet ${opener}`),
    window: { scrollTo: () => log.push('top') } }) }; };
  // QA P2 (11/7): a late tab's conflict is refused inside navigate() (its save cannot finish): the sheet opens too.
  for (const outcome of ['refused', 'not-saved', 'late']) { const refused = me(outcome, 'space'); await refused.run('나'); assert.deepEqual(refused.log, ['navigate activity', 'sheet 나'], outcome); }
  for (const outcome of ['stayed', 'superseded', 'dropped']) { const kept = me(outcome, 'space'); await kept.run('나'); assert.deepEqual(kept.log, ['navigate activity'], outcome); }
  const again = me('moved', 'activity'); await again.run('나'); assert.deepEqual(again.log, ['navigate activity', 'top']);
  const there = me('moved', 'space'); await there.run('나'); assert.deepEqual(there.log, ['navigate activity']);
  // The new tabs hold no pointerdown (they move, as 쓰기·오늘·분류 do); the "…" tab and its toggle are gone.
  assert(!alpha.includes('toggleMoreMenu') && !alpha.includes('data-main-tab="more"'));
  const tabs = alpha.slice(alpha.indexOf('data-main-tab="flow"'), alpha.indexOf('</nav>}', alpha.indexOf('data-main-tab="flow"')));
  assert(!tabs.includes('onPointerDown'));
});

test('tab marks: the space reports its main tab (week, month, date-less under 오늘); the host marks the matching tab', () => {
  const mainTabOf = evaluate<(period: string) => string>(/programMainTabOf = (\(period: ProgramPeriod\): ProgramMainTab => [^;]+);/.exec(space)![1], {});
  assert.deepEqual(['documents', 'today', 'week', 'month', 'undated', 'all'].map(mainTabOf), ['documents', 'today', 'today', 'today', 'today', 'all']);
  assert(space.includes('useEffect(() => { props.onMainTabChange?.(programMainTabOf(period)); }, [period]);'));
  assert(alpha.includes("data-main-tab={tab} aria-current={destination.view === 'space' && mainTab === tab ? 'page' : undefined}"));
  // UX B3: Flow marks the 둘러보기 screens, 나 the 내 활동 ones (개인 Flow 상세 and 제작 공간 too).
  assert(alpha.includes("data-main-tab=\"flow\" aria-current={browse ? 'page' : undefined}"));
  assert(alpha.includes("data-main-tab=\"me\" aria-current={['activity', 'legacy', 'creator'].includes(destination.view) ? 'page' : undefined}"));
  assert(space.includes('aria-label="기본 이동" hidden={!!props.hostMainTabs}'));
  assert(!alpha.includes('<span>내 공간</span>') && !alpha.includes('<span>둘러보기</span>'));
});

test('title rows: the writing title opens the document sheet, ⋯ keeps document actions; today and 분류 say what they show', () => {
  const alphaCss = read('AlphaWorkspace.module.css');
  assert(space.includes('className={styles.titleButton} aria-haspopup="dialog" aria-expanded={libraryOpen} aria-controls="program-library"'));
  assert(space.includes('onPointerDown={findPointerDown} onClick={openFindPanel}'));
  assert(space.includes('{props.hostMainTabs ? selectedDocumentTools && <div className={styles.titleActions}>{selectedDocumentTools}</div>'));
  // The editor's "…" no longer carries 새 글·글 찾기·글 작업 under the host tabs; the sheet starts with ＋ 새 글.
  // W6: the writing example moved from the editor's 도구 to the empty document's ＋ menu.
  assert(space.includes('{props.noteHeader && !props.hostMainTabs && <>{period === \'documents\' && findActions}{selectedDocumentTools}</>}</> : undefined}'));
  assert(space.includes('{props.hostMainTabs && <button type="button" className={styles.sheetNewWriting} disabled={preparingDocumentAction} onClick={() => void beginWriting()}>＋ 새 글</button>}'));
  assert(space.includes("period === 'today' ? (date === today ? `오늘 · ${programCalendarDate(today, today)}` : programCalendarDate(date, today))"));
  assert(space.includes("period === 'all' ? (collectionMode ? '전체 할 일' : folder ? folder.title : '분류')"));
  // On phones the fixed header bar gives way to the title rows; the tabs stay at the bottom.
  assert(alphaCss.includes('.page[data-alpha-frame="b"][data-note-layout="true"] > .header > :not(.globalNavigation) { display: none; }'));
});

test('toolbar: ↶ ↷ and 반복 N; the Flow·반복 box is a sheet that stays mounted, and the "…" keeps editing tools', () => {
  const editor = read('ProgramTextEditor.tsx');
  // Input v2 stage 1: ↷'s rule is shared with the bar's ⋯ row (redoOff), unchanged.
  assert(editor.includes("{props.authoringMode && <button type=\"button\" disabled={redoOff} title=\"입력 다시 하기 · Ctrl+Y\" aria-label=\"입력 다시 하기\""));
  assert(editor.includes('const redoOff = inputLocked || !!props.readOnly || draft.saving || !!props.folderId;'));
  // N10 (SPEC 5): [반복] opens 이 줄 반복 beside 반복·Flow 만들기; with no repeat context it opens the sheet as before.
  assert(editor.includes('{props.repeatLabel && props.onOpenPersonalAuthoring && <button type="button" className={styles.repeatButton} aria-haspopup="dialog" onClick={() => {'));
  assert(editor.includes('if (!props.repeatContext) { props.onOpenPersonalAuthoring?.(); return; }') && editor.includes('반복·Flow 만들기…<small>여러 할 일과 단계</small>'));
  assert(editor.includes('{!props.authoringMode && (props.onRedo || orderHistoryRef.current.hasEntries()) && <button type="button" hidden={!!props.folderId}'));
  assert(space.includes('if (props.hostMainTabs) { const sheet = authoringSheet.current; if (sheet && !sheet.open) sheet.showModal(); return; }'));
  assert(space.includes('className={`${styles.findDialog} ${styles.authoringSheet}`} aria-labelledby="program-authoring-title"'));
  assert(space.includes("repeatLabel={props.hostMainTabs && props.nativeAuthoringEnabled && selected === id ? repeatLabel(id) : undefined}"));
  // (11/5 '최근만 쓰기': the label is kept while the text is the same; its words are as before.)
  const label = /function repeatLabel\(id: string\) \{[\s\S]*?label = count \? `반복 \$\{count\}` : '반복';[\s\S]*?return label;\n  \}/.test(space.replace(/\r\n/g, '\n'));
  assert(label);
});

test('C1 scope line: each narrowing condition in words with ×, nothing when the list is not narrowed', async () => {
  const { programViewScope } = await import('./view-scope');
  const today = '2026-10-29', base = { period: 'today' as const, date: today, today, folderTitle: null, query: '' };
  assert.deepEqual(programViewScope(base), []);
  assert.deepEqual(programViewScope({ ...base, period: 'week' }).map(item => item.label), ['기간: 이번 주']);
  assert.deepEqual(programViewScope({ ...base, period: 'week', date: '2026-11-05' }).map(item => item.label), ['기간: 11월 2일 주']);
  assert.deepEqual(programViewScope({ ...base, period: 'month' }).map(item => item.label), ['기간: 이번 달']);
  assert.deepEqual(programViewScope({ ...base, period: 'undated' }).map(item => item.label), ['기간: 날짜 없음']);
  assert.deepEqual(programViewScope({ ...base, date: '2026-10-31' }).map(item => item.label), ['기간: 10월 31일 (토)']);
  assert.deepEqual(programViewScope({ ...base, period: 'week', folderTitle: '회사', query: ' 견적 ' }).map(item => `${item.kind}:${item.label}`),
    ['period:기간: 이번 주', 'folder:분류: 회사', 'query:검색: 견적']);
  assert.deepEqual(programViewScope({ ...base, period: 'all' }), []);
  assert.deepEqual(programViewScope({ ...base, period: 'documents', query: 'x' }), []);
  const calls: string[] = [];
  const clear = evaluate<(kind: string) => Promise<unknown>>(fn(space, 'clearScope'), {
    changePeriod: async (period: string) => { calls.push(`period ${period}`); return true; }, changeFolder: async (id: string) => { calls.push(`folder '${id}'`); },
    setQuery: (value: string) => calls.push(`query '${value}'`),
  });
  await clear('period'); await clear('folder'); await clear('query');
  assert.deepEqual(calls, ['period today', "folder ''", "query ''"]);
  assert(space.includes("<button type=\"button\" className={styles.scopeAll} onClick={() => void changePeriod('today', true)}>전체로 보기</button>"));
});

test('the search box filters only after Korean composition settles', () => {
  const tree = ts.createSourceFile('x.tsx', space, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const handlers: Record<string, string> = {};
  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const tag = node.parent.parent as ts.JsxOpeningLikeElement;
      if (tag.attributes.properties.some(attribute => attribute.getText(tree) === 'id="program-private-search"')) handlers[node.name.getText(tree)] = node.initializer.expression.getText(tree);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  const queries: string[] = [], drafts: string[] = [], composing = { current: false };
  const scope = { setQuery: (value: string) => queries.push(value), setQueryDraft: (value: string) => drafts.push(value), queryComposing: composing, setTaskNotice: () => {} };
  const change = evaluate<(event: unknown) => void>(handlers.onChange, scope), start = evaluate<() => void>(handlers.onCompositionStart, scope);
  const end = evaluate<(event: unknown) => void>(handlers.onCompositionEnd, scope);
  const type = (value: string, isComposing: boolean) => change({ target: { value }, nativeEvent: { isComposing } });
  start(); type('ㄱ', true); type('견', true); type('견ㅈ', true);
  assert.deepEqual([queries, drafts], [[], ['ㄱ', '견', '견ㅈ']]);
  end({ currentTarget: { value: '견적' } });
  assert.deepEqual(queries, ['견적']);
  type('견적서', false);
  assert.deepEqual(queries, ['견적', '견적서']);
});

test('둘러보기 on phones takes the R8b title rows; its status row warns only; 되돌리기 stays in 편집 (UX FC-DETAIL-HEAD)', () => {
  const css = read('AlphaWorkspace.module.css').replace(/\r\n/g, '\n');
  // One data attribute names the browse screens; the space keeps data-note-layout as before.
  assert.match(alpha, /data-note-layout=\{usesNoteChrome\} data-browse-layout=\{browse \? destination\.view === 'flow' \? 'detail' : 'list' : undefined\}/);
  // The same phone rules as the space: no header bar or FlowMe/개발계 label, bottom tabs kept, frameless pane.
  const phone = css.slice(css.indexOf('/* UX FC-DETAIL-HEAD 1:'));
  for (const rule of ['.page[data-alpha-frame="b"][data-browse-layout] > .header { height: 0; min-height: 0; padding: 0; border: 0; background: transparent; }',
    '.page[data-alpha-frame="b"][data-browse-layout] > .header > :not(.globalNavigation) { display: none; }',
    '.page[data-alpha-frame="b"][data-browse-layout="detail"] .browseNavigation { display: none; }',
    '.page[data-alpha-frame="b"][data-browse-layout] .workPane { width: 100%; margin: 0; padding: 0 12px; border: 0; border-radius: 0; }']) assert(phone.includes(rule), rule);
  assert(css.indexOf('@media (max-width: 700px) {\n  .page[data-alpha-frame="b"][data-browse-layout] { padding-top: 8px; }') > 0);
  // R6: levels 1–5 only on 둘러보기; the space and other screens keep their rows.
  assert.match(alpha, /const browseStatusShown = serverSlot\.level <= 5;/);
  // UX B7 (11/6): 내 활동 too.
  assert.match(alpha, /const quietStatus = browse \|\| destination\.view === 'activity';/);
  assert.match(alpha, /\{!usesNoteChrome && \(!quietStatus \|\| browseStatusShown\) && serverStatus\}/);
  // 되돌리기 next to 다시 실행 on every screen, so hiding the row loses no undo path.
  // UX B3: on 나 › 문제 해결 (and in the menu left for an account that cannot open).
  assert(alpha.includes('마지막 변경 되돌리기</button>{redoButton}</div>') && alpha.includes('<div className={styles.managementActions}>{serverUndo}{redoButton}</div>'));
  assert(alpha.includes("const redoButton = <button type=\"button\" onClick={() => void history('redo')}"));
});
