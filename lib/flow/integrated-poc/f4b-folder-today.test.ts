import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument, importProgramPublicVersion } from './private-space';
import { programLineDays } from './input-bar';
import { addProgramFolderTodayTask, programFolderTodayGist, programFolderTodayHome, programFolderTodayInsert, programFolderTodayPlace, programFolderTodayUndo,
  programFolderTagsOut, undoProgramFolderTodayTask } from './folder-today-add';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// F4-b (11/9, PRD FR-7, 목업 A5): the folder screen's '＋ 오늘 할 일' writes one line into the document I write in (home),
// under today's head line, under the folder's line there; what is missing is made where no other line moves (R1), and
// 되돌리기 puts the writing back in one save. Flow documents and copies are never home; '빠른 할 일' is never used.
const TODAY = '2026-11-09';
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `f4b-${++request}`, expectedSpace: space(data) });
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const raw = (data: ProgramData, id: string) => M.raw(M.getDocument(space(data).text, id));

/** Two documents of mine typed with folder lines (the editor's folder text), 보고 under 회사 일 as written. */
function account(home: string, other = '[2026-11-08]\n- /집안일\n  - [ ] 장보기') {
  let data = createProgramData();
  const ids: string[] = [];
  for (const title of ['늘 쓰는 글', '11월 계획']) { const created = ok(createProgramDocument(data, { ...base(data), title })); data = created.data; ids.push(created.result); }
  let text: TextWorkspaceState = space(data).text;
  for (const [id, body] of [[ids[0], home], [ids[1], other]] as const) {
    const typed = M.editTextResult(text, id, body, { folderText: true });
    assert.equal(typed.reason, null, body); text = typed.state;
  }
  data = programClone(data); data.spaces[actor(data)].text = text;
  data.spaces[actor(data)].position = { documentId: ids[0], lineId: null, start: 0, end: 0, scrollTop: 0 };
  assert(validateProgramData(data));
  const folder = (title: string, parent?: string) => space(data).text.folders.find(row => row.title === title && (parent === undefined || row.parentId === (parent && folderIdOf(data, parent))))!.id;
  return { data, home: ids[0], other: ids[1], folder };
}
const folderIdOf = (data: ProgramData, title: string) => space(data).text.folders.find(row => row.title === title)!.id;
function add(data: ProgramData, documentId: string | null, folderId: string, title: string) {
  const result = addProgramFolderTodayTask(data, { ...base(data), documentId, folderId, title, today: TODAY });
  return result;
}
/** Every line that was there keeps its words, its order and its day; only the new lines are new. */
function onlyAdded(before: ProgramData, after: ProgramData, id: string) {
  const old = M.getDocument(space(before).text, id)!.lines, now = M.getDocument(space(after).text, id)!.lines;
  const oldDays = programLineDays(M.raw(M.getDocument(space(before).text, id))), nowDays = programLineDays(M.raw(M.getDocument(space(after).text, id)));
  const kept = now.map((line, index) => ({ line, day: nowDays[index] })).filter(entry => old.some(line => line.id === entry.line.id));
  assert.deepEqual(kept.map(entry => entry.line), old);
  assert.deepEqual(kept.map(entry => entry.day), oldDays);
  for (const task of M.tasks(space(before).text)) {
    const now2 = M.tasks(space(after).text).find(row => row.id === task.id)!;
    assert.deepEqual([now2.date, now2.groupDate, now2.scopeId, now2.title, now2.done], [task.date, task.groupDate, task.scopeId, task.title, task.done], task.title);
  }
  assert.deepEqual(space(after).text.folders, space(before).text.folders);
}
const newTask = (before: ProgramData, after: ProgramData) => M.tasks(space(after).text).filter(task => !M.tasks(space(before).text).some(row => row.id === task.id));

