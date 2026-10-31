import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ProgramData } from './contract';
import { programExecutionList } from './execution-presentation';
import { createProgramData, validateProgramData } from './program-data';
import { addProgramQuickTask, createProgramDocument, createProgramFolder, updateProgramTask } from './private-space';
import { programManualOrderDays, programOrderedExecutionRows, readProgramDayOrder, reorderProgramExecutionTimeline, resetProgramExecutionDayOrder,
  restoreProgramExecutionDayOrder, type ProgramExecutionQuery } from './recurrence-order';
import { textWorkspaceModel as M } from './text-workspace';

// I7 (C6-C9-I7 1·5, plan c5c6i7 I7): '시간순으로' forgets a day's hand-made order, both arrays at once and the places
// of rows a filter hides too; its 되돌리기 is a new change putting both back (each present or not), refused when the
// day has a saved order again. The heading says '직접 정렬' only while that order differs from time order.
const day = '2026-10-30', today = '2026-10-29';
const week: ProgramExecutionQuery = { period: 'week', date: today, today, folderId: '', query: '', includeHeld: false, includeExcluded: false, page: 0 };
let request = 0;
const base = (data: ProgramData) => ({ actorId: data.activeActorId, requestId: `i7-${++request}`, expectedSpace: data.spaces[data.activeActorId] });
const space = (data: ProgramData) => data.spaces[data.activeActorId] as ProgramData['spaces'][string] & { executionTimelineOrders?: Record<string, string[]> };
function account(tasks: [title: string, time: string, folder?: string, date?: string | null][]) {
  let data = createProgramData();
  const folders = new Map<string, string>(), docs = new Map<string, string>();
  for (const [, , folder] of tasks) if (folder && !folders.has(folder)) {
    const made = createProgramFolder(data, { ...base(data), title: folder }); assert(made.ok); data = made.data; folders.set(folder, made.result);
  }
  for (const [title, time, folder = '', date = day] of tasks) {
    if (!docs.has(folder)) { const doc = createProgramDocument(data, { ...base(data), title: `문서 ${folder || '기본'}`, folderId: folders.get(folder) }); assert(doc.ok); data = doc.data; docs.set(folder, doc.result); }
    const added = addProgramQuickTask(data, { ...base(data), documentId: docs.get(folder)!, title, date }); assert(added.ok); data = added.data;
    if (time) { const timed = updateProgramTask(data, { ...base(data), taskId: added.result, patch: { time } }); assert(timed.ok); data = timed.data; }
  }
  assert(validateProgramData(data));
  return { data, folders };
}
const titles = (data: ProgramData, query = week, date: string | null = day) => programOrderedExecutionRows(data, query).rows
  .filter(row => row.date === date).map(row => row.kind === 'text-task' ? row.task.title : row.row.title);
/** A hand-made order: the last row of the day put first. */
function byHand(data: ProgramData, query = week, date: string | null = day) {
  const rows = programOrderedExecutionRows(data, query).rows.filter(row => row.date === date);
  const moved = reorderProgramExecutionTimeline(data, { actorId: data.activeActorId, query, targetKey: rows.at(-1)!.key, beforeKey: rows[0].key,
    expectedKeys: rows.map(row => row.key), expectedOrder: space(data).executionTimelineOrders?.[date ?? 'undated'] ?? null });
  assert(moved.ok); return moved.data;
}

test('시간순으로 forgets both arrays of the day in one change; the day runs by time again, untimed rows last', () => {
  const { data } = account([['메모 정리', ''], ['견적서 보내기', '16:00'], ['견적 비교표', '10:00']]);
  assert.deepEqual(titles(data), ['견적 비교표', '견적서 보내기', '메모 정리']);
  const ordered = byHand(data);
  assert.deepEqual(titles(ordered), ['메모 정리', '견적 비교표', '견적서 보내기']);
  const expected = readProgramDayOrder(space(ordered), day);
  assert(expected.mixed?.length && expected.legacy?.length, 'both arrays are saved');
  const reset = resetProgramExecutionDayOrder(ordered, { actorId: ordered.activeActorId, expected });
  assert(reset.ok && reset.changed);
  assert.deepEqual(readProgramDayOrder(space(reset.data), day), { date: day, mixed: null, legacy: null });
  assert.deepEqual(titles(reset.data), ['견적 비교표', '견적서 보내기', '메모 정리']);
  // Nothing saved: nothing to do.
  const again = resetProgramExecutionDayOrder(reset.data, { actorId: reset.data.activeActorId, expected: readProgramDayOrder(space(reset.data), day) });
  assert(again.ok && !again.changed);
});

