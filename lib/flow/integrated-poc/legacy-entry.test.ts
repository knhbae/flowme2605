import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareProgramInitialData, type ProgramLegacyInput } from './legacy-entry';
import { buildProgramCatalog } from './catalog';
import { PROGRAM_PREFIX, PROGRAM_STATE_KEY, programClone, programResult, type ProgramData } from './contract';
import { createProgramController, programSame, type ProgramExclusive } from './controller';
import { createProgramData, createProgramEnvelope, validateProgramData, validateProgramEnvelope } from './program-data';
import { loadProgramStore, type ProgramStorage } from './program-store';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramPost } from './community';
import {
  toPersonalWorkspacePocFlowItemRef, toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocMapGroupRef,
  type PersonalWorkspacePocFlow, type PersonalWorkspacePocOrigin,
} from '../personal-workspace-poc-contract';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import {
  createPersonalWorkspacePocLocalFixtureEnvelope, createPersonalWorkspacePocSourceCandidateStore,
  stagePersonalWorkspacePocSourceCandidate, resolvePersonalWorkspacePocSourceCandidateChange,
  applyPersonalWorkspacePocSourceCandidate,
} from '../personal-workspace-poc-source-candidates';

const ACTOR = 'local-user', NOW = '2026-09-12T00:00:00.000Z';
type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;

