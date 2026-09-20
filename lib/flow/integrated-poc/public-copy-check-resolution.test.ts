import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, programClone, type ProgramCopyCheckChoice, type ProgramData, type ProgramPublicItem, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData, validateProgramEnvelope } from './program-data';
import { applyProgramCopyVersion, compareProgramCopyVersion, importProgramPublicVersion, previewProgramCopyCheckResolution } from './private-space';
import { createProgramController } from './controller';
import { loadProgramStore } from './program-store';
import { readProgramPublicCopyRecurrenceSource } from './public-copy-recurrence';
import { inspectProgramPrivateOutput, makeProgramPrivateOutput } from './private-output';
import { resolveProgramExecutionSource } from './execution-source';
import { programRecurringScheduleFromDraft } from './public-recurrence-contract';
import { textWorkspaceModel as M } from './text-workspace';

const actorId = 'local-user', at = '2026-12-01T00:00:00.000Z';
const base = (data: ProgramData, requestId: string) => ({ actorId, requestId, expectedSpace: data.spaces[actorId] });
function ok<T>(r: ProgramTransition<T>) { assert(r.ok, r.ok ? '' : r.reason); assert(validateProgramData(r.data)); return r; }
function fixture(recurring: boolean) {
  let data = createProgramData();
  const series = programRecurringScheduleFromDraft({ version: 1, raw: '매주 화, 목', end: '8회', startKind: 'fixed', startValue: '2026-12-01', time: '07:00', timeZone: 'Asia/Seoul' }); assert(series);
  const item: ProgramPublicItem = { id: 'item', title: '준비 운동', description: '보존할 원문', completionCriteria: '', sourceUrl: null,
    schedule: recurring ? series : { kind: 'fixed', date: '2026-12-01' }, subchecks: [{ id: 'keep', title: '처음 확인' }, { id: 'back', title: '원래 마무리' }] };
  data.public.flows.push({ id: 'check-flow', ownerId: 'creator-minji', currentVersionId: 'checks-v1', category: '운동', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'checks-v1', flowId: 'check-flow', number: 1, parentVersionId: null, title: '재추가 확인 계약 예시', summary: '실제 사용자 공개 아님', items: [item],
    source: { kind: 'simulated-example', label: '계약 fixture', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: at });
  const imported = ok(importProgramPublicVersion(data, { ...base(data, 'import'), versionId: 'checks-v1', itemIds: ['item'], anchor: null })); data = imported.data;
  const copyId = imported.result;
  const publish = (current: ProgramData, subchecks: ProgramPublicItem['subchecks']) => {
    const next = programClone(current), previous = next.public.versions.filter(v => v.flowId === 'check-flow').at(-1)!;
    const versionId = `checks-v${previous.number + 1}`;
    next.public.versions.push({ ...programClone(previous), id: versionId, number: previous.number + 1, parentVersionId: previous.id, items: [{ ...programClone(previous.items[0]), subchecks }] });
    next.public.flows.find(f => f.id === 'check-flow')!.currentVersionId = versionId; assert(validateProgramData(next)); return { data: next, versionId };
  };
  const removed = publish(data, [item.subchecks[0]]);
  data = ok(applyProgramCopyVersion(removed.data, { ...base(removed.data, 'remove'), copyId, versionId: removed.versionId, expectedBaseVersionId: 'checks-v1', itemIds: ['item'], fields: ['subchecks'] })).data;
  const copy = data.spaces[actorId].copies.find(c => c.id === copyId)!, childLineId = copy.subcheckLines.item.back, doc = M.getDocument(data.spaces[actorId].text, copy.documentId)!;
  doc.lines.find(line => line.id === childLineId)!.text = recurring ? '  반복 확인: 내가 보관한 마무리' : '  - [x] 내가 보관한 마무리';
  assert(validateProgramData(data));
  const returned = publish(data, [{ id: 'keep', title: '처음 확인' }, { id: 'back', title: '새 원문 마무리' }]);
  return { ...returned, copyId, childLineId, documentId: copy.documentId, publish, recurring };
}

for (const recurring of [false, true]) test(`PCR ${recurring ? 'series' : 'ordinary'} retired private title cannot be silently overwritten by normal source adoption`, () => {
  const f = fixture(recurring), before = JSON.stringify(f.data);
  const compared = ok(compareProgramCopyVersion(f.data, { actorId, copyId: f.copyId, versionId: f.versionId }));
  assert.equal(compared.result.items[0].fields.find(field => field.field === 'subchecks')?.blockedReason, 'retired-check-review');
  const result = applyProgramCopyVersion(f.data, { ...base(f.data, 'unsafe-readd'), copyId: f.copyId, versionId: f.versionId, expectedBaseVersionId: 'checks-v1', itemIds: ['item'], fields: ['subchecks'] });
  assert(!result.ok); assert.equal(JSON.stringify(f.data), before);
});

function reviewed(f: ReturnType<typeof fixture>, current = f.data) {
  return ok(previewProgramCopyCheckResolution(current, { actorId, copyId: f.copyId, itemId: 'item', versionId: f.versionId })).result;
}
function resolved(f: ReturnType<typeof fixture>, choice: ProgramCopyCheckChoice, requestId = 'resolve') {
  return { ...base(f.data, requestId), copyId: f.copyId, versionId: f.versionId, expectedBaseVersionId: 'checks-v1', itemIds: ['item'], fields: ['subchecks'] as const,
    checkResolution: { confirmed: true as const, at, preview: reviewed(f), choices: { back: choice } } };
}
function applyResolved(f: ReturnType<typeof fixture>, choice: ProgramCopyCheckChoice, requestId = 'resolve') {
  const input = resolved(f, choice, requestId);
  return applyProgramCopyVersion(f.data, { ...input, fields: [...input.fields] });
}
for (const recurring of [false, true]) test(`PCR ${recurring ? 'series' : 'ordinary'} restores a cursor parked on the removed marker to its exact retained check`, () => {
  const f = fixture(recurring), space = f.data.spaces[actorId], doc = M.getDocument(space.text, f.documentId)!;
  const marker = `${f.childLineId}:source-removed`, index = doc.lines.findIndex(l => l.id === marker), start = doc.lines.slice(0, index).reduce((n, l) => n + l.text.length + 1, 0);
  space.position = { documentId: f.documentId, lineId: marker, start, end: start, scrollTop: 190 };
  assert(validateProgramData(f.data)); const result = ok(applyResolved(f, 'keep-private'));
  const next = result.data.spaces[actorId], after = M.getDocument(next.text, f.documentId)!, expected = after.lines.slice(0, after.lines.findIndex(l => l.id === f.childLineId)).reduce((n, l) => n + l.text.length + 1, 0);
  assert.deepEqual(next.position, { documentId: f.documentId, lineId: f.childLineId, start: expected, end: expected, scrollTop: 190 });
  assert.equal(space.position.lineId, marker); assert.deepEqual(next.text.progressRecords, space.text.progressRecords);
});
for (const recurring of [false, true]) for (const choice of ['keep-private', 'accept-source'] as const) test(`PCR ${recurring ? 'series' : 'ordinary'} ${choice} restores same check and preserves immutable source plus old completion`, () => {
  const f = fixture(recurring), original = JSON.stringify(f.data), preview = reviewed(f);
  assert.equal(preview.checks.length, 1); assert.equal(preview.checks[0].previousTitle, '내가 보관한 마무리'); assert.equal(JSON.stringify(f.data), original);
  const result = ok(applyResolved(f, choice)), copy = result.data.spaces[actorId].copies.find(c => c.id === f.copyId)!, doc = M.getDocument(result.data.spaces[actorId].text, f.documentId)!;
  const expected = choice === 'keep-private' ? '내가 보관한 마무리' : '새 원문 마무리';
  assert.equal(copy.subcheckLines.item.back, f.childLineId); assert.equal(copy.appliedFields.item.subchecks, f.versionId);
  assert(!doc.lines.some(line => line.id === `${f.childLineId}:source-removed`)); assert(doc.lines.find(line => line.id === f.childLineId)!.text.includes(expected));
  assert.deepEqual(copy.checkResolutions?.entries[0].decisions, [{ childId: 'back', lineId: f.childLineId, previousTitle: '내가 보관한 마무리', incomingTitle: '새 원문 마무리', choice }]);
  assert.deepEqual(result.data.public, f.data.public); assert.deepEqual(result.data.spaces[actorId].text.progressRecords, f.data.spaces[actorId].text.progressRecords);
  if (recurring) {
    const read = readProgramPublicCopyRecurrenceSource(result.data.spaces[actorId], result.data.public, copy.id); assert(read.ok);
    assert.equal(read.source.items[0].item.subchecks.find(child => child.id === 'back')!.title, expected);
    assert.equal(result.data.public.versions.find(v => v.id === f.versionId)!.items[0].subchecks[1].title, '새 원문 마무리');
  } else assert.equal(M.parseDocument(doc, result.data.spaces[actorId].text).items.find(row => row.id === f.childLineId)!.done, true);
});

test('PCR unknown missing unconfirmed forged stale and cross-field choices never mutate the source', () => {
  const f = fixture(true), input = resolved(f, 'keep-private'), original = JSON.stringify(f.data);
  const mutations = [
    { ...input, checkResolution: { ...input.checkResolution, confirmed: false } },
    { ...input, checkResolution: { ...input.checkResolution, choices: {} } },
    { ...input, checkResolution: { ...input.checkResolution, choices: { back: 'guess' } } },
    { ...input, checkResolution: { ...input.checkResolution, choices: { back: 'keep-private', alien: 'accept-source' } } },
    { ...input, checkResolution: { ...input.checkResolution, preview: { ...input.checkResolution.preview, toVersionId: 'checks-v1' } } },
    { ...input, fields: ['description'] }, { ...input, expectedSpace: { ...input.expectedSpace, position: { view: 'activity' } } }, { ...input, actorId: 'creator-minji' },
  ];
  for (const mutation of mutations) assert(!applyProgramCopyVersion(f.data, mutation as unknown as Parameters<typeof applyProgramCopyVersion>[1]).ok);
  assert.equal(JSON.stringify(f.data), original);
});

test('PCR strict history rejects foreign source child row and invalid choices without read-time migration', () => {
  const f = fixture(true), data = ok(applyResolved(f, 'keep-private')).data;
  const damage = [
    (v: any) => { v.version = 2; }, (v: any) => { v.extra = true; }, (v: any) => { v.entries.push(programClone(v.entries[0])); },
    (v: any) => { v.entries[0].fromVersionId = 'checks-v1'; }, (v: any) => { v.entries[0].decisions[0].lineId = 'other'; },
    (v: any) => { v.entries[0].decisions[0].childId = 'other'; }, (v: any) => { v.entries[0].decisions[0].incomingTitle = 'forged'; },
    (v: any) => { v.entries[0].decisions[0].choice = 'guess'; }, (v: any) => { v.entries[0].decisions[0].previousTitle = ''; },
  ];
  for (const change of damage) { const copy = programClone(data); change(copy.spaces[actorId].copies.find(c => c.id === f.copyId)!.checkResolutions); assert(!validateProgramData(copy)); }
});

for (const recurring of [false, true]) test(`PCR ${recurring ? 'series' : 'ordinary'} one transaction quota retry duplicate Undo Redo reload stays in exact PoC namespace`, async () => {
  const f = fixture(recurring), input = resolved(f, 'keep-private'), protectedValue = '{ "private": "UNCHANGED\\r\\n" }';
  const values = new Map([['flow:operating', protectedValue]]), attempts: string[] = [], committed: string[] = []; let quota = true;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { attempts.push(key); assert.equal(key, PROGRAM_STATE_KEY); if (quota) throw Error('quota'); values.set(key, value); committed.push(key); }, removeItem: () => assert.fail('remove'), clear: () => assert.fail('clear') };
  const exclusive = async <T,>(work: () => T | Promise<T>) => work(), controller = createProgramController({ initialData: f.data, storage, exclusive }); assert(controller.ok);
  const write = (current: ProgramData) => applyProgramCopyVersion(current, { ...input, fields: [...input.fields] }), before = controller.snapshot();
  assert(!(await controller.mutate('체크 복원', write, { actorId })).ok); assert.equal(committed.length, 0); assert.deepEqual(controller.snapshot().envelope, before.envelope);
  quota = false; assert((await controller.mutate('체크 복원', write, { actorId })).ok); const after = controller.snapshot();
  assert((await controller.mutate('같은 요청', write, { actorId })).ok); assert.equal(committed.length, 1);
  assert((await controller.undo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces, f.data.spaces);
  assert((await controller.redo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces, after.envelope.data.spaces);
  assert.equal(loadProgramStore(storage, validateProgramEnvelope).kind, 'ready'); const reload = createProgramController({ initialData: f.data, storage, exclusive }); assert(reload.ok); assert.deepEqual(reload.snapshot(), controller.snapshot());
  assert.equal(values.get('flow:operating'), protectedValue); assert(attempts.every(key => key === PROGRAM_STATE_KEY));
});

test('PCR retained personal wording reaches shared recurrence context and actual TXT CSV ICS bytes without altering public facts', () => {
  const f = fixture(true), data = ok(applyResolved(f, 'keep-private')).data, before = JSON.stringify(data);
  const source = resolveProgramExecutionSource(data.spaces[actorId], JSON.stringify(['public-copy/1', f.copyId]), data.public); assert(source.ok && source.kind === 'public-copy');
  assert([...source.contexts.values()].some(context => context.attributes.subchecks?.some((child: { title: string }) => child.title === '내가 보관한 마무리')));
  const occurrenceRange = { from: '2026-12-01', to: '2026-12-31', includeUndated: false }, inspected = inspectProgramPrivateOutput(data, { actorId, documentId: f.documentId, occurrenceRange }); assert(inspected.ok);
  const occurrence = inspected.rows.find(row => row.kind === 'occurrence')!; assert(occurrence);
  assert(occurrence.subchecks.some(child => child.title === '내가 보관한 마무리'));
  for (const format of ['txt', 'csv', 'ics'] as const) {
    const output = makeProgramPrivateOutput(data, { actorId, documentId: f.documentId, mode: 'tasks', format, selectedItemIds: [occurrence.id], occurrenceRange }, at); assert(output.ok);
    assert(output.payload.includes('내가 보관한 마무리'), format);
  }
  assert.equal(data.public.versions.find(v => v.id === f.versionId)!.items[0].subchecks[1].title, '새 원문 마무리'); assert.equal(JSON.stringify(data), before);
});
