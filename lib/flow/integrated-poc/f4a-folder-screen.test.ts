import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createProgramPrivateSpace } from './program-data';
import { programExecutionTasks } from './execution';
import { planProgramRegionEdit, readProgramFolderRegions } from './folder-document-regions';
import { programFolderListRows, programFolderOldDay, programFolderOldSince, programFolderParents, programFolderRowDay, programFolderTaskGroups,
  programFolderTree, programFolderWritingDocuments, type ProgramFolderTreeRow } from './folder-screen';
import { textWorkspaceModel as M, type TextTask, type TextWorkspaceState } from './text-workspace';

// F4-a (11/9, PRD 2판 5절, UX 목업 v2 + 토큰 1140): the 폴더 tab — the folder list with open counts (a parent counts its
// subfolders'), an open folder's [할 일] by 지난·오늘·앞으로·미정 with the finished folded, its [글] (each document's part,
// the last written first), the 7-day fold, and the three ways in that open one screen. Nothing new is saved.
const TODAY = '2026-11-09';
const RAW1 = ['[2026-11-02]', '- /보고', '  - [ ] 오래된 보고', '[2026-11-06]', '- /보고', '  - [ ] 지난주 실적 표 정리', '  - [x] 발표 자료 넘기기',
  '- /정산', '  - [ ] 월말 정산표', '    - 날짜: 2026-11-30', '[2026-11-09]', '- /보고', '  - [ ] 주간 보고 초안', '- /집안일', '  - [ ] 장보기',
  '[미정]', '- /보고', '  - [ ] 보고 양식 바꾸기'].join('\n');
const RAW2 = ['[2026-11-08]', '- /보고', '  - [ ] 보고서 검토 의견 반영', '  - [x] 끝난 보고'].join('\n');

function fixture() {
  const space = createProgramPrivateSpace();
  let text: TextWorkspaceState = { ...space.text, documents: [...space.text.documents,
    { id: 'd1', title: '늘 쓰는 글', folder: '미분류', folderId: 'folder-unfiled', lines: [] }, { id: 'd2', title: '11월 계획', folder: '미분류', folderId: 'folder-unfiled', lines: [] }] };
  for (const [id, raw] of [['d1', RAW1], ['d2', RAW2]] as const) {
    const typed = M.editTextResult(text, id, raw, { folderText: true });
    assert.equal(typed.reason, null, id); text = typed.state;
  }
  const byTitle = (title: string) => text.folders.find(folder => folder.title === title)!;
  // 회사 일 › 보고 › 정산 (the parents set as 폴더 관리's 상위 폴더 sets them).
  text = { ...text, folders: [...text.folders.map(folder => folder.id === byTitle('보고').id ? { ...folder, parentId: 'f-company' }
    : folder.id === byTitle('정산').id ? { ...folder, parentId: byTitle('보고').id } : folder), { id: 'f-company', title: '회사 일', parentId: null }] };
  assert(M.validate(text));
  const ready = { ...space, text };
  return { space: ready, report: byTitle('보고').id, settle: byTitle('정산').id, home: byTitle('집안일').id };
}
const open = (task: TextTask) => !task.done;

test('A1: the tree reads parents then subfolders, 미분류 last; a parent counts its subfolders\' open tasks; 모든 할 일 counts all', () => {
  const { space, report, settle, home } = fixture();
  const tree = programFolderTree(space, open);
  const at = (id: string) => tree.rows.find(row => row.id === id)!;
  // Order: each parent right before its subfolders; 미분류 at the end.
  const titles = tree.rows.map(row => row.title);
  assert(titles.indexOf('회사 일') < titles.indexOf('보고') && titles.indexOf('보고') < titles.indexOf('정산'));
  assert.equal(titles.at(-1), '미분류');
  assert.deepEqual([at('f-company').depth, at(report).depth, at(settle).depth, at(home).depth], [0, 1, 2, 0]);
  // 보고 5 of its own + 정산 1; 회사 일 has none of its own.
  assert.deepEqual([at('f-company').open, at(report).open, at(settle).open, at(home).open, at('folder-unfiled').open], [6, 6, 1, 1, 0]);
  assert.equal(tree.all, 7);
  assert.deepEqual([at('f-company').children, at(report).children, at(settle).children], [1, 1, 0]);
});

