import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramPublicationDraft } from './contract';
import { createProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramPublicationDraft, programPublicationInput, publishProgramDocument, saveProgramPublicationDraft } from './publication-editor';
import { applyProgramPublicationStepDates, captureProgramPublicationStepInput, composeProgramPublicationSummary, programPublicationDateExample, programPublicationExposure, programPublicationPickGroups, programPublicationSavedSchedules, programPublicationStepNativeValue, programPublicationSummaryParts } from './publication-steps';
import { programPublicationRowDates, programPublicationTakerPreview } from './publication-anchor';
import { programRecurringDraftFromSchedule } from './public-recurrence-contract';

const NOW = '2026-11-09T03:00:00.000Z';
function fixture() {
  const data = createProgramData(), actorId = data.activeActorId;
  let text = M.addDocument(data.spaces[actorId].text, { title: '합성 공개 원문' });
  const documentId = text.documents.at(-1)!.id;
  const raw = '[2026-11-09]\n- [ ] 상자 고르기\n- [ ] 목록 적기\n개인 메모 합성\n[2026-11-22]\n- [ ] 옮긴 짐 확인\n- [ ] 날짜 없는 일\n  - 날짜: 미정';
  const edited = M.editTextResult(text, documentId, raw, { folderText: true });
  assert.equal(edited.reason, null); text = edited.state; data.spaces[actorId].text = text;
  const draft = createProgramPublicationDraft(data, documentId, NOW)!;
  assert(draft); const dates = programPublicationRowDates(text, documentId);
  return { data, actorId, documentId, draft, dates, raw: M.raw(M.getDocument(text, documentId)) };
}
const selectTasks = (draft: ProgramPublicationDraft) => ({ ...draft, title: '합성 공개', rows: draft.rows.map(row => ({ ...row, selected: row.origin === 'task' })) });

test('fresh selection is empty and date groups keep notes separate from task bulk', () => {
  const f = fixture(); assert(f.draft.rows.every(row => !row.selected));
  const groups = programPublicationPickGroups(f.draft.rows, M.rowMeta(f.data.spaces[f.actorId].text, f.documentId));
  assert.equal(groups.length, 2); assert.equal(groups[0].date, '2026-11-09');
  const taskIds = groups[0].rows.filter(row => row.origin !== 'note').map(row => row.itemId);
  const selected = { ...f.draft, rows: f.draft.rows.map(row => ({ ...row, selected: taskIds.includes(row.itemId) })) };
  assert(selected.rows.some(row => row.origin === 'note'));
  assert(selected.rows.filter(row => row.origin === 'note').every(row => !row.selected));
});

test('first -> last -> none preserves order, private raw, and ordinary hand-set schedules', () => {
  const f = fixture(), draft = selectTasks(f.draft);
  const ordinary = draft.rows.filter(row => row.origin === 'task');
  ordinary[1].scheduleKind = 'fixed'; ordinary[1].scheduleValue = '2026-12-01';
  const first = applyProgramPublicationStepDates(draft, f.dates, 'first', null);
  assert.equal(first.draft.rows.find(row => row.itemId === ordinary[0].itemId)!.scheduleValue, '0');
  assert.equal(first.draft.rows.find(row => row.itemId === ordinary[2].itemId)!.scheduleValue, '13');
  const last = applyProgramPublicationStepDates(first.draft, f.dates, 'last', first.undo);
  assert.equal(last.draft.rows.find(row => row.itemId === ordinary[0].itemId)!.scheduleValue, '-13');
  assert.equal(last.draft.rows.find(row => row.itemId === ordinary[2].itemId)!.scheduleValue, '0');
  const none = applyProgramPublicationStepDates(last.draft, f.dates, 'none', last.undo);
  assert.equal(none.draft.rows.find(row => row.itemId === ordinary[0].itemId)!.scheduleKind, 'undated');
  assert.deepEqual(none.draft.rows.find(row => row.itemId === ordinary[1].itemId), ordinary[1]);
  assert.deepEqual(none.draft.rows.map(row => row.itemId), draft.rows.map(row => row.itemId));
  assert.equal(M.raw(M.getDocument(f.data.spaces[f.actorId].text, f.documentId)), f.raw);
});

