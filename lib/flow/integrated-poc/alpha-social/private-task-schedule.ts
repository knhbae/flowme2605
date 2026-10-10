import { programFailure, type ProgramData, type ProgramTransition } from '../contract';
import { programIdentifier, validateProgramData } from '../program-data';
import { programReferenceExecutionAccess } from '../reference-execution-guard';
import { updateProgramTask, type ProgramPrivateMutationBase } from '../private-space';
import { textWorkspaceModel as M } from '../text-workspace';
import { isAlphaSocialIntent, type AlphaSocialIntent } from './contract';

export type AlphaPrivateTaskScheduleLocator = { copyId: string; itemId: string; taskId: string };
export type AlphaPrivateTaskScheduleIntent = Extract<AlphaSocialIntent, { type: 'private-task-schedule' }>;

/** Resolve the exact public-copy owner again on the server. A reference row,
 * subcheck, retained row, or another source owner cannot supply the locator. */
export function resolveAlphaPrivateTaskSchedule(data: ProgramData, actorId: string, taskId: string): AlphaPrivateTaskScheduleLocator | null {
  try {
    if (!programIdentifier(actorId) || !programIdentifier(taskId) || !validateProgramData(data)
      || data.activeActorId !== actorId || !Object.hasOwn(data.spaces, actorId)) return null;
    const space = data.spaces[actorId];
    const locators = space.copies.flatMap(copy => Object.entries(copy.itemLines)
      .filter(([, lineId]) => lineId === taskId).map(([itemId]) => ({ copy, itemId })));
    if (locators.length !== 1) return null;
    const { copy, itemId } = locators[0];
    if (!copy.includedItemIds.includes(itemId) || copy.itemOverrides[itemId]?.included === false
      || copy.recurrence?.itemIds.includes(itemId)) return null;
    const scheduleVersionId = copy.appliedFields[itemId]?.schedule ?? copy.baseVersionId;
    const sources = data.public.versions.filter(version => version.id === scheduleVersionId && version.flowId === copy.flowId)
      .flatMap(version => version.items.filter(item => item.id === itemId));
    if (sources.length !== 1 || sources[0].schedule.kind === 'recurring') return null;
    const docs = [...space.text.documents, ...space.text.flows];
    const positions = docs.flatMap(doc => doc.lines.filter(line => line.id === taskId).map(() => doc));
    if (positions.length !== 1 || positions[0].id !== copy.documentId) return null;
    const tasks = M.parseDocument(positions[0], space.text).items.filter(task => task.id === taskId);
    if (tasks.length !== 1 || !tasks[0].isCanonical || tasks[0].parentTaskId !== null || tasks[0].parentItemId !== null
      || tasks[0].docId !== copy.documentId) return null;
    // A valid aggregate can still contain competing provenance indexes. Reject
    // those identities rather than letting a .find() choose an arbitrary owner.
    if (space.savedBindings.some(binding => binding.documentId === copy.documentId || Object.values(binding.itemLines).includes(taskId))
      || space.creatorDraftImports?.some(binding => binding.documentId === copy.documentId)
      || Object.values(space.creatorWorkspace?.handoffs ?? {}).some(binding => binding.documentId === copy.documentId)
      || Object.values(space.creatorWorkspace?.executionSources ?? {}).some(owner => owner.documentId === copy.documentId
        || owner.revisions.some(revision => revision.rows.some(row => row.documentLineId === taskId)))
      || Object.values(space.creatorWorkspace?.nativeExecutionSources ?? {}).some(owner => owner.documentId === copy.documentId
        || owner.revisions.some(revision => revision.rows.some(row => row.lineId === taskId || row.lines.some(line => line.id === taskId)))
        || Object.values(owner.selections).some(selection => selection.execution?.lines.some(line => line.id === taskId)))) return null;
    const access = programReferenceExecutionAccess(space, taskId);
    if (access.kind !== 'active' || access.documentId !== copy.documentId) return null;
    return { copyId: copy.id, itemId, taskId };
  } catch { return null; }
}

export function applyAlphaPrivateTaskSchedule(data: ProgramData, input: ProgramPrivateMutationBase & AlphaPrivateTaskScheduleIntent): ProgramTransition<string> {
  const intent: AlphaPrivateTaskScheduleIntent = { type: 'private-task-schedule', copyId: input.copyId, itemId: input.itemId,
    taskId: input.taskId, date: input.date, time: input.time };
  if (!isAlphaSocialIntent(intent)) return programFailure(data, 'invalid');
  const locator = resolveAlphaPrivateTaskSchedule(data, input.actorId, input.taskId);
  if (!locator || locator.copyId !== input.copyId || locator.itemId !== input.itemId) return programFailure(data, 'unresolved');
  // Keep the existing execution guards and explicit personal date sidecar.
  return updateProgramTask(data, { actorId: input.actorId, requestId: input.requestId, expectedSpace: input.expectedSpace,
    taskId: input.taskId, patch: { date: input.date, time: input.time } });
}
