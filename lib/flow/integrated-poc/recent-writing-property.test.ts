import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M, type TextLine, type TextWorkspaceState } from './text-workspace';
import { programShiftDate } from './execution';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { extendProgramRecent, extendProgramRecentRaw, programRecentHidden, programRecentHold, restrictProgramRecent } from './recent-writing';

// 11/5 총괄 조건 1 (쓰기 '최근만 쓰기'): the put-back is a pure function, checked as a property. Random long documents
// (days old and recent, [미정], tomorrow, folders, tasks done and not, memos; newest on top or old days first) get random
// edits in the recent part — typing, deleting, indenting, [x], a new date line, Enter where the part meets a folded run —
// made as the editor makes them (the full text model on the recent part). After each:
// - put back, every folded line is there with its ID and bytes, in its order, and the whole raw is exactly the same
//   edit made on the whole raw; the model accepts the whole;
// - refused, the reason is one of the checks', and the saved whole is as it was (nothing partly saved);
// - either way the 복구함's raw keeps every typed line and every folded line in order, and is the saved raw itself when
//   the save went through (writing-view review F1/F2: two days in view swapped, a date line retyped).
const owner = '99999999-9999-4999-8999-999999999999', today = '2026-11-05';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `prop-${++request}`, expectedSpace: data.spaces[owner] });
function random(seed: number) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
const FOLDERS = ['회사 일', '공부', '운동', '집안 일'], WORDS = ['보고서', '메일', '회의', '정리', '책', '러닝', '빨래', '장보기', '강의', '세탁소'];

function document(next: () => number) {
  const pick = <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)];
  const section = (head: string, doneShare: number) => {
    const lines = [head];
    for (const folder of FOLDERS.filter(() => next() < 0.55)) {
      lines.push(`- /${folder}`);
      for (let count = 1 + Math.floor(next() * 3); count > 0; count--) {
        lines.push(`  - [${next() < doneShare ? 'x' : ' '}] ${pick(WORDS)} ${Math.floor(next() * 90)}`);
        if (next() < 0.12) lines.push(`    - 메모: 메모 ${Math.floor(next() * 90)}`);
      }
    }
    lines.push('');
    return lines;
  };
  const days = 28 + Math.floor(next() * 30), dated = Array.from({ length: days }, (_, index) => section(`[${programShiftDate(today, -index)}]`, index ? 0.5 : 0));
  const undated = section('[미정]', 0.5), tomorrow = section(`[${programShiftDate(today, 1)}]`, 0);
  const newestOnTop = next() < 0.5;
  return { raw: (newestOnTop ? [undated, tomorrow, ...dated] : [undated, ...dated.reverse(), tomorrow]).flat().join('\n'), newestOnTop };
}
function write(raw: string) {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = ok(createProgramDocument(initial, { ...base(initial), title: '할 일', raw }));
  return { text: made.data.spaces[owner].text, docId: made.result };
}

type Edit = { kind: 'type' | 'delete' | 'indent' | 'check' | 'date' | 'enter' | 'swap'; at: string; insert?: string[] };
/** The edit applied to lines (by the ID of the line it is made at): the same function for the recent part and the whole.
 *  'swap' trades the date section starting at `at` with the one right after it (in the lines given). */
