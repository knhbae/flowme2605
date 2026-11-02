import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PROGRAM_NOTICE_MS, programNoticeEndsAt, programNoticeOrder } from './program-notice';
import { eul, iga, programFolderCreatedNotice, programFolderKeptText, programFolderMoveNotice, programFolderRenamedEverywhere, ro } from './folder-notice';
import { textWorkspaceModel as M, type TextScopeBinding, type TextWorkspaceState } from './text-workspace';

// W15 (folder picker v3 2-1·2-2; folder grammar 4th edition 3.2): one notice row, its order and lifetime, and the
// D3 B words a finished folder line gets: renamed, joined, moved (with 모든 문서에 적용), and why a name went back.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('lifetime: info 6s from showing; a choice stays in its block, then 6s; a warning or a held notice stays', () => {
  assert.equal(programNoticeEndsAt({ tone: 'info', shownAt: 1000, leftBlockAt: null, held: false }), 1000 + PROGRAM_NOTICE_MS);
  assert.equal(programNoticeEndsAt({ tone: 'choose', shownAt: 1000, leftBlockAt: null, held: false }), null);
  assert.equal(programNoticeEndsAt({ tone: 'choose', shownAt: 1000, leftBlockAt: 5000, held: false }), 5000 + PROGRAM_NOTICE_MS);
  assert.equal(programNoticeEndsAt({ tone: 'warn', shownAt: 1000, leftBlockAt: null, held: false }), null);
  assert.equal(programNoticeEndsAt({ tone: 'info', shownAt: 1000, leftBlockAt: null, held: true }), null);
  assert.equal(PROGRAM_NOTICE_MS, 6000);
});

test('one at a time: an ongoing move, then warnings, then choices, then plain notices', () => {
  const order = programNoticeOrder([{ tone: 'info' as const, id: 'a' }, { tone: 'choose' as const, id: 'b' }, { tone: 'warn' as const, id: 'c' }, { tone: 'choose' as const, moving: true, id: 'd' }]);
  assert.deepEqual(order.map(entry => entry.id), ['d', 'c', 'b', 'a']);
});

test('Korean particles follow the last syllable', () => {
  assert.deepEqual(['운동', '회의', '서울', 'abc'].map(ro), ['으로', '로', '로', '로']);
  assert.deepEqual(['운동', '회의'].map(eul), ['을', '를']);
  assert.deepEqual(['운동', '회의'].map(iga), ['이', '가']);
});

const TYPED = 'doc-typed', OTHER = 'doc-other';
function account(otherLines: string | null): TextWorkspaceState {
  let text = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [
    { id: TYPED, title: '입력 문서', folder: '합성', folderId: 'f', lines: [] }, { id: OTHER, title: '다른 문서', folder: '합성', folderId: 'f', lines: [] }],
  flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  if (otherLines !== null) text = M.editTextResult(text, OTHER, otherLines, { folderText: true }).state;
  return M.editTextResult(text, TYPED, '첫 줄\n- /회의\n  - [ ] 안건', { folderText: true }).state;
}
const lineId = (state: TextWorkspaceState) => M.getDocument(state, TYPED)!.lines[1].id;
const folderOf = (state: TextWorkspaceState) => state.bindings.find((row): row is TextScopeBinding => row.kind === 'scope' && row.docId === TYPED && row.lineId === lineId(state))!.scopeId;
function finish(start: TextWorkspaceState, name: string) {
  const held = M.editTextResult(start, TYPED, `첫 줄\n- /${name}\n  - [ ] 안건`, { folderText: true, folderHold: [1] }).state;
  const done = M.editTextResult(held, TYPED, `첫 줄\n- /${name}\n  - [ ] 안건`, { folderText: true, folderMove: [1] });
  assert.equal(done.reason, null); return { before: held, after: done.state, fromId: folderOf(start) };
}