test('manual undated and equal-offset edits survive step and mode transitions', () => {
  const f = fixture(), first = applyProgramPublicationStepDates(selectTasks(f.draft), f.dates, 'first', null);
  const firstRow = first.draft.rows.find(row => row.scheduleKind === 'relative')!;
  const manual = new Set([firstRow.itemId]);
  const undated = programClone(first.draft); Object.assign(undated.rows.find(row => row.itemId === firstRow.itemId)!, { scheduleKind: 'undated', scheduleValue: '' });
  for (const mode of ['first', 'last', 'none'] as const) {
    const changed = applyProgramPublicationStepDates(undated, f.dates, mode, first.undo, manual);
    assert.equal(changed.draft.rows.find(row => row.itemId === firstRow.itemId)!.scheduleKind, 'undated');
    const sameOffset = applyProgramPublicationStepDates(first.draft, f.dates, mode, first.undo, manual);
    assert.deepEqual(sameOffset.draft.rows.find(row => row.itemId === firstRow.itemId), firstRow);
  }
});

test('reopened saved relative schedules retain meaning when provenance is unavailable', () => {
  const f = fixture(), first = applyProgramPublicationStepDates(selectTasks(f.draft), f.dates, 'first', null);
  const stored = saveProgramPublicationDraft(f.data, f.actorId, first.draft, null); assert(stored.ok);
  const reopened = createProgramPublicationDraft(stored.data, f.documentId, NOW)!;
  for (const mode of ['last', 'none'] as const) {
    const changed = applyProgramPublicationStepDates(reopened, f.dates, mode, null);
    assert.deepEqual(changed.draft.rows, reopened.rows);
    assert(changed.plan.handSet >= 3);
  }
});

test('reopening and new-version selection convert a newly selected task against existing source dates', () => {
  const f = fixture(), initial = selectTasks(f.draft);
  initial.rows.find(row => row.title === '옮긴 짐 확인')!.selected = false;
  const first = applyProgramPublicationStepDates(initial, f.dates, 'first', null);
  const stored = saveProgramPublicationDraft(f.data, f.actorId, first.draft, null); assert(stored.ok);
  const published = publishProgramDocument(stored.data, f.actorId, first.draft, NOW); assert(published.ok);
  for (const data of [stored.data, published.data]) {
    const reopened = createProgramPublicationDraft(data, f.documentId, NOW)!;
    const saved = programPublicationSavedSchedules(reopened.rows);
    const added = reopened.rows.find(row => row.title === '옮긴 짐 확인')!;
    assert(!saved.has(added.itemId)); added.selected = true;
    const result = applyProgramPublicationStepDates(reopened, f.dates, 'first', null, saved, saved);
    assert.equal(result.draft.rows.find(row => row.itemId === added.itemId)!.scheduleKind, 'relative');
    assert.equal(result.draft.rows.find(row => row.itemId === added.itemId)!.scheduleValue, '13');
    assert.deepEqual(result.draft.rows.filter(row => saved.has(row.itemId)), reopened.rows.filter(row => saved.has(row.itemId)));
    const last = applyProgramPublicationStepDates(result.draft, f.dates, 'last', result.undo, saved, saved, true);
    assert.equal(last.draft.rows.find(row => row.itemId === added.itemId)!.scheduleValue, '0');
    assert.equal(last.draft.rows.find(row => row.title === '상자 고르기')!.scheduleValue, '-13');
    assert.equal(last.draft.rows.find(row => row.title === '날짜 없는 일')!.scheduleKind, 'undated');
  }
});

