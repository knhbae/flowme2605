import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramPublicationDraft } from './contract';
import { createProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramPublicationDraft, publishProgramDocument, saveProgramPublicationDraft } from './publication-editor';
import { programPublicationRowDates } from './publication-anchor';
import { importProgramPublicVersion } from './private-space';
import { applyProgramPublicationStepDates as apply, programPublicationSavedSchedules, programPublicationSavedSourceDates } from './publication-steps';

const NOW = '2026-11-09T08:00:00.000Z';
function fixture(position: 'first' | 'last' = 'last') {
  const data = createProgramData(), actor = data.activeActorId;
  let text = data.spaces[actor].text;
  function add(title: string, raw: string) {
    text = M.addDocument(text, { title });
    const id = text.documents.at(-1)!.id;
    const edited = M.editTextResult(text, id, raw, { folderText: true });
    assert.equal(edited.reason, null); text = edited.state;
    return id;
  }
  const sourceRaw = ['01', '02', '08', '13', '15'].map(day => `[2026-11-${day}]\n- [ ] 일 ${day}`).join('\n');
  const otherRaw = '[2026-10-01]\n- [ ] 공개 창을 열지 않은 다른 문서의 일';
  const beforeId = position === 'last' ? add('다른 문서', otherRaw) : null;
  const documentId = add('다중 문서 공개 원문', sourceRaw);
  const otherId = beforeId ?? add('다른 문서', otherRaw);
  assert(M.validate(text)); assert.equal(text.documents.length, 2);
  data.spaces[actor].text = text;
  // Only the target enters the publisher; the other document has no draft or publication.
  assert.equal(data.spaces[actor].publicationDrafts.length, 0);
  const draft = createProgramPublicationDraft(data, documentId, NOW)!;
  assert(draft); draft.title = '다중 문서 기준일';
  return { data, actor, text, documentId, otherId, draft, dates: programPublicationRowDates(text, documentId), sourceRaw, otherRaw };
}
const pick = (draft: ProgramPublicationDraft, days: string[]) => ({ ...draft, rows: draft.rows.map(row => ({ ...row, selected: days.includes(row.title.slice(2)) })) });
const offsets = (draft: ProgramPublicationDraft) => Object.fromEntries(draft.rows.filter(row => row.selected).map(row => [row.title, row.scheduleKind === 'relative' ? Number(row.scheduleValue) : row.scheduleKind]));