test('FR-7: today and the folder line there — the task goes at the end of that folder\'s lines (after a subfolder\'s too)', () => {
  const { data, home, folder } = account('[2026-11-09]\n- /회사 일\n  - [ ] 주간 보고 초안\n  - /보고\n    - [ ] 보고서 검토\n\n- [ ] 메모 정리\n\n[2026-11-08]\n- /회사 일\n  - [ ] 어제 일');
  const company = folder('회사 일'), done = ok(add(data, home, company, '보고 일정 공유'));
  assert.equal(raw(done.data, home), '[2026-11-09]\n- /회사 일\n  - [ ] 주간 보고 초안\n  - /보고\n    - [ ] 보고서 검토\n  - [ ] 보고 일정 공유\n\n- [ ] 메모 정리\n\n[2026-11-08]\n- /회사 일\n  - [ ] 어제 일');
  onlyAdded(data, done.data, home);
  const [task] = newTask(data, done.data);
  assert.deepEqual([task.id, task.title, task.groupDate, task.scopeId, task.done], [done.result, '보고 일정 공유', TODAY, company, false]);
});

test('FR-7: a subfolder — under its own line today, else its parent\'s line today gets the subfolder line, else the whole chain', () => {
  const body = '[2026-11-09]\n- /회사 일\n  - [ ] 주간 보고 초안\n  - /보고\n    - [ ] 보고서 검토\n[2026-11-08]\n- /회사 일\n  - [ ] 어제 일';
  const { data, home, folder } = account(body);
  const report = folder('보고', '회사 일');
  const own = ok(add(data, home, report, '표 다듬기'));
  assert.equal(raw(own.data, home), '[2026-11-09]\n- /회사 일\n  - [ ] 주간 보고 초안\n  - /보고\n    - [ ] 보고서 검토\n    - [ ] 표 다듬기\n[2026-11-08]\n- /회사 일\n  - [ ] 어제 일');
  onlyAdded(data, own.data, home);
  // Only 회사 일 written today: the 보고 line goes under it (a top-level '- /보고' would be another folder).
  const second = account('[2026-11-09]\n- /회사 일\n  - [ ] 주간 보고 초안\n[2026-11-08]\n- /회사 일\n  - /보고\n    - [ ] 지난 보고');
  const report2 = second.folder('보고', '회사 일'), under = ok(add(second.data, second.home, report2, '보고 일정 공유'));
  assert.equal(raw(under.data, second.home), '[2026-11-09]\n- /회사 일\n  - [ ] 주간 보고 초안\n  - /보고\n    - [ ] 보고 일정 공유\n[2026-11-08]\n- /회사 일\n  - /보고\n    - [ ] 지난 보고');
  onlyAdded(second.data, under.data, second.home);
  assert.equal(newTask(second.data, under.data)[0].scopeId, report2);
  // Nothing of the chain today: both lines, at the end of today's part.
  const third = account('[2026-11-09]\n- [ ] 메모 정리\n\n[2026-11-08]\n- /회사 일\n  - /보고\n    - [ ] 지난 보고');
  const report3 = third.folder('보고', '회사 일'), chain = ok(add(third.data, third.home, report3, '보고 일정 공유'));
  assert.equal(raw(chain.data, third.home), '[2026-11-09]\n- [ ] 메모 정리\n- /회사 일\n  - /보고\n    - [ ] 보고 일정 공유\n\n[2026-11-08]\n- /회사 일\n  - /보고\n    - [ ] 지난 보고');
  onlyAdded(third.data, chain.data, third.home);
  assert.equal(newTask(third.data, chain.data)[0].scopeId, report3);
});

