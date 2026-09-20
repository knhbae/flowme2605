import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, programClone, type ProgramCopyField, type ProgramData, type ProgramPublicItem, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramController } from './controller';
import { publishProgramFlow, type PublishProgramFlowInput } from './publication';
import { applyProgramCopyVersion, compareProgramCopyVersion, importProgramPublicVersion, recordProgramTaskProgress, updateProgramTask } from './private-space';
import { inspectProgramPrivateOutput, makeProgramPrivateOutput } from './private-output';
import { textWorkspaceModel as M } from './text-workspace';

const actorId = 'local-user', at = '2026-09-14T10:00:00.000Z';
const base = (data: ProgramData, requestId: string) => ({ actorId, requestId, expectedSpace: data.spaces[actorId] });
function ok<T>(result: ProgramTransition<T>) {
  assert(result.ok, result.ok ? '' : result.reason);
  assert(validateProgramData(result.data));
  return result;
}

// Authored simulation: every version/copy/edit below uses the supported writer.
// This does not represent an external creator's publication or observed use.
function authoredScenario() {
  const firstItem: ProgramPublicItem = {
    id: 'arrival', title: '숙소 체크인', description: '예약 내용을 확인한다', completionCriteria: '예약 이름 확인',
    sourceUrl: 'https://example.com/arrival-v1',
    schedule: { kind: 'fixed', date: '2026-10-01', timing: { version: 1, time: '15:00', timeZone: 'Asia/Tokyo' } },
    subchecks: [{ id: 'booking', title: '예약 번호 확인' }, { id: 'contact', title: '연락처 확인' }],
  };
  const other: ProgramPublicItem = { ...programClone(firstItem), id: 'departure', title: '다음 이동', subchecks: [] };
  const authored: PublishProgramFlowInput = {
    actorId, requestId: 'authored-v1', title: '복합 필드 회귀용 여행', summary: '가상으로 직접 작성한 자동 검사 자료', category: '여행', situations: [],
    source: { kind: 'simulated-example', label: '자동 검사 가상 작성 내용', url: null, checkedAt: null }, items: [firstItem, other],
  };
  const first = ok(publishProgramFlow(createProgramData(), authored, at));
  const version = first.data.public.versions.find(row => row.id === first.result)!;
  const imported = ok(importProgramPublicVersion(first.data, {
    ...base(first.data, 'personal-copy'), versionId: first.result, itemIds: ['arrival', 'departure'], anchor: null,
  }));
  let data = imported.data;
  const copy = data.spaces[actorId].copies.find(row => row.id === imported.result)!;
  const taskId = copy.itemLines.arrival, childId = copy.subcheckLines.arrival.booking;
  data = ok(updateProgramTask(data, { ...base(data, 'private-parent'), taskId,
    patch: { title: '내 늦은 체크인', date: '2026-10-04', time: '18:30', note: 'PRIVATE-도착 뒤 전화' } })).data;
  data = ok(updateProgramTask(data, { ...base(data, 'private-child'), taskId: childId,
    patch: { title: '내 예약 번호 다시 확인', note: 'PRIVATE-예약 메모' } })).data;
  data = ok(recordProgramTaskProgress(data, { ...base(data, 'parent-progress'), taskId, date: '2026-09-14', percent: 50 })).data;
  data = ok(recordProgramTaskProgress(data, { ...base(data, 'child-progress'), taskId: childId, date: '2026-09-14', percent: 100 })).data;
  const revised: PublishProgramFlowInput = {
    ...authored, requestId: 'authored-v2', flowId: version.flowId, expectedVersionId: version.id,
    items: [{ ...firstItem, title: '변경된 숙소 체크인', description: '변경된 도착 절차를 읽는다', completionCriteria: '새 안내 확인',
      sourceUrl: 'https://example.com/arrival-v2',
      schedule: { kind: 'fixed', date: '2026-10-02', timing: { version: 1, time: '16:00', timeZone: 'Asia/Tokyo' } },
      subchecks: [{ id: 'contact', title: '새 연락처 확인' }, { id: 'booking', title: '새 예약 번호 확인' }] },
    { ...other, description: '아직 선택하지 않은 다른 항목 설명' }],
  };
  const second = ok(publishProgramFlow(data, revised, at));
  assert.deepEqual(second.data.public.versions.find(row => row.id === version.id), version);
  assert.deepEqual(second.data.spaces, data.spaces);
  assert(!JSON.stringify(second.data.public).includes('PRIVATE-'));
  return { data: second.data, copyId: copy.id, documentId: copy.documentId, taskId, childId, baseVersion: version, versionId: second.result, revised };
}

