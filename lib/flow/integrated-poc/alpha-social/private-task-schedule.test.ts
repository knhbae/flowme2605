import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramPublicItem, type ProgramTransition } from '../contract';
import { createProgramData, validateProgramData } from '../program-data';
import { publishProgramFlow } from '../publication';
import { importProgramPublicVersion, setProgramCopyAnchor, setProgramCopyInclusion, updateProgramTask, createProgramDocument, linkProgramTask } from '../private-space';
import { textWorkspaceModel as M } from '../text-workspace';
import { parseAuthoringRecurrenceRule } from '../native-creator-vendor/text-authoring/recurrence';
import { programPublicRecurrenceFromAuthoring } from '../public-recurrence-contract';
import { ALPHA_SOCIAL_COMMAND_SCHEMA, isAlphaSocialCommand, isAlphaSocialIntent } from './contract';
import { alphaSocialAllowedFields, executeAlphaSocialIntent } from './dispatch';
import { applyAlphaPrivateTaskSchedule, resolveAlphaPrivateTaskSchedule, type AlphaPrivateTaskScheduleIntent } from './private-task-schedule';
import { isM3Command } from '../alpha-sync/contract';
import { captureAlphaAccount, commandFromProgramTransition } from '../alpha-persistence/program-adapter';
import { createProgramEnvelope } from '../program-data';
import { createTextAuthoringDocument } from '../native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner } from '../native-creator-document';
import { setProgramCreatorWorking, applyProgramCreatorAction } from '../creator-workspace';
import { inspectProgramNativeCreatorHandoff, applyProgramNativeCreatorHandoff } from '../creator-native-execution-adapter';
import { fingerprintPersonalWorkspacePocAuthoringSource } from '../../personal-workspace-poc-authoring';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles } from '../../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../../personal-workspace-poc-state';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from '../legacy-snapshot';
import { programLegacyTaskQualityHold } from '../legacy-map-review';
import { programReferenceExecutionAccess } from '../reference-execution-guard';

const now = '2026-10-02T12:00:00.000Z';
function ok<T>(value: ProgramTransition<T>) { assert(value.ok, value.ok ? '' : value.reason); return value; }
function fixture(ordinaryOnly = false) {
  let data = createProgramData(); const actorId = data.activeActorId;
  const parsed = parseAuthoringRecurrenceRule({ raw: '매일', repeatEnd: '3회', sourceRowIds: [], executionCondition: '' }); assert(parsed.ok);
  const rule = programPublicRecurrenceFromAuthoring(parsed.rule); assert(rule);
  const items: ProgramPublicItem[] = [
      { id: 'relative', title: 'Relative', description: 'Original', completionCriteria: 'Done', sourceUrl: null,
        schedule: { kind: 'relative', days: 0 }, subchecks: [{ id: 'check', title: 'Child check' }] },
      { id: 'fixed', title: 'Fixed', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'fixed', date: '2026-10-20' }, subchecks: [] },
      { id: 'undated', title: 'Undated', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] },
      { id: 'series', title: 'Series', description: '', completionCriteria: '', sourceUrl: null,
        schedule: { kind: 'recurring', version: 1, rule, start: { kind: 'fixed', date: '2026-10-10' }, time: null, timeZone: 'Asia/Seoul' }, subchecks: [] },
    ];
  const selectedItems = ordinaryOnly ? items.filter(item => item.schedule.kind !== 'recurring') : items;
  const published = ok(publishProgramFlow(data, { actorId, requestId: 'source', title: 'Source', summary: 'Original summary', category: 'Test', situations: [],
    source: { kind: 'user-text', label: 'Source', url: null, checkedAt: null }, items: selectedItems }, now));
  data = published.data;
  const imported = ok(importProgramPublicVersion(data, { actorId, requestId: 'import', expectedSpace: data.spaces[actorId],
    versionId: published.result, itemIds: selectedItems.map(item => item.id), anchor: '2026-10-10' }));
  const copy = imported.data.spaces[actorId].copies[0], taskId = copy.itemLines.relative;
  const intent: AlphaPrivateTaskScheduleIntent = { type: 'private-task-schedule', copyId: copy.id, itemId: 'relative', taskId, date: '2026-10-01', time: '09:30' };
  return { data: imported.data, actorId, copy, taskId, intent };
}
const task = (data: ProgramData, actorId: string, taskId: string) => M.tasks(data.spaces[actorId].text).find(row => row.id === taskId)!;
const run = (f: ReturnType<typeof fixture>, intent = f.intent, id = 'schedule') => executeAlphaSocialIntent(f.data, f.actorId, intent, id, now);

