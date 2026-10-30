import { PROGRAM_STATE_KEY } from '../contract';
import { createProgramData, createProgramEnvelope, validateProgramEnvelope } from '../program-data';
import { loadProgramStore } from '../program-store';
import { canonicalJson, detached, parseAlphaJson } from '../alpha-persistence/json';
import { buildPersonalWorkspacePocReadModel } from '../../personal-workspace-poc-read-model';
import { loadPersonalWorkspacePocState, loadPersonalWorkspacePocAuthoringDraft, PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY } from '../../personal-workspace-poc-storage';
import { createPersonalWorkspacePocState } from '../../personal-workspace-poc-state';
import { loadPersonalWorkspacePocSourceCandidateStore } from '../../personal-workspace-poc-source-candidate-storage';
import { PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY } from '../../personal-workspace-poc-storage-transaction';
import { sourceBackedMyFlowBundles } from '../../source-backed-my-flow';
import { seedBundles } from '../../seed-flows';
import type { FlowBundle } from '../../types';
import { hydrateProgramLegacy } from '../legacy-projection';
import { readProgramCreatorDraftLibrary } from '../creator-draft-bridge';
import { readNativeCreatorHistory } from '../creator-history-codec';
import { mapLegacyCreatorRecoveryWorking } from '../legacy-creator-recovery-handoff';
import { readLegacyCreatorRecoveries } from '../legacy-creator-recovery-codec';
import { createProgramCreatorWorkspace, creatorWorkingFromRecord } from '../creator-workspace';
import { transitionPersonalWorkspacePocCreatorDraftLibrary } from '../../personal-workspace-poc-creator-drafts';
import { fingerprintPersonalWorkspacePocAuthoringSource } from '../../personal-workspace-poc-authoring';
import { createNativeCreatorDocumentOwner } from '../native-creator-document';
import { stableAuthoringId } from '../native-creator-vendor/text-authoring/identity';
import type { ProgramCreatorWorking } from '../creator-workspace-contract';

export type LocalImportSourceResult = { ok: true; raw: string; source: 'program' | 'legacy'; warnings: string[] }
  | { ok: false; reason: string; details: string[] };
const fail = (reason: string, ...details: string[]): LocalImportSourceResult => ({ ok: false, reason, details });

