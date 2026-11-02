import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PROGRAM_CHECK_CHIPS, PROGRAM_CHECK_NOTICE_MS, programCheckChipsFit, programCheckNoticeAfter, programCheckNoticeEndsAt, programCheckNoticeFailed, programCheckNoticeView, programCheckSaveOutcome, programCheckUndoable, type ProgramCheckNotice } from './check-progress-notice';
import type { ProgramData, ProgramTransition } from './contract';
import { createProgramData } from './program-data';
import { createProgramTextDraft } from './program-text-draft';
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
  assert.equal(M.raw(M.getDocument(fifty, DOC)), '- [ ] 장보기', 'the line keeps its plain mark; the format does not change');
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
  assert.match(editor, /if \(draftRef\.current\?\.getState\(\)\.saving\) \{ heldCheckStep\.current = \{ key, step \}; setCheckNotice\(\{ \.\.\.notice, saving: \{ percent, undo: step\.kind === 'undo', quiet: false \} \}\); return; \}/);
});

test('mid-composition: a notice button keeps the caret and runs once the composition has ended (W15)', () => {
  assert.match(editor, /run = \(step: ProgramCheckStep\) => whenComposed\(\(\) => runCheckStep\(notice\.key, step\)\)/);
  assert.match(row, /<button key=\{chip\.label\} type="button" className=\{styles\.chip\} aria-pressed=\{chip\.current \|\| undefined\} disabled=\{chip\.current\} onPointerDown=\{keepFocus\} onClick=\{chip\.run\}>/);
  assert.match(space, /const checkStep = \(key: number, step: ProgramCheckStep\) => whenPageComposed\(\(\) => \{ void runCheckStepRef\.current\(key, step\); \}\);/);
  assert.match(space, /document\.addEventListener\('compositionstart', start, true\); document\.addEventListener\('compositionend', end, true\);/);
});

test('오늘: the check tap completes and announces; a partial task gets the chips, not the detail', () => {
  assert.match(space, /if \(value > 0 && value < 100\) setCheckNotice\(\{ actorId, stage: 'chips', targetId: task\.id,/);
  assert.match(space, /\}, true, undefined, undefined, true\)\.then\(result => \{ done\(\); if \(result\.ok\) checkSaved\(task\.id, task\.title, value, after\); \}, done\);/);
  assert.match(space, /const next = recordProgramTaskProgress\(current, \{ \.\.\.base\(current\), taskId: task\.id, date: today, percent \}\);/);
  // [직접] opens the task's detail with its 진행 기록 open.
  assert.match(space, /data-detail-section="progress" open=\{directProgress \|\| undefined\}>/);
  // The notice sits at the screen's bottom; the row it names is scrolled up above it (headless 390: it covered it).
  assert.match(space, /if \(over > 0\) \(line\?\.closest\('dialog'\) \?\? window\)\.scrollBy\(\{ top: over \+ 8, behavior: 'instant' \}\);/);
});

// Codex review of C2 (11/2), three P2 fixes.
test('review P2: a step on its way says it is saving; a failure says what is saved; the clock leaves both alone', () => {
  const saving = notice({ stage: 'chips', saving: { percent: 50, undo: false, quiet: false } });
  assert.deepEqual(programCheckNoticeView(saving), { tone: 'info', text: '진행률 50% 저장 중… · 장보기', actions: [], chips: [] });
  assert.equal(programCheckNoticeView(notice({ saving: { percent: 0, undo: true, quiet: false } })).text, '되돌리는 중… · 장보기');
  // A tap's own completion saves quietly: its notice and buttons stay, and so does its clock.
  const quiet = notice({ saving: { percent: 100, undo: false, quiet: true } });
  assert.deepEqual(programCheckNoticeView(quiet).actions.map(button => button.label), ['되돌리기', '진행률로']);
  assert.equal(programCheckNoticeEndsAt(quiet, false), 11000);
  // P2 (2): a choice held for a save in flight never ends with the clock.
  assert.equal(programCheckNoticeEndsAt(saving, false), null);
  const refused = programCheckNoticeFailed(saving, 50, 100, 'save', 2000, 2);
  assert.equal(refused.saving, undefined);
  assert.deepEqual(programCheckNoticeView(refused), { tone: 'warn', text: '진행률 50%를 저장하지 못했습니다. 저장된 값은 100%입니다 · 장보기', actions: [], chips: [] });
  assert.equal(programCheckNoticeEndsAt(refused, false), null, 'a failure stays until closed');
  assert.equal(programCheckNoticeView(programCheckNoticeFailed(quiet, 100, 0, 'save', 2000, 2)).text, '완료를 저장하지 못했습니다. 저장된 값은 0%입니다 · 장보기');
  assert.equal(programCheckNoticeView(programCheckNoticeFailed(saving, 75, 50, 'changed', 2000, 2)).text, '진행률 75%로 바뀌지 않았습니다. 지금 값은 50%입니다 · 장보기');
  assert.equal(programCheckNoticeView(programCheckNoticeFailed(saving, 50, null, 'save', 2000, 2)).text, '진행률 50%를 저장하지 못했습니다. 저장된 기록이 없습니다 · 장보기');
  assert.equal(programCheckNoticeAfter(saving, 50, 2000, 2).saving, undefined);
});

