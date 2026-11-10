import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { createProgramDocumentInput } from './program-document-input';
import { createProgramTextDraft } from './program-text-draft';
import { planProgramWritingInput, type WritingPlan } from './writing-guard';
import { programHeldFix, programHeldPlain, programHeldReasonText, programPasteFit, programPasteOverLimit, programTextLimitShare } from './writing-guard-notice';
import { programAlignRows, programLinePieces } from './writing-hold';

// 저장 재설계 B '오류 없는 쓰기' (PRD 16절, UX inbox/ux-save-b-20261110-1704.md, 11/10).
const DOC = ['[2026-11-10]', '- /회사 일', '  - [ ] 회의실 잡기', '  - [ ] 보고서 초안', '    - 메모: 표 정리', '- /집안일', '  - [ ] 장보기', '[2026-11-11]', '- [ ] 발표 연습', '- [ ] 자료 인쇄'].join('\n');
function workspace(raw = DOC) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '쓰기 규칙' });
  const id = state.documents.at(-1)!.id;
  state = M.editTextResult(state, id, raw, { folderText: true }).state;
  assert.equal(M.raw(M.getDocument(state, id)!), raw);
  return { state, id };
}
const at = (raw: string, text: string, offset = 0) => raw.indexOf(text) + offset;
const apply = (raw: string, plan: WritingPlan) => {
  assert.equal(plan.kind, 'apply'); if (plan.kind !== 'apply') throw Error();
  return raw.slice(0, plan.splice.start) + plan.splice.text + raw.slice(plan.splice.end);
};
const lines = (state: TextWorkspaceState, id: string) => M.getDocument(state, id)!.lines;

test('K1: ⌫ at a title\'s start takes the mark whole; a cut through a mark widens to it; typing in a mark goes to the title', () => {
  const { state, id } = workspace(), title = at(DOC, '보고서 초안');
  const k1 = planProgramWritingInput(M, state, id, { start: title - 1, end: title, text: '' }, 'deleteContentBackward');
  assert.equal(apply(DOC, k1), DOC.replace('  - [ ] 보고서 초안', '  보고서 초안'));
  const half = planProgramWritingInput(M, state, id, { start: title - 4, end: title - 2, text: '' }, 'deleteContentBackward');
  assert.equal(apply(DOC, half), DOC.replace('  - [ ] 보고서 초안', '  보고서 초안'), 'never half a mark');
  const typed = planProgramWritingInput(M, state, id, { start: title - 3, end: title - 3, text: 'x' }, 'insertText');
  assert.equal(apply(DOC, typed), DOC.replace('  - [ ] 보고서 초안', '  - [ ] x보고서 초안'));
  const memo = at(DOC, '표 정리');
  assert.equal(apply(DOC, planProgramWritingInput(M, state, id, { start: memo - 1, end: memo, text: '' }, 'deleteContentBackward')), DOC.replace('    - 메모: 표 정리', '    표 정리'));
  // The model takes K1 although the task had a memo (its owner went in this very edit): the memo line stays as text.
  // The editor hands the planned splice to the draft with the edit (as for a paste).
  const k1Raw = apply(DOC, k1), edit = M.editTextResult(state, id, k1Raw, { folderText: true, ...(k1.kind === 'apply' ? { inputSplice: k1.splice } : {}) });
  assert.equal(edit.reason, null); assert.equal(M.raw(M.getDocument(edit.state, id)!), k1Raw);
  assert.equal(lines(edit.state, id)[3].id, lines(state, id)[3].id, 'the line keeps its identity');
});

