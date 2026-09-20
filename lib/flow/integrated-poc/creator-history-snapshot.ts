import type { ProgramCreatorWorkspaceState } from './creator-workspace-contract';
import type { PersonalWorkspacePocCreatorDraftRecord } from '../personal-workspace-poc-creator-drafts';
import { PROGRAM_CREATOR_HISTORY_LIMIT } from './creator-history-contract';
/** Only a real explicit saved record is captured. Autosave/Undo never invent a revision. */
export function captureProgramCreatorSavedRevision(workspace:ProgramCreatorWorkspaceState,record:PersonalWorkspacePocCreatorDraftRecord) {
  workspace.savedHistory??={version:1,drafts:{}};
  const entries=workspace.savedHistory.drafts[record.draftId]??[];
  const context=workspace.structureDrafts?.[record.draftId];
  const retainedContext=context?.recordRevision===record.recordRevision?context:undefined;
  if(entries.some(e=>e.kind==='program'&&e.record.recordRevision===record.recordRevision&&(e.context?.contextRevision??0)===(retainedContext?.contextRevision??0)))return;
  const identity=workspace.sourceIdentities?.[record.draftId];
  const row={id:`program:${record.draftId}:${record.recordRevision}${retainedContext?`:context:${retainedContext.contextRevision}`:''}`,kind:'program' as const,savedAt:retainedContext?.savedAt??record.updatedAt,title:record.title,rawText:record.rawText,
    record:structuredClone(record),...(identity?.recordRevision===record.recordRevision?{sourceIdentity:structuredClone(identity.identity)}:{}),...(retainedContext?{context:structuredClone(retainedContext)}:{})};
  // Original imported history is immutable, separate from the replaceable Program cap.
  workspace.savedHistory.drafts[record.draftId]=[...entries.filter(e=>e.kind==='text-authoring-v1'),...entries.filter(e=>e.kind==='program'),row].filter((e,i,a)=>e.kind!=='program'||a.slice(i).filter(r=>r.kind==='program').length<=PROGRAM_CREATOR_HISTORY_LIMIT);
}
