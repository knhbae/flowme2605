import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { PERSONAL_WORKSPACE_POC_VERSION } from '../personal-workspace-poc-contract';
import { createProgramData, validateProgramData } from './program-data';
import { programClone, PROGRAM_STATE_KEY, type ProgramTransition } from './contract';
import { createProgramController } from './controller';
import { readProgramExecutionOccurrences, readProgramOccurrencePeriod, updateProgramOccurrenceExecution } from './recurrence-state';
import { isProgramRecurrenceExecutionState } from './recurrence-state-validation';
import { hydrateProgramLegacy } from './legacy-projection';
import { archiveProgramDocument, createProgramDocument } from './private-space';
import { setProgramDocumentTrashed } from './document-lifecycle';
import { createPersonalWorkspacePocLocalFixtureEnvelope, createPersonalWorkspacePocSourceCandidateStore, stagePersonalWorkspacePocSourceCandidate, resolvePersonalWorkspacePocSourceCandidateChange, applyPersonalWorkspacePocSourceCandidate } from '../personal-workspace-poc-source-candidates';
const now = '2026-09-12T00:00:00.000Z';
function ok<T>(value: ProgramTransition<T>) { if (!value.ok) assert.fail(value.reason); return value; }
function fixture(end = '60회', title = '반복 Flow') {
  const materialized = materializePersonalWorkspacePocAuthoring({ handoffId: 'recurrence-state-handoff', documentId: 'recurrence-state-doc', revisionId: 'recurrence-state-v1', committedAt: now,
    rawText: `# ${title}\r\n- [ ] 반복 준비\r\n  - 날짜: 2026-09-03\r\n  - 반복: 매일` + (end ? `\r\n  - 반복 종료: ${end}` : '') });
  assert(materialized.ok); if (!materialized.ok) throw new Error('fixture');
  const payload = { model: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [materialized.flow] }, state: createPersonalWorkspacePocState(now) };
  const data = createProgramData(), actorId = data.activeActorId;
  data.spaces[actorId].legacySnapshot = { workspaceId: payload.state.workspaceId, revision: payload.state.revision, raw: JSON.stringify(payload) };
  assert(validateProgramData(data));
  return { data, input: { actorId, flowRef: materialized.flow.ref, localToday: '2026-09-12' }, payload };
}
function read(...args: Parameters<typeof readProgramExecutionOccurrences>) { const value = readProgramExecutionOccurrences(...args); if (!value.ok) assert.fail(value.reason); return value; }

