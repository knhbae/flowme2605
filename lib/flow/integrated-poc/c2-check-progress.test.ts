import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PROGRAM_CHECK_CHIPS, PROGRAM_CHECK_NOTICE_MS, programCheckChipsFit, programCheckNoticeAfter, programCheckNoticeEndsAt, programCheckNoticeFailed, programCheckNoticeLive, programCheckNoticeView, programCheckSaveOutcome, programCheckTaskSignature, programCheckUndoable, type ProgramCheckNotice } from './check-progress-notice';
import type { ProgramData, ProgramTransition } from './contract';
import { createProgramData } from './program-data';
import { createProgramTextDraft } from './program-text-draft';
import { createProgramDocumentInput } from './program-document-input';
import { addProgramQuickTask, completeProgramTask, createProgramDocument, recordProgramTaskProgress } from './private-space';
import type { ProgramReferenceAccess } from './reference-execution-guard';
import { textEditorRows, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// C2 (progress input, 11/2): a check tap still completes at once; the notice row then offers 되돌리기 and 진행률로,
// whose chips (25·50·75·직접) save today's cumulative progress for that task. A task already between 1% and 99% gets
// the chips, [완료] first, on its tap. Same rules in the document editor and 오늘; the saved format does not change.
const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
const row = read('../../../components/flow/integrated-poc/ProgramNoticeRow.tsx');
const TODAY = '2026-11-02';
const notice = (patch: Partial<ProgramCheckNotice> = {}): ProgramCheckNotice =>
  ({ stage: 'done', targetId: 't', title: '장보기', before: 0, after: 100, shownAt: 1000, key: 1, ...patch });

test('the notice: 완료했습니다 [되돌리기] [진행률로], then the chips, then what a chip saved', () => {
  const done = programCheckNoticeView(notice());
  assert.equal(done.text, '완료했습니다 · 장보기');
  assert.deepEqual(done.actions.map(button => button.label), ['되돌리기', '진행률로']);
  assert.deepEqual(done.chips, []);
  const chips = programCheckNoticeView(notice({ stage: 'chips' }));
  assert.deepEqual(chips.chips.map(button => button.label), ['25%', '50%', '75%', '직접']);
  assert(chips.chips.every(button => !button.current));
  assert.deepEqual(PROGRAM_CHECK_CHIPS, [25, 50, 75]);
  const saved = programCheckNoticeView(programCheckNoticeAfter(notice({ stage: 'chips' }), 50, 2000, 2));
  assert.equal(saved.text, '진행률 50%로 기록했습니다 · 장보기');
  assert.deepEqual(saved.actions.map(button => button.label), ['되돌리기']);
  // [완료] from the chips is the done notice again, so 진행률로 stays one press away.
  assert.equal(programCheckNoticeAfter(notice({ stage: 'chips', before: 40, after: 40 }), 100, 2000, 2).stage, 'done');
});

test('a task already between 1% and 99%: [완료] [25] [50] [75] [직접], its own value pressed', () => {
  const view = programCheckNoticeView(notice({ stage: 'chips', before: 50, after: 50 }));
  assert.equal(view.text, '진행률 50% · 장보기');
  assert.deepEqual(view.chips.map(button => [button.label, !!button.current]), [['완료', false], ['25%', false], ['50%', true], ['75%', false], ['직접', false]]);
  assert.deepEqual(view.chips[0].step, { kind: 'percent', percent: 100 });
});

test('10s once shown, longer than an info notice; held or waiting, it stays', () => {
  assert.equal(PROGRAM_CHECK_NOTICE_MS, 10000);
  assert.equal(programCheckNoticeEndsAt({ shownAt: 1000 }, false), 11000);
  assert.equal(programCheckNoticeEndsAt({ shownAt: 1000 }, true), null);
  assert.equal(programCheckNoticeEndsAt({ shownAt: 1000 }, false, true), null);
});

test('되돌리기 only while the task still has what the notice left', () => {
  assert(programCheckUndoable(notice(), 100));
  assert(!programCheckUndoable(notice(), 50));
  assert(!programCheckUndoable(notice(), null));
});

test('chips on a tap only where the tap could have toggled: active, plain or canonical, nothing dated later', () => {
  const access: ProgramReferenceAccess = { documentId: 'doc', lineId: 't', reason: null, kind: 'active' };
  const meta = { kind: 'task' as const, isCanonical: true, progressTargetId: 't', progressPercent: 40, progressDate: TODAY };
  assert(programCheckChipsFit(meta, access, TODAY));
  assert(programCheckChipsFit({ ...meta, kind: 'reference' }, access, TODAY));
  assert(!programCheckChipsFit({ ...meta, progressPercent: 0 }, access, TODAY));
  assert(!programCheckChipsFit({ ...meta, progressPercent: 100 }, access, TODAY));
  assert(!programCheckChipsFit({ ...meta, progressDate: '2026-11-03' }, access, TODAY), 'a future record keeps the form');
  assert(!programCheckChipsFit({ ...meta, kind: 'subcheck', isCanonical: false }, access, TODAY));
  assert(!programCheckChipsFit(meta, { ...access, reason: '보관됨' }, TODAY));
  assert(!programCheckChipsFit(meta, { ...access, kind: 'archived' }, TODAY));
  assert(!programCheckChipsFit(meta, undefined, TODAY));
});

const DOC = 'doc-c2';
function written(raw: string): TextWorkspaceState {
  const empty = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [{ id: DOC, title: 'C2 문서', folder: '합성', folderId: 'f', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  const result = M.editTextResult(empty, DOC, raw, { folderText: true }); assert.equal(result.reason, null); return result.state;
}

test('editor criteria 1-2 on the model: tap, 진행률로 50 shows 50% with one record today; 되돌리기 puts 0% back', () => {
  const start = written('- [ ] 장보기');
  const target = textEditorRows(start, DOC)[0].progressTargetId!;
  assert.equal(M.currentProgress(start, target), 0);
  // The tap (a 0% task completes today), then the chip on the same day: its record goes from 100 to 50.
  const done = M.recordProgress(start, target, TODAY, 100);
  assert.equal(M.raw(M.getDocument(done, DOC)), '- [x] 장보기');
  const fifty = M.recordProgress(done, target, TODAY, 50);
  assert.deepEqual(M.progressHistory(fifty, target), [{ date: TODAY, percent: 50 }]);
  // Redesign 1 (총괄 11/12): the progress is in the text: the line takes [50%], as if typed.
  assert.equal(M.raw(M.getDocument(fifty, DOC)), '- [50%] 장보기', 'the text carries the value');
  assert.equal(textEditorRows(fifty, DOC)[0].progressPercent, 50, 'the check box shows 50%');
  // 되돌리기 right after the tap: the value from before it (0%), unchecked.
  const undone = M.recordProgress(done, target, TODAY, 0);
  assert.equal(M.currentProgress(undone, target), 0);
  assert.equal(M.raw(M.getDocument(undone, DOC)), '- [ ] 장보기');
});

let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: data.activeActorId, requestId: `c2-${++request}`, expectedSpace: data.spaces[data.activeActorId] });

test('오늘 criteria 1-2 on the data: 완료, then 50 is one record of 50% today; 되돌리기 is 0% again', () => {
  let data = createProgramData();
  const doc = ok(createProgramDocument(data, { ...base(data), title: 'C2 오늘' })); data = doc.data;
  const added = ok(addProgramQuickTask(data, { ...base(data), documentId: doc.result, title: '장보기', date: TODAY })); data = added.data;
  const text = (value: ProgramData) => value.spaces[value.activeActorId].text;
  const completed = ok(completeProgramTask(data, { ...base(data), taskId: added.result, date: TODAY, done: true })).data;
  assert.equal(M.currentProgress(text(completed), added.result), 100);
  const fifty = ok(recordProgramTaskProgress(completed, { ...base(completed), taskId: added.result, date: TODAY, percent: 50 })).data;
  assert.deepEqual(M.progressHistory(text(fifty), added.result), [{ date: TODAY, percent: 50 }]);
  const undone = ok(recordProgramTaskProgress(completed, { ...base(completed), taskId: added.result, date: TODAY, percent: 0 })).data;
  assert.equal(M.currentProgress(text(undone), added.result), 0);
});

test('the editor: every tap path announces a completion; a partial tap shows the chips before the form', () => {
  assert.match(editor, /editorRef\.current\?\.refresh\(\);noticeCheck\(target,checkTitle,checkBefore\);void saveNow\(\);return;/);
  assert.match(editor, /else if\(reply\.workspace\)\{void apply\(reply\.workspace,'할 일 체크 변경'\);noticeCheck\(target,checkTitle,checkBefore\);\}/);
  assert.match(editor, /\{ void apply\(change\.next, change\.percent === 100 \? '할 일 완료' : '완료 취소'\); noticeCheck\(target, checkTitle, checkBefore\); \}/);
  assert.match(editor, /if \(action\.type === 'progress-open'\) \{ if \(!showCheckChips\(lineId\)\) openProgress\(lineId\); return; \}/);
  // A chip is the progress form's own record: today's cumulative value through apply, as one change.
  assert.match(editor, /const next = M\.recordProgress\(currentState\(\), notice\.targetId, today\(\), percent\);/);
  // The buttons find the task by ID wherever its line is now, and wait out a save in flight.
  assert.match(editor, /\.find\(row => row\.progressTargetId === notice\.targetId\)\?\.id \?\? null;/);
});

test('mid-composition: a notice button keeps the caret and runs once the composition has ended (W15)', () => {
  assert.match(editor, /run = \(step: ProgramCheckStep\) => whenComposed\(\(\) => pressCheckStep\(notice\.key, step\)\)/);
  assert.match(row, /<button key=\{chip\.label\} type="button" className=\{styles\.chip\} aria-pressed=\{chip\.current \|\| undefined\} disabled=\{chip\.current\} onPointerDown=\{keepFocus\} onClick=\{chip\.run\}>/);
  assert.match(space, /const checkStep = \(key: number, step: ProgramCheckStep\) => whenPageComposed\(\(\) => \{ void runCheckStepRef\.current\(key, step\); \}\);/);
  assert.match(space, /document\.addEventListener\('compositionstart', start, true\); document\.addEventListener\('compositionend', end, true\);/);
});

test('오늘: the check tap completes and announces; a partial task gets the chips, not the detail', () => {
  // Flow pipeline S11 (11/8): the same steps, now in checkTaskFromList (the band calls it too; only the list announces).
  assert.match(space, /if \(value > 0 && value < 100\) \{ setCheckNotice\(\{ actorId, stage: 'chips', targetId: task\.id,/);
  assert.match(space, /\}, true, undefined, undefined, true\)\.then\(result => \{ done\(\); if \(result\.ok && from === 'list' && checkViewOwns\(view\)\) checkSaved\(task\.id, task\.title, value, after, proof\); return result\.ok \? 'saved' as const : 'failed' as const; \},\n\s+\(\) => \{ done\(\); return 'failed' as const; \}\);/);
  assert.match(space, /: recordProgramTaskProgress\(current, \{ \.\.\.base\(current\), taskId: task\.id, date: today, percent \}\);/);
  // [직접] opens the task's detail with its 진행 기록 open.
  assert.match(space, /data-detail-section="progress" open=\{directProgress \|\| undefined\}>/);
  // The notice sits at the screen's bottom; the row it names is scrolled up above it (headless 390: it covered it).
  assert.match(space, /if \(over > 0\) \(line\?\.closest\('dialog'\) \?\? window\)\.scrollBy\(\{ top: over \+ 8, behavior: 'instant' \}\);/);
});

// Codex reviews of C2 (11/2). 총괄's final call: a refused save is only said; the editor's own refusal handling keeps
// the input on the screen ("저장하지 못했습니다. 입력은 남아 있습니다"), and nothing here puts a value back or saves again.
test('review: a step on its way says it is saving; what failed is said as it is; the clock leaves both alone', () => {
  const saving = notice({ stage: 'chips', saving: { percent: 50, undo: false, quiet: false } });
  assert.deepEqual(programCheckNoticeView(saving), { tone: 'info', text: '진행률 50% 저장 중… · 장보기', actions: [], chips: [] });
  assert.equal(programCheckNoticeView(notice({ saving: { percent: 0, undo: true, quiet: false } })).text, '되돌리는 중… · 장보기');
  // The tap's own completion: the check shows at once, the words wait, the buttons stay, the clock runs.
  const quiet = notice({ saving: { percent: 100, undo: false, quiet: true } });
  assert.equal(programCheckNoticeView(quiet).text, '완료 저장 중… · 장보기');
  assert.deepEqual(programCheckNoticeView(quiet).actions.map(button => button.label), ['되돌리기', '진행률로']);
  assert.equal(programCheckNoticeEndsAt(quiet, false), 11000);
  assert.equal(programCheckNoticeView(notice()).text, '완료했습니다 · 장보기');
  // A choice held for a save in flight never ends with the clock; a failure stays until closed.
  assert.equal(programCheckNoticeEndsAt(saving, false), null);
  const words = (failure: Parameters<typeof programCheckNoticeFailed>[1]) => programCheckNoticeView(programCheckNoticeFailed(saving, failure, 2000, 2));
  // The editor: the input stays on the screen, as its own refusal says.
  assert.deepEqual(words({ why: 'save', asked: 100 }), { tone: 'warn', text: '완료가 저장되지 않았습니다. 입력은 남아 있습니다 · 장보기', actions: [], chips: [] });
  assert.equal(words({ why: 'save', asked: 0, askedUndo: true }).text, '되돌리기가 저장되지 않았습니다. 입력은 남아 있습니다 · 장보기');
  assert.equal(words({ why: 'save', asked: 100, dropped: { percent: 50, undo: false } }).text, '완료가 저장되지 않았습니다. 입력은 남아 있습니다 · 진행률 50%는 적용하지 않았습니다 · 장보기');
  assert.equal(words({ why: 'save', dropped: { percent: 50, undo: false } }).text, '저장되지 않아 진행률 50%를 적용하지 않았습니다 · 장보기');
  // 오늘: nothing changed, so the saved value is said.
  assert.equal(words({ why: 'save', asked: 50, kept: 100 }).text, '진행률 50%가 저장되지 않았습니다. 저장된 값은 100%입니다 · 장보기');
  assert.equal(words({ why: 'save', asked: 50, kept: null }).text, '진행률 50%가 저장되지 않았습니다. 저장된 기록이 없습니다 · 장보기');
  assert.equal(words({ why: 'changed', asked: 75, kept: 50 }).text, '진행률 75%로 바뀌지 않았습니다. 지금 값은 50%입니다 · 장보기');
  assert.equal(programCheckNoticeEndsAt(programCheckNoticeFailed(saving, { why: 'save', asked: 50 }, 2000, 2), false), null);
  assert.equal(programCheckNoticeAfter(saving, 50, 2000, 2).saving, undefined);
});

/** A draft whose commits wait for the test: release(true) accepts, release(false) refuses. */
function heldDraft(start: TextWorkspaceState) {
  let release: (accepted: boolean) => void = () => {};
  const draft = createProgramTextDraft(start, DOC, () => new Promise<boolean>(resolve => { release = resolve; }), () => {});
  return { draft, release: (accepted: boolean) => release(accepted) };
}
const outcome = (state: ReturnType<ReturnType<typeof createProgramTextDraft>['getState']>, target: string, asked: number, acked = true) =>
  programCheckSaveOutcome(M.currentProgress(state.committed, target), M.currentProgress(state.working, target), asked, state, acked);

test('review: outcomes are read off a real draft: on its way, saved, refused, overtaken', async () => {
  const start = written('- [ ] 장보기'), target = textEditorRows(start, DOC)[0].progressTargetId!;
  const { draft, release } = heldDraft(start);
  assert(draft.apply(M.recordProgress(start, target, TODAY, 100), '할 일 완료'));
  let flight = draft.save();
  assert.equal(outcome(draft.getState(), target, 100), null, 'on its way');
  release(true); assert.equal(await flight, true);
  assert.equal(outcome(draft.getState(), target, 100), 'saved');
  assert(draft.apply(M.recordProgress(draft.getState().working, target, TODAY, 50), '날짜별 누적 진행'));
  flight = draft.save(); release(false); assert.equal(await flight, false);
  const state = draft.getState();
  assert.deepEqual([M.currentProgress(state.working, target), M.currentProgress(state.committed, target)], [50, 100]);
  assert.equal(outcome(state, target, 50), 'refused');
  assert.equal(outcome(state, target, 100), 'overtaken', 'the 100% step no longer matches the screen');
  assert.equal(programCheckSaveOutcome(75, 50, 50, { saving: false, dirty: false, invalid: false, error: '' }, true), 'changed');
  assert.equal(programCheckSaveOutcome(75, 50, 50, { saving: false, dirty: true, invalid: false, error: '' }, true), null);
});

test('review P2 (3): on 오늘 a record dated after today sends a step, and a partial tap, to the form', () => {
  let data = createProgramData();
  const doc = ok(createProgramDocument(data, { ...base(data), title: 'C2 미래' })); data = doc.data;
  const added = ok(addProgramQuickTask(data, { ...base(data), documentId: doc.result, title: '운동', date: TODAY })); data = added.data;
  data = ok(recordProgramTaskProgress(data, { ...base(data), taskId: added.result, date: '2026-11-03', percent: 50 })).data;
  // Why: today's 75% is recorded, yet the later record still decides what shows.
  const after = ok(recordProgramTaskProgress(data, { ...base(data), taskId: added.result, date: TODAY, percent: 75 })).data;
  assert.equal(M.currentProgress(after.spaces[after.activeActorId].text, added.result), 50);
  assert.match(space, /if \(\(M\.latestProgress\(dataRef\.current\.spaces\[actorId\]\.text, task\.id\)\?\.date \?\? ''\) > today\) \{\n      setCheckNotice\(null\); setRecordDate\(today\); setPercent\(String\(progressNow\)\); openDetail\(\{ kind: 'task', id: task\.id \}\);/);
  assert.match(space, /if \(value > 0 && value < 100 && \(from === 'band' \|\| \(progress\?\.date \?\? ''\) > today\)\) \{ setRecordDate\(today\); setPercent\(String\(value\)\); openDetail\(\{ kind: 'task', id: task\.id \}\); return Promise\.resolve\('ignored'\); \}/);
  // And whatever the save leaves is what the notice says: another value is "바뀌지 않았습니다", not "기록했습니다".
  assert.match(space, /if \(!exact && saved !== percent\) \{ failed\(saved, 'changed'\); return; \}/);
  assert.match(space, /if \(after !== 100\) return;/);
});

test('final (1): [50%] pasted over A while its save is on its way, then refused: the 50% stays and A says nothing false', async () => {
  const start = written('- [ ] 장보기'), a = textEditorRows(start, DOC)[0].progressTargetId!;
  const { draft, release } = heldDraft(start);
  assert(draft.apply(M.recordProgress(start, a, TODAY, 100), '할 일 완료'));
  const flight = draft.save();
  assert(draft.getState().saving);
  draft.updateRaw('- [50%] 장보기', TODAY);
  release(false);
  assert.equal(await flight, false);
  const state = draft.getState();
  assert.equal(M.raw(M.getDocument(state.working, DOC)), '- [50%] 장보기', 'the pasted input is kept');
  assert.equal(M.currentProgress(state.working, a), 50);
  // A's "완료" step is overtaken by the newer input: its notice gives way; nothing is put back or saved again.
  assert.equal(outcome(state, a, 100), 'overtaken');
  assert(!/programCheckRevert|저장되지 않은 체크|restoreRefused|refusedChecks/.test(editor), 'no automatic revert or re-save');
  const settle = editor.slice(editor.indexOf('  function settleCheckSaves('), editor.indexOf('  function showCheckChips('));
  assert(!/apply\(|saveNow\(|scheduleSave\(/.test(settle), 'settling only says');
  assert.match(settle, /if \(outcome === 'overtaken'\) \{ if \(mine\?\.saving\?\.percent === percent && !checkHeld\.current\.has\(work\)\) setCheckNotice\(null\); continue; \}/);
});

test('final (2): [진행률로 → 직접] while A saves keeps A watched, so a refused save is still said', async () => {
  const step = editor.slice(editor.indexOf('  function performCheckStep('), editor.indexOf('  function closeCheckNotice('));
  assert.match(step, /const leave = \(\) => \{ if \(shown\(\)\) setCheckNotice\(null\); \};/);
  assert.match(step, /if \(step\.kind === 'direct'\) \{ leave\(\); openProgress\(lineId\); return; \}/);
  assert(!/checkSaves\.current\.delete/.test(step), 'no step ever stops watching a save');
  const settle = editor.slice(editor.indexOf('  function settleCheckSaves('), editor.indexOf('  function showCheckChips('));
  assert.match(settle, /for \(const \[work, entry\] of \[\.\.\.checkSaves\.current\]\) \{/);
  assert.match(settle, /fail\(mine \?\? notice, !!mine, outcome === 'refused' \? \{ why: 'save', asked: percent, askedUndo: undo, dropped: refused \? dropHeld\(work\) : undefined \}/);
  // The refused completion, as the draft leaves it: the screen keeps 100%, and the notice says it was not saved.
  const start = written('- [ ] 장보기'), a = textEditorRows(start, DOC)[0].progressTargetId!;
  const { draft, release } = heldDraft(start);
  assert(draft.apply(M.recordProgress(start, a, TODAY, 100), '할 일 완료'));
  const flight = draft.save(); release(false); await flight;
  assert.equal(outcome(draft.getState(), a, 100), 'refused');
  assert.equal(M.currentProgress(draft.getState().working, a), 100, 'the check stays as shown');
  assert.equal(programCheckNoticeView(programCheckNoticeFailed(notice(), { why: 'save', asked: 100 }, 2000, 2)).text, '완료가 저장되지 않았습니다. 입력은 남아 있습니다 · 장보기');
});

test('final: A then B checked in one refused save: both kept on the screen, both said not saved, nothing saved again', async () => {
  const start = written('- [ ] 장보기\n- [ ] 빨래'), [a, b] = textEditorRows(start, DOC).map(row => row.progressTargetId!);
  const { draft, release } = heldDraft(start);
  assert(draft.apply(M.recordProgress(start, a, TODAY, 100), '할 일 완료'));
  const flight = draft.save();
  // B is checked while A's save is on its way; the save carries it next.
  draft.updateRaw('- [x] 장보기\n- [x] 빨래', TODAY);
  release(false);
  assert.equal(await flight, false);
  const state = draft.getState();
  assert.equal(M.raw(M.getDocument(state.working, DOC)), '- [x] 장보기\n- [x] 빨래', 'no input lost');
  assert.deepEqual([outcome(state, a, 100), outcome(state, b, 100)], ['refused', 'refused']);
  assert.deepEqual([M.currentProgress(state.committed, a), M.currentProgress(state.committed, b)], [0, 0]);
  assert.equal(state.saving, false, 'no save of its own is started');
});

test('final: a choice waiting for a save runs after a good one, and is dropped and said after a refused one', () => {
  assert.match(editor, /const checkWorkKey = \(targetId: string\) => propsRef\.current\.docId \+ '\\n' \+ targetId;/);
  assert.match(editor, /if \(draftRef\.current\?\.getState\(\)\.saving\) \{\n      checkHeld\.current\.set\(work, \{ notice, step, signature: checkSignature\(currentState\(\), notice\.targetId\) \}\);/);
  assert.match(editor, /if \(!state \|\| state\.saving \|\| state\.error \|\| state\.invalid\) break;/);
  const settle = editor.slice(editor.indexOf('  function settleCheckSaves('), editor.indexOf('  function showCheckChips('));
  assert.match(settle, /if \(refused\) for \(const \[work, held\] of \[\.\.\.checkHeld\.current\]\) \{/);
  // × drops only a choice still waiting for its task; a newer tap on the task supersedes it.
  assert.match(editor, /if \(notice\) checkHeld\.current\.delete\(checkWorkKey\(notice\.targetId\)\);/);
  assert.match(editor, /const work = checkWorkKey\(targetId\);\n    checkHeld\.current\.delete\(work\);/);
});

// Codex re-review of the simplified C2 (11/2): two P2s.
test('re-review (1): a choice that waited for a save gives way to newer input on its task line, and says so', async () => {
  const start = written('- [ ] 장보기'), a = textEditorRows(start, DOC)[0].progressTargetId!;
  const signature = (state: TextWorkspaceState) => programCheckTaskSignature(state, a, M.currentProgress(state, a));
  const { draft, release } = heldDraft(start);
  assert(draft.apply(M.recordProgress(start, a, TODAY, 100), '할 일 완료'));
  const flight = draft.save();
  // 50% chosen while A's completion saves: held, with what A's line was then.
  const held = signature(draft.getState().working);
  // Then [75%] pasted over A's mark; both saves go through.
  draft.updateRaw('- [75%] 장보기', TODAY);
  release(true); await new Promise(resolve => setTimeout(resolve, 0)); release(true);
  assert.equal(await flight, true);
  const state = draft.getState();
  assert.equal(M.currentProgress(state.working, a), 75, 'the latest input stays');
  assert.notEqual(signature(state.working), held, 'so the held 50% is dropped, not run over it');
  // Untouched, the line keeps its signature and the choice runs.
  assert.equal(signature(M.recordProgress(start, a, TODAY, 100)), signature(M.recordProgress(start, a, TODAY, 100)));
  assert.notEqual(programCheckTaskSignature(start, a, 0), programCheckTaskSignature(start, a, 50), 'a value changed elsewhere counts too');
  assert.equal(programCheckNoticeView(programCheckNoticeFailed(notice(), { why: 'later', dropped: { percent: 50, undo: false } }, 2000, 2)).text,
    '그 뒤 입력이 있어 진행률 50%는 적용하지 않았습니다 · 장보기');
  // The runner checks before it runs anything.
  assert.match(editor, /checkHeld\.current\.delete\(held\[0\]\);\n      if \(checkSignature\(state\.working, held\[1\]\.notice\.targetId\) !== held\[1\]\.signature\) \{ dropLaterCheck\(held\[1\]\); continue; \}\n      performCheckStep\(held\[1\]\.notice, held\[1\]\.step\);/);
});

test('re-review (2): on 오늘 a check answered after the view changed brings no notice back to the new view', () => {
  assert.match(space, /const view = presentation\.current;\n    return run\(value === 100 \? '다시 열기' : '완료', current => \{/);
  assert.match(space, /const checkViewOwns = \(view: typeof presentation\.current\) => dataRef\.current\.activeActorId === actorId && view\.period === presentation\.current\.period\n    && view\.date === presentation\.current\.date && view\.folderId === presentation\.current\.folderId && view\.query === presentation\.current\.query;/);
  // A chip's answer already keeps to its notice, which a change of view clears.
  assert.match(space, /useEffect\(\(\) => \{ setCheckNotice\(null\); \}, \[actorId, period, date, folderId, query\]\);/);
  assert.match(space, /setCheckNotice\(shown => shown\?\.key !== key \? shown : undo \? null/);
});

// S4 v16 phone (11/2 19:52, 오늘): × on "진행률을 고르세요" was followed by the check going back to 0%. Not reproduced
// headless (both builds, touch and mouse, the task's document open in 쓰기 first, a composition left open there, 4x
// slower CPU). × closes the notice only, on both screens; this keeps it so.
test('v16 phone: × on the check notice only closes it; it changes no value and saves nothing (both screens)', () => {
  const today = space.slice(space.indexOf('  const checkNoticeContent = '), space.indexOf('  const orderNoticeContent = '));
  assert.match(today, /onClose=\{\(\) => setCheckNotice\(null\)\} \/>/);
  assert.equal(today.match(/onClose=/g)?.length, 1);
  const close = editor.slice(editor.indexOf('  function closeCheckNotice('), editor.indexOf('  function openProgress('));
  assert(!/apply\(|recordProgress|saveNow|scheduleSave|performCheckStep|pressCheckStep/.test(close), 'closing runs no step');
  assert.match(close, /if \(notice\) checkHeld\.current\.delete\(checkWorkKey\(notice\.targetId\)\);\n    setCheckNotice\(null\);/);
  assert.match(editor, /closeLabel: '알림 닫기', close: closeCheckNotice,/);
});

// Codex final re-review of C2 (11/2), two P2s; 총괄: a notice's words follow the real state.
test('final re-review (1): success only on the ack of the save that carried the step, not on an equal value', async () => {
  const start = written('- [ ] 장보기'), a = textEditorRows(start, DOC)[0].progressTargetId!;
  // The editor's own setup: a document input, checks taken while a save is on its way, and each accepted save
  // acknowledging the input generation it carried.
  const input = createProgramDocumentInput(start, DOC);
  let release: (accepted: boolean) => void = () => {}, acked = -1;
  const draft = createProgramTextDraft(input.initial, DOC, (_next, _label, options) => new Promise<boolean>(resolve => {
    release = accepted => { if (accepted && options?.writingGeneration !== undefined) acked = Math.max(acked, options.writingGeneration); resolve(accepted); };
  }), () => {}, () => true, input, true);
  assert(draft.applyCheck(a, TODAY));
  let flight = draft.save(); release(true); assert.equal(await flight, true);
  // Saved at 100%. Unchecked (0%, its save on its way), then checked again during that save.
  assert(draft.applyCheck(a, TODAY));
  flight = draft.save();
  assert(draft.applyCheck(a, TODAY));
  const step = draft.generation();
  // The saved record still says 100% from before: equal, but not this step's save. On its way, not "완료했습니다".
  let state = draft.getState();
  assert.deepEqual([M.currentProgress(state.committed, a), M.currentProgress(state.working, a)], [100, 100]);
  assert.equal(outcome(state, a, 100, acked >= step), null);
  assert.equal(outcome(state, a, 100, true), 'saved', 'what an equal value alone would have said');
  // The 0% save is acked (an earlier generation); the one carrying the re-check goes next and is refused.
  release(true); await new Promise(resolve => setTimeout(resolve, 0));
  state = draft.getState();
  assert.equal(M.currentProgress(state.committed, a), 0);
  assert(acked < step);
  assert.equal(outcome(state, a, 100, acked >= step), null, 'still on its way');
  release(false); assert.equal(await flight, false);
  assert.equal(outcome(draft.getState(), a, 100, acked >= step), 'refused');
  // The editor marks each step with its generation and settles it on its own save's ack.
  assert.match(editor, /if \(accepted && options\?\.writingGeneration !== undefined\) checkAcked\.current = Math\.max\(checkAcked\.current, options\.writingGeneration\);/);
  assert.match(editor, /const acked = !state\.dirty && !state\.saving \? Math\.max\(checkAcked\.current, draftRef\.current\?\.generation\(\) \?\? -1\) : checkAcked\.current;/);
  assert.match(editor, /programCheckSaveOutcome\(saved, M\.currentProgress\(state\.working, targetId\), percent, state, acked >= entry\.generation\);/);
  assert.equal(editor.match(/generation: draftRef\.current\?\.generation\(\) \?\? 0/g)?.length, 2);
});

test('final re-review (2): a failure says the value the screen shows now, read as it is drawn', () => {
  // 25%, then 50% chosen; a re-read brought 75% while it waited; the save was refused. The screen shows 75%.
  const refused = programCheckNoticeFailed(notice({ stage: 'chips', before: 25, after: 25 }), { why: 'save', asked: 50, kept: 25 }, 2000, 2);
  assert.equal(programCheckNoticeView(programCheckNoticeLive(refused, 75)).text, '진행률 50%가 저장되지 않았습니다. 저장된 값은 75%입니다 · 장보기');
  assert.equal(programCheckNoticeView(programCheckNoticeLive(programCheckNoticeFailed(notice(), { why: 'changed', asked: 75, kept: 50 }, 2000, 2), 30)).text,
    '진행률 75%로 바뀌지 않았습니다. 지금 값은 30%입니다 · 장보기');
  // The editor's refusal names no value (its input stays on the screen), so nothing is read in.
  const kept = programCheckNoticeFailed(notice(), { why: 'save', asked: 100 }, 2000, 2);
  assert.equal(programCheckNoticeLive(kept, 0), kept);
  const plain = notice();
  assert.equal(programCheckNoticeLive(plain, 0), plain);
  // Both screens read it at drawing time: 오늘 from what it shows, the editor from its saved state.
  assert.match(space, /programCheckNoticeView\(programCheckNoticeLive\(checkNotice, M\.currentProgress\(space\.text, checkNotice\.targetId\)\)\)/);
  assert.match(editor, /programCheckNoticeView\(programCheckNoticeLive\(notice, M\.currentProgress\(draft\.committed, notice\.targetId\)\)\)/);
});
