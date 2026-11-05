import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { programSame } from './controller';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { extendProgramRecent, extendProgramRecentRaw, moveProgramRecentOffset, programRecentFolds, programRecentHidden, programRecentHold, restrictProgramRecent,
  weaveProgramRecent } from './recent-writing';

// 11/5 쓰기 '최근만 쓰기' (W-a): the UX proposal's synthetic documents — every day two or three 분류 with tasks, what
// was not done written again the next day, [미정] and tomorrow on top ('desc', the user's shape) or the old days first.
const owner = '88888888-8888-4888-8888-888888888888', today = '2026-11-05';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `recent-${++request}`, expectedSpace: data.spaces[owner] });
const POOL: Record<string, string[]> = { '회사 일': ['보고서 초안', '메일 회신', '회의 자료', '주간 정리', '평가 입력'], '공부': ['영어 단어', '책 30쪽', '강의 1개'],
  '운동': ['스트레칭', '러닝 30분', '근력'], '집안 일': ['빨래', '장보기', '분리수거', '세탁소'] };
const NAMES = Object.keys(POOL);
function build(days: number, order: 'desc' | 'asc') {
  let seed = days * 7 + 1;
  const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const end = new Date(`${today}T00:00:00Z`), sections: string[][] = [];
  let carry: { f: string; t: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end); d.setUTCDate(d.getUTCDate() - i);
    const folders = [NAMES[(days - i) % 4], NAMES[(days - i + 1) % 4], ...random() < 0.3 ? [NAMES[(days - i + 2) % 4]] : []];
    const tasks: Record<string, string[]> = {};
    for (const f of folders) tasks[f] = POOL[f].filter(() => random() < 0.5).slice(0, 3);
    for (const c of carry) if (random() < 0.75 && !(tasks[c.f] ??= []).includes(c.t)) tasks[c.f].push(c.t);
    carry = [];
    const lines = [`[${d.toISOString().slice(0, 10)}]`];
    for (const f of Object.keys(tasks)) {
      if (!tasks[f].length) continue;
      lines.push(`- /${f}`);
      for (const t of tasks[f]) {
        const done = i === 0 ? false : random() < 0.5;
        lines.push(`  - [${done ? 'x' : ' '}] ${t}`);
        if (random() < 0.08) lines.push('    - 메모: 합성 메모');
        if (random() < 0.05) lines.push('    - 시간: 13:00');
        if (!done) carry.push({ f, t });
      }
    }
    lines.push('');
    sections.push(lines);
  }
  const tomorrow = ['[2026-11-06]', '- /회사 일', '  - [ ] 평가 입력', ''];
  const undated = ['[미정]', '- /회사 일', '  - [x] 수시 피드백', '  - [ ] 분기 계획', '- /집안 일', '  - [x] 요리 연습', '  - [ ] 서랍 정리', ''];
  return (order === 'desc' ? [undated, tomorrow, ...sections.reverse()] : [undated, ...sections, tomorrow]).flat().join('\n');
}
function write(raw: string) {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = ok(createProgramDocument(initial, { ...base(initial), title: '할 일', raw }));
  return { text: made.data.spaces[owner].text, docId: made.result };
}
const rawOf = (state: TextWorkspaceState, docId: string) => M.raw(M.getDocument(state, docId));
const edit = (state: TextWorkspaceState, docId: string, raw: string, progressDate?: string) => {
  const result = M.editTextResult(state, docId, raw, progressDate ? { progressDate } : undefined);
  assert.equal(result.reason, null); return result.state;
};

test('W-a: a 3-month document (newest on top) folds the 83 days before the last 7 into one run at the end', () => {
  const { text, docId } = write(build(90, 'desc'));
  assert.equal(M.getDocument(text, docId)!.lines.length, 1064);
  const hold = programRecentHold(text, docId, today)!;
  assert(hold);
  assert.equal(hold.since, '2026-10-30');
  const hidden = programRecentHidden(text, hold), restricted = restrictProgramRecent(text, docId, hidden);
  assert(M.validate(restricted));
  const shown = rawOf(restricted, docId).split('\n');
  assert.equal(shown[0], '[미정]');
  assert(shown.includes('[2026-11-05]') && shown.includes('[2026-10-30]') && !shown.includes('[2026-10-29]'));
  assert(shown.length < 120, `${shown.length} lines in view`);
  const folds = programRecentFolds(text, docId, hidden);
  assert.equal(folds.length, 1);
  assert.deepEqual({ through: folds[0].through, days: folds[0].days, atEnd: folds[0].atEnd }, { through: '2026-10-29', days: 83, atEnd: true });
  assert(folds[0].tasks > 300 && folds[0].open > 0 && folds[0].open < folds[0].tasks, `${folds[0].tasks}/${folds[0].open}`);
  // Put back unchanged, the whole workspace is exactly the one it came from.
  const back = extendProgramRecent(text, restricted, docId, hidden);
  assert(back.ok); assert(programSame(back.state, text)); assert.equal(rawOf(back.state, docId), rawOf(text, docId));
});