for (const position of ['first', 'last'] as const) {
  test(`saved source dates retain a valid whole workspace when the source is ${position}`, () => {
    const f = fixture(position), before = programClone(f.text), draftBefore = programClone(f.draft);
    assert(f.dates.size > 0);
    assert.deepEqual(programPublicationSavedSourceDates(f.draft, f.text), f.dates);
    assert.deepEqual(f.text, before); assert.deepEqual(f.draft, draftBefore);
    assert.equal(M.raw(M.getDocument(f.text, f.otherId)), f.otherRaw);
  });
  for (const path of ['reopen', 'new-version'] as const) {
    for (const scenario of ['A-last', 'B-earlier'] as const) test(`${position} multi-document ${path} ${scenario}: added dates agree in published items`, () => {
      const f = fixture(position), selected = scenario === 'A-last' ? ['02', '08', '13'] : ['02', '08'];
      const initial = apply(pick(f.draft, selected), f.dates, scenario === 'A-last' ? 'last' : 'first', null);
      const stored = saveProgramPublicationDraft(f.data, f.actor, initial.draft, null); assert(stored.ok);
      const firstPublic = path === 'new-version' ? publishProgramDocument(stored.data, f.actor, initial.draft, NOW) : null;
      if (firstPublic) assert(firstPublic.ok);
      const current = firstPublic?.ok ? firstPublic.data : stored.data, privateBefore = programClone(current.spaces[f.actor].text);
      const reopened = createProgramPublicationDraft(current, f.documentId, NOW)!;
      const saved = programPublicationSavedSchedules(reopened.rows);
      const source = programPublicationSavedSourceDates(reopened, current.spaces[f.actor].text);
      const added = pick(reopened, [...selected, scenario === 'A-last' ? '15' : '01']);
      const result = apply(added, f.dates, 'first', null, saved, saved, false, source);
      const expected = scenario === 'A-last' ? { '일 02': -11, '일 08': -5, '일 13': 0, '일 15': 2 } : { '일 01': -1, '일 02': 0, '일 08': 6 };
      assert.equal(result.issue, null); assert.deepEqual(offsets(result.draft), expected);
      assert.deepEqual(result.draft.rows.filter(row => saved.has(row.itemId)), added.rows.filter(row => saved.has(row.itemId)));
      const expectedDraft = current.spaces[f.actor].publicationDrafts.find(row => row.documentId === f.documentId) ?? null;
      const updated = saveProgramPublicationDraft(current, f.actor, result.draft, expectedDraft); assert(updated.ok);
      const published = publishProgramDocument(updated.data, f.actor, result.draft, NOW); assert(published.ok);
      const version = published.data.public.versions.find(row => row.id === published.result)!;
      assert.deepEqual(Object.fromEntries(version.items.map(item => [item.title, item.schedule.kind === 'relative' ? item.schedule.days : item.schedule.kind])), expected);
      if (firstPublic?.ok) assert.deepEqual(published.data.public.versions[0], firstPublic.data.public.versions[0]);
      assert.deepEqual(published.data.spaces[f.actor].text, privateBefore);
      assert.equal(M.raw(M.getDocument(published.data.spaces[f.actor].text, f.otherId)), f.otherRaw);
      assert(!published.data.spaces[f.actor].publications.some(row => row.documentId === f.otherId));
    });
  }
}

for (const problem of ['conflicting-anchors', 'missing-current-source-date'] as const) {
  test(`multi-document ${problem} still holds new dates and preserves saved rows`, () => {
    const f = fixture(), initial = apply(pick(f.draft, ['02', '08']), f.dates, 'first', null);
    const stored = saveProgramPublicationDraft(f.data, f.actor, initial.draft, null); assert(stored.ok);
    const reopened = createProgramPublicationDraft(stored.data, f.documentId, NOW)!;
    const saved = programPublicationSavedSchedules(reopened.rows), added = pick(reopened, ['02', '08', '15']);
    let currentText = f.text;
    if (problem === 'conflicting-anchors') added.rows.find(row => row.title === '일 08')!.scheduleValue = '9';
    else currentText = M.updateTask(currentText, added.rows.find(row => row.title === '일 02')!.rowId!, { date: null });
    assert(M.validate(currentText));
    const currentDates = programPublicationRowDates(currentText, f.documentId);
    const source = programPublicationSavedSourceDates(reopened, currentText);
    assert.equal(source.get(added.rows.find(row => row.title === '일 02')!.rowId!), '2026-11-02');
    const before = programClone(added), textBefore = programClone(currentText);
    const result = apply(added, currentDates, 'first', null, saved, saved, false, source);
    assert(result.issue); assert.equal(result.draft.rows.find(row => row.title === '일 15')!.scheduleKind, 'undated');
    assert.deepEqual(result.draft.rows.filter(row => saved.has(row.itemId)), before.rows.filter(row => saved.has(row.itemId)));
    const explicit = apply(added, currentDates, 'last', null, saved, saved, true, source);
    if (problem === 'missing-current-source-date') { assert(explicit.issue); assert.deepEqual(explicit.draft, added); }
    else { assert.equal(explicit.issue, null); assert.deepEqual(offsets(explicit.draft), { '일 02': -13, '일 08': -7, '일 15': 0 }); }
    assert.deepEqual(added, before); assert.deepEqual(currentText, textBefore);
  });
}

