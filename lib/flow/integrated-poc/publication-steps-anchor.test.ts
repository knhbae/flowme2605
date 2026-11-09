import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramPublicationDraft } from './contract';
import { createProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramPublicationDraft, publishProgramDocument, saveProgramPublicationDraft } from './publication-editor';
import { programPublicationRowDates } from './publication-anchor';
import { applyProgramPublicationStepDates as apply, programPublicationSavedSchedules, programPublicationSavedSourceDates } from './publication-steps';

const NOW = '2026-11-09T06:00:00.000Z';
function fixture() {
  const data = createProgramData(), actor = data.activeActorId;
  let text = M.addDocument(data.spaces[actor].text, { title: '합성 기준일' });
  const documentId = text.documents.at(-1)!.id;
  const raw = ['01', '02', '08', '13', '15'].map(day => `[2026-11-${day}]\n- [ ] 일 ${day}`).join('\n');
  const edited = M.editTextResult(text, documentId, raw, { folderText: true });
  assert.equal(edited.reason, null); text = edited.state; data.spaces[actor].text = text;
  const draft = createProgramPublicationDraft(data, documentId, NOW)!; draft.title = '합성 기준일';
  return { data, actor, documentId, draft, dates: programPublicationRowDates(text, documentId), raw: M.raw(M.getDocument(text, documentId)) };
}
function pick(draft: ProgramPublicationDraft, days: string[]) {
  return { ...draft, rows: draft.rows.map(row => ({ ...row, selected: days.some(day => row.title === `일 ${day}`) })) };
}
const offsets = (draft: ProgramPublicationDraft) => Object.fromEntries(draft.rows.filter(row => row.selected).map(row => [row.title, row.scheduleKind === 'relative' ? Number(row.scheduleValue) : row.scheduleKind]));

for (const path of ['reopen', 'new-version'] as const) {
  for (const scenario of ['A-last', 'B-earlier'] as const) test(`${path} ${scenario}: saved anchor agrees through actual publication`, () => {
    const f = fixture(), days = scenario === 'A-last' ? ['02', '08', '13'] : ['02', '08'];
    const initial = apply(pick(f.draft, days), f.dates, scenario === 'A-last' ? 'last' : 'first', null);
    const stored = saveProgramPublicationDraft(f.data, f.actor, initial.draft, null); assert(stored.ok);
    const firstPublic = publishProgramDocument(stored.data, f.actor, initial.draft, NOW); assert(firstPublic.ok);
    const data = path === 'new-version' ? firstPublic.data : stored.data;
    const reopened = createProgramPublicationDraft(data, f.documentId, NOW)!;
    const saved = programPublicationSavedSchedules(reopened.rows), source = programPublicationSavedSourceDates(reopened, data.spaces[f.actor].text);
    const added = pick(reopened, [...days, scenario === 'A-last' ? '15' : '01']);
    const result = apply(added, f.dates, 'first', null, saved, saved, false, source);
    const expected = scenario === 'A-last' ? { '일 02': -11, '일 08': -5, '일 13': 0, '일 15': 2 } : { '일 01': -1, '일 02': 0, '일 08': 6 };
    assert.equal(result.issue, null); assert.deepEqual(offsets(result.draft), expected);
    assert.deepEqual(result.draft.rows.filter(row => saved.has(row.itemId)), added.rows.filter(row => saved.has(row.itemId)));
    const expectedDraft = data.spaces[f.actor].publicationDrafts.find(row => row.documentId === f.documentId) ?? null;
    const savedResult = saveProgramPublicationDraft(data, f.actor, result.draft, expectedDraft); assert(savedResult.ok);
    const published = publishProgramDocument(savedResult.data, f.actor, result.draft, NOW); assert(published.ok);
    const version = published.data.public.versions.find(row => row.id === published.result)!;
    assert.deepEqual(Object.fromEntries(version.items.map(row => [row.title, row.schedule.kind === 'relative' ? row.schedule.days : row.schedule.kind])), expected);
    assert.equal(M.raw(M.getDocument(published.data.spaces[f.actor].text, f.documentId)), f.raw);
  });
}

test('explicit modes rebase every managed relative, also after going back and changing selection', () => {
  const f = fixture(), initial = apply(pick(f.draft, ['02', '08', '13']), f.dates, 'last', null);
  const saved = programPublicationSavedSchedules(initial.draft.rows);
  const added = pick(initial.draft, ['02', '08', '13', '15']);
  const first = apply(added, f.dates, 'first', null, saved, saved, true);
  assert.deepEqual(offsets(first.draft), { '일 02': 0, '일 08': 6, '일 13': 11, '일 15': 13 });
  first.releasedSchedules.forEach(id => saved.delete(id));
  const last = apply(first.draft, f.dates, 'last', first.undo, saved, saved, true);
  assert.deepEqual(offsets(last.draft), { '일 02': -13, '일 08': -7, '일 13': -2, '일 15': 0 });
  const selected = pick(last.draft, ['01', '02', '08']);
  const again = apply(selected, f.dates, 'last', last.undo, saved, saved, true);
  assert.deepEqual(offsets(again.draft), { '일 01': -7, '일 02': -6, '일 08': 0 });
  const none = apply(again.draft, f.dates, 'none', again.undo, saved, saved, true);
  assert.deepEqual(offsets(none.draft), { '일 01': 'undated', '일 02': 'undated', '일 08': 'undated' });
  assert.deepEqual(offsets(apply(none.draft, f.dates, 'first', none.undo, saved, saved, true).draft), { '일 01': 0, '일 02': 1, '일 08': 7 });
});

