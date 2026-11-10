import type { AlphaSyncSnapshot } from './alpha-sync/controller';

/** Existing save authority only; no message text or badge grants a move. */
export function taskLocationSaveGate(snapshot: Pick<AlphaSyncSnapshot, 'status' | 'pending' | 'busy' | 'draft' | 'retryableRejectedDraft' | 'retryableNativeHandoff' | 'retryableRejectedSocialDraft'> | null | undefined, inputProtected = false) {
  const settled=!!snapshot&&['ready','saved','same-location','cancelled'].includes(snapshot.status);
  return { blocked: !snapshot || inputProtected || !!snapshot.pending || snapshot.busy || !!snapshot.draft || !settled, checking: !!snapshot?.busy };
}