test('PS01 exact schedule wire permits canonical dates and times only', () => {
  const f = fixture(); assert(isAlphaSocialIntent(f.intent));
  for (const time of ['', '00:00', '09:30', '23:59']) assert(isAlphaSocialIntent({ ...f.intent, date: null, time }));
  for (const patch of [{ date: '' }, { date: '2026-02-30' }, { date: undefined }, { time: null }, { time: '9:30' }, { time: '24:00' },
    { time: '12:60' }, { time: ' 09:30' }, { time: '09:30\n' }, { time: [] }, { copyId: '' }, { itemId: '__proto__' }, { taskId: '' },
    { patch: { date: null } }, { itemIds: ['relative', 'fixed'] }, { ownerId: f.actorId }, { now }, { expectedSpace: f.data.spaces[f.actorId] }]) {
    assert(!isAlphaSocialIntent({ ...f.intent, ...patch }), JSON.stringify(patch));
  }
  for (const key of ['copyId', 'itemId', 'taskId', 'date', 'time']) { const value = { ...f.intent } as Record<string, unknown>; delete value[key]; assert(!isAlphaSocialIntent(value)); }
  const command = { schema: ALPHA_SOCIAL_COMMAND_SCHEMA, kind: 'social', requestId: 'schedule', expectedRevision: 0, expectedPublicRevision: 0, intent: f.intent };
  assert(isAlphaSocialCommand(command)); assert(!isAlphaSocialCommand({ ...command, changes: [] }));
  assert(!isAlphaSocialCommand({ ...command, schema: 'flowme-alpha-social-command/2' }));
  assert.deepEqual(alphaSocialAllowedFields(f.intent), { private: ['text', 'copies'], public: [] });
});

test('PS02 schedule reuses the existing task transition and changes only one private Item', () => {
  const f = fixture(), before = programClone(f.data), result = ok(run(f));
  const expected = ok(updateProgramTask(f.data, { actorId: f.actorId, requestId: 'schedule', expectedSpace: f.data.spaces[f.actorId],
    taskId: f.taskId, patch: { date: f.intent.date, time: f.intent.time } }));
  assert.deepEqual(result.data.spaces[f.actorId].copies, expected.data.spaces[f.actorId].copies);
  assert.equal(M.raw(result.data.spaces[f.actorId].text.flows[0]), M.raw(expected.data.spaces[f.actorId].text.flows[0]));
  assert.deepEqual(result.data.receipts, expected.data.receipts); assert.equal(result.result, expected.result);
  assert.deepEqual(f.data, before); assert.deepEqual(result.data.public, before.public);
  assert.equal(task(result.data, f.actorId, f.taskId).date, '2026-10-01'); assert.equal(task(result.data, f.actorId, f.taskId).time, '09:30');
  assert.equal(result.data.spaces[f.actorId].copies[0].itemOverrides.relative.date, '2026-10-01');
  const otherTasks = (data: ProgramData) => M.tasks(data.spaces[f.actorId].text).filter(row => row.id !== f.taskId)
    .map(({ sourceIndex: _derivedIndex, ...row }) => row);
  const oldTasks = otherTasks(before), newTasks = otherTasks(result.data);
  assert.deepEqual(newTasks, oldTasks); const restored = programClone(result.data);
  restored.spaces[f.actorId].text = before.spaces[f.actorId].text; restored.spaces[f.actorId].copies = before.spaces[f.actorId].copies; restored.receipts = before.receipts;
  assert.deepEqual(restored, before);
});

