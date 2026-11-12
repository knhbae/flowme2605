import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { closeProgramAlreadyContinued, mergeProgramTwinDocuments, programTwinDocuments, programAlreadyContinuedPlan, programFirstCleanupBefore, programFirstCleanupProof, programStalePlan, PROGRAM_TRASH_DOCUMENT_ID, restoreProgramFirstCleanup, sendProgramStaleTasks,
  programTrashBundles, programTrashOrigin, reviveProgramTrashBundle } from './first-cleanup';
import { validateProgramData } from './program-data';
import { planProgramCarryover } from './carryover';
import { programExecutionTasks } from './execution';
import { programCarryoverBefore, programCarryoverProof, restoreProgramCarryover } from './carryover';
import { programContinuedLines, programLostContinuations } from './continuation';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// 오늘 탭 처음 정리 ② (W-CARRY-13, 총괄 11/12, mockup ②): a past open task already written again later is closed.
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `fc-${++request}`, expectedSpace: space(data) });
const raw = (data: ProgramData, docId: string) => M.raw(M.getDocument(space(data).text, docId)!);
function writing(text: string, title = '하루 기록', data = createProgramData()) {
  const created = ok(createProgramDocument(data, { ...base(data), title }));
  const next = programClone(created.data);
  space(next).text = M.editTextResult(space(next).text, created.result, text, { folderText: true }).state;
  assert.equal(raw(next, created.result), text, 'seeded as written');
  return { data: next, docId: created.result };
}
const id = (data: ProgramData, title: string, date?: string) => M.tasks(space(data).text).find(task => task.title === title && (!date || task.date === date))!.id;
const TODAY = '2026-11-13';
const PAGE = ['[2026-11-10]', '- /EA', '  - [ ] 발표 준비', '    - [x] 공지', '    - 메모: 자료는 금요일', '  - [40%] 보고서', '  - [ ] 그대로 둘 일', '',
  '[2026-11-12]', '- /EA', '  - [ ] 발표 준비', '  - [ ] 보고서'].join('\n');

test('W-CARRY-13: the already written-again lines are listed, closed with [>] and 이어감 (and their %), one save, read back received; ↶ gives every byte back', () => {
  const { data, docId } = writing(PAGE);
  const plan = programAlreadyContinuedPlan(space(data), TODAY);
  assert.deepEqual(plan.map(entry => [entry.title, entry.day, entry.to, entry.percent]), [['발표 준비', '2026-11-10', '2026-11-12', null], ['보고서', '2026-11-10', '2026-11-12', 40]]);
  const before = programCarryoverBefore(space(data));
  const closed = ok(closeProgramAlreadyContinued(data, { ...base(data), today: TODAY, lines: plan })).data;
  assert.equal(raw(closed, docId), ['[2026-11-10]', '- /EA', '  - [>] 발표 준비', '    - 이어감: 2026-11-12', '    - [x] 공지', '    - 메모: 자료는 금요일', '  - [>] 보고서', '    - 이어감: 2026-11-12 · 40%',
    '  - [ ] 그대로 둘 일', '', '[2026-11-12]', '- /EA', '  - [ ] 발표 준비', '  - [ ] 보고서'].join('\n'));
  assert.equal(closed.receipts.length, data.receipts.length + 1, 'one save');
  assert(programContinuedLines(space(closed).text).every(line => line.received && !line.ambiguous), 'each read back as received');
  assert.equal(programLostContinuations(space(closed).text, TODAY).length, 0);
  assert.deepEqual(M.tasks(space(closed).text).filter(task => !task.done && task.date === '2026-11-10').map(task => task.title), ['그대로 둘 일'], 'on 11/10 only the one not written again stays open');
  assert.deepEqual(programAlreadyContinuedPlan(space(closed), TODAY), [], 'nothing left to list');
  // ↶: exactly as before, while it is exactly as the save left it.
  const back = ok(restoreProgramCarryover(closed, { ...base(closed), before, after: programCarryoverProof(space(closed)) })).data;
  assert.deepEqual(space(back).text, space(data).text);
});

