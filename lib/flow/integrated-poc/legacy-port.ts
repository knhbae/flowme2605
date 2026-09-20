import type { ProgramData } from './contract';
import type { PersonalWorkspacePocTransition } from '../personal-workspace-poc-contract';
import type { ProgramMutate } from './ui-contract';
import { applyProgramLegacyAction, applyProgramLegacySourceAction, applyProgramLegacyMapReview, prepareProgramLegacyView, PROGRAM_LEGACY_TRANSACTION_ACTIONS, type ProgramLegacyTransactionResult, type ProgramLegacyViewResult } from './legacy-transaction';
import type { ProgramLegacyMapReviewAction } from './legacy-map-review';
import type { ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { setProgramLegacyFlowFolder } from './legacy-folder-bridge';

/** Dependency injection contract for the old surface. This is NOT a Storage
 * facade: virtual setItem would preserve unsafe multi-key/evidence semantics.
 * Every mutation must enter commit; no old source/reset/editor writer fallback. */
export function createProgramLegacyPort(input: {
  actorId: string;
  readData: () => ProgramData;
  mutate: ProgramMutate;
}) {
  return {
    supportedActions: PROGRAM_LEGACY_TRANSACTION_ACTIONS,
    read(now: string, onlyFlowRef?: string): ProgramLegacyViewResult {
      try { return prepareProgramLegacyView(input.readData(), { actorId: input.actorId, now, onlyFlowRef }); }
      catch { return { ok: false, reason: 'invalid', issues: [{ code: 'program-read-failed', ref: null }] }; }
    },
    readSource(now: string, flowRef: string): ProgramLegacyViewResult {
      try { return prepareProgramLegacyView(input.readData(), { actorId: input.actorId, now, onlyFlowRef: flowRef, sourceReview: true }); }
      catch { return { ok: false, reason: 'invalid', issues: [{ code: 'program-source-read-failed', ref: flowRef }] }; }
    },
    async commitFolder(request: { expectedToken: string; flowRef: string; folderId: string; requestId: string }) {
      try { return await input.mutate('계획 폴더 이동', data => setProgramLegacyFlowFolder(data, { ...request, actorId: input.actorId })); }
      catch { return { ok: false as const, reason: 'storage-unavailable' }; }
    },
    async commitSource(request: { expectedToken: string; action: ProgramLegacySourceAction }) {
      let diagnostic: ProgramLegacyTransactionResult | undefined;
      try {
        const receipt = await input.mutate(request.action.type === 'activate-map-recurrence' ? '기록 보존·반복 회차 연결' : request.action.type === 'undo' ? '원본 적용 되돌리기' : request.action.type === 'apply' ? '비교한 원본 적용' : '원본 비교 보관', data => {
          diagnostic = applyProgramLegacySourceAction(data, { actorId: input.actorId, ...request }); return diagnostic.transition;
        }, ['stage', 'stage-map', 'choice', 'defer'].includes(request.action.type) ? { history: false } : undefined);
        return { ...receipt, issues: diagnostic?.issues ?? [], conflicts: diagnostic?.conflicts ?? [] };
      } catch { return { ok: false as const, reason: 'storage-unavailable', issues: diagnostic?.issues ?? [], conflicts: diagnostic?.conflicts ?? [] }; }
    },
    async commitMapReview(request: { expectedToken: string; action: ProgramLegacyMapReviewAction }) {
      let diagnostic: ProgramLegacyTransactionResult | undefined;
      try {
        const receipt = await input.mutate('Map 개인 실행 검토 확인', data => {
          diagnostic = applyProgramLegacyMapReview(data, { actorId: input.actorId, ...request }); return diagnostic.transition;
        });
        return { ...receipt, issues: diagnostic?.issues ?? [], conflicts: diagnostic?.conflicts ?? [] };
      } catch { return { ok: false as const, reason: 'storage-unavailable', issues: diagnostic?.issues ?? [], conflicts: diagnostic?.conflicts ?? [] }; }
    },
    async commit(request: { expectedToken: string; action: PersonalWorkspacePocTransition; now: string; executionDate?: string }) {
      let diagnostic: ProgramLegacyTransactionResult | undefined;
      try {
        const receipt = await input.mutate('기존 도구 변경', data => {
          diagnostic = applyProgramLegacyAction(data, { actorId: input.actorId, ...request });
          return diagnostic.transition;
        });
        return { ...receipt, issues: diagnostic?.issues ?? [], conflicts: diagnostic?.conflicts ?? [] };
      } catch { return { ok: false as const, reason: 'storage-unavailable', issues: diagnostic?.issues ?? [], conflicts: diagnostic?.conflicts ?? [] }; }
    },
  };
}
export type ProgramLegacyPort = ReturnType<typeof createProgramLegacyPort>;
