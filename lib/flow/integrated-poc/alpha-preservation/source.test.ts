import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalImportSource } from './source';
import { PROGRAM_STATE_KEY } from '../contract';
import { createProgramData, createProgramEnvelope, validateProgramEnvelope } from '../program-data';
import { createMemoryTextAuthoringStorage, createTextAuthoringDraftRepository } from '../native-creator-vendor/text-authoring/storage';
import { createTextAuthoringDocument } from '../native-creator-vendor/text-authoring/parser';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord } from '../../source-backed-my-flow';
import { createTextAuthoringServiceState, beginTextAuthoringWorkingSourceEdit } from '../native-creator-vendor/text-authoring/service-state';
import { PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY } from '../../personal-workspace-poc-storage';
import { createAlphaSyntheticFixtures } from '../alpha-persistence/synthetic-fixtures';
import { stableAuthoringId } from '../native-creator-vendor/text-authoring/identity';

function port(values: Record<string, string>) {
  return { getItem: (key: string) => values[key] ?? null, key: (i: number) => Object.keys(values)[i] ?? null, get length() { return Object.keys(values).length; },
    setItem() { throw Error('write forbidden'); }, removeItem() { throw Error('write forbidden'); }, clear() { throw Error('write forbidden'); } };
}
test('canonical program wins; corrupt program never silently falls back', () => {
  const raw = JSON.stringify(createProgramEnvelope(createProgramData()));
  const selected = createLocalImportSource(port({ [PROGRAM_STATE_KEY]: raw, 'flow:text-authoring:drafts:v1': '{bad' }));
  assert(selected.ok); assert.equal(selected.raw, raw); assert.equal(selected.source, 'program');
  assert.deepEqual(createLocalImportSource(port({ [PROGRAM_STATE_KEY]: '{bad' })).ok, false);
});
test('actual structured Map reader uses only reads and creates no public catalog', () => {
  const now = '2026-09-21T01:00:00.000Z', id = 'moving-d30';
  const values = { [`flow:map:saved:${id}`]: JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(id, { savedAt: now, anchor: '2026-10-01' })),
    [`flow:map:persistence:${id}`]: JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(id, { savedAt: now, anchor: '2026-10-01' })) };
  const before = JSON.stringify(values), result = createLocalImportSource(port(values));
  assert(result.ok, JSON.stringify(result)); const envelope = JSON.parse(result.raw); assert(validateProgramEnvelope(envelope));
  assert(envelope.data.spaces['local-user'].savedBindings.length > 0); assert.equal(envelope.data.public.flows.length, 0);
  assert.equal(JSON.stringify(values), before); assert.deepEqual(createLocalImportSource(port(values)), result);
});
test('native saved raw source keeps genuine document identity and history', () => {
  const memory = createMemoryTextAuthoringStorage(), now = '2026-09-21T01:00:00.000Z';
  const repository = createTextAuthoringDraftRepository(memory, { now: () => now, idFactory: prefix => `${prefix}-m6` });
  const doc = createTextAuthoringDocument('# 실제 native 자료\n- [ ] 확인', { documentId: 'real-native-id', ownership: 'creator', now });
  repository.save(doc, { draftId: 'native-draft' });
  const raw = memory.getItem('flow:text-authoring:drafts:v1')!;
  const result = createLocalImportSource(port({ 'flow:text-authoring:drafts:v1': raw }));
  assert(result.ok, JSON.stringify(result)); const envelope = JSON.parse(result.raw); assert(validateProgramEnvelope(envelope));
  const working = envelope.data.spaces['local-user'].creatorWorkspace?.working; assert(working?.nativeDocument);
  assert.equal(working.nativeDocument.document.documentId, 'real-native-id'); assert.equal(working.rawText, doc.rawText);
  assert.deepEqual(createLocalImportSource(port({ 'flow:text-authoring:drafts:v1': raw })), result);
});

