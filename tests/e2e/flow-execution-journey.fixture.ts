import assert from 'node:assert/strict';
import type { AlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { materializeAccount } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { emptyAlphaReferences } from '../../lib/flow/integrated-poc/alpha-social/projection';
import { createTextAuthoringDocument } from '../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner } from '../../lib/flow/integrated-poc/native-creator-document';
import { setProgramCreatorWorking, applyProgramCreatorAction } from '../../lib/flow/integrated-poc/creator-workspace';
import { fingerprintPersonalWorkspacePocAuthoringSource } from '../../lib/flow/personal-workspace-poc-authoring';

export const journeyStamp = '2026-10-01T12:00:00.000Z';
export const journeyRaw = '# 합성 여행 준비\r\n\r\n- [ ] 여권 챙기기\r\n  - 날짜: 2026-10-01\r\n  - 시간: 09:30\r\n  - 시간대: Asia/Seoul\r\n  - 자료: https://example.invalid/passport\r\n\r\n- [ ] 날짜 미정 확인';
export const journeyDraftId = 'journey-native-draft';

/** In-memory existing-account fixture, not a legacy import endpoint. */
export function seedJourneyNative(initial: AlphaAccount): AlphaAccount {
  const account = structuredClone(initial), actorId = account.ownerId;
  const document = createTextAuthoringDocument(journeyRaw, { documentId: 'journey-source-document', ownership: 'creator', now: journeyStamp });
  const source = { storageKey: 'flow:text-authoring:drafts:v1' as const, draftId: 'journey-source-draft',
    versionId: 'journey-source-version-1', revisionId: document.revision.revisionId, documentJson: JSON.stringify(document) };
  const native = createNativeCreatorDocumentOwner({ id: journeyDraftId, source }, journeyStamp); assert(native.ok);
  const current = materializeAccount(account, emptyAlphaReferences(actorId)).data;
  const working = setProgramCreatorWorking(current, { actorId, expectedWorking: null,
    working: { draftId: journeyDraftId, title: '합성 native 제작 여행', rawText: journeyRaw, baseRecordRevision: null,
      nativeDocument: native.owner, nativeSelection: source } }, journeyStamp); assert(working.ok);
  const saved = applyProgramCreatorAction(working.data, { actorId, requestId: 'journey-seed-save',
    expectedStructure: null, expectedNativeDocument: native.owner, expectedNativeSelection: source,
    action: { type: 'save', draftId: journeyDraftId, title: '합성 native 제작 여행', rawText: journeyRaw,
      sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(journeyRaw), expectedLibraryRevision: 0, now: journeyStamp } }, journeyStamp);
  assert(saved.ok); account.space = saved.data.spaces[actorId]; return account;
}