test('되돌리기 puts both arrays back as they were, each present or not, and the hand-made order with them', () => {
  const { data } = account([['메모 정리', ''], ['견적서 보내기', '16:00'], ['견적 비교표', '10:00']]);
  const ordered = byHand(data), shown = titles(ordered), removed = readProgramDayOrder(space(ordered), day);
  const reset = resetProgramExecutionDayOrder(ordered, { actorId: ordered.activeActorId, expected: removed }); assert(reset.ok);
  const back = restoreProgramExecutionDayOrder(reset.data, { actorId: reset.data.activeActorId, removed }); assert(back.ok && back.changed);
  assert.deepEqual(readProgramDayOrder(space(back.data), day), removed);
  assert.deepEqual(titles(back.data), shown);
  // Only the old array (an older build), or only the mixed one with an occurrence's place: each comes back alone.
  const legacyOnly = { ...removed, mixed: null };
  const resetLegacy = resetProgramExecutionDayOrder(ordered, { actorId: ordered.activeActorId, expected: removed }); assert(resetLegacy.ok);
  const legacyBack = restoreProgramExecutionDayOrder(resetLegacy.data, { actorId: resetLegacy.data.activeActorId, removed: legacyOnly }); assert(legacyBack.ok);
  assert.deepEqual(readProgramDayOrder(space(legacyBack.data), day), legacyOnly);
  const occurrence = JSON.stringify(['occurrence', 'series-a', 'item-a', 'plan-a', 'rev-a', 'occ-a', day]);
  const mixedOnly = { ...removed, mixed: [occurrence, ...removed.mixed!], legacy: null };
  const mixedBack = restoreProgramExecutionDayOrder(resetLegacy.data, { actorId: resetLegacy.data.activeActorId, removed: mixedOnly }); assert(mixedBack.ok);
  assert.deepEqual(readProgramDayOrder(space(mixedBack.data), day), mixedOnly);
});

test('a day ordered again since refuses 되돌리기; an unrelated save does not; a stale 시간순으로 is refused too', () => {
  const { data } = account([['메모 정리', ''], ['견적서 보내기', '16:00'], ['견적 비교표', '10:00']]);
  const ordered = byHand(data), removed = readProgramDayOrder(space(ordered), day);
  const reset = resetProgramExecutionDayOrder(ordered, { actorId: ordered.activeActorId, expected: removed }); assert(reset.ok);
  // Another device (or a move here) ordered the day again: refused, nothing changes.
  const reordered = byHand(reset.data);
  const refused = restoreProgramExecutionDayOrder(reordered, { actorId: reordered.activeActorId, removed });
  assert(!refused.ok); assert.equal(refused.reason, 'conflict');
  // A save elsewhere (another day's task) leaves the day as the reset left it: allowed.
  const doc = space(reset.data).text.documents[0].id;
  const other = addProgramQuickTask(reset.data, { ...base(reset.data), documentId: doc, title: '다른 날 일', date: '2026-11-02' }); assert(other.ok);
  assert(restoreProgramExecutionDayOrder(other.data, { actorId: other.data.activeActorId, removed }).ok);
  // A task deleted since: its place in the old array is dropped (as a text edit drops it), the rest comes back.
  const text = space(reset.data).text, written = text.documents[0], gone = written.lines.find(line => line.text.includes('메모 정리'))!.id;
  const deleted = structuredClone(reset.data);
  deleted.spaces[deleted.activeActorId].text = M.editText(text, written.id, M.raw(written).split('\n').filter(line => !line.includes('메모 정리')).join('\n'));
  assert(validateProgramData(deleted));
  const afterDelete = restoreProgramExecutionDayOrder(deleted, { actorId: deleted.activeActorId, removed }); assert(afterDelete.ok);
  assert.deepEqual(readProgramDayOrder(space(afterDelete.data), day).legacy, removed.legacy!.filter(id => id !== gone));
  // Review P2: the mixed array drops it too; an occurrence's place (not a text task) stays.
  assert.deepEqual(readProgramDayOrder(space(afterDelete.data), day).mixed, removed.mixed!.filter(key => JSON.parse(key)[2] !== gone));
  assert.equal(removed.mixed!.some(key => JSON.parse(key)[2] === gone), true, 'the deleted task had a place');
  const occurrence = JSON.stringify(['occurrence', 'series-a', 'item-a', 'plan-a', 'rev-a', 'occ-a', day]);
  const withOccurrence = restoreProgramExecutionDayOrder(deleted, { actorId: deleted.activeActorId, removed: { ...removed, mixed: [occurrence, ...removed.mixed!] } });
  assert(withOccurrence.ok); assert.equal(readProgramDayOrder(space(withOccurrence.data), day).mixed![0], occurrence);
  // 시간순으로 from a screen that showed another order: refused.
  const stale = resetProgramExecutionDayOrder(byHand(ordered), { actorId: ordered.activeActorId, expected: removed });
  assert(!stale.ok); assert.equal(stale.reason, 'conflict');
});

