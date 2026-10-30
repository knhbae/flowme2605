import { canonicalJson } from './alpha-persistence/json';
import type { AlphaUiDraft } from './alpha-ui-recovery';

/** Same identity as the shell's mergeRecoveryDrafts: one entry per document, title and raw. */
export const recoveryDraftIdentity = (draft: AlphaUiDraft) => JSON.stringify([draft.documentId ?? null, draft.title, draft.raw]);

/** How many stored recovery entries to announce (notice, badges, 복구함 count). Every input is still
 * captured to the tab, but an entry that is only the live capture of input the editors are saving
 * normally (active, not parked) is not left behind. It counts once that input is at risk. */
export function announcedRecoveries<T>(stored: readonly T[] | undefined, parked: readonly T[], active: readonly T[], atRisk: boolean,
  identity: (entry: T) => string = canonicalJson): number {
  if (!stored?.length) return 0;
  if (atRisk) return stored.length;
  const left = new Set(parked.map(identity)), live = new Set(active.map(identity));
  return stored.filter(entry => left.has(identity(entry)) || !live.has(identity(entry))).length;
}