test('PS03 same schedule is a no-op and the ordinary M3 copies writer stays forbidden', () => {
  const f = fixture(), unchanged = { ...f.intent, date: '2026-10-10', time: '' };
  const result = ok(run(f, unchanged)); assert(!result.changed); assert.equal(result.data, f.data);
  const { account, references } = captureAlphaAccount(createProgramEnvelope(f.data), f.actorId, f.actorId);
  const command = commandFromProgramTransition(account, references, 'm3', data => updateProgramTask(data, { actorId: f.actorId, requestId: 'm3',
    expectedSpace: data.spaces[f.actorId], taskId: f.taskId, patch: { date: f.intent.date, time: f.intent.time } }));
  assert.equal(command.kind, 'change-private'); assert(!isM3Command(command));
});

test('PS04 choosing the inherited date again keeps the explicit choice after an anchor change', () => {
  const f = fixture(), moved = ok(run(f));
  const returned = ok(executeAlphaSocialIntent(moved.data, f.actorId, { ...f.intent, date: '2026-10-10', time: '' }, 'return', now));
  const anchored = ok(setProgramCopyAnchor(returned.data, { actorId: f.actorId, requestId: 'anchor', expectedSpace: returned.data.spaces[f.actorId], copyId: f.copy.id, anchor: '2026-11-01' }));
  assert.equal(task(anchored.data, f.actorId, f.taskId).date, '2026-10-10');
  assert.equal(anchored.data.spaces[f.actorId].copies[0].itemOverrides.relative.date, '2026-10-10');
  assert.deepEqual(anchored.data.public, f.data.public);
});

test('PS05 fixed and undated ordinary source Items use the same exact locator', () => {
  const f = fixture();
  for (const itemId of ['fixed', 'undated']) {
    const taskId = f.copy.itemLines[itemId], intent = { ...f.intent, itemId, taskId, date: null, time: '23:59' };
    const result = ok(run(f, intent, itemId)); assert.equal(task(result.data, f.actorId, taskId).date, null); assert.equal(task(result.data, f.actorId, taskId).time, '23:59');
  }
});

test('PS06 bad, foreign, wrong-document and broad locators perform zero mutation', () => {
  const f = fixture();
  for (const patch of [{ copyId: 'missing' }, { itemId: 'fixed' }, { taskId: f.copy.itemLines.fixed }, { taskId: 'missing' },
    { itemId: 'series', taskId: f.copy.itemLines.series }, { taskId: f.copy.subcheckLines.relative.check }]) {
    const result = run(f, { ...f.intent, ...patch }); assert(!result.ok); assert.equal(result.data, f.data);
  }
  const foreign = executeAlphaSocialIntent(f.data, 'creator-minji', f.intent, 'foreign', now); assert(!foreign.ok); assert.equal(foreign.data, f.data);
  const created = ok(createProgramDocument(f.data, { actorId: f.actorId, requestId: 'doc', expectedSpace: f.data.spaces[f.actorId], title: 'References' }));
  const linked = ok(linkProgramTask(created.data, { actorId: f.actorId, requestId: 'link', expectedSpace: created.data.spaces[f.actorId], documentId: created.result, taskId: f.taskId }));
  assert.equal(resolveAlphaPrivateTaskSchedule(linked.data, f.actorId, linked.result), null);
  assert.deepEqual(resolveAlphaPrivateTaskSchedule(linked.data, f.actorId, f.taskId), { copyId: f.copy.id, itemId: 'relative', taskId: f.taskId });
});