test('직접 정렬 shows only while the saved order differs from time order; a filter keeps the whole day and counts what it hides', () => {
  const { data, folders } = account([['메모 정리', '', '집'], ['견적서 보내기', '16:00', '회사'], ['견적 비교표', '10:00', '회사']]);
  assert.equal(programManualOrderDays(data, week).size, 0, 'by time: nothing to undo');
  const ordered = byHand(data);
  assert.deepEqual([...programManualOrderDays(ordered, week)], [[day, { hidden: 0 }]]);
  // Moved back to time order by hand: saved, but no different from time order.
  const back = (() => { const rows = programOrderedExecutionRows(ordered, week).rows.filter(row => row.date === day);
    const moved = reorderProgramExecutionTimeline(ordered, { actorId: ordered.activeActorId, query: week, targetKey: rows[0].key, beforeKey: null,
      expectedKeys: rows.map(row => row.key), expectedOrder: space(ordered).executionTimelineOrders![day] }); assert(moved.ok); return moved.data; })();
  assert.deepEqual(titles(back), ['견적 비교표', '견적서 보내기', '메모 정리']);
  assert.equal(programManualOrderDays(back, week).size, 0);
  // Filtered to 회사, ordered by hand there: 집's row keeps its saved place, hidden. The day is reset whole.
  const work = { ...week, folderId: folders.get('회사')! };
  const both = byHand(ordered, work);
  assert.deepEqual([...programManualOrderDays(both, work)], [[day, { hidden: 1 }]]);
  const reset = resetProgramExecutionDayOrder(both, { actorId: both.activeActorId, expected: readProgramDayOrder(space(both), day) }); assert(reset.ok);
  assert.deepEqual(titles(reset.data), ['견적 비교표', '견적서 보내기', '메모 정리']);
});

test('날짜 없음 works the same; the day headings carry it, the mixed 지난 미완료 heading does not', () => {
  const { data } = account([['나중 일', '', '', null], ['시간 있는 나중 일', '09:00', '', null]]);
  const undated = { ...week, period: 'undated' as const };
  const ordered = byHand(data, undated, null);
  assert.deepEqual([...programManualOrderDays(ordered, undated)], [['undated', { hidden: 0 }]]);
  const rows = programOrderedExecutionRows(ordered, undated).rows;
  // The 날짜 없음 view has no headings; a hand-made order adds one to carry the button.
  const list = programExecutionList(rows, 'undated', today, today, false, programManualOrderDays(ordered, undated));
  assert.deepEqual(list[0], { kind: 'heading', key: 'heading:undated', label: '날짜 없음', late: false, addDate: null, orderDate: 'undated' });
  assert.equal(programExecutionList(rows, 'undated', today, today, false, new Map())[0].kind, 'row');
  // Week: the day's heading. Today: the viewed day's heading only, never 지난 미완료.
  const dated = byHand(account([['메모 정리', ''], ['견적 비교표', '10:00']]).data);
  const weekList = programExecutionList(programOrderedExecutionRows(dated, week).rows, 'week', today, today, false, programManualOrderDays(dated, week));
  assert.equal(weekList.find(item => item.kind === 'heading' && item.key === `heading:${day}`)?.kind === 'heading' && (weekList.find(item => item.kind === 'heading' && item.key === `heading:${day}`) as { orderDate?: string }).orderDate, day);
  const todayQuery = { ...week, period: 'today' as const, date: day, today: day };
  const todayList = programExecutionList(programOrderedExecutionRows(dated, todayQuery).rows, 'today', day, day, false, new Map([[day, { hidden: 0 }], ['2026-10-20', { hidden: 0 }]]));
  for (const item of todayList) if (item.kind === 'heading') assert.equal((item as { orderDate?: string }).orderDate, item.key === 'heading:past' ? undefined : day);
});