test('W-a: a line written today goes back in today\'s place; deleting and checking in view work as in the whole document', () => {
  const { text, docId } = write(build(90, 'desc'));
  const hold = programRecentHold(text, docId, today)!, hidden = programRecentHidden(text, hold), restricted = restrictProgramRecent(text, docId, hidden);
  const shown = rawOf(restricted, docId), at = shown.indexOf('[2026-11-05]');
  const typed = edit(restricted, docId, `${shown.slice(0, at)}[2026-11-05]\n- [ ] 새로 쓴 일${shown.slice(at + '[2026-11-05]'.length)}`);
  const saved = extendProgramRecent(text, typed, docId, hidden);
  assert(saved.ok);
  const whole = rawOf(text, docId), expected = whole.replace('[2026-11-05]', '[2026-11-05]\n- [ ] 새로 쓴 일');
  assert.equal(rawOf(saved.state, docId), expected);
  // The folded lines keep their IDs and bytes.
  const savedLines = M.getDocument(saved.state, docId)!.lines;
  for (const line of M.getDocument(text, docId)!.lines.filter(line => hidden.has(line.id))) assert.deepEqual(savedLines.find(entry => entry.id === line.id), line);
  // Back in the editor's terms it is exactly what the editor had (its own save is recognized).
  assert(programSame(restrictProgramRecent(saved.state, docId, programRecentHidden(saved.state, hold)), typed));
  // Delete a line in view and check another: the whole model accepts both with the folded part as it was.
  const lines = rawOf(typed, docId).split('\n'), drop = lines.findIndex(line => line === '  - [ ] 분기 계획');
  const deleted = edit(typed, docId, lines.filter((_, index) => index !== drop).join('\n'));
  const open = rawOf(deleted, docId).split('\n'), check = open.findIndex((line, index) => index > open.indexOf('[2026-11-05]') && /^ {2}- \[ \] /.test(line));
  const checked = edit(deleted, docId, open.map((line, index) => index === check ? line.replace('[ ]', '[x]') : line).join('\n'), today);
  const after = extendProgramRecent(saved.state, checked, docId, programRecentHidden(saved.state, hold));
  assert(after.ok);
  assert(!rawOf(after.state, docId).includes('  - [ ] 분기 계획\n  - [x] 요리'));
  assert.equal(rawOf(after.state, docId).split('\n').filter(line => !rawOf(checked, docId).split('\n').includes(line)).length > 0, true);
});

test('W-a: old days first — the run sits between [미정] and the last 7 days, and lines written at the end of [미정] stay there', () => {
  const { text, docId } = write(build(90, 'asc'));
  const hold = programRecentHold(text, docId, today)!, hidden = programRecentHidden(text, hold), restricted = restrictProgramRecent(text, docId, hidden);
  const folds = programRecentFolds(text, docId, hidden);
  assert.deepEqual(folds.map(fold => fold.atEnd), [false]);
  const shown = rawOf(restricted, docId), typed = edit(restricted, docId, shown.replace('  - [ ] 서랍 정리', '  - [ ] 서랍 정리\n  - [ ] 미정에 더한 일'));
  const saved = extendProgramRecent(text, typed, docId, hidden);
  assert(saved.ok);
  const whole = rawOf(saved.state, docId).split('\n');
  assert(whole.indexOf('  - [ ] 미정에 더한 일') < whole.indexOf('[2026-08-08]'));
  assert.equal(rawOf(saved.state, docId), rawOf(text, docId).replace('  - [ ] 서랍 정리', '  - [ ] 서랍 정리\n  - [ ] 미정에 더한 일'));
});

test('W-a: 200 lines or fewer, nothing old, or a recent part that would read differently alone is not folded', () => {
  const week = write(build(7, 'desc'));
  assert.equal(M.getDocument(week.text, week.docId)!.lines.length, 99);
  assert.equal(programRecentHold(week.text, week.docId, today), null);
  // Long, but nothing older than the last 7 days.
  const notes = write([...Array.from({ length: 210 }, (_, index) => `메모 ${index}`), build(7, 'desc')].join('\n'));
  assert(M.getDocument(notes.text, notes.docId)!.lines.length > 300);
  assert.equal(programRecentHold(notes.text, notes.docId, today), null);
  // A code fence opened in an old day: what it holds counts as that day's, so it folds with it and the rest reads the same.
  const fenced = write(build(90, 'asc').replace('[2026-10-29]', '[2026-10-29]\n```').replace('[2026-10-31]', '[2026-10-31]\n```'));
  const held = programRecentHold(fenced.text, fenced.docId, today)!;
  const view = rawOf(restrictProgramRecent(fenced.text, fenced.docId, programRecentHidden(fenced.text, held)), fenced.docId);
  assert(!view.includes('```') && !view.includes('[2026-10-30]') && view.includes('[2026-11-01]'));
});

