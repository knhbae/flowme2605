import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData, validateProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { applyProgramLegacySourceAction, prepareProgramLegacyView, applyProgramLegacyAction } from './legacy-transaction';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { programLegacySourceChanges, sourceCanonical } from './legacy-source-lifecycle-contract';
import { readProgramLegacySourceLifecycle, transitionProgramLegacySourcePayload, type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { textWorkspaceModel as M } from './text-workspace';
import { PROGRAM_STATE_KEY } from './contract';
import { createProgramController } from './controller';
import { createProgramLegacyPort } from './legacy-port';

const NOW = '2026-09-12T10:00:00.000Z', ACTOR = 'local-user';
const RAW = '# 원본\n- [ ] 방문\n  - 날짜: 2026-09-13\n  - 시간: 10:00\n- [ ] 기록\n';
function fixture(raw = RAW) {
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'source-handoff', documentId: 'source-doc', revisionId: 'v1', rawText: raw, committedAt: NOW });
  assert.ok(made.ok);
  const state = createPersonalWorkspacePocState(NOW); state.authoredFlows = [made.flow];
  state.authoringReceipts = [{ handoffId: made.flow.authoring.handoffId, flowRef: made.flow.ref, committedAt: NOW }];
  const payload: ProgramLegacySnapshotPayload = { model: { version: 1, flows: [] }, state };
  const hydrated = hydrateProgramLegacy(createProgramData(), payload.model, state, { actorId: ACTOR, preserveUnsupported: true }); assert.ok(hydrated.ok);
  return { payload, flow: made.flow, data: hydrated.data };
}
function change(payload: ProgramLegacySnapshotPayload, action: ProgramLegacySourceAction) {
  const result = transitionProgramLegacySourcePayload(payload, action); assert.ok(result.ok, JSON.stringify(result)); return result.payload;
}
function stage(f: ReturnType<typeof fixture>, rawText: string) { return change(f.payload, { type: 'stage', flowRef: f.flow.ref, requestId: 'candidate', rawText, now: NOW }); }
function chooseAll(payload: ProgramLegacySnapshotPayload, flowRef: string, choice: 'mine' | 'incoming' = 'incoming') {
  const read = readProgramLegacySourceLifecycle(payload, flowRef); assert.ok(read.ok);
  for (const row of programLegacySourceChanges(read.owner, read.owner.reviews[0].incomingRevisionId)) payload = change(payload, { type: 'choice', flowRef, reviewId: 'candidate', changeId: row.id, choice, now: NOW });
  return payload;
}
test('K01 time-only source difference has an explicit item choice and preserves exact typed identity/raw', () => {
  const f = fixture(), original = JSON.stringify(f.payload), staged = stage(f, RAW.replace('10:00', '11:30'));
  assert.equal(JSON.stringify(f.payload), original); assert.equal(staged.sourceLifecycle!.owners[f.flow.ref].revisions['program-source:candidate'].authoring.rawText, RAW.replace('10:00', '11:30'));
  const read = readProgramLegacySourceLifecycle(staged, f.flow.ref); assert.ok(read.ok);
  const changes = programLegacySourceChanges(read.owner, 'program-source:candidate'); assert.equal(changes.length, 1); assert.equal(changes[0].itemRef, f.flow.items[0].ref);
  const applied = change(chooseAll(staged, f.flow.ref), { type: 'apply', flowRef: f.flow.ref, reviewId: 'candidate', now: NOW });
  const checked = inspectProgramLegacySnapshotPayload(JSON.parse(JSON.stringify(applied))); assert.ok(checked.ok);
  assert.equal(checked.sourceContextByFlow.get(f.flow.ref)!.get(f.flow.items[0].ref)!.attributes.time, '11:30');
  assert.equal(JSON.stringify(applied.model), JSON.stringify(f.payload.model)); assert.equal(JSON.stringify(applied.state), JSON.stringify(f.payload.state));
});
test('K02 recurrence, subchecks and mine/incoming typed properties survive selection + reload + undo', () => {
  const raw = '# 반복\n- [ ] 운동\n  - 날짜: 2026-09-13\n  - 시간: 10:00\n  - 반복: 매일\n  - 반복 종료: 5회\n  - [ ] 물 마시기\n';
  const f = fixture(raw), staged = stage(f, raw.replace('매일', '매주 월,수').replace('물 마시기', '물 챙기기'));
  const applied = change(chooseAll(staged, f.flow.ref), { type: 'apply', flowRef: f.flow.ref, reviewId: 'candidate', now: NOW });
  const checked = inspectProgramLegacySnapshotPayload(JSON.parse(JSON.stringify(applied))); assert.ok(checked.ok);
  const attrs = checked.sourceContextByFlow.get(f.flow.ref)!.get(f.flow.items[0].ref)!.attributes;
  assert.equal(attrs.recurrence, '매주 월,수'); assert.equal(attrs.time, '10:00'); assert.ok(JSON.stringify(attrs.subchecks).includes('물 챙기기'));
  const undone = change(applied, { type: 'undo', flowRef: f.flow.ref, now: NOW });
  const reread = readProgramLegacySourceLifecycle(undone, f.flow.ref); assert.ok(reread.ok); assert.equal(reread.projection.contexts.get(f.flow.items[0].ref)!.attributes.recurrence, '매일');
  const kept = change(chooseAll(staged, f.flow.ref, 'mine'), { type: 'apply', flowRef: f.flow.ref, reviewId: 'candidate', now: NOW });
  const mine = readProgramLegacySourceLifecycle(kept, f.flow.ref); assert.ok(mine.ok); assert.equal(mine.projection.contexts.get(f.flow.items[0].ref)!.attributes.recurrence, '매일');
});
test('K03 removed source item remains retained with personal records; source line shift never title-zips IDs', () => {
  const f = fixture(), removed = f.flow.items[1].ref;
  f.payload.state.completions[removed] = { status: 'completed', completedAt: NOW };
  const applied = change(chooseAll(stage(f, RAW.replace('- [ ] 기록\n', '')), f.flow.ref), { type: 'apply', flowRef: f.flow.ref, reviewId: 'candidate', now: NOW });
  assert.deepEqual(applied.sourceLifecycle!.owners[f.flow.ref].effective.retainedItemRefs, [removed]); assert.deepEqual(applied.state.completions, f.payload.state.completions);
  const shifted = stage(f, RAW.replace('# 원본\n', '# 원본\n\n'));
  const owner = shifted.sourceLifecycle!.owners[f.flow.ref], changes = programLegacySourceChanges(owner, 'program-source:candidate');
  assert.equal(changes.filter(row => row.kind === 'added').length, 2); assert.equal(changes.filter(row => row.kind === 'removed').length, 2);
});
test('K04 missing choices, stale review and forged materializer mapping fail without mutation', () => {
  const f = fixture(), staged = stage(f, RAW.replace('10:00', '11:30'));
  const noChoice = transitionProgramLegacySourcePayload(staged, { type: 'apply', flowRef: f.flow.ref, reviewId: 'candidate', now: NOW }); assert.equal(noChoice.ok, false); assert.equal(noChoice.payload, staged);
  const tampered = JSON.parse(JSON.stringify(staged)); const incoming = tampered.sourceLifecycle.owners[f.flow.ref].revisions['program-source:candidate'];
  const key = Object.keys(incoming.authoring.sourceLineItemIdentityMap)[0]; incoming.authoring.sourceLineItemIdentityMap[key].itemId = 'guessed';
  assert.equal(inspectProgramLegacySnapshotPayload(tampered).ok, false);
});
test('K05 one Program source transaction preserves personal title/memo/date/folder/public and new documents', () => {
  const f = fixture(); let data = f.data;
  const binding = data.spaces[ACTOR].savedBindings[0], lineId = binding.itemLines[f.flow.items[0].ref];
  data.spaces[ACTOR].text = M.updateTask(data.spaces[ACTOR].text, lineId, { title: '내 제목', note: '내 메모', date: '2026-10-02' });
  data.spaces[ACTOR].text = M.addDocument(data.spaces[ACTOR].text, { title: '추가 개인 문서' });
  const initial = sourceCanonical(data), actions: ProgramLegacySourceAction[] = [{ type: 'stage', flowRef: f.flow.ref, requestId: 'candidate', rawText: RAW.replace('10:00', '11:30'), now: NOW }];
  function commit(action: ProgramLegacySourceAction) {
    const view = prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW, onlyFlowRef: f.flow.ref }); assert.ok(view.ok, JSON.stringify(view));
    const result = applyProgramLegacySourceAction(data, { actorId: ACTOR, expectedToken: view.token, action }); assert.ok(result.transition.ok, JSON.stringify(result)); data = result.transition.data;
  }
  commit(actions[0]);
  const source = readProgramLegacySourceLifecycle(JSON.parse(data.spaces[ACTOR].legacySnapshot!.raw), f.flow.ref); assert.ok(source.ok);
  for (const row of programLegacySourceChanges(source.owner, 'program-source:candidate')) commit({ type: 'choice', flowRef: f.flow.ref, reviewId: 'candidate', changeId: row.id, choice: 'incoming', now: NOW });
  commit({ type: 'apply', flowRef: f.flow.ref, reviewId: 'candidate', now: NOW });
  const task = M.tasks(data.spaces[ACTOR].text).find(row => row.id === lineId)!;
  assert.equal(task.title, '내 제목'); assert.equal(task.note, '내 메모'); assert.equal(task.date, '2026-10-02'); assert.equal(task.time, '11:30');
  assert.equal(data.spaces[ACTOR].text.documents.at(-1)!.title, '추가 개인 문서'); assert.equal(validateProgramData(data), true); assert.notEqual(sourceCanonical(data), initial);
  commit({ type: 'undo', flowRef: f.flow.ref, now: NOW }); assert.equal(M.tasks(data.spaces[ACTOR].text).find(row => row.id === lineId)!.time, '10:00');
});
test('K06 ordinary transactions work beside series metadata and cannot change its ordinary completion', () => {
  const f = fixture('# 계획\n- [ ] 반복\n  - 날짜: 2026-09-13\n  - 반복: 매일\n  - 반복 종료: 5회\n- [ ] 일반\n');
  const view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok, JSON.stringify(view));
  const denied = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW, executionDate: '2026-09-12', action: { type: 'complete', itemRef: f.flow.items[0].ref, completed: true, now: NOW } });
  assert.equal(denied.transition.ok, false); assert.equal(denied.transition.data, f.data);
  const ordinary = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW, executionDate: '2026-09-12', action: { type: 'complete', itemRef: f.flow.items[1].ref, completed: true, now: NOW } }); assert.ok(ordinary.transition.ok, JSON.stringify(ordinary));
});
test('K07 explicit source Undo retains added item, later personal records and exact item identity', () => {
  const f = fixture(); let data = f.data;
  const commit = (action: ProgramLegacySourceAction, expected = true) => {
    const view = prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW, onlyFlowRef: f.flow.ref }); assert.ok(view.ok, JSON.stringify(view));
    const result = applyProgramLegacySourceAction(data, { actorId: ACTOR, expectedToken: view.token, action }); assert.equal(result.transition.ok, expected, JSON.stringify({ action, issues: result.issues, conflicts: result.conflicts }));
    if (result.transition.ok) data = result.transition.data; else assert.equal(result.transition.data, data);
    return result;
  };
  commit({ type: 'stage', flowRef: f.flow.ref, requestId: 'candidate', rawText: RAW.replace('10:00', '11:30') + '- [ ] 새 항목\n', now: NOW });
  const read = readProgramLegacySourceLifecycle(JSON.parse(data.spaces[ACTOR].legacySnapshot!.raw), f.flow.ref); assert.ok(read.ok);
  const changes = programLegacySourceChanges(read.owner, 'program-source:candidate'), added = changes.find(row => row.kind === 'added')!.itemRef!;
  for (const row of changes) commit({ type: 'choice', flowRef: f.flow.ref, reviewId: 'candidate', changeId: row.id, choice: 'incoming', now: NOW });
  commit({ type: 'apply', flowRef: f.flow.ref, reviewId: 'candidate', now: NOW });
  const binding = data.spaces[ACTOR].savedBindings[0], line = binding.itemLines[added]; assert.ok(line);
  data.spaces[ACTOR].text = M.updateTask(data.spaces[ACTOR].text, line, { title: '새 항목 개인 제목', note: '기록 보존', date: '2026-10-04' });
  data.spaces[ACTOR].text = M.recordProgress(data.spaces[ACTOR].text, line, '2026-09-12', 65);
  const before = sourceCanonical(data);
  commit({ type: 'undo', flowRef: f.flow.ref, now: NOW }, false); assert.equal(sourceCanonical(data), before);
  commit({ type: 'undo', flowRef: f.flow.ref, now: NOW, retainAddedItemRefs: ['forged'] }, false); assert.equal(sourceCanonical(data), before);
  commit({ type: 'undo', flowRef: f.flow.ref, now: NOW, retainAddedItemRefs: [added] });
  const after = M.tasks(data.spaces[ACTOR].text).find(row => row.id === line)!;
  assert.equal(after.title, '새 항목 개인 제목'); assert.equal(after.note, '기록 보존'); assert.equal(after.date, '2026-10-04'); assert.equal(M.latestProgress(data.spaces[ACTOR].text, line)!.percent, 65);
  const checked = inspectProgramLegacySnapshotPayload(JSON.parse(data.spaces[ACTOR].legacySnapshot!.raw)); assert.ok(checked.ok);
  assert.equal(checked.sourceContextByFlow.get(f.flow.ref)!.get(f.flow.items[0].ref)!.attributes.time, '10:00');
  assert.ok(checked.payload.sourceLifecycle!.owners[f.flow.ref].effective.retainedItemRefs.includes(added));
  assert.equal(data.spaces[ACTOR].savedBindings[0].itemLines[added], line); assert.equal(validateProgramData(JSON.parse(JSON.stringify(data))), true);
});
test('K08 real controller quota failure/CAS/retry/reload uses one Program key and preserves operating bytes', async () => {
  const f = fixture(), values = new Map<string, string>([['flow:operating', 'exact bytes'], ['flow:poc:personal-workspace:v1:state', 'old shadow bytes']]);
  const calls: string[] = []; let quota = true;
  const storage = { getItem: (key: string) => { assert.equal(key, PROGRAM_STATE_KEY); return values.get(key) ?? null; },
    setItem: (key: string, raw: string) => { assert.equal(key, PROGRAM_STATE_KEY); calls.push(key); if (quota) throw new Error('QuotaExceededError'); values.set(key, raw); },
    removeItem: (key: string) => { assert.equal(key, PROGRAM_STATE_KEY); calls.push(key); values.delete(key); } };
  const controller = createProgramController({ initialData: f.data, storage, exclusive: async work => work() }); assert.ok(controller.ok);
  const port = createProgramLegacyPort({ actorId: ACTOR, readData: () => controller.snapshot().envelope.data, mutate: (label, build, options) => controller.mutate(label, build, { actorId: ACTOR, ...options }) });
  const view = port.read(NOW, f.flow.ref); assert.ok(view.ok);
  const action: ProgramLegacySourceAction = { type: 'stage', flowRef: f.flow.ref, requestId: 'retry-same-id', rawText: RAW.replace('10:00', '11:30'), now: NOW };
  const failed = await port.commitSource({ expectedToken: view.token, action }); assert.equal(failed.ok, false);
  assert.equal(values.has(PROGRAM_STATE_KEY), false); assert.equal(controller.snapshot().envelope.data.spaces[ACTOR].legacySnapshot!.raw, f.data.spaces[ACTOR].legacySnapshot!.raw);
  quota = false; const retry = await port.commitSource({ expectedToken: view.token, action }); assert.ok(retry.ok); const stored = values.get(PROGRAM_STATE_KEY), count = calls.length;
  const stale = await port.commitSource({ expectedToken: view.token, action: { ...action, requestId: 'different-request' } }); assert.equal(stale.ok, false); assert.equal(calls.length, count); assert.equal(values.get(PROGRAM_STATE_KEY), stored);
  const latest = port.read(NOW, f.flow.ref); assert.ok(latest.ok);
  const duplicate = await port.commitSource({ expectedToken: latest.token, action }); assert.ok(duplicate.ok); assert.equal(calls.length, count);
  const reloaded = createProgramController({ initialData: createProgramData(), storage, exclusive: async work => work() }); assert.ok(reloaded.ok);
  const source = readProgramLegacySourceLifecycle(JSON.parse(reloaded.snapshot().envelope.data.spaces[ACTOR].legacySnapshot!.raw), f.flow.ref); assert.ok(source.ok);
  assert.equal(source.owner.reviews.length, 1); assert.equal(source.owner.reviews[0].status, 'pending'); assert.equal(source.owner.revisions['program-source:retry-same-id'].authoring.rawText, action.rawText);
  assert.equal(values.get('flow:operating'), 'exact bytes'); assert.equal(values.get('flow:poc:personal-workspace:v1:state'), 'old shadow bytes'); assert.deepEqual([...new Set(calls)], [PROGRAM_STATE_KEY]);
});
test('K09 candidate stale choices, malformed raw and unapproved source-store changes are atomic', () => {
  const f = fixture(), staged = stage(f, RAW.replace('10:00', '11:30'));
  const second = change(staged, { type: 'stage', flowRef: f.flow.ref, requestId: 'other', rawText: RAW.replace('10:00', '12:30'), now: NOW });
  const applied = change(chooseAll(second, f.flow.ref), { type: 'apply', flowRef: f.flow.ref, reviewId: 'candidate', now: NOW });
  const stale = transitionProgramLegacySourcePayload(applied, { type: 'apply', flowRef: f.flow.ref, reviewId: 'other', now: NOW }); assert.equal(stale.ok, false); assert.equal(stale.payload, applied);
  const invalid = transitionProgramLegacySourcePayload(f.payload, { type: 'stage', flowRef: f.flow.ref, requestId: 'bad', rawText: '원문 없는 일반 문장을 변환 완료로 주장하지 않음', now: NOW }); assert.equal(invalid.ok, false); assert.equal(invalid.payload, f.payload);
  const made = JSON.parse(JSON.stringify(staged)); made.sourceLifecycle.owners[f.flow.ref].effective.itemRevisions.foreign = 'v1'; assert.equal(inspectProgramLegacySnapshotPayload(made).ok, false);
});