test('the D3 B words after Enter: renamed, moved (counting other documents), joined (counting its tasks)', () => {
  const alone = account(null), renamed = finish(alone, '주간회의');
  assert.deepEqual(programFolderMoveNotice(renamed.before, renamed.after, TYPED, lineId(alone), renamed.fromId),
    { kind: 'renamed', text: '폴더 이름을 ‘주간회의’로 바꿨습니다', tone: 'info', others: 0 });
  const shared = account('- /회의\n  - [ ] 다른 안건'), moved = finish(shared, '주간회의');
  assert.deepEqual(programFolderMoveNotice(moved.before, moved.after, TYPED, lineId(shared), moved.fromId),
    { kind: 'moved', text: '이 줄만 ‘주간회의’로 옮겼습니다 · 다른 문서 1곳은 ‘회의’ 그대로', tone: 'choose', others: 1 });
  const exercise = account('- /회의\n- /운동'), joined = finish(exercise, '운동');
  assert.deepEqual(programFolderMoveNotice(joined.before, joined.after, TYPED, lineId(exercise), joined.fromId),
    { kind: 'joined', text: '이 줄을 같은 자리의 ‘운동’으로 옮겼습니다 · 할 일 1개 함께', tone: 'info', others: 0 });
  // [모든 문서에 적용]: the 분류 rename path on the state before the move; every document using it is counted.
  const everywhere = M.renameScope(moved.before, moved.fromId, '주간회의');
  assert.equal(programFolderRenamedEverywhere(everywhere, moved.fromId, '회의'), '‘회의’를 모든 문서에서 ‘주간회의’로 바꿨습니다 · 2곳');
  assert.equal(M.raw(M.getDocument(everywhere, OTHER)).split('\n')[0], '- /주간회의');
});

test('a line linked elsewhere names the place: 회사 › 주간회의 (detail a)', () => {
  const base = account('- /회의');
  const company = { id: 'co', title: '회사', parentId: null }, nested = { id: 'co-meeting', title: '회의', parentId: 'co' };
  const elsewhere = { ...base, folders: [...base.folders, company, nested],
    bindings: base.bindings.map(row => row.kind === 'scope' && row.docId === TYPED && row.lineId === lineId(base) ? { ...row, scopeId: nested.id } : row),
    documents: base.documents.map(doc => doc.id === OTHER ? { ...doc, folderId: nested.id, folder: '회의' } : doc) } as TextWorkspaceState;
  const moved = finish(elsewhere, '주간회의');
  assert.equal(programFolderMoveNotice(moved.before, moved.after, TYPED, lineId(elsewhere), moved.fromId).text, '이 줄만 ‘회사 › 주간회의’로 옮겼습니다 · 다른 문서 1곳은 ‘회사 › 회의’ 그대로');
});

test('B1: a new folder is announced, by Enter or by a paste; a subfolder names its parent; a name used elsewhere counts', () => {
  // The typed document already holds '- /회의' and its task (lines 0-2); new lines go after them.
  const base = account(null), raw = M.raw(M.getDocument(base, TYPED)!), declare = (state: TextWorkspaceState, added: string, line: number) =>
    M.editTextResult(state, TYPED, raw + added, { folderText: true, folderDeclare: [line] }).state;
  const made = declare(base, '\n- /장보기', 3);
  assert.equal(programFolderCreatedNotice(base, made), '새 폴더 ‘장보기’를 만들었습니다');
  const nested = declare(made, '\n- /장보기\n  - /운', 4);
  assert.equal(programFolderCreatedNotice(made, nested), '새 폴더 ‘장보기 › 운’을 만들었습니다');
  // The same name already in another place (D4); its [그쪽으로 바꾸기…] comes with W16.
  const again = declare(nested, '\n- /장보기\n  - /운\n- /운', 5);
  assert.equal(programFolderCreatedNotice(nested, again), '새 폴더 ‘운’ · 같은 이름이 다른 곳에 1개');
  const pasted = M.editTextResult(base, TYPED, raw + '\n- /읽을거리\n- /영화\n- /음악', { folderText: true }).state;
  assert.equal(programFolderCreatedNotice(base, pasted), '새 폴더 3개를 만들었습니다: 읽을거리 외 2');
  // Linking, renaming or nothing new says nothing here.
  assert.equal(programFolderCreatedNotice(made, made), null);
  assert.equal(programFolderCreatedNotice(made, M.renameScope(made, made.folders.at(-1)!.id, '시장')), null);
});

