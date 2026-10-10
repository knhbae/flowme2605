import { programFailure, type ProgramData, type ProgramFailure, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programIdentifier, validateProgramData } from './program-data';
import { transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { programDocumentContentLock, programReferenceExecutionAccess } from './reference-execution-guard';
import { programLegacyTaskQualityHold } from './legacy-map-review';
import { programLegacyPlanTaskExcluded } from './program-legacy-plan-target';
import { programSeriesMetadata } from './recurrence-target';
import { textWorkspaceModel as M } from './text-workspace';

export type ProgramTaskClassificationInput = ProgramPrivateMutationBase & { taskId: string; folderId: string };

function classificationFailure(space: ProgramPrivateSpace, taskId: string): ProgramFailure | null {
  if (!programIdentifier(taskId)) return 'invalid';
  const actualDocument = [...space.text.documents, ...space.text.flows].find(doc => doc.lines.some(line => line.id === taskId));
  if (!actualDocument) return 'missing';
  const task = M.tasks(space.text).find(row => row.id === taskId);
  if (!task?.isCanonical || task.docId !== actualDocument.id || task.scopeKind !== 'folder'
    || !space.text.documents.some(doc => doc.id === actualDocument.id)
    || space.text.bindings.some(binding => binding.kind === 'task' && binding.lineId === taskId)
    || programDocumentContentLock(space, actualDocument.id) !== 'active'
    || programReferenceExecutionAccess(space, taskId).kind !== 'active'
    || programLegacyTaskQualityHold(space, taskId) || programLegacyPlanTaskExcluded(space, taskId)) return 'unresolved';

  // Source ownership can outlive its original placement. Never reclassify a
  // copied/legacy/creator execution row through an ordinary personal checkbox.
  if (space.savedBindings.some(binding => Object.values(binding.itemLines).includes(taskId))
    || space.copies.some(copy => Object.values(copy.itemLines).includes(taskId)
      || Object.values(copy.subcheckLines).some(children => Object.values(children).includes(taskId)))
    || Object.values(space.creatorWorkspace?.executionSources ?? {}).some(owner =>
      owner.revisions.some(revision => revision.rows.some(row => row.documentLineId === taskId)))
    || Object.values(space.creatorWorkspace?.nativeExecutionSources ?? {}).some(owner =>
      owner.revisions.some(revision => revision.rows.some(row => row.lines.some(line => line.id === taskId)))
      || Object.values(owner.selections).some(selection => selection.execution?.lines.some(line => line.id === taskId)))
    || programSeriesMetadata(space).some(row => row.lineId === taskId)) return 'unresolved';
  return null;
}

/** Shared eligibility for the local candidate UI and its commit boundary. */
export function canClassifyProgramTask(data: ProgramData, taskId: string): boolean {
  return validateProgramData(data) && classificationFailure(data.spaces[data.activeActorId], taskId) === null;
}

/** A user's explicit folder choice for one ordinary personal canonical Item.
 * Only its two existing owner entries change. Raw ancestry, document filing,
 * references, schedule and execution history remain as they were. This local
 * uses the existing private text aggregate without a new schema/API or automatic conversion policy.
 */
export function setProgramTaskClassification(data: ProgramData, input: ProgramTaskClassificationInput): ProgramTransition<string> {
  if (data.activeActorId !== input.actorId) return programFailure(data, 'conflict');
  return transitionProgramPrivateSpace(data, input, 'private-task-classification', { taskId: input.taskId, folderId: input.folderId }, space => {
    if (!programIdentifier(input.folderId)) return { result: input.taskId, reason: 'invalid' };
    if (!space.text.folders.some(folder => folder.id === input.folderId)) return { result: input.taskId, reason: 'missing' };
    const reason = classificationFailure(space, input.taskId);
    if (reason) return { result: input.taskId, reason };
    space.text.taskScopes[input.taskId] = input.folderId;
    space.text.itemScopes[input.taskId] = input.folderId;
    return { result: input.taskId };
  });
}
