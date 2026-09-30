import type { ProgramData } from './contract';
import type { AlphaCommand } from './alpha-persistence/contract';
import type { AlphaSyncSnapshot } from './alpha-sync/controller';
import { privateChanges } from './alpha-persistence/program-adapter';
import { canonicalJson } from './alpha-persistence/json';

/** Proof for a resolved private text save, not a general equal-text refresh. */
export function confirmedAlphaPrivateTextSave(ownerId: string, before: ProgramData | null,
  revision: number | null, publicRevision: number | null, pending: AlphaCommand | null | undefined,
  next: AlphaSyncSnapshot) {
  const account = next.account, data = next.envelope?.data, receipt = next.lastReceipt;
  if (!before || before.activeActorId !== ownerId || !before.spaces[ownerId]
    || pending?.kind !== 'change-private' || pending.expectedRevision !== revision
    || !pending.changes.some(change => change.field === 'text' && change.present)
    || next.ownerId !== ownerId || account?.ownerId !== ownerId || account.source.actorId !== ownerId
    || data?.activeActorId !== ownerId || !receipt || receipt.requestId !== pending.requestId
    || receipt.kind !== pending.kind || !receipt.changed || receipt.revision !== pending.expectedRevision + 1
    || account.revision !== receipt.revision || next.status !== 'saved' || next.busy || next.pending || next.draft
    || (next.publicRevision ?? null) !== publicRevision) return null;
  try {
    if (canonicalJson(before.public) !== canonicalJson(data.public)
      || canonicalJson(privateChanges(before.spaces[ownerId], account.space)) !== canonicalJson(pending.changes)) return null;
    return { before: before.spaces[ownerId].text, next: account.space.text };
  } catch { return null; }
}
