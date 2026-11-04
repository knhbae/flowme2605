import { programPublicCopyOccurrenceKey } from './public-copy-recurrence';
/** Personal execution only. A view window is deliberately absent from this owner. */
export interface ProgramOccurrenceIdentity {
  publicOwner?: import('./public-copy-recurrence').ProgramPublicCopyOccurrenceOwner;
  structuredOwner?: import('./structured-map-execution').ProgramStructuredOccurrenceOwner;
  nativeOwner?: import('./creator-native-execution-contract').ProgramNativeOccurrenceOwner;
  creatorOwner?: { kind: 'creator'; ownerId: string; rowId: string; executionItemRef: string };
  sourceWorkspaceId: string; sourceFlowRef: string; sourceRevisionToken: string;
  savedCopyId?: string; flowId?: string; itemId: string; sourceItemRef: string;
  seriesId: string; occurrenceId: string; occurrenceIndex: number; originalDate: string;
  sourceRule: { startDate: string; recurrence: string; recurrenceEnd: string | null };
}
export interface ProgramOccurrenceExecution extends ProgramOccurrenceIdentity {
  schedule: { mode: 'inherit' | 'fixed_date' | 'unscheduled'; date: string | null };
  completion: { status: 'unrecorded' | 'open' | 'completed'; completedAt: string | null };
  participation: 'included' | 'excluded' | 'held';
}
/** N10: `lines` holds repeat lines' finished days (repeat-log.ts); it lives here because the account check allows this field. */
export interface ProgramRecurrenceExecutionState { version: 1; entries: Record<string, ProgramOccurrenceExecution>; lines?: Record<string, string[]> }
export const programOccurrenceExecutionKey = (entry: ProgramOccurrenceIdentity): string => entry.publicOwner ? programPublicCopyOccurrenceKey(entry) : entry.nativeOwner ? JSON.stringify(['native-creator',entry.nativeOwner.ownerId,entry.nativeOwner.itemId,entry.seriesId,entry.occurrenceId,entry.originalDate]) : entry.creatorOwner ? JSON.stringify([
  'creator', entry.creatorOwner.ownerId, entry.creatorOwner.rowId, entry.seriesId, entry.occurrenceId,
]) : JSON.stringify([
  entry.sourceWorkspaceId, entry.savedCopyId, entry.flowId, entry.itemId, entry.seriesId, entry.occurrenceId,
]);
