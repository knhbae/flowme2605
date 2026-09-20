import type { DateMovementOccurrenceTarget } from '../date-movement';
import type { PersonalStructuralRecurrenceScheduleTemplate } from '../personal-structural-recurrence';
import type { ProgramOccurrenceExecution, ProgramOccurrenceIdentity } from './recurrence-state-contract';

/** Replaceable Program-only v1. These revisions are personal plans, never authored source revisions. */
export type ProgramRecurrencePlanOperation = {
  scope: 'whole_series' | 'future_series';
  targetDate: string;
  target: DateMovementOccurrenceTarget;
  /** First handoff names an actual source occurrence; no title/index/date inferred migration. */
  sourceCutover: ProgramOccurrenceIdentity | null;
  at: string;
};
export type ProgramRecurrencePlanOwner = {
  version: 1;
  ownerId: string;
  actorId: string;
  source: ProgramOccurrenceIdentity;
  template: PersonalStructuralRecurrenceScheduleTemplate;
  createdAt: string;
  /** Exact old keys and all personal schedule/completion/participation data remain untouched. */
  retainedSourceExecutions: ProgramOccurrenceExecution[];
  /** Exact canonical task records/notes payload, not interpreted or migrated to occurrence records. */
  retainedTaskRecordsRaw: string;
  operations: ProgramRecurrencePlanOperation[];
  /** Interleaved actual private execution, never replayed before its plan existed. */
  executionEvents?: ProgramPersonalOccurrenceEvent[];
};
export type ProgramPersonalOccurrenceIdentity = {
  ownerId: string; actorId: string; sourceItemRef: string; sourceRevisionToken: string;
  seriesId: string; revisionId: string; occurrenceId: string; originalDate: string;
};
export type ProgramPersonalOccurrenceExecution = ProgramPersonalOccurrenceIdentity & Pick<ProgramOccurrenceExecution, 'schedule' | 'completion' | 'participation'>;
export type ProgramPersonalOccurrenceEvent = {
  afterOperationCount: number; expected: ProgramPersonalOccurrenceExecution | null;
  next: ProgramPersonalOccurrenceExecution; at: string;
};
export const programPersonalOccurrenceKey = (identity: ProgramPersonalOccurrenceIdentity): string => JSON.stringify([
  'program-personal-occurrence/1', identity.actorId, identity.ownerId, identity.seriesId, identity.revisionId, identity.occurrenceId,
]);
export type ProgramRecurrencePlanFailure = { ok: false; reason: string };
export type ProgramRecurrencePlanResult<T> = { ok: true; value: T } | ProgramRecurrencePlanFailure;
