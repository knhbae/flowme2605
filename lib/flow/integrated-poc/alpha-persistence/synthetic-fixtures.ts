/** Synthetic migration probes. No browser, operating storage or network access. */
import assert from 'node:assert/strict';
import type { ProgramData, ProgramEnvelope, ProgramTransition } from '../contract';
import { createProgramData, createProgramEnvelope, validateProgramEnvelope } from '../program-data';
import { createProgramDocument, addProgramQuickTask, linkProgramTask, recordProgramTaskProgress, importProgramPublicVersion } from '../private-space';
import { hydrateProgramLegacy } from '../legacy-projection';
import { buildPersonalWorkspacePocReadModel } from '../../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../../personal-workspace-poc-state';
import { toPersonalWorkspacePocQuickItemRef, toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef, type PersonalWorkspacePocReadModel } from '../../personal-workspace-poc-contract';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles } from '../../source-backed-my-flow';
import { materializePersonalWorkspacePocAuthoring } from '../../personal-workspace-poc-authoring';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from '../recurrence-state';
import { ordinaryPublicationSourceFixture } from '../publication-ordinary-source.fixture';
import { setProgramCreatorWorking } from '../creator-workspace';
import { createCreatorNativeSourceEnvelope } from '../creator-native-source-update';
import { stageProgramNativeSourceUpdate } from '../creator-native-source-store';
import { createTextAuthoringDocument } from '../native-creator-vendor/text-authoring/parser';
import { createMemoryTextAuthoringStorage, createTextAuthoringDraftRepository } from '../native-creator-vendor/text-authoring/storage';
import { createTextAuthoringServiceState, beginTextAuthoringWorkingSourceEdit } from '../native-creator-vendor/text-authoring/service-state';
import { LEGACY_CREATOR_RECOVERY_KEY } from '../legacy-creator-recovery-codec';
import { prepareLegacyCreatorRecoveryHandoff, handoffLegacyCreatorRecovery } from '../legacy-creator-recovery-handoff';
import { createProgramPost, createProgramReply, toggleProgramReaction } from '../community';
import { textWorkspaceModel as M } from '../text-workspace';

export type AlphaSyntheticFixture = { name: string; envelope: ProgramEnvelope; actorId: string };
const NOW = '2026-09-21T01:00:00.000Z';
const ACTOR = 'local-user';
function accept<T>(result: ProgramTransition<T>) { assert(result.ok, result.ok ? '' : result.reason); return result; }
function wrap(name: string, data: ProgramData): AlphaSyntheticFixture {
  const envelope = createProgramEnvelope(data);
  assert(validateProgramEnvelope(envelope), `Invalid synthetic fixture: ${name}`);
  return { name, envelope, actorId: ACTOR };
}
function base(data: ProgramData, requestId: string) { return { actorId: ACTOR, requestId, expectedSpace: data.spaces[ACTOR] }; }

function documents() {
  let data = createProgramData();
  const document = accept(createProgramDocument(data, { ...base(data, 'document'), title: 'Synthetic independent document', raw: '개인 메모\n한글 보존' })); data = document.data;
  const task = accept(addProgramQuickTask(data, { ...base(data, 'task'), documentId: document.result, title: 'Synthetic ordinary task', date: '2026-09-21' })); data = task.data;
  for (const [index, percent] of [15, 45, 100].entries()) data = accept(recordProgramTaskProgress(data, { ...base(data, `progress-${index}`), taskId: task.result, date: `2026-09-${21 + index}`, percent })).data;
  const reference = accept(createProgramDocument(data, { ...base(data, 'reference-document'), title: 'Synthetic reference document' })); data = reference.data;
  data = accept(linkProgramTask(data, { ...base(data, 'reference'), documentId: reference.result, taskId: task.result })).data;
  const numeric = accept(createProgramDocument(data, { ...base(data, 'numeric-document'), title: 'Synthetic numeric source tokens', raw: '- [ ] Integer spelling\n- [ ] Ratio spelling' })); data = numeric.data;
  data.spaces[ACTOR].text = M.editText(data.spaces[ACTOR].text, numeric.result, '- [1] Integer spelling\n- [1.0] Ratio spelling', { progressDate: '2026-09-21' });
  const envelope = createProgramEnvelope(data);
  envelope.undo[ACTOR].push({ label: 'Synthetic history', groupId: null, workspace: structuredClone(document.data.spaces[ACTOR]) });
  assert(validateProgramEnvelope(envelope));
  return { name: 'independent-documents-reference-progress-undo', envelope, actorId: ACTOR };
}