test('why a name went back: left without Enter (b), already off (c), two of the name, another refusal', () => {
  assert.equal(programFolderKeptText('운동', '운동기', 'left'), '폴더 이름은 Enter로 마칠 때만 바뀝니다 · ‘운동’으로 두었습니다(입력: ‘운동기’)');
  assert.equal(programFolderKeptText('회의', '주간회의', 'off'), '이미 폴더 이름과 달랐던 줄은 옮기지 않습니다 · ‘회의’로 두었습니다(입력: ‘주간회의’)');
  assert.equal(programFolderKeptText('회의', '운동', 'name-conflict'), '같은 자리에 ‘운동’이 둘이라 옮기지 않았습니다 · 폴더 관리에서 정리할 수 있습니다');
  assert.equal(programFolderKeptText('회의', '운동', 'refused'), '이 줄은 옮길 수 없습니다 · ‘회의’로 두었습니다(입력: ‘운동’)');
});

test('the editor: Enter moves, the notice carries 모든 문서에 적용 and 되돌리기, and the row replaces the old notices', () => {
  const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
  assert.match(editor, /showFolderOperation\(notice\.text, notice\.tone, lineId, notice\.kind === 'moved' \? \[everywhere\] : \[\]\);/);
  assert.match(editor, /actions: \[\.\.\.actions, undo\]/, 'all folder notices share the same forward undo');
  assert.match(editor, /const next = M\.renameScope\(original, fromId, title\);\s*if \(next === original \|\| !\(await apply\(next, '폴더 이름 바꾸기', undefined, undefined, original\)\)\) return;/);
  assert.match(editor, /if \(!controller \|\| !controller\.canUndoFolderMove\(\) \|\| composingRef\.current\)/);
  assert.match(editor, /\{noticeViews\[0\] && <ProgramNoticeRow notice=\{\{ \.\.\.noticeViews\[0\], more: noticeViews\.length - 1 \}\} onClose=\{noticeViews\[0\]\.close\} \/>\}/);
  assert.match(editor, /const ends = programNoticeEndsAt\(\{ tone: folderNotice\.tone, shownAt: folderNotice\.shownAt, leftBlockAt: folderNotice\.leftBlockAt, held: noticeHeld \|\| freshHeld, waiting: folderWaiting \}\);/);
  // B1: Enter on a new "- /name" line, and a paste, announce the folders they made.
  assert.match(editor, /const notice = controller\.getState\(\)\.folderNotice \?\? \(declared \? programFolderCreatedNotice\(state\.working, controller\.getState\(\)\.working\) \?\? relinkedNotice\(lines\[index\]\?\.id\) : null\);/);
  assert.match(editor, /const notice = controller\.getState\(\)\.folderNotice \?\? programFolderCreatedNotice\(beforeText, afterText\);/);
  // The caret leaving the line's block starts a choice notice's 6s.
  assert.match(editor, /const inside = start >= 0 && index >= start && index < Math\.max\(rows\[start\]\.subtreeEndIndex, start \+ 1\);/);
  assert.match(editor, /heldFolderLineRef\.current = \{ id: line\.id, left: false, offAtStart: same \? same\.offAtStart : folderLineOff\(beforeText, line\.id\) \};/);
});

test('F21: the 분류 rename says how many documents\' folder lines change too', () => {
  const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
  assert.match(space, /count > 0 && <p data-folder-line-documents>문서 \{count\}곳의 폴더 줄도 바뀝니다<\/p>/);
});
