import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { extendProgramRecent, extendProgramRecentRaw, programRecentHidden, programRecentHold, programSameLineKind, restrictProgramRecent } from './recent-writing';
import { PROGRAM_ROW_PATCH } from './typing-row-patch';

// Codex independent review of typelag ③ (inbox/typelag3-review-20261111-1756, 11/11) P1: the one-line fast path of the
// 복구함 raw assumed the changed line kept its ID. A line whose kind changes (a task turned into words) gets a new ID from
// the model, so the folded run went back elsewhere than a save puts it. The reproduction and the 178-input exploration
// are Codex's (typelag3-review-20261111-1741/review.test.ts, explore.ts); 'parent' is the path with the switch off,
// which is int9's function.
type Fixture = { state: TextWorkspaceState; id: string; hidden: ReadonlySet<string>; working: TextWorkspaceState; before: string };
function fixture(lines: string[]): Fixture {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '합성' });
  const id = state.documents[0].id, init = M.editTextResult(state, id, lines.join('\n'));
  assert.equal(init.reason, null); state = init.state;
  const hold = programRecentHold(state, id, '2026-11-11'); assert(hold);
  const hidden = programRecentHidden(state, hold), working = restrictProgramRecent(state, id, hidden);
  assert(hidden.size >= 200, 'the folded days are hidden');
  return { state, id, hidden, working, before: M.raw(M.getDocument(working, id)) };
}
const HIDDEN = ['- [x] 끝낸 일', ...Array.from({ length: 200 }, (_, i) => `  보관 메모 ${i}`)];
const codex = () => fixture(['[미정]', '- [ ] 앞 할 일', ...HIDDEN, '- [ ] 뒤 할 일', '끝']);
function parent(f: Fixture, next: string) {
  const was = PROGRAM_ROW_PATCH.enabled; PROGRAM_ROW_PATCH.enabled = false;
  try { return extendProgramRecentRaw(f.state, f.id, f.hidden, next, f.working); } finally { PROGRAM_ROW_PATCH.enabled = was; }
}
/** What a save of `next` makes: the model's edit, extended with check=true. */
function saved(f: Fixture, next: string) {
  const edit = M.editTextResult(f.working, f.id, next, { folderText: true }); assert.equal(edit.reason, null);
  const full = extendProgramRecent(f.state, edit.state, f.id, f.hidden); assert(full.ok);
  return M.raw(M.getDocument(full.state, f.id));
}
/** The fast raw and how many model edits it took. */
function fast(f: Fixture, next: string) {
  const real = M.editTextResult; let runs = 0;
  M.editTextResult = ((...args: Parameters<typeof real>) => { runs++; return real(...args); }) as typeof real;
  try { return { raw: extendProgramRecentRaw(f.state, f.id, f.hidden, next, f.working), runs }; } finally { M.editTextResult = real; }
}

test('Codex 1: a title-only edit still takes the fast path (no model run) and equals parent and save', () => {
  const f = codex(), next = f.before.replace('뒤 할 일', '뒤 할 일가'), out = fast(f, next);
  assert.equal(out.runs, 0);
  assert.equal(out.raw, saved(f, next)); assert.equal(parent(f, next), out.raw);
});
test('Codex 2 (P1): Korean inside the check mark turns the task into words: fast = parent = save', () => {
  const f = codex(), next = f.before.replace('- [ ] 뒤 할 일', '- [가] 뒤 할 일'), out = fast(f, next);
  assert.equal(out.runs, 1, 'the model path');
  const want = ['[미정]', '- [ ] 앞 할 일', '- [가] 뒤 할 일', ...HIDDEN, '끝'].join('\n');
  assert.equal(out.raw, want); assert.equal(saved(f, next), want); assert.equal(parent(f, next), want);
});
test('Codex 3 (P1): a task line replaced by plain words: fast = parent = save', () => {
  const f = codex(), next = f.before.replace('- [ ] 뒤 할 일', '새 글'), out = fast(f, next);
  assert.equal(out.raw, saved(f, next)); assert.equal(parent(f, next), out.raw);
});