function request(f: ReturnType<typeof authoredScenario>, data: ProgramData, fields: ProgramCopyField[], requestId: string) {
  return { ...base(data, requestId), copyId: f.copyId, versionId: f.versionId,
    expectedBaseVersionId: f.baseVersion.id, itemIds: ['arrival'], fields };
}
function field(f: ReturnType<typeof authoredScenario>, data: ProgramData, name: ProgramCopyField) {
  const compared = ok(compareProgramCopyVersion(data, { actorId, copyId: f.copyId, versionId: f.versionId }));
  return compared.result.items.find(row => row.itemId === 'arrival')!.fields.find(row => row.field === name)!;
}

test('published multi-field changes reject mixed conflicting selections atomically and keep independent private dates/time', () => {
  const f = authoredScenario(), before = programClone(f.data);
  for (const name of ['title', 'subchecks'] as const) {
    assert(field(f, f.data, name).sourceChanged, name);
    assert(field(f, f.data, name).privateChanged, name);
    assert(!field(f, f.data, name).canApply, name);
    const rejected = applyProgramCopyVersion(f.data, request(f, f.data, ['description', name], `conflicting-${name}`));
    assert(!rejected.ok); assert.equal(rejected.reason, 'conflict'); assert.equal(rejected.data, f.data);
    assert.deepEqual(f.data, before);
  }
  // Personal execution date/time are separate from source-schedule metadata.
  for (const name of ['description', 'completionCriteria', 'sourceUrl', 'schedule'] as const) {
    assert(field(f, f.data, name).sourceChanged, name);
    assert(field(f, f.data, name).canApply, name);
    assert(!field(f, f.data, name).privateChanged, name);
  }
});