test('W-CARRY-13: only the chosen lines close; one shown differently since is refused (nothing changes)', () => {
  const { data, docId } = writing(PAGE);
  const plan = programAlreadyContinuedPlan(space(data), TODAY);
  const one = ok(closeProgramAlreadyContinued(data, { ...base(data), today: TODAY, lines: [plan[1]] })).data;
  assert(raw(one, docId).includes('  - [ ] 발표 준비\n    - [x] 공지'), 'the unchosen line stays as it is');
  assert(raw(one, docId).includes('  - [>] 보고서\n    - 이어감: 2026-11-12 · 40%'));
  const changed = programClone(data);
  space(changed).text = M.updateTask(space(changed).text, id(changed, '보고서', '2026-11-10'), { title: '보고서 초안' });
  const refused = closeProgramAlreadyContinued(changed, { ...base(changed), today: TODAY, lines: plan });
  assert(!refused.ok && refused.reason === 'conflict');
  assert.equal(refused.data, changed);
});

test('W-CARRY-13: left as they are: records, an open subtask, a link, the same words in another folder path, two candidates, a deleted document', () => {
  const text = ['[2026-11-09]', '- /회사', '  - /진행', '    - [ ] 경로 다른 일', '- /EA', '  - [ ] 기록 있는 일', '  - [ ] 하위 열린 일', '    - [ ] 아직 안 한 하위', '  - [ ] 연결된 일', '  - [ ] 후보 둘',
    '', '[2026-11-12]', '- /개인', '  - /진행', '    - [ ] 경로 다른 일', '- /EA', '  - [ ] 기록 있는 일', '  - [ ] 하위 열린 일', '  - [ ] 연결된 일', '  - [ ] 후보 둘', '  - [ ] 후보 둘'].join('\n');
  let { data } = writing(text);
  space(data).text = { ...space(data).text, progressRecords: [{ taskId: id(data, '기록 있는 일', '2026-11-09'), date: '2026-11-09', percent: 30 }] };
  const refs = writing('[2026-11-12]\n- 참조', '참조 글', data); data = refs.data;
  space(data).text = M.linkTask(space(data).text, refs.docId, 2, id(data, '연결된 일', '2026-11-09'));
  assert(M.validate(space(data).text));
  assert.deepEqual(programAlreadyContinuedPlan(space(data), TODAY), []);
  // A deleted document's lines are not listed either.
  const page = writing(PAGE, '지울 글');
  const trashed = programClone(page.data);
  space(trashed).documentTrash = { [page.docId]: { trashedAt: '2026-11-12T00:00:00.000Z', wasArchived: false } };
  space(trashed).archivedDocumentIds = [...space(trashed).archivedDocumentIds, page.docId];
  assert.deepEqual(programAlreadyContinuedPlan(space(trashed), TODAY), []);
});

const OLD = ['[2026-10-20]', '- /EA', '  - [ ] 오래된 일', '    - [ ] 하위', '    - 메모: 언젠가', '  - [ ] 버릴 일', '- [ ] 폴더 없는 일', '', '[2026-11-10]', '- /EA', '  - [ ] 최근 일'].join('\n');
const NOW = '2026-11-13T09:00:00.000Z';