test('a line joined to the one above loses its indent and mark; ⌫ in leading spaces is ⇤ and Space there ⇥ (with the lines under it)', () => {
  const { state, id } = workspace(), line = at(DOC, '  - [ ] 보고서 초안');
  const join = planProgramWritingInput(M, state, id, { start: line - 1, end: line, text: '' }, 'deleteContentBackward');
  assert.equal(apply(DOC, join), DOC.replace('회의실 잡기\n  - [ ] 보고서 초안', '회의실 잡기보고서 초안'));
  const indent = planProgramWritingInput(M, state, id, { start: line + 1, end: line + 1, text: ' ' }, 'insertText');
  assert.equal(indent.kind === 'apply' && indent.structural, 'indent');
  assert.equal(apply(DOC, indent), DOC.replace('  - [ ] 보고서 초안\n    - 메모: 표 정리', '    - [ ] 보고서 초안\n      - 메모: 표 정리'));
  const outdent = planProgramWritingInput(M, state, id, { start: line + 1, end: line + 2, text: '' }, 'deleteContentBackward');
  assert.equal(apply(DOC, outdent), DOC.replace('  - [ ] 보고서 초안\n    - 메모: 표 정리', '- [ ] 보고서 초안\n  - 메모: 표 정리'));
  // The first task under a folder has nothing to go under: the key is kept (the bar's ⇥ would refuse it too).
  const first = at(DOC, '  - [ ] 회의실 잡기');
  assert.deepEqual(planProgramWritingInput(M, state, id, { start: first, end: first, text: '\t' }, 'insertText'), { kind: 'keep', why: 'indent-refused' });
  // A folder head is not indented by text.
  const head = at(DOC, '- /집안일');
  assert.deepEqual(planProgramWritingInput(M, state, id, { start: head, end: head, text: ' ' }, 'insertText'), { kind: 'keep', why: 'folder-indent' });
});

test('K2: a deletion that would break a head asks first; [합치기] takes the head away (a folder\'s lines move out one step)', () => {
  const { state, id } = workspace();
  const folder = at(DOC, '- /집안일'), ask = planProgramWritingInput(M, state, id, { start: folder - 1, end: folder, text: '' }, 'deleteContentBackward');
  assert(ask.kind === 'ask'); if (ask.kind !== 'ask') return;
  assert.deepEqual(ask.heads, [{ index: 5, kind: 'scope', text: '- /집안일' }]);
  const merged = DOC.slice(0, ask.merge.splice.start) + ask.merge.splice.text + DOC.slice(ask.merge.splice.end);
  assert.equal(merged, DOC.replace('- /집안일\n  - [ ] 장보기', '- [ ] 장보기'));
  const edit = M.editTextResult(state, id, merged, { folderText: true });
  assert.equal(edit.reason, null, 'the model takes it (lines only taken away keep their identity)');
  const date = at(DOC, '[2026-11-11]'), dateAsk = planProgramWritingInput(M, state, id, { start: date - 1, end: date, text: '' }, 'deleteContentBackward');
  assert(dateAsk.kind === 'ask' && dateAsk.heads[0].kind === 'date');
  // A deletion across a date head and the folder head under it asks about the date head alone.
  const both = planProgramWritingInput(M, state, id, { start: at(DOC, '10]'), end: at(DOC, '- /회') + 3, text: '' }, 'deleteContentBackward');
  assert(both.kind === 'ask' && both.heads.length === 1 && both.heads[0].kind === 'date');
  // Typing inside a date head only when it stays one; ⌫ inside it the same (no merge question); a folder name is edited.
  const inside = at(DOC, '2026-11-10') + 4;
  assert.deepEqual(planProgramWritingInput(M, state, id, { start: inside, end: inside, text: 'x' }, 'insertText'), { kind: 'keep', why: 'date-head' });
  const digit = at(DOC, '2026-11-10') + 9;
  const back = planProgramWritingInput(M, state, id, { start: digit, end: digit + 1, text: '' }, 'deleteContentBackward');
  assert(back.kind === 'apply' && !back.changed, '[2026-11-1] is still a date head');
  assert.deepEqual(planProgramWritingInput(M, state, id, { start: at(DOC, ']'), end: at(DOC, ']') + 1, text: '' }, 'deleteContentBackward'), { kind: 'keep', why: 'date-head' });
  const name = at(DOC, '집안일') + 1;
  const renamed = planProgramWritingInput(M, state, id, { start: name, end: name + 1, text: '' }, 'deleteContentBackward');
  assert(renamed.kind === 'apply' && !renamed.changed, 'a folder name is edited as text');
  const slash = at(DOC, '/집안일');
  assert.equal(planProgramWritingInput(M, state, id, { start: slash, end: slash + 1, text: '' }, 'deleteContentBackward').kind, 'ask', "'- /' is one unit");
  // An empty line taken away next to a head leaves the head as it was: no question.
  const blank = DOC.replace('[2026-11-10]\n', '[2026-11-10]\n\n'), spaced = workspace(blank), after = blank.indexOf('\n\n') + 1;
  const empty = planProgramWritingInput(M, spaced.state, spaced.id, { start: after, end: after + 1, text: '' }, 'deleteContentBackward');
  assert(empty.kind === 'apply' && !empty.changed);
});