test('PS07 excluded, archived, trash and retained execution cannot save schedule', () => {
  const f = fixture(), excluded = ok(setProgramCopyInclusion(f.data, { actorId: f.actorId, requestId: 'exclude', expectedSpace: f.data.spaces[f.actorId], copyId: f.copy.id, itemId: 'relative', included: false }));
  const cases = [excluded.data, programClone(f.data), programClone(f.data)];
  cases[1].spaces[f.actorId].archivedDocumentIds.push(f.copy.documentId);
  cases[2].spaces[f.actorId].archivedDocumentIds.push(f.copy.documentId); cases[2].spaces[f.actorId].documentTrash = { [f.copy.documentId]: { trashedAt: now, wasArchived: false } };
  for (const data of cases) { assert(validateProgramData(data)); const result = executeAlphaSocialIntent(data, f.actorId, f.intent, 'blocked', now); assert(!result.ok); assert.equal(result.data, data); }
  const retained = programClone(f.data), space = retained.spaces[f.actorId], doc = space.text.flows[0];
  const created = ok(createProgramDocument(retained, { actorId: f.actorId, requestId: 'retention', expectedSpace: space, title: 'Retained' }));
  const target = created.data.spaces[f.actorId]; target.retentionDocuments = { [f.copy.documentId]: created.result }; target.archivedDocumentIds.push(created.result);
  target.text.documents.find(row => row.id === created.result)!.lines = doc.lines; target.text.flows[0].lines = [];
  assert(validateProgramData(created.data)); const result = executeAlphaSocialIntent(created.data, f.actorId, f.intent, 'retained', now); assert(!result.ok); assert.equal(result.data, created.data);
});

test('PS08 duplicate copy locators and competing legacy source owners fail closed', () => {
  const f = fixture(true); assert(validateProgramData(f.data));
  for (const mode of ['item', 'copy', 'saved'] as const) {
    const data = programClone(f.data), space = data.spaces[f.actorId];
    if (mode === 'item') space.copies[0].itemLines.ambiguous = f.taskId;
    if (mode === 'copy') space.copies.push({ ...programClone(f.copy), id: 'second-copy' });
    if (mode === 'saved') space.savedBindings.push({ savedCopyId: 'saved', flowId: 'source', flowRef: 'source', sourceRevision: 'revision', documentId: f.copy.documentId, itemLines: { ordinary: f.taskId } });
    assert(validateProgramData(data), mode);
    assert.equal(resolveAlphaPrivateTaskSchedule(data, f.actorId, f.taskId), null);
    const result = executeAlphaSocialIntent(data, f.actorId, f.intent, mode, now); assert(!result.ok); assert.equal(result.data, data);
  }
});

test('PS09 stale expected private space is rejected by the existing mutation guard', () => {
  const f = fixture(), stale = programClone(f.data.spaces[f.actorId]); stale.position.scrollTop++;
  const result = applyAlphaPrivateTaskSchedule(f.data, { ...f.intent, actorId: f.actorId, requestId: 'stale', expectedSpace: stale });
  assert(!result.ok && result.reason === 'conflict'); assert.equal(result.data, f.data);
});