/** Read-only browser snapshot. No original recovery/migration writer and no sample public catalog. */
export function createLocalImportSource(storage: Pick<Storage, 'getItem' | 'key' | 'length'>): LocalImportSourceResult {
  try {
    const seen = new Map<string, string | null>();
    const getItem = (key: string) => { if (!seen.has(key)) seen.set(key, storage.getItem(key)); return seen.get(key)!; };
    const raw = getItem(PROGRAM_STATE_KEY);
    if (raw !== null) {
      const loaded = loadProgramStore({ getItem }, validateProgramEnvelope);
      if (storage.getItem(PROGRAM_STATE_KEY) !== raw) return fail('source-changed', '읽는 동안 통합 저장값이 변경되었습니다.');
      return loaded.kind === 'ready' ? { ok: true, raw, source: 'program', warnings: ['선택한 사용자만 계정으로 가져옵니다. 통합 저장값을 우선 읽었습니다.'] }
        : fail('corrupt-program', '통합 저장값을 읽지 못했습니다. 이전 저장소로 자동 우회하지 않습니다.');
    }
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
    const port = { getItem, length: keys.length, key: (i: number) => keys[i] ?? null };
    if (getItem(PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY) !== null) return fail('recovery-required', '이전 개인공간의 미완료 저장 복구가 필요합니다. 가져오기에서는 원본을 복구하거나 쓰지 않습니다.');
    const authoring = loadPersonalWorkspacePocAuthoringDraft(port);
    if(authoring.kind==='corrupt')return fail('corrupt-authoring','미저장 작성 자료가 손상되었습니다. 원본을 제외하거나 변경하지 않았습니다.');
    const state = loadPersonalWorkspacePocState(port), candidates = loadPersonalWorkspacePocSourceCandidateStore(port);
    if (state.kind === 'corrupt' || candidates.kind === 'corrupt') return fail('corrupt-legacy', '개인공간 상태 또는 원본 비교 자료가 손상되었습니다.');
    const registryKeys = Array.from({ length: 9 }, (_, i) => `flow_builder_mvp_bundles_v${11 - i}`);
    const active = registryKeys.map(key => getItem(key)).find(value => value !== null);
    const bundles = active === undefined ? [] : parseAlphaJson(active);
    if (!Array.isArray(bundles) || bundles.some(b => !b || typeof b !== 'object' || !b.flow || typeof b.flow.slug !== 'string')) return fail('corrupt-bundles', '기존 Flow 원본 목록을 검증하지 못했습니다.');
    const bySlug = new Map([...seedBundles, ...sourceBackedMyFlowBundles, ...(bundles as FlowBundle[])].map(b => [b.flow.slug, b]));
    const read = buildPersonalWorkspacePocReadModel(port, [...bySlug.values()]);
    if (!read.ok) return fail('unsupported-legacy', read.reason);
    let data = createProgramData();
    const legacyState = state.kind === 'ready' ? state.state : createPersonalWorkspacePocState('1970-01-01T00:00:00.000Z');
    if (read.model.flows.length || state.kind === 'ready') {
      const hydrated = hydrateProgramLegacy(data, read.model, legacyState, { actorId: 'local-user', preserveUnsupported: true,
        ...(candidates.kind === 'ready' ? { sourceCandidateStore: candidates.store } : {}) });
      if (!hydrated.ok) return fail('unsupported-legacy', hydrated.reason); data = hydrated.data;
    }
    const library = readProgramCreatorDraftLibrary(port), native = readNativeCreatorHistory(port), recovery = readLegacyCreatorRecoveries(port);
    if (library.kind === 'corrupt' || !['empty', 'ready'].includes(native.kind) || !['empty', 'ready'].includes(recovery.kind)) return fail('unsupported-creator', '기존 제작 자료 또는 복구 기록을 검증하지 못했습니다.');
    const space = data.spaces['local-user'];
    if (library.kind === 'ready') { space.creatorWorkspace = createProgramCreatorWorkspace(library.library.updatedAt); space.creatorWorkspace.library = detached(library.library); }
    if (native.kind === 'ready') for (const record of native.records) {
      const current = [...record.history].reverse().find(row => row.kind === 'text-authoring-v1' && row.origin.revisionId === record.currentRevisionId);
      if (!current || current.kind !== 'text-authoring-v1') return fail('unsupported-native-current', `현재 native 저장판 원본이 없습니다: ${record.draftId}`);
      const now = current.savedAt, draftId = stableAuthoringId('m6-native', record.draftId);
      const workspace = space.creatorWorkspace ??= createProgramCreatorWorkspace(now);
      if (workspace.library.records[draftId]) return fail('identity-conflict', draftId);
      const saved = transitionPersonalWorkspacePocCreatorDraftLibrary(workspace.library, { type: 'save', draftId, title: record.title, rawText: record.currentRaw,
        sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(record.currentRaw), expectedLibraryRevision: workspace.library.revision, now });
      if (!saved.changed) return fail('unsupported-native-current', record.draftId);
      workspace.library = saved.library;
      if (record.status === 'archived') workspace.library = { ...workspace.library, records: { ...workspace.library.records,
        [draftId]: { ...workspace.library.records[draftId], status: 'archived' } } };
      const owner = createNativeCreatorDocumentOwner({ id: draftId, source: current.origin }, now);
      if (!owner.ok) return fail('unsupported-native-current', record.draftId);
      workspace.savedHistory ??= { version: 1, drafts: {} }; workspace.savedHistory.drafts[draftId] = detached(record.history);
      workspace.structureDrafts ??= {}; workspace.structureDrafts[draftId] = { version: 1, recordRevision: saved.library.records[draftId].recordRevision,
        contextRevision: 1, savedAt: now, nativeDocument: owner.owner, nativeSelection: current.origin };
      workspace.working = creatorWorkingFromRecord(workspace, draftId);
    }
    if (recovery.kind === 'ready' && recovery.issues.length) return fail('unsupported-recovery','검증할 수 없는 복구 기록이 있습니다. 원본을 제외하지 않았습니다.');
    if(authoring.kind==='ready'||recovery.kind==='ready'&&recovery.candidates.length){
      const workspace=space.creatorWorkspace??=createProgramCreatorWorkspace('1970-01-01T00:00:00.000Z');
      const imported:NonNullable<typeof workspace.importedWorkingCandidates>={version:1,sources:{},candidates:{}};
      if(authoring.kind==='ready'){
        const sourceRaw=getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY)!;
        const id=stableAuthoringId('m6-authoring',sourceRaw),binding=authoring.draft.creatorBinding;
        const bound=binding?creatorWorkingFromRecord(workspace,binding.draftId):null;
        if(binding&&!bound)return fail('authoring-binding-missing','미저장 원문이 가리키는 제작 저장판을 찾지 못했습니다. 원본을 변경하지 않았습니다.');
        const working:ProgramCreatorWorking=bound?detached(bound):{draftId:id,title:'가져온 미저장 원문',rawText:'',baseRecordRevision:null};
        if(working.nativeDocument){if(authoring.draft.rawText!==working.rawText)working.nativePendingRawText=authoring.draft.rawText;}
        else {working.rawText=authoring.draft.rawText;delete working.sourceIdentity;}
        if(authoring.draft.templateId)working.templateId=authoring.draft.templateId;
        imported.sources[PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]=sourceRaw;
        imported.candidates[id]={sourceKey:PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,kind:'authoring',readOnly:false,working};
      }
      if(recovery.kind==='ready')for(const candidate of recovery.candidates){
        const id=stableAuthoringId('m6-recovery',candidate.draftId,candidate.recoveryId);
        if(imported.candidates[id]||workspace.library.records[id])return fail('identity-conflict','서로 다른 복구 자료의 대상 식별자가 충돌했습니다. 원본을 합치거나 제외하지 않았습니다.');
        const mapped=mapLegacyCreatorRecoveryWorking(candidate,id,candidate.recoveredAt);
        if(!mapped)return fail('unsupported-recovery',candidate.recoveryId);
        imported.sources[candidate.storageKey]=recovery.raw;
        imported.candidates[id]={sourceKey:candidate.storageKey,kind:'recovery',readOnly:!candidate.eligible,working:mapped.working};
      }
      workspace.importedWorkingCandidates=imported;
      const candidates=Object.values(imported.candidates);
      // One unambiguous pending value remains immediately visible; alternatives stay selectable.
      if(candidates.length===1&&!candidates[0].readOnly)workspace.working=detached(candidates[0].working);
    }
    const envelope = createProgramEnvelope(data);
    if (!validateProgramEnvelope(envelope)) return fail('invalid-projection', '읽은 원본을 손실 없이 구성하지 못했습니다.');
    if (![...seen].every(([key, before]) => storage.getItem(key) === before)) return fail('source-changed', '읽는 동안 원본이 변경되었습니다. 다시 읽어 주세요.');
    return { ok: true, raw: canonicalJson(envelope), source: 'legacy', warnings: ['읽은 원본 저장소는 변경하지 않았습니다. 공개 예시는 생성하지 않았습니다.'] };
  } catch { return fail('storage-unavailable', '이 브라우저의 이전 자료를 안전하게 읽지 못했습니다.'); }
}