test('whole lines selected from a line\'s start go whole: the line after them keeps its indent and mark (int5 regression)', () => {
  const { state, id } = workspace(), from = at(DOC, '  - [ ] 회의실 잡기'), to = at(DOC, '  - [ ] 보고서 초안');
  const whole = planProgramWritingInput(M, state, id, { start: from, end: to, text: '' }, 'deleteContentForward');
  assert(whole.kind === 'apply' && !whole.changed, 'nothing joins the next line');
  const into = planProgramWritingInput(M, state, id, { start: from, end: to + 3, text: '' }, 'deleteContentForward');
  assert.equal(apply(DOC, into), DOC.replace('  - [ ] 회의실 잡기\n', ''), 'reaching into its indent or mark only, the next line stays whole');
});

test('pastes: lines take the indent where they land (under a line with lines under it); a paste inside a line keeps its mark', () => {
  const { state, id } = workspace(), end = at(DOC, '보고서 초안') + '보고서 초안'.length;
  const under = planProgramWritingInput(M, state, id, { start: end, end, text: '\n우유\n달걀' }, 'insertFromPaste');
  assert.equal(apply(DOC, under), DOC.replace('보고서 초안\n', '보고서 초안\n    우유\n    달걀\n'));
  const mark = at(DOC, '  - [ ] 장보기') + 4;
  const kept = planProgramWritingInput(M, state, id, { start: mark, end: mark + 4, text: '- [999%] 합성' }, 'insertFromPaste');
  assert.equal(apply(DOC, kept), DOC.replace('  - [ ] 장보기', '  - [ ] - [999%] 합성장보기'), 'the paste goes in at the title\'s start; the mark stays');
  // Composition and history are never planned.
  for (const type of ['insertCompositionText', 'historyUndo']) {
    const plan = planProgramWritingInput(M, state, id, { start: mark, end: mark, text: '가' }, type);
    assert(plan.kind === 'apply' && !plan.changed, type);
  }
});

test('the model: a multiline splice keeps the identity of the line it starts in; a task with progress records still refuses K1', () => {
  const { state, id } = workspace(), from = at(DOC, '발표 연습') + 2, to = at(DOC, '자료 인쇄') + 2;
  const raw = DOC.slice(0, from) + DOC.slice(to), edit = M.editTextResult(state, id, raw, { folderText: true, inputSplice: { start: from, end: to, text: '' } });
  assert.equal(edit.reason, null);
  assert.equal(lines(edit.state, id)[8].id, lines(state, id)[8].id);
  assert.equal(lines(edit.state, id)[8].text, '- [ ] 발표 인쇄');
  // The same across a task with a memo: the memo would go to the other task, which stays refused.
  const across = DOC.slice(0, at(DOC, '회의실') + 2) + DOC.slice(at(DOC, '보고서') + 2);
  assert.notEqual(M.editTextResult(state, id, across, { folderText: true, inputSplice: { start: at(DOC, '회의실') + 2, end: at(DOC, '보고서') + 2, text: '' } }).reason, null);
  // Progress records stay attached to their task: taking its mark away is still refused (no record is dropped).
  const task = lines(state, id)[3].id, recorded = M.recordProgress(state, task, '2026-11-10', 40);
  assert(recorded !== state && M.validate(recorded));
  const title = at(DOC, '보고서 초안'), k1 = DOC.slice(0, title - 6) + DOC.slice(title);
  assert.notEqual(M.editTextResult(recorded, id, k1, { folderText: true }).reason, null);
  // A memo that would move to another task is still refused.
  const moved = DOC.replace('  - [ ] 보고서 초안\n    - 메모: 표 정리', '    - 메모: 표 정리\n  - [ ] 보고서 초안');
  assert.notEqual(M.editTextResult(state, id, moved, { folderText: true }).reason, null);
});