test('projected legacy source document archive/trash/retention blocks stale occurrence writes but preserves read/records and restores execution',()=>{
 const f=fixture('60회'),actorId=f.input.actorId,projected=ok(hydrateProgramLegacy(createProgramData(),f.payload.model,f.payload.state,{actorId,preserveUnsupported:true})).data;
 const binding=projected.spaces[actorId].savedBindings.find(b=>b.flowRef===f.input.flowRef)!;assert(binding);const row=read(projected,f.input).rows[0];
 const saved=ok(updateProgramOccurrenceExecution(projected,{...f.input,identity:row.identity,expected:null,changes:{schedule:{mode:'fixed_date',date:'2026-11-01'},completion:{status:'completed',completedAt:now}}})).data;
 for(const kind of ['archived','trash','retention'] as const){let data=ok(archiveProgramDocument(saved,{actorId,requestId:`recurrence-lock-${kind}`,expectedSpace:saved.spaces[actorId],documentId:binding.documentId})).data;
 if(kind==='trash')data=ok(setProgramDocumentTrashed(data,{actorId,requestId:'recurrence-trash',expectedSpace:data.spaces[actorId],documentId:binding.documentId,trashed:true,now})).data;
 if(kind==='retention'){
  // Retention targets are plain documents; preserve the actual canonical line IDs when moving the source block to the retained document.
  const created=ok(createProgramDocument(data,{actorId,requestId:'recurrence-retained',expectedSpace:data.spaces[actorId],title:'복구 보관'}));data=created.data;const s=data.spaces[actorId],source=s.text.flows.find(d=>d.id===binding.documentId)!;s.text.documents.find(d=>d.id===created.result)!.lines=source.lines;source.lines=[];s.archivedDocumentIds.push(created.result);s.retentionDocuments={[binding.documentId]:created.result};
 }
 assert(validateProgramData(data));const raw=JSON.stringify(data),locked=read(data,f.input).rows[0];assert.equal(locked.flowInactive,true);assert.equal(locked.key,row.key);assert.equal(locked.completion,'completed');assert.equal(locked.executionDate,'2026-11-01');
 const mutation=updateProgramOccurrenceExecution(data,{...f.input,identity:row.identity,expected:locked.stored,changes:{schedule:{mode:'unscheduled',date:null}}});assert.equal(mutation.ok,false);assert.equal(mutation.data,data);assert.equal(JSON.stringify(data),raw);assert.deepEqual(data.spaces[actorId].recurrenceExecution,saved.spaces[actorId].recurrenceExecution);
 const period=readProgramOccurrencePeriod(data,{...f.input,from:'2026-11-01',to:'2026-11-01'});assert(period.ok);assert.equal(period.rows.length,0);
 if(kind==='archived'){const restored=ok(archiveProgramDocument(data,{actorId,requestId:'recurrence-unlock',expectedSpace:data.spaces[actorId],documentId:binding.documentId,archived:false})).data;const current=read(restored,f.input).rows[0];assert.equal(current.flowInactive,false);assert(ok(updateProgramOccurrenceExecution(restored,{...f.input,identity:current.identity,expected:current.stored,changes:{completion:{status:'open',completedAt:null}}})).changed);}
 }
});
test('finite page beyond old limit writes personal fixed/completed/held while source and outside window exceptions stay exact', () => {
  const f = fixture(), original = JSON.stringify(f.data), page = { ...f.input, window: { finiteOffset: 40, finiteLimit: 5 } };
  const row = read(f.data, page).rows[0]; assert.equal(row.identity.occurrenceIndex, 41);
  const changed = ok(updateProgramOccurrenceExecution(f.data, { ...page, identity: row.identity, expected: null,
    changes: { schedule: { mode: 'fixed_date', date: '2027-01-01' }, completion: { status: 'completed', completedAt: now }, participation: 'held' } }));
  assert.equal(JSON.stringify(f.data), original); assert.deepEqual(changed.data.public, f.data.public);
  assert.equal(changed.data.spaces[f.input.actorId].legacySnapshot?.raw, f.data.spaces[f.input.actorId].legacySnapshot?.raw);
  const reread = read(changed.data, page).rows[0]; assert.equal(reread.key, row.key); assert.equal(reread.executionDate, '2027-01-01'); assert.equal(reread.participation, 'held');
  assert.equal(reread.completion, 'completed'); assert.deepEqual(read(changed.data, f.input).outsideWindowKeys, [row.key]);
  assert(isProgramRecurrenceExecutionState(changed.data.spaces[f.input.actorId].recurrenceExecution));
});
test('open recurrence keeps its end absent, bounded windows preserve reopen/unscheduled/excluded and inherit', () => {
  const f = fixture(''), page = { ...f.input, window: { windowOffsetWeeks: 8, windowWeeks: 2 } };
  let data = f.data, row = read(data, page).rows[0];
  for (const changes of [
    { completion: { status: 'completed' as const, completedAt: now }, participation: 'excluded' as const },
    { completion: { status: 'open' as const, completedAt: null }, schedule: { mode: 'unscheduled' as const, date: null } },
    { schedule: { mode: 'inherit' as const, date: null }, participation: 'included' as const },
  ]) { data = ok(updateProgramOccurrenceExecution(data, { ...page, identity: row.identity, expected: row.stored, changes })).data; row = read(data, page).rows[0]; }
  assert.equal(row.executionDate, row.originalDate); assert.equal(row.completion, 'open'); assert.equal(row.completedAt, null);
  assert.equal(read(data, page).series[0].manifest.rule.end, undefined); assert.equal(read(data, page).rows.length, 14);
  assert.equal(read(data, f.input).outsideWindowKeys.length, 1);
});
test('stale source/CAS, foreign tuple, impossible date/index and excessive window are failclosed without mutation', () => {
  const f = fixture(), row = read(f.data, f.input).rows[0], request = { ...f.input, identity: row.identity, expected: null, changes: { participation: 'excluded' as const } };
  const saved = ok(updateProgramOccurrenceExecution(f.data, request)).data;
  assert.equal(updateProgramOccurrenceExecution(saved, request).ok, false);
  for (const identity of [{ ...row.identity, savedCopyId: 'foreign' }, { ...row.identity, originalDate: '2026-09-04' }, { ...row.identity, occurrenceIndex: 2 }]) {
    const result = updateProgramOccurrenceExecution(f.data, { ...request, identity }); assert.equal(result.ok, false); assert.equal(result.data, f.data);
  }
  assert.equal(updateProgramOccurrenceExecution(f.data, { ...request, changes: { schedule: { mode: 'fixed_date', date: '2026-02-30' } } }).ok, false);
  assert.equal(readProgramExecutionOccurrences(f.data, { ...f.input, window: { windowWeeks: 9 } }).ok, false);
  const changed = programClone(saved);
  changed.spaces[f.input.actorId].legacySnapshot!.raw = fixture('60회', '원본 수정').data.spaces[f.input.actorId].legacySnapshot!.raw;
  assert(validateProgramData(changed)); const stale = read(changed, f.input); assert(stale.sourceConflictKeys.includes(row.key)); assert.equal(stale.rows[0].sourceConflict, true);
  assert.equal(updateProgramOccurrenceExecution(changed, { ...request, expected: row.stored }).ok, false);
  const forged = programClone(saved.spaces[f.input.actorId].recurrenceExecution!); forged.entries[row.key].occurrenceIndex = 2;
  assert.equal(isProgramRecurrenceExecutionState(forged), false);
});
test('controller canonical reload + Undo/Redo, no-op and quota failure do not write outside Program', async () => {
  const f = fixture(), row = read(f.data, f.input).rows[0], values = new Map([['flow:operating', ' exact sentinel ']]), writes: string[] = []; let quota = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (quota) throw Error('quota'); writes.push(key); values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const options = { initialData: f.data, storage, exclusive: async <T>(work: () => T | Promise<T>) => work() }, controller = createProgramController(options); assert(controller.ok);
  const input = { ...f.input, identity: row.identity, expected: null, changes: { participation: 'excluded' as const } };
  const noop = await controller.mutate('noop', data => updateProgramOccurrenceExecution(data, { ...input, changes: { participation: 'included' } }), { actorId: f.input.actorId });
  assert(noop.ok); assert.equal(writes.length, 0);
  quota = true; assert.equal((await controller.mutate('fail', data => updateProgramOccurrenceExecution(data, input), { actorId: f.input.actorId })).ok, false); assert.equal(writes.length, 0);
  quota = false; assert((await controller.mutate('exclude', data => updateProgramOccurrenceExecution(data, input), { actorId: f.input.actorId })).ok);
  const reloaded = createProgramController(options); assert(reloaded.ok); assert.equal(read(reloaded.snapshot().envelope.data, f.input).rows[0].participation, 'excluded');
  assert((await controller.undo(f.input.actorId)).ok); assert.equal(read(controller.snapshot().envelope.data, f.input).rows[0].participation, 'included');
  assert((await controller.redo(f.input.actorId)).ok); assert.equal(read(controller.snapshot().envelope.data, f.input).rows[0].participation, 'excluded');
  assert.equal(values.get('flow:operating'), ' exact sentinel '); assert(writes.every(key => key === PROGRAM_STATE_KEY));
});
test('real candidate stage/review for another Flow is irrelevant; applying this Flow source invalidates old intent', () => {
  const f = fixture(), row = read(f.data, f.input).rows[0];
  const other = materializePersonalWorkspacePocAuthoring({ handoffId: 'other-source', documentId: 'other-doc', revisionId: 'other-v1', committedAt: now, rawText: '# 다른 Flow\n- [ ] 다른 준비' });
  assert(other.ok); if (!other.ok) return;
  const candidate = createPersonalWorkspacePocLocalFixtureEnvelope(other.flow, { incomingRawText: '# 다른 Flow 수정\n- [ ] 다른 준비', createdAt: now });
  assert(candidate.ok); if (!candidate.ok) return;
  let store = stagePersonalWorkspacePocSourceCandidate(createPersonalWorkspacePocSourceCandidateStore(now), candidate.envelope, candidate.current, now).store;
  const payload = { ...f.payload, model: { ...f.payload.model, flows: [...f.payload.model.flows, other.flow] }, sourceCandidateStore: store };
  const next = programClone(f.data); next.spaces[f.input.actorId].legacySnapshot!.raw = JSON.stringify(payload);
  assert.equal(read(next, f.input).rows[0].identity.sourceRevisionToken, row.identity.sourceRevisionToken);
  for (const change of candidate.envelope.changes) store = resolvePersonalWorkspacePocSourceCandidateChange(store, { candidateId: candidate.envelope.candidateId, changeId: change.changeId, resolution: 'use-incoming', now }).store;
  store = applyPersonalWorkspacePocSourceCandidate(store, { candidateId: candidate.envelope.candidateId, current: candidate.current, now }).store;
  payload.sourceCandidateStore = store; next.spaces[f.input.actorId].legacySnapshot!.raw = JSON.stringify(payload);
  assert.equal(read(next, f.input).rows[0].identity.sourceRevisionToken, row.identity.sourceRevisionToken);
  assert(updateProgramOccurrenceExecution(next, { ...f.input, identity: row.identity, expected: null, changes: { participation: 'excluded' } }).ok);
  const own = createPersonalWorkspacePocLocalFixtureEnvelope(f.payload.model.flows[0], { incomingRawText: f.payload.model.flows[0].authoring.rawText.replace('반복 Flow', '반복 Flow 변경'), createdAt: now });
  assert(own.ok); if (!own.ok) return;
  store = stagePersonalWorkspacePocSourceCandidate(store, own.envelope, own.current, now).store;
  payload.sourceCandidateStore = store; next.spaces[f.input.actorId].legacySnapshot!.raw = JSON.stringify(payload);
  assert.equal(read(next, f.input).rows[0].identity.sourceRevisionToken, row.identity.sourceRevisionToken);
  for (const change of own.envelope.changes) store = resolvePersonalWorkspacePocSourceCandidateChange(store, { candidateId: own.envelope.candidateId, changeId: change.changeId, resolution: 'use-incoming', now }).store;
  const applied = applyPersonalWorkspacePocSourceCandidate(store, { candidateId: own.envelope.candidateId, current: own.current, now }); assert.equal(applied.code, 'applied');
  payload.sourceCandidateStore = applied.store; next.spaces[f.input.actorId].legacySnapshot!.raw = JSON.stringify(payload);
  assert(validateProgramData(next)); assert.notEqual(read(next, f.input).sourceRevisionToken, row.identity.sourceRevisionToken);
  assert.equal(updateProgramOccurrenceExecution(next, { ...f.input, identity: row.identity, expected: null, changes: { participation: 'excluded' } }).ok, false);
});
test('period query unions distant moved/unscheduled exceptions and deduplicates by stable tuple', () => {
  const f = fixture(''), initial = read(f.data, f.input).rows[0];
  let data = ok(updateProgramOccurrenceExecution(f.data, { ...f.input, identity: initial.identity, expected: null, changes: { schedule: { mode: 'fixed_date', date: '2027-05-01' } } })).data;
  const distant = readProgramOccurrencePeriod(data, { ...f.input, from: '2027-05-01', to: '2027-05-01' }); assert(distant.ok); if (!distant.ok) return;
  assert(distant.rows.some(row => row.key === initial.key)); assert.equal(new Set(distant.rows.map(row => row.key)).size, distant.rows.length);
  const moved = read(data, f.input).rows[0]; data = ok(updateProgramOccurrenceExecution(data, { ...f.input, identity: moved.identity, expected: moved.stored, changes: { schedule: { mode: 'unscheduled', date: null }, participation: 'held' } })).data;
  const hidden = readProgramOccurrencePeriod(data, { ...f.input, undatedOnly: true }); assert(hidden.ok); if (hidden.ok) assert.equal(hidden.rows.length, 0);
  const held = readProgramOccurrencePeriod(data, { ...f.input, undatedOnly: true, includeHeld: true }); assert(held.ok); if (held.ok) assert.deepEqual(held.rows.map(row => row.key), [initial.key]);
  assert.equal(readProgramOccurrencePeriod(data, { ...f.input, from: '2027-02-30', to: '2027-03-01' }).ok, false);
});
test('finite outside-page exception appears by effective date while no write changes source or view window', () => {
  const f = fixture(), page = { ...f.input, window: { finiteOffset: 40, finiteLimit: 1 } }, row = read(f.data, page).rows[0];
  const data = ok(updateProgramOccurrenceExecution(f.data, { ...page, identity: row.identity, expected: null, changes: { schedule: { mode: 'fixed_date', date: '2026-09-04' }, participation: 'excluded' } })).data;
  const before = JSON.stringify(data), query = readProgramOccurrencePeriod(data, { ...f.input, from: '2026-09-04', to: '2026-09-04', includeExcluded: true });
  assert(query.ok); if (!query.ok) return; assert(query.rows.some(entry => entry.key === row.key)); assert.equal(JSON.stringify(data), before);
  const visible = readProgramOccurrencePeriod(data, { ...f.input, from: '2026-09-04', to: '2026-09-04' }); assert(visible.ok); if (visible.ok) assert(!visible.rows.some(entry => entry.key === row.key));
});