test('W-CARRY-15·19: 2주 넘은 일 are listed; 날짜 미정 to [미정] under its folder, 휴지통 to the one 버린 할 일 document (its ids, records, owners), one save; ↶ exact', () => {
  const { data, docId } = writing(OLD);
  space(data).text = { ...space(data).text, progressRecords: [{ taskId: id(data, '버릴 일'), date: '2026-10-20', percent: 30 }] };
  const plan = programStalePlan(space(data), TODAY);
  assert.deepEqual(plan.map(line => [line.title, line.day, line.folder, line.trashable]), [['오래된 일', '2026-10-20', 'EA', true], ['버릴 일', '2026-10-20', 'EA', true], ['폴더 없는 일', '2026-10-20', '', true]]);
  const before = programFirstCleanupBefore(space(data));
  const sent = ok(sendProgramStaleTasks(data, { ...base(data), today: TODAY, now: NOW, lines: [
    { lineId: id(data, '오래된 일'), choice: 'undated' }, { lineId: id(data, '버릴 일'), choice: 'trash' }, { lineId: id(data, '폴더 없는 일'), choice: 'trash' }] })).data;
  assert.equal(sent.receipts.length, data.receipts.length + 1, 'one save');
  assert.equal(raw(sent, docId), ['[2026-10-20]', '', '[2026-11-10]', '- /EA', '  - [ ] 최근 일', '', '[미정]', '- /EA', '  - [ ] 오래된 일', '    - [ ] 하위', '    - 메모: 언젠가'].join('\n'));
  assert.equal(M.raw(M.getDocument(space(sent).text, PROGRAM_TRASH_DOCUMENT_ID)!), ['[2026-10-20]', '- 원래 글: 하루 기록', '- /EA', '  - [ ] 버릴 일', '- [ ] 폴더 없는 일'].join('\n'));
  assert.equal(M.getDocument(space(sent).text, PROGRAM_TRASH_DOCUMENT_ID)!.lines.find(line => line.text.endsWith('버릴 일'))!.id, id(data, '버릴 일'), 'the same line id');
  assert.deepEqual(space(sent).text.progressRecords, space(data).text.progressRecords, 'its record follows the id');
  assert(space(sent).documentTrash?.[PROGRAM_TRASH_DOCUMENT_ID] && space(sent).archivedDocumentIds.includes(PROGRAM_TRASH_DOCUMENT_ID), 'the document is in 휴지통');
  // Out of every list: 오늘's past rows and the carryover plan.
  const past = programExecutionTasks(space(sent), { period: 'today', date: TODAY }).map(task => task.title);
  assert(!past.includes('버릴 일') && !past.includes('폴더 없는 일'), past.join(','));
  assert(!planProgramCarryover(space(sent), TODAY).lines.some(line => [id(data, '버릴 일'), id(data, '폴더 없는 일')].includes(line.taskId)));
  assert.deepEqual(programStalePlan(space(sent), TODAY), [], 'nothing left to list');
  // ↶ exactly, the 휴지통 document and its state with it.
  const back = ok(restoreProgramFirstCleanup(sent, { ...base(sent), before, after: programFirstCleanupProof(space(sent)) })).data;
  assert.deepEqual(space(back).text, space(data).text);
  assert.equal(space(back).documentTrash, undefined); assert.deepEqual(space(back).archivedDocumentIds, space(data).archivedDocumentIds);
});

test('W-CARRY-15·19: a later send to 휴지통 of the same day and document writes its folder line once; a linked task cannot go there; recent or touched tasks are not listed', () => {
  const { data, docId } = writing(OLD);
  const first = ok(sendProgramStaleTasks(data, { ...base(data), today: TODAY, now: NOW, lines: [{ lineId: id(data, '버릴 일'), choice: 'trash' }] })).data;
  const second = ok(sendProgramStaleTasks(first, { ...base(first), today: TODAY, now: NOW, lines: [{ lineId: id(first, '오래된 일'), choice: 'trash' }] })).data;
  assert.equal(M.raw(M.getDocument(space(second).text, PROGRAM_TRASH_DOCUMENT_ID)!), ['[2026-10-20]', '- 원래 글: 하루 기록', '- /EA', '  - [ ] 버릴 일', '  - [ ] 오래된 일', '    - [ ] 하위', '    - 메모: 언젠가'].join('\n'));
  void docId;
  // A linked task: 날짜 미정 only.
  let linked = writing(OLD, '연결 글').data;
  const refs = writing('[2026-11-12]\n- 참조', '참조 글', linked); linked = refs.data;
  space(linked).text = M.linkTask(space(linked).text, refs.docId, 2, id(linked, '폴더 없는 일'));
  const entry = programStalePlan(space(linked), TODAY).find(line => line.title === '폴더 없는 일')!;
  assert.equal(entry.trashable, false);
  const refused = sendProgramStaleTasks(linked, { ...base(linked), today: TODAY, now: NOW, lines: [{ lineId: entry.lineId, choice: 'trash' }] });
  assert(!refused.ok && refused.reason === 'conflict');
  // A record after its day (touched since) keeps it out; so does a day within 14 days.
  const touched = programClone(data);
  space(touched).text = { ...space(touched).text, progressRecords: [{ taskId: id(touched, '오래된 일'), date: '2026-11-01', percent: 20 }] };
  assert(!programStalePlan(space(touched), TODAY).some(line => line.title === '오래된 일'));
  assert(!programStalePlan(space(data), TODAY).some(line => line.title === '최근 일'));
});