test('one broken line, the other lines saved: the draft holds it, saves the rest, and saves it once fixed', async () => {
  const { state, id } = workspace(), owner = createProgramDocumentInput(state, id), sent: string[] = [];
  const draft = createProgramTextDraft(owner.initial, id, async next => { assert(M.validate(next)); sent.push(M.raw(M.getDocument(next, id)!)); return true; }, () => {}, () => true, owner, true);
  const broken = DOC.replace('  - [ ] 장보기', '  - [ ] 장보기\n - [ ] 한 칸 어긋남');
  draft.updateRaw(broken, '', { inputType: 'insertFromPaste' });
  assert.deepEqual([draft.getState().invalid, draft.getState().held?.lines, draft.getState().held?.reasons[7], draft.getState().error], [true, [7], 'indent', '']);
  assert.equal(await draft.save(), false, 'nothing else to save'); assert.equal(sent.length, 0);
  const typed = broken.replace('회의실 잡기', '회의실 잡기 확정');
  draft.updateRaw(typed, '', { inputType: 'insertText' });
  assert.equal(draft.getState().raw, typed, 'the screen keeps every line');
  await draft.save();
  assert.equal(sent.at(-1), DOC.replace('회의실 잡기', '회의실 잡기 확정'), 'the other line is saved, the broken one is not');
  const fix = programHeldFix(typed, 7, 'indent')!;
  assert.equal(fix.label, '맞추기');
  const fixed = typed.slice(0, fix.start) + fix.text + typed.slice(fix.end);
  assert(draft.updateRaw(fixed, '', { inputType: 'insertText' }));
  assert.equal(draft.getState().held, undefined);
  await draft.save();
  assert.equal(sent.at(-1), fixed, 'fixed, it is saved');
});

test('held words and fixes: [맞추기] one step under the line above, [맨 앞으로] a date head, [할 일로] and [글로 두기] a broken mark', () => {
  const raw = '- [ ] 위\n     다섯 칸\n  [2026-11-12]\n- [ 덜 쓴\n- [999%] 큰 값';
  assert.equal(programHeldFix(raw, 1, 'indent')!.text, '  ');
  assert.equal(programHeldFix(raw, 2, 'date-indent')!.label, '맨 앞으로');
  const mark = programHeldFix(raw, 3, 'mark')!, progress = programHeldFix(raw, 4, 'progress')!;
  assert.equal(raw.slice(0, mark.start) + mark.text + raw.slice(mark.end, raw.indexOf('\n', mark.end)), raw.slice(0, raw.indexOf('- [ 덜')) + '- [ ] 덜 쓴');
  assert.equal(progress.label, '할 일로');
  const plain = programHeldPlain(raw, 3, 'mark')!;
  assert.equal(raw.slice(plain.start, plain.end), '- [ ');
  assert.equal(programHeldReasonText('indent'), '들여쓰기가 한 칸 어긋났습니다');
  assert.equal(programHeldReasonText('folder', '폴더는 100개까지 만들 수 있습니다. 이 줄을'), '폴더는 100개까지 만들 수 있습니다');
  // The limit: 80% and over, a paste past it, the start that still fits.
  const big = 'a'.repeat(85_000);
  assert(programTextLimitShare(big) >= 0.8);
  assert(programPasteOverLimit(big, big.length, big.length, 'b'.repeat(20_000)));
  assert.equal(programPasteFit(big, big.length, big.length, 'b'.repeat(20_000)).length, 15_000);
  assert.deepEqual(programLinePieces(['a', 'b', 'c'], ['a', 'x', 'c', 'd']), [{ a: [1, 2], b: [1, 2] }, { a: [3, 3], b: [3, 4] }]);
});