test('native coherent recovery preserves unsaved exact source separately', () => {
  const memory = createMemoryTextAuthoringStorage(), now = '2026-09-21T01:00:00.000Z';
  const repository = createTextAuthoringDraftRepository(memory, { now: () => now, idFactory: prefix => `${prefix}-recovery` });
  let state = createTextAuthoringServiceState('# 저장 전\n- [ ] 확인', { documentId: 'recovery-doc', draftId: 'recovery-draft', ownership: 'creator', now });
  state = beginTextAuthoringWorkingSourceEdit(state, '  미저장 원문\r\n보존  ', now);
  repository.saveCoherentRecovery(state, { activeStage: 'input' });
  const raw = memory.getItem('flow:text-authoring:drafts:v1')!;
  const result = createLocalImportSource(port({ 'flow:text-authoring:drafts:v1': raw }));
  assert(result.ok, JSON.stringify(result)); const envelope = JSON.parse(result.raw); assert(validateProgramEnvelope(envelope));
  const working = envelope.data.spaces['local-user'].creatorWorkspace?.working; assert(working);
  assert.equal(working.nativePendingRawText, '  미저장 원문\r\n보존  '); assert.equal(working.baseRecordRevision, null);
});

test('Program-owned lifecycle and map-review payloads stay in canonical snapshot', () => {
  const fixture = createAlphaSyntheticFixtures().find(f => f.name === 'actual-structured-map-factory')!;
  const snapshot = fixture.envelope.data.spaces[fixture.actorId].legacySnapshot; assert(snapshot);
  const payload = JSON.parse(snapshot.raw); payload.sourceLifecycle = { version: 1, owners: {} }; payload.mapReview = { version: 1, groups: {} };
  snapshot.raw = JSON.stringify(payload); assert(validateProgramEnvelope(fixture.envelope));
  const raw = JSON.stringify(fixture.envelope), result = createLocalImportSource(port({ [PROGRAM_STATE_KEY]: raw }));
  assert(result.ok); assert.equal(result.raw, raw);
});

