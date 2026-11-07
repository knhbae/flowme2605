import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProgramData, ProgramTransition } from './contract';
import { createProgramData } from './program-data';
import { createProgramDocument, importProgramPublicVersion } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { programExecutionTasks } from './execution';
import { createProgramPublicationDraft, publicationDraftAt, publishProgramDocument, saveProgramPublicationDraft, programPublicationInput } from './publication-editor';
import { applyProgramPublicationAnchor, planProgramPublicationAnchor, programAnchorChip, programAnchorSummary, programPublicationRowDates, programPublicationTakerPreview, restoreProgramPublicationAnchor } from './publication-anchor';
import { programImportRepeatChoice, programImportRepeats } from './public-repeat-import';
import { programImportPreview } from './import-preview';

// Flow pipeline stage 2 (S7): a document's dated tasks published as days from one 기준일; a taker choosing the writer's
// own 기준일 gets the writer's dates back, and the sheet's preview (stage 1's function) says the same before taking.
const ACTOR = 'local-user', NOW = '2026-11-08T00:00:00.000Z', TODAY = '2026-11-08';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const RAW = ['[2026-11-01]', '- [ ] 짐 목록 만들기', '[2026-11-08]', '- [ ] 전입 신고 예약', '- [ ] 인터넷 이전', '  - 날짜: 2026-11-10', '[2026-11-14]', '- [ ] 냉장고 비우기',
  '- [ ] 짐 정리 30분 @매주 토', '- [ ] 정수기 필터 @?개월마다', '[미정]', '- [ ] 주소 변경 알리기', '- 이사 메모 한 줄', ''].join('\n');
function written(raw = RAW) {
  const data = createProgramData();
  const made = ok(createProgramDocument(data, { actorId: ACTOR, requestId: `s2-${++request}`, expectedSpace: data.spaces[ACTOR], title: '이사 기록', raw }));
  const draft = createProgramPublicationDraft(made.data, made.result, NOW)!;
  draft.title = '이사 준비 2주'; draft.summary = '내가 해 본 순서';
  for (const row of draft.rows) row.selected = row.origin === 'task';
  return { data: made.data, documentId: made.result, draft };
}
const titleDates = (data: ProgramData, documentId: string) => new Map(M.rowMeta(data.spaces[ACTOR].text, documentId).filter(row => row.kind === 'task').map(row => [row.title!, row.date === undefined ? row.groupDate : row.date]));

test('the rows\' own dates: a head line\'s, or the task\'s `날짜:`; 미정 has none', () => {
  const { data, documentId, draft } = written();
  const dates = programPublicationRowDates(data.spaces[ACTOR].text, documentId), byTitle = new Map(draft.rows.map(row => [row.title, row.rowId ? dates.get(row.rowId) ?? null : null]));
  assert.deepEqual([...byTitle], [['짐 목록 만들기', '2026-11-01'], ['전입 신고 예약', '2026-11-08'], ['인터넷 이전', '2026-11-10'], ['냉장고 비우기', '2026-11-14'],
    ['짐 정리 30분 @매주 토', '2026-11-14'], ['정수기 필터 @?개월마다', '2026-11-14'], ['주소 변경 알리기', null], ['', null]]);
  assert(draft.rows.every(row => row.scheduleKind === 'undated'), 'a draft from a document starts every row as 미정 (the problem this solves)');
});

test('first day (+n) and last day (−n): only 미정 rows with a date change; repeats, hand-set and dateless stay', () => {
  const { data, documentId, draft } = written(), dates = programPublicationRowDates(data.spaces[ACTOR].text, documentId);
  draft.rows.find(row => row.title === '냉장고 비우기')!.scheduleKind = 'fixed'; draft.rows.find(row => row.title === '냉장고 비우기')!.scheduleValue = '2026-11-20';
  const first = planProgramPublicationAnchor(draft, dates, 'first'), last = planProgramPublicationAnchor(draft, dates, 'last');
  assert.deepEqual([first.anchor, first.rows.map(row => row.days), first.handSet, first.repeats, first.undated, first.single], ['2026-11-01', [0, 7, 9], 1, 2, 1, false]);
  assert.deepEqual([last.anchor, last.rows.map(row => row.days)], ['2026-11-10', [-9, -2, 0]]);
  assert.deepEqual([programAnchorChip('이사일', -7), programAnchorChip('', 0), programAnchorChip('시작일', 3)], ['이사일 −7일', '기준일 당일', '시작일 +3일']);
  const one = written(['[2026-11-03]', '- [ ] 하나', '- [ ] 둘', ''].join('\n'));
  const single = planProgramPublicationAnchor(one.draft, programPublicationRowDates(one.data.spaces[ACTOR].text, one.documentId), 'first');
  assert.deepEqual([single.single, single.rows.map(row => row.days)], [true, [0, 0]]);
  const none = written(['- [ ] 날짜 없음', ''].join('\n'));
  assert.equal(planProgramPublicationAnchor(none.draft, programPublicationRowDates(none.data.spaces[ACTOR].text, none.documentId), 'first').rows.length, 0);
});