test('11/10 18:05 (실사용): a checked task taken away is held with its reason and [되돌리기]; rows follow the text shown', async () => {
  const raw = ['[2026-11-10]', '- /미분류', '  - [x] 벤처투자정리 후 공유', '', '- /벤처투자', '  - [ ] 벤처투자정리 후 공유', '- /EA', '  - [ ] 파트역량평가 정리 확인', '    - 메모: 1. 기여도', '  - [ ] 10minit! 선정 및 공지'].join('\n');
  let { state, id } = workspace(raw);
  const checked = lines(state, id)[2].id, part = lines(state, id)[7].id;
  state = M.recordProgress(M.recordProgress(state, checked, '2026-11-10', 100), part, '2026-11-10', 25);
  assert(M.validate(state));
  const owner = createProgramDocumentInput(state, id), sent: string[] = [];
  const draft = createProgramTextDraft(owner.initial, id, async next => { sent.push(M.raw(M.getDocument(next, id)!)); return true; }, () => {}, () => true, owner, true);
  const gone = raw.replace('- /미분류\n  - [x] 벤처투자정리 후 공유\n', '');
  draft.updateRaw(gone, '', { inputType: 'deleteContentBackward' });
  const held = draft.getState().held!;
  assert.deepEqual([draft.getState().invalid, held.reasons[held.lines[0]], draft.getState().error], [true, 'records', '']);
  assert.equal(programHeldReasonText('records'), '진행 기록이 있는 할 일을 지워서 저장하지 않았습니다');
  const fix = programHeldFix(gone, held.lines[0], 'records', held.restore)!;
  assert.equal(fix.label, '되돌리기');
  assert.equal(gone.slice(0, fix.start) + fix.text + gone.slice(fix.end), raw, 'the lines go back where they were');
  // The editor's rows: the model's rows placed on the text shown, never by old index (no folder row on the 25% task).
  const rows = M.rowMeta(state, id), aligned = programAlignRows(raw, gone, rows) as (typeof rows[number] | undefined)[];
  const at = gone.split('\n').indexOf('  - [ ] 파트역량평가 정리 확인');
  assert.equal(aligned[at]?.kind, 'task'); assert.equal(aligned[at]?.id, part);
  assert.equal(aligned[gone.split('\n').indexOf('  - [ ] 10minit! 선정 및 공지')]?.id, lines(state, id)[9].id);
  assert(aligned.every((row, index) => !row || M.getDocument(state, id)!.lines.find(line => line.id === row.id)?.text === gone.split('\n')[index]), 'every row on its own text');
});

test('11/10 20:41 (실사용): after a blank line, \'- [ ] …\' typed key by key beside or under any task is saved as typed, never refused', async () => {
  const { state: source, id } = workspace(), rows = M.rowMeta(source, id), raw0 = DOC.split('\n');
  let trials = 0;
  for (const [index, row] of rows.entries()) if (row.kind === 'task' || row.kind === 'subcheck') for (const step of [0, 1]) {
    const end = row.subtreeEndIndex ?? index + 1, before = raw0.slice(0, end).join('\n') + '\n\n' + (end < raw0.length ? '\n' + raw0.slice(end).join('\n') : '');
    const state = M.editTextResult(source, id, before, { folderText: true }).state, owner = createProgramDocumentInput(state, id);
    let saved = '', raw = before, caret = raw0.slice(0, end).join('\n').length + 2;
    const draft = createProgramTextDraft(owner.initial, id, async next => { saved = M.raw(M.getDocument(next, id)!); return true; }, () => {}, () => true, owner, true);
    const key = (text: string) => {
      const s = draft.getState(), splice = { start: caret, end: caret, text };
      const planned = !s.invalid ? planProgramWritingInput(M, s.working, id, splice, 'insertText') : null;
      assert(!planned || planned.kind === 'apply', `${index}/${step} ${JSON.stringify(text)} kept`);
      const applied = planned?.kind === 'apply' ? planned.splice : splice;
      raw = raw.slice(0, applied.start) + applied.text + raw.slice(applied.end); caret = applied.start + applied.text.length;
      assert(draft.updateRaw(raw, '', { inputType: 'insertText', ...(planned ? { inputSplice: applied } : {}) }) || draft.getState().typingMark, `${index}/${step} refused at ${JSON.stringify(raw.slice(raw.lastIndexOf('\n', caret - 1) + 1, caret))}`);
    };
    for (let i = 0; i < row.depth + step; i++) key(' ');
    for (const ch of `- [ ] 하위 ${++trials}`) key(ch);
    await draft.save();
    assert.equal(saved, raw, 'saved as typed');
    const at = raw.split('\n').findIndex(text => text.endsWith(`하위 ${trials}`)), kind = M.rowMeta(draft.getState().working, id)[at]?.kind;
    assert.equal(kind, step ? 'subcheck' : row.kind, `${index}/${step}: read as a ${step ? 'subtask' : 'sibling'}`);
  }
  assert(trials >= 10);
});