function saved(id: string, origin: PersonalWorkspacePocOrigin): PersonalWorkspacePocFlow {
  const savedCopyId = `saved-${id}`, flowId = 'same-flow', itemId = 'same-item';
  return { savedCopyId, flowId, ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId), origin, sourceSlug: id, title: '비공개 저장 계획',
    items: [{ savedCopyId, flowId, itemId, ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, itemId), sourceOrder: 0,
      title: '내 개인 할 일', description: '비공개 원문 지시', sourceDate: '2026-09-16' }] };
}
function fixture(): ProgramLegacyInput {
  const result = materializePersonalWorkspacePocAuthoring({ handoffId: 'entry-handoff', documentId: 'entry-document', revisionId: 'entry-original',
    rawText: '# 내가 작성한 원문\n- [ ] 작성한 일\n  - 날짜: 2026-09-15\n', committedAt: NOW });
  assert.ok(result.ok);
  const legacyState = createPersonalWorkspacePocState(NOW);
  legacyState.authoredFlows = [result.flow];
  legacyState.authoringReceipts = [{ handoffId: result.flow.authoring.handoffId, flowRef: result.flow.ref, committedAt: NOW }];
  const map = saved('map', 'source-backed-map');
  const mapFlow = { ...map, presentation: { mapGroup: { groupRef: toPersonalWorkspacePocMapGroupRef('real-map'), ownerId: 'real-map',
    title: '기존 Map', childOrder: 0, childCount: 1, executionState: 'executable' as const, reviewReasons: [] } } };
  return { baseModel: { version: 1, flows: [mapFlow, saved('draft', 'personal-draft'), saved('canonical', 'canonical-personal-copy'), saved('legacy', 'legacy-saved-plan')] }, legacyState };
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function assertCatalog(data: ProgramData) {
  const catalog = buildProgramCatalog('creator-minji');
  assert.ok(catalog.flows.length > 0); assert.deepEqual(data.public.flows, catalog.flows); assert.deepEqual(data.public.versions, catalog.versions);
  assert.doesNotMatch(JSON.stringify(data.public), /비공개 저장 계획|비공개 원문 지시|내가 작성한 원문/u);
}

/** Real controller/store code runs against this isolated port. Any read or
 * mutation outside the single approved program key fails the test immediately. */
class GuardedPort implements ProgramStorage {
  readonly values = new Map<string, string>();
  readonly writes: { key: string; value: string | null }[] = [];
  readonly reads: string[] = [];
  readonly protectedBefore: [string, string][];
  denyWrite = false;
  constructor(input: ProgramLegacyInput, persistedProgram?: string) {
    this.protectedBefore = [
      ['flow:operating-plan', '{ "kept": " exact  operating bytes " }'],
      ['flow:poc:personal-workspace:v1:state', JSON.stringify(input.legacyState, null, 2)],
      ['flow:poc:personal-workspace:v1:source-candidates', JSON.stringify(input.sourceCandidateStore ?? createPersonalWorkspacePocSourceCandidateStore(NOW))],
      ['flow:authoring-original', input.legacyState.authoredFlows?.[0].authoring.rawText ?? ''],
    ];
    for (const [key, value] of this.protectedBefore) this.values.set(key, value);
    if (persistedProgram !== undefined) this.values.set(PROGRAM_STATE_KEY, persistedProgram);
  }
  getItem(key: string) { assert.equal(key, PROGRAM_STATE_KEY); this.reads.push(key); return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    assert.equal(key, PROGRAM_STATE_KEY); if (this.denyWrite) throw new Error('quota');
    this.writes.push({ key, value }); this.values.set(key, value);
  }
  removeItem(key: string) { assert.equal(key, PROGRAM_STATE_KEY); this.writes.push({ key, value: null }); this.values.delete(key); }
  assertProtected() {
    for (const [key, before] of this.protectedBefore) assert.equal(this.values.get(key), before, key);
    assert.equal(this.writes.filter(write => !write.key.startsWith(PROGRAM_PREFIX)).length, 0);
  }
}
const exclusive: ProgramExclusive = async work => work();
function controller(initialData: ProgramData, storage: GuardedPort) {
  const result = createProgramController({ initialData, storage, exclusive }); assert.ok(result.ok); return result;
}
function editImportedTask(data: ProgramData) {
  const next = programClone(data), task = M.tasks(next.spaces[ACTOR].text)[0]; assert.ok(task);
  next.spaces[ACTOR].text = M.updateTask(next.spaces[ACTOR].text, task.id, { title: '새 문서에서 고친 일', date: '2026-10-01' });
  next.spaces[ACTOR].text = M.recordProgress(next.spaces[ACTOR].text, task.id, '2026-09-12', 40);
  return programResult(data, next, task.id);
}

test('E01 four saved origins and authoring are private local-user projections; catalog and frozen originals are exact', () => {
  const input = fixture(), before = JSON.stringify(input), initial = prepareProgramInitialData(freeze(input));
  assert.equal(initial.projected, true); assert.equal(initial.legacyIssue, null); assert.equal(validateProgramData(initial.data), true);
  assert.equal(initial.data.spaces[ACTOR].savedBindings.length, 5); assert.equal(M.tasks(initial.data.spaces[ACTOR].text).length, 5);
  const empty = createProgramData();
  for (const actor of ['creator-minji', 'participant-jihun']) assert.deepEqual(initial.data.spaces[actor], empty.spaces[actor]);
  assert.deepEqual(initial.data.spaces[ACTOR].copies, []); assertCatalog(initial.data); assert.equal(JSON.stringify(input), before);
  assert.equal(initial.data.spaces[ACTOR].legacySnapshot?.raw, JSON.stringify({ model: input.baseModel, state: input.legacyState }));
});

test('E02 no input and empty input seed the catalog without manufacturing a legacy bridge marker', () => {
  for (const initial of [prepareProgramInitialData(), prepareProgramInitialData({ baseModel: { version: 1, flows: [] }, legacyState: createPersonalWorkspacePocState(NOW) })]) {
    assert.equal(initial.projected, false); assert.equal(initial.legacyIssue, null); assertCatalog(initial.data);
    assert.equal(initial.data.spaces[ACTOR].legacySnapshot, null); assert.equal(initial.data.spaces[ACTOR].savedBindings.length, 0);
    assert.equal(validateProgramData(initial.data), true);
  }
});

test('E03 read-only boot does not persist until a real controller mutation; writes never reach old keys', async () => {
  const input = fixture(), initial = prepareProgramInitialData(input), port = new GuardedPort(input);
  const owner = controller(initial.data, port); assert.equal(port.writes.length, 0); assert.equal(owner.snapshot().raw, null);
  assert.equal((await owner.mutate('변경 없음', data => programResult(data, data, 'same'), { actorId: ACTOR })).ok, true);
  assert.equal(port.writes.length, 0);
  const result = await owner.mutate('개인 실행 편집', editImportedTask, { actorId: ACTOR }); assert.ok(result.ok);
  assert.equal(port.writes.length, 1); assert.equal(port.writes[0].key, PROGRAM_STATE_KEY);
  const stored = loadProgramStore(port, validateProgramEnvelope); assert.equal(stored.kind, 'ready');
  if (stored.kind === 'ready') { assert.equal(stored.envelope.data.spaces[ACTOR].savedBindings.length, 5); assertCatalog(stored.envelope.data); }
  port.assertProtected();
});

test('E04 persisted program wins over newly prepared legacy: actor, document selection and personal edits survive boot', () => {
  const input = fixture(), initial = prepareProgramInitialData(input), persisted = programClone(initial.data);
  const actor = 'participant-jihun'; persisted.activeActorId = actor;
  persisted.spaces[actor].text = M.addDocument(persisted.spaces[actor].text, { title: '이미 저장한 개인 문서' });
  const document = persisted.spaces[actor].text.documents[0];
  persisted.spaces[actor].position = { documentId: document.id, lineId: document.lines[0]?.id ?? null, start: 0, end: 0, scrollTop: 84 };
  const task = M.tasks(persisted.spaces[ACTOR].text)[0];
  persisted.spaces[ACTOR].text = M.updateTask(persisted.spaces[ACTOR].text, task.id, { title: '기존 저장 편집' });
  const envelope = createProgramEnvelope(persisted); envelope.revision = 7;
  const raw = JSON.stringify(envelope, null, 2), port = new GuardedPort(input, raw);
  const owner = controller(initial.data, port);
  assert.deepEqual(owner.snapshot(), { raw, envelope }); assert.equal(owner.snapshot().envelope.data.activeActorId, actor);
  assert.equal(owner.snapshot().envelope.data.spaces[actor].position.scrollTop, 84);
  assert.equal(owner.snapshot().envelope.data.spaces[ACTOR].text.flows.some(flow => flow.lines.some(line => line.text.includes('기존 저장 편집'))), true);
  assert.equal(port.writes.length, 0); port.assertProtected();
});

test('E05 damaged input is rejected while valid held content retains its exact snapshot and non-checkbox binding', () => {
  const bad = programClone(fixture()) as Mutable<ProgramLegacyInput>; bad.baseModel.flows[0].items[0].ref = 'bad-reference';
  const invalid = prepareProgramInitialData(bad); assert.equal(invalid.projected, false); assert.match(invalid.legacyIssue!, /^invalid/u);
  const held = programClone(fixture()) as Mutable<ProgramLegacyInput>; held.baseModel.flows[0].presentation!.mapGroup!.executionState = 'review-hold';
  const unsupported = prepareProgramInitialData(held); assert.equal(unsupported.projected, true); assert.equal(unsupported.legacyIssue, 'map-review-required');
  assert.equal(invalid.data.spaces[ACTOR].legacySnapshot, null); assert.equal(invalid.data.spaces[ACTOR].savedBindings.length, 0);
  assert(unsupported.data.spaces[ACTOR].legacySnapshot);
  const binding = unsupported.data.spaces[ACTOR].savedBindings.find(entry => entry.flowRef === held.baseModel.flows[0].ref)!;
  assert(binding); assert(!M.tasks(unsupported.data.spaces[ACTOR].text).some(task => task.docId === binding.documentId));
  for (const result of [invalid, unsupported]) { assertCatalog(result.data); assert.equal(validateProgramData(result.data), true); }
});

test('E06 mixed valid plans plus recurrence and held Map retain all old data and report both unresolved causes', () => {
  const input = programClone(fixture()) as Mutable<ProgramLegacyInput>;
  const repeating = materializePersonalWorkspacePocAuthoring({ handoffId: 'repeat-handoff', documentId: 'repeat-document', revisionId: 'repeat-version',
    rawText: '# 반복\n- [ ] 반복하는 일\n  - 날짜: 2026-09-14\n  - 반복: 매일\n  - 반복 종료: 3회\n', committedAt: NOW });
  assert.ok(repeating.ok); input.legacyState.authoredFlows = [programClone(repeating.flow) as Mutable<typeof repeating.flow>];
  input.legacyState.authoringReceipts = [{ handoffId: repeating.flow.authoring.handoffId, flowRef: repeating.flow.ref, committedAt: NOW }];
  input.baseModel.flows[0].presentation!.mapGroup!.executionState = 'review-hold';
  const before = JSON.stringify(input), initial = prepareProgramInitialData(freeze(input)), port = new GuardedPort(input);
  assert.equal(initial.projected, true); assert.match(initial.legacyIssue!, /map-review-required/u); assert.match(initial.legacyIssue!, /recurrence-window-required/u);
  assert.doesNotMatch(initial.legacyIssue!, /^invalid/u); assert(M.tasks(initial.data.spaces[ACTOR].text).length > 0);
  assert(initial.data.spaces[ACTOR].legacySnapshot); const seriesBinding = initial.data.spaces[ACTOR].savedBindings.find(binding => binding.flowRef === repeating.flow.ref)!;
  assert(seriesBinding); assert(!M.tasks(initial.data.spaces[ACTOR].text).some(task => task.docId === seriesBinding.documentId));
  controller(initial.data, port); assert.equal(port.writes.length, 0); assert.equal(JSON.stringify(input), before); port.assertProtected();
});

test('E07 persisted private Undo survives reload and restores imported bindings while public posts remain', async () => {
  const input = fixture(), initial = prepareProgramInitialData(input), port = new GuardedPort(input), first = controller(initial.data, port);
  assert.ok((await first.mutate('개인 편집', editImportedTask, { actorId: ACTOR })).ok);
  const edited = first.snapshot().envelope.data.spaces[ACTOR];
  assert.ok((await first.mutate('공개 질문', data => createProgramPost(data, { actorId: ACTOR, requestId: 'entry-public-question', kind: 'question',
    title: '독립 질문', body: '공개해도 되는 질문 내용', topic: '' }, NOW), { actorId: ACTOR })).ok);
  const reload = controller(prepareProgramInitialData().data, port);
  assert.ok(programSame(reload.snapshot(), first.snapshot()));
  assert.equal(reload.snapshot().envelope.undo[ACTOR].length, 1);
  assert.ok((await reload.undo(ACTOR)).ok);
  assert.ok(programSame(reload.snapshot().envelope.data.spaces[ACTOR], initial.data.spaces[ACTOR]));
  assert.equal(reload.snapshot().envelope.data.public.posts.length, 1); assert.equal(reload.snapshot().envelope.data.public.posts[0].title, '독립 질문');
  assertCatalog(reload.snapshot().envelope.data);
  assert.ok((await reload.redo(ACTOR)).ok); assert.ok(programSame(reload.snapshot().envelope.data.spaces[ACTOR], edited));
  const again = controller(prepareProgramInitialData().data, port); assert.deepEqual(again.snapshot(), reload.snapshot());
  assert.equal(again.snapshot().envelope.data.spaces[ACTOR].savedBindings.length, 5); port.assertProtected();
});

test('E08 a corrupt persisted program is never replaced by a valid fresh legacy projection', () => {
  const input = fixture(), port = new GuardedPort(input, '{broken stored program');
  assert.deepEqual(createProgramController({ initialData: prepareProgramInitialData(input).data, storage: port, exclusive }), { ok: false, reason: 'corrupt' });
  assert.equal(port.values.get(PROGRAM_STATE_KEY), '{broken stored program'); assert.equal(port.writes.length, 0); port.assertProtected();
});

test('E09 failed first write retains initial projection in memory and a retry writes the exact protected bridge', async () => {
  const input = fixture(), initial = prepareProgramInitialData(input), port = new GuardedPort(input), owner = controller(initial.data, port);
  port.denyWrite = true; const failed = await owner.mutate('개인 편집', editImportedTask, { actorId: ACTOR }); assert.equal(failed.ok, false);
  assert.equal(owner.snapshot().raw, null); assert.ok(programSame(owner.snapshot().envelope.data, initial.data));
  assert.equal(port.values.has(PROGRAM_STATE_KEY), false); port.assertProtected();
  port.denyWrite = false; assert.ok((await owner.mutate('재시도', editImportedTask, { actorId: ACTOR })).ok);
  assert.equal(owner.snapshot().envelope.data.spaces[ACTOR].legacySnapshot!.raw, initial.data.spaces[ACTOR].legacySnapshot!.raw);
  assert.equal(port.writes.length, 1); port.assertProtected();
});

test('E10 entry forwards accepted source candidates through projection and durable controller reload', async () => {
  const input = fixture(), original = input.legacyState.authoredFlows![0];
  const candidate = createPersonalWorkspacePocLocalFixtureEnvelope(original, { candidateId: 'entry-candidate', incomingRevisionId: 'entry-current',
    incomingRawText: '# 실제 반영 판본\n- [ ] 바뀐 일\n  - 날짜: 2026-09-23\n', createdAt: NOW });
  assert.ok(candidate.ok);
  let store = stagePersonalWorkspacePocSourceCandidate(createPersonalWorkspacePocSourceCandidateStore(NOW), candidate.envelope, candidate.current, NOW).store;
  for (const change of candidate.envelope.changes) store = resolvePersonalWorkspacePocSourceCandidateChange(store, {
    candidateId: candidate.envelope.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW,
  }).store;
  const applied = applyPersonalWorkspacePocSourceCandidate(store, { candidateId: candidate.envelope.candidateId, current: candidate.current, now: NOW });
  assert.equal(applied.code, 'applied'); input.sourceCandidateStore = applied.store;
  const before = JSON.stringify(input), initial = prepareProgramInitialData(freeze(input));
  assert.equal(initial.projected, true); assert.equal(initial.legacyIssue, null);
  assert.ok(M.tasks(initial.data.spaces[ACTOR].text).some(task => task.title === '바뀐 일' && task.date === '2026-09-23'));
  const port = new GuardedPort(input), owner = controller(initial.data, port);
  assert.ok((await owner.mutate('저장', editImportedTask, { actorId: ACTOR })).ok);
  const reload = controller(prepareProgramInitialData().data, port), snapshot = reload.snapshot().envelope.data.spaces[ACTOR].legacySnapshot!;
  assert.deepEqual(JSON.parse(snapshot.raw).sourceCandidateStore, applied.store);
  assert.equal(JSON.parse(snapshot.raw).state.authoredFlows[0].authoring.rawText, original.authoring.rawText);
  assert.equal(JSON.stringify(input), before); assertCatalog(reload.snapshot().envelope.data); port.assertProtected();
});