test('the sheet: on 오늘, asked once on this device; each step its own save and 되돌리기; 휴지통 off for a linked task', async () => {
  const { readFileSync } = await import('node:fs');
  const sheet = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramFirstCleanup.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert(host.includes("{period === 'today' && !monthGrid && <ProgramFirstCleanup actorId={actorId} space={space} today={today}"));
  assert(sheet.includes('if (!storage || storage.getItem(key) || (!twins.length && !closePlan.length && !stalePlan.length)) return;'), 'asked once, only with something to list');
  assert(sheet.includes("closeProgramAlreadyContinued(current, {") && sheet.includes("sendProgramStaleTasks(current, {") && sheet.includes('restoreProgramFirstCleanup(current, {'));
  assert(sheet.includes("disabled={choice === 'trash' && !line.trashable}"));
  // ① first (W-CARRY-20): [하나로 합치기] only when not blocked; [비교해 보기] always.
  assert(sheet.indexOf('data-first-cleanup-merge') < sheet.indexOf('data-first-cleanup-close') && sheet.includes('{!twin.blocked && <button') && sheet.includes('mergeProgramTwinDocuments(current, {'));
  assert(sheet.includes("<h2 id=\"program-first-cleanup-title\">처음 한 번 정리</h2>"));
  for (const word of ['남은 일', '놓친 일', '보관']) assert(!sheet.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').includes(`>${word}`), word);
});

const A = ['[2026-11-10]', '- /EA', '  - [ ] 공통 1', '  - [ ] 공통 2', '  - [ ] 공통 4', '  - [ ] A에만', '', '[2026-11-11]', '- [ ] 공통 3', '- [ ] 공통 5'].join('\n');
const B = ['[2026-11-10]', '- /EA', '  - [ ] 공통 1', '  - [ ] 공통 2', '  - [ ] 공통 4', '', '[2026-11-11]', '- [ ] 공통 3', '- [ ] 공통 5', '- [ ] B에만 1', '- [ ] B에만 2'].join('\n');

test('W-CARRY-20: two documents of one title, 90% the same: the longer kept, the other\'s own lines written in where they stood (ids follow), the other to [지운 글]; snapshot; ↶ exact', () => {
  const a = writing(A, '업무 기록'), b = writing(B, '업무 기록', a.data);
  const data = b.data, mine = M.getDocument(space(data).text, a.docId)!.lines.find(line => line.text.endsWith('A에만'))!.id;
  const [twin] = programTwinDocuments(space(data));
  assert.deepEqual([twin.keep, twin.drop, twin.common, twin.blocked, twin.only.map(line => [line.text.trim(), line.mine])], [b.docId, a.docId, 9, false,
    [['- [ ] A에만', false], ['- [ ] B에만 1', true], ['- [ ] B에만 2', true]]]);
  const before = programFirstCleanupBefore(space(data));
  const merged = ok(mergeProgramTwinDocuments(data, { ...base(data), keep: b.docId, drop: a.docId, now: NOW, when: '2026-11-13 09:00' })).data;
  assert.equal(merged.receipts.length, data.receipts.length + 1, 'one save');
  assert.equal(raw(merged, b.docId), ['[2026-11-10]', '- /EA', '  - [ ] 공통 1', '  - [ ] 공통 2', '  - [ ] 공통 4', '  - [ ] A에만', '', '[2026-11-11]', '- [ ] 공통 3', '- [ ] 공통 5', '- [ ] B에만 1', '- [ ] B에만 2'].join('\n'));
  assert.equal(M.getDocument(space(merged).text, b.docId)!.lines.find(line => line.text.endsWith('A에만'))!.id, mine, 'its id moved with it');
  assert(space(merged).documentTrash?.[a.docId], 'the other in 휴지통 [지운 글]');
  const archive = space(merged).archivedDocumentIds.map(id => M.getDocument(space(merged).text, id)!).find(doc => doc.title.startsWith('합치기 전 원문'))!;
  assert(archive && M.raw(archive).includes(B.split('\n')[9]), 'the kept text before it is archived');
  assert.deepEqual(programTwinDocuments(space(merged)), [], 'nothing to merge any more');
  const back = ok(restoreProgramFirstCleanup(merged, { ...base(merged), before, after: programFirstCleanupProof(space(merged)) })).data;
  assert.deepEqual(space(back).text, space(data).text);
  assert.equal(space(back).documentTrash, undefined);
});

test('W-CARRY-20: a common line of the other with its own record or link is not merged (only 비교해 보기); different titles are not twins', () => {
  const a = writing(A, '업무 기록'), b = writing(B, '업무 기록', a.data);
  const data = b.data, common = M.getDocument(space(data).text, a.docId)!.lines.find(line => line.text.endsWith('공통 1'))!.id;
  space(data).text = { ...space(data).text, progressRecords: [{ taskId: common, date: '2026-11-10', percent: 30 }] };
  assert.equal(programTwinDocuments(space(data))[0].blocked, true);
  const refused = mergeProgramTwinDocuments(data, { ...base(data), keep: b.docId, drop: a.docId, now: NOW, when: '2026-11-13 09:00' });
  assert(!refused.ok && refused.reason === 'forbidden');
  const other = writing(B, '다른 제목', writing(A, '업무 기록').data);
  assert.deepEqual(programTwinDocuments(space(other.data)), []);
});

// Codex first-cleanup review (11/12): its repros.
const bin = (data: ProgramData) => M.raw(M.getDocument(space(data).text, PROGRAM_TRASH_DOCUMENT_ID)!);
const trash = (data: ProgramData, ...titles: string[]) => ok(sendProgramStaleTasks(data, { ...base(data), today: TODAY, now: NOW, lines: titles.map(title => ({ lineId: id(data, title), choice: 'trash' as const })) })).data;

test('Codex P1-1: words that leave no key are never the same task (W-CARRY-02): 11/9 "..." is not closed by 11/12 "???"', () => {
  const { data } = writing(['[2026-11-09]', '- /EA', '  - [ ] ...', '  - [ ] 발표 준비', '', '[2026-11-12]', '- /EA', '  - [ ] ???', '  - [ ] 발표 준비'].join('\n'));
  assert.deepEqual(programAlreadyContinuedPlan(space(data), TODAY).map(entry => entry.title), ['발표 준비']);
});

test('Codex P1-2: a block goes to 휴지통 with every byte inside it; only its outer indent changes, a code block\'s lines stay byte for byte', () => {
  const CODE = ['[2026-10-20]', '- /EA', '  - [ ] 코드 있는 일', '    ```', '      abc', '        def', '    ```', '- 메모 줄', '  - [ ] 들여쓴 일', '    ~~~', '      ghi', '    ~~~'].join('\n');
  const { data } = writing(CODE);
  assert.deepEqual(programStalePlan(space(data), TODAY).map(line => line.title), ['코드 있는 일', '들여쓴 일']);
  const sent = trash(data, '코드 있는 일', '들여쓴 일');
  assert.equal(bin(sent), ['[2026-10-20]', '- 원래 글: 하루 기록', '- /EA', '  - [ ] 코드 있는 일', '    ```', '      abc', '        def', '    ```', '- [ ] 들여쓴 일', '  ~~~', '      ghi', '  ~~~'].join('\n'));
});

test('Codex P2-3: the writing position on a line sent to 휴지통 goes to the nearest line above that stayed; ↶ puts it back', () => {
  const { data, docId } = writing(OLD);
  const lines = M.getDocument(space(data).text, docId)!.lines, at = lines.findIndex(line => line.text.endsWith('버릴 일'));
  space(data).position = { documentId: docId, lineId: lines[at].id, start: 70, end: 72, scrollTop: 40 };
  assert(validateProgramData(data));
  const before = programFirstCleanupBefore(space(data));
  const sent = trash(data, '버릴 일');
  const start = lines.slice(0, at - 1).reduce((sum, line) => sum + line.text.length + 1, 0);
  assert.deepEqual(space(sent).position, { documentId: docId, lineId: lines[at - 1].id, start, end: start, scrollTop: 40 });
  const back = ok(restoreProgramFirstCleanup(sent, { ...base(sent), before, after: programFirstCleanupProof(space(sent)) })).data;
  assert.deepEqual(space(back).position, space(data).position);
  // A merge: on a line of the other document that moves, it follows the line into the kept one.
  const a = writing(A, '업무 기록'), b = writing(B, '업무 기록', a.data), twins = b.data;
  const mine = M.getDocument(space(twins).text, a.docId)!.lines.find(line => line.text.endsWith('A에만'))!.id;
  space(twins).position = { documentId: a.docId, lineId: mine, start: 0, end: 0, scrollTop: 0 };
  const merged = ok(mergeProgramTwinDocuments(twins, { ...base(twins), keep: b.docId, drop: a.docId, now: NOW, when: '2026-11-13 09:00' })).data;
  assert.equal(space(merged).position.documentId, b.docId); assert.equal(space(merged).position.lineId, mine);
});

test('Codex P2-4: two documents of one name keep their own 원래 글 (the id it carries); each bundle goes back to its own', () => {
  const one = writing('[2026-10-20]\n- /EA\n  - [ ] A', '같은 제목'), two = writing('[2026-10-20]\n- /EA\n  - [ ] B', '같은 제목', one.data);
  const sent = trash(two.data, 'A', 'B');
  assert.equal(bin(sent), ['[2026-10-20]', '- 원래 글: 같은 제목', '- /EA', '  - [ ] A', '', '[2026-10-20]', '- 원래 글: 같은 제목', '- /EA', '  - [ ] B'].join('\n'));
  const origins = M.getDocument(space(sent).text, PROGRAM_TRASH_DOCUMENT_ID)!.lines.filter(line => line.text.startsWith('- 원래 글:')).map(line => programTrashOrigin(line.id));
  assert.deepEqual(origins, [one.docId, two.docId]);
  assert.deepEqual(programTrashBundles(space(sent)).map(entry => [entry.title, entry.documentId, entry.documentTitle, entry.folder, entry.back]),
    [['A', one.docId, '같은 제목', 'EA', 'origin'], ['B', two.docId, '같은 제목', 'EA', 'origin']]);
  const back = ok(reviveProgramTrashBundle(sent, { ...base(sent), lineId: id(sent, 'B') }));
  assert.equal(back.result, two.docId);
  assert.equal(raw(back.data, two.docId), '[2026-10-20]\n- /EA\n  - [ ] B');
  assert.equal(raw(back.data, one.docId), '[2026-10-20]');
  assert.equal(bin(back.data), ['[2026-10-20]', '- 원래 글: 같은 제목', '- /EA', '  - [ ] A'].join('\n'));
});

test('Codex P2-5: with its 휴지통 marks gone, 버린 할 일 is still never a document to tidy; the next send puts the marks back', () => {
  const { data } = writing(OLD);
  const sent = trash(data, '버릴 일'), bare = programClone(sent);
  delete space(bare).documentTrash;
  space(bare).archivedDocumentIds = space(bare).archivedDocumentIds.filter(entry => entry !== PROGRAM_TRASH_DOCUMENT_ID);
  assert(validateProgramData(bare));
  assert(!programStalePlan(space(bare), TODAY).some(line => line.documentId === PROGRAM_TRASH_DOCUMENT_ID));
  assert(!programAlreadyContinuedPlan(space(bare), TODAY).some(line => line.documentId === PROGRAM_TRASH_DOCUMENT_ID));
  assert(!programTwinDocuments(space(bare)).some(twin => [twin.keep, twin.drop].includes(PROGRAM_TRASH_DOCUMENT_ID)));
  const again = trash(bare, '오래된 일');
  assert(space(again).documentTrash?.[PROGRAM_TRASH_DOCUMENT_ID] && space(again).archivedDocumentIds.includes(PROGRAM_TRASH_DOCUMENT_ID));
});

test('Codex P2-6: [되살리기] puts one bundle back in its day\'s section of its document (ids, records, folder); a section gone is made in date order; a document gone → [미정] of a new one', () => {
  const { data, docId } = writing(OLD);
  space(data).text = { ...space(data).text, progressRecords: [{ taskId: id(data, '버릴 일'), date: '2026-10-20', percent: 30 }] };
  const sent = trash(data, '버릴 일', '폴더 없는 일');
  assert.deepEqual(programTrashBundles(space(sent)).map(entry => [entry.title, entry.day, entry.folder, entry.back]), [['버릴 일', '2026-10-20', 'EA', 'origin'], ['폴더 없는 일', '2026-10-20', '', 'origin']]);
  // Later edits elsewhere do not stand in its way (not an exact ↶).
  const edited = programClone(sent);
  space(edited).text = M.updateTask(space(edited).text, id(edited, '최근 일'), { title: '최근 일 고침' });
  const back = ok(reviveProgramTrashBundle(edited, { ...base(edited), lineId: id(edited, '버릴 일') })).data;
  assert.equal(back.receipts.length, edited.receipts.length + 1, 'one save');
  assert.equal(raw(back, docId), ['[2026-10-20]', '- /EA', '  - [ ] 오래된 일', '    - [ ] 하위', '    - 메모: 언젠가', '  - [ ] 버릴 일', '', '[2026-11-10]', '- /EA', '  - [ ] 최근 일 고침'].join('\n'));
  assert.equal(M.tasks(space(back).text).find(task => task.title === '버릴 일')!.id, id(data, '버릴 일'), 'its id');
  assert.deepEqual(space(back).text.progressRecords, space(data).text.progressRecords, 'its record');
  assert.equal(bin(back), ['[2026-10-20]', '- 원래 글: 하루 기록', '- [ ] 폴더 없는 일'].join('\n'), 'its empty folder line went');
  const both = ok(reviveProgramTrashBundle(back, { ...base(back), lineId: id(back, '폴더 없는 일') })).data;
  assert.equal(bin(both), '', 'a day left with nothing goes whole');
  assert(raw(both, docId).includes('  - [ ] 버릴 일\n- [ ] 폴더 없는 일\n'));
  // Its day's section gone: made where the date chip would make it (before 11/10), with its folder line.
  const gone = programClone(sent);
  space(gone).text = M.editTextResult(space(gone).text, docId, '[2026-11-10]\n- /EA\n  - [ ] 최근 일', { folderText: true }).state;
  const made = ok(reviveProgramTrashBundle(gone, { ...base(gone), lineId: id(gone, '버릴 일') })).data;
  assert.equal(raw(made, docId), ['[2026-10-20]', '- /EA', '  - [ ] 버릴 일', '', '[2026-11-10]', '- /EA', '  - [ ] 최근 일'].join('\n'));
  assert.equal(M.tasks(space(made).text).find(task => task.title === '버릴 일')!.date, '2026-10-20');
  // Its document gone (in 휴지통): [미정] of a new document of its name.
  const deleted = programClone(sent);
  space(deleted).documentTrash = { ...space(deleted).documentTrash, [docId]: { trashedAt: NOW, wasArchived: false } };
  space(deleted).archivedDocumentIds = [...space(deleted).archivedDocumentIds, docId];
  assert.equal(programTrashBundles(space(deleted))[0].back, 'undated');
  const elsewhere = ok(reviveProgramTrashBundle(deleted, { ...base(deleted), lineId: id(deleted, '버릴 일') }));
  assert.notEqual(elsewhere.result, docId);
  assert.equal(M.getDocument(space(elsewhere.data).text, elsewhere.result)!.title, '하루 기록');
  assert.equal(raw(elsewhere.data, elsewhere.result), '[미정]\n- /EA\n  - [ ] 버릴 일');
  assert.equal(M.tasks(space(elsewhere.data).text).find(task => task.title === '버릴 일')!.date, null);
  // A line that is not a bundle is refused, nothing changed.
  const refused = reviveProgramTrashBundle(sent, { ...base(sent), lineId: 'line-none' });
  assert(!refused.ok && refused.reason === 'missing' && refused.data === sent);
});