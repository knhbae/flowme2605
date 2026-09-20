import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createProgramData, validateProgramData } from './program-data';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { setProgramCreatorWorking, applyProgramCreatorAction, handoffProgramCreatorDraft, fingerprintPersonalWorkspacePocAuthoringSource as fp } from './creator-workspace';
import { currentCreatorExecutionRevision } from './creator-execution-source';
import { createProgramCreatorTaskSourceFactsReader, programCreatorTaskSourceFacts } from './execution-source';
import { createProgramDocument } from './private-space';
import { moveProgramTaskDocument } from './task-document-move';

const actorId = 'local-user', now = '2026-09-12T12:00:00.000Z';
const raw = (count: number) => '# 준비\n' + Array.from({ length: count }, (_, i) => `- [ ] 준비 ${i}\n  - 날짜: 2026-09-14\n  - 시간: 09:30\n  - 시간대: Asia/Seoul\n  - 자료: [자료](https://example.com/resource)`).join('\n');
function accept<T>(value: ProgramTransition<T>) { if (!value.ok) assert.fail(value.reason); assert(validateProgramData(value.data)); return value; }
function fixture(count = 2, data = createProgramData(), draftId = 'reader-source') {
  const space = data.spaces[actorId], prior = space.creatorWorkspace?.library.records[draftId];
  const text = raw(count), recordRevision = prior?.recordRevision;
  data = accept(setProgramCreatorWorking(data, { actorId, expectedWorking: space.creatorWorkspace?.working ?? null,
    working: { draftId, title: '출처 읽기', rawText: text, baseRecordRevision: recordRevision ?? null } }, now)).data;
  const library = data.spaces[actorId].creatorWorkspace!.library;
  data = accept(applyProgramCreatorAction(data, { actorId, requestId: `save-${draftId}-${library.revision}`, action: {
    type: 'save', draftId, title: '출처 읽기', rawText: text, sourceFingerprint: fp(text), expectedLibraryRevision: library.revision,
    ...(recordRevision ? { expectedRecordRevision: recordRevision } : {}), now,
  } }, now)).data;
  data = accept(handoffProgramCreatorDraft(data, { actorId, requestId: `handoff-${draftId}-${library.revision}`, draftId,
    expectedRecordRevision: data.spaces[actorId].creatorWorkspace!.library.records[draftId].recordRevision, today: '2026-09-12' }, now)).data;
  const owner = data.spaces[actorId].creatorWorkspace!.executionSources![draftId];
  return { data, owner, revision: currentCreatorExecutionRevision(owner) };
}

test('per-call reader matches the one-shot API across owners and never mutates source or returned peers', () => {
  const first = fixture(), second = fixture(3, first.data, 'other-source'), space = second.data.spaces[actorId], before = JSON.stringify(second.data);
  const read = createProgramCreatorTaskSourceFactsReader(space);
  for (const owner of Object.values(space.creatorWorkspace!.executionSources!)) for (const row of currentCreatorExecutionRevision(owner).rows) {
    const facts = read(owner.documentId, row.documentLineId);
    assert.deepEqual(facts, programCreatorTaskSourceFacts(space, owner.documentId, row.documentLineId));
    assert(facts); assert.equal(facts.sourceDate, '2026-09-14'); assert.equal(facts.wallTime, '09:30'); assert.equal(facts.timeZone, 'Asia/Seoul'); assert.equal(facts.resourceUrl, 'https://example.com/resource');
    facts.wallTime = 'changed caller result'; assert.equal(read(owner.documentId, row.documentLineId)!.wallTime, '09:30');
  }
  assert.equal(read('missing-document', first.revision.rows[0].documentLineId), null);
  assert.equal(read(second.owner.documentId, 'missing-line'), null);
  assert.equal(JSON.stringify(second.data), before);
});

test('moved canonical ordinary row keeps source facts only through its current document', () => {
  const f = fixture(), lineId = f.revision.rows[0].documentLineId;
  const original = programCreatorTaskSourceFacts(f.data.spaces[actorId], f.owner.documentId, lineId);
  const added = accept(createProgramDocument(f.data, { actorId, requestId: 'reader-destination', expectedSpace: f.data.spaces[actorId], title: '옮긴 문서' }));
  const moved = accept(moveProgramTaskDocument(added.data, { actorId, requestId: 'reader-move', expectedSpace: added.data.spaces[actorId], taskId: lineId, destinationId: added.result }));
  const before = JSON.stringify(moved.data), read = createProgramCreatorTaskSourceFactsReader(moved.data.spaces[actorId]);
  assert.equal(read(f.owner.documentId, lineId), null); assert.deepEqual(read(added.result, lineId), original);
  assert.deepEqual(read(added.result, lineId), programCreatorTaskSourceFacts(moved.data.spaces[actorId], added.result, lineId));
  assert.equal(JSON.stringify(moved.data), before);
});

test('each new reader fails closed on current, historical and unrelated-owner corruption without cached leakage', () => {
  const f = fixture(3, fixture().data), healthy = createProgramCreatorTaskSourceFactsReader(f.data.spaces[actorId]);
  assert.equal(f.owner.revisions.length, 2);
  for (const corrupt of [
    (data: ProgramData) => { data.spaces[actorId].creatorWorkspace!.executionSources!['reader-source'].revisions[0].raw += '\n손상'; },
    (data: ProgramData) => { currentCreatorExecutionRevision(data.spaces[actorId].creatorWorkspace!.executionSources!['reader-source']).rows[0].itemRef = 'foreign'; },
    (data: ProgramData) => { data.spaces[actorId].creatorWorkspace!.executionSources!['reader-source'].currentRevisionId = 'missing'; },
  ]) {
    const broken = programClone(f.data); corrupt(broken); const before = JSON.stringify(broken), read = createProgramCreatorTaskSourceFactsReader(broken.spaces[actorId]);
    for (const row of f.revision.rows) assert.equal(read(f.owner.documentId, row.documentLineId), null);
    assert.equal(programCreatorTaskSourceFacts(broken.spaces[actorId], f.owner.documentId, f.revision.rows[0].documentLineId), null);
    assert.equal(JSON.stringify(broken), before); assert(healthy(f.owner.documentId, f.revision.rows[0].documentLineId));
  }
  const other = fixture(1, f.data, 'corrupt-other'); other.owner.revisions[0].raw += '\n손상';
  assert.equal(createProgramCreatorTaskSourceFactsReader(other.data.spaces[actorId])(f.owner.documentId, f.revision.rows[0].documentLineId), null);
  assert.equal(createProgramCreatorTaskSourceFactsReader(createProgramData().spaces[actorId])('missing', 'missing'), null);
});

for (const count of [20, 100, 200]) test(`real ${count}-item save/handoff: one reader is equivalent and read-only`, t => {
  const f = fixture(count), space = f.data.spaces[actorId], before = JSON.stringify(f.data);
  const batchStart = performance.now(), read = createProgramCreatorTaskSourceFactsReader(space);
  const batch = f.revision.rows.map(row => read(f.owner.documentId, row.documentLineId)), batchMs = performance.now() - batchStart;
  const oneShotStart = performance.now(), oneShot = f.revision.rows.map(row => programCreatorTaskSourceFacts(space, f.owner.documentId, row.documentLineId)), oneShotMs = performance.now() - oneShotStart;
  assert.deepEqual(batch, oneShot); assert.equal(batch.length, count); assert(batch.every(Boolean)); assert.equal(JSON.stringify(f.data), before);
  t.diagnostic(JSON.stringify({ count, batchMs: Math.round(batchMs), oneShotMs: Math.round(oneShotMs), byteUnchanged: true }));
});