test('multi-document explicit mode transitions rebase stored relative schedules through publication', () => {
  const f = fixture(), initial = apply(pick(f.draft, ['02', '08', '13']), f.dates, 'last', null);
  const stored = saveProgramPublicationDraft(f.data, f.actor, initial.draft, null); assert(stored.ok);
  const reopened = createProgramPublicationDraft(stored.data, f.documentId, NOW)!;
  const saved = programPublicationSavedSchedules(reopened.rows), source = programPublicationSavedSourceDates(reopened, f.text);
  const added = pick(reopened, ['02', '08', '13', '15']);
  const first = apply(added, f.dates, 'first', null, saved, saved, true, source);
  assert.deepEqual(offsets(first.draft), { '일 02': 0, '일 08': 6, '일 13': 11, '일 15': 13 });
  first.releasedSchedules.forEach(id => saved.delete(id));
  const last = apply(first.draft, f.dates, 'last', first.undo, saved, saved, true, source);
  assert.deepEqual(offsets(last.draft), { '일 02': -13, '일 08': -7, '일 13': -2, '일 15': 0 });
  const none = apply(last.draft, f.dates, 'none', last.undo, saved, saved, true, source);
  assert(none.draft.rows.filter(row => row.selected).every(row => row.scheduleKind === 'undated'));
  const restored = apply(none.draft, f.dates, 'first', none.undo, saved, saved, true, source);
  assert.deepEqual(offsets(restored.draft), offsets(first.draft));
  const updated = saveProgramPublicationDraft(stored.data, f.actor, restored.draft, reopened); assert(updated.ok);
  const published = publishProgramDocument(updated.data, f.actor, restored.draft, NOW); assert(published.ok);
  assert.deepEqual(Object.fromEntries(published.data.public.versions[0].items.map(item => [item.title, item.schedule.kind === 'relative' ? item.schedule.days : item.schedule.kind])), offsets(first.draft));
  assert.deepEqual(published.data.spaces[f.actor].text, f.text);
});

test('saved source dates for an imported private Flow preserve other document owners', () => {
  const f = fixture(), initial = apply(pick(f.draft, ['02', '08', '13']), f.dates, 'first', null);
  const stored = saveProgramPublicationDraft(f.data, f.actor, initial.draft, null); assert(stored.ok);
  const published = publishProgramDocument(stored.data, f.actor, initial.draft, NOW); assert(published.ok);
  const version = published.data.public.versions.find(row => row.id === published.result)!;
  const imported = importProgramPublicVersion(published.data, { actorId: f.actor, requestId: 'multi-document-flow-copy', expectedSpace: published.data.spaces[f.actor], versionId: version.id, itemIds: version.items.map(item => item.id), anchor: '2026-11-02' });
  assert(imported.ok);
  const copy = imported.data.spaces[f.actor].copies.find(row => row.id === imported.result)!;
  const text = imported.data.spaces[f.actor].text, copyDraft = createProgramPublicationDraft(imported.data, copy.documentId, NOW)!;
  assert(copyDraft); assert(text.flows.some(flow => flow.id === copy.documentId)); assert(M.validate(text));
  const dates = programPublicationRowDates(text, copy.documentId), before = programClone(text);
  assert.equal(dates.size, 3); assert.deepEqual(programPublicationSavedSourceDates(copyDraft, text), dates);
  assert.deepEqual(text, before);
});

test('an absent source document is not reintroduced from a saved fingerprint', () => {
  const f = fixture(), fresh = createProgramData();
  const otherText = M.addDocument(fresh.spaces[fresh.activeActorId].text, { title: '원문이 없는 워크스페이스' });
  assert(M.validate(otherText)); assert.equal(M.getDocument(otherText, f.documentId), null);
  const before = programClone(otherText);
  assert.equal(programPublicationSavedSourceDates(f.draft, otherText).size, 0);
  assert.deepEqual(otherText, before);
});
