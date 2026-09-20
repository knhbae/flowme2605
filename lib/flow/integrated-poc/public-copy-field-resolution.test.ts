import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, programClone, type ProgramData, type ProgramPublicItem, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramController } from './controller';
import { publishProgramFlow, type PublishProgramFlowInput } from './publication';
import { applyProgramCopyVersion, compareProgramCopyVersion, createProgramDocument, importProgramPublicVersion, linkProgramTask,
  previewProgramCopyFieldResolution, recordProgramTaskProgress, updateProgramTask,
  type ApplyProgramCopyVersionInput, type ProgramCopyResolvableField } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';

const actorId = 'local-user', at = '2026-09-14T15:00:00.000Z';
const fields: ProgramCopyResolvableField[] = ['title', 'description', 'completionCriteria', 'sourceUrl'];
const base = (data: ProgramData, requestId: string) => ({ actorId, requestId, expectedSpace: data.spaces[actorId] });
function ok<T>(result: ProgramTransition<T>) { assert(result.ok, result.ok ? '' : result.reason); assert(validateProgramData(result.data)); return result; }

// Local authored QA versions use the actual publication/import writer. The
// private metadata edits are detached in-memory fixtures, not public releases.
function fixture(field: ProgramCopyResolvableField) {
  const item: ProgramPublicItem = { id: 'arrival', title: '도착 확인', description: '원문 설명', completionCriteria: '원문 기준', sourceUrl: 'https://example.com/v1',
    schedule: { kind: 'fixed', date: '2026-10-01' }, subchecks: [{ id: 'check', title: '예약 확인' }] };
  const authored: PublishProgramFlowInput = { actorId, requestId: 'source-v1', title: '필드 충돌 QA', summary: '실제 외부 발행 아닌 가상 작성', category: '여행', situations: [],
    source: { kind: 'simulated-example', label: '자동 검사 작성 예시', url: null, checkedAt: null }, items: [item, { ...item, id: 'other', title: '다른 항목', subchecks: [] }] };
  const first = ok(publishProgramFlow(createProgramData(), authored, at)), firstVersion = first.data.public.versions.find(v => v.id === first.result)!;
  const imported = ok(importProgramPublicVersion(first.data, { ...base(first.data, 'import'), versionId: first.result, itemIds: ['arrival', 'other'], anchor: null }));
  let data = imported.data;
  const copy = data.spaces[actorId].copies.find(c => c.id === imported.result)!, lineId = copy.itemLines.arrival;
  data = ok(updateProgramTask(data, { ...base(data, 'personal'), taskId: lineId, patch: { title: field === 'title' ? 'PRIVATE-내 제목' : item.title, date: '2026-10-05', time: '18:30', note: 'PRIVATE-독립 메모' } })).data;
  data = ok(recordProgramTaskProgress(data, { ...base(data, 'progress35'), taskId: lineId, date: '2026-10-05', percent: 35 })).data;
  data = ok(recordProgramTaskProgress(data, { ...base(data, 'progress65'), taskId: lineId, date: '2026-10-06', percent: 65 })).data;
  for (const n of [1, 2]) {
    const doc = ok(createProgramDocument(data, { ...base(data, `doc${n}`), title: `연결 문서 ${n}` })); data = doc.data;
    data = ok(linkProgramTask(data, { ...base(data, `link${n}`), documentId: doc.result, taskId: lineId })).data;
  }
  if (field !== 'title') M.getDocument(data.spaces[actorId].text, copy.documentId)!.lines.find(line => line.id === `${lineId}:${field}:0`)!.text = `  PRIVATE-${field} 개인 본문`;
  assert(validateProgramData(data));
  const revised: ProgramPublicItem = { ...item, title: '새 원문 제목', description: '새 원문 설명', completionCriteria: '새 원문 기준', sourceUrl: 'https://example.com/v2' };
  const second = ok(publishProgramFlow(data, { ...authored, requestId: 'source-v2', flowId: firstVersion.flowId, expectedVersionId: first.result, items: [revised, authored.items[1]] }, at));
  return { data: second.data, copyId: copy.id, documentId: copy.documentId, lineId, field, fromVersionId: first.result, versionId: second.result, item, revised };
}
function preview(f: ReturnType<typeof fixture>, data = f.data) {
  return ok(previewProgramCopyFieldResolution(data, { actorId, copyId: f.copyId, itemId: 'arrival', versionId: f.versionId, field: f.field })).result;
}
function request(f: ReturnType<typeof fixture>, data = f.data, requestId = 'resolve-field'): ApplyProgramCopyVersionInput {
  return { ...base(data, requestId), copyId: f.copyId, expectedBaseVersionId: f.fromVersionId, versionId: f.versionId, itemIds: ['arrival'], fields: [f.field], fieldResolution: { confirmed: true, at, preview: preview(f, data) } };
}