test('FR-7: a folder moved under another in 폴더 관리 (its old lines top-level) — its own line today still takes the task', () => {
  const { data, home } = account('[2026-11-09]\n- /보고\n  - [ ] 주간 보고 초안\n[2026-11-08]\n- /보고\n  - [ ] 지난 보고');
  const moved = programClone(data), report = folderIdOf(data, '보고');
  moved.spaces[actor(moved)].text.folders.push({ id: 'f-company', title: '회사 일', parentId: null });
  moved.spaces[actor(moved)].text.folders = moved.spaces[actor(moved)].text.folders.map(row => row.id === report ? { ...row, parentId: 'f-company' } : row);
  assert(validateProgramData(moved));
  const done = ok(add(moved, home, report, '표 다듬기'));
  assert.equal(raw(done.data, home), '[2026-11-09]\n- /보고\n  - [ ] 주간 보고 초안\n  - [ ] 표 다듬기\n[2026-11-08]\n- /보고\n  - [ ] 지난 보고');
  onlyAdded(moved, done.data, home);
});

test('FR-7: no folder line today — at the end of today\'s part, blank lines before the next day kept', () => {
  const { data, home, folder } = account('[2026-11-09]\n- /집안일\n  - [ ] 장보기\n\n\n[2026-11-08]\n- /보고\n  - [ ] 지난 보고');
  const report = folder('보고'), done = ok(add(data, home, report, '보고 일정 공유'));
  assert.equal(raw(done.data, home), '[2026-11-09]\n- /집안일\n  - [ ] 장보기\n- /보고\n  - [ ] 보고 일정 공유\n\n\n[2026-11-08]\n- /보고\n  - [ ] 지난 보고');
  onlyAdded(data, done.data, home);
  assert.equal(newTask(data, done.data)[0].scopeId, report);
});

test('FR-7: no head line for today — made only where 쓰기\'s date chip puts it (R1), never twice', () => {
  // Newest first: today goes above the 11/8 head, nothing under another head moves.
  const first = account('메모 맨 위\n[2026-11-08]\n- /보고\n  - [ ] 지난 보고\n[2026-11-01]\n- [ ] 오래된 일');
  const report = first.folder('보고'), top = ok(add(first.data, first.home, report, '보고 일정 공유'));
  assert.equal(raw(top.data, first.home), '메모 맨 위\n\n[2026-11-09]\n- /보고\n  - [ ] 보고 일정 공유\n\n[2026-11-08]\n- /보고\n  - [ ] 지난 보고\n[2026-11-01]\n- [ ] 오래된 일');
  onlyAdded(first.data, top.data, first.home);
  // The second line finds the head made by the first: still one head for today.
  const again = ok(add(top.data, first.home, report, '회의실 잡기'));
  assert.equal(raw(again.data, first.home).split('\n').filter(line => line === `[${TODAY}]`).length, 1);
  assert.match(raw(again.data, first.home), /- \[ \] 보고 일정 공유\n {2}- \[ \] 회의실 잡기\n/);
  onlyAdded(top.data, again.data, first.home);
  // Oldest first: at the end.
  const second = account('[2026-11-01]\n- [ ] 오래된 일\n[2026-11-08]\n- /보고\n  - [ ] 지난 보고');
  const end = ok(add(second.data, second.home, second.folder('보고'), '보고 일정 공유'));
  assert.equal(raw(end.data, second.home), '[2026-11-01]\n- [ ] 오래된 일\n[2026-11-08]\n- /보고\n  - [ ] 지난 보고\n\n[2026-11-09]\n- /보고\n  - [ ] 보고 일정 공유');
  onlyAdded(second.data, end.data, second.home);
  // An empty document.
  const third = account('', '[2026-11-08]\n- /보고\n  - [ ] 지난 보고');
  const empty = ok(add(third.data, third.home, third.folder('보고'), '첫 줄'));
  assert.equal(raw(empty.data, third.home), '[2026-11-09]\n- /보고\n  - [ ] 첫 줄');
});