test('the list wires it: heading button, today menu, notice with 되돌리기, hidden in a move, once at a time', () => {
  const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const source = read('ProgramSpace.tsx'), css = read('ProgramSpace.module.css');
  assert.match(source, /const manualOrderDays = useMemo\(\(\) => period === 'documents' \? new Map<string, \{ hidden: number \}>\(\) : programManualOrderDays\(data, executionQuery, executionRows\)/);
  assert.match(source, /programExecutionList\(executionRows, period, date, today, emptyDaysOpen, manualOrderDays\)/);
  assert.match(source, /\{item\.orderDate && !moving && <><span className=\{styles\.manualOrder\}>직접 정렬<\/span><button type="button" className=\{styles\.timeOrder\}/);
  assert.match(source, /aria-label=\{`\$\{orderDayName\(item\.orderDate\)\} 순서를 시간순으로 되돌리기`\}/);
  assert.match(source, /hideDayHeadings && manualOrderDays\.has\(date\) && !moving && <button type="button" disabled=\{orderPending\}\s*onClick=\{\(\) => \{ if \(noteFindMenu\.current\) noteFindMenu\.current\.open = false; void resetDayOrder\(date\); \}\}>오늘 순서를 시간순으로<\/button>/);
  // Review P2: both wait out the host's automatic read (R4), like a completion tap, instead of being refused as busy.
  assert.match(source, /const result = await run\('시간순으로 정렬', current => resetProgramExecutionDayOrder\(current, \{ actorId, expected \}\), true, undefined, undefined, true\);/);
  assert.match(source, /const result = await run\('순서 되돌리기', current => restoreProgramExecutionDayOrder\(current, \{ actorId, removed: notice\.removed \}\), true, undefined, undefined, true\);/);
  assert.match(source, /'그 뒤 순서가 바뀌어 되돌리지 않았습니다'/);
  assert.match(source, /`\$\{orderDayName\(notice\.removed\.date\)\} 순서를 시간순으로 되돌렸습니다\$\{notice\.hidden \? ` · 숨긴 할 일 \$\{notice\.hidden\}개 포함` : ''\}`/);
  assert.match(source, /if \(orderBusy\.current\) return;/);
  assert.match(css, /\.space \.manualOrder \{/);
  // The notice sits under the list and stays in sight (sticky), above the phone's bottom tabs.
  // (C5: after the list or the month grid; inside the day sheet while that is open.)
  // (C6a: its own 고르기 notice may sit between.)
  assert.match(source, /<\/ul>\}\n(\s*\{selecting && selectNotice[^\n]*\n)?\s*\{\/\* I7: under the list[^\n]*\*\/\}\n\s*\{!detail && !sheetOpen && orderNoticeContent\}/);
  assert.match(css, /\.space \.orderNotice \{ position: sticky; bottom: 8px;/);
  assert.match(css, /@media \(max-width: 700px\) \{ \.space \.orderNotice \{ bottom: calc\(84px \+ env\(safe-area-inset-bottom\)\); \} \}/);
  assert.match(css, /\.space \.timeOrder \{[^}]*min-height: 44px;[^}]*font-size: 13px;/);
});