test('standalone unsaved authoring is not silently omitted', () => {
  const result = createLocalImportSource(port({ [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: 'unselected original' }));
  assert(!result.ok); assert.equal(result.reason, 'corrupt-authoring');
});

test('standalone authoring retains exact source bytes as an unsaved selectable candidate',()=>{
 const raw=' { "version": 1, "rawText": "  미저장\\r\\n원문  " } ',values={[PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]:raw};
 const before=JSON.stringify(values),result=createLocalImportSource(port(values));assert(result.ok,JSON.stringify(result));
 const envelope=JSON.parse(result.raw);assert(validateProgramEnvelope(envelope));const workspace=envelope.data.spaces['local-user'].creatorWorkspace;
 assert(workspace?.working);assert(workspace.importedWorkingCandidates);
 assert.equal(workspace.working.rawText,'  미저장\r\n원문  ');assert.equal(workspace.working.baseRecordRevision,null);
 assert.deepEqual(workspace.library.records,{});assert.equal(workspace.importedWorkingCandidates.sources[PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY],raw);
 assert.equal(Object.keys(workspace.importedWorkingCandidates.candidates).length,1);assert.equal(JSON.stringify(values),before);
});
test('multiple native recoveries remain individually selectable with full originals and no invented saves',()=>{
 const memory=createMemoryTextAuthoringStorage(),now='2026-09-21T01:00:00.000Z';
 let sequence=0;const repository=createTextAuthoringDraftRepository(memory,{now:()=>now,idFactory:prefix=>`${prefix}-${++sequence}`});
 for(const id of ['one','two']){
  let state=createTextAuthoringServiceState(`# ${id}\n- [ ] original`,{documentId:`doc-${id}`,draftId:`draft-${id}`,ownership:'creator',now});
  state=beginTextAuthoringWorkingSourceEdit(state,`${id} pending\r\n`,now);repository.saveCoherentRecovery(state,{activeStage:'input'});
 }
 const raw=memory.getItem('flow:text-authoring:drafts:v1')!,result=createLocalImportSource(port({'flow:text-authoring:drafts:v1':raw}));
 assert(result.ok,JSON.stringify(result));const envelope=JSON.parse(result.raw);assert(validateProgramEnvelope(envelope));
 const workspace=envelope.data.spaces['local-user'].creatorWorkspace;assert(workspace?.importedWorkingCandidates);assert.deepEqual(workspace.library.records,{});assert.equal(workspace.working,null);
 const candidates=Object.values(workspace.importedWorkingCandidates.candidates) as any[];assert.equal(candidates.length,2);
 assert.deepEqual(candidates.map(c=>c.working.nativePendingRawText).sort(),['one pending\r\n','two pending\r\n']);
 assert(candidates.every(c=>!c.readOnly&&c.working.baseRecordRevision===null));assert.equal(workspace.importedWorkingCandidates.sources['flow:text-authoring:drafts:v1'],raw);
});

test('older recovery remains inspectable without replacing the newer saved working',()=>{
 const memory=createMemoryTextAuthoringStorage();let now='2026-09-21T01:00:00.000Z',sequence=0;
 const repository=createTextAuthoringDraftRepository(memory,{now:()=>now,idFactory:prefix=>`${prefix}-${++sequence}`});
 const state=createTextAuthoringServiceState('# Older\n- [ ] original',{documentId:'older-doc',draftId:'older-draft',ownership:'creator',now});
 const recovery=repository.saveCoherentRecovery(state,{activeStage:'input'});
 now='2026-09-21T02:00:00.000Z';repository.save(state.canonicalDraft.document,{draftId:state.draftId});
 const root=JSON.parse(memory.getItem('flow:text-authoring:drafts:v1')!);root.recoveries[state.draftId]=recovery;
 const raw=JSON.stringify(root),result=createLocalImportSource(port({'flow:text-authoring:drafts:v1':raw}));assert(result.ok,JSON.stringify(result));
 const envelope=JSON.parse(result.raw);assert(validateProgramEnvelope(envelope));const workspace=envelope.data.spaces['local-user'].creatorWorkspace;
 assert(workspace?.working);assert(workspace.importedWorkingCandidates);
 const candidate=Object.values(workspace.importedWorkingCandidates.candidates)[0] as any;assert.equal(candidate.readOnly,true);
 assert.notEqual(workspace.working.draftId,candidate.working.draftId);assert.equal(Object.keys(workspace.library.records).length,1);
 assert.equal(workspace.importedWorkingCandidates.sources['flow:text-authoring:drafts:v1'],raw);
});

test('different native recoveries with colliding generated IDs reject instead of losing one candidate',()=>{
 const seen=new Map<string,string>();let collision:[string,string]|null=null,seed=123456789;
 for(let i=0;i<300000&&!collision;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const draftId=`draft-${seed.toString(36)}`,id=stableAuthoringId('m6-recovery',draftId,`recovery-${draftId}`);
  const prior=seen.get(id);if(prior)collision=[prior,draftId];else seen.set(id,draftId);}
 assert(collision,'fixture must find a real identity collision');
 const memory=createMemoryTextAuthoringStorage(),now='2026-09-21T01:00:00.000Z';
 for(const draftId of collision){const repository=createTextAuthoringDraftRepository(memory,{now:()=>now,idFactory:()=>`recovery-${draftId}`});
  const state=createTextAuthoringServiceState(`# ${draftId}\n- [ ] original`,{documentId:`document-${draftId}`,draftId,ownership:'creator',now});repository.saveCoherentRecovery(state,{activeStage:'input'});}
 const raw=memory.getItem('flow:text-authoring:drafts:v1')!,result=createLocalImportSource(port({'flow:text-authoring:drafts:v1':raw}));
 assert(!result.ok);assert.equal(result.reason,'identity-conflict');assert.equal(memory.getItem('flow:text-authoring:drafts:v1'),raw);
});