test('saved selected undated stays undated, while unselected and repeated rows do not pin new dates', () => {
  const f = fixture(), draft = selectTasks(f.draft);
  const firstTask = draft.rows.find(row => row.title === '상자 고르기')!;
  firstTask.selected = false;
  const repeated = draft.rows.find(row => row.title === '목록 적기')!;
  repeated.title = '운동 @매일'; repeated.scheduleKind = 'relative'; repeated.scheduleValue = '0';
  const saved = programPublicationSavedSchedules(draft.rows);
  const newTask = draft.rows.find(row => row.title === '옮긴 짐 확인')!;
  saved.delete(newTask.itemId);
  const result = applyProgramPublicationStepDates(draft, f.dates, 'first', null, saved, saved);
  assert.equal(result.draft.rows.find(row => row.itemId === newTask.itemId)!.scheduleValue, '0');
  assert.deepEqual(result.draft.rows.filter(row => saved.has(row.itemId)), draft.rows.filter(row => saved.has(row.itemId)));
  const none = applyProgramPublicationStepDates(result.draft, f.dates, 'none', result.undo, saved, saved);
  assert.deepEqual(none.draft.rows, draft.rows);
  const savedNone = programPublicationSavedSchedules(none.draft.rows);
  assert.deepEqual(applyProgramPublicationStepDates(none.draft, f.dates, 'first', null, savedNone, savedNone).draft.rows, none.draft.rows);
});

test('date example is the first selected nonzero relative chip, including renamed and empty anchors', () => {
  const f = fixture(), first = applyProgramPublicationStepDates(selectTasks(f.draft), f.dates, 'first', null);
  assert.deepEqual(programPublicationDateExample(first.draft), { text: '기준일 +13일', allZero: false });
  first.draft.summary = '기준일: 이사일\n소개';
  assert.deepEqual(programPublicationDateExample(first.draft), { text: '이사일 +13일', allZero: false });
  const last = applyProgramPublicationStepDates(first.draft, f.dates, 'last', first.undo);
  assert.deepEqual(programPublicationDateExample(last.draft), { text: '이사일 −13일', allZero: false });
  last.draft.rows.forEach(row => { if (row.scheduleKind === 'relative') row.scheduleValue = '0'; });
  assert.deepEqual(programPublicationDateExample(last.draft), { text: '이사일 당일', allZero: false });
  last.draft.rows.forEach(row => { row.selected = false; });
  assert.equal(programPublicationDateExample(last.draft), null);
});

test('all-zero copy is true only when every selected schedule is the anchor day', () => {
  const f = fixture(), draft = selectTasks(f.draft);
  draft.rows.forEach(row => { row.scheduleKind = 'relative'; row.scheduleValue = '0'; });
  const before = programClone(draft);
  assert.deepEqual(programPublicationDateExample(draft), { text: '기준일 당일', allZero: true });
  assert.deepEqual(draft, before);
  draft.summary = '기준일: 이사일';
  assert.deepEqual(programPublicationDateExample(draft), { text: '이사일 당일', allZero: true });
  const last = draft.rows.filter(row => row.selected).at(-1)!;
  for (const kind of ['undated', 'fixed', 'recurring'] as const) {
    last.scheduleKind = kind;
    assert.equal(programPublicationDateExample(draft)?.allZero, false);
  }
  last.scheduleKind = 'relative'; last.scheduleValue = '6';
  assert.deepEqual(programPublicationDateExample(draft), { text: '이사일 +6일', allZero: false });
  last.scheduleValue = 'not-a-number';
  assert.equal(programPublicationDateExample(draft)?.allZero, false);
  last.selected = false;
  assert.equal(programPublicationDateExample(draft)?.allZero, true);
  draft.rows.forEach(row => { row.scheduleKind = 'undated'; });
  assert.equal(programPublicationDateExample(draft), null);
});

test('no-date guidance distinguishes unavailable source dates from reversible date removal', () => {
  const f = fixture(), draft = selectTasks(f.draft), before = programClone(draft);
  const unavailable = applyProgramPublicationStepDates(draft, new Map(), 'first', null);
  assert.equal(unavailable.plan.rows.length, 0);
  assert.equal(programPublicationDateExample(unavailable.draft), null);
  assert.deepEqual(draft, before);
  const first = applyProgramPublicationStepDates(draft, f.dates, 'first', null);
  const none = applyProgramPublicationStepDates(first.draft, f.dates, 'none', first.undo);
  assert.equal(programPublicationDateExample(none.draft), null);
  assert(none.plan.rows.length > 0);
  const again = applyProgramPublicationStepDates(none.draft, f.dates, 'first', none.undo);
  assert.deepEqual(again.draft.rows, first.draft.rows);
});