test('FR-7: 미분류 has no folder line — today, outside any folder; a home stored in another folder is refused, nothing written', () => {
  const { data, home } = account('[2026-11-09]\n- /보고\n  - [ ] 주간 보고 초안');
  const done = ok(add(data, home, 'folder-unfiled', '우편물 찾기'));
  assert.equal(raw(done.data, home), '[2026-11-09]\n- /보고\n  - [ ] 주간 보고 초안\n- [ ] 우편물 찾기');
  assert.equal(newTask(data, done.data)[0].scopeId, 'folder-unfiled');
  const filed = programClone(data);
  filed.spaces[actor(filed)].text.documents = filed.spaces[actor(filed)].text.documents.map(doc => doc.id === home ? { ...doc, folderId: folderIdOf(data, '보고'), folder: '보고' } : doc);
  assert(validateProgramData(filed));
  const refused = add(filed, home, 'folder-unfiled', '우편물 찾기');
  assert(!refused.ok && refused.reason === 'unresolved' && refused.data === filed);
});

test('Home: the document 쓰기 kept last; a Flow document, a copy, an archived one or one with input waiting is skipped', () => {
  const { data, home, other } = account('[2026-11-07]\n- [ ] 이틀 전', '[2026-11-08]\n- [ ] 어제');
  assert.equal(programFolderTodayHome(space(data), TODAY), home);
  // Input waiting in it: the other document (the later day up to today).
  assert.equal(programFolderTodayHome(space(data), TODAY, [home]), other);
  const archived = programClone(data); archived.spaces[actor(archived)].archivedDocumentIds.push(home);
  assert.equal(programFolderTodayHome(space(archived), TODAY), other);
  // A copy of a public Flow kept last: skipped too.
  let copied = programClone(data);
  copied.public.flows.push({ id: 'flow-a', ownerId: 'creator-minji', currentVersionId: 'version-a', category: '생활', situations: [], derivedFrom: null, archived: false });
  copied.public.versions.push({ id: 'version-a', flowId: 'flow-a', number: 1, parentVersionId: null, title: '공개 흐름', summary: '',
    source: { kind: 'simulated-example', label: '예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-10-01T00:00:00.000Z',
    items: [{ id: 'item-a', title: '사본 할 일', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'fixed', date: '2026-11-09' }, subchecks: [] }] });
  copied = ok(importProgramPublicVersion(copied, { ...base(copied), versionId: 'version-a', itemIds: ['item-a'], anchor: TODAY })).data;
  const copy = space(copied).copies[0].documentId;
  copied.spaces[actor(copied)].position = { documentId: copy, lineId: null, start: 0, end: 0, scrollTop: 0 };
  // Skipped: the document of mine with the latest day up to today (11/8) instead.
  assert.equal(programFolderTodayHome(space(copied), TODAY), other);
  // Written into a copy by hand: refused.
  const refused = add(copied, copy, 'folder-unfiled', '사본에 쓰기');
  assert(!refused.ok && refused.reason === 'missing');
  // Nothing of mine: a new '작성한 글' takes it.
  const none = programClone(data); none.spaces[actor(none)].archivedDocumentIds.push(home, other);
  assert.equal(programFolderTodayHome(space(none), TODAY), null);
  const made = ok(add(none, null, 'folder-unfiled', '첫 할 일'));
  const doc = space(made.data).text.documents.at(-1)!;
  assert.deepEqual([doc.title, M.raw(doc)], ['작성한 글', '[2026-11-09]\n- [ ] 첫 할 일']);
  assert.equal(programFolderTodayPlace(space(none), 'folder-unfiled', TODAY).label, '새 글 · 오늘 아래에 적습니다');
});

test('The place line names the home and the folder (목업 A5)', () => {
  const { data, folder } = account('[2026-11-09]\n- /회사 일\n  - /보고\n    - [ ] 보고서 검토');
  assert.equal(programFolderTodayPlace(space(data), folder('보고', '회사 일'), TODAY).label, '늘 쓰는 글 · 오늘 › / 보고 아래에 적습니다');
  assert.equal(programFolderTodayPlace(space(data), 'folder-unfiled', TODAY).label, '늘 쓰는 글 · 오늘 아래에 적습니다');
});

