import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramData, validateProgramData } from './program-data';
import { programClone, type ProgramTransition } from './contract';
import { setProgramCreatorWorking, applyProgramCreatorAction, handoffProgramCreatorDraft } from './creator-workspace';
import { fingerprintPersonalWorkspacePocAuthoringSource as fp } from '../personal-workspace-poc-authoring';
import { createTextAuthoringDocument } from './native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner } from './native-creator-document';
import { inspectProgramNativeCreatorHandoff, applyProgramNativeCreatorHandoff } from './creator-native-execution-adapter';
import { readProgramPublicationSeries, programPublicationSeriesKey } from './publication-series-source';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from './recurrence-state';
import { textWorkspaceModel as M } from './text-workspace';
import { listPersonalWorkspacePocStructureTemplatePreviews } from './creator-workspace-tools';

const NOW = '2026-09-13T15:10:00.000Z', today = '2026-12-01', draftId = 'publication-series-test';
const RAW = '# 겨울 운동\n\n- 기준일: 2026-12-01\n\n## 주간\n- [ ] 걷기\n  - 날짜: 2026-12-01\n  - 시간: 09:30\n  - 시간대: Asia/Seoul\n  - 반복: 매주 월, 수\n  - 반복 종료: 8회\n  - 설명: 천천히 걷는다\n  - [x] 운동화 확인\n\n- [ ] 스트레칭\n  - 날짜: 2026-12-02\n  - 반복: 매주 금\n  - 반복 종료: 8회\n\n## 준비\n- [ ] 가방 준비\n  - 날짜: 2026-12-03';
function accept(result: ProgramTransition<string>) { assert(result.ok, result.ok ? '' : result.reason); assert(validateProgramData(result.data)); return result; }
function fixture(kind: 'creator' | 'native', raw = RAW) {
  let data = createProgramData(); const actorId = data.activeActorId;
  let nativeFields = {};
  if (kind === 'native') {
    const doc = createTextAuthoringDocument(raw, { documentId: 'original-native-doc', ownership: 'creator', now: NOW });
    const source = { storageKey: 'flow:text-authoring:drafts:v1' as const, draftId: 'original-native', versionId: 'native-v1', revisionId: doc.revision.revisionId, documentJson: JSON.stringify(doc) };
    const owner = createNativeCreatorDocumentOwner({ id: draftId, source }, NOW); assert(owner.ok);
    nativeFields = { nativeDocument: owner.owner, nativeSelection: source };
  }
  data = accept(setProgramCreatorWorking(data, { actorId, expectedWorking: null, working: { draftId, title: '겨울 운동', rawText: raw, baseRecordRevision: null, ...nativeFields } }, NOW)).data;
  const workspace = data.spaces[actorId].creatorWorkspace!, working = workspace.working!;
  data = accept(applyProgramCreatorAction(data, { actorId, requestId: 'save-fixture', expectedNativeDocument: working.nativeDocument ?? null, expectedNativeSelection: working.nativeSelection ?? null,
    action: { type: 'save', draftId, rawText: raw, title: '겨울 운동', sourceFingerprint: fp(raw), expectedLibraryRevision: workspace.library.revision, now: NOW } }, NOW)).data;
  let result: ProgramTransition<string>;
  if (kind === 'native') {
    const preview = inspectProgramNativeCreatorHandoff(data, { actorId, draftId }, NOW); assert(preview.ok, preview.ok ? '' : preview.reason);
    const choices = Object.fromEntries(preview.preview.rows.map(row => [row.itemId, { source: 'incoming' as const, date: 'keep' as const, time: 'keep' as const, children: 'keep' as const }]));
    result = applyProgramNativeCreatorHandoff(data, { actorId, requestId: 'handoff-fixture', preview: preview.preview, choices }, NOW);
  } else result = handoffProgramCreatorDraft(data, { actorId, requestId: 'handoff-fixture', draftId, expectedRecordRevision: 1, today }, NOW);
  const handoff = accept(result); return { data: handoff.data, actorId, documentId: handoff.result };
}
for (const kind of ['creator', 'native'] as const) test(`PRS ${kind}: two real series become two candidates, not metadata notes or sixteen dated tasks`, () => {
  const f = fixture(kind), before = JSON.stringify(f.data), space = f.data.spaces[f.actorId];
  const read = readProgramPublicationSeries(space, f.documentId); assert(read.ok, read.ok ? '' : read.reason);
  assert.equal(read.candidates.length, 2); assert.deepEqual(read.candidates.map(row => row.source.title), ['걷기', '스트레칭']);
  assert(read.candidates.every(row => row.origin === kind && row.source.rule.end?.mode === 'count' && row.source.rule.end.count === 8));
  assert.equal(read.candidates[0].source.time, '09:30'); assert.equal(read.candidates[0].source.timeZone, 'Asia/Seoul');
  assert.equal(read.candidates[0].source.subchecks[0].title, '운동화 확인'); assert(!JSON.stringify(read.candidates).includes('sourceChecked'));
  const ordinary = M.tasks(space.text).find(row => row.title === '가방 준비'); assert(ordinary); assert(!read.metadataLineIds.includes(ordinary.id));
  assert(read.metadataLineIds.length > 2); assert.equal(new Set(read.metadataLineIds).size, read.metadataLineIds.length);
  assert.equal(JSON.stringify(f.data), before); assert.equal(space.legacySnapshot, null);
  read.candidates[0].source.rule.weekdays!.push('SU'); read.candidates[0].source.subchecks[0].title = 'changed';
  assert.equal(JSON.stringify(f.data), before);
});
test('PRS creator: current sixteen occurrences and actual private completion/date override are absent from candidates', () => {
  const f = fixture('creator'), space = f.data.spaces[f.actorId], owner = space.creatorWorkspace!.executionSources![draftId];
  const input = { actorId: f.actorId, flowRef: owner.revisions[0].flow.ref, localToday: today };
  const occurrences = readProgramExecutionOccurrences(f.data, input); assert(occurrences.ok); assert.equal(occurrences.rows.length, 16);
  const target = occurrences.rows[0];
  const edited = updateProgramOccurrenceExecution(f.data, { ...input, identity: target.identity, expected: null,
    changes: { schedule: { mode: 'fixed_date', date: '2027-02-01' }, completion: { status: 'completed', completedAt: NOW } } });
  const next = accept(edited).data, before = JSON.stringify(next), read = readProgramPublicationSeries(next.spaces[f.actorId], f.documentId);
  assert(read.ok); assert.equal(read.candidates.length, 2); assert(!JSON.stringify(read).includes('2027-02-01')); assert(!JSON.stringify(read).includes('completedAt'));
  assert.equal(JSON.stringify(next), before); assert.deepEqual(next.public, f.data.public);
});
for (const kind of ['creator', 'native'] as const) test(`PRS ${kind}: retained and ignored source series do not return as active publication items`, () => {
  const f = fixture(kind), space = f.data.spaces[f.actorId];
  const initial = readProgramPublicationSeries(space, f.documentId); assert(initial.ok);
  if (kind === 'creator') {
    const owner = space.creatorWorkspace!.executionSources![draftId], revision = owner.revisions[0];
    owner.adoption = { version: 1, selections: Object.fromEntries(revision.rows.map(row => [row.rowId, { revisionId: revision.id, disposition: row.rowId === initial.candidates[0].rowId ? 'retained' : 'active' }])) };
  } else {
    const owner = space.creatorWorkspace!.nativeExecutionSources![draftId]; owner.selections[initial.candidates[0].rowId].disposition = 'retained';
  }
  assert(validateProgramData(f.data)); const read = readProgramPublicationSeries(space, f.documentId); assert(read.ok); assert.equal(read.candidates.length, 1);
  assert.equal(read.candidates[0].source.title, '스트레칭');
  assert(!read.metadataLineIds.includes(initial.candidates[0].documentLineId));
  if (kind === 'creator') space.creatorWorkspace!.executionSources![draftId].adoption!.selections[initial.candidates[0].rowId].disposition = 'ignored';
  else space.creatorWorkspace!.nativeExecutionSources![draftId].selections[initial.candidates[0].rowId].disposition = 'ignored';
  assert(validateProgramData(f.data)); const ignored = readProgramPublicationSeries(space, f.documentId); assert(ignored.ok); assert.equal(ignored.candidates.length, 1);
});
for (const kind of ['creator', 'native'] as const) test(`PRS ${kind}: corrupt genuine owner fails closed without falling back to notes`, () => {
  const f = fixture(kind), space = f.data.spaces[f.actorId];
  if (kind === 'creator') (space.creatorWorkspace!.executionSources![draftId].revisions[0].flow.items[0] as unknown as { title: string }).title = 'tamper';
  else space.creatorWorkspace!.nativeExecutionSources![draftId].revisions[0].rows[0].itemId = 'foreign';
  const before = JSON.stringify(f.data); assert.deepEqual(readProgramPublicationSeries(space, f.documentId), { ok: false, reason: 'invalid-source' }); assert.equal(JSON.stringify(f.data), before);
});
test('PRS missing, archived and ordinary documents are distinct; new private lines are not claimed', () => {
  const f = fixture('creator'), space = f.data.spaces[f.actorId];
  space.text = M.addDocument(space.text, { title: 'ordinary' }); const other = space.text.documents.at(-1)!;
  assert.deepEqual(readProgramPublicationSeries(space, other.id), { ok: true, candidates: [], metadataLineIds: [] });
  assert.deepEqual(readProgramPublicationSeries(space, 'missing'), { ok: false, reason: 'missing-document' });
  const doc = M.getDocument(space.text, f.documentId)!; doc.lines.push({ id: 'private-note', text: 'PRIVATE-NOTE-NEVER-A-SERIES' });
  const read = readProgramPublicationSeries(space, f.documentId); assert(read.ok); assert(!JSON.stringify(read).includes('PRIVATE-NOTE')); assert(!read.metadataLineIds.includes('private-note'));
  space.archivedDocumentIds.push(f.documentId); assert.deepEqual(readProgramPublicationSeries(space, f.documentId), { ok: false, reason: 'inactive-document' });
});
test('PRS identity uses the exact origin/owner/row tuple, not a title, revision, separator or short hash', () => {
  const keys = [['creator', 'a:b', 'c'], ['creator', 'a', 'b:c'], ['native', 'a:b', 'c'], ['creator', 'a\u001fb', 'c'], ['creator', 'a', 'b\u001fc']] as const;
  assert.equal(new Set(keys.map(([kind, owner, row]) => programPublicationSeriesKey(kind, owner, row))).size, keys.length);
  const f = fixture('creator'), read = readProgramPublicationSeries(f.data.spaces[f.actorId], f.documentId); assert(read.ok);
  const copy = programClone(f.data), again = readProgramPublicationSeries(copy.spaces[f.actorId], f.documentId); assert(again.ok);
  assert.deepEqual(again.candidates.map(row => row.key), read.candidates.map(row => row.key));
});
for (const kind of ['creator', 'native'] as const) test(`PRS ${kind}: source relative start is preserved without publishing a resolved execution anchor`, () => {
  const raw = '# 운동\n- 기준일: 2026-12-01\n\n- [ ] 준비 운동\n  - 상대 날짜: D-3\n  - 반복: 매일\n  - 반복 종료: 3회';
  const f = fixture(kind, raw), before = JSON.stringify(f.data), read = readProgramPublicationSeries(f.data.spaces[f.actorId], f.documentId);
  assert(read.ok, read.ok ? '' : read.reason); assert.equal(read.candidates.length, 1);
  assert.deepEqual(read.candidates[0].source.start, { kind: 'relative', days: -3 });
  assert(!JSON.stringify(read.candidates[0].source).includes('2026-12-01')); assert(!JSON.stringify(read.candidates[0].source).includes('2026-11-28'));
  assert.equal(JSON.stringify(f.data), before);
});
test('PRS read never opens a storage port', () => {
  const f = fixture('creator'), descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'); let reads = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { reads++; throw new Error('storage forbidden'); } });
  try { const read = readProgramPublicationSeries(f.data.spaces[f.actorId], f.documentId); assert(read.ok); assert.equal(reads, 0); }
  finally { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});
for (const template of listPersonalWorkspacePocStructureTemplatePreviews()) for (const kind of ['creator', 'native'] as const) {
  test(`PRS catalog ${template.templateId} / ${kind}: every genuine series has one source candidate`, () => {
    const f = fixture(kind, template.expectedRawText), space = f.data.spaces[f.actorId], before = JSON.stringify(f.data);
    const expected = kind === 'creator' ? space.creatorWorkspace!.executionSources![draftId].revisions[0].rows.filter(row => row.kind === 'series').length
      : space.creatorWorkspace!.nativeExecutionSources![draftId].revisions[0].rows.filter(row => row.kind === 'series').length;
    const read = readProgramPublicationSeries(space, f.documentId); assert(read.ok, read.ok ? '' : read.reason);
    assert.equal(read.candidates.length, expected); assert.equal(JSON.stringify(f.data), before);
  });
}
