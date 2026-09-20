import { programClone, programFailure, programResult, type ProgramData, type ProgramPublicRepository, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { validateProgramData } from './program-data';
import { programOccurrenceExecutionKey, type ProgramOccurrenceExecution, type ProgramOccurrenceIdentity } from './recurrence-state-contract';
import { programOccurrenceWindowFor, readProgramExecutionOccurrences, type ProgramExecutionOccurrenceRow } from './recurrence-state';
import { isProgramOccurrenceExecution } from './recurrence-state-validation';
import { resolveProgramExecutionSource } from './execution-source';
import { readProgramPublicCopySourceFacts, validateProgramPublicCopyOccurrenceIdentity } from './public-copy-recurrence';

function identity(entry: ProgramOccurrenceExecution | ProgramOccurrenceIdentity) {
  const { sourceRevisionToken: _token, ...rest } = entry;
  const { schedule: _schedule, completion: _completion, participation: _participation, ...identity } = rest as ProgramOccurrenceExecution;
  return identity;
}
/** Never match by title, ordinal position, current date, or an edited series. */
export function programOccurrenceCanReconnect(stored: ProgramOccurrenceExecution, current: ProgramOccurrenceIdentity): boolean {
  if(stored.nativeOwner||current.nativeOwner)return !!stored.nativeOwner&&!!current.nativeOwner&&programSame(stored.nativeOwner,current.nativeOwner)&&stored.sourceFlowRef===current.sourceFlowRef&&stored.seriesId===current.seriesId&&stored.occurrenceId===current.occurrenceId&&stored.originalDate===current.originalDate&&stored.occurrenceIndex===current.occurrenceIndex&&programSame(stored.sourceRule,current.sourceRule);
  if (stored.creatorOwner || current.creatorOwner) return !!stored.creatorOwner && !!current.creatorOwner
    && programSame(stored.creatorOwner, current.creatorOwner) && stored.sourceFlowRef === current.sourceFlowRef
    && stored.seriesId === current.seriesId && stored.occurrenceId === current.occurrenceId && stored.occurrenceIndex === current.occurrenceIndex
    && stored.originalDate === current.originalDate && programSame(stored.sourceRule, current.sourceRule);
  return programSame(identity(stored), identity(current));
}
/** Only the exact source item/context is displayed; the whole source token is not UI copy. */
export function programOccurrenceSourceFacts(value: ProgramOccurrenceIdentity, repository?: ProgramPublicRepository): unknown {
  try {
    const source = JSON.parse(value.sourceRevisionToken);
    if (value.publicOwner || source.kind === 'public-copy-source/1') {
      return repository && validateProgramPublicCopyOccurrenceIdentity(value)
        ? readProgramPublicCopySourceFacts(value.publicOwner!, value.sourceRevisionToken, repository) : { unavailable: true };
    }
    return { flowTitle: source.flow?.title ?? null, item: source.flow?.items?.find((item: { ref?: string }) => item.ref === value.sourceItemRef) ?? null,
      context: source.contexts?.[value.sourceItemRef] ?? null };
  } catch { return { unavailable: true }; }
}
export type ProgramOccurrenceRecovery = { key: string; stored: ProgramOccurrenceExecution; current: ProgramExecutionOccurrenceRow | null;
  currentSourceFacts?: unknown;
  canReconnect: boolean; reason: 'exact-source-change' | 'identity-changed-or-missing' | 'source-unavailable' | 'execution-held' };
export function readProgramOccurrenceRecovery(data: ProgramData, input: { actorId: string; localToday: string; flowRefs?: readonly string[] }): ProgramOccurrenceRecovery[] {
  const space = data.spaces[input.actorId]; if (!space || !validateProgramData(data)) return [];
  return Object.entries(space.recurrenceExecution?.entries ?? {}).flatMap<ProgramOccurrenceRecovery>(([key, stored]) => {
    if (input.flowRefs && !input.flowRefs.includes(stored.sourceFlowRef)) return [];
    const source = resolveProgramExecutionSource(space, stored.sourceFlowRef, data.public);
    if (!source.ok || stored.sourceWorkspaceId !== source.workspaceId) return [{ key, stored, current: null, canReconnect: false, reason: 'source-unavailable' as const }];
    // A changed schedule may have no matching occurrence in this window. Show
    // its exact source item separately; this must never grant reconnection.
    const publicItem = source.kind === 'public-copy' && stored.publicOwner
      ? source.source.items.find(entry => entry.item.id === stored.publicOwner!.itemId) : undefined;
    const sourceFacts = source.kind === 'public-copy' ? { currentSourceFacts: publicItem
      ? readProgramPublicCopySourceFacts({ kind: 'public-copy', version: 1, copyId: source.source.copyId, flowId: source.source.flowId,
        itemId: publicItem.item.id, scheduleVersionId: publicItem.scheduleVersionId, schedule: publicItem.item.schedule }, source.source.sourceRevisionToken, data.public)
      : { unavailable: true } } : {};
    const read = readProgramExecutionOccurrences(data, { actorId: input.actorId, localToday: input.localToday, flowRef: stored.sourceFlowRef, window: programOccurrenceWindowFor(stored) });
    if (!read.ok) return [{ key, stored, current: null, canReconnect: false, reason: 'source-unavailable' as const }];
    const current = read.rows.find(row => row.key === key) ?? null;
    if (current && !current.sourceConflict) return [];
    const sameIdentity = !!current && programOccurrenceCanReconnect(stored, current.identity), held = !!current && (current.mapReviewHold || current.flowInactive);
    const canReconnect = sameIdentity && !held;
    return [{ key, stored, current, ...sourceFacts, canReconnect, reason: held ? 'execution-held' as const : canReconnect ? 'exact-source-change' as const : 'identity-changed-or-missing' as const }];
  });
}
/** One personal CAS transaction; immutable source, other entries and old tuple stay untouched. */
export function reconnectProgramOccurrenceSource(data: ProgramData, input: { actorId: string; localToday: string; expected: ProgramOccurrenceExecution;
  currentIdentity: ProgramOccurrenceIdentity | null; choice: 'reconnect' | 'keep' }): ProgramTransition<string> {
  if (!validateProgramData(data) || !isProgramOccurrenceExecution(input.expected)) return programFailure(data, 'invalid');
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  const space = data.spaces[input.actorId], key = programOccurrenceExecutionKey(input.expected), stored = space.recurrenceExecution?.entries[key];
  if (!stored || !programSame(stored, input.expected)) return programFailure(data, 'conflict');
  if (input.choice === 'keep') return { ok: true, data, changed: false, result: key };
  if (input.choice !== 'reconnect' || !input.currentIdentity || !programOccurrenceCanReconnect(stored, input.currentIdentity)) return programFailure(data, 'conflict');
  const read = readProgramExecutionOccurrences(data, { actorId: input.actorId, localToday: input.localToday, flowRef: stored.sourceFlowRef, window: programOccurrenceWindowFor(input.currentIdentity) });
  const current = read.ok ? read.rows.find(row => row.key === key) : null;
  if (!current || !programSame(current.identity, input.currentIdentity) || !programSame(current.stored, stored) || current.mapReviewHold || current.flowInactive) return programFailure(data, 'conflict');
  if (stored.sourceRevisionToken === current.identity.sourceRevisionToken) return { ok: true, data, changed: false, result: key };
  const next = programClone(data);
  next.spaces[input.actorId].recurrenceExecution!.entries[key] = { ...stored, ...current.identity };
  return validateProgramData(next) ? programResult(data, next, key) : programFailure(data, 'invalid');
}