test('a fixed sample of the save fuzz (Codex EDIT-FUZZ shape, 300 edits) stays at or under 5% refused after the B rules', async () => {
  let seed = 0x53ef6839;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const chars = ['가', ' ', '\n', '-', '/', '[', ']', 'x', '%', ':', '0', '\t'], pastes = ['- [', '- [ ] 새 할 일', '  - 메모: 붙여넣기', '[2026-13-45]', '- /정리', '\n\n', '제목\n다음 줄'];
  const { state, id } = workspace(), raw = DOC;
  let refused = 0;
  for (let i = 0; i < 300; i++) {
    const kind = i % 3, start = Math.floor(rnd() * (raw.length + 1)), end = kind === 1 ? start : Math.min(raw.length, start + 1 + Math.floor(rnd() * (kind === 0 ? 8 : 20)));
    const text = kind === 0 ? '' : kind === 1 ? chars[Math.floor(rnd() * chars.length)] : pastes[Math.floor(rnd() * pastes.length)];
    const plan = planProgramWritingInput(M, state, id, { start, end, text }, kind === 0 ? 'deleteContentBackward' : kind === 2 ? 'insertFromPaste' : 'insertText');
    if (plan.kind === 'keep') continue;
    const splice = plan.kind === 'ask' ? plan.merge.splice : plan.splice, structural = plan.kind === 'ask' ? plan.merge.structural : !!plan.structural;
    const next = raw.slice(0, splice.start) + splice.text + raw.slice(splice.end);
    const edit = M.editTextResult(state, id, next, { folderText: true, ...(structural ? {} : { inputSplice: splice }) });
    if (edit.reason !== null || M.raw(M.getDocument(edit.state, id)!) !== (edit.normalizedText ?? next)) refused++;
  }
  assert(refused <= 15, `refused ${refused}/300`);
});

test('the editor runs the rules on a person\'s own keys only, hands their splice to the draft, and never renders per line of its own edit', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert(editor.includes("|| type === 'insertText' && text.length === 1 && text !== '\\n')) return false;"), 'typed letters, ⌫, Delete, cut, paste only');
  assert(editor.includes('if (writingRule(event as InputEvent, type ?? \'\', start, end, insert)) return;'));
  assert(editor.includes('inputSplice: input?.inputSplice ?? plannedSplice'));
  assert(editor.includes("if (!applyingPlanRef.current) { setWritingNotice(previous => previous?.tone === 'choose' ? null : previous); noteCaretLine(); }"));
  assert(editor.includes("if (type === 'insertFromPaste' && (text.length > 4000 || text.split('\\n').length > 60)) { notePaste(from, text); return false; }"), 'a long paste goes in natively');
  assert(editor.includes('else if (controller.getState().held) scheduleSave();'), 'held lines do not stop the rest from saving');
});