test('A6: over twelve folders a parent folds but the last opened folder\'s; over three subfolders, two with the most, then 하위 n개 더', () => {
  const row = (id: string, parentId: string | null, depth: number, openCount: number, children = 0): ProgramFolderTreeRow => ({ id, title: id, parentId, depth, open: openCount, children });
  const rows = [row('work', null, 0, 12, 5), row('report', 'work', 1, 4), row('meet', 'work', 1, 2), row('a', 'work', 1, 1), row('b', 'work', 1, 0), row('c', 'work', 1, 5),
    row('study', null, 0, 6, 1), row('s1', 'study', 1, 6), row('home', null, 0, 0)];
  // Short list: everything open.
  assert.deepEqual(programFolderListRows(rows).map(entry => entry.kind === 'folder' ? entry.row.id : 'more'), rows.map(entry => entry.id));
  // Long list: work open (the last folder opened was under it), study folded.
  const openSet = new Set(programFolderParents(rows, 'report'));
  assert.deepEqual([...openSet], ['work']);
  const long = programFolderListRows(rows, { many: true, open: openSet });
  assert.deepEqual(long.map(entry => entry.kind === 'folder' ? `${entry.row.id}${entry.folded ? '▸' : entry.folded === false ? '▾' : ''}` : `+${entry.count}`),
    ['work▾', 'report', 'c', '+3', 'study▸', 'home']);
  // 하위 n개 더 pressed: all of them.
  assert.equal(programFolderListRows(rows, { many: true, open: openSet, expanded: new Set(['work']) }).filter(entry => entry.kind === 'folder' && entry.row.parentId === 'work').length, 5);
  // A find keeps the match and its parents (open), nothing else.
  assert.deepEqual(programFolderListRows(rows, { many: true, query: 'S1' }).map(entry => entry.kind === 'folder' ? entry.row.id : 'more'), ['study', 's1']);
});

test('A2: [할 일] groups the open rows by 지난 · 오늘 · 앞으로 · 날짜 미정 (all documents, subfolders in), the finished apart', () => {
  const { space, report } = fixture();
  const rows = programExecutionTasks(space, { folderId: report });
  const groups = programFolderTaskGroups(rows, TODAY, task => task.done);
  const titles = (key: string) => groups.groups.find(group => group.key === key)?.rows.map(task => task.title);
  assert.deepEqual(groups.groups.map(group => group.key), ['late', 'today', 'later', 'undated']);
  assert.deepEqual(titles('late'), ['오래된 보고', '지난주 실적 표 정리', '보고서 검토 의견 반영']);
  assert.deepEqual(titles('today'), ['주간 보고 초안']);
  assert.deepEqual(titles('later'), ['월말 정산표']);
  assert.deepEqual(titles('undated'), ['보고 양식 바꾸기']);
  assert.deepEqual(groups.done.map(task => task.title).sort(), ['끝난 보고', '발표 자료 넘기기']);
  assert.equal(groups.open, 6);
  // A group with nothing is not drawn.
  assert.deepEqual(programFolderTaskGroups(rows.filter(task => task.date !== null), TODAY, task => task.done).groups.map(group => group.key), ['late', 'today', 'later']);
});

test('A3: [글] lists the documents the folder is in — the last written first, then by its latest day; archived ones out', () => {
  const { space, report, home } = fixture();
  const docs = programFolderWritingDocuments(space, report, open);
  assert.deepEqual(docs.map(doc => [doc.id, doc.open, doc.done, doc.lastDate]), [['d1', 5, 1, '2026-11-09'], ['d2', 1, 1, '2026-11-08']]);
  assert.deepEqual(programFolderWritingDocuments(space, report, open, 'd2').map(doc => doc.id), ['d2', 'd1']);
  assert.deepEqual(programFolderWritingDocuments({ ...space, archivedDocumentIds: ['d2'] }, report, open).map(doc => doc.id), ['d1']);
  assert.deepEqual(programFolderWritingDocuments(space, home, open).map(doc => doc.id), ['d1']);
  assert.deepEqual(programFolderWritingDocuments(space, '', open), []);
});

test('FR-6: [글] folds days before the last 7 (쓰기\'s 최근만 rule); 미정 and today stay', () => {
  const since = programFolderOldSince(TODAY);
  assert.equal(since, '2026-11-03');
  assert.equal(programFolderOldDay('2026-11-02', since), true);
  assert.equal(programFolderOldDay('2026-11-03', since), false);
  assert.equal(programFolderOldDay(null, since), false);
  const { space, report } = fixture();
  const view = readProgramFolderRegions(space.text, 'd1', report)!;
  const rows = M.rowMeta(space.text, 'd1');
  const days = view.regions.map(region => programFolderRowDay(rows[region.startIndex]));
  assert.deepEqual(days, ['2026-11-02', '2026-11-06', '2026-11-06', '2026-11-09', null]);
  assert.deepEqual(days.filter(day => programFolderOldDay(day, since)), ['2026-11-02']);
});

