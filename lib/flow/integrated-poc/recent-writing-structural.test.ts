import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { extendProgramRecent, programRecentHidden, programRecentHold, restrictProgramRecent, weaveProgramRecent } from './recent-writing';
import { planFolderPickerLink } from './folder-picker';
import { folderReplay } from './folder-line-hold';
import { createAlphaStructuralDraft, validateAlphaStructuralRecoveryEntry } from './alpha-structural-recovery';

// P1 (11/7): in the recent view, a folder chosen for a new line (the bar's 폴더 chip) left the tab's recovery copy of
// that structural edit unprovable once widened to the whole document: the model appends the new folder link, the
// widening put the folded days' links after it. The tab showed '입력 보관 실패'.
const owner = '88888888-8888-4888-8888-888888888888', today = '2026-11-07';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `structural-${++request}`, expectedSpace: data.spaces[owner] });
const ymd = (d: Date) => d.toISOString().slice(0, 10);
function userDoc(top: boolean) {
  const old: string[] = [], end = new Date('2026-10-31T00:00:00Z');
  for (let i = 0; i < 40; i++) { const d = new Date(end); d.setUTCDate(d.getUTCDate() - i); old.push(`[${ymd(d)}]`, '- /미분류', `  - [${i % 3 ? 'x' : ' '}] 지난 일 ${i}`, '- /회사 미분류', '  - [x] 지난 회의', ''); }
  return [...top ? [''] : [], '[미정]', '- /집안 일', '  - [x] 서랍 정리', '  - [x] 요리 연습', '', '[2026-11-06]', '- /회사 미분류', '  - [x] 업적 평가 입력', '- /지식 허브', '  - [ ] 비정형 정확도 설계', '- /EA', '  - [x] 특허 메일 보내기', '',
    '[2026-11-05]', '- /회사 미분류', '  - [ ] 주간 정리', '- /미분류', '  - [x] 장보기', '', ...old].join('\n');
}
/** The document as the editor has it once typed: its '- /name' lines are folder links (an import leaves them text). */
function setup(top: boolean) {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = ok(createProgramDocument(initial, { ...base(initial), title: '최근', raw: '' }));
  const typed = M.editTextResult(made.data.spaces[owner].text, made.result, userDoc(top), { folderText: true });
  assert.equal(typed.reason, null);
  assert.ok(typed.state.bindings.length > 80, 'folder links');
  const docId = made.result, hold = programRecentHold(typed.state, docId, today)!;
  assert.ok(hold);
  return { whole: typed.state, docId, hold };
}

for (const top of [true, false]) test(`P1 ${top ? 'empty first line' : 'no empty first line'}: a folder chosen for a new top line in the recent view keeps a provable recovery copy and saves`, () => {
  const made = setup(top), { docId, hold } = made;
  let whole = made.whole;
  const narrow = (state: TextWorkspaceState) => restrictProgramRecent(state, docId, programRecentHidden(state, hold));
  const save = (state: TextWorkspaceState) => { const put = extendProgramRecent(whole, state, docId, programRecentHidden(whole, hold)); assert.ok(put.ok, !put.ok ? put.reason : ''); whole = put.state; return narrow(whole); };
  // The browser's steps: an empty line at the top (saved), the bar's 폴더 writes '- /' (saved), then the chip.
  let committed = narrow(whole);
  const shown = M.raw(M.getDocument(committed, docId));
  committed = save(M.editTextResult(committed, docId, `\n${shown}`, { folderText: true }).state);
  committed = save(M.editTextResult(committed, docId, `- /\n${shown}`, { folderText: true }).state);
  const line = M.getDocument(committed, docId)!.lines[0], folder = whole.folders.find(entry => entry.title === '미분류')!;
  const named = M.editTextResult(committed, docId, `- /미분류\n${shown}`, { folderText: true });
  const linked = planFolderPickerLink(named.state, docId, line.id, folder.id);
  assert.ok(!linked.problem, String(linked.problem));
  // The editor's working state is the model's reading of it (the new link appended), as the recovery's proof replays.
  const working = M.editTextResult(committed, docId, M.raw(M.getDocument(linked.state, docId)), { folderText: true, ...folderReplay(committed, linked.state, docId) });
  assert.equal(working.reason, null);
  const next = working.state;
  assert.equal(next.bindings.at(-1)!.lineId, line.id, 'the model appends the new link');
  const draft = createAlphaStructuralDraft(committed, next, docId)!;
  assert.ok(draft && validateAlphaStructuralRecoveryEntry({ ...draft, baseRevision: 0 }), 'provable in the recent part');
  // What the tab keeps: the same edit widened to the whole document (ProgramSpace's structural reader).
  const hidden = programRecentHidden(whole, hold);
  const wideBefore = extendProgramRecent(whole, draft.before, docId, hidden, false), wideNext = extendProgramRecent(whole, draft.next, docId, hidden, false);
  assert.ok(wideBefore.ok && wideNext.ok);
  assert.ok(validateAlphaStructuralRecoveryEntry({ documentId: docId, before: wideBefore.state, next: wideNext.state, baseRevision: 0 }), 'provable widened');
  // And it saves, with the new folder line first and the folded days as they were.
  const before = M.raw(M.getDocument(whole, docId)), saved = save(next);
  assert.ok(saved);
  const after = M.raw(M.getDocument(whole, docId)).split('\n');
  assert.ok(after.includes('- /미분류') && after.length === before.split('\n').length);
  assert.equal(whole.bindings.at(-1)!.lineId, line.id);
});

test('weave: with tailBeforeNew the last folded run goes back before the items new since the full list; without, after them', () => {
  const full = ['a', 'h1', 'b', 'h2', 'h3'], restricted = ['a', 'b', 'n1', 'n2'], hidden = (item: string) => item.startsWith('h');
  assert.deepEqual(weaveProgramRecent(full, restricted, hidden, item => item), ['a', 'h1', 'b', 'n1', 'n2', 'h2', 'h3']);
  assert.deepEqual(weaveProgramRecent(full, restricted, hidden, item => item, true), ['a', 'h1', 'b', 'h2', 'h3', 'n1', 'n2']);
  // Nothing new: the same either way (the full list back).
  assert.deepEqual(weaveProgramRecent(full, ['a', 'b'], hidden, item => item, true), full);
});