test('P3-F4B-3: when another of my documents has the same name (new ones are all 작성한 글), the place says which by its first words', () => {
  const { data, home, other, folder } = account('[2026-11-09]\n- /보고\n  - [ ] 주간 보고 초안 쓰고 보내기', '[2026-11-08]\n- [ ] 어제');
  const same = programClone(data);
  for (const doc of same.spaces[actor(same)].text.documents) doc.title = '작성한 글';
  assert.equal(programFolderTodayPlace(space(same), folder('보고'), TODAY).label, '작성한 글(주간 보고 초안 쓰…) · 오늘 › / 보고 아래에 적습니다');
  assert.equal(programFolderTodayPlace(space(same), folder('보고'), TODAY).title, '작성한 글(주간 보고 초안 쓰…)');
  // Only head and folder lines: the latest day; nothing: 빈 글. A short first line stays whole.
  assert.equal(programFolderTodayGist(space(same), other), '어제');
  const heads = programClone(same); heads.spaces[actor(heads)].text = M.editTextResult(space(heads).text, home, '[2026-11-07]\n- /보고\n\n[2026-11-09]', { folderText: true }).state;
  assert.equal(programFolderTodayGist(space(heads), home), '11월 9일');
  const empty = programClone(same); empty.spaces[actor(empty)].text = M.editTextResult(space(empty).text, home, '', { folderText: true }).state;
  assert.equal(programFolderTodayGist(space(empty), home), '빈 글');
  // A name of its own: no words added.
  assert.equal(programFolderTodayPlace(space(data), folder('보고'), TODAY).title, '늘 쓰는 글');
});

test('P3-F4B-2 and the keyboard: one sentence after another tab saved first, a retry included; the line fields are writing for the tabs', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  const chrome = readFileSync(new URL('../../../components/flow/integrated-poc/useProgramMobileWritingChrome.ts', import.meta.url), 'utf8');
  assert(source.includes("const FOLDER_TODAY_CONFLICT = '다른 곳에서 먼저 바뀌어 적지 않았습니다. 칸의 글을 복사해 두고 새로고침한 뒤 다시 적어 주세요.';"));
  assert(source.includes("if (result.reason === 'conflict') folderTodayConflict.current = true;"));
  assert(source.includes("folderTodayConflict.current && (result.reason === 'conflict' || result.reason === 'unresolved') ? FOLDER_TODAY_CONFLICT"));
  assert(chrome.includes("const lineEntry = inside && active.matches('input[data-line-entry]:not(:disabled)');") && chrome.includes('const writing = body || editorTool || lineEntry;'));
  for (const name of ['ProgramFolderTodayAdd.tsx', 'ProgramGroupAddRow.tsx']) {
    const row = readFileSync(new URL(`../../../components/flow/integrated-poc/${name}`, import.meta.url), 'utf8');
    assert(row.includes('data-line-entry onInput=') && row.includes('createLineQueue') && !row.includes('disabled={saving}'), name);
  }
});

test('되돌리기: one save puts the writing back exactly (a made head and folder line go too); after another change it refuses', () => {
  const { data, home, folder } = account('메모 맨 위\n[2026-11-08]\n- /보고\n  - [ ] 지난 보고');
  const report = folder('보고'), done = ok(add(data, home, report, '보고 일정 공유'));
  const undo = programFolderTodayUndo(space(data), space(done.data));
  const back = ok(undoProgramFolderTodayTask(done.data, { ...base(done.data), ...undo }));
  assert.equal(raw(back.data, home), raw(data, home));
  assert.deepEqual(space(back.data).text, space(data).text);
  // Changed since (another line written): nothing is put back.
  const later = ok(add(done.data, home, report, '회의실 잡기'));
  const refused = undoProgramFolderTodayTask(later.data, { ...base(later.data), ...undo });
  assert(!refused.ok && refused.reason === 'conflict');
});

