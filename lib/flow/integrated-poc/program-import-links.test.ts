import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProgramData, ProgramPublicVersion } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument, importProgramPublicVersion, recordProgramTaskProgress } from './private-space';
import { executeAlphaSocialIntent } from './alpha-social/dispatch';
import { captureProgramImportLinks, cancelProgramImportLinks, programImportTargets, programImportReceiptOwnsLinks, remainingProgramImportLinks, unlinkProgramImportLines } from './program-import-links';
import type { ProgramMutate } from './ui-contract';
import { setPersonalRepeat } from './personal-authoring-commands';
import { textWorkspaceModel as M } from './text-workspace';
function fixture() {
  let data = createProgramData();
  const version: ProgramPublicVersion = { id: 'links-v1', flowId: 'links-flow', number: 1, parentVersionId: null, title: '연결 시험', summary: '',
    items: [{ id: 'ordinary', title: '한 번 하기', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] },
      { id: 'repeated', title: '반복하기', description: '', completionCriteria: '', sourceUrl: null,
        schedule: { kind: 'recurring', version: 1, rule: { version: 1, semantics: 'authoring-v1', frequency: 'daily', interval: 1, end: null }, start: { kind: 'undated' }, time: null, timeZone: null }, subchecks: [] }],
    source: { kind: 'user-text', label: '합성', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-11-01T00:00:00.000Z' };
  data.public.flows.push({ id: 'links-flow', ownerId: 'creator-minji', currentVersionId: version.id, category: '생활', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push(version);
  const made = createProgramDocument(data, { actorId: 'local-user', requestId: 'target', expectedSpace: data.spaces['local-user'], title: '기존 문서', raw: '기존 메모\n- [ ] 원래 할 일' });
  assert(made.ok); data = made.data;
  const before = data.spaces['local-user'];
  const imported = importProgramPublicVersion(data, { actorId: 'local-user', requestId: 'links-import', expectedSpace: before, versionId: version.id,
    itemIds: ['ordinary', 'repeated'], anchor: null, targetDocumentId: made.result });
  assert(imported.ok); data = imported.data;
  return { data, before, target: made.result, batch: captureProgramImportLinks('local-user', imported.result, made.result, before, data.spaces['local-user']) };
}
test('a social receipt cannot claim replacement link IDs from a newer read or a different result', () => {
  const receipt = { kind: 'social' as const, requestId: 'own-import', revision: 18, changed: true, resultId: 'copy', publicRevision: 2 };
  assert.equal(programImportReceiptOwnsLinks(receipt, 18, 'copy'), true);
  assert.equal(programImportReceiptOwnsLinks(receipt, 20, 'copy'), false, 'another request removed and reconnected after this receipt');
  assert.equal(programImportReceiptOwnsLinks(receipt, 18, 'other-copy'), false);
  assert.equal(programImportReceiptOwnsLinks({ ...receipt, changed: false }, 18, 'copy'), false);
  assert.equal(programImportReceiptOwnsLinks(null, 18, 'copy'), false);
});
test('mixed import remembers only new ordinary/repeated links and cancellation preserves copy, tasks and records', async () => {
  const f = fixture(); let live = f.data;
  assert.equal(f.batch.ordinary.length, 1); assert.equal(f.batch.recurring.length, 1);
  const originalTask = M.tasks(live.spaces['local-user'].text).find(task => task.docId === f.target)!;
  const personal = setPersonalRepeat(live, { taskId: originalTask.id, rule: { kind: 'daily', startDate: '2026-11-01', end: { kind: 'count', count: 2 } } });
  assert(personal.ok); live = personal.data;
  const progressResult = recordProgramTaskProgress(live, { actorId: 'local-user', requestId: 'progress', expectedSpace: live.spaces['local-user'],
    taskId: live.spaces['local-user'].copies.find(row => row.id === f.batch.copyId)!.itemLines.ordinary, date: '2026-11-01', percent: 100 });
  assert(progressResult.ok); live = progressResult.data;
  const copyBefore = structuredClone(live.spaces['local-user'].text.flows), progress = structuredClone(live.spaces['local-user'].text.progressRecords), authoring = structuredClone(live.spaces['local-user'].personalAuthoring);
  let request = 0;
  const mutate: ProgramMutate = async (_label, build, options) => {
    const preview = build(live); if (!preview.ok) return { ok: false, reason: preview.reason };
    const result = options?.alphaSocial && typeof options.alphaSocial !== 'function'
      ? executeAlphaSocialIntent(live, 'local-user', options.alphaSocial, 'unlink-' + ++request) : preview;
    if (!result.ok) return { ok: false, reason: result.reason };
    live = result.data; return { ok: true, result: String(result.result) };
  };
  const result = await cancelProgramImportLinks({ batch: f.batch, read: () => live, mutate, pending: () => [], isCurrent: () => true });
  assert.equal(result.remaining, 0, JSON.stringify(result)); assert.deepEqual(live.spaces['local-user'].text.flows, copyBefore);
  assert.deepEqual(live.spaces['local-user'].text.progressRecords, progress);
  assert.deepEqual(live.spaces['local-user'].personalAuthoring, authoring);
  assert.deepEqual(live.spaces['local-user'].text.documents.find(doc => doc.id === f.target)?.lines, f.before.text.documents.find(doc => doc.id === f.target)?.lines);
  assert(validateProgramData(live));
});
test('target filter excludes the copy/trash/archive and names pending input', () => {
  const f = fixture(), targets = programImportTargets(f.data, 'local-user', f.data.spaces['local-user'].copies[0].documentId, [f.target]);
  assert.equal(targets.find(row => row.id === f.target)?.reason, '입력 중 · 저장한 뒤 고를 수 있습니다');
  assert(!targets.some(row => row.id === f.data.spaces['local-user'].copies[0].documentId));
  f.data.spaces['local-user'].archivedDocumentIds.push(f.target);
  assert(!programImportTargets(f.data, 'local-user', undefined, []).some(row => row.id === f.target));
});
test('partial or pending cancellation retains intent and cannot touch another actor', async () => {
  const f = fixture(); let live = f.data;
  const ordinary = unlinkProgramImportLines(live, f.batch); assert(ordinary.ok); live = ordinary.data;
  const blocked: ProgramMutate = async () => ({ ok: false, reason: 'checking-result' });
  const partial = await cancelProgramImportLinks({ batch: f.batch, read: () => live, mutate: blocked, pending: () => [], isCurrent: () => true });
  assert.equal(partial.remaining, 1); assert.equal(remainingProgramImportLinks(live, f.batch).recurring.length, 1);
  const waiting = await cancelProgramImportLinks({ batch: f.batch, read: () => live, mutate: blocked, pending: () => [f.target], isCurrent: () => true });
  assert.equal(waiting.reason, 'pending-input'); assert.equal(waiting.remaining, 1);
  const wrong = structuredClone(live); wrong.activeActorId = 'creator-minji';
  assert.equal(unlinkProgramImportLines(wrong, f.batch).ok, false);
  const retry: ProgramMutate = async (_label, build, options) => {
    const preview = build(live); if (!preview.ok) return { ok: false, reason: preview.reason };
    const result = options?.alphaSocial && typeof options.alphaSocial !== 'function'
      ? executeAlphaSocialIntent(live, 'local-user', options.alphaSocial, 'retry') : preview;
    if (!result.ok) return { ok: false, reason: result.reason };
    live = result.data; return { ok: true, result: String(result.result) };
  };
  const resumed = await cancelProgramImportLinks({ batch: f.batch, read: () => live, mutate: retry, pending: () => [], isCurrent: () => true });
  assert.equal(resumed.remaining, 0);
});