for (const field of fields) test(`PCF ${field}: explicit one-field acceptance preserves other fields, private records, references and source versions`, () => {
  const f = fixture(field), bytes = JSON.stringify(f.data), input = request(f), p = input.fieldResolution!.preview;
  assert.equal(p.version, 1); assert.equal(p.field, field); assert.equal(p.target.documentId, f.documentId); assert.equal(p.target.lineId, f.lineId);
  assert.equal(p.before, f.item[field]); assert.equal(p.incoming, f.revised[field]); assert(p.currentText.includes('PRIVATE-')); assert.equal(JSON.stringify(f.data), bytes);
  const ordinary = applyProgramCopyVersion(f.data, { ...input, fieldResolution: undefined }); assert(!ordinary.ok); assert.equal(ordinary.reason, 'conflict');
  const result = ok(applyProgramCopyVersion(f.data, input)); assert(result.changed);
  const before = f.data.spaces[actorId], after = result.data.spaces[actorId], previousCopy = before.copies.find(c => c.id === f.copyId)!, copy = after.copies.find(c => c.id === f.copyId)!;
  assert.deepEqual(copy.appliedFields.arrival, { [field]: f.versionId }); assert.deepEqual(copy.appliedFields.other, previousCopy.appliedFields.other);
  assert.deepEqual(copy.itemLines, previousCopy.itemLines); assert.deepEqual(copy.subcheckLines, previousCopy.subcheckLines);
  assert.deepEqual(after.text.bindings, before.text.bindings); assert.deepEqual(after.text.progressRecords, before.text.progressRecords);
  const a = M.tasks(after.text).find(t => t.id === f.lineId)!, b = M.tasks(before.text).find(t => t.id === f.lineId)!;
  for (const name of ['date', 'time', 'note', 'done'] as const) assert.deepEqual(a[name], b[name], name);
  assert.equal(a.title, field === 'title' ? f.revised.title : b.title);
  const otherFields = fields.filter(name => name !== field);
  for (const name of otherFields) assert.deepEqual(M.getDocument(after.text, f.documentId)!.lines.filter(l => l.id.startsWith(`${f.lineId}:${name}:`)), M.getDocument(before.text, f.documentId)!.lines.filter(l => l.id.startsWith(`${f.lineId}:${name}:`)));
  assert.deepEqual(result.data.public, f.data.public); assert.equal(JSON.stringify(f.data), bytes);
  const receipt = result.data.receipts.find(r => r.id === input.requestId)!;
  assert.deepEqual(JSON.parse(receipt.fingerprint).fieldResolution.preview, p, 'previous private field evidence survives in the existing private receipt');
  const repeat = ok(applyProgramCopyVersion(result.data, input)); assert.equal(repeat.changed, false); assert.equal(repeat.data, result.data);
  const sameValue = ok(applyProgramCopyVersion(result.data, { ...input, ...base(result.data, 'same-value'), fieldResolution: undefined })); assert.equal(sameValue.changed, false);
});