test('W-a: a save that would change how folded lines read is refused (a fence opened right before them)', () => {
  const { text, docId } = write(build(90, 'asc'));
  const hold = programRecentHold(text, docId, today)!, hidden = programRecentHidden(text, hold), restricted = restrictProgramRecent(text, docId, hidden);
  // The model refuses typing an open fence; a state that got one anyway (the recent part reads fine alone) is refused here.
  assert.equal(M.editTextResult(restricted, docId, rawOf(restricted, docId).replace('  - [ ] 서랍 정리\n', '  - [ ] 서랍 정리\n```\n')).reason, 'blocked');
  const lines = M.getDocument(restricted, docId)!.lines, at = lines.findIndex(line => line.text === '  - [ ] 서랍 정리');
  const typed = { ...restricted, documents: restricted.documents.map(doc => doc.id === docId
    ? { ...doc, lines: [...lines.slice(0, at + 1), { id: 'fence-opened-here', text: '```' }, ...lines.slice(at + 1)] } : doc) };
  const saved = extendProgramRecent(text, typed, docId, hidden);
  assert.equal(saved.ok, false);
  assert(!saved.ok && ['invalid', 'hidden-context'].includes(saved.reason), !saved.ok ? saved.reason : '');
});

test('W-a: a line once in view stays in view; a folded line moved into a recent day comes into view', () => {
  const { text, docId } = write(build(90, 'desc'));
  const hold = programRecentHold(text, docId, today)!;
  // Dated back by hand: today's section becomes an old day, but its lines were not folded when the document opened.
  const dated = edit(text, docId, rawOf(text, docId).replace('[2026-11-05]', '[2026-10-01]'));
  const hidden = programRecentHidden(dated, hold);
  assert(rawOf(restrictProgramRecent(dated, docId, hidden), docId).includes('[2026-10-01]'));
  // An old day re-dated to today elsewhere (another device): its lines are no longer in an old section.
  const moved = edit(text, docId, rawOf(text, docId).replace('[2026-10-29]', '[2026-11-04]'));
  assert(rawOf(restrictProgramRecent(moved, docId, programRecentHidden(moved, hold)), docId).split('\n').filter(line => line === '[2026-11-04]').length === 2);
  // A line added at the very end (an import), under the oldest day: it reads as that day's and folds with it, and a save
  // in view still puts everything back.
  const added = edit(text, docId, `${rawOf(text, docId)}\n- [ ] 끝에 넣은 일`), hidden2 = programRecentHidden(added, hold);
  const view = restrictProgramRecent(added, docId, hidden2);
  assert(!rawOf(view, docId).includes('끝에 넣은 일'));
  const typed = edit(view, docId, rawOf(view, docId).replace('[2026-11-05]', '[2026-11-05]\n- [ ] 오늘 쓴 일'));
  const saved = extendProgramRecent(added, typed, docId, hidden2);
  assert(saved.ok && rawOf(saved.state, docId).endsWith('- [ ] 끝에 넣은 일'));
});

test('W-a: the 복구함 gets the whole raw of what was typed in view, and positions move between the two by line', () => {
  for (const order of ['desc', 'asc'] as const) {
    const { text, docId } = write(build(90, order));
    const hold = programRecentHold(text, docId, today)!, hidden = programRecentHidden(text, hold), restricted = restrictProgramRecent(text, docId, hidden);
    const shown = rawOf(restricted, docId), whole = rawOf(text, docId);
    assert.equal(extendProgramRecentRaw(text, docId, hidden, shown), whole);
    const typed = shown.replace('[2026-11-05]', '[2026-11-05]\n- [ ] 저장 전에 쓴 일');
    assert.equal(extendProgramRecentRaw(text, docId, hidden, typed), whole.replace('[2026-11-05]', '[2026-11-05]\n- [ ] 저장 전에 쓴 일'));
    // The caret on today's header, column 3, is the same line and column in the whole raw.
    const from = M.getDocument(restricted, docId)!.lines, to = M.getDocument(text, docId)!.lines;
    const at = shown.indexOf('[2026-11-05]') + 3;
    assert.equal(moveProgramRecentOffset(from, to, at), whole.indexOf('[2026-11-05]') + 3);
    assert.equal(moveProgramRecentOffset(to, from, whole.indexOf('[2026-11-05]') + 3), at);
    // A folded line is not in view: the start.
    assert.equal(moveProgramRecentOffset(to, from, whole.indexOf('[2026-10-29]')), 0);
  }
});

test('W-a: weaving puts each hidden run before the next item still there, else at the end', () => {
  const full = ['a', 'H1', 'H2', 'b', 'c', 'H3', 'd', 'H4'];
  const hidden = (item: string) => item.startsWith('H');
  assert.deepEqual(weaveProgramRecent(full, ['a', 'b', 'c', 'd'], hidden, item => item), full);
  assert.deepEqual(weaveProgramRecent(full, ['a', 'x', 'c', 'd'], hidden, item => item), ['a', 'x', 'H1', 'H2', 'c', 'H3', 'd', 'H4']);
  assert.deepEqual(weaveProgramRecent(full, ['a', 'b', 'y'], hidden, item => item), ['a', 'H1', 'H2', 'b', 'y', 'H3', 'H4']);
});