test('Refusals write nothing: an empty or two-line title, an archived home, a folder that is gone', () => {
  const { data, home, folder } = account('[2026-11-09]\n- /보고\n  - [ ] 주간 보고 초안');
  for (const title of ['', '   ', '한 줄\n두 줄']) { const result = add(data, home, folder('보고'), title); assert(!result.ok && result.reason === 'invalid' && result.data === data); }
  const archived = programClone(data); archived.spaces[actor(archived)].archivedDocumentIds.push(home);
  const locked = add(archived, home, folder('보고'), '보관된 글에'); assert(!locked.ok && locked.reason === 'unresolved');
  const gone = add(data, home, 'folder-none', '없는 폴더'); assert(!gone.ok && gone.reason === 'missing');
  // The tag of a folder line is never left in the text.
  assert.equal(programFolderTagsOut('- /보고 <!-- flowme-folder:v1 id=folder-1 -->'), '- /보고');
});

test('Insert plan alone: a too deep chain is refused; the insert is one range', () => {
  const chain = Array.from({ length: M.MAX_DEPTH + 1 }, (_, index) => ({ id: `f${index}`, title: `폴더${index}` }));
  assert.equal(programFolderTodayInsert('', [], TODAY, chain, '깊은 일'), null);
  const { data, home } = account('[2026-11-08]\n- [ ] 어제');
  const plan = programFolderTodayInsert(raw(data, home), M.rowMeta(space(data).text, home), TODAY, [], '오늘 일');
  assert(plan && plan.head && plan.folderLines === 0);
  const next = raw(data, home).slice(0, plan.start) + plan.text + raw(data, home).slice(plan.start);
  // F10 W-ORDER-01 (11/11): one dated head is a new document, oldest first: today's head goes under yesterday.
  assert.equal(next, '[2026-11-08]\n- [ ] 어제\n\n[2026-11-09]\n- [ ] 오늘 일');
});

test('ProgramSpace: the ＋ 오늘 할 일 row at the end of 오늘 (a field with the place line, Enter/[적기], 되돌리기); the empty state uses it; no 빠른 할 일 here', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  const row = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramFolderTodayAdd.tsx', import.meta.url), 'utf8');
  // One save through the insert rule, with its 되돌리기; the place taken from the space the save is made on.
  assert.match(source, /addProgramFolderTodayTask\(current, \{ actorId, requestId, expectedSpace: shown, documentId: place\.documentId, folderId: target, title, today \}\)/);
  assert.match(source, /undoProgramFolderTodayTask\(current,/);
  assert.match(source, /\{ label: '되돌리기', run: \(\) => void undoFolderToday\(folderTodayNotice\) \}/);
  // At the end of 오늘 (a folder with open tasks but none today still gets 오늘), and in the empty state; not on 모든 할 일.
  assert.match(source, /group\.key === 'today' && folderTodayAdd && folderGroups\.open > 0 && <li className=\{folderStyles\.todayAddRow\} data-folder-today-row>/);
  assert.match(source, /\{folderTodayAdd \|\| <button type="button" onClick=\{\(\) => void chooseMainTab\('documents'\)\}>/);
  assert.match(source, /const folderTodayAdd = folderScreen && folderId && <ProgramFolderTodayAdd/);
  // The row and its field: '＋ 오늘 할 일', one line, [적기], the place line under it; Enter, Esc and composition as the day ＋.
  assert.match(row, /data-folder-today-add[\s\S]*<span aria-hidden="true"><ProgramIcon name="plus" size=\{20\} \/><\/span>오늘 할 일/); // F6-B1: the icon set's ＋
  assert.match(row, /data-folder-today-place/);
  assert.match(row, />적기<\/button>/);
  assert.match(row, /if \(event\.nativeEvent\.isComposing\) return;/);
  assert.match(row, /createGroupAddEntry/);
  // The 폴더 tab never shows the old 할 일 추가 (빠른 할 일) form.
  assert.match(source, /!monthGrid && !selecting && !folderTab && <details className=\{styles\.quickDisclosure\}/);
  assert.doesNotMatch(source.slice(source.indexOf('async function addFolderToday'), source.indexOf('async function undoFolderToday')), /빠른 할 일|quickTaskTransition/);
});