test('PCF malformed, unconfirmed, foreign and multi-field decisions cannot authorize any replacement', () => {
  const f = fixture('description'), input = request(f), p = input.fieldResolution!.preview, bytes = JSON.stringify(f.data);
  const mutations: unknown[] = [
    { ...input, fieldResolution: null }, { ...input, fieldResolution: { ...input.fieldResolution, confirmed: false } },
    { ...input, fieldResolution: { ...input.fieldResolution, at: '2026-02-30T00:00:00.000Z' } },
    { ...input, fieldResolution: { ...input.fieldResolution, extra: true } },
    ...[null, {}, { ...p, version: 2 }, { ...p, itemId: 'other' }, { ...p, field: 'title' }, { ...p, copyId: 'foreign' },
      { ...p, fromVersionId: f.versionId }, { ...p, toVersionId: f.fromVersionId }, { ...p, currentText: 'invented' },
      { ...p, incoming: 'invented' }, { ...p, target: { ...p.target, lineId: 'foreign' } }, { ...p, source: { ...p.source, ownerId: 'creator-minji' } },
      { ...p, target: { ...p.target, fieldLines: [] } }, { ...p, extra: true }].map(preview => ({ ...input, fieldResolution: { ...input.fieldResolution, preview } })),
    { ...input, fields: ['title'] }, { ...input, fields: ['schedule'] }, { ...input, fields: ['subchecks'] },
    { ...input, fields: ['description', 'title'] }, { ...input, itemIds: ['arrival', 'other'] }, { ...input, itemIds: ['other'] },
    { ...input, scheduleResolution: {} }, { ...input, checkResolution: {} }, { ...input, actorId: 'creator-minji' },
  ];
  for (const candidate of mutations) { const result = applyProgramCopyVersion(f.data, candidate as ApplyProgramCopyVersionInput); assert(!result.ok, JSON.stringify(candidate)); assert.equal(result.data, f.data); }
  for (const field of ['schedule', 'subchecks', 'unknown']) assert(!previewProgramCopyFieldResolution(f.data, { actorId, copyId: f.copyId, itemId: 'arrival', versionId: f.versionId, field: field as typeof f.field }).ok);
  assert.equal(JSON.stringify(f.data), bytes);
});

test('PCF stale private/source evidence is refused even if the caller refreshes expectedSpace', () => {
  const f = fixture('description'), input = request(f);
  const changes: ((data: ProgramData) => void)[] = [
    data => { M.getDocument(data.spaces[actorId].text, f.documentId)!.lines.find(l => l.id === `${f.lineId}:description:0`)!.text += ' later'; },
    data => { data.spaces[actorId].text = M.updateTask(data.spaces[actorId].text, f.lineId, { title: '나중 제목' }); },
    data => { data.public.versions.find(v => v.id === f.versionId)!.items[0].description += ' changed'; },
    data => { data.public.versions.find(v => v.id === f.fromVersionId)!.items[0].description += ' changed'; },
    data => { data.spaces[actorId].archivedDocumentIds.push(f.documentId); },
  ];
  for (const change of changes) {
    const data = programClone(f.data); change(data); assert(validateProgramData(data)); const bytes = JSON.stringify(data);
    assert(!applyProgramCopyVersion(data, { ...input, expectedSpace: data.spaces[actorId] }).ok); assert.equal(JSON.stringify(data), bytes);
  }
  const later = ok(recordProgramTaskProgress(f.data, { ...base(f.data, 'later-progress'), taskId: f.lineId, date: '2026-10-07', percent: 75 })).data;
  assert(!applyProgramCopyVersion(later, input).ok, 'whole expectedSpace rejects later records before applying an old comparison');
});