test('review P2 (1): the outcome is read off the saved record, through a real draft whose second save is refused', async () => {
  const start = written('- [ ] 장보기'), target = textEditorRows(start, DOC)[0].progressTargetId!;
  let accept = true;
  const draft = createProgramTextDraft(start, DOC, async () => accept, () => {});
  assert(draft.apply(M.recordProgress(start, target, TODAY, 100), '할 일 완료'));
  assert.equal(await draft.save(), true);
  assert.equal(programCheckSaveOutcome(M.currentProgress(draft.getState().committed, target), 100, draft.getState()), 'saved');
  accept = false;
  assert(draft.apply(M.recordProgress(draft.getState().working, target, TODAY, 50), '날짜별 누적 진행'));
  const flight = draft.save();
  assert.equal(programCheckSaveOutcome(M.currentProgress(draft.getState().committed, target), 50, draft.getState()), null, 'on its way');
  assert.equal(await flight, false);
  const state = draft.getState(), saved = M.currentProgress(state.committed, target);
  assert.equal(M.currentProgress(state.working, target), 50, 'the screen still has 50%');
  assert.equal(saved, 100, 'the saved record still has 100%');
  assert.equal(programCheckSaveOutcome(saved, 50, state), 'refused');
  // Everything saved, but with another value (changed since): not "기록했습니다" either.
  assert.equal(programCheckSaveOutcome(75, 50, { saving: false, dirty: false, invalid: false, error: '' }), 'changed');
  assert.equal(programCheckSaveOutcome(75, 50, { saving: false, dirty: true, invalid: false, error: '' }), null);
});

test('review P2 (1)(2): the editor says 기록했습니다 only once the save settles; a held choice waits out the save', () => {
  const step = editor.slice(editor.indexOf('  function runCheckStep('), editor.indexOf('  function openProgress('));
  assert(!step.includes('programCheckNoticeAfter('), 'no success straight after apply');
  assert.match(step, /setCheckNotice\(\{ \.\.\.notice, saving: \{ percent, undo: step\.kind === 'undo', quiet: false \} \}\);\n    settleCheckSave\(\);/);
  const settle = editor.slice(editor.indexOf('  function settleCheckSave('), editor.indexOf('  function showCheckChips('));
  assert.match(settle, /saved = M\.currentProgress\(state\.committed, notice\.targetId\);/);
  assert.match(settle, /if \(!notice\?\.saving \|\| !state \|\| heldCheckStep\.current\?\.key === notice\.key\) return;/);
  assert.match(editor, /useEffect\(\(\) => \{ settleCheckSave\(\); \}, \[draft\]\);/);
  // The tap's own completion is watched quietly, so a refused one says so.
  assert.match(editor, /saving: \{ percent: 100, undo: false, quiet: true \} \}\);/);
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
  assert.match(space, /if \(value > 0 && value < 100 && \(progress\?\.date \?\? ''\) > today\) \{ setRecordDate\(today\); setPercent\(String\(value\)\); openDetail\(\{ kind: 'task', id: task\.id \}\); \}/);
  // And whatever the save leaves is what the notice says: another value is "바뀌지 않았습니다", not "기록했습니다".
  assert.match(space, /if \(saved !== percent\) \{ failed\(saved, 'changed'\); return; \}/);
  assert.match(space, /if \(after !== 100\) return;/);
});
