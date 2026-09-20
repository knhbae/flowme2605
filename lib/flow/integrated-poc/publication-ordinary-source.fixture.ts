import assert from 'node:assert/strict';
import { createProgramData, validateProgramData } from './program-data';
import type { ProgramTransition } from './contract';
import { setProgramCreatorWorking, applyProgramCreatorAction, handoffProgramCreatorDraft } from './creator-workspace';
import { fingerprintPersonalWorkspacePocAuthoringSource as fp } from '../personal-workspace-poc-authoring';
import { createTextAuthoringDocument } from './native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner } from './native-creator-document';
import { inspectProgramNativeCreatorHandoff, applyProgramNativeCreatorHandoff } from './creator-native-execution-adapter';

export const ORDINARY_SOURCE_NOW = '2026-09-14T07:10:00.000Z';
export const ORDINARY_SOURCE_RAW = '# 계약 준비\n\n- [ ] 계약 확인\n  - 날짜: 2026-10-02\n  - 설명: 통화 조건과 계약서를 함께 본다.\n  - 완료 기준: 계약서 금액 확인\n  - 자료: [비교 자료](https://example.com/reference)\n  - 출처: [원본](https://example.com/source)\n  - 안내: 서명 전에 읽는다\n  - 주의: 개인 번호를 공개하지 않는다\n  - [x] 조건 확인\n\n- [ ] 별도 준비\n  - 날짜: 2026-10-03';
export function ordinaryPublicationSourceFixture(kind: 'creator' | 'native', raw = ORDINARY_SOURCE_RAW) {
  const now = ORDINARY_SOURCE_NOW, draftId = 'ordinary-source-fixture';
  let data = createProgramData(); const actorId = data.activeActorId;
  const accept = (result: ProgramTransition<string>) => { assert(result.ok, result.ok ? '' : result.reason); assert(validateProgramData(result.data)); return result; };
  let nativeFields = {};
  if (kind === 'native') {
    const doc = createTextAuthoringDocument(raw, { documentId: 'genuine-native-source', ownership: 'creator', now });
    const source = { storageKey: 'flow:text-authoring:drafts:v1' as const, draftId: 'original-draft', versionId: 'original-v1', revisionId: doc.revision.revisionId, documentJson: JSON.stringify(doc) };
    const owner = createNativeCreatorDocumentOwner({ id: draftId, source }, now); assert(owner.ok);
    nativeFields = { nativeDocument: owner.owner, nativeSelection: source };
  }
  data = accept(setProgramCreatorWorking(data, { actorId, expectedWorking: null, working: { draftId, title: '계약 준비', rawText: raw, baseRecordRevision: null, ...nativeFields } }, now)).data;
  const workspace = data.spaces[actorId].creatorWorkspace!, working = workspace.working!;
  data = accept(applyProgramCreatorAction(data, { actorId, requestId: 'save-ordinary-fixture', expectedNativeDocument: working.nativeDocument ?? null, expectedNativeSelection: working.nativeSelection ?? null,
    action: { type: 'save', draftId, rawText: raw, title: '계약 준비', sourceFingerprint: fp(raw), expectedLibraryRevision: workspace.library.revision, now } }, now)).data;
  let result: ProgramTransition<string>;
  if (kind === 'native') {
    const preview = inspectProgramNativeCreatorHandoff(data, { actorId, draftId }, now); assert(preview.ok, preview.ok ? '' : preview.reason);
    result = applyProgramNativeCreatorHandoff(data, { actorId, requestId: 'handoff-ordinary-fixture', preview: preview.preview,
      choices: Object.fromEntries(preview.preview.rows.map(row => [row.itemId, { source: 'incoming' as const, date: 'keep' as const, time: 'keep' as const, children: 'keep' as const }])) }, now);
  } else result = handoffProgramCreatorDraft(data, { actorId, requestId: 'handoff-ordinary-fixture', draftId, expectedRecordRevision: 1, today: '2026-09-14' }, now);
  const handoff = accept(result); return { data: handoff.data, actorId, documentId: handoff.result, draftId };
}
