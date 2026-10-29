import type { AlphaSyncSnapshot } from './alpha-sync/controller';

/**
 * Whether a pending request's result is unknown, as opposed to a save still in
 * flight. The controller reports a non-text request before its status turns to
 * 'saving', so "pending but not saving" is not enough: the result is unknown
 * only once the request stopped (not busy) or the controller is checking it.
 * Presentation only; pending authority and recovery actions do not read this.
 */
export function pendingResultUnknown(snapshot: Pick<AlphaSyncSnapshot, 'pending' | 'busy' | 'status'> | null | undefined): boolean {
  return !!snapshot?.pending && (!snapshot.busy || snapshot.status === 'checking-result');
}
