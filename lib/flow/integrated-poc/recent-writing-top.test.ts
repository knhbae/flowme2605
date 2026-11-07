import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { extendProgramRecent, extendProgramRecentRaw, programRecentHidden, programRecentHold, restrictProgramRecent } from './recent-writing';
import { programDateHeaderPlan } from './input-bar';

// P1 (11/7 18:12, a phone): in the recent view, today's new section typed above the first day in view was refused
// ('지난 기록과 이어지는 입력…'). The document: newest first, an empty first line, [미정] with only finished tasks,
// 11/6 and 11/5 in view, 40 old days folded.
const owner = '77777777-7777-4777-8777-777777777777', today = '2026-11-07';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `top-${++request}`, expectedSpace: data.spaces[owner] });
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const day = (offset: number) => { const d = new Date(Date.UTC(2026, 9, 25 - offset)); return d.toISOString().slice(0, 10); };
const oldDays = Array.from({ length: 40 }, (_, index) => [`[${day(index)}]`, '- /회사 미분류', `  - [x] ${day(index)} 일`, `  - [ ] ${day(index)} 남은 일`, `메모 ${index}`, '']).flat();
const RECENT = ['[2026-11-06]', '- /회사 미분류', '  - [x] 업적 평가 입력', '- /지식 허브', '  - [ ] 비정형 정확도 설계', '', '[2026-11-05]', '- /회사 미분류', '  - [ ] 보고서', ''];
const UNDATED = ['[미정]', '- [x] 끝낸 일 하나', '- [x] 끝낸 일 둘', ''];
function write(top: boolean) {
  const raw = [...top ? [''] : [], ...UNDATED, ...RECENT, ...oldDays].join('\n');
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = ok(createProgramDocument(initial, { ...base(initial), title: '최근', raw }));
  const text = made.data.spaces[owner].text, docId = made.result, hold = programRecentHold(text, docId, today)!;
  assert.ok(hold, 'folds');
  const hidden = programRecentHidden(text, hold), restricted = restrictProgramRecent(text, docId, hidden);
  return { text, docId, hold, hidden, restricted, shown: M.raw(M.getDocument(restricted, docId)) };
}
const NEW = ['[2026-11-07]', '- /미분류', '  - [ ] 수학과 운영회'];

for (const top of [true, false]) for (const [name, typed] of [
  ['typed above the first day', (shown: string) => [...NEW, shown].join('\n')],
  ['typed with an empty line after it', (shown: string) => [...NEW, '', shown].join('\n')],
  ['typed as a task only (no date line)', (shown: string) => ['- [ ] 수학과 운영회', shown].join('\n')],
] as const) test(`P1 ${top ? 'empty first line' : 'no empty first line'}: today's section ${name} saves`, () => {
  const { text, docId, hidden, restricted, shown } = write(top);
  assert.ok(shown.startsWith('[2026-11-06]'), shown.slice(0, 30));
  const raw = typed(shown), edited = M.editTextResult(restricted, docId, raw);
  assert.equal(edited.reason, null);
  const put = extendProgramRecent(text, edited.state, docId, hidden);
  assert.ok(put.ok, !put.ok ? put.reason : '');
  const whole = M.raw(M.getDocument(put.state, docId)), lines = whole.split('\n');
  // Nothing folded moved: the empty first line stays first; the new lines come before [미정] and the days.
  if (top) assert.equal(lines[0], '');
  for (const line of raw.split('\n').filter(Boolean)) assert.ok(lines.includes(line), line);
  assert.ok(lines.indexOf(raw.split('\n')[0]) < lines.indexOf('[2026-11-06]'));
  assert.equal(lines.length, M.getDocument(text, docId)!.lines.length + raw.split('\n').length - shown.split('\n').length);
  // The 복구함's raw for the same input is the save's raw.
  assert.equal(sha(extendProgramRecentRaw(text, docId, hidden, raw, edited.state)), sha(whole));
});

test('P1: the bar\'s 날짜 (today\'s head line) in the recent view saves, above the first day', () => {
  for (const top of [true, false]) {
    const { text, docId, hidden, restricted, shown } = write(top);
    const plan = programDateHeaderPlan(shown, 0, today)!;
    assert.ok(plan);
    const raw = shown.slice(0, plan.offset) + plan.text + shown.slice(plan.offset), edited = M.editTextResult(restricted, docId, raw);
    assert.equal(edited.reason, null);
    const put = extendProgramRecent(text, edited.state, docId, hidden);
    assert.ok(put.ok, !put.ok ? put.reason : '');
    assert.ok(M.raw(M.getDocument(put.state, docId)).includes('[2026-11-07]'));
  }
});

test('P1: the safety stays: with an empty first line, days in view swapped across folded days are still refused (hidden-order)', () => {
  const raw = ['', ...UNDATED, '[2026-11-06]', '- [ ] 어제 할 일', '', ...oldDays.slice(0, 120), '[2026-11-05]', '- [ ] 그제 할 일', '', ...oldDays.slice(120)].join('\n');
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = ok(createProgramDocument(initial, { ...base(initial), title: '순서', raw }));
  const text = made.data.spaces[owner].text, docId = made.result, hold = programRecentHold(text, docId, today)!, hidden = programRecentHidden(text, hold);
  const restricted = restrictProgramRecent(text, docId, hidden), shown = M.raw(M.getDocument(restricted, docId));
  assert.equal(shown, '[2026-11-06]\n- [ ] 어제 할 일\n\n[2026-11-05]\n- [ ] 그제 할 일\n');
  const edited = M.editTextResult(restricted, docId, '[2026-11-05]\n- [ ] 그제 할 일\n\n[2026-11-06]\n- [ ] 어제 할 일\n');
  assert.equal(edited.reason, null);
  const put = extendProgramRecent(text, edited.state, docId, hidden);
  assert.equal(!put.ok && put.reason, 'hidden-order');
  // Today's section above them still saves in the same document.
  const added = M.editTextResult(restricted, docId, [...NEW, shown].join('\n'));
  const saved = extendProgramRecent(text, added.state, docId, hidden);
  assert.ok(saved.ok, !saved.ok ? saved.reason : '');
  assert.equal(M.raw(M.getDocument(saved.state, docId)).split('\n')[0], '');
});