test('FR-3·4: the folder\'s own lines are context (not drawn), a subfolder\'s stays; a change lands in its own place; day lines cannot change', () => {
  const { space, report } = fixture();
  const view = readProgramFolderRegions(space.text, 'd1', report)!;
  const context = view.regions.flatMap(region => region.contextRows);
  // The component leaves out the context lines of this folder; '- /정산' (a subfolder) and every day's tag remain.
  assert.equal(context.filter(row => row.kind === 'scope' && row.scopeId === report).length, 4);
  assert.deepEqual(context.filter(row => row.kind === 'scope' && row.scopeId !== report).map(row => row.text), ['- /정산']);
  assert.equal(context.filter(row => row.kind === 'date').length, 4);
  // A title written in today's part goes back right where it was.
  const todayRegion = view.regions[3];
  assert.equal(todayRegion.raw, '  - [ ] 주간 보고 초안');
  const plan = planProgramRegionEdit(space.text, view, todayRegion.key, '  - [ ] 주간 보고 초안 보내기');
  assert(plan.ok);
  assert.equal(M.raw(M.getDocument(plan.next, 'd1')!), RAW1.replace('  - [ ] 주간 보고 초안', '  - [ ] 주간 보고 초안 보내기'));
  // A new day line or a '- 날짜:' line typed here is refused (R1: 전체 문서에서).
  assert.equal(planProgramRegionEdit(space.text, view, todayRegion.key, '  - [ ] 주간 보고 초안\n[2026-11-10]').ok, false);
  assert.equal(planProgramRegionEdit(space.text, view, todayRegion.key, '  - [ ] 주간 보고 초안\n    - 날짜: 2026-11-12').ok, false);
});

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const C = '../../../components/flow/integrated-poc/';
const space = read(C + 'ProgramSpace.tsx'), editor = read(C + 'ProgramTextEditor.tsx'), region = read(C + 'ProgramFolderRegionEditor.tsx');
const alpha = read(C + 'AlphaWorkspace.tsx'), regionCss = read(C + 'ProgramFolderRegionEditor.module.css'), editorCss = read(C + 'ProgramTextEditor.module.css');
const screenCss = read(C + 'ProgramFolderScreen.module.css'), list = read(C + 'ProgramFolderList.tsx');

test('the tab is 폴더 with a folder icon; its first screen is the list (no 분류 picker, no 새 분류, no 할 일 추가)', () => {
  assert(alpha.includes("['all', '폴더', 'folder']")); // F6-B1: the icon set's folder
  assert(space.includes("const mainPeriods: [ProgramPeriod, string][] = [['documents', '쓰기'], ['today', '오늘'], ['all', '폴더']];"));
  assert(!space.includes('할 일 폴더 보기') && !space.includes('>새 분류<') && !space.includes('classificationActions'));
  assert(space.includes('{folderList && folderListView(null)}'));
  assert(space.includes('{!monthGrid && !selecting && !folderTab && <details className={styles.quickDisclosure}'));
  assert(list.includes('aria-label={`모든 할 일 · 열린 할 일 ${all}개`}') && list.includes("{row.open || '—'}") && list.includes('＋ 새 폴더'));
  // A long list: find (not mid-composition), fold (44 × 52 at the row's left), 하위 n개 더.
  assert(list.includes('onCompositionEnd={event => { composing.current = false; setQuery(event.currentTarget.value); }}'));
  assert(screenCss.includes('.list .folderRow .foldToggle { flex: none; width: 44px; min-width: 44px; min-height: 52px;'));
});

test('FR-1: the three ways in open one screen — the list, the folder line (⋮ 이 폴더 보기 and its open control), the task\'s folder', () => {
  assert(list.includes('onClick={() => props.onOpen(row.id)}'));
  assert(space.includes('onOpen={id => void openFolderScreen(id)}'));
  assert(space.includes('void openFolderScreen(scopeId); } else void openDocument(scopeId); }}'));
  assert(editor.includes('>이 폴더 보기 ›</button>}') && !editor.includes('>이 폴더만 모아 보기</button>') && !editor.includes('>분류에서 이 폴더 보기</button>'));
  assert(space.includes('onClick={() => { close(); void openFolderScreen(own); }}><span>폴더</span>'));
  // One screen: [할 일] first, from the top, every editor saved before.
  const opener = space.slice(space.indexOf('  async function openFolderScreen('), space.indexOf('  /** ‹ : back to the folder list'));
  assert(opener.includes("if (!await flushAllEditors()) { showViewChangeBlocked(); return false; }"));
  assert(opener.includes("setFolderScreen({ tab: 'tasks', writing, shown: null });") && opener.includes("setPeriod('all')") && opener.includes('setFolderTop(count => count + 1);'));
  // From the top once the new screen is drawn (a frame earlier, the old screen's height could leave the page part way down).
  assert(space.includes('useEffect(() => { if (folderTop) window.scrollTo(0, 0); }, [folderTop]);'));
});