test('split summary native capture retains Korean metadata and a metadata-like body byte for byte', () => {
  const f = fixture();
  for (const summary of ['', '소개', '기준일: \n소개', '기준일: 이사일\n기준일: 점검일\n소개', '기준일: 이사일\n']) {
    const draft = { ...f.draft, summary };
    assert.deepEqual(captureProgramPublicationStepInput(draft, []), draft);
    const parts = programPublicationSummaryParts(summary);
    assert.deepEqual(captureProgramPublicationStepInput(draft, [{ field: 'summary', value: parts.body }, { field: 'anchorName', value: parts.name }]), draft);
  }
  // Enter 우선 3 (11/10): a changed '한 줄 소개' is one line (its break a space); a body that looks like metadata stays the body.
  const next = captureProgramPublicationStepInput(f.draft, [{ field: 'summary', value: '기준일: 점검일\n소개를 적는 중' }, { field: 'anchorName', value: '이사일' }]);
  assert.equal(next.summary, '기준일: 이사일\n기준일: 점검일 소개를 적는 중');
  assert.equal(programPublicationStepNativeValue(next, 'summary'), '기준일: 점검일 소개를 적는 중');
  assert.equal(programPublicationStepNativeValue(next, 'anchorName'), '이사일');
  assert.equal(composeProgramPublicationSummary('옮기는 날', programPublicationSummaryParts(next.summary).body), '기준일: 옮기는 날\n기준일: 점검일 소개를 적는 중');
});

test('exposure includes explicit notes and fixed recurring start/end dates', () => {
  const f = fixture(), draft = selectTasks(f.draft), rows = draft.rows.filter(row => row.selected);
  Object.assign(rows[0], { scheduleKind: 'fixed', scheduleValue: '2026-12-01' });
  Object.assign(rows[1], { scheduleKind: 'recurring', recurrence: programRecurringDraftFromSchedule({ kind: 'recurring', version: 1, rule: { version: 1, semantics: 'authoring-v1', frequency: 'daily', interval: 1, end: null }, start: { kind: 'fixed', date: '2026-12-01' }, time: null, timeZone: null }) });
  Object.assign(rows[2], { scheduleKind: 'recurring', recurrence: programRecurringDraftFromSchedule({ kind: 'recurring', version: 1, rule: { version: 1, semantics: 'authoring-v1', frequency: 'daily', interval: 1, end: { mode: 'until', date: '2026-12-31' } }, start: { kind: 'relative', days: 0 }, time: null, timeZone: null }) });
  draft.rows.find(row => row.origin === 'note')!.selected = true;
  assert.equal(programPublicationExposure(draft).fixed.length, 3); assert.equal(programPublicationExposure(draft).notes, 1);
});

test('automatic anchor publishes only selected public fields and previews recipient dates', () => {
  const f = fixture(), next = applyProgramPublicationStepDates(selectTasks(f.draft), f.dates, 'first', null);
  next.draft.summary = composeProgramPublicationSummary('이사일', '합성 소개');
  const input = programPublicationInput(next.draft, f.actorId)!; assert(input);
  assert(input.items.every(item => item.schedule.kind !== 'fixed'));
  const stored = saveProgramPublicationDraft(f.data, f.actorId, next.draft, null); assert(stored.ok);
  const published = publishProgramDocument(stored.data, f.actorId, next.draft, NOW); assert(published.ok);
  const version = published.data.public.versions.find(row => row.id === published.result)!;
  assert.deepEqual(version.items, input.items); assert.equal(version.summary, '기준일: 이사일\n합성 소개');
  assert(!JSON.stringify(version).includes('개인 메모 합성'));
  const preview = programPublicationTakerPreview(version.items, version.title, '2027-01-01', '2026-11-09');
  assert(preview.dated.some(day => day.date === '2027-01-01'));
  assert(preview.dated.some(day => day.date === '2027-01-14'));
  assert.equal(M.raw(M.getDocument(published.data.spaces[f.actorId].text, f.documentId)), f.raw);
});
