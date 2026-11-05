import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { extendProgramRecent, extendProgramRecentRaw, programRecentHidden, programRecentHold, restrictProgramRecent } from './recent-writing';

// Writing-view review (FIX, 11/5 21:59): F1 two days in view swapped took the folded days between them along (each run
// goes back before the line that followed it), and the save passed; F2 a date line in view retyped sent the 복구함 a raw
// whose folded days were out of order (runs were found again by text). The folded lines' order is now a check of every
// save, and the 복구함's raw is made as a save makes it. Review's documents: old 10/1, recent 11/5, old 10/2, recent 11/4.
const owner = '66666666-6666-4666-8666-666666666666', today = '2026-11-05';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `order-${++request}`, expectedSpace: data.spaces[owner] });
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const old = (date: string) => [`[${date}]`, ...Array.from({ length: 55 }, (_, index) => [`- [x] ${date} 일 ${index}`]).flat(), ...Array.from({ length: 56 }, (_, index) => `메모 ${date} ${index}`)];
function write() {
  const raw = [...old('2026-10-01'), '[2026-11-05]', '- [ ] 오늘 할 일', ...old('2026-10-02'), '[2026-11-04]', '- [ ] 어제 할 일'].join('\n');
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = ok(createProgramDocument(initial, { ...base(initial), title: '순서', raw }));
  const text = made.data.spaces[owner].text, docId = made.result, hold = programRecentHold(text, docId, today)!, hidden = programRecentHidden(text, hold);
  return { text, docId, hidden, restricted: restrictProgramRecent(text, docId, hidden) };
}
const order = (state: TextWorkspaceState, docId: string, hidden: ReadonlySet<string>) => M.getDocument(state, docId)!.lines.filter(line => hidden.has(line.id)).map(line => line.id);

test('review F1: days in view swapped across folded days are refused (hidden-order); nothing is put back out of order', () => {
  const { text, docId, hidden, restricted } = write();
  assert.equal(M.getDocument(text, docId)!.lines.length, 228);
  assert.equal(hidden.size, 224);
  assert.equal(M.raw(M.getDocument(restricted, docId)), '[2026-11-05]\n- [ ] 오늘 할 일\n[2026-11-04]\n- [ ] 어제 할 일');
  const swapped = M.editTextResult(restricted, docId, '[2026-11-04]\n- [ ] 어제 할 일\n[2026-11-05]\n- [ ] 오늘 할 일');
  assert.equal(swapped.reason, null);
  const put = extendProgramRecent(text, swapped.state, docId, hidden);
  assert.equal(put.ok, false);
  assert.equal(!put.ok && put.reason, 'hidden-order');
  // The 복구함 keeps both: what was typed, and the folded days in their order.
  const kept = extendProgramRecentRaw(text, docId, hidden, '[2026-11-04]\n- [ ] 어제 할 일\n[2026-11-05]\n- [ ] 오늘 할 일').split('\n');
  assert(kept.indexOf('[2026-10-01]') < kept.indexOf('[2026-10-02]'));
  for (const line of ['[2026-11-04]', '- [ ] 어제 할 일', '[2026-11-05]', '- [ ] 오늘 할 일']) assert(kept.includes(line), line);
  assert.equal(kept.length, 228);
});

test('review F2: a date line in view retyped — the 복구함 gets exactly the raw the save puts back (same SHA), folded days in order', () => {
  const { text, docId, hidden, restricted } = write();
  const typed = '[2026-11-06]\n- [ ] 오늘 할 일\n[2026-11-04]\n- [ ] 어제 할 일';
  const edited = M.editTextResult(restricted, docId, typed);
  assert.equal(edited.reason, null);
  const put = extendProgramRecent(text, edited.state, docId, hidden);
  assert(put.ok);
  assert.deepEqual(order(put.state, docId, hidden), order(text, docId, hidden));
  const saved = M.raw(M.getDocument(put.state, docId)), kept = extendProgramRecentRaw(text, docId, hidden, typed);
  assert.equal(sha(kept), sha(saved));
  assert(kept.indexOf('[2026-10-01]') < kept.indexOf('[2026-11-06]') && kept.indexOf('[2026-11-06]') < kept.indexOf('[2026-10-02]'));
});

test('review F2: input the model cannot read yet keeps every typed line and every folded line, the folded ones in order', () => {
  const { text, docId, hidden } = write();
  const typed = '[2026-11-06]\n- [\n[2026-11-04]\n- [ ] 어제 할 일 고침';
  const kept = extendProgramRecentRaw(text, docId, hidden, typed).split('\n');
  assert.equal(kept.length, 224 + 4);
  const folded = M.getDocument(text, docId)!.lines.filter(line => hidden.has(line.id)).map(line => line.text);
  assert.deepEqual(kept.filter(line => folded.includes(line)), folded);
  // Typed lines keep their order too, and each folded day stays after the line that came before it.
  assert.deepEqual(kept.filter(line => typed.split('\n').includes(line)), typed.split('\n'));
  assert.equal(kept[0], '[2026-10-01]');
  assert(kept.indexOf('- [') < kept.indexOf('[2026-10-02]'));
});