test('A2: the head (‹ · parents › · name · ⋯), [할 일 n] [글 n] tabs; rows as 오늘\'s with one meta line; 끝낸 일 folded', () => {
  assert(space.includes('aria-label="폴더 목록으로"') && space.includes('data-folder-manage') && space.includes('role="tablist"'));
  assert(space.includes("data-folder-tab=\"tasks\" onClick={() => void chooseFolderTab('tasks')}>할 일 <small>{folderOpenCount}</small>"));
  assert(space.includes('{group.rows.map(entry => renderListItem({ kind: \'row\', entry, group: null, dated: false }, group.key))}'));
  assert(space.includes('{folderDoneOpen && folderGroups.done.map('));
  // Heads in one rule: ink 14/700, the date beside muted 13; a late row's date in the late colour only.
  assert(screenCss.includes('.group { list-style: none; display: flex; align-items: center; gap: 6px; min-height: 36px; margin-top: 8px; font-size: 14px; line-height: 20px; font-weight: 700; color: var(--flowme-b-ink); }'));
  assert(space.includes("if (task.date && group === 'late') parts.push(<em className={styles.rowLate}>"));
  assert(space.includes('.tasks[data-folder-tasks]') || read(C + 'ProgramSpace.module.css').includes('.space .tasks[data-folder-tasks] .taskTitle small { font-size: 13px; line-height: 18px; }'));
});

test('A3·FR-5: [글] gives the folder to one editor (the document shown), folds the others to a line, and has no region buttons', () => {
  assert(space.includes("return folderScreen.tab === 'writing' && period === 'documents' && selected === id ? folderId : '';"));
  assert(space.includes('folderId={editorFolderOf(id)}'));
  assert(space.includes('onClick={() => void showFolderDocument(doc.id)}'));
  assert(!region.includes('>영역 저장</button>') && !region.includes('>영역 입력 취소</button>'));
  // No box: the body's own class on each region, 32px lines, no border, the day as a tag, the folder's own line not drawn.
  assert(editor.includes('hostClassName={styles.host} today={today()} onOpenLine={props.onOpenFolderLine}'));
  assert(regionCss.includes('--tle-line: 32px; --tle-font: 16px; --tle-pad-top: 0px; --tle-pad-left: 0px;'));
  assert(regionCss.includes('.regionHost { min-width: 0; border: 0; border-radius: 0; overflow: hidden; }'));
  assert(region.includes("filter(row => !(row.kind === 'scope' && row.scopeId === view.folderId))"));
  assert(region.includes("`${date === props.today ? '오늘 · ' : ''}${programCalendarDate(date, '')}`"));
  assert(regionCss.includes('.dayTag { display: flex; align-items: center; gap: 8px; min-height: 28px; margin-top: 6px; color: var(--flowme-b-muted); font-size: 13px; line-height: 18px; font-weight: 600;'));
  // 위험 3: a locked line says so and opens its own writing.
  assert(region.includes('>원래 글에서 고치기 ›</button>}'));
  // A3 ①: name · 할 일 n · 전체 문서 › (continues at the line, in 쓰기).
  assert(editor.includes('<button type="button" data-whole-document'));
  assert(space.includes("if (folderScreenRef.current) { setFolderScreen(null); props.navigate({ view: 'space', id }); }"));
});

test('FR-9: the keyboard hides the tabs and the [할 일]/[글] line; the head keeps ‹ · name · status · 완료; the bar has no 폴더', () => {
  assert(screenCss.includes(':global([data-writing-keyboard="true"]) .seg { display: none; }'));
  assert(screenCss.includes(':global([data-writing-keyboard="true"]) .head .finish { display: inline-flex; }'));
  assert(editor.includes("const body = place === 'bar' && !props.folderId;") || editor.includes("body = place === 'bar' && !props.folderId"));
  assert(editorCss.includes('.editor[data-folder-screen="true"] > .toolbar > :is(button, details:not(.saveFeedback), .toolbarSep, [data-editor-head]) { display: none; }'));
  assert(editor.includes('useEffect(() => { folderStatus?.({ label: statusLabel, warn: statusWarn }); }, [folderStatus, statusLabel, statusWarn]);'));
});

test('FR-8: 폴더 관리 in the head\'s ⋯ — 이름, 상위 폴더, where it appears, 삭제 with what stays said before the press, asked once', () => {
  const sheet = space.slice(space.indexOf('data-folder-manage-sheet'), space.indexOf("{detail?.kind === 'connect'"));
  assert(sheet.includes('>이름 변경</button>') && sheet.includes('상위 폴더') && sheet.includes('이 폴더가 나오는 곳'));
  assert(sheet.indexOf('data-folder-delete') < sheet.indexOf('삭제해도 문서와 할 일은 미분류에 남습니다. 하위 폴더는 최상위로 옮겨집니다.'));
  assert(sheet.includes('폴더를 삭제할까요?') && sheet.includes('data-folder-delete-confirm'));
});
