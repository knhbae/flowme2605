import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { completeProgramRepeat } from './repeat-commands';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { createProgramTextDraft } from './program-text-draft';
import { createProgramDocumentInput } from './program-document-input';

// 11/5 phone P2: deleting '- [ ] 테스트 반복 @매주 목' and its date line one key at a time showed
// '확인이 필요한 입력 1개' at '- [': the model refuses a check mark not closed yet, and the editor told the host
// so as a refused input. Typing one forward passes through the same marks.
const owner = '22222222-2222-4222-8222-222222222222';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `mark-${++request}`, expectedSpace: data.spaces[owner] });

function editor(raw: string, checked = false) {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const created = ok(createProgramDocument(initial, { ...base(initial), title: '쓰기', raw }));
  let data = created.data;
  const task = M.tasks(data.spaces[owner].text).find(row => row.title.includes('테스트'));
  if (checked && task) data = ok(completeProgramRepeat(data, { ...base(data), taskId: task.id, today: '2026-11-05', expected: '2026-11-05' })).data;
  const input = createProgramDocumentInput(data.spaces[owner].text, created.result);
  return createProgramTextDraft(input.initial, created.result, async () => true, () => {}, () => true, input);
}
/** Each key's raw: what the held ones were, and that none of them was a refusal. */
function keys(draft: ReturnType<typeof editor>, steps: string[]) {
  const held: string[] = [];
  for (const raw of steps) {
    draft.updateRaw(raw, '', { inputType: 'insertText' });
    const state = draft.getState();
    assert.equal(state.error, '', `refused at ${JSON.stringify(raw.slice(-12))}`);
    if (state.invalid) { assert.equal(state.typingMark, true, raw); held.push(raw.split('\n').at(-1)!); }
    else assert.equal(state.typingMark, undefined, raw);
  }
  return held;
}

test('P2: deleting a checked repeat line one key at a time holds the open marks as editing, never as a refusal', () => {
  const draft = editor('M3-END\n\n- [ ] 테스트 반복 @매주 목\n  - 날짜: 2026-11-05', true);
  const start = draft.getState().raw;
  assert.match(start, /- 날짜: 2026-11-12$/);
  const steps = Array.from({ length: start.length - 'M3-END\n\n'.length }, (_, index) => start.slice(0, start.length - index - 1));
  assert.deepEqual(keys(draft, steps), ['- [ ', '- [']);
  assert.equal(draft.getState().raw, 'M3-END\n\n');
  assert.equal(draft.getState().invalid, false);
  assert.equal(M.tasks(draft.getState().working).length, 0);
});

test('P2: typing a task mark forward holds `- [` and `- [ ` until it closes, and the task is then saved as typed', () => {
  const draft = editor('M3-END\n');
  const line = '- [ ] 새 할 일';
  assert.deepEqual(keys(draft, Array.from(line, (_, index) => `M3-END\n${line.slice(0, index + 1)}`)), ['- [', '- [ ']);
  assert.equal(draft.getState().raw, `M3-END\n${line}`);
  assert.deepEqual(M.tasks(draft.getState().working).map(task => task.title), ['새 할 일']);
  // A progress mark typed forward is held the same way.
  const percent = editor('M3-END\n');
  assert.deepEqual(keys(percent, ['M3-END\n- [', 'M3-END\n- [5', 'M3-END\n- [50', 'M3-END\n- [50]', 'M3-END\n- [50] 반']), ['- [', '- [5', '- [50']);
});

test('P2: a closed mark that is wrong, or an open one with other lines changed, is still not saved (저장 재설계 B: held on its lines)', () => {
  for (const raw of ['M3-END\n- [] 제목', 'M3-END\n- []']) {
    const draft = editor('M3-END\n- [ ] 제목');
    draft.updateRaw(raw, '', { inputType: 'insertText' });
    const state = draft.getState();
    assert.equal(state.invalid, true, raw);
    assert.equal(state.typingMark, undefined, raw);
    assert.deepEqual([state.held?.lines, state.held?.reasons[1], state.error], [[1], 'progress', ''], raw);
    assert.match(state.held?.message ?? '', /형식을 확인해 주세요/, raw);
  }
  const pasted = editor('M3-END\n- [ ] 제목');
  pasted.updateRaw('M3-END 바뀜\n- [', '', { inputType: 'insertFromPaste' });
  assert.equal(pasted.getState().invalid, true);
  assert.equal(pasted.getState().typingMark, undefined);
  assert.equal(pasted.getState().held?.reasons[1], 'mark');
  const added = editor('M3-END');
  added.updateRaw('M3-END\n메모\n- [', '', { inputType: 'insertFromPaste' });
  assert.equal(added.getState().typingMark, undefined);
  assert.equal(added.getState().held?.reasons[2], 'mark');
});

test('P2: the editor tells the host of a refused input, not of a mark being typed', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert(source.includes('const inputFailed = draft.invalid && !draft.typingMark || !!draft.error;'));
});