test('PS10 genuine native tasks and a competing native/public source index cannot use this writer', () => {
  const f = fixture(), raw = '# Native\n- [ ] Native task\n  - 날짜: 2026-10-12';
  const document = createTextAuthoringDocument(raw, { documentId: 'native-source', ownership: 'creator', now });
  const source = { storageKey: 'flow:text-authoring:drafts:v1' as const, draftId: 'original-native', versionId: 'native-version',
    revisionId: document.revision.revisionId, documentJson: JSON.stringify(document) };
  const owned = createNativeCreatorDocumentOwner({ id: 'native-draft', source }, now); assert(owned.ok);
  const working = { draftId: 'native-draft', title: 'Native source', rawText: raw, baseRecordRevision: null,
    nativeDocument: owned.owner, nativeSelection: source };
  const staged = ok(setProgramCreatorWorking(f.data, { actorId: f.actorId, expectedWorking: null, working }, now));
  const saved = ok(applyProgramCreatorAction(staged.data, { actorId: f.actorId, requestId: 'save-native', expectedStructure: null,
    expectedNativeDocument: working.nativeDocument, expectedNativeSelection: working.nativeSelection,
    action: { type: 'save', draftId: working.draftId, title: working.title, rawText: raw, sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(raw),
      expectedLibraryRevision: staged.data.spaces[f.actorId].creatorWorkspace!.library.revision, now } }, now));
  const inspected = inspectProgramNativeCreatorHandoff(saved.data, { actorId: f.actorId, draftId: working.draftId }, now); assert(inspected.ok);
  const choices = Object.fromEntries(inspected.preview.rows.map(row => [row.itemId, { source: 'incoming' as const, date: 'keep' as const, time: 'keep' as const, children: 'keep' as const }]));
  const handed = ok(applyProgramNativeCreatorHandoff(saved.data, { actorId: f.actorId, requestId: 'handoff-native', preview: inspected.preview, choices }, now));
  const nativeTask = M.tasks(handed.data.spaces[f.actorId].text).find(row => row.docId === handed.result)!;
  assert.equal(resolveAlphaPrivateTaskSchedule(handed.data, f.actorId, nativeTask.id), null);
  const combined = programClone(handed.data), space = combined.spaces[f.actorId], nativeDoc = space.text.documents.find(row => row.id === handed.result)!;
  space.text.documents = space.text.documents.filter(row => row.id !== nativeDoc.id);
  space.text.flows.push({ ...nativeDoc, private: true, sourceVersion: f.copy.baseVersionId });
  const copy = space.copies[0]; copy.documentId = nativeDoc.id; copy.itemLines = { relative: nativeTask.id }; copy.subcheckLines = { relative: {} };
  copy.inheritedDates = { relative: nativeTask.date }; copy.includedItemIds = ['relative']; delete copy.recurrence;
  assert(validateProgramData(combined));
  const intent = { ...f.intent, taskId: nativeTask.id };
  assert.equal(resolveAlphaPrivateTaskSchedule(combined, f.actorId, nativeTask.id), null);
  const result = executeAlphaSocialIntent(combined, f.actorId, intent, 'ambiguous-native', now); assert(!result.ok); assert.equal(result.data, combined);
});

test('PS11 a domain-valid legacy quality hold remains rejected by the existing and narrow schedule paths', () => {
  const f = fixture(true), mapId = 'baby-health-schedule';
  const saved = buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: now, anchor: '2026-10-10' });
  const persisted = buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: now, anchor: '2026-10-10' }); assert(saved); assert(persisted);
  const keys: Record<string, string> = { [`flow:map:saved:${mapId}`]: JSON.stringify(saved), [`flow:map:persistence:${mapId}`]: JSON.stringify(persisted) };
  const read = buildPersonalWorkspacePocReadModel({ get length() { return Object.keys(keys).length; }, key: index => Object.keys(keys)[index] ?? null,
    getItem: key => keys[key] ?? null }, sourceBackedMyFlowBundles); assert(read.ok);
  const payload: ProgramLegacySnapshotPayload = { model: read.model, state: createPersonalWorkspacePocState(now) };
  assert(inspectProgramLegacySnapshotPayload(payload).ok);
  const data = programClone(f.data), space = data.spaces[f.actorId], flow = read.model.flows[0];
  space.legacySnapshot = { workspaceId: payload.state.workspaceId, revision: payload.state.revision, raw: JSON.stringify(payload) };
  // A synthetic competing index associates this canonical task with the real
  // held source. It is not a reconstruction of any user's saved profile.
  space.savedBindings.push({ savedCopyId: flow.savedCopyId, flowId: flow.flowId, flowRef: flow.ref, documentId: f.copy.documentId,
    sourceRevision: 'quality-held-source', itemLines: { [flow.items[0].ref]: f.taskId } });
  assert(validateProgramData(data)); assert(programLegacyTaskQualityHold(space, f.taskId));
  assert.equal(programReferenceExecutionAccess(space, f.taskId).kind, 'quality-hold');
  const before = JSON.stringify(data);
  const existing = updateProgramTask(data, { actorId: f.actorId, requestId: 'held-existing', expectedSpace: space,
    taskId: f.taskId, patch: { date: f.intent.date, time: f.intent.time } });
  assert(!existing.ok && existing.reason === 'unresolved'); assert.equal(existing.data, data);
  const narrow = executeAlphaSocialIntent(data, f.actorId, f.intent, 'held-private-schedule', now);
  assert(!narrow.ok && narrow.reason === 'unresolved'); assert.equal(narrow.data, data); assert.equal(JSON.stringify(data), before);
});