function apply(lines: readonly TextLine[], edit: Edit): string[] {
  if (edit.kind === 'swap') {
    const start = lines.findIndex(line => line.id === edit.at), heads = lines.flatMap((line, index) => index > start && /^\[/.test(line.text) ? [index] : []);
    const middle = heads[0] ?? lines.length, end = heads[1] ?? lines.length, texts = lines.map(line => line.text);
    return [...texts.slice(0, start), ...texts.slice(middle, end), ...texts.slice(start, middle), ...texts.slice(end)];
  }
  const texts: string[] = [];
  for (const line of lines) {
    if (line.id !== edit.at) { texts.push(line.text); continue; }
    if (edit.kind === 'delete') continue;
    texts.push(edit.kind === 'type' ? `${line.text} 덧붙임` : edit.kind === 'indent' ? `  ${line.text}` : edit.kind === 'check' ? line.text.replace('[ ]', '[x]') : line.text);
    if (edit.insert) texts.push(...edit.insert);
  }
  return texts;
}
function choose(next: () => number, shown: readonly TextLine[], hidden: ReadonlySet<string>, whole: readonly TextLine[]): Edit | null {
  const pick = <T,>(items: readonly T[]) => items.length ? items[Math.floor(next() * items.length)] : null;
  const kinds = ['type', 'delete', 'indent', 'check', 'date', 'enter', 'swap'] as const, kind = kinds[Math.floor(next() * kinds.length)];
  if (kind === 'swap') {
    // Two date sections in view, one right after the other (in view): folded days may lie between them in the whole.
    const heads = shown.flatMap((line, index) => /^\[/.test(line.text) ? [index] : []), first = heads.length > 1 ? heads[Math.floor(next() * (heads.length - 1))] : -1;
    return first < 0 ? null : { kind, at: shown[first].id };
  }
  const plain = shown.filter(line => line.text.trim() && !/^\[/.test(line.text)), tasks = shown.filter(line => /^ *- \[ \] /.test(line.text));
  if (kind === 'type') { const line = pick(plain); return line && { kind, at: line.id }; }
  if (kind === 'delete') { const line = pick(shown); return line && { kind, at: line.id }; }
  if (kind === 'indent') { const line = pick(tasks); return line && { kind, at: line.id }; }
  if (kind === 'check') { const line = pick(tasks); return line && { kind, at: line.id }; }
  if (kind === 'date') { const line = pick(shown); return line && { kind, at: line.id, insert: [`[${programShiftDate(today, Math.floor(next() * 9) - 6)}]`, '- [ ] 새 날짜의 일'] }; }
  // Enter at the end of the line right before a folded run (or at the very end of the part).
  const before = whole.filter((line, index) => !hidden.has(line.id) && (index + 1 === whole.length || hidden.has(whole[index + 1].id)));
  const line = pick(before);
  return line && { kind, at: line.id, insert: ['  - [ ] 끝에서 Enter'] };
}

test('W-a property: random documents and random edits in the recent part put the folded lines back exactly', () => {
  const tally = { cases: 0, edits: 0, saved: 0, refused: 0, modelRefused: 0, normalized: 0, swaps: 0, orderRefused: 0 };
  for (let seed = 1; seed <= 40; seed++) {
    const next = random(seed * 7919), { raw } = document(next), made = write(raw), docId = made.docId;
    let whole = made.text;
    const hold = programRecentHold(whole, docId, today);
    if (!hold) continue;
    tally.cases++;
    for (let step = 0; step < 6; step++) {
      const hidden = programRecentHidden(whole, hold), restricted = restrictProgramRecent(whole, docId, hidden);
      const shown = M.getDocument(restricted, docId)!.lines, all = M.getDocument(whole, docId)!.lines;
      const edit = choose(next, shown, hidden, all);
      if (!edit) continue;
      tally.edits++; if (edit.kind === 'swap') tally.swaps++;
      const typed = apply(shown, edit).join('\n'), context = `seed ${seed} step ${step} ${edit.kind}`;
      // The 복구함's raw, saved or not: every typed line and every folded line, the folded ones in their order.
      const kept = extendProgramRecentRaw(whole, docId, hidden, typed).split('\n'), folded = all.filter(line => hidden.has(line.id)).map(line => line.text);
      assert.equal(kept.length, typed.split('\n').length + folded.length, `${context}: 복구함 raw size`);
      let cursor = 0;
      for (const line of folded) { const found = kept.indexOf(line, cursor); assert(found >= cursor, `${context}: folded line out of order in the 복구함 raw`); cursor = found + 1; }
      const result = M.editTextResult(restricted, docId, typed, { progressDate: today });
      if (result.reason) { tally.modelRefused++; continue; }
      const put = extendProgramRecent(whole, result.state, docId, hidden);
      if (!put.ok) {
        // Refused: one of the checks' reasons, and nothing of it is saved (the whole stays the one it was).
        assert(['invalid', 'hidden-context', 'visible-context', 'hidden-line', 'hidden-order'].includes(put.reason), `${context}: ${put.reason}`);
        tally.refused++; if (put.reason === 'hidden-order') tally.orderRefused++; continue;
      }
      // Saved: the 복구함 had exactly the raw the save puts back (one function), when the model kept the text as typed.
      if (M.raw(M.getDocument(result.state, docId)) === typed) assert.equal(kept.join('\n'), M.raw(M.getDocument(put.state, docId)), `${context}: 복구함 raw`);
      tally.saved++;
      const after = M.getDocument(put.state, docId)!.lines, byId = new Map(after.map((line, index) => [line.id, { line, index }]));
      // Every folded line: same ID, same bytes, same order.
      let last = -1;
      for (const line of all.filter(entry => hidden.has(entry.id))) {
        const found = byId.get(line.id);
        assert(found, `${context}: folded line ${line.id} missing`);
        assert.equal(found.line.text, line.text, `${context}: folded line ${line.id} changed`);
        assert(found.index > last, `${context}: folded lines out of order`); last = found.index;
      }
      assert(M.validate(put.state), context);
      // The whole raw is the same edit made on the whole raw (when the model kept the part's text as typed).
      if (edit.kind === 'swap') { /* the whole's own sections differ: order and bytes are what count */ }
      else if (M.raw(M.getDocument(result.state, docId)) === typed) assert.equal(M.raw(M.getDocument(put.state, docId)), apply(all, edit).join('\n'), context);
      else tally.normalized++;
      whole = put.state;
    }
  }
  assert(tally.cases >= 30 && tally.saved >= 120 && tally.swaps >= 20 && tally.orderRefused >= 1, JSON.stringify(tally));
  console.log(JSON.stringify(tally));
});

test('W-a property: a put-back the checks refuse returns no state — the first recent day\'s date line deleted right under folded old days', () => {
  let found: { raw: string } | null = null;
  for (let seed = 1; !found && seed < 200; seed++) { const made = document(random(seed * 104729)); if (!made.newestOnTop) found = made; }
  const { text, docId } = write(found!.raw), hold = programRecentHold(text, docId, today)!, hidden = programRecentHidden(text, hold);
  const restricted = restrictProgramRecent(text, docId, hidden), shown = M.getDocument(restricted, docId)!.lines, all = M.getDocument(text, docId)!.lines;
  // Old days first: the first recent date line (today - 6) comes right after the folded old days.
  const first = all.find(line => line.text === `[${programShiftDate(today, -6)}]`)!, at = all.indexOf(first);
  assert(!hidden.has(first.id) && hidden.has(all[at - 1].id));
  const result = M.editTextResult(restricted, docId, apply(shown, { kind: 'delete', at: first.id }).join('\n'));
  assert.equal(result.reason, null);
  // In view its lines join [미정]; in the whole they would join the last folded day: refused, nothing to save.
  const put = extendProgramRecent(text, result.state, docId, hidden);
  assert.equal(put.ok, false);
  assert.equal(!put.ok && put.reason, 'visible-context');
  assert.equal(Object.hasOwn(put, 'state'), false);
});