function savedOrigins() {
  const model: PersonalWorkspacePocReadModel = { version: 1, flows: (['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan'] as const).map(origin => {
    const savedCopyId = `synthetic-${origin}`, flowId = 'same-source-flow', itemId = 'same-source-item';
    return { ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId), savedCopyId, flowId, title: 'Synthetic saved Flow', origin, sourceSlug: `synthetic-${origin}`,
      items: [{ ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, itemId), savedCopyId, flowId, itemId, title: 'Synthetic saved item', description: '원문 설명', completionCriterion: '확인', sourceOrder: 0, sourceDate: '2026-09-21' }] };
  }) };
  const state = createPersonalWorkspacePocState(NOW), ref = toPersonalWorkspacePocQuickItemRef('alpha-quick');
  state.quickItems = [{ quickItemId: 'alpha-quick', title: 'Synthetic quick item', memo: '개인 메모', status: 'completed', completedAt: NOW, createdAt: NOW }];
  state.placements[ref] = { itemRef: ref, scheduleMode: 'fixed_date', date: '2026-09-22', timelinePolicy: 'included' };
  return wrap('four-saved-origins-and-quick-item', accept(hydrateProgramLegacy(createProgramData(), model, state, { actorId: ACTOR, preserveUnsupported: true })).data);
}

function structuredMap() {
  const id = 'moving-d30';
  const snapshot = buildSourceBackedFlowMapSavedSnapshot(id, { savedAt: NOW, anchor: '2026-10-01' });
  const persistence = buildSourceBackedFlowMapPersistenceRecord(id, { savedAt: NOW, anchor: '2026-10-01' });
  assert(snapshot && persistence);
  const entries: Record<string, string> = { [`flow:map:saved:${id}`]: JSON.stringify(snapshot), [`flow:map:persistence:${id}`]: JSON.stringify(persistence) };
  const read = buildPersonalWorkspacePocReadModel({ length: 2, key: i => Object.keys(entries)[i] ?? null, getItem: key => entries[key] ?? null }, sourceBackedMyFlowBundles); assert(read.ok);
  return wrap('actual-structured-map-factory', accept(hydrateProgramLegacy(createProgramData(), read.model, createPersonalWorkspacePocState(NOW), { actorId: ACTOR, preserveUnsupported: true })).data);
}

function recurring() {
  const source = materializePersonalWorkspacePocAuthoring({ handoffId: 'alpha-recurring', documentId: 'alpha-recurring-document', revisionId: 'alpha-recurring-revision', committedAt: NOW,
    rawText: '# Synthetic recurrence\n- [ ] 반복 준비\n  - 날짜: 2026-09-21\n  - 반복: 매일\n  - 반복 종료: 5회' }); assert(source.ok);
  let data = accept(hydrateProgramLegacy(createProgramData(), { version: 1, flows: [source.flow] }, createPersonalWorkspacePocState(NOW), { actorId: ACTOR, preserveUnsupported: true })).data;
  const input = { actorId: ACTOR, flowRef: source.flow.ref, localToday: '2026-09-21' };
  const rows = readProgramExecutionOccurrences(data, input); assert(rows.ok); assert(rows.rows.length >= 2);
  data = accept(updateProgramOccurrenceExecution(data, { ...input, identity: rows.rows[0].identity, expected: null, changes: { completion: { status: 'completed', completedAt: NOW }, schedule: { mode: 'fixed_date', date: '2026-10-01' } } })).data;
  data = accept(updateProgramOccurrenceExecution(data, { ...input, identity: rows.rows[1].identity, expected: null, changes: { participation: 'held', schedule: { mode: 'unscheduled', date: null } } })).data;
  return wrap('recurring-occurrence-records', data);
}