test('explicit none releases stored relative management but preserves saved none, fixed and current manual relative', () => {
  const f = fixture(), draft = pick(f.draft, ['01', '02', '08', '13', '15']);
  const [undated, relative, fixed, manual, ordinary] = draft.rows;
  Object.assign(relative, { scheduleKind: 'relative', scheduleValue: '0' });
  Object.assign(fixed, { scheduleKind: 'fixed', scheduleValue: '2026-12-01' });
  Object.assign(manual, { scheduleKind: 'relative', scheduleValue: '55' });
  const saved = new Set([undated.itemId, relative.itemId, fixed.itemId]), protectedIds = new Set([...saved, manual.itemId]);
  const before = programClone(draft);
  const first = apply(draft, f.dates, 'first', null, protectedIds, saved, true);
  for (const row of [undated, fixed, manual]) assert.deepEqual(first.draft.rows.find(x => x.itemId === row.itemId), row);
  assert.equal(first.draft.rows.find(x => x.itemId === ordinary.itemId)!.scheduleValue, '13');
  const none = apply(draft, f.dates, 'none', null, protectedIds, saved, true);
  assert.equal(none.draft.rows.find(x => x.itemId === relative.itemId)!.scheduleKind, 'undated');
  none.releasedSchedules.forEach(id => { saved.delete(id); protectedIds.delete(id); });
  const restored = apply(none.draft, f.dates, 'first', none.undo, protectedIds, saved, true);
  assert.equal(restored.draft.rows.find(x => x.itemId === relative.itemId)!.scheduleKind, 'relative');
  for (const row of [undated, fixed, manual]) assert.deepEqual(restored.draft.rows.find(x => x.itemId === row.itemId), row);
  assert.deepEqual(draft, before);
});

for (const problem of ['disagreement', 'missing', 'all-shifted', 'no-row-id'] as const) test(`uncertain ${problem}: new rows undated, saved rows and private raw unchanged`, () => {
  const f = fixture(), initial = apply(pick(f.draft, ['02', '08']), f.dates, 'first', null);
  const saved = programPublicationSavedSchedules(initial.draft.rows);
  const source = programPublicationSavedSourceDates(initial.draft, f.data.spaces[f.actor].text);
  const added = pick(initial.draft, ['02', '08', '15']), dates = new Map(f.dates);
  const one = added.rows.find(row => row.title === '일 02')!, two = added.rows.find(row => row.title === '일 08')!;
  if (problem === 'disagreement') two.scheduleValue = '5';
  if (problem === 'missing') dates.delete(one.rowId!);
  if (problem === 'no-row-id') one.rowId = null;
  if (problem === 'all-shifted') { dates.set(one.rowId!, '2026-11-03'); dates.set(two.rowId!, '2026-11-09'); }
  const snapshot = programClone(added), result = apply(added, dates, 'first', null, saved, saved, false, source);
  assert(result.issue); assert.equal(result.draft.rows.find(row => row.title === '일 15')!.scheduleKind, 'undated');
  assert.deepEqual(result.draft.rows.filter(row => saved.has(row.itemId)), snapshot.rows.filter(row => saved.has(row.itemId)));
  assert.deepEqual(added, snapshot);
  const explicit = apply(added, dates, 'last', null, saved, saved, true, source);
  if (problem === 'missing' || problem === 'no-row-id') { assert(explicit.issue); assert.deepEqual(explicit.draft, added); }
  else { assert.equal(explicit.issue, null); assert.equal(explicit.draft.rows.find(row => row.title === '일 15')!.scheduleValue, '0'); }
});

test('lost source after a previous automatic conversion removes only the new automatic offset', () => {
  const f = fixture(), initial = apply(pick(f.draft, ['02', '08']), f.dates, 'first', null);
  const saved = programPublicationSavedSchedules(initial.draft.rows);
  const added = apply(pick(initial.draft, ['02', '08', '15']), f.dates, 'first', null, saved, saved);
  assert.equal(added.draft.rows.find(row => row.title === '일 15')!.scheduleValue, '13');
  const dates = new Map(f.dates); dates.delete(initial.draft.rows.find(row => row.title === '일 02')!.rowId!);
  const stopped = apply(added.draft, dates, 'first', added.undo, saved, saved);
  assert(stopped.issue); assert.equal(stopped.draft.rows.find(row => row.title === '일 15')!.scheduleKind, 'undated');
  assert.deepEqual(stopped.draft.rows.filter(row => saved.has(row.itemId)), initial.draft.rows.filter(row => saved.has(row.itemId)));
});