test('partial field acceptance after later private records uses stale rejection, quota retry, immutable publication and persisted Undo/reload', async () => {
  const f = authoredScenario();
  const protectedBytes = '{ "raw": "OPERATING\\r\\n" }', values = new Map([['flow:operating-multifield', protectedBytes]]);
  const writes: string[] = []; let quota = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { assert.equal(key, PROGRAM_STATE_KEY); if (quota) throw Error('quota'); values.set(key, value); writes.push(key); },
    clear: () => assert.fail('no clear'), removeItem: () => assert.fail('no remove') };
  const exclusive = async <T,>(work: () => T | Promise<T>) => work();
  const controller = createProgramController({ initialData: f.data, storage, exclusive }); assert(controller.ok);
  const fields: ProgramCopyField[] = ['description', 'completionCriteria', 'schedule'];
  const stale = request(f, f.data, fields, 'partial-accept');
  assert((await controller.mutate('검토 중 새 실행 기록', data => recordProgramTaskProgress(data,
    { ...base(data, 'later-record'), taskId: f.taskId, date: '2026-09-15', percent: 75 }), { actorId })).ok);
  assert((await controller.mutate('검토 중 새 개인 메모', data => updateProgramTask(data,
    { ...base(data, 'later-note'), taskId: f.childId, patch: { note: 'PRIVATE-나중에 적은 예약 메모' } }), { actorId })).ok);
  const before = controller.snapshot(), publicBefore = programClone(before.envelope.data.public), writeCount = writes.length;
  const rejected = await controller.mutate('지난 비교의 선택', data => applyProgramCopyVersion(data, stale), { actorId });
  assert(!rejected.ok); assert.equal(rejected.reason, 'conflict');
  assert.equal(writes.length, writeCount); assert.deepEqual(controller.snapshot(), before);

  const fresh = request(f, before.envelope.data, fields, 'partial-accept');
  quota = true;
  assert(!(await controller.mutate('선택 필드 수용', data => applyProgramCopyVersion(data, fresh), { actorId })).ok);
  assert.deepEqual(controller.snapshot(), before); assert.equal(writes.length, writeCount);
  quota = false;
  assert((await controller.mutate('선택 필드 수용', data => applyProgramCopyVersion(data, fresh), { actorId })).ok);
  const accepted = controller.snapshot(), data = accepted.envelope.data, copy = data.spaces[actorId].copies.find(row => row.id === f.copyId)!;
  assert.deepEqual(copy.appliedFields.arrival, Object.fromEntries(fields.map(name => [name, f.versionId])));
  assert.deepEqual(copy.appliedFields.departure, before.envelope.data.spaces[actorId].copies.find(row => row.id === f.copyId)!.appliedFields.departure);
  assert.deepEqual(data.public, publicBefore); assert.deepEqual(data.spaces[actorId].text.progressRecords, before.envelope.data.spaces[actorId].text.progressRecords);
  assert.deepEqual(M.tasks(data.spaces[actorId].text), M.tasks(before.envelope.data.spaces[actorId].text));
  assert.equal(M.progressHistory(data.spaces[actorId].text, f.taskId).length, 2);
  for (const name of ['title', 'subchecks'] as const) assert(field(f, data, name).privateChanged);
  assert(field(f, data, 'sourceUrl').sourceChanged); assert(!field(f, data, 'sourceUrl').alreadyApplied);
  for (const name of fields) { assert(field(f, data, name).alreadyApplied); assert.equal(field(f, data, name).baseVersionId, f.versionId); }

  const inspection = inspectProgramPrivateOutput(data, { actorId, documentId: f.documentId }); assert(inspection.ok);
  const row = inspection.rows.find(row => row.id === f.taskId)!;
  assert.equal(row.date, '2026-10-04'); assert.equal(row.time, '18:30'); assert.equal(row.sourceTime, '16:00'); assert.equal(row.progress, 75);
  assert.equal(row.sourceDate, '2026-10-02'); assert.equal(row.sourceUrl, 'https://example.com/arrival-v1');
  for (const format of ['txt', 'csv', 'ics'] as const) {
    const output = makeProgramPrivateOutput(data, { actorId, documentId: f.documentId, format, mode: 'tasks', selectedItemIds: [f.taskId] }, at); assert(output.ok);
    const payload = output.payload.replace(/\r\n[ \t]/g, '');
    for (const value of ['내 늦은 체크인', '18:30', '16:00', 'PRIVATE-도착 뒤 전화']) assert(payload.includes(value), `${format}: ${value}`);
    if (format === 'ics') assert.match(payload, /DTSTART:20261004T093000Z/);
  }
  assert((await controller.mutate('동일 수용 재시도', current => applyProgramCopyVersion(current, fresh), { actorId })).ok);
  assert.equal(writes.length, writeCount + 1);

  // A later real writer transition must survive an Undo of the private acceptance.
  const third = { ...f.revised, requestId: 'authored-v3', expectedVersionId: f.versionId, summary: '개인 수용 뒤 작성한 가상 새 판본' };
  assert((await controller.mutate('가상 원문 새 판본', current => publishProgramFlow(current, third, at), { actorId })).ok);
  const newestPublic = controller.snapshot().envelope.data.public;
  assert.equal(newestPublic.versions.filter(version => version.flowId === f.baseVersion.flowId).length, 3);
  assert((await controller.undo(actorId)).ok);
  assert.deepEqual(controller.snapshot().envelope.data.spaces, before.envelope.data.spaces);
  assert.deepEqual(controller.snapshot().envelope.data.public, newestPublic);
  const undoneReload = createProgramController({ initialData: createProgramData(), storage, exclusive }); assert(undoneReload.ok);
  assert.deepEqual(undoneReload.snapshot(), controller.snapshot());
  assert((await controller.redo(actorId)).ok);
  assert.deepEqual(controller.snapshot().envelope.data.spaces, accepted.envelope.data.spaces);
  assert.deepEqual(controller.snapshot().envelope.data.public, newestPublic);
  const reloaded = createProgramController({ initialData: createProgramData(), storage, exclusive }); assert(reloaded.ok);
  assert.deepEqual(reloaded.snapshot(), controller.snapshot());
  assert.equal(values.get('flow:operating-multifield'), protectedBytes);
  assert(writes.every(key => key === PROGRAM_STATE_KEY));
});