function nativeFixtures() {
  const f = ordinaryPublicationSourceFixture('native');
  const saved = wrap('native-saved-history-and-execution', f.data);
  const working = f.data.spaces[ACTOR].creatorWorkspace!.working!;
  const pending = accept(setProgramCreatorWorking(f.data, { actorId: ACTOR, expectedWorking: working, working: { ...working, nativePendingRawText: '\r\n아직 동기화하지 않은 원문  ' } }, NOW)).data;
  const owner = working.nativeDocument!;
  const incoming = owner.document.rawText + '\n- [ ] Synthetic source addition';
  const incomingEnvelope = createCreatorNativeSourceEnvelope(owner, { rawText: incoming, externalVersion: 'alpha-source-v2', providedBy: 'synthetic-fixture', sourceOwnerClaim: 'synthetic only', collectedAt: NOW, receivedAt: NOW }); assert(incomingEnvelope.ok);
  const candidateDocument = createTextAuthoringDocument(incoming, { documentId: owner.document.documentId, ownership: 'creator', now: NOW });
  const session = accept(stageProgramNativeSourceUpdate(f.data, { actorId: ACTOR, draftId: f.draftId, expectedWorking: working, expectedSession: null, envelope: incomingEnvelope.value, candidateDocument,
    matches: owner.document.parseResult.canonical.items.map((item, index) => ({ activeItemId: item.itemId, incomingItemId: candidateDocument.parseResult.canonical.items[index].itemId, basis: 'explicit' as const })) }, NOW)).data;
  return [saved, wrap('native-pending-input', pending), wrap('native-source-update-session', session)];
}

function recovery() {
  const storage = createMemoryTextAuthoringStorage(); let at = '2026-09-20T01:00:00.000Z'; let id = 0;
  const repository = createTextAuthoringDraftRepository(storage, { now: () => at, idFactory: prefix => `${prefix}-${++id}` });
  let state = createTextAuthoringServiceState('# Synthetic recovery\n- [ ] 준비', { ownership: 'creator', draftId: 'synthetic-recovery', documentId: 'synthetic-recovery-document', now: at });
  repository.save(state.canonicalDraft.document, { draftId: state.draftId }); at = NOW;
  state = beginTextAuthoringWorkingSourceEdit(state, '  미저장 복구\r\n원문  ', NOW);
  const recovered = repository.saveCoherentRecovery(state, { activeStage: 'input' });
  const raw = storage.getItem(LEGACY_CREATOR_RECOVERY_KEY)!; const data = createProgramData();
  const prepared = prepareLegacyCreatorRecoveryHandoff(data, { actorId: ACTOR, requestId: 'synthetic-recovery-request', targetDraftId: 'alpha-recovery', selection: { draftId: recovered.draftId, recoveryId: recovered.recoveryId }, now: NOW }, raw); assert(prepared.ok);
  return wrap('native-coherent-recovery', accept(handoffLegacyCreatorRecovery(data, prepared.request, raw)).data);
}

function publicCommunity() {
  let data = createProgramData();
  data.public.flows.push({ id: 'alpha-public', ownerId: 'creator-minji', currentVersionId: 'alpha-v2', category: 'Synthetic', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push(...[1, 2].map(number => ({ id: `alpha-v${number}`, flowId: 'alpha-public', number, parentVersionId: number === 1 ? null : 'alpha-v1', title: `Synthetic v${number}`, summary: 'Synthetic public source',
    items: [{ id: 'alpha-public-item', title: `Synthetic item v${number}`, description: '공개 설명', completionCriteria: '확인', sourceUrl: null, schedule: { kind: 'undated' as const }, subchecks: [] }],
    source: { kind: 'simulated-example' as const, label: 'Synthetic fixture', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: NOW })));
  data = accept(importProgramPublicVersion(data, { ...base(data, 'copy'), versionId: 'alpha-v1', itemIds: ['alpha-public-item'], anchor: null })).data;
  const post = accept(createProgramPost(data, { actorId: ACTOR, requestId: 'post', kind: 'experience', title: 'Synthetic experience', body: '실사용자가 작성한 글이 아닌 검증 예시', topic: 'Synthetic', flowId: 'alpha-public', versionId: 'alpha-v1', itemId: 'alpha-public-item',
    media: [{ id: 'synthetic-pixel', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', alt: 'Synthetic one pixel', synthetic: true }] }, NOW)); data = post.data;
  data = accept(createProgramReply(data, { actorId: 'participant-jihun', requestId: 'reply', postId: post.result, body: 'Synthetic reply' }, NOW)).data;
  data = accept(toggleProgramReaction(data, 'creator-minji', 'post', post.result)).data;
  return wrap('public-versions-copy-community-photo', data);
}

export function createAlphaSyntheticFixtures(): AlphaSyntheticFixture[] {
  return [documents(), savedOrigins(), structuredMap(), recurring(), ...nativeFixtures(), recovery(), publicCommunity()];
}
