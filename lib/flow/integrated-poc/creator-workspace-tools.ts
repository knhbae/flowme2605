import { findPersonalWorkspacePocStructureTemplatePreview, listPersonalWorkspacePocStructureTemplatePreviews } from '../personal-workspace-poc-structure-template/preview-adapter';
import { planPersonalWorkspacePocStructureTemplatePreviewApply } from '../personal-workspace-poc-structure-template/preview-apply-planner';

export { findPersonalWorkspacePocStructureTemplatePreview, listPersonalWorkspacePocStructureTemplatePreviews };

/** Reuse the original pinned compiler, empty-source gate and version/fingerprint
 * checks. This plan never writes a creator record, workspace or operating store. */
export function planProgramCreatorStructure(input: {
  draftId: string; expectedDraftId: string; templateId: string; catalogVersion: string; contractVersion: string;
  rawText: string; expectedSourceFingerprint: string; confirmed: boolean; composing?: boolean;
}) {
  if (input.draftId !== input.expectedDraftId) return {
    status: 'blocked' as const, reason: 'stale-document' as const, nextRawText: input.rawText,
    sourceMutationCount: 0 as const, workspaceMutationCount: 0 as const, operatingMutationCount: 0 as const,
  };
  return planPersonalWorkspacePocStructureTemplatePreviewApply(input);
}