test('[원래대로] puts back the rows and the summary line, only while they read as changed', () => {
  const { data, documentId, draft } = written(), plan = planProgramPublicationAnchor(draft, programPublicationRowDates(data.spaces[ACTOR].text, documentId), 'last');
  const applied = applyProgramPublicationAnchor(draft, plan, '이사일');
  assert.equal(applied.draft.summary, '기준일: 이사일\n내가 해 본 순서');
  assert.equal(programAnchorSummary(applied.draft.summary, '입주일'), '기준일: 입주일\n내가 해 본 순서', 'a new name replaces the line');
  assert.equal(programAnchorSummary(applied.draft.summary, ''), '내가 해 본 순서');
  assert.equal(applyProgramPublicationAnchor(draft, plan, '').draft.summary, '내가 해 본 순서', 'no name, no line');
  const back = restoreProgramPublicationAnchor(applied.draft, applied.undo);
  assert.deepEqual(back.draft, draft);
  const edited = { ...applied.draft, rows: applied.draft.rows.map(row => row.title === '짐 목록 만들기' ? { ...row, scheduleValue: '-12' } : row) };
  const partly = restoreProgramPublicationAnchor(edited, applied.undo);
  assert.deepEqual([partly.restored, partly.kept, partly.draft.rows.find(row => row.title === '짐 목록 만들기')!.scheduleValue], [3, 1, '-12'], 'a row changed by hand since stays');
});

test('published and taken with the writer\'s own 기준일: the writer\'s dates come back, as the sheet previews them', () => {
  for (const mode of ['first', 'last'] as const) {
    const { data, documentId, draft } = written(), plan = planProgramPublicationAnchor(draft, programPublicationRowDates(data.spaces[ACTOR].text, documentId), mode);
    const changed = applyProgramPublicationAnchor(draft, plan, '이사일').draft;
    const saved = ok(saveProgramPublicationDraft(data, ACTOR, changed, publicationDraftAt(data, ACTOR, documentId)));
    assert(programPublicationInput(changed, ACTOR));
    const published = ok(publishProgramDocument(saved.data, ACTOR, changed, NOW)), version = published.data.public.versions.find(row => row.id === published.result)!;
    assert(version.items.every(item => item.schedule.kind !== 'fixed'), 'no private date is published');
    assert.deepEqual(version.items.filter(item => item.schedule.kind === 'relative').map(item => item.title), ['짐 목록 만들기', '전입 신고 예약', '인터넷 이전', '냉장고 비우기']);
    // A taker with an empty space (the writer's own repeat line would read as one they already have) chooses the writer's 기준일.
    const taker = createProgramData(); taker.public = structuredClone(published.data.public);
    const ids = version.items.map(item => item.id), repeats = programImportRepeats(taker.spaces[ACTOR], version, ids);
    const choice = programImportRepeatChoice(repeats, { starts: {}, months: {} }, TODAY)!;
    const preview = programImportPreview(version, ids, plan.anchor, repeats, TODAY, choice);
    const taken = ok(importProgramPublicVersion(taker, { actorId: ACTOR, requestId: `s2-${++request}`, expectedSpace: taker.spaces[ACTOR], versionId: version.id, itemIds: ids, anchor: plan.anchor, ...choice }));
    const copy = taken.data.spaces[ACTOR].copies.find(row => row.id === taken.result)!;
    const got = new Map(programExecutionTasks(taken.data.spaces[ACTOR]).filter(task => task.docId === copy.documentId && !/@/.test(task.title)).map(task => [task.title, task.date]));
    const own = titleDates(data, documentId);
    for (const title of ['짐 목록 만들기', '전입 신고 예약', '인터넷 이전', '냉장고 비우기']) assert.equal(got.get(title), own.get(title), `${mode}: ${title}`);
    assert.equal(got.get('주소 변경 알리기'), null);
    // The sheet said so before taking.
    const previewed = new Map(preview.dated.flatMap(day => day.titles.map(title => [title, day.date] as const)));
    for (const title of ['짐 목록 만들기', '전입 신고 예약', '인터넷 이전', '냉장고 비우기']) assert.equal(previewed.get(title), own.get(title), `${mode} preview: ${title}`);
    assert.deepEqual(preview.repeats.map(row => row.title), ['짐 정리 30분'], 'the repeat line goes as a repeat');
    assert.deepEqual(preview.undated.titles, ['정수기 필터', '주소 변경 알리기']);
    // The editor's preview (before publishing) is the same.
    assert.deepEqual(programPublicationTakerPreview(programPublicationInput(changed, ACTOR)!.items, changed.title, plan.anchor, TODAY), preview);
  }
});

test('the wiring: the editor shows the taker\'s preview with stage 1\'s function; the source link sits under the summary', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
  const editor = read('components/flow/integrated-poc/ProgramPublisher.tsx');
  assert(editor.includes('programPublicationTakerPreview(input.items, input.title, takerDate, today)'), 'the taker\'s preview');
  const lib = read('lib/flow/integrated-poc/publication-anchor.ts');
  assert(lib.includes('return programImportPreview(version, ids, anchor, repeats, today, choice);'), 'stage 1\'s preview function');
  assert(editor.indexOf('data-publication-field="sourceUrl" value={draft.sourceUrl}') < editor.indexOf('data-anchor-convert'), 'the link above the conversion');
  assert(editor.indexOf('data-anchor-convert') < editor.indexOf('<h3>공개할 항목</h3>'));
  assert.equal(editor.split('data-publication-field="sourceUrl" value={draft.sourceUrl}').length, 2, 'one field for the Flow\'s link');
});