test('Codex exploration (178 one-line replacements, 4 shapes) and same-kind word edits: fast = parent, no difference', () => {
  const variants = ['글', '', '- [ ] 일', '[미정]', '[2026-11-10]', '```', '- /폴더', '  글', '- [101%] 일', '가', '나'];
  const templates = [
    ['[2026-11-11]', '가', '[2026-10-01]', ...Array.from({ length: 200 }, (_, i) => `숨김 ${i}`), '[2026-11-10]', '나', '끝'],
    ['[2026-10-01]', ...Array.from({ length: 200 }, (_, i) => `숨김 ${i}`), '[2026-11-10]', '나', '끝'],
    ['[미정]', '- [ ] 가', '- [x] 숨김', ...Array.from({ length: 200 }, (_, i) => `  숨김 ${i}`), '- [ ] 나', '끝'],
    ['[2026-11-11]', '가', '[2026-10-01]', ...Array.from({ length: 200 }, (_, i) => `숨김 ${i}`), '[2026-11-10]', '나', '끝', '[2026-10-02]', '숨김2'],
  ];
  let count = 0, diffs = 0;
  for (const template of templates) {
    const f = fixture(template), shown = f.before.split('\n');
    for (let index = 0; index < shown.length; index++) for (const replacement of variants) {
      const next = shown.map((line, i) => i === index ? replacement : line).join('\n');
      if (next === f.before) continue;
      count++;
      if (fast(f, next).raw !== parent(f, next)) diffs++;
    }
  }
  assert.equal(count, 178); assert.equal(diffs, 0);
  // Words within lines of each kind the fast path takes, in a document with tasks, subchecks, properties and lists
  // around folded days; each must equal the model's path, and take no model run.
  const f = fixture(['[2026-11-11]', '- [ ] 오늘 일', '  - [ ] 하위 체크', '  - 메모: 짧은 메모', '- 목록 줄', '  - 하위 목록', '그냥 글', '[2026-10-01]',
    '- [x] 지난 일', ...Array.from({ length: 200 }, (_, i) => `  숨김 ${i}`), '[2026-11-10]', '- [50%] 반쯤', '끝']);
  const shown = f.before.split('\n');
  let fastRuns = 0, checked = 0;
  for (let index = 0; index < shown.length; index++) for (const typed of ['가', ' 나다', 'x']) {
    const next = shown.map((line, i) => i === index ? line + typed : line).join('\n'), out = fast(f, next);
    assert.equal(out.raw, parent(f, next), `${shown[index]} + ${typed}`);
    if (out.runs === 0) fastRuns++;
    checked++;
  }
  assert(fastRuns >= 18, `the fast path still takes words in task, subcheck, memo, list and plain lines (${fastRuns}/${checked})`);
});

test('the line kinds the fast path keeps', () => {
  const same: [string, string][] = [['- [ ] 할 일', '- [ ] 할 일가'], ['  - [x] 하위', '  - [x] 하위 끝'], ['- [50%] 반쯤', '- [50%] 반쯤 더'],
    ['  - 메모: 짧은', '  - 메모: 짧은 메모'], ['- 목록', '- 목록 줄'], ['그냥 글', '그냥 글자'], ['  들여 쓴 글', '  들여 쓴 글자']];
  const other: [string, string][] = [['- [ ] 뒤 할 일', '- [가] 뒤 할 일'], ['- [ ] 뒤 할 일', '새 글'], ['- [ ] 할 일', '- [x] 할 일'], ['- [ ] 할', '- [ ] '],
    ['글', '[2026-11-10]'], ['글', '# 제목'], ['글', '```'], ['- 목록', '- [ 목록'], ['- 목록', '- /폴더'], ['  - 메모', '  - 메모: 값'],
    ['- 메모: 값', '- 메모: 값 더'], ['글', '  글'], ['글', ''], ['- /가', '- /가나'], ['1. 번호', '1. 번호 글']];
  for (const [a, b] of same) assert.equal(programSameLineKind(a, b), true, `${a} → ${b}`);
  for (const [a, b] of other) assert.equal(programSameLineKind(a, b), false, `${a} → ${b}`);
});

// 기타 int9 r2 QA P3 (11/11): a repeat round finished from the band could not be undone by its faded box: the box was
// disabled for every finished repeat row, so the handler that brings the round back (checkFromBand) was never reached.
test('the band: a repeat round finished here keeps its box pressable (to undo), busy while the round comes back', () => {
  const read = (file: string) => readFileSync(new URL('../../../components/flow/integrated-poc/' + file, import.meta.url), 'utf8');
  const band = read('ProgramFlowTodayBand.tsx'), space = read('ProgramSpace.tsx');
  assert(band.includes('disabled={row.busy || row.done && !!row.repeat && !row.undo}'));
  assert(band.includes("row.undo ? '이번 회차 되돌리기' : '이번 회차 끝냄'"));
  assert(space.includes('undo: done && !!bandChecked.get(row.task.id)?.repeatCheck'));
  assert(space.includes('busy: completingTaskIds.has(row.task.id) || bandUndoing.has(row.task.id)'));
  assert(space.includes('if (kept?.repeatCheck) { void undoBandRepeat(id, kept.repeatCheck); return; }'));
  assert(space.includes('if (bandUndoing.has(id)) return;'));
});