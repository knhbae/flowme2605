import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, programClone, type ProgramData, type ProgramPublicItem, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData, validateProgramEnvelope } from './program-data';
import { createProgramController } from './controller';
import { loadProgramStore } from './program-store';
import { applyProgramCopyKindChange, applyProgramCopyVersion, createProgramDocument, importProgramPublicVersion, linkProgramTask,
  previewProgramCopyKindChange, recordProgramTaskProgress, updateProgramTask, setProgramCopySeriesStart } from './private-space';
import { programRecurringScheduleFromDraft } from './public-recurrence-contract';
import { inspectProgramPublicCopyRecurrence, programPublicCopyExecutionRef, readProgramPublicCopyRecurrenceSource } from './public-copy-recurrence';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from './recurrence-state';
import { readProgramOccurrenceRecovery } from './recurrence-recovery';
import { readProgramPublicCopyRecoveryLocation } from './public-copy-recovery-location';
import { programReferenceExecutionAccess } from './reference-execution-guard';
import { textWorkspaceModel as M } from './text-workspace';

const actorId = 'local-user', at = '2026-12-01T00:00:00.000Z';
const base = (data: ProgramData, requestId: string) => ({ actorId, requestId, expectedSpace: data.spaces[actorId] });
function ok<T>(result: ProgramTransition<T>) { assert(result.ok, result.ok ? '' : result.reason); assert(validateProgramData(result.data)); return result; }
function fixture(recurring = false) {
  let data = createProgramData();
  const series = programRecurringScheduleFromDraft({ version: 1, raw: '매주 화, 목', end: '8회', startKind: 'fixed', startValue: '2026-12-01', time: '07:00', timeZone: 'Asia/Seoul' }); assert(series);
  const ordinary: ProgramPublicItem['schedule'] = { kind: 'fixed', date: '2026-12-02' };
  const item: ProgramPublicItem = { id: 'same-item', title: '준비 운동', description: '공통 원문 설명', completionCriteria: '원래 마무리', sourceUrl: null,
    schedule: recurring ? series : ordinary, subchecks: [{ id: 'child', title: '자세 확인' }] };
  data.public.flows.push({ id: 'kind-flow', ownerId: 'creator-minji', currentVersionId: 'kind-v1', category: '운동', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'kind-v1', flowId: 'kind-flow', number: 1, parentVersionId: null, title: '형태 전환 계약 fixture', summary: '실제 사용자 게시 아님', items: [item],
    source: { kind: 'simulated-example', label: '계약 예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: at });
  const doc = ok(createProgramDocument(data, { ...base(data, 'doc'), title: '개인 연결', raw: 'PRIVATE-UNRELATED\n- [ ] 다른 예약' })); data = doc.data;
  const imported = ok(importProgramPublicVersion(data, { ...base(data, 'import'), versionId: 'kind-v1', itemIds: [item.id], anchor: null, targetDocumentId: doc.result })); data = imported.data;
  return { data, copyId: imported.result, documentId: doc.result, itemId: item.id, series, ordinary };
}
function publish(f: ReturnType<typeof fixture>, data: ProgramData, schedule: ProgramPublicItem['schedule'], patch: Partial<ProgramPublicItem> = {}) {
  const next = programClone(data), versions = next.public.versions.filter(version => version.flowId === 'kind-flow'), previous = versions.at(-1)!;
  const versionId = `kind-v${versions.length + 1}`;
  next.public.versions.push({ ...programClone(previous), id: versionId, parentVersionId: previous.id, number: versions.length + 1, items: [{ ...programClone(previous.items[0]), ...patch, schedule }] });
  next.public.flows.find(flow => flow.id === 'kind-flow')!.currentVersionId = versionId; assert(validateProgramData(next)); return { data: next, versionId };
}
function preview(f: ReturnType<typeof fixture>, data: ProgramData, versionId: string) { return ok(previewProgramCopyKindChange(data, { actorId, copyId: f.copyId, itemId: f.itemId, versionId })); }
function change(f: ReturnType<typeof fixture>, data: ProgramData, versionId: string, requestId: string) {
  return ok(applyProgramCopyKindChange(data, { ...base(data, requestId), confirmed: true, at, preview: preview(f, data, versionId).result }));
}
const copyOf = (f: ReturnType<typeof fixture>, data: ProgramData) => data.spaces[actorId].copies.find(copy => copy.id === f.copyId)!;

test('PCK explicit ordinary→recurring→ordinary→recurring keeps stable separate identities and untouched public bytes', () => {
  const f = fixture(), original = JSON.stringify(f.data), ordinaryId = copyOf(f, f.data).itemLines[f.itemId];
  const v2 = publish(f, f.data, f.series), readOnly = JSON.stringify(v2.data), planned = preview(f, v2.data, v2.versionId);
  assert.equal(planned.changed, false); assert.equal(JSON.stringify(v2.data), readOnly); assert.equal(planned.result.direction, 'ordinary-to-recurring');
  const first = change(f, v2.data, v2.versionId, 'first'), firstCopy = copyOf(f, first.data), seriesId = firstCopy.itemLines[f.itemId];
  assert.notEqual(seriesId, ordinaryId); assert.equal(firstCopy.kindHandoffs?.items[f.itemId].ordinary.lineId, ordinaryId);
  assert.equal(programReferenceExecutionAccess(first.data.spaces[actorId], ordinaryId).kind, 'retention');
  assert.deepEqual(first.data.public, v2.data.public); assert.equal(JSON.stringify(f.data), original);
  const source = readProgramPublicCopyRecurrenceSource(first.data.spaces[actorId], first.data.public, f.copyId); assert(source.ok);
  const expanded = inspectProgramPublicCopyRecurrence(source.source); assert(expanded.ok); assert.equal(expanded.rows.length, 8);
  const v3 = publish(f, first.data, f.ordinary), second = change(f, v3.data, v3.versionId, 'second');
  assert.equal(copyOf(f, second.data).itemLines[f.itemId], ordinaryId); assert.equal(programReferenceExecutionAccess(second.data.spaces[actorId], ordinaryId).kind, 'active');
  const v4 = publish(f, second.data, f.series), third = change(f, v4.data, v4.versionId, 'third');
  assert.equal(copyOf(f, third.data).itemLines[f.itemId], seriesId); assert.equal(copyOf(f, third.data).kindHandoffs?.entries.length, 3);
  assert.deepEqual(third.data.public, v4.data.public);
});

test('PCK private parent and child progress/date/note/time/references survive a form round trip', () => {
  const f = fixture(); let data = f.data;
  const copy = copyOf(f, data), taskId = copy.itemLines[f.itemId], childId = copy.subcheckLines[f.itemId].child;
  data = ok(updateProgramTask(data, { ...base(data, 'private'), taskId, patch: { date: '2026-12-09', note: 'PRIVATE-NOTE', time: '10:15', title: '내 준비 운동' } })).data;
  data = ok(recordProgramTaskProgress(data, { ...base(data, 'progress'), taskId, date: '2026-12-01', percent: 45 })).data;
  data = ok(recordProgramTaskProgress(data, { ...base(data, 'child-progress'), taskId: childId, date: '2026-12-01', percent: 100 })).data;
  const secondDocument = ok(createProgramDocument(data, { ...base(data, 'second-doc'), title: '두 번째 개인 연결' })); data = secondDocument.data;
  data = ok(linkProgramTask(data, { ...base(data, 'second-ref'), taskId, documentId: secondDocument.result })).data;
  const records = programClone(data.spaces[actorId].text.progressRecords), bindings = programClone(data.spaces[actorId].text.bindings);
  const personal = M.tasks(data.spaces[actorId].text).find(task => task.id === taskId && task.isCanonical)!;
  const v2 = publish(f, data, f.series), planned = preview(f, v2.data, v2.versionId);
  assert.equal(planned.result.ordinary.references, 2); assert.equal(planned.result.ordinary.progressRecords, 2); assert.equal(planned.result.ordinary.childTasks, 1);
  const first = change(f, v2.data, v2.versionId, 'form-one').data, v3 = publish(f, first, f.ordinary), second = change(f, v3.data, v3.versionId, 'form-two').data;
  assert.deepEqual(second.spaces[actorId].text.progressRecords, records); assert.deepEqual(second.spaces[actorId].text.bindings, bindings);
  const restored = M.tasks(second.spaces[actorId].text).find(task => task.id === taskId && task.isCanonical)!;
  for (const field of ['date', 'title', 'note', 'time', 'done'] as const) assert.deepEqual(restored[field], personal[field], field);
  assert.equal(copyOf(f, second).subcheckLines[f.itemId].child, childId);
});

test('PCK series→ordinary keeps the old occurrence and exact series reference recovery, not a new completion', () => {
  const f = fixture(true), flowRef = programPublicCopyExecutionRef(f.copyId);
  const read = readProgramExecutionOccurrences(f.data, { actorId, flowRef, localToday: '2026-12-01' }); assert(read.ok);
  const identity = read.rows[0].identity;
  const recorded = ok(updateProgramOccurrenceExecution(f.data, { actorId, flowRef, localToday: '2026-12-01', identity, expected: null,
    changes: { completion: { status: 'completed', completedAt: at }, schedule: { mode: 'fixed_date', date: '2026-12-03' } } })).data;
  const v2 = publish(f, recorded, f.ordinary), result = change(f, v2.data, v2.versionId, 'to-task').data;
  assert.deepEqual(result.spaces[actorId].recurrenceExecution, recorded.spaces[actorId].recurrenceExecution);
  assert.equal(M.tasks(result.spaces[actorId].text).find(task => task.id === copyOf(f, result).itemLines[f.itemId])?.done, false);
  const location = readProgramPublicCopyRecoveryLocation(result.spaces[actorId], identity); assert(location);
  assert.equal(location.lineId, copyOf(f, f.data).itemLines[f.itemId]); assert(location.visibleDocumentIds.includes(f.documentId));
  assert.equal(location.documentId, result.spaces[actorId].retentionDocuments?.[copyOf(f, result).documentId]);
  const recoveries = readProgramOccurrenceRecovery(result, { actorId, localToday: '2026-12-01' }); assert.equal(recoveries.length, 1); assert.equal(recoveries[0].canReconnect, false);
});

test('PCK returning ordinary form retains common accepted fields instead of rolling them back', () => {
  const f = fixture(), v2 = publish(f, f.data, f.series), changed = change(f, v2.data, v2.versionId, 'to-series').data;
  const v3 = publish(f, changed, f.series, { description: '새로 수용한 설명', title: '새 원문 제목', subchecks: [{ id: 'child', title: '새 자세 확인' }, { id: 'new', title: '추가 확인' }] });
  const accepted = ok(applyProgramCopyVersion(v3.data, { ...base(v3.data, 'fields'), copyId: f.copyId, versionId: v3.versionId, expectedBaseVersionId: 'kind-v1', itemIds: [f.itemId], fields: ['description', 'title', 'subchecks'] })).data;
  const v4 = publish(f, accepted, f.ordinary), result = change(f, v4.data, v4.versionId, 'to-ordinary').data, copy = copyOf(f, result);
  assert.equal(copy.appliedFields[f.itemId].description, v3.versionId); assert.equal(copy.appliedFields[f.itemId].title, v3.versionId);
  assert.equal(M.tasks(result.spaces[actorId].text).find(task => task.id === copy.itemLines[f.itemId])?.title, '새 원문 제목');
  assert(M.getDocument(result.spaces[actorId].text, copy.documentId)!.lines.some(line => line.text.includes('새로 수용한 설명')));
  assert(copy.subcheckLines[f.itemId].new);
});

test('PCK unconfirmed forged stale foreign and same-kind requests do not mutate the input', () => {
  const f = fixture(), v2 = publish(f, f.data, f.series), p = preview(f, v2.data, v2.versionId).result, before = JSON.stringify(v2.data);
  const input = { ...base(v2.data, 'request'), confirmed: true as const, at, preview: p };
  for (const altered of [{ ...input, confirmed: false }, { ...input, at: '2026-02-31T00:00:00.000Z' }, { ...input, preview: { ...p, recurrenceRecords: 99 } },
    { ...input, preview: { ...p, itemId: 'another' } }, { ...input, actorId: 'creator-minji' }, { ...input, expectedSpace: { ...f.data.spaces[actorId], position: { ...f.data.spaces[actorId].position, scrollTop: 1 } } }]) {
    const result = applyProgramCopyKindChange(v2.data, altered as typeof input); assert(!result.ok); assert.equal(JSON.stringify(v2.data), before);
  }
  assert(!previewProgramCopyKindChange(f.data, { actorId, copyId: f.copyId, itemId: f.itemId, versionId: 'kind-v1' }).ok);
  const result = ok(applyProgramCopyKindChange(v2.data, input)), repeat = ok(applyProgramCopyKindChange(result.data, input));
  assert.equal(repeat.changed, false); assert.equal(repeat.data, result.data);
});

test('PCK damaged identity/version/shape/retention/receipt payloads fail closed', () => {
  const f = fixture(), v2 = publish(f, f.data, f.series), data = change(f, v2.data, v2.versionId, 'valid-kind').data;
  const corruptions: ((data: ProgramData) => void)[] = [
    data => { copyOf(f, data).kindHandoffs!.version = 9 as 1; },
    data => { copyOf(f, data).kindHandoffs!.items[f.itemId].ordinary.lineId = copyOf(f, data).itemLines[f.itemId]; },
    data => { copyOf(f, data).kindHandoffs!.items[f.itemId].recurring.fieldVersions.schedule = 'kind-v1'; },
    data => { copyOf(f, data).kindHandoffs!.entries[0].toVersionId = 'kind-v1'; },
    data => { copyOf(f, data).kindHandoffs!.entries.push(programClone(copyOf(f, data).kindHandoffs!.entries[0])); },
    data => { delete data.spaces[actorId].retentionDocuments; },
    data => { (copyOf(f, data).kindHandoffs as unknown as Record<string, unknown>).extra = true; },
  ];
  for (const corrupt of corruptions) { const candidate = programClone(data); corrupt(candidate); assert.equal(validateProgramData(candidate), false); }
});

test('PCK a previously chosen undated series start survives a kind round trip without read-time writes', () => {
  const f = fixture(true), pending = programRecurringScheduleFromDraft({ version: 1, raw: '매주 화, 목', end: '8회', startKind: 'undated', startValue: '', time: '', timeZone: '' }); assert(pending);
  const v2 = publish(f, f.data, pending), accepted = ok(applyProgramCopyVersion(v2.data, { ...base(v2.data, 'undated'), copyId: f.copyId, versionId: v2.versionId, expectedBaseVersionId: 'kind-v1', itemIds: [f.itemId], fields: ['schedule'] })).data;
  const started = ok(setProgramCopySeriesStart(accepted, { ...base(accepted, 'start'), copyId: f.copyId, itemId: f.itemId, start: '2026-12-08' })).data;
  const v3 = publish(f, started, f.ordinary), ordinary = change(f, v3.data, v3.versionId, 'ordinary').data;
  assert.equal(copyOf(f, ordinary).recurrence?.starts?.[f.itemId], undefined);
  const v4 = publish(f, ordinary, pending), restored = change(f, v4.data, v4.versionId, 'series').data;
  assert.equal(copyOf(f, restored).recurrence?.starts?.[f.itemId], '2026-12-08');
});

for (const recurring of [false, true]) test(`PCK ${recurring ? 'series-to-task' : 'task-to-series'} controller quota retry receipt Undo Redo reload preserves exact operating values`, async () => {
  const f = fixture(recurring), v2 = publish(f, f.data, recurring ? f.ordinary : f.series), data = v2.data;
  const protectedValue = '{ "preserve": "원문\\r\\n" }', values = new Map([['flow:operating', protectedValue]]), attempts: string[] = [], committed: string[] = [];
  let quota = true;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => {
    attempts.push(key); assert.equal(key, PROGRAM_STATE_KEY); if (quota) throw Error('quota'); values.set(key, value); committed.push(key);
  }, removeItem: () => assert.fail('remove forbidden'), clear: () => assert.fail('clear forbidden') };
  const exclusive = async <T,>(work: () => T | Promise<T>) => work(), controller = createProgramController({ initialData: data, storage, exclusive }); assert(controller.ok);
  const input = { ...base(data, 'persist-kind'), confirmed: true as const, at, preview: preview(f, data, v2.versionId).result };
  const write = (current: ProgramData) => applyProgramCopyKindChange(current, input), before = controller.snapshot();
  assert(!(await controller.mutate('전환', write, { actorId })).ok); assert.deepEqual(controller.snapshot().envelope, before.envelope); assert.equal(committed.length, 0);
  quota = false; assert((await controller.mutate('전환', write, { actorId })).ok); const applied = controller.snapshot(); assert.equal(committed.length, 1);
  assert((await controller.mutate('같은 전환', write, { actorId })).ok); assert.equal(committed.length, 1);
  assert((await controller.undo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], data.spaces[actorId]);
  assert((await controller.redo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], applied.envelope.data.spaces[actorId]);
  assert.equal(loadProgramStore(storage, validateProgramEnvelope).kind, 'ready');
  const reload = createProgramController({ initialData: data, storage, exclusive }); assert(reload.ok); assert.deepEqual(reload.snapshot(), controller.snapshot());
  const corrupt = JSON.parse(values.get(PROGRAM_STATE_KEY)!); corrupt.data.spaces[actorId].copies.find((copy: { id: string }) => copy.id === f.copyId).kindHandoffs.version = 99;
  values.set(PROGRAM_STATE_KEY, JSON.stringify(corrupt)); assert.equal(loadProgramStore(storage, validateProgramEnvelope).kind, 'corrupt');
  assert.equal(values.get('flow:operating'), protectedValue); assert(attempts.every(key => key === PROGRAM_STATE_KEY));
});

test('PCK restoring an undated ordinary form preserves its explicit null inheritance baseline', () => {
  const f = fixture();
  f.data.public.versions.find(version => version.id === 'kind-v1')!.items[0].schedule = { kind: 'undated' };
  const copy = copyOf(f, f.data), doc = M.getDocument(f.data.spaces[actorId].text, copy.documentId)!;
  doc.lines.find(line => line.id === `${copy.itemLines[f.itemId]}:date`)!.text = '  - 날짜: 미정';
  doc.lines.find(line => line.id === `${copy.itemLines[f.itemId]}:schedule:0`)!.text = '  원문 일정: 날짜 미정';
  copy.inheritedDates[f.itemId] = null; assert(validateProgramData(f.data));
  const v2 = publish(f, f.data, f.series), series = change(f, v2.data, v2.versionId, 'to-series-null').data;
  const v3 = publish(f, series, f.ordinary), restored = change(f, v3.data, v3.versionId, 'restore-null').data;
  assert.equal(copyOf(f, restored).inheritedDates[f.itemId], null);
  assert.equal(M.tasks(restored.spaces[actorId].text).find(task => task.id === copy.itemLines[f.itemId])?.date, null);
});