test('PCF field metadata converted to a task is not silently removed by a text resolution', () => {
  const f = fixture('description'), space = f.data.spaces[actorId];
  const doc = M.getDocument(space.text, f.documentId)!, line = doc.lines.find(l => l.id === `${f.lineId}:description:0`)!;
  line.text = '  - [ ] 새 개인 하위 작업';
  space.text.taskScopes[line.id] = f.documentId; space.text.itemScopes[line.id] = f.documentId;
  assert(validateProgramData(f.data)); const bytes = JSON.stringify(f.data);
  assert(!previewProgramCopyFieldResolution(f.data, { actorId, copyId: f.copyId, itemId: 'arrival', versionId: f.versionId, field: 'description' }).ok);
  assert.equal(JSON.stringify(f.data), bytes);
});

test('PCF one CAS commit, quota retry, duplicate, Undo/Redo and reload preserve the original private field', async () => {
  const f = fixture('title'), input = request(f), values = new Map([['flow:operating-field', 'unchanged bytes']]); let writes = 0, quota = true;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { assert.equal(key, PROGRAM_STATE_KEY); if (quota) throw Error('quota'); writes++; values.set(key, value); }, removeItem: () => assert.fail('remove') };
  const exclusive = async <T,>(work: () => T | Promise<T>) => work(), controller = createProgramController({ initialData: f.data, storage, exclusive }); assert(controller.ok);
  const before = controller.snapshot(), write = (data: ProgramData) => applyProgramCopyVersion(data, input);
  assert(!(await controller.mutate('필드 수용', write, { actorId })).ok); assert.equal(writes, 0); assert.deepEqual(controller.snapshot(), before);
  quota = false; assert((await controller.mutate('필드 수용', write, { actorId })).ok); assert.equal(writes, 1); const accepted = controller.snapshot();
  assert((await controller.mutate('동일 요청 재시도', write, { actorId })).ok); assert.equal(writes, 1);
  const altered = { ...input, fieldResolution: { ...input.fieldResolution!, at: '2026-09-15T00:00:00.000Z' } };
  const duplicate = applyProgramCopyVersion(accepted.envelope.data, altered); assert(!duplicate.ok); assert.equal(duplicate.reason, 'duplicate-request');
  const reload = createProgramController({ initialData: createProgramData(), storage, exclusive }); assert(reload.ok); assert.deepEqual(reload.snapshot(), accepted);
  assert((await reload.undo(actorId)).ok); assert.deepEqual(reload.snapshot().envelope.data.spaces, f.data.spaces);
  assert.deepEqual(reload.snapshot().envelope.data.public, f.data.public);
  const undoneReload = createProgramController({ initialData: createProgramData(), storage, exclusive }); assert(undoneReload.ok); assert.deepEqual(undoneReload.snapshot(), reload.snapshot());
  // Redo is intentionally session-local; reload verifies persisted Undo only.
  assert((await reload.redo(actorId)).ok); assert.deepEqual(reload.snapshot().envelope.data.spaces, accepted.envelope.data.spaces);
  assert.equal(values.get('flow:operating-field'), 'unchanged bytes');
});

test('PCF storage CAS and foreign readback never report a successful acceptance or overwrite foreign bytes', async () => {
  for (const mode of ['stale', 'readback'] as const) {
    const f = fixture('sourceUrl'), input = request(f); let raw: string | null = null, writes = 0;
    const storage = { getItem: () => raw, setItem: (_key: string, _value: string) => { writes++; raw = 'foreign-after-set'; }, removeItem: () => assert.fail('remove') };
    const controller = createProgramController({ initialData: f.data, storage, exclusive: async work => work() }); assert(controller.ok); const before = controller.snapshot();
    if (mode === 'stale') raw = 'foreign-before-set';
    assert(!(await controller.mutate('필드 수용', data => applyProgramCopyVersion(data, input), { actorId })).ok);
    assert.equal(writes, mode === 'stale' ? 0 : 1); assert.equal(raw, mode === 'stale' ? 'foreign-before-set' : 'foreign-after-set');
    assert.deepEqual(controller.snapshot().envelope, before.envelope);
  }
});
