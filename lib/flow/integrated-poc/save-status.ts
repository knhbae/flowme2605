import type { AlphaSyncSnapshot } from './alpha-sync/controller';

/** Statuses a request in flight can still report: 'saving', or the previous
 *  settled status before the client switches to 'saving'. */
const IN_FLIGHT_STATUSES: ReadonlySet<AlphaSyncSnapshot['status']> = new Set(['saving', 'ready', 'saved', 'same-location', 'cancelled']);

/**
 * Whether a pending request's result is unknown, as opposed to a save still in
 * flight. The controller reports a non-text request before its status turns to
 * 'saving', so "pending but not saving" is not enough. A pending request is in
 * flight only while busy with one of those statuses; anything else, including a
 * result check masked as 'session-expired', stays unknown so recovery stays visible.
 * Presentation only; pending authority and recovery actions do not read this.
 */
export function pendingResultUnknown(snapshot: Pick<AlphaSyncSnapshot, 'pending' | 'busy' | 'status'> | null | undefined): boolean {
  return !!snapshot?.pending && !(snapshot.busy && IN_FLIGHT_STATUSES.has(snapshot.status));
}
